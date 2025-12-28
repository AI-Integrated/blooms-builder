/**
 * Knowledge Dimension Types
 * Based on Anderson & Krathwohl's revised Bloom's Taxonomy
 */

export type KnowledgeDimension = 
  | 'factual'
  | 'conceptual'
  | 'procedural'
  | 'metacognitive';

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
