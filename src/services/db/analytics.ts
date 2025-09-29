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
      .from("analytics_bloom_distribution")
      .select("*");
    
    if (error) {
      console.warn("Failed to fetch from analytics view, falling back to direct query:", error);
      // Fallback to direct query
      const fallbackData = await supabase
        .from("questions")
        .select("bloom_level")
        .eq("deleted", false);
      
      if (fallbackData.error) throw fallbackData.error;
      
      const counts = (fallbackData.data ?? []).reduce((acc: Record<string, number>, q: any) => {
        const bloom = q.bloom_level.charAt(0).toUpperCase() + q.bloom_level.slice(1);
        acc[bloom] = (acc[bloom] || 0) + 1;
        return acc;
      }, {});
      
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      
      return Object.entries(counts).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }));
    }
    
    return data?.map(item => ({
      name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
      value: item.value,
      percentage: Math.round(item.percentage || 0)
    })) ?? [];
  },

  async difficultySpread(): Promise<Array<{ name: string; value: number; percentage: number }>> {
    const { data, error } = await supabase
      .from("analytics_difficulty_spread")
      .select("*");
    
    if (error) {
      console.warn("Failed to fetch from analytics view, falling back to direct query:", error);
      // Fallback to direct query
      const fallbackData = await supabase
        .from("questions")
        .select("difficulty")
        .eq("deleted", false);
      
      if (fallbackData.error) throw fallbackData.error;
      
      const counts = (fallbackData.data ?? []).reduce((acc: Record<string, number>, q: any) => {
        const difficulty = q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1);
        acc[difficulty] = (acc[difficulty] || 0) + 1;
        return acc;
      }, {});
      
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      
      return Object.entries(counts).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0
      }));
    }
    
    return data?.map(item => ({
      name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
      value: item.value,
      percentage: Math.round(item.percentage || 0)
    })) ?? [];
  },

  async creatorStats(): Promise<Array<{ name: string; value: number }>> {
    const { data, error } = await supabase
      .from("analytics_creator_stats")
      .select("*");
    
    if (error) {
      console.warn("Failed to fetch from analytics view, falling back to direct query:", error);
      // Fallback to direct query
      const fallbackData = await supabase
        .from("questions")
        .select("created_by")
        .eq("deleted", false);
      
      if (fallbackData.error) throw fallbackData.error;
      
      const counts = (fallbackData.data ?? []).reduce((acc: Record<string, number>, q: any) => {
        const creator = (q.created_by === 'ai' || q.created_by === 'bulk_import') 
          ? 'AI Generated' 
          : 'Teacher Created';
        acc[creator] = (acc[creator] || 0) + 1;
        return acc;
      }, {});
      
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
    
    return data ?? [];
  },

  async approvalStats(): Promise<Array<{ name: string; value: number }>> {
    const { data, error } = await supabase
      .from("analytics_approval_stats")
      .select("*");
    
    if (error) {
      console.warn("Failed to fetch from analytics view, falling back to direct query:", error);
      // Fallback to direct query
      const fallbackData = await supabase
        .from("questions")
        .select("approved")
        .eq("deleted", false);
      
      if (fallbackData.error) throw fallbackData.error;
      
      const approved = (fallbackData.data ?? []).filter(q => q.approved).length;
      const pending = (fallbackData.data ?? []).length - approved;
      
      return [
        { name: 'Approved', value: approved },
        { name: 'Pending Review', value: pending }
      ];
    }
    
    return data ?? [];
  },

  async usageOverTime(): Promise<Array<{ date: string; count: number }>> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from("activity_log")
      .select("created_at, action")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    
    // Bin by day
    const bins: Record<string, number> = {};
    (data ?? []).forEach((record: any) => {
      const day = record.created_at.slice(0, 10);
      bins[day] = (bins[day] || 0) + 1;
    });
    
    return Object.entries(bins).map(([date, count]) => ({ date, count }));
  },

  async topicAnalysis(): Promise<Array<{ topic: string; count: number; approved: number }>> {
    const { data, error } = await supabase
      .from("analytics_topic_analysis")
      .select("*");
    
    if (error) {
      console.warn("Failed to fetch from analytics view, falling back to direct query:", error);
      // Fallback to direct query
      const fallbackData = await supabase
        .from("questions")
        .select("topic, approved")
        .eq("deleted", false);
      
      if (fallbackData.error) throw fallbackData.error;
      
      const analysis: Record<string, { count: number; approved: number }> = {};
      
      (fallbackData.data ?? []).forEach((q: any) => {
        if (!analysis[q.topic]) {
          analysis[q.topic] = { count: 0, approved: 0 };
        }
        analysis[q.topic].count++;
        if (q.approved) {
          analysis[q.topic].approved++;
        }
      });
      
      return Object.entries(analysis).map(([topic, stats]) => ({
        topic,
        count: stats.count,
        approved: stats.approved
      }));
    }
    
    return data ?? [];
  },

  async tosBloomByTopic(tosId: string): Promise<Record<string, Record<string, number>>> {
    const { data, error } = await supabase
      .from("tos")
      .select("matrix")
      .eq("id", tosId)
      .single();
    
    if (error) throw error;
    return (data?.matrix ?? {}) as Record<string, Record<string, number>>;
  },

  async getQuestionBankSufficiency(tosId: string) {
    const tosData = await this.tosBloomByTopic(tosId);
    const sufficiency: Record<string, any> = {};
    
    for (const [topic, bloomCounts] of Object.entries(tosData)) {
      sufficiency[topic] = {};
      
      for (const [bloom, data] of Object.entries(bloomCounts as Record<string, any>)) {
        const needed = data.count || 0;
        
        if (needed > 0) {
          const { data: available } = await supabase
            .from("questions")
            .select("id")
            .eq("topic", topic)
            .eq("bloom_level", bloom.toLowerCase())
            .eq("approved", true)
            .eq("deleted", false);
          
          const availableCount = available?.length || 0;
          sufficiency[topic][bloom] = {
            needed,
            available: availableCount,
            shortage: Math.max(0, needed - availableCount)
          };
        }
      }
    }
    
    return sufficiency;
  }
};