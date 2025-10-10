import { useState, useCallback } from 'react';
import {
  indexQuestion,
  findSimilarQuestions,
  getSimilarityClusters,
  indexAllQuestions,
  SimilarQuestion,
  SimilarityResult
} from '@/services/ai/semanticAnalyzer';

export interface UseSemanticAnalysisOptions {
  autoIndex?: boolean;
  similarityThreshold?: number;
  topK?: number;
}

export interface SemanticAnalysisState {
  loading: boolean;
  error: string | null;
  similarQuestions: SimilarQuestion[];
  clusters: Array<SimilarQuestion[]>;
  indexingProgress: {
    current: number;
    total: number;
  } | null;
}

export function useSemanticAnalysis(options: UseSemanticAnalysisOptions = {}) {
  const {
    autoIndex = false,
    similarityThreshold = 0.75,
    topK = 10
  } = options;

  const [state, setState] = useState<SemanticAnalysisState>({
    loading: false,
    error: null,
    similarQuestions: [],
    clusters: [],
    indexingProgress: null
  });

  /**
   * Analyze a single question for similarities
   */
  const analyzeQuestion = useCallback(async (questionId: string): Promise<SimilarityResult> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await indexQuestion(questionId);
      
      setState(prev => ({
        ...prev,
        loading: false,
        similarQuestions: result.similar_questions,
        error: null
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze question';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  /**
   * Find similar questions to a given question
   */
  const findSimilar = useCallback(async (
    questionId: string,
    customTopK?: number,
    customThreshold?: number
  ): Promise<SimilarQuestion[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const similar = await findSimilarQuestions(
        questionId,
        customTopK || topK,
        customThreshold || similarityThreshold
      );

      setState(prev => ({
        ...prev,
        loading: false,
        similarQuestions: similar,
        error: null
      }));

      return similar;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to find similar questions';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, [topK, similarityThreshold]);

  /**
   * Load similarity clusters
   */
  const loadClusters = useCallback(async (customThreshold?: number): Promise<Array<SimilarQuestion[]>> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const clusters = await getSimilarityClusters(customThreshold || 0.85);

      setState(prev => ({
        ...prev,
        loading: false,
        clusters,
        error: null
      }));

      return clusters;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load clusters';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  /**
   * Index all questions without embeddings
   */
  const indexAll = useCallback(async (batchSize: number = 50): Promise<void> => {
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      indexingProgress: { current: 0, total: 0 }
    }));

    try {
      await indexAllQuestions(batchSize, (current, total) => {
        setState(prev => ({
          ...prev,
          indexingProgress: { current, total }
        }));
      });

      setState(prev => ({
        ...prev,
        loading: false,
        indexingProgress: null,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to index questions';
      setState(prev => ({
        ...prev,
        loading: false,
        indexingProgress: null,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  /**
   * Check if a question is a potential duplicate
   */
  const checkDuplicate = useCallback(async (
    questionId: string
  ): Promise<{ isDuplicate: boolean; duplicates: SimilarQuestion[] }> => {
    try {
      const similar = await findSimilarQuestions(questionId, 5, 0.85);
      const duplicates = similar.filter(q => q.similarity_score >= 0.85);

      return {
        isDuplicate: duplicates.length > 0,
        duplicates
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      throw error;
    }
  }, []);

  return {
    ...state,
    analyzeQuestion,
    findSimilar,
    loadClusters,
    indexAll,
    checkDuplicate
  };
}
