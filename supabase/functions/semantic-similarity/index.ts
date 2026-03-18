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
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Role check - teacher or admin only
    const roleClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userRole } = await roleClient.rpc('get_user_role', { user_id: claimsData.claims.sub });
    if (!userRole || !['admin', 'teacher'].includes(userRole)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { questionText, questionId, threshold = 0.7 } = await req.json();

    // Input validation
    if (!questionText || typeof questionText !== 'string') {
      return new Response(JSON.stringify({ error: 'questionText is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (questionText.length > 10000) {
      return new Response(JSON.stringify({ error: 'questionText must be at most 10000 characters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    for (const q of questions || []) {
      const similarity = calculateCosineSimilarity(questionText, q.question_text);
      
      if (similarity >= threshold) {
        similarities.push({
          questionId: q.id,
          similarity,
          question: q
        });

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

    similarities.sort((a, b) => b.similarity - a.similarity);

    return new Response(
      JSON.stringify({
        similarities: similarities.slice(0, 10),
        total: similarities.length,
        threshold
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in semantic-similarity:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
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
