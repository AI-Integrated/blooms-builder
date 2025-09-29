import { useState, useCallback } from 'react';
import { itemAnalyzer, PsychometricReport } from '@/services/psychometrics/itemAnalysis';

export interface PsychometricAnalysisState {
  report: PsychometricReport | null;
  loading: boolean;
  error: string | null;
}

export interface UsePsychometricAnalysisOptions {
  testId: string;
  autoLoad?: boolean;
}

export function usePsychometricAnalysis(options: UsePsychometricAnalysisOptions) {
  const [state, setState] = useState<PsychometricAnalysisState>({
    report: null,
    loading: false,
    error: null
  });

  const analyzeTest = useCallback(async (responses: any[] = []) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const report = await itemAnalyzer.analyzeTest(options.testId, responses);
      setState({
        report,
        loading: false,
        error: null
      });
      return report;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState({
        report: null,
        loading: false,
        error: errorMessage
      });
      throw error;
    }
  }, [options.testId]);

  const getDifficultyDistribution = useCallback(async () => {
    try {
      return await itemAnalyzer.getDifficultyDistribution(options.testId);
    } catch (error) {
      console.error('Error getting difficulty distribution:', error);
      throw error;
    }
  }, [options.testId]);

  const getReliabilityTrends = useCallback(async (periods: number = 6) => {
    try {
      return await itemAnalyzer.getReliabilityTrends(options.testId, periods);
    } catch (error) {
      console.error('Error getting reliability trends:', error);
      throw error;
    }
  }, [options.testId]);

  const clearReport = useCallback(() => {
    setState({
      report: null,
      loading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    analyzeTest,
    getDifficultyDistribution,
    getReliabilityTrends,
    clearReport
  };
}