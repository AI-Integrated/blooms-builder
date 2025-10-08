/**
 * Test Assembly Strategies
 * Different strategies for assembling tests
 */

import seedrandom from 'seedrandom';

export type AssemblyStrategy = 'random' | 'balanced' | 'constraintBased' | 'topicProportional';

export interface StrategyConfig {
  strategy: AssemblyStrategy;
  questionPool: any[];
  targetCount: number;
  seed?: string;
  constraints?: {
    topicDistribution?: Record<string, number>;
    bloomDistribution?: Record<string, number>;
    difficultyDistribution?: { easy?: number; medium?: number; hard?: number };
  };
}

export interface AssemblyResult {
  selectedQuestions: any[];
  strategy: AssemblyStrategy;
  metadata: {
    coverageScore: number;
    balanceScore: number;
    constraintsSatisfied: boolean;
    warnings: string[];
  };
}

/**
 * Apply selected assembly strategy
 */
export function applyStrategy(config: StrategyConfig): AssemblyResult {
  switch (config.strategy) {
    case 'random':
      return randomStrategy(config);
    case 'balanced':
      return balancedStrategy(config);
    case 'constraintBased':
      return constraintBasedStrategy(config);
    case 'topicProportional':
      return topicProportionalStrategy(config);
    default:
      throw new Error(`Unknown strategy: ${config.strategy}`);
  }
}

/**
 * Random selection strategy
 */
function randomStrategy(config: StrategyConfig): AssemblyResult {
  const { questionPool, targetCount, seed } = config;
  const rng = seedrandom(seed || Date.now().toString());
  
  // Shuffle and take first N questions
  const shuffled = [...questionPool].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, Math.min(targetCount, shuffled.length));
  
  return {
    selectedQuestions: selected,
    strategy: 'random',
    metadata: {
      coverageScore: calculateCoverageScore(selected),
      balanceScore: 0.5, // Random doesn't optimize balance
      constraintsSatisfied: false,
      warnings: selected.length < targetCount
        ? ['Not enough questions in pool']
        : []
    }
  };
}

/**
 * Balanced selection strategy
 */
function balancedStrategy(config: StrategyConfig): AssemblyResult {
  const { questionPool, targetCount } = config;
  const selected: any[] = [];
  const warnings: string[] = [];
  
  // Group by topic
  const topicGroups = groupBy(questionPool, 'topic');
  const topics = Object.keys(topicGroups);
  const questionsPerTopic = Math.ceil(targetCount / topics.length);
  
  // Select evenly from each topic
  for (const topic of topics) {
    const topicQuestions = topicGroups[topic];
    
    // Further balance by Bloom level within topic
    const bloomLevels = ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'];
    const questionsPerBloom = Math.ceil(questionsPerTopic / bloomLevels.length);
    
    for (const bloom of bloomLevels) {
      const bloomQuestions = topicQuestions.filter(q => q.bloom_level === bloom);
      const toTake = Math.min(questionsPerBloom, bloomQuestions.length);
      selected.push(...bloomQuestions.slice(0, toTake));
      
      if (selected.length >= targetCount) break;
    }
    
    if (selected.length >= targetCount) break;
  }
  
  // Trim to exact target
  const final = selected.slice(0, targetCount);
  
  if (final.length < targetCount) {
    warnings.push(`Only ${final.length} questions available, target was ${targetCount}`);
  }
  
  return {
    selectedQuestions: final,
    strategy: 'balanced',
    metadata: {
      coverageScore: calculateCoverageScore(final),
      balanceScore: calculateBalanceScore(final),
      constraintsSatisfied: true,
      warnings
    }
  };
}

/**
 * Constraint-based selection strategy
 */
function constraintBasedStrategy(config: StrategyConfig): AssemblyResult {
  const { questionPool, targetCount, constraints } = config;
  const selected: any[] = [];
  const warnings: string[] = [];
  
  if (!constraints) {
    warnings.push('No constraints specified, falling back to balanced strategy');
    return balancedStrategy(config);
  }
  
  // Apply topic distribution constraint
  if (constraints.topicDistribution) {
    for (const [topic, percentage] of Object.entries(constraints.topicDistribution)) {
      const targetForTopic = Math.round((percentage / 100) * targetCount);
      const topicQuestions = questionPool.filter(q => q.topic === topic);
      
      // Apply Bloom distribution within topic if specified
      if (constraints.bloomDistribution) {
        const byBloom = selectByBloomDistribution(
          topicQuestions,
          targetForTopic,
          constraints.bloomDistribution
        );
        selected.push(...byBloom);
      } else {
        selected.push(...topicQuestions.slice(0, targetForTopic));
      }
    }
  }
  
  // Apply difficulty distribution if not already at target
  if (selected.length < targetCount && constraints.difficultyDistribution) {
    const remaining = targetCount - selected.length;
    const selectedIds = new Set(selected.map(q => q.id));
    const remainingPool = questionPool.filter(q => !selectedIds.has(q.id));
    
    const byDifficulty = selectByDifficultyDistribution(
      remainingPool,
      remaining,
      constraints.difficultyDistribution
    );
    selected.push(...byDifficulty);
  }
  
  const final = selected.slice(0, targetCount);
  
  if (final.length < targetCount) {
    warnings.push(`Constraints could only produce ${final.length} questions`);
  }
  
  return {
    selectedQuestions: final,
    strategy: 'constraintBased',
    metadata: {
      coverageScore: calculateCoverageScore(final),
      balanceScore: calculateBalanceScore(final),
      constraintsSatisfied: final.length === targetCount,
      warnings
    }
  };
}

/**
 * Topic proportional strategy
 */
function topicProportionalStrategy(config: StrategyConfig): AssemblyResult {
  const { questionPool, targetCount } = config;
  const selected: any[] = [];
  const warnings: string[] = [];
  
  // Calculate proportions based on available questions
  const topicGroups = groupBy(questionPool, 'topic');
  const totalQuestions = questionPool.length;
  
  for (const [topic, questions] of Object.entries(topicGroups)) {
    const proportion = questions.length / totalQuestions;
    const targetForTopic = Math.round(proportion * targetCount);
    selected.push(...questions.slice(0, targetForTopic));
  }
  
  const final = selected.slice(0, targetCount);
  
  return {
    selectedQuestions: final,
    strategy: 'topicProportional',
    metadata: {
      coverageScore: calculateCoverageScore(final),
      balanceScore: calculateBalanceScore(final),
      constraintsSatisfied: true,
      warnings
    }
  };
}

// Helper functions

function groupBy(array: any[], key: string): Record<string, any[]> {
  return array.reduce((groups, item) => {
    const value = item[key];
    if (!groups[value]) groups[value] = [];
    groups[value].push(item);
    return groups;
  }, {});
}

function calculateCoverageScore(questions: any[]): number {
  const topics = new Set(questions.map(q => q.topic));
  const bloomLevels = new Set(questions.map(q => q.bloom_level));
  
  // Score based on diversity
  return (topics.size * 0.6 + bloomLevels.size * 0.4) / 10;
}

function calculateBalanceScore(questions: any[]): number {
  const topicCounts = new Map<string, number>();
  questions.forEach(q => {
    topicCounts.set(q.topic, (topicCounts.get(q.topic) || 0) + 1);
  });
  
  const counts = Array.from(topicCounts.values());
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
  
  // Lower variance = better balance (normalize to 0-1 range)
  return Math.max(0, 1 - (variance / avg));
}

function selectByBloomDistribution(
  questions: any[],
  targetCount: number,
  distribution: Record<string, number>
): any[] {
  const selected: any[] = [];
  
  for (const [bloomLevel, percentage] of Object.entries(distribution)) {
    const targetForBloom = Math.round((percentage / 100) * targetCount);
    const bloomQuestions = questions.filter(q => q.bloom_level === bloomLevel);
    selected.push(...bloomQuestions.slice(0, targetForBloom));
  }
  
  return selected.slice(0, targetCount);
}

function selectByDifficultyDistribution(
  questions: any[],
  targetCount: number,
  distribution: { easy?: number; medium?: number; hard?: number }
): any[] {
  const selected: any[] = [];
  
  for (const [difficulty, percentage] of Object.entries(distribution)) {
    if (percentage && percentage > 0) {
      const targetForDifficulty = Math.round((percentage / 100) * targetCount);
      const diffQuestions = questions.filter(q => q.difficulty === difficulty);
      selected.push(...diffQuestions.slice(0, targetForDifficulty));
    }
  }
  
  return selected.slice(0, targetCount);
}
