/**
 * Combined Knowledge Dimension Determiner
 * 
 * Official API for knowledge dimension classification.
 * Uses rule-based analysis first, falls back to AI only when ambiguous.
 */

import type { KnowledgeDimension, KnowledgeClassificationResult } from '@/types/knowledge';
import { classifyKnowledgeDimension, needsAIFallback } from './knowledgeClassifier';
import { gptClassifyKnowledgeDimension } from '../ai/knowledgeFallback';

/**
 * Determine the knowledge dimension of a question
 * Rule-based first, GPT fallback for ambiguous cases
 */
export async function determineKnowledgeDimension(
  questionText: string
): Promise<KnowledgeClassificationResult> {
  // Try rule-based classification first
  const ruleResult = classifyKnowledgeDimension(questionText);
  
  if (ruleResult && ruleResult.confidence >= 0.6) {
    return ruleResult;
  }
  
  // Fallback to AI for ambiguous cases
  return await gptClassifyKnowledgeDimension(questionText);
}

/**
 * Batch determine knowledge dimensions for multiple questions
 * Optimized to minimize AI calls
 */
export async function batchDetermineKnowledgeDimension(
  questions: Array<{ text: string; id?: string }>
): Promise<Map<string, KnowledgeClassificationResult>> {
  const results = new Map<string, KnowledgeClassificationResult>();
  const needsAI: Array<{ text: string; id: string }> = [];
  
  // First pass: rule-based classification
  for (const q of questions) {
    const id = q.id || q.text;
    const ruleResult = classifyKnowledgeDimension(q.text);
    
    if (ruleResult && ruleResult.confidence >= 0.6) {
      results.set(id, ruleResult);
    } else {
      needsAI.push({ text: q.text, id });
    }
  }
  
  // Second pass: AI fallback for ambiguous cases
  if (needsAI.length > 0) {
    const aiPromises = needsAI.map(async (q) => {
      const result = await gptClassifyKnowledgeDimension(q.text);
      return { id: q.id, result };
    });
    
    const aiResults = await Promise.all(aiPromises);
    
    for (const { id, result } of aiResults) {
      results.set(id, result);
    }
  }
  
  return results;
}

/**
 * Validate if a question matches its claimed knowledge dimension
 */
export function validateKnowledgeDimension(
  questionText: string,
  claimedDimension: KnowledgeDimension
): { isValid: boolean; suggestedDimension?: KnowledgeDimension; confidence: number } {
  const classification = classifyKnowledgeDimension(questionText);
  
  if (!classification) {
    return { isValid: true, confidence: 0.5 }; // Can't determine, assume valid
  }
  
  const isValid = classification.dimension === claimedDimension;
  
  return {
    isValid,
    suggestedDimension: isValid ? undefined : classification.dimension,
    confidence: classification.confidence
  };
}

/**
 * Quick synchronous classification (no AI fallback)
 * Use when you need immediate result and can accept lower confidence
 */
export function quickClassifyKnowledgeDimension(
  questionText: string
): KnowledgeDimension {
  const result = classifyKnowledgeDimension(questionText);
  return result?.dimension || 'conceptual';
}
