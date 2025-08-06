import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { tosMatrix } = await req.json();
    
    if (!tosMatrix) {
      throw new Error('TOS matrix is required');
    }

    const { formData, distribution } = tosMatrix;
    
    // Create a detailed prompt for question generation
    const prompt = `Generate test questions based on this Table of Specification:

Subject: ${formData.subjectDescription} (${formData.subjectNo})
Course: ${formData.course}
Total Items: ${formData.totalItems}

Topics and Bloom's Level Distribution:
${Object.entries(distribution).map(([topic, levels]: [string, any]) => `
Topic: ${topic}
- Remembering (Easy): ${levels.remembering.length} questions
- Understanding (Easy): ${levels.understanding.length} questions  
- Applying (Average): ${levels.applying.length} questions
- Analyzing (Average): ${levels.analyzing.length} questions
- Evaluating (Difficult): ${levels.evaluating.length} questions
- Creating (Difficult): ${levels.creating.length} questions
`).join('\n')}

Generate EXACTLY ${formData.totalItems} multiple choice questions following these requirements:

1. Each question should have 4 choices (A, B, C, D)
2. Include the correct answer
3. Match the specified Bloom's taxonomy level for each topic
4. Use appropriate difficulty level based on Bloom's level:
   - Easy: Remembering, Understanding
   - Average: Applying, Analyzing  
   - Difficult: Evaluating, Creating
5. Make questions relevant to ${formData.subjectDescription}
6. Number questions sequentially from 1 to ${formData.totalItems}

Return response as a JSON array with this exact structure:
[
  {
    "id": 1,
    "question_text": "Question text here?",
    "question_type": "multiple_choice",
    "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correct_answer": "Choice A",
    "bloom_level": "remembering",
    "difficulty": "easy",
    "topic": "Topic name",
    "knowledge_dimension": "factual"
  }
]

Make sure to distribute questions exactly as specified in the TOS matrix.`;

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
            content: 'You are an expert educational assessment developer. Generate high-quality test questions that align precisely with the given Table of Specification. Always return valid JSON format.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;
    
    // Parse the JSON response
    let questions;
    try {
      questions = JSON.parse(generatedContent);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse generated questions as JSON');
      }
    }

    return new Response(JSON.stringify({ 
      questions,
      tosMatrix: tosMatrix,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-questions-from-tos function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});