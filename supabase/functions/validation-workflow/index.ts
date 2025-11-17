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
    const { action, questionId, classification, confidence, notes } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) throw new Error('Unauthorized');

    switch (action) {
      case 'validate': {
        // Get original classification
        const { data: question } = await supabaseClient
          .from('questions')
          .select('bloom_level, knowledge_dimension, difficulty')
          .eq('id', questionId)
          .single();

        // Log validation
        await supabaseClient
          .from('classification_validations')
          .insert({
            question_id: questionId,
            original_classification: question,
            validated_classification: classification,
            validator_id: user.id,
            validation_confidence: confidence,
            notes,
            validation_type: 'manual'
          });

        // Update question
        await supabaseClient
          .from('questions')
          .update({
            ...classification,
            validation_status: 'validated',
            validated_by: user.id,
            validation_timestamp: new Date().toISOString(),
            classification_confidence: confidence,
            needs_review: false
          })
          .eq('id', questionId);

        return new Response(
          JSON.stringify({ success: true, message: 'Classification validated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reject': {
        await supabaseClient
          .from('questions')
          .update({
            validation_status: 'rejected',
            validated_by: user.id,
            validation_timestamp: new Date().toISOString(),
            needs_review: true,
            metadata: { rejection_notes: notes }
          })
          .eq('id', questionId);

        return new Response(
          JSON.stringify({ success: true, message: 'Classification rejected' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'batch_validate': {
        const { questionIds, autoApproveThreshold = 0.9 } = await req.json();

        const results = {
          validated: 0,
          needsReview: 0,
          rejected: 0
        };

        for (const qId of questionIds) {
          const { data: q } = await supabaseClient
            .from('questions')
            .select('classification_confidence')
            .eq('id', qId)
            .single();

          if (q && q.classification_confidence >= autoApproveThreshold) {
            await supabaseClient
              .from('questions')
              .update({
                validation_status: 'validated',
                validated_by: user.id,
                validation_timestamp: new Date().toISOString()
              })
              .eq('id', qId);
            results.validated++;
          } else {
            results.needsReview++;
          }
        }

        return new Response(
          JSON.stringify({ success: true, results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in validation-workflow:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
