import { useState, useCallback } from 'react';
import { automatedValidator, ValidationSuite } from '@/services/testing/automatedValidator';

export interface ValidationTestingState {
  currentSuite: ValidationSuite | null;
  history: ValidationSuite[];
  loading: boolean;
  error: string | null;
}

export interface UseValidationTestingOptions {
  entityId: string;
  entityType: 'question' | 'test' | 'system';
  autoLoadHistory?: boolean;
}

export function useValidationTesting(options: UseValidationTestingOptions) {
  const [state, setState] = useState<ValidationTestingState>({
    currentSuite: null,
    history: [],
    loading: false,
    error: null
  });

  const runValidation = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      let suite: ValidationSuite;
      
      switch (options.entityType) {
        case 'question':
          suite = await automatedValidator.validateQuestion(options.entityId);
          break;
        case 'test':
          suite = await automatedValidator.validateTest(options.entityId);
          break;
        case 'system':
        default:
          suite = await automatedValidator.validateSystem();
          break;
      }
      
      setState(prev => ({
        ...prev,
        currentSuite: suite,
        loading: false,
        error: null
      }));
      
      // Refresh history
      await loadHistory();
      
      return suite;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, [options.entityId, options.entityType]);

  const loadHistory = useCallback(async (limit: number = 10) => {
    try {
      const history = await automatedValidator.getValidationHistory(
        options.entityId,
        options.entityType,
        limit
      );
      
      setState(prev => ({
        ...prev,
        history,
        error: null
      }));
      
      return history;
    } catch (error) {
      console.error('Error loading validation history:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load history';
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      throw error;
    }
  }, [options.entityId, options.entityType]);

  const clearCurrentSuite = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSuite: null,
      error: null
    }));
  }, []);

  const getValidationStats = useCallback(() => {
    if (!state.currentSuite) {
      return null;
    }
    
    const { tests } = state.currentSuite;
    const total = tests.length;
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    const critical = tests.filter(t => t.severity === 'critical' && !t.passed).length;
    
    const byType = {
      structural: tests.filter(t => t.type === 'structural').length,
      content: tests.filter(t => t.type === 'content').length,
      performance: tests.filter(t => t.type === 'performance').length,
      security: tests.filter(t => t.type === 'security').length,
      accessibility: tests.filter(t => t.type === 'accessibility').length
    };
    
    const bySeverity = {
      low: tests.filter(t => t.severity === 'low').length,
      medium: tests.filter(t => t.severity === 'medium').length,
      high: tests.filter(t => t.severity === 'high').length,
      critical: tests.filter(t => t.severity === 'critical').length
    };
    
    return {
      total,
      passed,
      failed,
      critical,
      byType,
      bySeverity,
      executionTime: state.currentSuite.executionTime,
      overallStatus: state.currentSuite.overallStatus
    };
  }, [state.currentSuite]);

  const getHistoryTrends = useCallback(() => {
    return state.history.slice(0, 10).reverse().map((suite, index) => ({
      run: index + 1,
      passed: suite.tests?.filter(t => t.passed).length || 0,
      failed: suite.tests?.filter(t => !t.passed).length || 0,
      date: new Date(suite.timestamp).toLocaleDateString(),
      status: suite.overallStatus,
      executionTime: suite.executionTime
    }));
  }, [state.history]);

  return {
    ...state,
    runValidation,
    loadHistory,
    clearCurrentSuite,
    getValidationStats,
    getHistoryTrends
  };
}