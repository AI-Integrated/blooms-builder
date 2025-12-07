import { supabase } from "@/integrations/supabase/client";

export interface SufficiencyResult {
  topic: string;
  bloomLevel: string;
  required: number;
  available: number;
  approved: number;
  sufficiency: 'pass' | 'warning' | 'fail';
  gap: number;
}

export interface SufficiencyAnalysis {
  overallStatus: 'pass' | 'warning' | 'fail';
  overallScore: number;
  totalRequired: number;
  totalAvailable: number;
  results: SufficiencyResult[];
  bloomDistribution: {
    level: string;
    required: number;
    available: number;
    percentage: number;
  }[];
  recommendations: string[];
}

export async function analyzeTOSSufficiency(tosMatrix: any): Promise<SufficiencyAnalysis> {
  const { data: allQuestionsRaw, error } = await supabase
    .from('questions')
    .select('id, topic, bloom_level, approved, status, deleted');

  if (error) {
    console.error("Failed to fetch questions:", error);
    throw new Error("Failed to analyze question bank sufficiency");
  }

  const allQuestions = allQuestionsRaw
    .filter(q => !q.deleted)
    .map(q => ({
      ...q,
      topic: q.topic?.toLowerCase().trim(),
      bloom: q.bloom_level?.toLowerCase().trim()
    }));

  const results: SufficiencyResult[] = [];
  let totalRequired = 0;
  let totalApproved = 0;
  let totalAvailable = 0;

  const bloomCounts: Record<string, { required: number; available: number }> = {};
  const bloomLevels = ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'];

  for (const topic of tosMatrix.topics || []) {
    const topicName = (topic.topic_name || topic.topic).toLowerCase().trim();

    for (const bloom of bloomLevels) {
      const required = topic[`${bloom}_items`] || 0;
      if (required === 0) continue;

      totalRequired += required;

      if (!bloomCounts[bloom]) {
        bloomCounts[bloom] = { required: 0, available: 0 };
      }
      bloomCounts[bloom].required += required;

      const matched = allQuestions.filter(q =>
        q.bloom === bloom && q.topic?.includes(topicName)
      );

      const available = matched.length;
      const approved = available;

      totalAvailable += available;
      totalApproved += approved;

      bloomCounts[bloom].available += available;

      const gap = required - available;
      const sufficiency =
        available >= required ? 'pass'
        : available >= required * 0.7 ? 'warning'
        : 'fail';

      results.push({
        topic: topicName,
        bloomLevel: bloom,
        required,
        available,
        approved,
        sufficiency,
        gap: Math.max(0, gap)
      });
    }
  }

  const overallScore = totalRequired > 0 ? (totalApproved / totalRequired) * 100 : 0;

  const overallStatus =
    overallScore >= 100 ? 'pass'
    : overallScore >= 70 ? 'warning'
    : 'fail';

  return {
    overallStatus,
    overallScore,
    totalRequired,
    totalAvailable,
    results,
    bloomDistribution: Object.entries(bloomCounts).map(([level, c]) => ({
      level,
      required: c.required,
      available: c.available,
      percentage: c.required ? (c.available / c.required) * 100 : 0
    })),
    recommendations: []
  };
}
