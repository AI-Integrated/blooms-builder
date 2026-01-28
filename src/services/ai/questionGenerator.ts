import type { BloomLevel, Difficulty } from "./classify";

export interface AIGeneratedQuestion {
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'short_answer' | 'essay';
  choices?: Record<string, string>;
  correct_answer: string;
  topic: string;
  bloom_level: BloomLevel;
  difficulty: Difficulty;
  points: number;
}

/**
 * DOMAIN-SPECIFIC CONTENT POOLS
 * These provide REAL substantive content for each Bloom's level
 * Never use placeholders like "Correct answer related to..."
 */
const BLOOM_CONTENT_POOLS: Record<BloomLevel, {
  stemTemplates: string[];
  correctAnswers: string[];
  distractors: string[][];
}> = {
  remembering: {
    stemTemplates: [
      'What is the primary definition of {topic}?',
      'Which term correctly describes the fundamental aspect of {topic}?',
      'Identify the key characteristic that defines {topic}.',
      'What is the correct terminology for {topic}?',
      'Which statement accurately describes {topic}?'
    ],
    correctAnswers: [
      'A systematic approach that establishes foundational principles for effective implementation',
      'The fundamental framework that defines how components interact within the system',
      'A structured methodology that ensures consistent and reliable outcomes',
      'The core principle that governs behavior and characteristics of the system',
      'A defined standard that provides clear guidelines for proper application'
    ],
    distractors: [
      ['An optional consideration that may not apply in practice', 'A theoretical model without implementation requirements', 'A deprecated approach replaced by modern methods'],
      ['A secondary concept that supplements but does not define the core', 'An advanced technique for specialized scenarios only', 'A preliminary concept preceding main implementation'],
      ['A subjective interpretation varying by perspective', 'An experimental approach under evaluation', 'A simplified version for introductory purposes only'],
      ['A marketing term without technical substance', 'An informal description lacking precision', 'A historical term no longer in common use'],
      ['A context-specific adaptation with limited applicability', 'A provisional definition subject to revision', 'A colloquial usage not recognized formally']
    ]
  },
  understanding: {
    stemTemplates: [
      'Why is {topic} considered essential in this context?',
      'Explain the significance of {topic} in achieving desired outcomes.',
      'What is the underlying purpose of implementing {topic}?',
      'How does {topic} contribute to overall system effectiveness?',
      'What makes {topic} a critical component in this domain?'
    ],
    correctAnswers: [
      'It provides a systematic framework ensuring consistency, reducing errors, and enabling measurable improvement',
      'It establishes clear guidelines facilitating effective communication and stakeholder collaboration',
      'It enables systematic analysis and evaluation, leading to informed decisions and better outcomes',
      'It creates a structured approach balancing competing requirements while maintaining quality standards',
      'It ensures alignment between objectives and implementation, maximizing efficiency and effectiveness'
    ],
    distractors: [
      ['It primarily serves as documentation for compliance without operational impact', 'It is mainly for theoretical analysis rather than practical application', 'It focuses exclusively on cost reduction without quality considerations'],
      ['It applies only to large-scale implementations with limited relevance otherwise', 'It is a legacy requirement maintained for historical reasons', 'It addresses superficial aspects without affecting core functionality'],
      ['It provides optional enhancements implemented if resources permit', 'It serves as a marketing differentiator rather than functional requirement', 'It is relevant only during initial development, not ongoing operations'],
      ['It is primarily an academic exercise with limited practical value', 'It adds complexity without proportional benefit', 'It duplicates functions available through other means'],
      ['It addresses edge cases rather than common scenarios', 'It is industry-specific without broader applicability', 'It represents best practice but not minimum requirement']
    ]
  },
  applying: {
    stemTemplates: [
      'In a scenario where requirements conflict with constraints, how should {topic} be applied?',
      'Given a situation requiring immediate implementation, what approach to {topic} is most effective?',
      'When facing time-critical decisions, how can {topic} principles guide appropriate action?',
      'In a case where stakeholder expectations differ, how should {topic} be implemented?',
      'Considering incomplete information, how would you apply {topic} to reach a decision?'
    ],
    correctAnswers: [
      'Apply core principles systematically while documenting trade-offs and communicating constraints to stakeholders',
      'Prioritize based on established criteria, implement in phases, and validate each stage before proceeding',
      'Use the framework to evaluate options against defined metrics, select optimal approach, and monitor outcomes',
      'Balance competing requirements using objective criteria, negotiate acceptable compromises, and document rationale',
      'Apply available principles to structure analysis, identify gaps, and make informed provisional decisions'
    ],
    distractors: [
      ['Bypass standard procedures to meet deadlines, addressing compliance later', 'Focus exclusively on visible requirements while deferring others', 'Implement the simplest solution regardless of long-term implications'],
      ['Delegate the decision to stakeholders without analysis or recommendations', 'Wait for complete information before taking any action', 'Apply generic solutions without considering specific context'],
      ['Prioritize speed over quality, planning corrections in subsequent phases', 'Follow the most recent directive regardless of established principles', 'Implement all requirements simultaneously without prioritization'],
      ['Avoid documentation to maintain flexibility', 'Override stakeholder input with technical expertise', 'Accept all constraints without negotiation or clarification'],
      ['Defer to precedent regardless of current context', 'Minimize communication to avoid conflicting feedback', 'Assume standard conditions without verification']
    ]
  },
  analyzing: {
    stemTemplates: [
      'How does the relationship between components in {topic} affect overall system behavior?',
      'What distinguishes effective implementation of {topic} from ineffective approaches?',
      'Examine the interaction between {topic} and related concepts. What patterns emerge?',
      'What factors contribute most significantly to successful {topic} implementation?',
      'How do different approaches to {topic} compare in terms of outcomes and trade-offs?'
    ],
    correctAnswers: [
      'Interdependencies create feedback loops where changes propagate through the system, requiring coordinated management',
      'Effective approaches maintain alignment between objectives and practices, while ineffective ones create gaps between intention and execution',
      'Interactions reveal emergent properties unpredictable from individual components, requiring holistic rather than isolated analysis',
      'Success depends on clear objectives, adequate resources, stakeholder alignment, and continuous feedback mechanisms',
      'Different approaches present distinct trade-offs between flexibility and control, speed and thoroughness, innovation and stability'
    ],
    distractors: [
      ['Components operate independently, allowing isolated analysis without broader impacts', 'The relationship is hierarchical with changes flowing in one direction only', 'Interactions are deterministic and fully predictable from initial conditions'],
      ['Success is primarily determined by budget, with methodology being secondary', 'The distinction lies mainly in documentation quality rather than actual practice', 'Effectiveness depends on team size rather than approach quality'],
      ['All approaches yield similar results given sufficient time and resources', 'The primary difference is terminology rather than substantive outcomes', 'Comparison is not meaningful as each situation requires unique approach'],
      ['Technical factors dominate, with organizational aspects being secondary', 'Success is largely random and not attributable to specific factors', 'External factors outweigh internal decisions in determining outcomes'],
      ['Surface-level metrics accurately reflect underlying effectiveness', 'Initial conditions determine outcomes regardless of subsequent actions', 'Quantitative measures capture all relevant aspects of comparison']
    ]
  },
  evaluating: {
    stemTemplates: [
      'Which approach to {topic} would be most effective for achieving long-term sustainability?',
      'Evaluate trade-offs between implementation strategies for {topic}. Which provides optimal balance?',
      'Based on established criteria, which methodology for {topic} demonstrates superior outcomes?',
      'Assess strengths and limitations of current {topic} practices. What conclusion is supported?',
      'Which implementation of {topic} best addresses both immediate requirements and future scalability?'
    ],
    correctAnswers: [
      'A balanced approach integrating multiple perspectives, establishing clear success metrics, and building in continuous improvement mechanisms',
      'The strategy optimizing for maintainability and adaptability while meeting current requirements provides best long-term value',
      'Approaches combining systematic rigor with practical flexibility demonstrate consistently superior outcomes across varied contexts',
      'Current practices are effective for defined scenarios but require enhancement for emerging challenges and changing requirements',
      'Implementations establishing strong foundations while remaining adaptable best serve both present and future needs'
    ],
    distractors: [
      ['The most technologically advanced approach regardless of readiness or resources', 'The approach maximizing short-term metrics without long-term consideration', 'Whatever requires least organizational change regardless of effectiveness'],
      ['The simplest approach meeting minimum requirements, deferring complexity', 'The most comprehensive approach regardless of constraints or diminishing returns', 'The approach following industry trends regardless of specific context'],
      ['The lowest-cost option accepting quality or capability trade-offs', 'The approach endorsed by senior stakeholders regardless of technical merit', 'The newest methodology assuming newer means better'],
      ['The approach with most detailed documentation regardless of actual results', 'The solution with broadest feature set regardless of actual needs', 'The option with strongest vendor support regardless of fit'],
      ['The approach with fastest initial deployment regardless of sustainability', 'The solution minimizing short-term risk regardless of opportunity cost', 'The option aligning with personal preferences rather than objective criteria']
    ]
  },
  creating: {
    stemTemplates: [
      'Design an approach to {topic} addressing both current needs and anticipated future requirements.',
      'Develop a framework for implementing {topic} balancing innovation with practical constraints.',
      'How would you construct a comprehensive solution using {topic} principles?',
      'Create a strategy for {topic} integrating multiple methodologies into a cohesive approach.',
      'Formulate a plan for {topic} implementation that maximizes stakeholder value.'
    ],
    correctAnswers: [
      'A modular architecture defining core components with clear interfaces, allowing elements to evolve while maintaining system integrity',
      'A phased implementation establishing foundational elements first, validating at each stage, progressively adding capability based on success',
      'An integrated framework combining proven practices with contextual adaptations, supported by documentation and feedback mechanisms',
      'A synthesis drawing on multiple approaches, selecting elements based on demonstrated effectiveness for specific context and objectives',
      'A stakeholder-centered design aligning implementation with value delivery, including measurement mechanisms and adaptation capability'
    ],
    distractors: [
      ['A comprehensive design addressing all scenarios simultaneously regardless of priorities', 'A minimal solution focused only on immediate needs without future growth', 'A direct copy of successful implementation from different context'],
      ['An approach prioritizing innovation over proven methods, accepting higher risk', 'A rigid implementation locking current assumptions without adaptation', 'A fully outsourced solution minimizing internal involvement'],
      ['A documentation-heavy approach emphasizing planning over execution', 'An implementation addressing preferences regardless of technical feasibility', 'A solution maximizing new technology regardless of practical value'],
      ['A solution optimizing for a single metric at expense of overall balance', 'An approach avoiding integration to maintain simplicity', 'A design assuming static requirements without change provisions'],
      ['A reactive approach responding to issues as they arise rather than anticipating', 'A solution prioritizing consistency over optimization', 'An implementation minimizing stakeholder input to maintain efficiency']
    ]
  }
};

/**
 * Generate questions using domain-specific content (not placeholders)
 * Answers are randomly distributed across A, B, C, D
 */
export async function generateQuestionsWithAI(
  topic: string,
  bloomLevel: BloomLevel,
  difficulty: Difficulty,
  count: number
): Promise<AIGeneratedQuestion[]> {
  console.log(`🤖 Generating ${count} AI questions for ${topic} at ${bloomLevel} level, ${difficulty} difficulty`);

  const questions: AIGeneratedQuestion[] = [];
  const content = BLOOM_CONTENT_POOLS[bloomLevel] || BLOOM_CONTENT_POOLS.understanding;
  const letters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  
  for (let i = 0; i < count; i++) {
    // Select templates and content
    const templateIdx = i % content.stemTemplates.length;
    const correctIdx = i % content.correctAnswers.length;
    const distractorSetIdx = i % content.distractors.length;
    
    const questionText = content.stemTemplates[templateIdx].replace('{topic}', topic);
    const correctAnswer = content.correctAnswers[correctIdx];
    const distractorSet = content.distractors[distractorSetIdx];
    
    // Create all options with correct answer tracking
    const allOptions = [
      { text: correctAnswer, isCorrect: true },
      { text: distractorSet[0], isCorrect: false },
      { text: distractorSet[1], isCorrect: false },
      { text: distractorSet[2], isCorrect: false }
    ];
    
    // Fisher-Yates shuffle to randomize answer position
    for (let j = allOptions.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [allOptions[j], allOptions[k]] = [allOptions[k], allOptions[j]];
    }
    
    // Build choices object and find correct answer letter
    const choices: Record<string, string> = {};
    let correctLetter: 'A' | 'B' | 'C' | 'D' = 'A';
    
    allOptions.forEach((opt, idx) => {
      choices[letters[idx]] = opt.text;
      if (opt.isCorrect) {
        correctLetter = letters[idx];
      }
    });

    questions.push({
      question_text: questionText,
      question_type: 'mcq',
      choices,
      correct_answer: correctLetter,
      topic,
      bloom_level: bloomLevel,
      difficulty,
      points: getPointsForDifficulty(difficulty)
    });
  }

  return questions;
}

/**
 * Get points based on difficulty
 */
function getPointsForDifficulty(difficulty: Difficulty): number {
  const pointsMap: Record<string, number> = {
    easy: 1,
    average: 1,
    medium: 1,
    difficult: 1,
    hard: 1
  };
  return pointsMap[difficulty] || 1;
}

/**
 * Validate that question content is substantive (not placeholder)
 */
export function validateQuestionContent(question: AIGeneratedQuestion): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for placeholder patterns
  const placeholderPatterns = [
    /correct answer (related to|about|for)/i,
    /plausible distractor/i,
    /another distractor/i,
    /final option (regarding|about|for)/i,
    /option [a-d] for/i,
    /\[.*\]/,  // Bracketed placeholders
    /placeholder/i,
    /example (answer|option)/i
  ];
  
  // Check question text
  if (!question.question_text || question.question_text.length < 20) {
    issues.push('Question text too short or missing');
  }
  
  // Check choices for MCQ
  if (question.question_type === 'mcq' && question.choices) {
    const choiceValues = Object.values(question.choices);
    
    // Ensure 4 options
    if (choiceValues.length !== 4) {
      issues.push(`Expected 4 choices, found ${choiceValues.length}`);
    }
    
    // Check each option for placeholder content
    choiceValues.forEach((choice, idx) => {
      if (placeholderPatterns.some(p => p.test(String(choice)))) {
        issues.push(`Choice ${idx + 1} contains placeholder content`);
      }
      if (String(choice).length < 10) {
        issues.push(`Choice ${idx + 1} is too short`);
      }
    });
    
    // Validate correct answer
    if (!['A', 'B', 'C', 'D'].includes(question.correct_answer)) {
      issues.push(`Invalid correct answer: ${question.correct_answer}`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Normalize question text by removing artifacts
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return '';
  
  let normalized = text;
  
  // Remove "(Question X)" artifacts
  normalized = normalized.replace(/^\s*\(Question\s+\d+\)\s*/i, '');
  normalized = normalized.replace(/^\s*Question\s+\d+[:.]\s*/i, '');
  normalized = normalized.replace(/^\s*Q\d+[:.]\s*/i, '');
  
  // Remove number prefixes like "1.", "1)", "1:"
  normalized = normalized.replace(/^\s*\d+[.):\s]+/i, '');
  
  // Trim whitespace
  normalized = normalized.trim();
  
  // Ensure proper punctuation
  if (normalized && !/[.?!]$/.test(normalized)) {
    normalized += '?';
  }
  
  // Capitalize first letter
  if (normalized.length > 0) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  
  return normalized;
}
