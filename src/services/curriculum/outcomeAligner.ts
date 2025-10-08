/**
 * Learning Outcome Alignment Service
 * Validates test alignment to intended learning outcomes
 */

export interface LearningOutcome {
  id: string;
  code: string;
  description: string;
  bloomLevel: string;
  knowledgeDimension?: string;
  topics: string[];
}

export interface AlignmentResult {
  outcomeId: string;
  alignmentScore: number; // 0-1
  mappedQuestions: string[];
  gaps: string[];
  recommendations: string[];
}

/**
 * Align questions to learning outcomes
 */
export async function alignToOutcomes(
  questions: any[],
  outcomes: LearningOutcome[]
): Promise<AlignmentResult[]> {
  const results: AlignmentResult[] = [];
  
  for (const outcome of outcomes) {
    const mapped = findMatchingQuestions(questions, outcome);
    const score = calculateAlignmentScore(mapped, outcome);
    const gaps = identifyGaps(mapped, outcome);
    const recommendations = generateRecommendations(mapped, outcome, gaps);
    
    results.push({
      outcomeId: outcome.id,
      alignmentScore: score,
      mappedQuestions: mapped.map(q => q.id),
      gaps,
      recommendations
    });
  }
  
  return results;
}

/**
 * Find questions matching an outcome
 */
function findMatchingQuestions(questions: any[], outcome: LearningOutcome): any[] {
  return questions.filter(q => {
    // Match by topic
    const topicMatch = outcome.topics.some(topic => 
      q.topic.toLowerCase().includes(topic.toLowerCase())
    );
    
    // Match by Bloom level
    const bloomMatch = q.bloom_level === outcome.bloomLevel;
    
    // Match by knowledge dimension if available
    const knowledgeMatch = !outcome.knowledgeDimension || 
      q.knowledge_dimension === outcome.knowledgeDimension;
    
    return topicMatch && bloomMatch && knowledgeMatch;
  });
}

/**
 * Calculate alignment score for an outcome
 */
function calculateAlignmentScore(questions: any[], outcome: LearningOutcome): number {
  if (questions.length === 0) return 0;
  
  // Base score from question count (at least 2 questions per outcome)
  const countScore = Math.min(questions.length / 2, 1) * 0.4;
  
  // Bloom level match score
  const bloomMatches = questions.filter(q => q.bloom_level === outcome.bloomLevel).length;
  const bloomScore = (bloomMatches / questions.length) * 0.3;
  
  // Topic coverage score
  const topicsCovered = new Set(questions.map(q => q.topic)).size;
  const topicScore = Math.min(topicsCovered / outcome.topics.length, 1) * 0.3;
  
  return countScore + bloomScore + topicScore;
}

/**
 * Identify gaps in alignment
 */
function identifyGaps(questions: any[], outcome: LearningOutcome): string[] {
  const gaps: string[] = [];
  
  if (questions.length === 0) {
    gaps.push(`No questions mapped to outcome ${outcome.code}`);
    return gaps;
  }
  
  if (questions.length < 2) {
    gaps.push(`Only ${questions.length} question(s) for outcome ${outcome.code}. Recommend at least 2.`);
  }
  
  // Check topic coverage
  const coveredTopics = new Set(questions.map(q => q.topic));
  const uncoveredTopics = outcome.topics.filter(t => !coveredTopics.has(t));
  
  if (uncoveredTopics.length > 0) {
    gaps.push(`Topics not covered: ${uncoveredTopics.join(', ')}`);
  }
  
  // Check Bloom level alignment
  const bloomMismatch = questions.filter(q => q.bloom_level !== outcome.bloomLevel).length;
  if (bloomMismatch > questions.length * 0.5) {
    gaps.push(`More than half of questions don't match target Bloom level (${outcome.bloomLevel})`);
  }
  
  return gaps;
}

/**
 * Generate recommendations for improving alignment
 */
function generateRecommendations(
  questions: any[],
  outcome: LearningOutcome,
  gaps: string[]
): string[] {
  const recommendations: string[] = [];
  
  if (questions.length === 0) {
    recommendations.push(`Create questions targeting ${outcome.bloomLevel} level for topics: ${outcome.topics.join(', ')}`);
    return recommendations;
  }
  
  if (questions.length < 2) {
    recommendations.push('Add at least one more question to improve reliability');
  }
  
  if (gaps.some(g => g.includes('Topics not covered'))) {
    const uncoveredTopics = gaps
      .find(g => g.includes('Topics not covered'))
      ?.split(': ')[1];
    recommendations.push(`Create questions for uncovered topics: ${uncoveredTopics}`);
  }
  
  if (gaps.some(g => g.includes("don't match target Bloom level"))) {
    recommendations.push(`Review questions and adjust to ${outcome.bloomLevel} level`);
  }
  
  return recommendations;
}

/**
 * Generate comprehensive alignment report
 */
export function generateAlignmentReport(results: AlignmentResult[]): {
  overallScore: number;
  wellAligned: number;
  needsImprovement: number;
  critical: number;
  summary: string;
} {
  const totalOutcomes = results.length;
  const wellAligned = results.filter(r => r.alignmentScore >= 0.7).length;
  const needsImprovement = results.filter(r => r.alignmentScore >= 0.4 && r.alignmentScore < 0.7).length;
  const critical = results.filter(r => r.alignmentScore < 0.4).length;
  
  const overallScore = results.reduce((sum, r) => sum + r.alignmentScore, 0) / totalOutcomes;
  
  let summary = `Overall alignment: ${(overallScore * 100).toFixed(1)}%. `;
  summary += `${wellAligned} outcomes well-aligned, `;
  summary += `${needsImprovement} need improvement, `;
  summary += `${critical} critical.`;
  
  return {
    overallScore,
    wellAligned,
    needsImprovement,
    critical,
    summary
  };
}
