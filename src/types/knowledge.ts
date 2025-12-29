/**
 * Knowledge Dimension Types
 * Based on Anderson & Krathwohl's revised Bloom's Taxonomy
 */

export type KnowledgeDimension = 
  | 'factual'
  | 'conceptual'
  | 'procedural'
  | 'metacognitive';

/**
 * Answer Types - What kind of thinking the question demands
 * This is the key to preventing redundancy by design
 */
export type AnswerType =
  | 'definition'
  | 'explanation'
  | 'comparison'
  | 'procedure'
  | 'application'
  | 'evaluation'
  | 'justification'
  | 'analysis'
  | 'design'
  | 'construction';

/**
 * Question Intent - The structural constraint that governs generation
 * No two questions in the same exam may share the same intent tuple
 */
export interface QuestionIntent {
  topic: string;
  bloomLevel: string;
  knowledgeDimension: KnowledgeDimension;
  answerType: AnswerType;
}

export interface KnowledgeClassificationResult {
  dimension: KnowledgeDimension;
  confidence: number;
  source: 'rule-based' | 'ai-fallback';
  reasoning?: string;
}

export interface BloomKnowledgeConstraint {
  topic: string;
  bloomLevel: string;
  knowledgeDimension: KnowledgeDimension;
  difficulty?: string;
}
