import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateCosineSimilarity } from '@/services/ai/semanticAnalyzer';
import { toast } from 'sonner';

export interface SimilarQuestion {
  id: string;
  question_text: string;
  topic: string;
  bloom_level: string;
  similarity_score: number;
  created_at: string;
}

export interface SimilarityCluster {
  questions: string[];
  averageSimilarity: number;
  representativeQuestion: string;
}

export interface SemanticAnalysisResult {
  similarQuestions: SimilarQuestion[];
  clusters: SimilarityCluster[];
  redundancyAlerts: { questionId: string; duplicateOf: string; score: number }[];
  totalAnalyzed: number;
}

export interface SemanticAnalysisState {
  similarities: any[];
  clusters: any[];
  loading: boolean;
  error: string | null;
  redundancyReport: {
    duplicatesFound: number;
    similarPairs: Array<{ id1: string; id2: string; similarity: number }>;
    recommendations: string[];
  } | null;
}

export function useSemanticAnalysis(options: any = {}) {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SemanticAnalysisResult | null>(null);
  const [state, setState] = useState<SemanticAnalysisState>({
    similarities: [],
    clusters: [],
    loading: false,
    error: null,
    redundancyReport: null
  });

  const analyzeSimilarity = useCallback(async (questionId: string, threshold = 0.8) => {
    setLoading(true);
    try {
      const { data: targetQuestion, error: targetError } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (targetError) throw targetError;

      const { data: allQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('topic', targetQuestion.topic)
        .neq('id', questionId);

      if (questionsError) throw questionsError;

      const similarQuestions: SimilarQuestion[] = [];
      const redundancyAlerts: SemanticAnalysisResult['redundancyAlerts'] = [];

      for (const question of allQuestions || []) {
        const score = calculateCosineSimilarity(
          targetQuestion.question_text,
          question.question_text,
          targetQuestion.semantic_vector || '',
          question.semantic_vector || ''
        );

        if (score > 0.5) {
          similarQuestions.push({
            id: question.id,
            question_text: question.question_text,
            topic: question.topic,
            bloom_level: question.bloom_level,
            similarity_score: score,
            created_at: question.created_at
          });

          await supabase.from('question_similarities').upsert({
            question1_id: questionId,
            question2_id: question.id,
            similarity_score: score,
            algorithm_used: 'cosine'
          }, { onConflict: 'question1_id,question2_id', ignoreDuplicates: true });

          if (score >= threshold) {
            redundancyAlerts.push({
              questionId: question.id,
              duplicateOf: questionId,
              score
            });
          }
        }
      }

      similarQuestions.sort((a, b) => b.similarity_score - a.similarity_score);

      const result = {
        similarQuestions,
        clusters: [],
        redundancyAlerts,
        totalAnalyzed: (allQuestions?.length || 0) + 1
      };

      setAnalysisResult(result);
      setState({
        similarities: similarQuestions,
        clusters: [],
        loading: false,
        error: null,
        redundancyReport: {
          duplicatesFound: redundancyAlerts.length,
          similarPairs: redundancyAlerts.map(a => ({
            id1: questionId,
            id2: a.questionId,
            similarity: a.score
          })),
          recommendations: redundancyAlerts.map(a => 
            `Question ${a.questionId} is ${(a.score * 100).toFixed(0)}% similar - consider reviewing`
          )
        }
      });

      toast.success(`Found ${similarQuestions.length} similar questions`);
    } catch (error) {
      console.error('Error analyzing similarity:', error);
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Unknown error' }));
      toast.error('Failed to analyze similarity');
    } finally {
      setLoading(false);
    }
  }, []);

  const batchAnalyzeSimilarity = useCallback(async (questionIds: string[], threshold = 0.8) => {
    setLoading(true);
    try {
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);

      if (error) throw error;

      const clusters: SimilarityCluster[] = [];
      const redundancyAlerts: SemanticAnalysisResult['redundancyAlerts'] = [];
      const allSimilarities: Map<string, SimilarQuestion[]> = new Map();

      for (let i = 0; i < (questions?.length || 0); i++) {
        const q1 = questions![i];
        const similar: SimilarQuestion[] = [];

        for (let j = i + 1; j < (questions?.length || 0); j++) {
          const q2 = questions![j];
          const score = calculateCosineSimilarity(
            q1.question_text,
            q2.question_text,
            q1.semantic_vector || '',
            q2.semantic_vector || ''
          );

          if (score > 0.5) {
            similar.push({
              id: q2.id,
              question_text: q2.question_text,
              topic: q2.topic,
              bloom_level: q2.bloom_level,
              similarity_score: score,
              created_at: q2.created_at
            });

            await supabase.from('question_similarities').upsert({
              question1_id: q1.id,
              question2_id: q2.id,
              similarity_score: score,
              algorithm_used: 'cosine'
            }, { onConflict: 'question1_id,question2_id', ignoreDuplicates: true });

            if (score >= threshold) {
              redundancyAlerts.push({
                questionId: q2.id,
                duplicateOf: q1.id,
                score
              });
            }
          }
        }

        if (similar.length > 0) {
          allSimilarities.set(q1.id, similar);
        }
      }

      const visited = new Set<string>();
      questions?.forEach(q => {
        if (!visited.has(q.id)) {
          const clusterQuestions = [q.id];
          visited.add(q.id);
          
          const similar = allSimilarities.get(q.id) || [];
          similar.forEach(s => {
            if (!visited.has(s.id) && s.similarity_score >= 0.7) {
              clusterQuestions.push(s.id);
              visited.add(s.id);
            }
          });

          if (clusterQuestions.length > 1) {
            const avgSim = similar.reduce((sum, s) => sum + s.similarity_score, 0) / similar.length;
            clusters.push({
              questions: clusterQuestions,
              averageSimilarity: avgSim,
              representativeQuestion: q.id
            });
          }
        }
      });

      const result = {
        similarQuestions: Array.from(allSimilarities.values()).flat(),
        clusters,
        redundancyAlerts,
        totalAnalyzed: questions?.length || 0
      };

      setAnalysisResult(result);
      setState({
        similarities: result.similarQuestions,
        clusters,
        loading: false,
        error: null,
        redundancyReport: {
          duplicatesFound: redundancyAlerts.length,
          similarPairs: redundancyAlerts.map(a => ({
            id1: a.duplicateOf,
            id2: a.questionId,
            similarity: a.score
          })),
          recommendations: redundancyAlerts.map(a => 
            `Question ${a.questionId} is ${(a.score * 100).toFixed(0)}% similar to ${a.duplicateOf}`
          )
        }
      });

      toast.success(`Analyzed ${questions?.length || 0} questions, found ${redundancyAlerts.length} potential duplicates`);
    } catch (error) {
      console.error('Error batch analyzing:', error);
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Unknown error' }));
      toast.error('Failed to analyze questions');
    } finally {
      setLoading(false);
    }
  }, []);

  const findSimilarQuestions = useCallback(async (questionText: string, excludeIds: string[] = []) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(100);

      const similarities = (questions || [])
        .map(q => ({
          questionId2: q.id,
          similarity: calculateCosineSimilarity(questionText, q.question_text, '', q.semantic_vector || ''),
          algorithm: 'cosine' as const,
          confidence: 0.85
        }))
        .filter(s => s.similarity > 0.5)
        .sort((a, b) => b.similarity - a.similarity);

      setState(prev => ({ ...prev, similarities, loading: false }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Unknown error', loading: false }));
    }
  }, []);

  return {
    loading,
    analysisResult,
    ...state,
    analyzeSimilarity,
    batchAnalyzeSimilarity,
    findSimilarQuestions,
    clusterQuestions: async () => [],
    detectRedundancy: async () => state.redundancyReport,
    calculateSimilarity: async (text1: string, text2: string) => calculateCosineSimilarity(text1, text2, '', ''),
    classifyQuestion: async () => ({ bloom_level: 'remember', knowledge_dimension: 'factual', difficulty: 'easy' }),
    batchClassify: async () => []
  };
}
