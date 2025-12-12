// AI Classification Engine for Questions
export type Classification = {
  bloom_level: 'remembering' | 'understanding' | 'applying' | 'analyzing' | 'evaluating' | 'creating';
  knowledge_dimension: 'factual' | 'conceptual' | 'procedural' | 'metacognitive';
  difficulty: 'easy' | 'average' | 'difficult';
  confidence: number;
};

// Enhanced verb mapping with more comprehensive coverage
// Verb mapping for Bloom's taxonomy classification
const BLOOM_VERBS: Record<string, string> = {
  // Remembering
  'define': 'remembering',
  'list': 'remembering',
  'identify': 'remembering',
  'name': 'remembering',
  'state': 'remembering',
  'recall': 'remembering',
  'recognize': 'remembering',
  'select': 'remembering',
  'match': 'remembering',
  'choose': 'remembering',
  'label': 'remembering',
  'locate': 'remembering',
  'find': 'remembering',
  'memorize': 'remembering',

  // Understanding
  'explain': 'understanding',
  'describe': 'understanding',
  'summarize': 'understanding',
  'interpret': 'understanding',
  'classify': 'understanding',
  'compare': 'understanding',
  'contrast': 'understanding',
  'illustrate': 'understanding',
  'translate': 'understanding',
  'paraphrase': 'understanding',
  'convert': 'understanding',
  'discuss': 'understanding',
  'predict': 'understanding',

  // Applying
  'apply': 'applying',
  'demonstrate': 'applying',
  'use': 'applying',
  'implement': 'applying',
  'solve': 'applying',
  'execute': 'applying',
  'operate': 'applying',
  'calculate': 'applying',
  'show': 'applying',
  'complete': 'applying',
  'modify': 'applying',
  'relate': 'applying',
  'change': 'applying',

  // Analyzing
  'analyze': 'analyzing',
  'examine': 'analyzing',
  'investigate': 'analyzing',
  'categorize': 'analyzing',
  'differentiate': 'analyzing',
  'distinguish': 'analyzing',
  'organize': 'analyzing',
  'deconstruct': 'analyzing',
  'breakdown': 'analyzing',
  'separate': 'analyzing',
  'order': 'analyzing',
  'connect': 'analyzing',

  // Evaluating
  'evaluate': 'evaluating',
  'assess': 'evaluating',
  'judge': 'evaluating',
  'critique': 'evaluating',
  'justify': 'evaluating',
  'defend': 'evaluating',
  'support': 'evaluating',
  'argue': 'evaluating',
  'decide': 'evaluating',
  'rate': 'evaluating',
  'prioritize': 'evaluating',
  'recommend': 'evaluating',

  // Creating
  'create': 'creating',
  'design': 'creating',
  'develop': 'creating',
  'construct': 'creating',
  'generate': 'creating',
  'produce': 'creating',
  'plan': 'creating',
  'compose': 'creating',
  'formulate': 'creating',
  'build': 'creating',
  'invent': 'creating',
  'combine': 'creating',
  'synthesize': 'creating'
};

// Knowledge dimension indicators
const KNOWLEDGE_INDICATORS = {
  factual: ['what is', 'define', 'list', 'name', 'identify', 'when', 'where', 'who', 'which', 'what year', 'how many', 'what type'],
  conceptual: ['explain', 'compare', 'contrast', 'relationship', 'why', 'how does', 'principle', 'theory', 'model', 'framework', 'concept'],
  procedural: ['calculate', 'solve', 'demonstrate', 'perform', 'how to', 'steps', 'procedure', 'method', 'algorithm', 'technique', 'process'],
  metacognitive: ['evaluate', 'assess', 'best method', 'most appropriate', 'strategy', 'approach', 'reflect', 'monitor', 'plan your']
};

// Difficulty heuristics
const DIFFICULTY_HEURISTICS = {
  easy: ['simple', 'basic', 'elementary', 'straightforward', 'fundamental', 'primary'],
  difficult: ['complex', 'advanced', 'sophisticated', 'intricate', 'comprehensive', 'elaborate', 'multifaceted']
};

// Context-based classification helpers
const QUESTION_TYPE_INDICATORS = {
  factual: ['what is the definition', 'which of the following', 'the term', 'refers to', 'is defined as'],
  conceptual: ['relationship between', 'how are', 'connected', 'why does', 'what causes', 'principle behind'],
  procedural: ['how do you', 'what steps', 'procedure for', 'method to', 'algorithm for', 'technique used'],
  metacognitive: ['best approach', 'most effective', 'when would you', 'why choose', 'strategy for']
};

/**
 * Classify a question using heuristic analysis
 */
export function classifyQuestionHeuristic(questionText: string, topic?: string): Classification {
  const text = questionText.toLowerCase();
  
  // Determine Bloom's level
  let bloomLevel: string = 'understanding'; // default
  let confidence = 0.5;
  
  // Check for explicit verb indicators first
  for (const [verb, level] of Object.entries(BLOOM_VERBS)) {
    if (text.includes(` ${verb} `) || text.startsWith(verb) || text.includes(`${verb}:`)) {
      bloomLevel = level;
      confidence = 0.8;
      break;
    }
  }

  // Check for question patterns if no verb found
  if (confidence < 0.7) {
    if (text.includes('what is') || text.includes('define') || text.includes('list')) {
      bloomLevel = 'remembering';
      confidence = 0.75;
    } else if (text.includes('explain') || text.includes('describe') || text.includes('why')) {
      bloomLevel = 'understanding';
      confidence = 0.75;
    } else if (text.includes('apply') || text.includes('use') || text.includes('solve')) {
      bloomLevel = 'applying';
      confidence = 0.75;
    } else if (text.includes('analyze') || text.includes('compare') || text.includes('examine')) {
      bloomLevel = 'analyzing';
      confidence = 0.75;
    } else if (text.includes('evaluate') || text.includes('assess') || text.includes('judge')) {
      bloomLevel = 'evaluating';
      confidence = 0.75;
    } else if (text.includes('create') || text.includes('design') || text.includes('develop')) {
      bloomLevel = 'creating';
      confidence = 0.75;
    }
  }

  // Determine knowledge dimension
  let knowledgeDimension: string = 'conceptual'; // default
  for (const [dimension, indicators] of Object.entries(KNOWLEDGE_INDICATORS)) {
    if (indicators.some(indicator => text.includes(indicator))) {
      knowledgeDimension = dimension;
      if (confidence < 0.7) confidence = 0.7;
      break;
    }
  }

  // Enhanced knowledge dimension detection using context
  if (knowledgeDimension === 'conceptual') {
    for (const [dimension, indicators] of Object.entries(QUESTION_TYPE_INDICATORS)) {
      if (indicators.some(indicator => text.includes(indicator))) {
        knowledgeDimension = dimension;
        confidence = Math.max(confidence, 0.75);
        break;
      }
    }
  }

  // Determine difficulty
  let difficulty: string = 'average'; // default
  
  // Check for explicit difficulty indicators
  if (DIFFICULTY_HEURISTICS.easy.some(word => text.includes(word))) {
    difficulty = 'easy';
  } else if (DIFFICULTY_HEURISTICS.difficult.some(word => text.includes(word))) {
    difficulty = 'difficult';
  } else {
    // Use Bloom's level to infer difficulty
    if (['remembering', 'understanding'].includes(bloomLevel)) {
      difficulty = 'easy';
    } else if (['evaluating', 'creating'].includes(bloomLevel)) {
      difficulty = 'difficult';
    }
  }

  // Adjust confidence based on question length and complexity
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 8) {
    confidence = Math.max(0.6, confidence - 0.1); // Simple questions are easier to classify
  } else if (wordCount > 25) {
    confidence = Math.min(0.9, confidence + 0.1); // Complex questions often have clear indicators
  }

  // Topic-based adjustments
  if (topic) {
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('math') || topicLower.includes('calculation')) {
      if (text.includes('calculate') || text.includes('solve')) {
        knowledgeDimension = 'procedural';
        confidence = Math.max(confidence, 0.8);
      }
    }
    if (topicLower.includes('history') || topicLower.includes('literature')) {
      if (bloomLevel === 'remembering') {
        knowledgeDimension = 'factual';
        confidence = Math.max(confidence, 0.8);
      }
    }
  }

  return {
    bloom_level: bloomLevel as any,
    knowledge_dimension: knowledgeDimension as any,
    difficulty: difficulty as any,
    confidence: Math.round(confidence * 100) / 100
  };
}

/**
 * Batch classify multiple questions
 */
export function classifyQuestionsBatch(questions: Array<{ text: string; topic?: string }>): Classification[] {
  return questions.map(q => classifyQuestionHeuristic(q.text, q.topic));
}

/**
 * Enhanced classification - always uses heuristic classification for security.
 * OpenAI classification should be done server-side via edge functions only.
 */
export async function classifyWithAI(questionText: string, topic?: string): Promise<Classification> {
  // SECURITY: Always use heuristic classification on client-side.
  // OpenAI API calls must go through edge functions where keys are stored securely.
  return classifyQuestionHeuristic(questionText, topic);
}

/**
 * Generate AI questions when question bank is insufficient
 */
export function generateAIQuestion(topic: string, bloomLevel: string, difficulty: string, questionType: string = 'mcq'): any {
  const templates = {
    remembering: {
      easy: `Define the term "${topic}" in your own words.`,
      average: `List the key characteristics of ${topic}.`,
      difficult: `Identify the main components of ${topic} and their relationships.`
    },
    understanding: {
      easy: `Explain the basic concept of ${topic}.`,
      average: `Describe how ${topic} works in practice.`,
      difficult: `Summarize the theoretical framework behind ${topic}.`
    },
    applying: {
      easy: `Give an example of how ${topic} is used.`,
      average: `Demonstrate the application of ${topic} in a real scenario.`,
      difficult: `Apply the principles of ${topic} to solve a complex problem.`
    },
    analyzing: {
      easy: `Compare ${topic} with a similar concept.`,
      average: `Analyze the components of ${topic} and their interactions.`,
      difficult: `Examine the underlying assumptions of ${topic}.`
    },
    evaluating: {
      easy: `Assess the effectiveness of ${topic}.`,
      average: `Evaluate the strengths and weaknesses of ${topic}.`,
      difficult: `Critique the current understanding of ${topic} and propose improvements.`
    },
    creating: {
      easy: `Design a simple model of ${topic}.`,
      average: `Create a comprehensive plan incorporating ${topic}.`,
      difficult: `Develop an innovative approach to ${topic} that addresses current limitations.`
    }
  };

  // Generate MCQ choices for multiple choice questions
  let choices = null;
  let correctAnswer = null;
  
  if (questionType === 'mcq') {
    choices = {
      A: `Correct answer related to ${topic}`,
      B: `Plausible but incorrect option`,
      C: `Another plausible distractor`,
      D: `Less likely but possible option`
    };
    correctAnswer = 'A';
  }

  const questionText = templates[bloomLevel as keyof typeof templates]?.[difficulty as keyof typeof templates['remembering']] 
    || `Discuss ${topic} in relation to ${bloomLevel}.`;

  const classification = classifyQuestionHeuristic(questionText, topic);

  return {
    topic,
    question_text: questionText,
    question_type: questionType,
    choices,
    correct_answer: correctAnswer,
    bloom_level: classification.bloom_level,
    difficulty: classification.difficulty,
    knowledge_dimension: classification.knowledge_dimension,
    created_by: 'ai',
    confidence_score: classification.confidence,
    approved: false,
    needs_review: classification.confidence < 0.8
  };
}

/**
 * Generate multiple AI questions for a specific need
 */
export function generateAIQuestionsForNeed(
  topic: string, 
  bloomLevel: string, 
  difficulty: string, 
  count: number,
  questionType: string = 'mcq'
): any[] {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const question = generateAIQuestion(topic, bloomLevel, difficulty, questionType);
    // Add variation to avoid duplicates
    if (i > 0) {
      question.question_text = question.question_text.replace(/\.$/, ` (Variation ${i + 1}).`);
    }
    questions.push(question);
  }
  return questions;
}

/**
 * Analyze question bank coverage for a topic
 */
export function analyzeTopicCoverage(questions: any[], topic: string) {
  const topicQuestions = questions.filter(q => q.topic === topic);
  const bloomCoverage = {
    remembering: 0,
    understanding: 0,
    applying: 0,
    analyzing: 0,
    evaluating: 0,
    creating: 0
  };
  
  topicQuestions.forEach(q => {
    bloomCoverage[q.bloom_level as keyof typeof bloomCoverage]++;
  });
  
  return {
    total: topicQuestions.length,
    bloomCoverage,
    gaps: Object.entries(bloomCoverage).filter(([_, count]) => count === 0).map(([level]) => level)
  };
}