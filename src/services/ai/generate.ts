import { classifyQuestion } from "./classify";
import type { BloomLevel, KnowledgeDimension, Difficulty } from "./classify";

export interface GenerationInput {
  topic: string;
  bloom: BloomLevel;
  difficulty: Difficulty;
  count: number;
  type: 'mcq' | 'true_false' | 'short_answer' | 'essay';
  constraints?: { 
    choices?: number;
    max_length?: number;
  };
}

export interface GeneratedQuestion {
  topic: string;
  question_text: string;
  question_type: string;
  choices?: Record<string, string>;
  correct_answer?: string;
  bloom_level: string;
  difficulty: string;
  knowledge_dimension: string;
  created_by: 'ai';
  approved: boolean;
  ai_confidence_score: number;
  needs_review: boolean;
  metadata: {
    generated_by: string;
    template_version: string;
    generation_method: string;
  };
}

// Question templates by Bloom level and type
const questionTemplates = {
  remembering: {
    mcq: [
      "Which of the following best defines {topic}?",
      "What is the primary characteristic of {topic}?",
      "Identify the main component of {topic}.",
      "Select the correct term for {topic}."
    ],
    essay: [
      "Define {topic} and list its key characteristics.",
      "Identify the main elements of {topic}.",
      "List the fundamental principles of {topic}."
    ]
  },
  understanding: {
    mcq: [
      "Which statement best explains {topic}?",
      "How does {topic} relate to its broader context?",
      "What is the significance of {topic}?",
      "Which example best illustrates {topic}?"
    ],
    essay: [
      "Explain the concept of {topic} in your own words.",
      "Describe how {topic} functions in practice.",
      "Summarize the key principles underlying {topic}."
    ]
  },
  applying: {
    mcq: [
      "In which scenario would you apply {topic}?",
      "How would you use {topic} to solve this problem?",
      "Which approach demonstrates the application of {topic}?",
      "What is the best way to implement {topic}?"
    ],
    essay: [
      "Demonstrate how to apply {topic} in a real-world scenario.",
      "Show how {topic} can be used to solve practical problems.",
      "Apply the principles of {topic} to a specific case."
    ]
  },
  analyzing: {
    mcq: [
      "Which factor most influences {topic}?",
      "How do the components of {topic} interact?",
      "What is the relationship between {topic} and related concepts?",
      "Which element is most critical to {topic}?"
    ],
    essay: [
      "Analyze the key components of {topic} and their relationships.",
      "Examine the factors that influence {topic}.",
      "Compare and contrast different aspects of {topic}."
    ]
  },
  evaluating: {
    mcq: [
      "Which approach to {topic} is most effective?",
      "What is the strongest argument for {topic}?",
      "Which criterion best evaluates {topic}?",
      "What is the most significant limitation of {topic}?"
    ],
    essay: [
      "Evaluate the effectiveness of {topic} in achieving its goals.",
      "Assess the strengths and weaknesses of {topic}.",
      "Critique the current understanding of {topic}."
    ]
  },
  creating: {
    mcq: [
      "Which design would best incorporate {topic}?",
      "How would you modify {topic} to improve it?",
      "What new approach could enhance {topic}?",
      "Which innovation builds upon {topic}?"
    ],
    essay: [
      "Design a new approach to {topic} that addresses current limitations.",
      "Create a comprehensive plan incorporating {topic}.",
      "Develop an innovative solution using {topic}."
    ]
  }
};

// Generate realistic MCQ choices
function generateMCQChoices(topic: string, bloom: BloomLevel, correctAnswer: string): Record<string, string> {
  const choiceTemplates = {
    remembering: [
      `The fundamental definition of ${topic}`,
      `A basic characteristic of ${topic}`,
      `An alternative interpretation of ${topic}`,
      `A related but distinct concept`
    ],
    understanding: [
      `A comprehensive explanation of ${topic}`,
      `A partial understanding of ${topic}`,
      `A common misconception about ${topic}`,
      `An unrelated concept`
    ],
    applying: [
      `The correct application of ${topic}`,
      `A misapplication of ${topic}`,
      `A theoretical approach to ${topic}`,
      `An unrelated method`
    ],
    analyzing: [
      `The most significant factor in ${topic}`,
      `A contributing factor to ${topic}`,
      `An unrelated variable`,
      `A contradictory element`
    ],
    evaluating: [
      `The most effective approach to ${topic}`,
      `A moderately effective approach`,
      `An ineffective approach`,
      `An unrelated strategy`
    ],
    creating: [
      `An innovative solution using ${topic}`,
      `A traditional approach to ${topic}`,
      `A flawed implementation`,
      `An unrelated design`
    ]
  };

  const templates = choiceTemplates[bloom] || choiceTemplates.understanding;
  
  return {
    A: correctAnswer,
    B: templates[1] || `Alternative approach to ${topic}`,
    C: templates[2] || `Different perspective on ${topic}`,
    D: templates[3] || `Unrelated option`
  };
}

export function generateQuestions(input: GenerationInput): GeneratedQuestion[] {
  const { topic, bloom, difficulty, count, type } = input;
  const questions: GeneratedQuestion[] = [];
  
  const templates = questionTemplates[bloom]?.[type === 'mcq' ? 'mcq' : 'essay'] || 
                   questionTemplates.understanding.mcq;
  
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const questionText = template.replace(/{topic}/g, topic);
    
    let choices: Record<string, string> | undefined;
    let correctAnswer: string | undefined;
    
    if (type === 'mcq') {
      const correctAnswerText = `The correct understanding of ${topic}`;
      choices = generateMCQChoices(topic, bloom, correctAnswerText);
      correctAnswer = 'A';
    } else if (type === 'true_false') {
      correctAnswer = Math.random() > 0.5 ? 'True' : 'False';
    }
    
    // Classify the generated question to ensure consistency
    const classification = classifyQuestion(questionText, type);
    
    questions.push({
      topic,
      question_text: questionText,
      question_type: type,
      choices,
      correct_answer: correctAnswer,
      bloom_level: classification.bloom_level,
      difficulty: classification.difficulty,
      knowledge_dimension: classification.knowledge_dimension,
      created_by: 'ai',
      approved: false,
      ai_confidence_score: classification.confidence,
      needs_review: classification.needs_review,
      metadata: {
        generated_by: 'template_system',
        template_version: '1.0',
        generation_method: 'rule_based'
      }
    });
  }
  
  return questions;
}

export function generateQuestionsForNeed(
  topic: string,
  bloom: BloomLevel,
  difficulty: Difficulty,
  count: number,
  type: 'mcq' | 'essay' | 'true_false' | 'short_answer' = 'mcq'
): GeneratedQuestion[] {
  return generateQuestions({
    topic,
    bloom,
    difficulty,
    count,
    type
  });
}

// Auto-approval logic for high-confidence AI questions
export function shouldAutoApprove(question: GeneratedQuestion): boolean {
  return (
    question.created_by === 'ai' &&
    question.ai_confidence_score >= 0.85 &&
    question.bloom_level &&
    question.knowledge_dimension &&
    !question.needs_review
  );
}

export async function autoApproveIfHighConfidence(questions: GeneratedQuestion[]): Promise<GeneratedQuestion[]> {
  return questions.map(q => {
    if (shouldAutoApprove(q)) {
      return {
        ...q,
        approved: true,
        needs_review: false,
        metadata: {
          ...q.metadata,
          auto_approved: true,
          auto_approval_reason: 'high_confidence_ai_generation'
        }
      };
    }
    return q;
  });
}