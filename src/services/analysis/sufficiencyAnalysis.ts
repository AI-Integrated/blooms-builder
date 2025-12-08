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

  // Fetch all questions ONCE (fast)
  const { data: allQuestionsRaw, error } = await supabase
    .from('questions')
    .select('id, topic, bloom_level, deleted');

  if (error) {
    console.error("Failed to fetch questions:", error);
    throw new Error("Failed to analyze question bank sufficiency");
  }

  // Normalize question fields
  const allQuestions = allQuestionsRaw
    .filter(q => !q.deleted)
    .map(q => ({
      ...q,
      topic: q.topic?.toLowerCase().trim(),
      bloom: q.bloom_level?.toLowerCase().trim()
    }));

  const results: SufficiencyResult[] = [];
  const bloomLevels = [
    'remembering', 'understanding', 'applying',
    'analyzing', 'evaluating', 'creating'
  ];

  let totalRequired = 0;
  let totalAvailable = 0;

  const bloomCounts: Record<string, { required: number; available: number }> = {};

  // Evaluate each TOS topic
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

      // Get available questions from DB that match topic + bloom
      const matched = allQuestions.filter(q =>
        q.bloom === bloom && q.topic?.includes(topicName)
      );

      const available = matched.length;
      totalAvailable += available;
      bloomCounts[bloom].available += available;

      const gap = Math.max(0, required - available);

      const sufficiency =
        available >= required ? 'pass'
        : available >= required * 0.7 ? 'warning'
        : 'fail';

      results.push({
        topic: topicName,
        bloomLevel: bloom,
        required,
        available,
        approved: available,   // approved = available now
        sufficiency,
        gap
      });
    }
  }

  const overallScore = totalRequired > 0 ? (totalAvailable / totalRequired) * 100 : 0;

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
