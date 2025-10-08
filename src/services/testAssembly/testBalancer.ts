/**
 * Test Balancing Service
 * Implements heuristics to balance tests by topic, difficulty, and Bloom's taxonomy
 */

export interface BalanceConfig {
  targetDistribution: Record<string, number>;
  tolerance: number; // Acceptable deviation percentage
}

export interface Question {
  id: string;
  topic: string;
  difficulty: string;
  bloom_level: string;
  [key: string]: any;
}

/**
 * Balance questions by topic distribution
 */
export function balanceByTopic(
  questions: Question[],
  targetDistribution: Record<string, number>
): Question[] {
  const balanced: Question[] = [];
  const questionsByTopic = groupByTopic(questions);
  
  // Calculate target counts per topic
  const totalQuestions = questions.length;
  const targetCounts: Record<string, number> = {};
  
  for (const [topic, percentage] of Object.entries(targetDistribution)) {
    targetCounts[topic] = Math.round((percentage / 100) * totalQuestions);
  }
  
  // Select questions to match target distribution
  for (const [topic, targetCount] of Object.entries(targetCounts)) {
    const topicQuestions = questionsByTopic[topic] || [];
    const selected = topicQuestions.slice(0, Math.min(targetCount, topicQuestions.length));
    balanced.push(...selected);
  }
  
  return balanced;
}

/**
 * Balance questions by difficulty
 */
export function balanceByDifficulty(
  questions: Question[],
  targetDistribution: { easy?: number; medium?: number; hard?: number }
): Question[] {
  const balanced: Question[] = [];
  const questionsByDifficulty = {
    easy: questions.filter(q => q.difficulty === 'easy'),
    medium: questions.filter(q => q.difficulty === 'medium'),
    hard: questions.filter(q => q.difficulty === 'hard')
  };
  
  const totalQuestions = questions.length;
  
  for (const [difficulty, percentage] of Object.entries(targetDistribution)) {
    if (percentage && percentage > 0) {
      const targetCount = Math.round((percentage / 100) * totalQuestions);
      const available = questionsByDifficulty[difficulty as keyof typeof questionsByDifficulty] || [];
      balanced.push(...available.slice(0, Math.min(targetCount, available.length)));
    }
  }
  
  return balanced;
}

/**
 * Balance questions by Bloom's taxonomy level
 */
export function balanceByBloom(
  questions: Question[],
  targetDistribution: Record<string, number>
): Question[] {
  const balanced: Question[] = [];
  const questionsByBloom: Record<string, Question[]> = {};
  
  // Group by Bloom level
  questions.forEach(q => {
    if (!questionsByBloom[q.bloom_level]) {
      questionsByBloom[q.bloom_level] = [];
    }
    questionsByBloom[q.bloom_level].push(q);
  });
  
  const totalQuestions = questions.length;
  
  for (const [bloomLevel, percentage] of Object.entries(targetDistribution)) {
    if (percentage > 0) {
      const targetCount = Math.round((percentage / 100) * totalQuestions);
      const available = questionsByBloom[bloomLevel] || [];
      balanced.push(...available.slice(0, Math.min(targetCount, available.length)));
    }
  }
  
  return balanced;
}

/**
 * Apply comprehensive balancing using multiple criteria
 */
export function applyComprehensiveBalance(
  questions: Question[],
  config: {
    topicDistribution?: Record<string, number>;
    difficultyDistribution?: { easy?: number; medium?: number; hard?: number };
    bloomDistribution?: Record<string, number>;
    priority: 'topic' | 'difficulty' | 'bloom';
  }
): Question[] {
  let result = [...questions];
  
  // Apply balancing in order of priority
  switch (config.priority) {
    case 'topic':
      if (config.topicDistribution) {
        result = balanceByTopic(result, config.topicDistribution);
      }
      if (config.bloomDistribution) {
        result = balanceByBloom(result, config.bloomDistribution);
      }
      break;
      
    case 'difficulty':
      if (config.difficultyDistribution) {
        result = balanceByDifficulty(result, config.difficultyDistribution);
      }
      break;
      
    case 'bloom':
      if (config.bloomDistribution) {
        result = balanceByBloom(result, config.bloomDistribution);
      }
      break;
  }
  
  return result;
}

/**
 * Validate if a set of questions meets balance requirements
 */
export function validateBalance(
  questions: Question[],
  targetDistribution: Record<string, number>,
  tolerance: number = 0.1
): { isBalanced: boolean; deviations: Record<string, number> } {
  const actualDistribution = calculateActualDistribution(questions);
  const deviations: Record<string, number> = {};
  let isBalanced = true;
  
  for (const [key, targetPercentage] of Object.entries(targetDistribution)) {
    const actualPercentage = actualDistribution[key] || 0;
    const deviation = Math.abs(targetPercentage - actualPercentage);
    deviations[key] = deviation;
    
    if (deviation > tolerance * targetPercentage) {
      isBalanced = false;
    }
  }
  
  return { isBalanced, deviations };
}

// Helper functions

function groupByTopic(questions: Question[]): Record<string, Question[]> {
  const groups: Record<string, Question[]> = {};
  questions.forEach(q => {
    if (!groups[q.topic]) {
      groups[q.topic] = [];
    }
    groups[q.topic].push(q);
  });
  return groups;
}

function calculateActualDistribution(questions: Question[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  const total = questions.length;
  
  questions.forEach(q => {
    distribution[q.topic] = (distribution[q.topic] || 0) + 1;
  });
  
  for (const key in distribution) {
    distribution[key] = (distribution[key] / total) * 100;
  }
  
  return distribution;
}
