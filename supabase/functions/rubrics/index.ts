import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RubricCriterion {
  name: string;
  weight: number;
  max_score: number;
  order_index?: number;
}

interface CreateRubricRequest {
  title: string;
  description?: string;
  criteria: RubricCriterion[];
}

interface ScoreSubmissionRequest {
  question_id: string;
  test_id?: string;
  student_id?: string;
  student_name?: string;
  scores: Record<string, number>; // criterion_id -> score
  comments?: string;
}

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

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set auth context
    supabase.auth.setAuth(authHeader.replace('Bearer ', ''))

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
        const body: CreateRubricRequest = await req.json()

        if (!body.title || !body.criteria || body.criteria.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Title and criteria are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

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
          )
        }

        const body: CreateRubricRequest = await req.json()

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