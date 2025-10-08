import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionText, questionId, threshold = 0.7 } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all questions for comparison
    const { data: questions, error } = await supabaseClient
      .from('questions')
      .select('id, question_text, topic, bloom_level, knowledge_dimension')
      .neq('id', questionId || '');

    if (error) throw error;

    const similarities: Array<{
      questionId: string;
      similarity: number;
      question: any;
    }> = [];

    // Calculate similarity for each question
    for (const q of questions || []) {
      const similarity = calculateCosineSimilarity(questionText, q.question_text);
      
      if (similarity >= threshold) {
        similarities.push({
          questionId: q.id,
          similarity,
          question: q
        });

        // Store similarity score
        if (questionId) {
          await supabaseClient
            .from('question_similarities')
            .upsert({
              question1_id: questionId,
              question2_id: q.id,
              similarity_score: similarity,
              algorithm_used: 'cosine'
            });
        }
      }
    }

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    return new Response(
      JSON.stringify({
        similarities: similarities.slice(0, 10), // Return top 10
        total: similarities.length,
        threshold
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in semantic-similarity:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateCosineSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  
  const allTokens = new Set([...tokens1, ...tokens2]);
  const vector1: number[] = [];
  const vector2: number[] = [];
  
  allTokens.forEach(token => {
    vector1.push(tokens1.filter(t => t === token).length);
    vector2.push(tokens2.filter(t => t === token).length);
  });
  
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}
