/**
 * Auto-Classification Hook
 * 
 * Automatically classifies questions with knowledge dimension when saving.
 * Integrates rule-based + AI fallback classification.
 */

import { useState, useCallback } from 'react';
import type { KnowledgeDimension, KnowledgeClassificationResult } from '@/types/knowledge';
import { determineKnowledgeDimension, quickClassifyKnowledgeDimension } from '@/services/analysis/knowledgeDeterminer';
import { Questions } from '@/services/db/questions';

interface UseAutoClassifyOptions {
  autoClassifyOnSave?: boolean;
  useAIFallback?: boolean;
}

interface ClassificationState {
  isClassifying: boolean;
  lastResult: KnowledgeClassificationResult | null;
  error: string | null;
}

export function useAutoClassify(options: UseAutoClassifyOptions = {}) {
  const { autoClassifyOnSave = true, useAIFallback = true } = options;
  
  const [state, setState] = useState<ClassificationState>({
    isClassifying: false,
    lastResult: null,
    error: null
  });

  /**
   * Classify a question's knowledge dimension
   */
  const classifyQuestion = useCallback(async (questionText: string): Promise<KnowledgeDimension> => {
    if (!useAIFallback) {
      // Quick sync classification without AI
      return quickClassifyKnowledgeDimension(questionText);
    }

    setState(prev => ({ ...prev, isClassifying: true, error: null }));

    try {
      const result = await determineKnowledgeDimension(questionText);
      setState(prev => ({ ...prev, isClassifying: false, lastResult: result }));
      return result.dimension;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Classification failed';
      setState(prev => ({ ...prev, isClassifying: false, error }));
      // Fall back to quick classification on error
      return quickClassifyKnowledgeDimension(questionText);
    }
  }, [useAIFallback]);

  /**
   * Auto-classify and update a question in the database
   */
  const classifyAndUpdate = useCallback(async (
    questionId: string,
    questionText: string
  ): Promise<KnowledgeDimension> => {
    const dimension = await classifyQuestion(questionText);
    
    // Update the question with the classified dimension
    await Questions.update(questionId, {
      knowledge_dimension: dimension
    });

    return dimension;
  }, [classifyQuestion]);

  /**
   * Prepare question data with auto-classified knowledge dimension
   */
  const prepareQuestionWithClassification = useCallback(async <T extends { question_text: string; knowledge_dimension?: string }>(
    question: T
  ): Promise<T & { knowledge_dimension: KnowledgeDimension }> => {
    if (!autoClassifyOnSave || question.knowledge_dimension) {
      // Already has dimension or auto-classify disabled
      return {
        ...question,
        knowledge_dimension: (question.knowledge_dimension as KnowledgeDimension) || 'conceptual'
      };
    }

    const dimension = await classifyQuestion(question.question_text);
    
    return {
      ...question,
      knowledge_dimension: dimension
    };
  }, [autoClassifyOnSave, classifyQuestion]);

  return {
    ...state,
    classifyQuestion,
    classifyAndUpdate,
    prepareQuestionWithClassification
  };
}
