import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Role check - teacher or admin only
    const roleServiceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userRole } = await roleServiceClient.rpc('get_user_role', { user_id: claimsData.claims.sub });
    if (!userRole || !['admin', 'teacher'].includes(userRole)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { questions, classifyType } = await req.json();
    
    if (!questions || !Array.isArray(questions)) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: questions array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation
    if (questions.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Maximum 100 questions per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    for (const q of questions) {
      if (q.text && q.text.length > 10000) {
        return new Response(
          JSON.stringify({ error: 'Each question text must be at most 10000 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a knowledge-dimension-only classification
    const isKnowledgeOnly = classifyType === 'knowledge_dimension';

    const results = [];

    // Process questions in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      let prompt: string;
      
      if (isKnowledgeOnly) {
        // Knowledge dimension only classification
        prompt = `Classify each of the following exam questions into ONE knowledge dimension:

Knowledge Dimensions:
- Factual: Basic elements, terminology, specific details, facts
- Conceptual: Theories, principles, models, classifications, relationships
- Procedural: Methods, techniques, algorithms, step-by-step processes
- Metacognitive: Self-awareness, strategic thinking, reflection on learning

Questions to classify:
${batch.map((q: any, index: number) => `${i + index + 1}. ${q.text}`).join('\n')}

Return a JSON object with a "results" array:
{
  "results": [
    {
      "index": 0,
      "knowledge_dimension": "conceptual",
      "confidence": 0.85,
      "reasoning": "Brief explanation"
    }
  ]
}

IMPORTANT: knowledge_dimension must be lowercase (factual, conceptual, procedural, metacognitive).`;
      } else {
        // Full classification (Bloom + Knowledge + Difficulty)
        prompt = `Classify each of the following educational questions according to:
1. Bloom's Taxonomy Level (Remembering, Understanding, Applying, Analyzing, Evaluating, Creating)
2. Knowledge Dimension (Factual, Conceptual, Procedural, Metacognitive)
3. Difficulty Level (Easy, Average, Difficult)

Questions to classify:
${batch.map((q: any, index: number) => `${i + index + 1}. ${q.text}`).join('\n')}

Return a JSON object with a "results" array containing objects in this exact format:
{
  "results": [
    {
      "index": 0,
      "bloom_level": "Understanding",
      "knowledge_dimension": "conceptual",
      "difficulty": "Average",
      "confidence": 0.85,
      "reasoning": "Brief explanation of classification"
    }
  ]
}

IMPORTANT: knowledge_dimension must be lowercase (factual, conceptual, procedural, metacognitive).`;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert in educational assessment, Bloom\'s taxonomy, and Anderson & Krathwohl\'s knowledge dimensions. Classify questions accurately based on cognitive demands and knowledge types.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 2000
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error for batch:', await response.text());
        // Return rule-based classification as fallback
        const fallbackResults = batch.map((q: any, batchIndex: number) => ({
          index: i + batchIndex,
          bloom_level: 'Understanding',
          knowledge_dimension: 'conceptual',
          difficulty: 'Average',
          confidence: 0.5,
          reasoning: 'Fallback classification due to AI service error'
        }));
        results.push(...fallbackResults);
        continue;
      }

      const aiResponse = await response.json();
      
      try {
        const content = JSON.parse(aiResponse.choices[0].message.content);
        const batchResults = content.results || content.classifications || [];
        
        // Validate and add to results
        for (const result of batchResults) {
          // Normalize knowledge_dimension to lowercase
          if (result.knowledge_dimension) {
            result.knowledge_dimension = result.knowledge_dimension.toLowerCase();
          }
          results.push(result);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response for batch:', parseError);
        // Add fallback classifications
        const fallbackResults = batch.map((q: any, batchIndex: number) => ({
          index: i + batchIndex,
          bloom_level: 'Understanding',
          knowledge_dimension: 'conceptual',
          difficulty: 'Average',
          confidence: 0.5,
          reasoning: 'Fallback classification due to parsing error'
        }));
        results.push(...fallbackResults);
      }

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
