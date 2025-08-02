import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface BloomData {
  name: string;
  value: number;
  percentage: number;
}

interface CreatorData {
  name: string;
  value: number;
}

interface TimeSeriesData {
  date: string;
  count: number;
}

interface AnalyticsData {
  bloomDistribution: BloomData[];
  creatorStats: CreatorData[];
  timeSeriesData: TimeSeriesData[];
  totalQuestions: number;
  aiQuestions: number;
  teacherQuestions: number;
  loading: boolean;
}

export const useAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    bloomDistribution: [],
    creatorStats: [],
    timeSeriesData: [],
    totalQuestions: 0,
    aiQuestions: 0,
    teacherQuestions: 0,
    loading: true,
  });

  const fetchAnalytics = async () => {
    try {
      // Fetch all questions data at once
      const { data: questionsData, error } = await (supabase as any)
        .from('questions')
        .select('bloom_level, created_by, created_at');

      if (error) {
        console.error('Error fetching questions:', error);
        setAnalytics(prev => ({ ...prev, loading: false }));
        return;
      }

      if (questionsData) {
        // Process Bloom's distribution
        const bloomCounts = questionsData.reduce((acc: any, item) => {
          const level = item.bloom_level || 'Unknown';
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {});

        const totalQuestions = questionsData.length;
        const bloomDistribution = Object.entries(bloomCounts).map(([name, count]) => ({
          name,
          value: count as number,
          percentage: totalQuestions > 0 ? Math.round(((count as number) / totalQuestions) * 100) : 0
        }));

        // Process creator stats
        const creatorCounts = questionsData.reduce((acc: any, item) => {
          const creator = item.created_by === 'ai' ? 'AI Generated' : 'Teacher Created';
          acc[creator] = (acc[creator] || 0) + 1;
          return acc;
        }, {});

        const creatorStats = Object.entries(creatorCounts).map(([name, value]) => ({
          name,
          value: value as number
        }));

        // Process time series data (last 14 days)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        
        const recentQuestions = questionsData.filter(item => 
          new Date(item.created_at) >= fourteenDaysAgo
        );

        const dateGroups = recentQuestions.reduce((acc: any, item) => {
          const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        const timeSeriesData = Object.entries(dateGroups).map(([date, count]) => ({
          date,
          count: count as number
        }));

        setAnalytics({
          bloomDistribution,
          creatorStats,
          timeSeriesData,
          totalQuestions,
          aiQuestions: creatorCounts['AI Generated'] || 0,
          teacherQuestions: creatorCounts['Teacher Created'] || 0,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics(prev => ({ ...prev, loading: false }));
    }
  };

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return analytics;
};