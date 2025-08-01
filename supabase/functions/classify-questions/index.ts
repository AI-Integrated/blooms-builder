import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Question {
  topic: string;
  question_text: string;
  choices?: Record<string, string>;
  correct_answer?: string;
}

interface ClassificationResult {
  bloom_level: string;
  difficulty: string;
  knowledge_dimension: string;
  question_type: string;
  ai_confidence_score: number;
  needs_review: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions }: { questions: Question[] } = await req.json();
    
    console.log(`Processing ${questions.length} questions for classification`);
    
    const results: (Question & ClassificationResult)[] = [];
    
    for (const question of questions) {
      try {
        // Determine question type based on structure
        let questionType = 'essay';
        if (question.choices && Object.keys(question.choices).length > 0) {
          questionType = 'mcq';
        } else if (question.question_text.toLowerCase().includes('true or false') || 
                   question.question_text.toLowerCase().includes('t/f') ||
                   question.correct_answer?.toLowerCase() === 'true' ||
                   question.correct_answer?.toLowerCase() === 'false') {
          questionType = 'true_false';
        }

        const prompt = `Classify the following educational question based on Bloom's Taxonomy, Difficulty, and Knowledge Dimension.

Question: "${question.question_text}"
Topic: "${question.topic}"
${question.choices ? `Choices: ${JSON.stringify(question.choices)}` : ''}
${question.correct_answer ? `Correct Answer: ${question.correct_answer}` : ''}

Classify and return ONLY a JSON object with these exact fields:
{
  "bloom_level": "one of: remembering, understanding, applying, analyzing, evaluating, creating",
  "difficulty": "one of: easy, average, difficult", 
  "knowledge_dimension": "one of: factual, conceptual, procedural, metacognitive",
  "confidence": "float between 0.1 and 1.0"
}

Consider:
- Bloom's Level: What cognitive process is required?
- Difficulty: How challenging is this for the target audience?
- Knowledge Dimension: What type of knowledge is being assessed?
- Confidence: How certain are you about these classifications?`;

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
                content: 'You are an educational assessment expert. Respond only with valid JSON containing the requested classification fields.' 
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 200,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();
        
        // Parse AI response
        const classification = JSON.parse(aiResponse);
        
        const result: Question & ClassificationResult = {
          ...question,
          bloom_level: classification.bloom_level,
          difficulty: classification.difficulty,
          knowledge_dimension: classification.knowledge_dimension,
          question_type: questionType,
          ai_confidence_score: classification.confidence,
          needs_review: classification.confidence < 0.7
        };
        
        results.push(result);
        console.log(`Classified question: ${question.question_text.substring(0, 50)}...`);
        
      } catch (error) {
        console.error(`Error classifying question: ${question.question_text}`, error);
        
        // Fallback classification for failed questions
        const fallbackResult: Question & ClassificationResult = {
          ...question,
          bloom_level: 'understanding',
          difficulty: 'average',
          knowledge_dimension: 'factual',
          question_type: question.choices ? 'mcq' : 'essay',
          ai_confidence_score: 0.1,
          needs_review: true
        };
        
        results.push(fallbackResult);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      classified_questions: results,
      total_processed: results.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in classify-questions function:', error);
    return new Response(JSON.stringify({ 
      error: 'Classification failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});