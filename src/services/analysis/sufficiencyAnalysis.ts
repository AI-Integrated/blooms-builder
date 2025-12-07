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
  const results: SufficiencyResult[] = [];
  let totalRequired = 0;
  let totalApproved = 0;

  const bloomLevels = [
    "remembering",
    "understanding",
    "applying",
    "analyzing",
    "evaluating",
    "creating"
  ];

  const bloomCounts: Record<string, { required: number; available: number }> = {};

  for (const topic of tosMatrix.topics || []) {
    const topicName = topic.topic || topic.topic_name;
    const matrixRow = tosMatrix.matrix?.[topicName];

    if (!matrixRow) continue;

    for (const bloom of bloomLevels) {
  const required = topic[`${bloom}_items`] || 0;
  if (required === 0) continue;

  totalRequired += required;

  if (!bloomCounts[bloom]) {
    bloomCounts[bloom] = { required: 0, available: 0 };
  }
  bloomCounts[bloom].required += required;

  // Match questions in the bank
  const matched = allQuestions.filter(q =>
    q.bloom === bloom &&
    q.topic?.includes(topicName) // flexible match
  );

  const available = matched.length;
  const approved = available; // <--- USE ALL AVAILABLE

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


  // Bloom distribution
  const bloomDistribution = Object.entries(bloomCounts).map(
    ([level, counts]) => ({
      level,
      required: counts.required,
      available: counts.available,
      percentage: counts.required > 0 ? (counts.available / counts.required) * 100 : 0
    })
  );

  const overallScore = totalRequired > 0 ? (totalApproved / totalRequired) * 100 : 0;

  const overallStatus =
    overallScore >= 100 ? "pass" :
    overallScore >= 70  ? "warning" :
                           "fail";

  const recommendations: string[] = [];

  if (overallScore < 70) {
    recommendations.push("Add more approved questions for multiple Bloom levels.");
  } else if (overallScore < 100) {
    recommendations.push("Coverage is decent — but needs more approved items.");
  } else {
    recommendations.push("✓ Sufficient approved questions available for test generation.");
  }

  return {
    overallStatus,
    overallScore,
    totalRequired,
    totalAvailable: totalApproved,
    results,
    bloomDistribution,
    recommendations
  };
}
