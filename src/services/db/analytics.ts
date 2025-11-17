import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsData {
  bloomDistribution: Array<{ name: string; value: number; percentage: number }>;
  difficultySpread: Array<{ name: string; value: number; percentage: number }>;
  creatorStats: Array<{ name: string; value: number }>;
  approvalStats: Array<{ name: string; value: number }>;
  usageOverTime: Array<{ date: string; count: number }>;
  topicAnalysis: Array<{ topic: string; count: number; approved: number }>;
  tosBloomByTopic: Record<string, Record<string, number>>;
}

export const Analytics = {
  async bloomDistribution(): Promise<Array<{ name: string; value: number; percentage: number }>> {
    const { data, error } = await supabase
      .from("questions")
      .select("bloom_level")
      .eq("deleted", false);
    
    if (error) throw error;
    
    const counts = (data ?? []).reduce((acc: Record<string, number>, q: any) => {
      const bloom = q.bloom_level ? q.bloom_level.charAt(0).toUpperCase() + q.bloom_level.slice(1) : 'Unknown';
      acc[bloom] = (acc[bloom] || 0) + 1;
      return acc;
    }, {});
    
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0
    }));
  },

  async difficultySpread(): Promise<Array<{ name: string; value: number; percentage: number }>> {
    const { data, error } = await supabase
      .from("questions")
      .select("difficulty")
      .eq("deleted", false);
    
    if (error) throw error;
    
    const counts = (data ?? []).reduce((acc: Record<string, number>, q: any) => {
      const difficulty = q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : 'Unknown';
      acc[difficulty] = (acc[difficulty] || 0) + 1;
      return acc;
    }, {});
    
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0
    }));
  },

  async creatorStats(): Promise<Array<{ name: string; value: number }>> {
    const { data, error } = await supabase
      .from("questions")
      .select("created_by")
      .eq("deleted", false);
    
    if (error) throw error;
    
    const counts = (data ?? []).reduce((acc: Record<string, number>, q: any) => {
      const creator = (q.created_by === 'ai' || q.created_by === 'bulk_import') 
        ? 'AI Generated' 
        : 'Teacher Created';
      acc[creator] = (acc[creator] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  },

  async approvalStats(): Promise<Array<{ name: string; value: number }>> {
    const { data, error } = await supabase
      .from("questions")
      .select("approved")
      .eq("deleted", false);
    
    if (error) throw error;
    
    const counts = (data ?? []).reduce((acc: Record<string, number>, q: any) => {
      const status = q.approved ? 'Approved' : 'Pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  },

  async usageOverTime(): Promise<Array<{ date: string; count: number }>> {
    const { data, error } = await supabase
      .from("questions")
      .select("created_at")
      .eq("deleted", false)
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    
    // Group by date
    const dateCount = (data ?? []).reduce((acc: Record<string, number>, q: any) => {
      const date = new Date(q.created_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(dateCount).map(([date, count]) => ({ date, count }));
  },

  async topicAnalysis(): Promise<Array<{ topic: string; count: number; approved: number }>> {
    const { data, error } = await supabase
      .from("questions")
      .select("topic, approved")
      .eq("deleted", false);
    
    if (error) throw error;
    
    const topicStats = (data ?? []).reduce((acc: Record<string, { count: number; approved: number }>, q: any) => {
      const topic = q.topic || 'Unknown';
      if (!acc[topic]) {
        acc[topic] = { count: 0, approved: 0 };
      }
      acc[topic].count++;
      if (q.approved) {
        acc[topic].approved++;
      }
      return acc;
    }, {});
    
    return Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      count: stats.count,
      approved: stats.approved
    }));
  },

  async tosBloomByTopic(): Promise<Record<string, Record<string, number>>> {
    const { data, error } = await supabase
      .from("learning_competencies")
      .select("*");
    
    if (error) {
      console.error("Error fetching TOS data:", error);
      return {};
    }
    
    const result: Record<string, Record<string, number>> = {};
    
    (data ?? []).forEach((comp: any) => {
      const topic = comp.topic_name || 'Unknown';
      if (!result[topic]) {
        result[topic] = {};
      }
      
      result[topic]['Remembering'] = comp.remembering_items || 0;
      result[topic]['Understanding'] = comp.understanding_items || 0;
      result[topic]['Applying'] = comp.applying_items || 0;
      result[topic]['Analyzing'] = comp.analyzing_items || 0;
      result[topic]['Evaluating'] = comp.evaluating_items || 0;
      result[topic]['Creating'] = comp.creating_items || 0;
    });
    
    return result;
  },

  async getAll(): Promise<AnalyticsData> {
    const [
      bloomDistribution,
      difficultySpread,
      creatorStats,
      approvalStats,
      usageOverTime,
      topicAnalysis,
      tosBloomByTopic
    ] = await Promise.all([
      this.bloomDistribution(),
      this.difficultySpread(),
      this.creatorStats(),
      this.approvalStats(),
      this.usageOverTime(),
      this.topicAnalysis(),
      this.tosBloomByTopic()
    ]);

    return {
      bloomDistribution,
      difficultySpread,
      creatorStats,
      approvalStats,
      usageOverTime,
      topicAnalysis,
      tosBloomByTopic
    };
  }
};
