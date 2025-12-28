/**
 * Rule-based Knowledge Dimension Classifier
 * 
 * Classifies questions into Anderson & Krathwohl's knowledge dimensions:
 * - Factual: Basic elements (terminology, specific details)
 * - Conceptual: Interrelationships (classifications, principles, theories)
 * - Procedural: How to do something (methods, techniques, algorithms)
 * - Metacognitive: Self-knowledge (strategic knowledge, cognitive tasks)
 */

import type { KnowledgeDimension, KnowledgeClassificationResult } from '@/types/knowledge';

// Factual knowledge indicators
const FACTUAL_VERBS = [
  'define', 'list', 'identify', 'name', 'state', 'label', 'recall',
  'recognize', 'match', 'select', 'locate', 'memorize', 'repeat'
];

const FACTUAL_PHRASES = [
  'what is the', 'who was', 'when did', 'where is', 'which of the following',
  'the definition of', 'the term', 'the name of', 'according to',
  'the date of', 'the location of', 'the symbol for'
];

// Conceptual knowledge indicators
const CONCEPTUAL_VERBS = [
  'explain', 'compare', 'contrast', 'summarize', 'classify', 'categorize',
  'describe', 'interpret', 'illustrate', 'generalize', 'infer', 'distinguish'
];

const CONCEPTUAL_PHRASES = [
  'why does', 'how are', 'what is the relationship', 'the difference between',
  'the principle of', 'the theory of', 'the concept of', 'compared to',
  'in what way', 'what type of', 'the category of', 'the structure of'
];

// Procedural knowledge indicators
const PROCEDURAL_VERBS = [
  'solve', 'compute', 'calculate', 'demonstrate', 'implement', 'perform',
  'apply', 'execute', 'construct', 'produce', 'use', 'operate', 'complete'
];

const PROCEDURAL_PHRASES = [
  'how to', 'the steps to', 'the procedure for', 'the method for',
  'the technique for', 'the process of', 'to calculate', 'to solve',
  'to determine', 'to find', 'to perform', 'step-by-step'
];

// Metacognitive knowledge indicators
const METACOGNITIVE_VERBS = [
  'reflect', 'justify', 'evaluate', 'assess', 'critique', 'monitor',
  'regulate', 'plan', 'revise', 'self-assess'
];

const METACOGNITIVE_PHRASES = [
  'justify your approach', 'evaluate your strategy', 'how did you decide',
  'what strategy would you use', 'reflect on', 'what would you change',
  'how would you know if', 'assess your own', 'monitor your',
  'what was your reasoning', 'why did you choose', 'how effective was your'
];

/**
 * Classify a question into a knowledge dimension using rule-based analysis
 * @param questionText The question text to classify
 * @returns Classification result or null if ambiguous
 */
export function classifyKnowledgeDimension(
  questionText: string
): KnowledgeClassificationResult | null {
  const q = questionText.toLowerCase().trim();
  
  // Score each dimension
  const scores = {
    metacognitive: scoreMetacognitive(q),
    procedural: scoreProcedural(q),
    conceptual: scoreConceptual(q),
    factual: scoreFactual(q)
  };
  
  // Find the highest scoring dimension
  const entries = Object.entries(scores) as [KnowledgeDimension, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  
  const [topDimension, topScore] = sorted[0];
  const [, secondScore] = sorted[1];
  
  // Require minimum confidence and clear winner
  const minScore = 2;
  const minMargin = 1;
  
  if (topScore < minScore || (topScore - secondScore) < minMargin) {
    return null; // Ambiguous - needs AI fallback
  }
  
  // Calculate confidence based on score and margin
  const confidence = Math.min(0.95, 0.5 + (topScore * 0.1) + ((topScore - secondScore) * 0.1));
  
  return {
    dimension: topDimension,
    confidence,
    source: 'rule-based',
    reasoning: `Matched ${topScore} indicators for ${topDimension} knowledge`
  };
}

function scoreFactual(text: string): number {
  let score = 0;
  
  for (const verb of FACTUAL_VERBS) {
    if (text.includes(verb)) score++;
  }
  
  for (const phrase of FACTUAL_PHRASES) {
    if (text.includes(phrase)) score += 2;
  }
  
  // Boost for short, direct questions
  if (text.length < 100 && (text.includes('what is') || text.includes('who is'))) {
    score += 1;
  }
  
  return score;
}

function scoreConceptual(text: string): number {
  let score = 0;
  
  for (const verb of CONCEPTUAL_VERBS) {
    if (text.includes(verb)) score++;
  }
  
  for (const phrase of CONCEPTUAL_PHRASES) {
    if (text.includes(phrase)) score += 2;
  }
  
  // Boost for "why" questions
  if (text.startsWith('why ') || text.includes(' why ')) {
    score += 2;
  }
  
  return score;
}

function scoreProcedural(text: string): number {
  let score = 0;
  
  for (const verb of PROCEDURAL_VERBS) {
    if (text.includes(verb)) score++;
  }
  
  for (const phrase of PROCEDURAL_PHRASES) {
    if (text.includes(phrase)) score += 2;
  }
  
  // Boost for numerical/calculation context
  if (/\d+/.test(text) && (text.includes('calculate') || text.includes('solve') || text.includes('find'))) {
    score += 2;
  }
  
  return score;
}

function scoreMetacognitive(text: string): number {
  let score = 0;
  
  for (const verb of METACOGNITIVE_VERBS) {
    if (text.includes(verb)) score++;
  }
  
  for (const phrase of METACOGNITIVE_PHRASES) {
    if (text.includes(phrase)) score += 3; // Higher weight for metacognitive
  }
  
  // Boost for self-referential questions
  if (text.includes('your ') || text.includes('you ')) {
    if (text.includes('strategy') || text.includes('approach') || text.includes('reasoning')) {
      score += 2;
    }
  }
  
  return score;
}

/**
 * Quick check if a question likely needs AI fallback
 */
export function needsAIFallback(questionText: string): boolean {
  const result = classifyKnowledgeDimension(questionText);
  return result === null || result.confidence < 0.6;
}

/**
 * Get all matching indicators for debugging/explainability
 */
export function getMatchedIndicators(questionText: string): Record<KnowledgeDimension, string[]> {
  const q = questionText.toLowerCase().trim();
  
  return {
    factual: [
      ...FACTUAL_VERBS.filter(v => q.includes(v)),
      ...FACTUAL_PHRASES.filter(p => q.includes(p))
    ],
    conceptual: [
      ...CONCEPTUAL_VERBS.filter(v => q.includes(v)),
      ...CONCEPTUAL_PHRASES.filter(p => q.includes(p))
    ],
    procedural: [
      ...PROCEDURAL_VERBS.filter(v => q.includes(v)),
      ...PROCEDURAL_PHRASES.filter(p => q.includes(p))
    ],
    metacognitive: [
      ...METACOGNITIVE_VERBS.filter(v => q.includes(v)),
      ...METACOGNITIVE_PHRASES.filter(p => q.includes(p))
    ]
  };
}
