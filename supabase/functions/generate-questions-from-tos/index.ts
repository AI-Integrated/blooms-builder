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

  // Generate diverse question types based on Bloom level
  for (let i = 0; i < count; i++) {
    const verb = verbs[i % verbs.length];
    let question: any;

    // Remembering and Understanding: Mix of MCQ and True/False
    if (['remembering', 'understanding'].includes(bloom)) {
      if (i % 2 === 0) {
        // MCQ
        const questionText = `${verb} a key concept related to ${topic}.`;
        const choices = {
          A: `A comprehensive approach to ${topic}`,
          B: `A basic understanding of ${topic}`,
          C: `An alternative method for ${topic}`,
          D: `A contrasting view of ${topic}`
        };
        question = {
          topic,
          question_text: questionText,
          question_type: 'mcq',
          choices,
          correct_answer: 'A',
          bloom_level: bloom,
          difficulty,
          knowledge_dimension: bloom === 'remembering' ? 'Factual' : 'Conceptual',
          created_by: 'ai',
          approved: false,
          ai_confidence_score: 0.6,
          needs_review: true,
          metadata: { generated_by: 'fallback_template', template_version: '1.0' }
        };
      } else {
        // True/False
        question = {
          topic,
          question_text: `${topic} requires a specific approach in modern practice.`,
          question_type: 'true_false',
          correct_answer: 'true',
          bloom_level: bloom,
          difficulty,
          knowledge_dimension: 'Factual',
          created_by: 'ai',
          approved: false,
          ai_confidence_score: 0.6,
          needs_review: true,
          metadata: { generated_by: 'fallback_template', template_version: '1.0' }
        };
      }
    }
    // Applying: MCQ and Fill-in-the-blank
    else if (bloom === 'applying') {
      if (i % 2 === 0) {
        // MCQ
        const questionText = `${verb} the principles of ${topic} to solve a problem.`;
        const choices = {
          A: `Apply systematic methodology`,
          B: `Use random selection`,
          C: `Ignore fundamental principles`,
          D: `Follow arbitrary patterns`
        };
        question = {
          topic,
          question_text: questionText,
          question_type: 'mcq',
          choices,
          correct_answer: 'A',
          bloom_level: bloom,
          difficulty,
          knowledge_dimension: 'Procedural',
          created_by: 'ai',
          approved: false,
          ai_confidence_score: 0.6,
          needs_review: true,
          metadata: { generated_by: 'fallback_template', template_version: '1.0' }
        };
      } else {
        // Fill-in-the-blank
        question = {
          topic,
          question_text: `When applying ${topic}, the most important factor to consider is ____________.`,
          question_type: 'fill-blank',
          correct_answer: `systematic approach and methodology`,
          bloom_level: bloom,
          difficulty,
          knowledge_dimension: 'Procedural',
          created_by: 'ai',
          approved: false,
          ai_confidence_score: 0.6,
          needs_review: true,
          metadata: { generated_by: 'fallback_template', template_version: '1.0' }
        };
      }
    }
    // Analyzing and Evaluating: Mix of MCQ and Short Answer
    else if (['analyzing', 'evaluating'].includes(bloom)) {
      if (i % 2 === 0) {
        // MCQ
        const questionText = `${verb} the effectiveness of different approaches to ${topic}.`;
        const choices = {
          A: `Systematic analysis yields better results`,
          B: `All approaches are equally effective`,
          C: `Effectiveness cannot be measured`,
          D: `Traditional methods are always best`
        };
        question = {
          topic,
          question_text: questionText,
          question_type: 'mcq',
          choices,
          correct_answer: 'A',
          bloom_level: bloom,
          difficulty,
          knowledge_dimension: bloom === 'analyzing' ? 'Conceptual' : 'Metacognitive',
          created_by: 'ai',
          approved: false,
          ai_confidence_score: 0.6,
          needs_review: true,
          metadata: { generated_by: 'fallback_template', template_version: '1.0' }
        };
      } else {
        // Short answer
        question = {
          topic,
          question_text: `${verb} the key factors that influence ${topic} in professional practice.`,
          question_type: 'short_answer',
          correct_answer: `Key factors include methodology, context, resources, and stakeholder requirements`,
          bloom_level: bloom,
          difficulty,
          knowledge_dimension: 'Metacognitive',
          created_by: 'ai',
          approved: false,
          ai_confidence_score: 0.6,
          needs_review: true,
          metadata: { generated_by: 'fallback_template', template_version: '1.0' }
        };
      }
    }
    // Creating: Essay questions
    else if (bloom === 'creating') {
      question = {
        topic,
        question_text: `${verb} a comprehensive solution for ${topic} that addresses modern challenges and requirements.`,
        question_type: 'essay',
        correct_answer: `Should include: problem analysis, creative solution design, implementation strategy, and evaluation criteria`,
        bloom_level: bloom,
        difficulty,
        knowledge_dimension: 'Metacognitive',
        created_by: 'ai',
        approved: false,
        ai_confidence_score: 0.6,
        needs_review: true,
        metadata: { generated_by: 'fallback_template', template_version: '1.0' }
      };
    } else {
      // Fallback to MCQ
      const questionText = `${verb} a key concept related to ${topic}.`;
      const choices = {
        A: `A comprehensive approach to ${topic}`,
        B: `A basic understanding of ${topic}`,
        C: `An alternative method for ${topic}`,
        D: `A contrasting view of ${topic}`
      };
      question = {
        topic,
        question_text: questionText,
        question_type: 'mcq',
        choices,
        correct_answer: 'A',
        bloom_level: bloom,
        difficulty,
        knowledge_dimension: 'Conceptual',
        created_by: 'ai',
        approved: false,
        ai_confidence_score: 0.6,
        needs_review: true,
        metadata: { generated_by: 'fallback_template', template_version: '1.0' }
      };
    }

    questions.push(question);
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