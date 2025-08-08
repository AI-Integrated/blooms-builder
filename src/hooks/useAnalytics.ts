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

interface DifficultyData {
  name: string;
  value: number;
  percentage: number;
}

interface UsageData {
  name: string;
  value: number;
  percentage: number;
}

interface ApprovalData {
  name: string;
  value: number;
  percentage: number;
}

interface TopicData {
  topic: string;
  questionCount: number;
  avgDifficulty: number;
}

interface AnalyticsData {
  bloomDistribution: BloomData[];
  creatorStats: CreatorData[];
  timeSeriesData: TimeSeriesData[];
  difficultySpread: DifficultyData[];
  usageStats: UsageData[];
  approvalStats: ApprovalData[];
  topicAnalysis: TopicData[];
  totalQuestions: number;
  aiQuestions: number;
  teacherQuestions: number;
  approvedQuestions: number;
  pendingApproval: number;
  loading: boolean;
}

export const useAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    bloomDistribution: [],
    creatorStats: [],
    timeSeriesData: [],
    difficultySpread: [],
    usageStats: [],
    approvalStats: [],
    topicAnalysis: [],
    totalQuestions: 0,
    aiQuestions: 0,
    teacherQuestions: 0,
    approvedQuestions: 0,
    pendingApproval: 0,
    loading: true,
  });

  const fetchAnalytics = async () => {
    try {
      // Fetch all questions data at once
      const { data: questionsData, error } = await (supabase as any)
        .from('questions')
        .select('bloom_level, created_by, created_at, difficulty, topic, approved, question_type');

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

        // Process difficulty spread
        const difficultyCounts = questionsData.reduce((acc: any, item) => {
          const difficulty = item.difficulty || 'Unknown';
          acc[difficulty] = (acc[difficulty] || 0) + 1;
          return acc;
        }, {});

        const difficultySpread = Object.entries(difficultyCounts).map(([name, count]) => ({
          name,
          value: count as number,
          percentage: totalQuestions > 0 ? Math.round(((count as number) / totalQuestions) * 100) : 0
        }));

        // Process usage stats (placeholder - would need usage tracking)
        const usageStats = [
          { name: 'Used in Tests', value: Math.floor(totalQuestions * 0.6), percentage: 60 },
          { name: 'Unused', value: Math.floor(totalQuestions * 0.4), percentage: 40 }
        ];

        // Process approval stats
        const approvedCount = questionsData.filter(q => q.approved).length;
        const pendingCount = totalQuestions - approvedCount;
        const approvalStats = [
          { 
            name: 'Approved', 
            value: approvedCount, 
            percentage: totalQuestions > 0 ? Math.round((approvedCount / totalQuestions) * 100) : 0 
          },
          { 
            name: 'Pending Review', 
            value: pendingCount, 
            percentage: totalQuestions > 0 ? Math.round((pendingCount / totalQuestions) * 100) : 0 
          }
        ];

        // Process topic analysis
        const topicGroups = questionsData.reduce((acc: any, item) => {
          const topic = item.topic || 'Unknown';
          if (!acc[topic]) {
            acc[topic] = { count: 0, difficulties: [] };
          }
          acc[topic].count += 1;
          if (item.difficulty) {
            acc[topic].difficulties.push(item.difficulty);
          }
          return acc;
        }, {});

        const topicAnalysis = Object.entries(topicGroups).map(([topic, data]: [string, any]) => {
          const avgDifficulty = data.difficulties.length > 0 
            ? data.difficulties.filter((d: string) => d === 'Hard').length / data.difficulties.length 
            : 0;
          return {
            topic,
            questionCount: data.count,
            avgDifficulty: Math.round(avgDifficulty * 100)
          };
        }).slice(0, 10); // Top 10 topics

        setAnalytics({
          bloomDistribution,
          creatorStats,
          timeSeriesData,
          difficultySpread,
          usageStats,
          approvalStats,
          topicAnalysis,
          totalQuestions,
          aiQuestions: creatorCounts['AI Generated'] || 0,
          teacherQuestions: creatorCounts['Teacher Created'] || 0,
          approvedQuestions: approvedCount,
          pendingApproval: pendingCount,
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