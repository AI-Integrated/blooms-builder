import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLOOM_INSTRUCTIONS: Record<string, string> = {
  'Remembering': 'Focus on recall and recognition. Use verbs: define, list, identify, name, state, recall, recognize.',
  'Understanding': 'Focus on comprehension and explanation. Use verbs: explain, summarize, describe, interpret, classify, compare.',
  'Applying': 'Focus on using knowledge in new situations. Use verbs: apply, solve, implement, demonstrate, use, execute.',
  'Analyzing': 'Focus on breaking down information. Use verbs: analyze, compare, examine, differentiate, organize, deconstruct.',
  'Evaluating': 'Focus on making judgments and decisions. Use verbs: evaluate, justify, critique, assess, argue, defend.',
  'Creating': 'Focus on producing new or original work. Use verbs: design, create, compose, formulate, construct, generate.'
};

const KNOWLEDGE_INSTRUCTIONS: Record<string, string> = {
  'factual': 'Target FACTUAL knowledge: terminology, specific details, basic elements. Questions should test recall of facts, definitions, dates, or specific information that can be verified.',
  'conceptual': 'Target CONCEPTUAL knowledge: theories, principles, models, classifications. Questions should test understanding of relationships, categories, structures, and interrelations between concepts.',
  'procedural': 'Target PROCEDURAL knowledge: methods, techniques, algorithms, processes. Questions should test ability to apply procedures, follow steps, or solve problems using specific methods.',
  'metacognitive': 'Target METACOGNITIVE knowledge: self-awareness, strategic thinking, reflection. Questions should require students to reflect on their thinking processes, evaluate their approach, or justify their learning strategies.'
};

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  'Easy': 'Create simple, straightforward questions with clear, unambiguous answers. Basic application of knowledge with minimal cognitive load.',
  'Average': 'Create questions with moderate complexity requiring thoughtful analysis. May involve multiple steps or some interpretation.',
  'Difficult': 'Create complex questions requiring deep analysis, synthesis, or evaluation. May have nuanced answers or require integration of multiple concepts.'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic, 
      bloom_level, 
      knowledge_dimension,
      difficulty = 'Average',
      count = 1,
      question_type = 'mcq'
    } = await req.json();

    // Validate required fields
    if (!topic || !bloom_level || !knowledge_dimension) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topic, bloom_level, knowledge_dimension' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate knowledge_dimension
    const validDimensions = ['factual', 'conceptual', 'procedural', 'metacognitive'];
    if (!validDimensions.includes(knowledge_dimension.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: `Invalid knowledge_dimension. Must be one of: ${validDimensions.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bloomInstruction = BLOOM_INSTRUCTIONS[bloom_level] || BLOOM_INSTRUCTIONS['Understanding'];
    const knowledgeInstruction = KNOWLEDGE_INSTRUCTIONS[knowledge_dimension.toLowerCase()];
    const difficultyInstruction = DIFFICULTY_INSTRUCTIONS[difficulty] || DIFFICULTY_INSTRUCTIONS['Average'];

    const isMCQ = question_type === 'mcq';

    const prompt = `Generate ${count} high-quality exam question(s) with STRICT pedagogical constraints.

=== TOPIC ===
${topic}

=== BLOOM'S TAXONOMY LEVEL: ${bloom_level} ===
${bloomInstruction}

=== KNOWLEDGE DIMENSION: ${knowledge_dimension.toUpperCase()} ===
${knowledgeInstruction}

=== DIFFICULTY: ${difficulty} ===
${difficultyInstruction}

=== CRITICAL ALIGNMENT RULES ===
1. The question MUST align with the specified Bloom's level - use appropriate cognitive verbs
2. The question MUST target the specified knowledge dimension - factual asks for facts, procedural asks for processes, etc.
3. ${knowledge_dimension === 'factual' ? 'Avoid asking "why" or "explain" - focus on "what", "when", "who", "which"' : ''}
4. ${knowledge_dimension === 'procedural' ? 'Include scenarios requiring application of steps or methods' : ''}
5. ${knowledge_dimension === 'metacognitive' ? 'Include reflection, self-assessment, or strategy evaluation elements' : ''}

${isMCQ ? `=== MCQ REQUIREMENTS ===
- Exactly 4 choices (A, B, C, D)
- Only one correct answer
- Plausible distractors that reflect common misconceptions
- No "All of the above" or "None of the above"
- Choices should be similar in length and structure` : `=== ESSAY REQUIREMENTS ===
- Open-ended question requiring extended response
- Clear expectations for what should be addressed
- Aligned with the cognitive level specified`}

Return a JSON object:
{
  "questions": [
    {
      "text": "Question text here?",
      ${isMCQ ? `"choices": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "correct_answer": "A",` : `"rubric_points": ["Point 1", "Point 2", "Point 3"],`}
      "bloom_alignment_note": "How this aligns with ${bloom_level}",
      "knowledge_alignment_note": "How this targets ${knowledge_dimension} knowledge"
    }
  ]
}`;

    console.log(`Generating ${count} ${question_type} question(s): ${topic} / ${bloom_level} / ${knowledge_dimension}`);

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
            content: `You are an expert educational content creator specializing in Bloom's taxonomy and Anderson & Krathwohl's knowledge dimensions. You create pedagogically rigorous questions that precisely target specific cognitive levels and knowledge types. Your questions are used for formal academic assessment.`
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

    const questions = generatedQuestions.questions || [];
    
    // Validate and enhance questions
    const validQuestions = questions
      .filter((q: any) => q.text && q.text.length > 10)
      .map((q: any) => ({
        text: q.text,
        choices: q.choices,
        correct_answer: q.correct_answer,
        rubric_points: q.rubric_points,
        bloom_level,
        knowledge_dimension: knowledge_dimension.toLowerCase(),
        difficulty,
        topic,
        question_type,
        bloom_alignment_note: q.bloom_alignment_note,
        knowledge_alignment_note: q.knowledge_alignment_note
      }));

    console.log(`Generated ${validQuestions.length} valid questions`);

    return new Response(
      JSON.stringify({
        success: true,
        questions: validQuestions
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
