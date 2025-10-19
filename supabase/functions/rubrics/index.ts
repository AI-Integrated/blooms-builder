import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const RubricCriterionSchema = z.object({
  name: z.string().min(1, "Criterion name is required").max(200, "Criterion name must be less than 200 characters"),
  weight: z.number().min(0, "Weight must be non-negative").max(10, "Weight must be less than 10"),
  max_score: z.number().min(0, "Max score must be non-negative").max(1000, "Max score must be less than 1000"),
  order_index: z.number().int().min(0).optional()
});

const CreateRubricSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(5000, "Description must be less than 5000 characters").optional(),
  criteria: z.array(RubricCriterionSchema).min(1, "At least one criterion is required").max(50, "Maximum 50 criteria per rubric")
});

const ScoreSubmissionSchema = z.object({
  question_id: z.string().uuid("Invalid question ID"),
  test_id: z.string().uuid("Invalid test ID").optional(),
  student_id: z.string().uuid("Invalid student ID").optional(),
  student_name: z.string().min(1).max(200).optional(),
  scores: z.record(z.string(), z.number().min(0)),
  comments: z.string().max(5000).optional()
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const rubricId = pathParts[pathParts.length - 1]

    console.log(`${req.method} ${url.pathname}`)

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization')

    switch (req.method) {
      case 'GET': {
        if (rubricId && rubricId !== 'rubrics') {
          // Get specific rubric with criteria
          const { data: rubric, error: rubricError } = await supabase
            .from('rubrics')
            .select('*')
            .eq('id', rubricId)
            .single()

          if (rubricError) {
            console.error('Error fetching rubric:', rubricError)
            return new Response(
              JSON.stringify({ error: rubricError.message }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data: criteria, error: criteriaError } = await supabase
            .from('rubric_criteria')
            .select('*')
            .eq('rubric_id', rubricId)
            .order('order_index')

          if (criteriaError) {
            console.error('Error fetching criteria:', criteriaError)
            return new Response(
              JSON.stringify({ error: criteriaError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ ...rubric, criteria }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Get all rubrics for the user
          const { data: rubrics, error } = await supabase
            .from('rubrics')
            .select(`
              *,
              rubric_criteria (*)
            `)
            .order('created_at', { ascending: false })

          if (error) {
            console.error('Error fetching rubrics:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify(rubrics),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      case 'POST': {
        // Parse and validate input
        const rawBody = await req.json();
        const validationResult = CreateRubricSchema.safeParse(rawBody);
        
        if (!validationResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid input', 
              details: validationResult.error.errors 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const body = validationResult.data;

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          return new Response(
            JSON.stringify({ error: 'User not authenticated' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create rubric
        const { data: rubric, error: rubricError } = await supabase
          .from('rubrics')
          .insert({
            title: body.title,
            description: body.description,
            created_by: user.id
          })
          .select()
          .single()

        if (rubricError) {
          console.error('Error creating rubric:', rubricError)
          return new Response(
            JSON.stringify({ error: rubricError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create criteria
        const criteriaData = body.criteria.map((criterion, index) => ({
          rubric_id: rubric.id,
          name: criterion.name,
          weight: criterion.weight,
          max_score: criterion.max_score,
          order_index: criterion.order_index ?? index
        }))

        const { data: criteria, error: criteriaError } = await supabase
          .from('rubric_criteria')
          .insert(criteriaData)
          .select()

        if (criteriaError) {
          console.error('Error creating criteria:', criteriaError)
          return new Response(
            JSON.stringify({ error: criteriaError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ ...rubric, criteria }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'PUT': {
        if (!rubricId || rubricId === 'rubrics') {
          return new Response(
            JSON.stringify({ error: 'Rubric ID required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Parse and validate input
        const rawBody = await req.json();
        const validationResult = CreateRubricSchema.safeParse(rawBody);
        
        if (!validationResult.success) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid input', 
              details: validationResult.error.errors 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const body = validationResult.data;

        // Update rubric
        const { data: rubric, error: rubricError } = await supabase
          .from('rubrics')
          .update({
            title: body.title,
            description: body.description
          })
          .eq('id', rubricId)
          .select()
          .single()

        if (rubricError) {
          console.error('Error updating rubric:', rubricError)
          return new Response(
            JSON.stringify({ error: rubricError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Delete existing criteria and create new ones
        await supabase
          .from('rubric_criteria')
          .delete()
          .eq('rubric_id', rubricId)

        if (body.criteria && body.criteria.length > 0) {
          const criteriaData = body.criteria.map((criterion, index) => ({
            rubric_id: rubricId,
            name: criterion.name,
            weight: criterion.weight,
            max_score: criterion.max_score,
            order_index: criterion.order_index ?? index
          }))

          const { data: criteria, error: criteriaError } = await supabase
            .from('rubric_criteria')
            .insert(criteriaData)
            .select()

          if (criteriaError) {
            console.error('Error updating criteria:', criteriaError)
            return new Response(
              JSON.stringify({ error: criteriaError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ ...rubric, criteria }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ ...rubric, criteria: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'DELETE': {
        if (!rubricId || rubricId === 'rubrics') {
          return new Response(
            JSON.stringify({ error: 'Rubric ID required for deletion' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('rubrics')
          .delete()
          .eq('id', rubricId)

        if (error) {
          console.error('Error deleting rubric:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ message: 'Rubric deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})