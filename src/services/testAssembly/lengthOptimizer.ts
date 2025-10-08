/**
 * Test Length Optimization Service
 * Recommends optimal test length based on learning hours and coverage goals
 */

export interface LengthOptimizerConfig {
  learningHours: number;
  targetCoverage: number; // 0-1 (percentage of topics to cover)
  availableQuestions: number;
  bloomLevels: string[];
  topics: string[];
}

export interface OptimalLength {
  recommendedLength: number;
  reasoning: string[];
  coverageEstimate: number;
  timeEstimate: number; // minutes
  alternativeOptions: {
    length: number;
    coverage: number;
    time: number;
    pros: string[];
    cons: string[];
  }[];
}

/**
 * Calculate optimal test length
 */
export function optimizeTestLength(config: LengthOptimizerConfig): OptimalLength {
  const {
    learningHours,
    targetCoverage,
    availableQuestions,
    bloomLevels,
    topics
  } = config;
  
  const reasoning: string[] = [];
  
  // Rule 1: Questions per learning hour (standard: 1 question per 30-45 minutes)
  const baseLength = Math.ceil(learningHours * 1.5);
  reasoning.push(`Based on ${learningHours} learning hours, base recommendation: ${baseLength} questions`);
  
  // Rule 2: Topic coverage requirement
  const minQuestionsForCoverage = Math.ceil(topics.length * 2); // At least 2 questions per topic
  reasoning.push(`To cover ${topics.length} topics adequately: minimum ${minQuestionsForCoverage} questions`);
  
  // Rule 3: Bloom level distribution
  const bloomMultiplier = bloomLevels.length >= 4 ? 1.2 : 1.0;
  const bloomAdjusted = Math.ceil(baseLength * bloomMultiplier);
  
  if (bloomLevels.length >= 4) {
    reasoning.push(`Diverse Bloom levels require +20% questions: ${bloomAdjusted} questions`);
  }
  
  // Rule 4: Target coverage adjustment
  const coverageAdjusted = Math.ceil(baseLength * targetCoverage * 1.3);
  reasoning.push(`Target coverage ${(targetCoverage * 100).toFixed(0)}% suggests: ${coverageAdjusted} questions`);
  
  // Calculate final recommendation
  const recommendedLength = Math.max(
    Math.min(baseLength, bloomAdjusted, coverageAdjusted),
    minQuestionsForCoverage
  );
  
  // Constrain to available questions
  const finalLength = Math.min(recommendedLength, availableQuestions);
  
  if (finalLength < recommendedLength) {
    reasoning.push(`⚠️ Limited to ${finalLength} questions due to available pool`);
  }
  
  // Estimate coverage and time
  const coverageEstimate = Math.min(
    (finalLength / (topics.length * 2)) * 0.8,
    1.0
  );
  const timeEstimate = Math.ceil(finalLength * 2); // 2 minutes per question average
  
  // Generate alternative options
  const alternativeOptions = generateAlternatives(config, finalLength);
  
  return {
    recommendedLength: finalLength,
    reasoning,
    coverageEstimate,
    timeEstimate,
    alternativeOptions
  };
}

/**
 * Generate alternative test length options
 */
function generateAlternatives(
  config: LengthOptimizerConfig,
  recommended: number
): OptimalLength['alternativeOptions'] {
  const alternatives: OptimalLength['alternativeOptions'] = [];
  
  // Shorter option (75% of recommended)
  const shorter = Math.max(Math.floor(recommended * 0.75), 10);
  alternatives.push({
    length: shorter,
    coverage: Math.min((shorter / (config.topics.length * 2)) * 0.8, 1.0),
    time: shorter * 2,
    pros: ['Faster completion', 'Lower student fatigue', 'Easier to grade'],
    cons: ['Lower topic coverage', 'Less comprehensive assessment']
  });
  
  // Longer option (125% of recommended)
  const longer = Math.min(Math.ceil(recommended * 1.25), config.availableQuestions);
  alternatives.push({
    length: longer,
    coverage: Math.min((longer / (config.topics.length * 2)) * 0.9, 1.0),
    time: longer * 2,
    pros: ['Comprehensive coverage', 'Better reliability', 'More data points'],
    cons: ['Longer test time', 'Higher student fatigue', 'More grading work']
  });
  
  // Balanced option (exactly what was recommended)
  alternatives.push({
    length: recommended,
    coverage: Math.min((recommended / (config.topics.length * 2)) * 0.85, 1.0),
    time: recommended * 2,
    pros: ['Optimal balance', 'Good coverage', 'Reasonable duration'],
    cons: ['May need adjustment based on class level']
  });
  
  return alternatives;
}

/**
 * Calculate marginal coverage gain for adding more questions
 */
export function calculateMarginalGain(
  currentLength: number,
  topics: string[],
  existingQuestions: any[]
): { gain: number; recommendation: string } {
  const topicsCovered = new Set(existingQuestions.map(q => q.topic)).size;
  const remainingTopics = topics.length - topicsCovered;
  
  if (remainingTopics === 0) {
    return {
      gain: 0.05, // Diminishing returns
      recommendation: 'All topics covered. Additional questions provide minimal coverage gain.'
    };
  }
  
  const gain = remainingTopics / topics.length;
  return {
    gain,
    recommendation: gain > 0.2
      ? `Adding questions could cover ${remainingTopics} more topics (+${(gain * 100).toFixed(0)}% coverage)`
      : 'Most topics covered. Adding more questions has diminishing returns.'
  };
}
