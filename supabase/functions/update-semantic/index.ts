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
      // Return success with warning - don't block generation
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'question_id is required',
          skipped: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        console.warn(`Question not found: ${question_id} - skipping embedding`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: `Question not found: ${question_id}`,
            skipped: true 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      text = question.question_text;
    }

    // 2. Generate embedding using OpenAI (with graceful failure handling)
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.warn('OpenAI API key not configured - skipping embedding generation');
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'OpenAI API key not configured - embedding skipped',
          skipped: true,
          question_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let embedding: number[] | null = null;
    
    try {
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
        console.warn('OpenAI embedding error (non-blocking):', error);
        // Don't throw - return success with warning
        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: 'Embedding generation failed - will retry later',
            skipped: true,
            question_id,
            duration_ms: Date.now() - startTime 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const embeddingData = await embeddingResponse.json();
      embedding = embeddingData.data[0].embedding;
    } catch (embeddingError) {
      console.warn('Embedding API call failed (non-blocking):', embeddingError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'Embedding API call failed - will retry later',
          skipped: true,
          question_id,
          duration_ms: Date.now() - startTime 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!embedding) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'No embedding generated',
          skipped: true,
          question_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Store embedding in question (best-effort, don't fail if this fails)
    try {
      const { error: updateError } = await supabaseClient
        .from('questions')
        .update({ 
          semantic_vector: JSON.stringify(embedding)
        })
        .eq('id', question_id);

      if (updateError) {
        console.warn('Error updating question with embedding (non-blocking):', updateError);
      }
    } catch (updateErr) {
      console.warn('Failed to update semantic vector (non-blocking):', updateErr);
    }

    // 4. Find similar questions (best-effort)
    let similarities: Array<{
      question2_id: string;
      similarity_score: number;
    }> = [];

    try {
      const { data: allQuestions, error: queryError } = await supabaseClient
        .from('questions')
        .select('id, question_text, semantic_vector, topic, bloom_level, difficulty')
        .neq('id', question_id)
        .not('semantic_vector', 'is', null);

      if (!queryError && allQuestions) {
        // Calculate cosine similarity
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

        for (const q of allQuestions) {
          if (!q.semantic_vector) continue;

          try {
            const targetVector = JSON.parse(q.semantic_vector);
            const similarity = cosineSimilarity(embedding, targetVector);

            if (similarity >= 0.7) {
              similarities.push({
                question2_id: q.id,
                similarity_score: similarity,
              });
            }
          } catch {
            // Skip invalid vectors
          }
        }
      }
    } catch (similarityErr) {
      console.warn('Similarity calculation failed (non-blocking):', similarityErr);
    }

    // 5. Store similarity pairs (best-effort)
    if (similarities.length > 0) {
      try {
        const pairs = similarities.map(s => ({
          question1_id: question_id,
          question2_id: s.question2_id,
          similarity_score: s.similarity_score,
          algorithm_used: 'openai-text-embedding-3-small-cosine',
        }));

        await supabaseClient
          .from('question_similarities')
          .upsert(pairs, {
            onConflict: 'question1_id,question2_id'
          });
      } catch (upsertErr) {
        console.warn('Similarity storage failed (non-blocking):', upsertErr);
      }
    }

    const duration = Date.now() - startTime;
    
    // 6. Log metrics (best-effort)
    try {
      await supabaseClient.rpc('log_classification_metric', {
        p_question_id: question_id,
        p_confidence: similarities.length > 0 ? similarities[0].similarity_score : 0,
        p_cognitive_level: 'similarity_update',
        p_response_time_ms: duration
      });
    } catch {
      // Ignore metric logging failures
    }

    console.log(`Similarity update completed for ${question_id}: ${similarities.length} similar questions found in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        question_id,
        similar_count: similarities.length,
        duration_ms: duration,
        skipped: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Even on unexpected errors, return 200 to not block generation
    console.error('Error in update-semantic (non-blocking):', error);
    return new Response(
      JSON.stringify({ 
        success: true,
        warning: error instanceof Error ? error.message : 'Unknown error occurred',
        skipped: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
