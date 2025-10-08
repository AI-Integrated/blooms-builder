/**
 * Standards Hook
 * Manages curriculum standards operations
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
  StandardsMapper,
  EducationalStandard,
  QuestionStandardMapping
} from '@/services/curriculum/standardsMapper';
import { generateComplianceReport, ComplianceReport } from '@/services/curriculum/complianceChecker';

export function useStandards() {
  const [isLoading, setIsLoading] = useState(false);
  const [standards, setStandards] = useState<EducationalStandard[]>([]);

  /**
   * Search for standards
   */
  const searchStandards = async (filters?: {
    category?: string;
    subject_area?: string;
    framework?: string;
  }) => {
    setIsLoading(true);
    try {
      const results = await StandardsMapper.getStandards(filters);
      setStandards(results);
      return results;
    } catch (error: any) {
      toast.error('Failed to search standards: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create or update a standard
   */
  const saveStandard = async (standard: Partial<EducationalStandard>) => {
    setIsLoading(true);
    try {
      const result = await StandardsMapper.upsertStandard(standard);
      toast.success('Standard saved successfully');
      return result;
    } catch (error: any) {
      toast.error('Failed to save standard: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Map a question to standards
   */
  const mapQuestionToStandard = async (
    questionId: string,
    standardId: string,
    alignmentStrength: number = 1.0
  ) => {
    setIsLoading(true);
    try {
      const mapping = await StandardsMapper.mapQuestionToStandard({
        question_id: questionId,
        standard_id: standardId,
        alignment_strength: alignmentStrength
      });
      toast.success('Question mapped to standard');
      return mapping;
    } catch (error: any) {
      toast.error('Failed to map question: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get all mappings for a question
   */
  const getQuestionMappings = async (questionId: string) => {
    setIsLoading(true);
    try {
      const mappings = await StandardsMapper.getQuestionMappings(questionId);
      return mappings;
    } catch (error: any) {
      toast.error('Failed to get mappings: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get all questions for a standard
   */
  const getStandardQuestions = async (standardId: string) => {
    setIsLoading(true);
    try {
      const questions = await StandardsMapper.getStandardQuestions(standardId);
      return questions;
    } catch (error: any) {
      toast.error('Failed to get questions: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Suggest standards for a question
   */
  const suggestStandards = async (
    questionText: string,
    bloomLevel: string,
    subjectArea: string
  ) => {
    setIsLoading(true);
    try {
      const suggestions = await StandardsMapper.suggestStandards(
        questionText,
        bloomLevel,
        subjectArea
      );
      return suggestions;
    } catch (error: any) {
      toast.error('Failed to suggest standards: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate compliance report for a test
   */
  const getComplianceReport = async (
    questionIds: string[],
    requiredStandards: EducationalStandard[]
  ): Promise<ComplianceReport | null> => {
    setIsLoading(true);
    try {
      // Fetch all mappings
      const allMappings = await Promise.all(
        questionIds.map(id => StandardsMapper.getQuestionMappings(id))
      );
      const flatMappings = allMappings.flat();
      
      // Get questions
      const questions = questionIds.map(id => ({ id })); // Simplified
      
      const report = await generateComplianceReport(
        questions,
        requiredStandards,
        flatMappings
      );
      
      return report;
    } catch (error: any) {
      toast.error('Failed to generate compliance report: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Analyze test alignment
   */
  const analyzeTestAlignment = async (questionIds: string[]) => {
    setIsLoading(true);
    try {
      const analysis = await StandardsMapper.analyzeTestAlignment(questionIds);
      
      if (analysis.unmappedQuestions.length > 0) {
        toast.warning(`${analysis.unmappedQuestions.length} questions not mapped to standards`);
      }
      
      return analysis;
    } catch (error: any) {
      toast.error('Failed to analyze alignment: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Import standards from file
   */
  const importStandards = async (
    standards: Partial<EducationalStandard>[],
    framework: string
  ) => {
    setIsLoading(true);
    try {
      const result = await StandardsMapper.importStandards(standards, framework);
      
      if (result.errors.length > 0) {
        toast.warning(`Imported ${result.imported} standards with ${result.errors.length} errors`);
      } else {
        toast.success(`Imported ${result.imported} standards successfully`);
      }
      
      return result;
    } catch (error: any) {
      toast.error('Failed to import standards: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    standards,
    searchStandards,
    saveStandard,
    mapQuestionToStandard,
    getQuestionMappings,
    getStandardQuestions,
    suggestStandards,
    getComplianceReport,
    analyzeTestAlignment,
    importStandards
  };
}
