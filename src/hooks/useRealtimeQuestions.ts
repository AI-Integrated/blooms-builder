import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Questions, type Question, type QuestionFilters } from '@/services/db/questions';
import { useRealtime } from './useRealtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface QuestionStats {
  total: number;
  approved: number;
  pending: number;
  ai_generated: number;
  teacher_created: number;
  needs_review: number;
}

export function useRealtimeQuestions(initialFilters?: QuestionFilters) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionStats>({
    total: 0,
    approved: 0,
    pending: 0,
    ai_generated: 0,
    teacher_created: 0,
    needs_review: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QuestionFilters>(initialFilters || {});
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const calculateStats = useCallback((questionList: Question[]): QuestionStats => {
    return {
      total: questionList.length,
      approved: questionList.filter(q => q.approved).length,
      pending: questionList.filter(q => !q.approved).length,
      ai_generated: questionList.filter(q => q.created_by === 'ai' || q.created_by === 'bulk_import').length,
      teacher_created: questionList.filter(q => q.created_by === 'teacher').length,
      needs_review: questionList.filter(q => q.needs_review).length
    };
  }, []);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await Questions.search(filters);
      setQuestions(data);
      setStats(calculateStats(data));
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  }, [filters, calculateStats]);

  const updateFilters = useCallback((newFilters: Partial<QuestionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Set up real-time subscription using a unique channel name
  useRealtime('questions-realtime-hook', {
    table: 'questions',
    onChange: (payload) => {
      console.log('Question change detected:', payload);
      setLastUpdate(new Date().toISOString());
      // Debounce the refresh to avoid too many API calls
      const timeoutId = setTimeout(() => {
        fetchQuestions();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  });

  // Real-time subscription
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Refetch when filters change
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const actions = {
    refresh: fetchQuestions,
    updateFilters,
    clearFilters,
    
    async toggleApproval(id: string, approved: boolean, reason?: string) {
      try {
        const updatedQuestion = await Questions.setApproval(id, approved);
        
        // Update local state immediately for better UX
        setQuestions(prev => prev.map(q => 
          q.id === id 
            ? { ...q, approved, needs_review: !approved }
            : q
        ));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          approved: approved ? prev.approved + 1 : prev.approved - 1,
          pending: approved ? prev.pending - 1 : prev.pending + 1
        }));
        
        // fetchQuestions will be called automatically via realtime
        return updatedQuestion;
      } catch (err) {
        console.error('Error toggling approval:', err);
        throw err;
      }
    },

    async deleteQuestion(id: string) {
      try {
        await Questions.delete(id);
        // fetchQuestions will be called automatically via realtime
      } catch (err) {
        console.error('Error deleting question:', err);
        throw err;
      }
    },

    async createQuestion(question: Omit<Question, 'id' | 'created_at' | 'updated_at'>) {
      try {
        await Questions.insert(question);
        // fetchQuestions will be called automatically via realtime
      } catch (err) {
        console.error('Error creating question:', err);
        throw err;
      }
    },

    async updateQuestion(id: string, patch: Partial<Question>) {
      try {
        await Questions.update(id, patch);
        // fetchQuestions will be called automatically via realtime
      } catch (err) {
        console.error('Error updating question:', err);
        throw err;
      }
    },

    async bulkInsert(questions: Array<Omit<Question, 'id' | 'created_at' | 'updated_at'>>) {
      try {
        await Questions.bulkInsert(questions);
        // fetchQuestions will be called automatically via realtime
      } catch (err) {
        console.error('Error bulk inserting questions:', err);
        throw err;
      }
    }
  };

  return {
    questions,
    stats,
    loading,
    error,
    filters,
    actions
  };
}