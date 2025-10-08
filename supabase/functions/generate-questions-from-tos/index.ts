import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

type TopicDistribution = {
  topic: string;
  counts: {
    remembering: number;
    understanding: number;
    applying: number;
    analyzing: number;
    evaluating: number;
    creating: number;
    difficulty: { easy: number; average: number; difficult: number };
  };
};

type GenerationInput = {
  tos_id: string;
  total_items: number;
  distributions: TopicDistribution[];
  allow_unapproved?: boolean;
  prefer_existing?: boolean;
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function pickFromBank(
  topic: string,
  bloom: string,
  difficulty: string,
  needed: number,
  allowUnapproved = false
) {
  let query = supabase
    .from('questions')
    .select('*')
    .eq('topic', topic)
    .eq('bloom_level', bloom)
    .eq('difficulty', difficulty)
    .eq('deleted', false)
    .order('used_count', { ascending: true })
    .limit(needed * 2); // Fetch extra for filtering

  if (!allowUnapproved) {
    query = query.eq('approved', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching from bank:', error);
    return [];
  }

  return (data ?? []).slice(0, needed);
}

function generateFallbackQuestions(
  topic: string,
  bloom: string,
  difficulty: string,
  count: number
): any[] {
  const verbTemplates: Record<string, string[]> = {
    remembering: ['Define', 'List', 'Identify', 'Name', 'Recall'],
    understanding: ['Explain', 'Summarize', 'Describe', 'Interpret', 'Classify'],
    applying: ['Apply', 'Use', 'Implement', 'Execute', 'Demonstrate'],
    analyzing: ['Analyze', 'Compare', 'Examine', 'Differentiate', 'Organize'],
    evaluating: ['Evaluate', 'Assess', 'Judge', 'Critique', 'Justify'],
    creating: ['Create', 'Design', 'Develop', 'Construct', 'Formulate']
  };

  const verbs = verbTemplates[bloom] ?? ['Explain'];
  const questions = [];

  for (let i = 0; i < count; i++) {
    const verb = verbs[i % verbs.length];
    const questionText = `${verb} a key concept related to ${topic}.`;
    
    // Generate realistic MCQ choices
    const choices = {
      A: `A comprehensive approach to ${topic}`,
      B: `A basic understanding of ${topic}`,
      C: `An alternative method for ${topic}`,
      D: `A contrasting view of ${topic}`
    };

    questions.push({
      topic,
      question_text: questionText,
      question_type: 'mcq',
      choices,
      correct_answer: 'A',
      bloom_level: bloom,
      difficulty,
      knowledge_dimension: bloom === 'creating' ? 'procedural' : 
                          bloom === 'evaluating' ? 'metacognitive' :
                          bloom === 'applying' ? 'procedural' : 'conceptual',
      created_by: 'ai',
      approved: false,
      ai_confidence_score: 0.6,
      needs_review: true,
      metadata: { generated_by: 'fallback_template', template_version: '1.0' }
    });
  }

  return questions;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GenerationInput = await req.json();
    
    if (!body.tos_id || !body.total_items || !body.distributions) {
      throw new Error('Missing required fields: tos_id, total_items, distributions');
    }

    const assembled: any[] = [];
    const generationLog: any[] = [];

    for (const dist of body.distributions) {
      const topic = dist.topic;
      const bloomLevels: Array<keyof TopicDistribution['counts']> = [
        'remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'
      ];

      for (const bloom of bloomLevels) {
        const count = dist.counts[bloom] as number;
        if (!count || count <= 0) continue;

        // Distribute count across difficulty levels based on proportions
        const { easy, average, difficult } = dist.counts.difficulty;
        const totalDiff = Math.max(1, easy + average + difficult);
        
        const easyCount = Math.round(count * (easy / totalDiff));
        const averageCount = Math.round(count * (average / totalDiff));
        const difficultCount = Math.max(0, count - easyCount - averageCount);

        const difficulties = [
          { level: 'easy', count: easyCount },
          { level: 'average', count: averageCount },
          { level: 'difficult', count: difficultCount }
        ];

        for (const { level, count: diffCount } of difficulties) {
          if (diffCount <= 0) continue;

          // Try to get from existing question bank first
          const bankQuestions = await pickFromBank(
            topic,
            bloom,
            level,
            diffCount,
            body.allow_unapproved ?? false
          );

          const shortage = Math.max(0, diffCount - bankQuestions.length);
          
          // Add bank questions
          assembled.push(...bankQuestions);
          
          // Generate fallback questions for shortage
          if (shortage > 0) {
            const fallbackQuestions = generateFallbackQuestions(topic, bloom, level, shortage);
            assembled.push(...fallbackQuestions);
            
            generationLog.push({
              topic,
              bloom,
              difficulty: level,
              requested: diffCount,
              from_bank: bankQuestions.length,
              generated: shortage,
              reason: 'insufficient_bank_questions'
            });
          } else {
            generationLog.push({
              topic,
              bloom,
              difficulty: level,
              requested: diffCount,
              from_bank: bankQuestions.length,
              generated: 0,
              reason: 'sufficient_bank_questions'
            });
          }
        }
      }
    }

    // Trim to exact total if we have excess
    const finalQuestions = assembled.slice(0, body.total_items);
    
    // Calculate statistics
    const stats = {
      total_generated: finalQuestions.length,
      from_bank: finalQuestions.filter(q => q.created_by !== 'ai').length,
      ai_generated: finalQuestions.filter(q => q.created_by === 'ai').length,
      by_bloom: finalQuestions.reduce((acc: Record<string, number>, q) => {
        acc[q.bloom_level] = (acc[q.bloom_level] || 0) + 1;
        return acc;
      }, {}),
      by_difficulty: finalQuestions.reduce((acc: Record<string, number>, q) => {
        acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
        return acc;
      }, {}),
      needs_review: finalQuestions.filter(q => q.needs_review).length
    };

    return new Response(JSON.stringify({
      questions: finalQuestions,
      generation_log: generationLog,
      statistics: stats,
      tos_id: body.tos_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: `Question generation failed: ${message}` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});