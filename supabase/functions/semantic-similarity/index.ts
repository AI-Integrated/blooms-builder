import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const SimilarityRequestSchema = z.object({
  questionText: z.string().min(10, "Question text must be at least 10 characters").max(5000, "Question text must be less than 5000 characters"),
  questionId: z.string().uuid("Invalid question ID").optional(),
  threshold: z.number().min(0, "Threshold must be between 0 and 1").max(1, "Threshold must be between 0 and 1").default(0.7)
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }), 
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Parse and validate input
    const rawInput = await req.json();
    const validationResult = SimilarityRequestSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors 
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const { questionText, questionId, threshold } = validationResult.data;

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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
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
