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
  let totalAvailable = 0;
  let totalApproved = 0;
  const bloomCounts: Record<string, { required: number; available: number }> = {};

  // Analyze each topic and bloom level combination
  for (const topic of tosMatrix.topics || []) {
    const topicName = topic.topic_name || topic.topic;
    
    // Get bloom distribution for this topic
    const bloomLevels = ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'];
    
    for (const bloomLevel of bloomLevels) {
      const required = topic[`${bloomLevel}_items`] || 0;
      if (required === 0) continue;

      totalRequired += required;

      // Initialize bloom counts
      if (!bloomCounts[bloomLevel]) {
        bloomCounts[bloomLevel] = { required: 0, available: 0 };
      }
      bloomCounts[bloomLevel].required += required;

      // Query available questions
      const { data: questions, error } = await supabase
        .from('questions')
        .select('id, approved, status, deleted, quality_score')
        .eq('topic', topicName)
        .eq('bloom_level', bloomLevel)
        .eq('deleted', false);

      if (error) {
        console.error('Error querying questions:', error);
        continue;
      }

      const available = questions?.length || 0;
      const approved = questions?.filter(q => q.approved && q.status === 'approved').length || 0;

      totalAvailable += available;
      totalApproved += approved;
      bloomCounts[bloomLevel].available += available;

      const gap = required - approved;
      let sufficiency: 'pass' | 'warning' | 'fail';

      if (approved >= required) {
        sufficiency = 'pass';
      } else if (approved >= required * 0.7) {
        sufficiency = 'warning';
      } else {
        sufficiency = 'fail';
      }

      results.push({
        topic: topicName,
        bloomLevel,
        required,
        available,
        approved,
        sufficiency,
        gap: Math.max(0, gap)
      });
    }
  }

  // Calculate bloom distribution
  const bloomDistribution = Object.entries(bloomCounts).map(([level, counts]) => ({
    level,
    required: counts.required,
    available: counts.available,
    percentage: counts.required > 0 ? (counts.available / counts.required) * 100 : 0
  }));

  // Generate recommendations
  const recommendations: string[] = [];
  const failedItems = results.filter(r => r.sufficiency === 'fail');
  const warningItems = results.filter(r => r.sufficiency === 'warning');

  if (failedItems.length > 0) {
    recommendations.push(`Critical: ${failedItems.length} topic-bloom combinations have insufficient questions (< 70% coverage)`);
    failedItems.slice(0, 3).forEach(item => {
      recommendations.push(`  • ${item.topic} - ${item.bloomLevel}: Need ${item.gap} more approved questions`);
    });
  }

  if (warningItems.length > 0) {
    recommendations.push(`Warning: ${warningItems.length} combinations have marginal coverage (70-99%)`);
  }

  // Check bloom level balance
  const bloomGaps = bloomDistribution.filter(b => b.percentage < 80);
  if (bloomGaps.length > 0) {
    recommendations.push(`Bloom level gaps detected in: ${bloomGaps.map(b => b.level).join(', ')}`);
  }

  if (totalApproved >= totalRequired) {
    recommendations.push('✓ Sufficient approved questions available for test generation');
  } else {
    const deficit = totalRequired - totalApproved;
    recommendations.push(`Need ${deficit} more approved questions to meet TOS requirements`);
  }

  // Calculate overall status and score
  const overallScore = totalRequired > 0 ? (totalApproved / totalRequired) * 100 : 0;
  let overallStatus: 'pass' | 'warning' | 'fail';

  if (overallScore >= 100) {
    overallStatus = 'pass';
  } else if (overallScore >= 70) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'fail';
  }

  return {
    overallStatus,
    overallScore,
    totalRequired,
    totalAvailable: totalApproved, // Use approved count for availability
    results,
    bloomDistribution,
    recommendations
  };
}
