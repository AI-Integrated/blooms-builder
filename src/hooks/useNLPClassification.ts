import { useState, useCallback } from 'react';
import { mlClassifier, type MLClassificationResult, type QuestionInput } from '@/services/ai/mlClassifier';
import { ConfidenceScorer, type ConfidenceResult } from '@/services/ai/confidenceScoring';
import { ExplainabilityService, type ClassificationExplanation } from '@/services/ai/explainability';
import { RuleBasedClassifier } from '@/services/ai/ruleBasedClassifier';
import { toast } from 'sonner';

export interface EnhancedClassificationResult {
  mlResult: MLClassificationResult;
  confidenceAnalysis: ConfidenceResult;
  explanation: ClassificationExplanation;
  combinedConfidence: number;
  method: 'ml' | 'rule-based' | 'ensemble';
}

export function useNLPClassification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnhancedClassificationResult | null>(null);

  const classifyWithNLP = useCallback(async (input: QuestionInput): Promise<EnhancedClassificationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // 1. Perform ML classification
      const mlResult = await mlClassifier.classifyQuestion(input);

      // 2. Perform rule-based classification
      const ruleBasedResult = RuleBasedClassifier.classifyQuestion(
        input.text,
        input.type,
        input.topic
      );

      // 3. Combine results for optimal accuracy
      const ensembleResult = RuleBasedClassifier.combineWithMLClassification(
        ruleBasedResult,
        mlResult
      );

      // 4. Calculate detailed confidence analysis
      const confidenceAnalysis = ConfidenceScorer.calculateConfidence(
        input.text,
        input.type,
        ensembleResult.bloomLevel,
        ensembleResult.knowledgeDimension,
        input.topic
      );

      // 5. Generate comprehensive explanation
      const explanation = ExplainabilityService.generateExplanation(
        input.text,
        input.type,
        {
          bloom_level: ensembleResult.bloomLevel,
          knowledge_dimension: ensembleResult.knowledgeDimension,
          difficulty: ensembleResult.difficulty,
          confidence: ensembleResult.confidence
        },
        confidenceAnalysis,
        input.topic
      );

      // 6. Combine all insights
      const enhancedResult: EnhancedClassificationResult = {
        mlResult: {
          ...mlResult,
          bloom_level: ensembleResult.bloomLevel as any,
          cognitive_level: ensembleResult.bloomLevel as any,
          knowledge_dimension: ensembleResult.knowledgeDimension as any,
          difficulty: ensembleResult.difficulty as any,
          confidence: ensembleResult.confidence,
          explanation
        },
        confidenceAnalysis,
        explanation,
        combinedConfidence: (ensembleResult.confidence + confidenceAnalysis.overallConfidence) / 2,
        method: ensembleResult.method
      };

      setResult(enhancedResult);
      setLoading(false);

      return enhancedResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Classification failed';
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const batchClassify = useCallback(async (inputs: QuestionInput[]): Promise<EnhancedClassificationResult[]> => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        inputs.map(input => classifyWithNLP(input))
      );

      setLoading(false);
      return results.filter((r): r is EnhancedClassificationResult => r !== null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch classification failed';
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
      return [];
    }
  }, [classifyWithNLP]);

  const analyzeConfidence = useCallback((
    questionText: string,
    questionType: string,
    bloomLevel: string,
    knowledgeDimension: string,
    topic?: string
  ): ConfidenceResult => {
    return ConfidenceScorer.calculateConfidence(
      questionText,
      questionType,
      bloomLevel,
      knowledgeDimension,
      topic
    );
  }, []);

  const generateExplanation = useCallback((
    questionText: string,
    questionType: string,
    classification: {
      bloom_level: string;
      knowledge_dimension: string;
      difficulty: string;
      confidence: number;
    },
    confidenceResult: ConfidenceResult,
    topic?: string
  ): ClassificationExplanation => {
    return ExplainabilityService.generateExplanation(
      questionText,
      questionType,
      classification,
      confidenceResult,
      topic
    );
  }, []);

  const compareClassifications = useCallback((
    original: ClassificationExplanation,
    revised: ClassificationExplanation
  ) => {
    return ExplainabilityService.compareClassifications(original, revised);
  }, []);

  return {
    loading,
    error,
    result,
    classifyWithNLP,
    batchClassify,
    analyzeConfidence,
    generateExplanation,
    compareClassifications,
    isHighConfidence: result ? result.combinedConfidence >= 0.8 : false,
    needsReview: result ? result.combinedConfidence < 0.7 || result.explanation.weaknesses.length > 2 : false
  };
}
