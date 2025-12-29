/**
 * Bloom × Knowledge → AnswerType Compatibility Mapping
 * 
 * This mapping determines which answer types are pedagogically valid
 * for each combination of Bloom level and Knowledge dimension.
 * 
 * GPT never chooses structure - the system does.
 * GPT only fills in language.
 */

import type { KnowledgeDimension, AnswerType } from '@/types/knowledge';

type BloomLevel = 
  | 'Remembering' 
  | 'Understanding' 
  | 'Applying' 
  | 'Analyzing' 
  | 'Evaluating' 
  | 'Creating';

interface CompatibilityMap {
  [bloom: string]: {
    [knowledge: string]: AnswerType[];
  };
}

/**
 * Pedagogically valid AnswerType mappings
 * Each Bloom × Knowledge combination has specific allowed answer types
 */
export const COMPATIBILITY_MAP: CompatibilityMap = {
  'Remembering': {
    'factual': ['definition'],
    'conceptual': ['definition', 'explanation'],
    'procedural': ['definition', 'procedure'],
    'metacognitive': ['definition']
  },
  'Understanding': {
    'factual': ['explanation'],
    'conceptual': ['explanation', 'comparison'],
    'procedural': ['explanation', 'procedure'],
    'metacognitive': ['explanation', 'justification']
  },
  'Applying': {
    'factual': ['application'],
    'conceptual': ['application', 'comparison'],
    'procedural': ['procedure', 'application'],
    'metacognitive': ['application', 'justification']
  },
  'Analyzing': {
    'factual': ['analysis'],
    'conceptual': ['comparison', 'analysis'],
    'procedural': ['analysis', 'procedure'],
    'metacognitive': ['analysis', 'evaluation']
  },
  'Evaluating': {
    'factual': ['evaluation'],
    'conceptual': ['evaluation', 'justification'],
    'procedural': ['evaluation', 'justification'],
    'metacognitive': ['evaluation', 'justification']
  },
  'Creating': {
    'factual': ['construction'],
    'conceptual': ['design', 'construction'],
    'procedural': ['design', 'construction'],
    'metacognitive': ['design', 'justification']
  }
};

/**
 * Get allowed answer types for a Bloom × Knowledge combination
 */
export function getAllowedAnswerTypes(
  bloomLevel: string,
  knowledgeDimension: KnowledgeDimension
): AnswerType[] {
  const bloomMap = COMPATIBILITY_MAP[bloomLevel];
  if (!bloomMap) {
    console.warn(`Unknown Bloom level: ${bloomLevel}, defaulting to Understanding`);
    return COMPATIBILITY_MAP['Understanding'][knowledgeDimension] || ['explanation'];
  }
  
  const answerTypes = bloomMap[knowledgeDimension];
  if (!answerTypes) {
    console.warn(`Unknown knowledge dimension: ${knowledgeDimension}, defaulting to conceptual`);
    return bloomMap['conceptual'] || ['explanation'];
  }
  
  return answerTypes;
}

/**
 * Check if an answer type is valid for a given Bloom × Knowledge combination
 */
export function isValidAnswerType(
  bloomLevel: string,
  knowledgeDimension: KnowledgeDimension,
  answerType: AnswerType
): boolean {
  const allowed = getAllowedAnswerTypes(bloomLevel, knowledgeDimension);
  return allowed.includes(answerType);
}

/**
 * Answer type descriptions for prompt generation
 */
export const ANSWER_TYPE_DESCRIPTIONS: Record<AnswerType, string> = {
  'definition': 'Requires stating what something IS - terminology, facts, specific details.',
  'explanation': 'Requires describing HOW or WHY something works or occurs.',
  'comparison': 'Requires identifying SIMILARITIES and DIFFERENCES between concepts.',
  'procedure': 'Requires outlining STEPS or PROCESSES to accomplish something.',
  'application': 'Requires USING knowledge to solve a new problem or scenario.',
  'evaluation': 'Requires making JUDGMENTS based on criteria or standards.',
  'justification': 'Requires providing REASONS and EVIDENCE for a position or approach.',
  'analysis': 'Requires BREAKING DOWN information into components and relationships.',
  'design': 'Requires CREATING a plan, blueprint, or specification for something new.',
  'construction': 'Requires BUILDING or PRODUCING something original.'
};

/**
 * Get the structural prompt constraint for an answer type
 */
export function getAnswerTypeConstraint(answerType: AnswerType): string {
  return ANSWER_TYPE_DESCRIPTIONS[answerType];
}
