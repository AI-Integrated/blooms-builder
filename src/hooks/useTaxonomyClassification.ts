import { useState, useCallback } from 'react';
import { mlClassifier, type MLClassificationResult, type QuestionInput } from '@/services/ai/mlClassifier';
import { ConfidenceScorer, type ConfidenceResult } from '@/services/ai/confidenceScoring';
import { TaxonomyMatrixService, type TaxonomyMatrix } from '@/services/ai/taxonomyMatrix';
import { EdgeFunctions } from '@/services/edgeFunctions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClassificationState {
  result: MLClassificationResult | null;
  confidence: ConfidenceResult | null;
  loading: boolean;
  error: string | null;
  matrix: TaxonomyMatrix | null;
}

export interface UseTaxonomyClassificationOptions {
  useMLClassifier?: boolean;
  storeResults?: boolean;
  checkSimilarity?: boolean;
  autoValidate?: boolean;
}

export function useTaxonomyClassification(options: UseTaxonomyClassificationOptions = {}) {
  const {
    useMLClassifier = true,
    storeResults = true,
    checkSimilarity = true,
    autoValidate = false
  } = options;

  const [state, setState] = useState<ClassificationState>({
    result: null,
    confidence: null,
    loading: false,
    error: null,
    matrix: null
  });

  const classifyQuestion = useCallback(async (input: QuestionInput): Promise<MLClassificationResult | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let result: MLClassificationResult;

      if (useMLClassifier) {
        try {
          // Try ML classifier first
          result = await mlClassifier.classifyQuestion(input);
        } catch (mlError) {
          console.warn('ML classifier failed, using edge function:', mlError);
          
          // Fallback to edge function
          const edgeResult = await EdgeFunctions.classifySingleQuestion(
            input.text,
            input.type,
            input.topic
          );
          
          result = {
            bloom_level: edgeResult.bloom_level as any,
            knowledge_dimension: edgeResult.knowledge_dimension as any,
            difficulty: edgeResult.difficulty as any,
            confidence: edgeResult.confidence,
            quality_score: 0.7, // Default quality score
            readability_score: 8.0, // Default readability
            semantic_vector: [], // Empty vector for fallback
            needs_review: edgeResult.needs_review
          };
        }
      } else {
        // Use edge function directly
        const edgeResult = await EdgeFunctions.classifySingleQuestion(
          input.text,
          input.type,
          input.topic
        );
        
        result = {
          bloom_level: edgeResult.bloom_level as any,
          knowledge_dimension: edgeResult.knowledge_dimension as any,
          difficulty: edgeResult.difficulty as any,
          confidence: edgeResult.confidence,
          quality_score: 0.7,
          readability_score: 8.0,
          semantic_vector: [],
          needs_review: edgeResult.needs_review
        };
      }

      // Calculate detailed confidence analysis
      const confidenceAnalysis = ConfidenceScorer.calculateConfidence(
        input.text,
        input.type,
        result.bloom_level,
        result.knowledge_dimension,
        input.topic
      );

      setState(prev => ({
        ...prev,
        result,
        confidence: confidenceAnalysis,
        loading: false
      }));

      // Store results if requested
      if (storeResults) {
        await storeClassificationResult(input, result, confidenceAnalysis);
      }

      return result;
    } catch (error) {
      console.error('Classification error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Classification failed'
      }));
      toast.error('Failed to classify question');
      return null;
    }
  }, [useMLClassifier, storeResults]);

  const batchClassify = useCallback(async (inputs: QuestionInput[]): Promise<MLClassificationResult[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const results = await mlClassifier.batchClassify(inputs);
      
      setState(prev => ({ ...prev, loading: false }));
      
      if (storeResults) {
        // Store batch results
        await Promise.all(
          results.map((result, index) => {
            const confidence = ConfidenceScorer.calculateConfidence(
              inputs[index].text,
              inputs[index].type,
              result.bloom_level,
              result.knowledge_dimension,
              inputs[index].topic
            );
            return storeClassificationResult(inputs[index], result, confidence);
          })
        );
      }

      return results;
    } catch (error) {
      console.error('Batch classification error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Batch classification failed'
      }));
      throw error;
    }
  }, [storeResults]);

  const buildTaxonomyMatrix = useCallback(async (questions: any[]): Promise<TaxonomyMatrix> => {
    try {
      const matrix = TaxonomyMatrixService.buildMatrix(questions);
      setState(prev => ({ ...prev, matrix }));
      return matrix;
    } catch (error) {
      console.error('Matrix building error:', error);
      throw error;
    }
  }, []);

  const validateClassification = useCallback(async (
    questionId: string,
    originalClassification: MLClassificationResult,
    validatedClassification: Partial<MLClassificationResult>,
    notes?: string
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Store validation - simplified for now
      console.log('Classification validation stored (mock)', {
        question_id: questionId,
        original_classification: originalClassification,
        validated_classification: validatedClassification,
        validator_id: user.id,
        validation_confidence: 0.95,
        notes
      });

      // Update question with validated classification
      await supabase.from('questions').update({
        bloom_level: validatedClassification.bloom_level || originalClassification.bloom_level,
        knowledge_dimension: validatedClassification.knowledge_dimension || originalClassification.knowledge_dimension,
        difficulty: validatedClassification.difficulty || originalClassification.difficulty,
        validation_status: 'validated',
        validated_by: user.id,
        validation_timestamp: new Date().toISOString()
      }).eq('id', questionId);

      toast.success('Classification validated successfully');
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate classification');
      throw error;
    }
  }, []);

  return {
    ...state,
    classifyQuestion,
    batchClassify,
    buildTaxonomyMatrix,
    validateClassification,
    isHighConfidence: state.confidence ? state.confidence.overallConfidence >= 0.8 : false,
    needsReview: state.confidence ? state.confidence.needsReview : false
  };
}

async function storeClassificationResult(
  input: QuestionInput,
  result: MLClassificationResult,
  confidence: ConfidenceResult
): Promise<void> {
  try {
    // Store quality metrics - simplified for now
    console.log('Quality metrics stored (mock)', {
      entity_type: 'question',
      metrics: [
        { name: 'ml_confidence', value: result.confidence },
        { name: 'quality_score', value: result.quality_score },
        { name: 'readability_score', value: result.readability_score }
      ]
    });

  } catch (error) {
    console.error('Error storing classification result:', error);
  }
}