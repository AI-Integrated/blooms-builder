import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SimilarityRequest {
  question_id: string;
  question_text?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { question_id, question_text } = await req.json() as SimilarityRequest;

    if (!question_id) {
      return new Response(
        JSON.stringify({ error: 'question_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing similarity update for question: ${question_id}`);

    // 1. Get question text if not provided
    let text = question_text;
    if (!text) {
      const { data: question, error: fetchError } = await supabaseClient
        .from('questions')
        .select('question_text')
        .eq('id', question_id)
        .single();

      if (fetchError || !question) {
        throw new Error(`Question not found: ${question_id}`);
      }
      text = question.question_text;
    }

    // 2. Generate embedding using OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('Service temporarily unavailable');
    }

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI embedding error:', error);
      throw new Error('Failed to generate embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // 3. Store embedding in question
    const { error: updateError } = await supabaseClient
      .from('questions')
      .update({ 
        semantic_vector: JSON.stringify(embedding),
        metadata: supabaseClient.rpc('jsonb_set', {
          target: 'metadata',
          path: '{needs_similarity_update}',
          new_value: 'false'
        })
      })
      .eq('id', question_id);

    if (updateError) {
      console.error('Error updating question with embedding:', updateError);
      throw updateError;
    }

    // 4. Find similar questions
    const { data: allQuestions, error: queryError } = await supabaseClient
      .from('questions')
      .select('id, question_text, semantic_vector, topic, bloom_level, difficulty')
      .neq('id', question_id)
      .not('semantic_vector', 'is', null);

    if (queryError) {
      console.error('Error fetching questions:', queryError);
      throw queryError;
    }

    // Calculate cosine similarity
    const similarities: Array<{
      question2_id: string;
      similarity_score: number;
    }> = [];

    const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }

      const denominator = Math.sqrt(normA) * Math.sqrt(normB);
      return denominator === 0 ? 0 : dotProduct / denominator;
    };

    for (const q of allQuestions || []) {
      if (!q.semantic_vector) continue;

      const targetVector = JSON.parse(q.semantic_vector);
      const similarity = cosineSimilarity(embedding, targetVector);

      if (similarity >= 0.7) {
        similarities.push({
          question2_id: q.id,
          similarity_score: similarity,
        });
      }
    }

    // 5. Store similarity pairs
    if (similarities.length > 0) {
      const pairs = similarities.map(s => ({
        question1_id: question_id,
        question2_id: s.question2_id,
        similarity_score: s.similarity_score,
        algorithm_used: 'openai-text-embedding-3-small-cosine',
      }));

      const { error: similarityError } = await supabaseClient
        .from('question_similarities')
        .upsert(pairs, {
          onConflict: 'question1_id,question2_id'
        });

      if (similarityError) {
        console.error('Error storing similarities:', similarityError);
        throw similarityError;
      }
    }

    const duration = Date.now() - startTime;
    
    // 6. Log metrics
    await supabaseClient.rpc('log_classification_metric', {
      p_question_id: question_id,
      p_confidence: similarities.length > 0 ? similarities[0].similarity_score : 0,
      p_cognitive_level: 'similarity_update',
      p_response_time_ms: duration
    });

    console.log(`Similarity update completed for ${question_id}: ${similarities.length} similar questions found in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        question_id,
        similar_count: similarities.length,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-semantic:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
