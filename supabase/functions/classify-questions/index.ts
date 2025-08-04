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

function analyzeQuestionForKnowledgeDimension(questionText: string, topic: string, choices?: Record<string, string>): string {
  const text = questionText.toLowerCase();
  const hints: string[] = [];
  
  // Factual indicators
  const factualKeywords = ['what is', 'define', 'list', 'name', 'identify', 'when', 'where', 'who', 'what year', 'how many', 'which of the following is'];
  const hasFactualKeywords = factualKeywords.some(keyword => text.includes(keyword));
  
  // Conceptual indicators
  const conceptualKeywords = ['explain', 'compare', 'contrast', 'relationship', 'why', 'how does', 'categorize', 'classify', 'principle', 'theory', 'model'];
  const hasConceptualKeywords = conceptualKeywords.some(keyword => text.includes(keyword));
  
  // Procedural indicators
  const proceduralKeywords = ['calculate', 'solve', 'demonstrate', 'perform', 'how to', 'steps', 'procedure', 'method', 'algorithm', 'technique'];
  const hasProceduralKeywords = proceduralKeywords.some(keyword => text.includes(keyword));
  
  // Metacognitive indicators
  const metacognitiveKeywords = ['evaluate', 'assess', 'best method', 'most appropriate', 'strategy', 'approach', 'reflect', 'judge', 'critique'];
  const hasMetacognitiveKeywords = metacognitiveKeywords.some(keyword => text.includes(keyword));
  
  // Analyze question structure
  if (hasFactualKeywords) {
    hints.push('Strong factual indicators detected (definitions, facts, identification)');
  }
  
  if (hasConceptualKeywords) {
    hints.push('Conceptual indicators found (explanations, relationships, principles)');
  }
  
  if (hasProceduralKeywords) {
    hints.push('Procedural indicators detected (calculations, methods, processes)');
  }
  
  if (hasMetacognitiveKeywords) {
    hints.push('Metacognitive indicators found (evaluation, strategy selection)');
  }
  
  // Analyze choices for additional context
  if (choices) {
    const choicesText = Object.values(choices).join(' ').toLowerCase();
    if (choicesText.includes('all of the above') || choicesText.includes('none of the above')) {
      hints.push('Multiple choice structure suggests factual recall');
    }
    
    const hasNumericChoices = Object.values(choices).some(choice => /\d+/.test(choice));
    if (hasNumericChoices) {
      hints.push('Numeric choices suggest procedural knowledge (calculations)');
    }
  }
  
  // Topic-based hints
  const mathTopics = ['mathematics', 'algebra', 'calculus', 'geometry', 'statistics'];
  const scienceTopics = ['physics', 'chemistry', 'biology', 'science'];
  
  if (mathTopics.some(mathTopic => topic.toLowerCase().includes(mathTopic))) {
    if (text.includes('formula') || text.includes('equation')) {
      hints.push('Mathematical formula context suggests procedural knowledge');
    }
  }
  
  if (scienceTopics.some(sciTopic => topic.toLowerCase().includes(sciTopic))) {
    if (text.includes('experiment') || text.includes('hypothesis')) {
      hints.push('Scientific method context suggests conceptual/procedural knowledge');
    }
  }
  
  return hints.length > 0 ? hints.join('; ') : 'No clear knowledge dimension indicators detected';
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

        // Enhanced knowledge dimension detection with pre-analysis
        const knowledgeDimensionHints = analyzeQuestionForKnowledgeDimension(question.question_text, question.topic, question.choices);

        const prompt = `Classify the following educational question based on Bloom's Taxonomy, Difficulty, and Knowledge Dimension.

Question: "${question.question_text}"
Topic: "${question.topic}"
${question.choices ? `Choices: ${JSON.stringify(question.choices)}` : ''}
${question.correct_answer ? `Correct Answer: ${question.correct_answer}` : ''}

KNOWLEDGE DIMENSION ANALYSIS GUIDELINES:
- FACTUAL: Basic facts, terminology, details, elements (Who? What? When? Where?)
  * Key indicators: dates, names, definitions, lists, specific facts
  * Examples: "What year...", "Define...", "List the...", "Name the..."

- CONCEPTUAL: Relationships, principles, theories, models, structures (How? Why?)
  * Key indicators: relationships, classifications, principles, generalizations
  * Examples: "Explain how...", "Compare and contrast...", "Categorize...", "What is the relationship..."

- PROCEDURAL: Skills, algorithms, techniques, methods (How to do?)
  * Key indicators: step-by-step processes, methods, techniques, procedures
  * Examples: "How do you...", "What steps...", "Demonstrate...", "Calculate..."

- METACOGNITIVE: Self-awareness, strategic knowledge, cognitive tasks (When? Why use this?)
  * Key indicators: self-reflection, strategy selection, problem-solving approaches
  * Examples: "Which method is best...", "Evaluate your approach...", "Reflect on..."

Pre-analysis hints: ${knowledgeDimensionHints}

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
- Knowledge Dimension: Use the guidelines above and pre-analysis hints
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