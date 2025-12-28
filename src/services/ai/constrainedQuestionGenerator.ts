/**
 * Bloom × Knowledge Constrained Question Generator
 * 
 * Generates questions with strict pedagogical constraints.
 * AI operates inside academic boundaries.
 */

import { supabase } from '@/integrations/supabase/client';
import type { KnowledgeDimension, BloomKnowledgeConstraint } from '@/types/knowledge';

interface GeneratedQuestion {
  text: string;
  choices?: Record<string, string>;
  correct_answer?: string;
  bloom_level: string;
  knowledge_dimension: KnowledgeDimension;
  difficulty: string;
  topic: string;
}

interface GenerationResult {
  success: boolean;
  questions: GeneratedQuestion[];
  error?: string;
}

const BLOOM_INSTRUCTIONS: Record<string, string> = {
  'Remembering': 'Focus on recall and recognition. Use verbs: define, list, identify, name, state, recall.',
  'Understanding': 'Focus on comprehension. Use verbs: explain, summarize, describe, interpret, classify.',
  'Applying': 'Focus on using knowledge. Use verbs: apply, solve, implement, demonstrate, use.',
  'Analyzing': 'Focus on breaking down information. Use verbs: analyze, compare, examine, differentiate.',
  'Evaluating': 'Focus on making judgments. Use verbs: evaluate, justify, critique, assess, argue.',
  'Creating': 'Focus on producing new work. Use verbs: design, create, compose, formulate, construct.'
};

const KNOWLEDGE_INSTRUCTIONS: Record<KnowledgeDimension, string> = {
  'factual': 'Target factual knowledge: terminology, specific details, basic elements. Questions should test recall of facts, definitions, or specific information.',
  'conceptual': 'Target conceptual knowledge: theories, principles, models, classifications. Questions should test understanding of relationships and interrelations.',
  'procedural': 'Target procedural knowledge: methods, techniques, algorithms, processes. Questions should test ability to apply procedures or solve problems step-by-step.',
  'metacognitive': 'Target metacognitive knowledge: self-awareness, strategic thinking. Questions should require reflection on thinking processes, strategy evaluation, or learning approach assessment.'
};

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  'Easy': 'Simple, straightforward questions with clear answers. Basic application of knowledge.',
  'Average': 'Moderate complexity requiring thought and understanding. May involve some analysis.',
  'Difficult': 'Complex questions requiring deep analysis, synthesis, or evaluation. May have nuanced answers.'
};

/**
 * Generate a single question with Bloom × Knowledge constraints
 */
export async function generateConstrainedQuestion(
  constraint: BloomKnowledgeConstraint
): Promise<GeneratedQuestion | null> {
  const result = await generateConstrainedQuestions({ ...constraint, count: 1 });
  return result.success && result.questions.length > 0 ? result.questions[0] : null;
}

/**
 * Generate multiple questions with Bloom × Knowledge constraints
 */
export async function generateConstrainedQuestions(
  constraint: BloomKnowledgeConstraint & { count?: number; questionType?: 'mcq' | 'essay' }
): Promise<GenerationResult> {
  const { 
    topic, 
    bloomLevel, 
    knowledgeDimension, 
    difficulty = 'Average',
    count = 1,
    questionType = 'mcq'
  } = constraint;

  try {
    const { data, error } = await supabase.functions.invoke('generate-constrained-questions', {
      body: {
        topic,
        bloom_level: bloomLevel,
        knowledge_dimension: knowledgeDimension,
        difficulty,
        count,
        question_type: questionType,
        bloom_instructions: BLOOM_INSTRUCTIONS[bloomLevel] || BLOOM_INSTRUCTIONS['Understanding'],
        knowledge_instructions: KNOWLEDGE_INSTRUCTIONS[knowledgeDimension],
        difficulty_instructions: DIFFICULTY_INSTRUCTIONS[difficulty] || DIFFICULTY_INSTRUCTIONS['Average']
      }
    });

    if (error) {
      console.error('Question generation error:', error);
      return { success: false, questions: [], error: error.message };
    }

    const questions: GeneratedQuestion[] = (data?.questions || []).map((q: any) => ({
      text: q.text,
      choices: q.choices,
      correct_answer: q.correct_answer,
      bloom_level: bloomLevel,
      knowledge_dimension: knowledgeDimension,
      difficulty,
      topic
    }));

    return { success: true, questions };

  } catch (err) {
    console.error('Generation failed:', err);
    return { 
      success: false, 
      questions: [], 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Validate that a question aligns with its Bloom × Knowledge constraints
 */
export function validateQuestionConstraints(
  question: GeneratedQuestion
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Basic validation
  if (!question.text || question.text.length < 10) {
    issues.push('Question text too short');
  }

  if (!question.bloom_level) {
    issues.push('Missing Bloom level');
  }

  if (!question.knowledge_dimension) {
    issues.push('Missing knowledge dimension');
  }

  // MCQ validation
  if (question.choices) {
    const choiceKeys = Object.keys(question.choices);
    if (choiceKeys.length < 2) {
      issues.push('MCQ requires at least 2 choices');
    }
    if (!question.correct_answer || !choiceKeys.includes(question.correct_answer)) {
      issues.push('Invalid or missing correct answer');
    }
  }

  return { valid: issues.length === 0, issues };
}
