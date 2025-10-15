import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const generateRequestSchema = z.object({
  tos_id: z.string().uuid("Invalid TOS ID format"),
  request: z.object({
    topic: z.string().min(2, "Topic must be at least 2 characters").max(200, "Topic must be less than 200 characters"),
    bloom_level: z.enum(['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating']),
    difficulty: z.enum(['Easy', 'Average', 'Difficult']),
    count: z.number().int().min(1).max(20).default(5)
  })
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    const rawInput = await req.json();
    const { tos_id, request } = generateRequestSchema.parse(rawInput);
    const { topic, bloom_level, difficulty, count } = request;

    console.log('Generating questions for:', { tos_id, topic, bloom_level, difficulty, count, user_id: user.id });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bloomInstructions = {
      'Remembering': 'Focus on recall, recognition, and basic facts. Use verbs like define, list, identify, state.',
      'Understanding': 'Focus on comprehension and explanation. Use verbs like explain, summarize, describe, interpret.',
      'Applying': 'Focus on using knowledge in new situations. Use verbs like apply, use, implement, solve.',
      'Analyzing': 'Focus on breaking down information. Use verbs like analyze, compare, examine, categorize.',
      'Evaluating': 'Focus on making judgments. Use verbs like evaluate, justify, critique, assess.',
      'Creating': 'Focus on producing new work. Use verbs like design, create, compose, formulate.'
    };

    const difficultyInstructions = {
      'Easy': 'Simple, straightforward questions with obvious answers.',
      'Average': 'Moderate complexity requiring some thought and understanding.',
      'Difficult': 'Complex questions requiring deep analysis and critical thinking.'
    };

    const prompt = `Generate ${count} multiple-choice questions for the topic "${topic}" at Bloom's taxonomy level "${bloom_level}" with "${difficulty}" difficulty.

Bloom's Level Instructions: ${bloomInstructions[bloom_level as keyof typeof bloomInstructions] || bloomInstructions['Understanding']}

Difficulty Instructions: ${difficultyInstructions[difficulty as keyof typeof difficultyInstructions] || difficultyInstructions['Average']}

Requirements:
1. Each question must have exactly 4 choices (A, B, C, D)
2. Only one correct answer per question
3. Distractors must be plausible but clearly incorrect
4. No "All of the above" or "None of the above" options
5. Choices should be similar in length and grammatical structure
6. Questions should align with the specified Bloom's level and difficulty

Return a JSON object with an "items" array containing questions in this exact format:
{
  "items": [
    {
      "text": "Question text here?",
      "choices": {
        "A": "First choice",
        "B": "Second choice", 
        "C": "Third choice",
        "D": "Fourth choice"
      },
      "correct_answer": "A",
      "bloom_level": "${bloom_level}",
      "difficulty": "${difficulty}",
      "knowledge_dimension": "Conceptual"
    }
  ]
}`;

    console.log('Sending prompt to OpenAI...');

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
            content: 'You are an expert educational content creator specializing in generating high-quality multiple-choice questions that align with Bloom\'s taxonomy and educational standards.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate questions from AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('OpenAI response received');

    let generatedQuestions;
    try {
      const content = aiResponse.choices[0].message.content;
      generatedQuestions = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const items = generatedQuestions.items || [];
    console.log(`Generated ${items.length} questions`);

    const validQuestions = items.filter((q: any) => {
      return (
        q.text && q.text.length > 10 &&
        q.choices && 
        ['A', 'B', 'C', 'D'].every(key => q.choices[key] && q.choices[key].length > 0) &&
        ['A', 'B', 'C', 'D'].includes(q.correct_answer)
      );
    });

    console.log(`${validQuestions.length} questions passed validation`);

    if (validQuestions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid questions were generated' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const questionsToInsert = validQuestions.map((q: any) => ({
      tos_id,
      topic,
      question_text: q.text,
      question_type: 'multiple-choice',
      choices: q.choices,
      correct_answer: q.correct_answer,
      bloom_level: q.bloom_level || bloom_level,
      difficulty: q.difficulty || difficulty,
      knowledge_dimension: q.knowledge_dimension || 'Conceptual',
      created_by: 'ai',
      approved: false,
      confidence_score: 0.8,
      owner: user.id
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select('*');

    if (insertError) {
      console.error('Database insertion error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save questions to database', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully inserted ${insertedQuestions?.length || 0} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        generated_count: validQuestions.length,
        inserted_count: insertedQuestions?.length || 0,
        questions: insertedQuestions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    
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
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});