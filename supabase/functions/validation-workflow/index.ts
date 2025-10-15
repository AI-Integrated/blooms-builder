import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const classificationSchema = z.object({
  bloom_level: z.string().min(2).max(100).optional(),
  knowledge_dimension: z.string().min(2).max(100).optional(),
  difficulty: z.string().min(2).max(100).optional(),
  cognitive_level: z.string().min(2).max(100).optional()
});

const validateRequestSchema = z.object({
  action: z.literal('validate'),
  questionId: z.string().uuid(),
  classification: classificationSchema,
  confidence: z.number().min(0).max(1),
  notes: z.string().max(1000).optional()
});

const rejectRequestSchema = z.object({
  action: z.literal('reject'),
  questionId: z.string().uuid(),
  notes: z.string().max(1000).optional()
});

const batchValidateRequestSchema = z.object({
  action: z.literal('batch_validate'),
  questionIds: z.array(z.string().uuid()).min(1).max(100),
  autoApproveThreshold: z.number().min(0).max(1).default(0.9)
});

const requestSchema = z.discriminatedUnion('action', [
  validateRequestSchema,
  rejectRequestSchema,
  batchValidateRequestSchema
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    const rawInput = await req.json();
    const input = requestSchema.parse(rawInput);

    switch (input.action) {
      case 'validate': {
        const { questionId, classification, confidence, notes } = input;

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
        const { questionId, notes } = input;

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
        const { questionIds, autoApproveThreshold } = input;

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
    }
  } catch (error) {
    console.error('Error in validation-workflow:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: error.errors 
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});