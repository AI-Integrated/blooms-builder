import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  'factual': 'Target FACTUAL knowledge: terminology, specific details, basic elements.',
  'conceptual': 'Target CONCEPTUAL knowledge: theories, principles, models, classifications.',
  'procedural': 'Target PROCEDURAL knowledge: methods, techniques, algorithms, processes.',
  'metacognitive': 'Target METACOGNITIVE knowledge: self-awareness, strategic thinking, reflection.'
};

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  'Easy': 'Simple, straightforward questions with clear answers.',
  'Average': 'Moderate complexity requiring thought and understanding.',
  'Difficult': 'Complex questions requiring deep analysis or synthesis.'
};

/**
 * Generate the prompt for intent-driven pipeline (Layer 2: Question Generation)
 */
function buildIntentDrivenPrompt(
  topic: string,
  bloomLevel: string,
  knowledgeDimension: string,
  difficulty: string,
  intents: Array<{ answer_type: string; answer_type_constraint: string }>,
  isMCQ: boolean
): string {
  const questionsToGenerate = intents.map((intent, idx) => 
    `Question ${idx + 1}: Answer Type = "${intent.answer_type}" → ${intent.answer_type_constraint}`
  ).join('\n');

  return `Generate ${intents.length} DISTINCT exam question(s) using the INTENT-DRIVEN PIPELINE.

=== STRUCTURAL CONSTRAINTS (NON-NEGOTIABLE) ===
${questionsToGenerate}

=== TOPIC ===
${topic}

=== BLOOM'S LEVEL: ${bloomLevel} ===
${BLOOM_INSTRUCTIONS[bloomLevel] || BLOOM_INSTRUCTIONS['Understanding']}

=== KNOWLEDGE DIMENSION: ${knowledgeDimension.toUpperCase()} ===
${KNOWLEDGE_INSTRUCTIONS[knowledgeDimension.toLowerCase()]}

=== DIFFICULTY: ${difficulty} ===
${DIFFICULTY_INSTRUCTIONS[difficulty] || DIFFICULTY_INSTRUCTIONS['Average']}

=== CRITICAL RULES ===
1. Each question MUST strictly follow its assigned answer_type
2. Question ${1} MUST require a "${intents[0]?.answer_type}" type response
${intents.slice(1).map((i, idx) => `3. Question ${idx + 2} MUST require a "${i.answer_type}" type response`).join('\n')}
4. NO two questions may test the same reasoning path
5. Each question must demand a DIFFERENT cognitive operation

${isMCQ ? `=== MCQ FORMAT ===
- 4 choices (A, B, C, D)
- One correct answer
- Plausible distractors` : `=== ESSAY FORMAT ===
- Open-ended requiring extended response`}

Return JSON:
{
  "questions": [
    {
      "text": "Question text",
      ${isMCQ ? `"choices": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "correct_answer": "A",` : `"rubric_points": ["Point 1", "Point 2"],`}
      "answer": "Model answer that matches the answer_type requirement",
      "answer_type_note": "How this question requires a [answer_type] response"
    }
  ]
}`;
}

/**
 * Generate the legacy prompt (non-intent-driven)
 */
function buildLegacyPrompt(
  topic: string,
  bloomLevel: string,
  knowledgeDimension: string,
  difficulty: string,
  count: number,
  isMCQ: boolean
): string {
  return `Generate ${count} high-quality exam question(s).

=== TOPIC ===
${topic}

=== BLOOM'S LEVEL: ${bloomLevel} ===
${BLOOM_INSTRUCTIONS[bloomLevel] || BLOOM_INSTRUCTIONS['Understanding']}

=== KNOWLEDGE DIMENSION: ${knowledgeDimension.toUpperCase()} ===
${KNOWLEDGE_INSTRUCTIONS[knowledgeDimension.toLowerCase()]}

=== DIFFICULTY: ${difficulty} ===
${DIFFICULTY_INSTRUCTIONS[difficulty] || DIFFICULTY_INSTRUCTIONS['Average']}

${isMCQ ? `=== MCQ REQUIREMENTS ===
- 4 choices (A, B, C, D)
- One correct answer
- Plausible distractors` : `=== ESSAY REQUIREMENTS ===
- Open-ended question`}

Return JSON:
{
  "questions": [
    {
      "text": "Question text",
      ${isMCQ ? `"choices": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "correct_answer": "A",` : `"rubric_points": ["Point 1", "Point 2"],`}
      "bloom_alignment_note": "Alignment with ${bloomLevel}",
      "knowledge_alignment_note": "Targets ${knowledgeDimension} knowledge"
    }
  ]
}`;
}

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
      question_type = 'mcq',
      intents,
      pipeline_mode
    } = await req.json();

    if (!topic || !bloom_level || !knowledge_dimension) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topic, bloom_level, knowledge_dimension' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const isMCQ = question_type === 'mcq';
    const isIntentDriven = pipeline_mode === 'intent_driven' && Array.isArray(intents) && intents.length > 0;

    // Build prompt based on pipeline mode
    const prompt = isIntentDriven
      ? buildIntentDrivenPrompt(topic, bloom_level, knowledge_dimension, difficulty, intents, isMCQ)
      : buildLegacyPrompt(topic, bloom_level, knowledge_dimension, difficulty, count, isMCQ);

    const systemPrompt = isIntentDriven
      ? `You are an expert educational content creator implementing an INTENT-DRIVEN question generation pipeline. Each question has a pre-assigned ANSWER TYPE that determines its structure. You do NOT choose the structure - it is assigned. Your job is to create questions that strictly require the specified answer type. This ensures pedagogical diversity and prevents redundancy.`
      : `You are an expert educational content creator specializing in Bloom's taxonomy and knowledge dimensions.`;

    console.log(`[${isIntentDriven ? 'INTENT-DRIVEN' : 'LEGACY'}] Generating ${isIntentDriven ? intents.length : count} ${question_type} question(s): ${topic} / ${bloom_level} / ${knowledge_dimension}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: isIntentDriven ? 0.3 : 0.4, // Lower temp for more deterministic structure
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
    
    const validQuestions = questions
      .filter((q: any) => q.text && q.text.length > 10)
      .map((q: any, idx: number) => ({
        text: q.text,
        choices: q.choices,
        correct_answer: q.correct_answer,
        answer: q.answer,
        rubric_points: q.rubric_points,
        bloom_level,
        knowledge_dimension: knowledge_dimension.toLowerCase(),
        difficulty,
        topic,
        question_type,
        bloom_alignment_note: q.bloom_alignment_note,
        knowledge_alignment_note: q.knowledge_alignment_note,
        answer_type_note: q.answer_type_note,
        // Include intent info if available
        intent_answer_type: isIntentDriven && intents[idx] ? intents[idx].answer_type : undefined
      }));

    console.log(`Generated ${validQuestions.length} valid questions`);

    return new Response(
      JSON.stringify({
        success: true,
        questions: validQuestions,
        pipeline_mode: isIntentDriven ? 'intent_driven' : 'legacy'
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
