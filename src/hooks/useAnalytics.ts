import { useState, useEffect } from 'react';
import { Analytics } from '@/services/db/analytics';
import { supabase } from '@/integrations/supabase/client';
import type { AnalyticsData } from '@/services/db/analytics';

export interface UseAnalyticsReturn extends AnalyticsData {
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAnalytics = () => {
  const [analytics, setAnalytics] = useState<UseAnalyticsReturn>({
    bloomDistribution: [],
    difficultySpread: [],
    creatorStats: [],
    approvalStats: [],
    usageOverTime: [],
    topicAnalysis: [],
    tosBloomByTopic: {},
    loading: true,
    error: null,
    refetch: async () => {}
  });

  const fetchAnalytics = async () => {
    setAnalytics(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [
        bloomData,
        difficultyData,
        creatorData,
        approvalData,
        usageData,
        topicData
      ] = await Promise.all([
        Analytics.bloomDistribution(),
        Analytics.difficultySpread(),
        Analytics.creatorStats(),
        Analytics.approvalStats(),
        Analytics.usageOverTime(),
        Analytics.topicAnalysis()
      ]);


      setAnalytics(current => ({
        ...current,
        bloomDistribution: bloomData,
        difficultySpread: difficultyData,
        creatorStats: creatorData,
        approvalStats: approvalData,
        usageOverTime: usageData,
        topicAnalysis: topicData,
        tosBloomByTopic: {},
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load analytics'
      }));
    }
  };

  // Add refetch function to the analytics state
  useEffect(() => {
    setAnalytics(prev => ({
      ...prev,
      refetch: fetchAnalytics
    }));
  }, []);
  useEffect(() => {
    fetchAnalytics();

    // Set up real-time subscription
    const channel = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions'
        },
        () => {
          fetchAnalytics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_log'
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return analytics;
};