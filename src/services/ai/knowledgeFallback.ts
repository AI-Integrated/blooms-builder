/**
 * GPT-Assisted Knowledge Dimension Classification
 * 
 * Used as fallback when rule-based classification is ambiguous.
 * GPT operates within academic constraints, not deciding first.
 */

import { supabase } from '@/integrations/supabase/client';
import type { KnowledgeDimension, KnowledgeClassificationResult } from '@/types/knowledge';

const VALID_DIMENSIONS: KnowledgeDimension[] = ['factual', 'conceptual', 'procedural', 'metacognitive'];

/**
 * Classify a question's knowledge dimension using AI
 * Only called when rule-based classification is ambiguous
 */
export async function gptClassifyKnowledgeDimension(
  questionText: string
): Promise<KnowledgeClassificationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('classify-knowledge', {
      body: { 
        questions: [{ text: questionText }],
        classifyType: 'knowledge_dimension'
      }
    });

    if (error) {
      console.error('Knowledge classification error:', error);
      return getDefaultClassification('AI service unavailable');
    }

    const result = data?.results?.[0];
    
    if (!result?.knowledge_dimension) {
      return getDefaultClassification('No classification returned');
    }

    const dimension = result.knowledge_dimension.toLowerCase() as KnowledgeDimension;
    
    if (!VALID_DIMENSIONS.includes(dimension)) {
      return getDefaultClassification(`Invalid dimension: ${dimension}`);
    }

    return {
      dimension,
      confidence: result.confidence || 0.75,
      source: 'ai-fallback',
      reasoning: result.reasoning || 'AI-assisted classification'
    };

  } catch (err) {
    console.error('GPT classification failed:', err);
    return getDefaultClassification('Classification request failed');
  }
}

function getDefaultClassification(reason: string): KnowledgeClassificationResult {
  return {
    dimension: 'conceptual', // Safe default
    confidence: 0.5,
    source: 'ai-fallback',
    reasoning: `Defaulted to conceptual: ${reason}`
  };
}
