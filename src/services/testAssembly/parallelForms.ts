/**
 * Parallel Forms Generation Service
 * Creates equivalent test versions with balanced difficulty
 */

import seedrandom from 'seedrandom';

export interface ParallelFormConfig {
  numForms: number;
  questions: any[];
  preventIdenticalPositions?: boolean;
  seed?: string;
}

export interface GeneratedForm {
  formId: string;
  versionLabel: string;
  questionOrder: string[];
  shuffleSeed: string;
  metadata: {
    difficulty: number;
    bloomDistribution: Record<string, number>;
    topicCoverage: string[];
  };
}

/**
 * Generate N parallel forms from a question pool
 */
export function generateParallelForms(config: ParallelFormConfig): GeneratedForm[] {
  const { numForms, questions, preventIdenticalPositions = true, seed } = config;
  const forms: GeneratedForm[] = [];
  const baseSeed = seed || Date.now().toString();
  
  for (let i = 0; i < numForms; i++) {
    const formSeed = `${baseSeed}-form-${i}`;
    const rng = seedrandom(formSeed);
    
    // Shuffle questions using seeded RNG
    const shuffled = fisherYatesShuffle([...questions], rng);
    
    // If preventing identical positions, adjust order
    if (preventIdenticalPositions && i > 0) {
      adjustForDiversity(shuffled, forms[i - 1].questionOrder, rng);
    }
    
    const questionOrder = shuffled.map(q => q.id);
    const versionLabel = String.fromCharCode(65 + i); // A, B, C, ...
    
    forms.push({
      formId: `form-${i}`,
      versionLabel,
      questionOrder,
      shuffleSeed: formSeed,
      metadata: {
        difficulty: calculateAverageDifficulty(shuffled),
        bloomDistribution: calculateBloomDistribution(shuffled),
        topicCoverage: getTopicCoverage(shuffled)
      }
    });
  }
  
  return forms;
}

/**
 * Fisher-Yates shuffle with seeded RNG
 */
function fisherYatesShuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * Adjust question order to prevent identical positions across forms
 */
function adjustForDiversity(
  current: any[],
  previousOrder: string[],
  rng: () => number
): void {
  const maxIdenticalPositions = Math.floor(current.length * 0.2); // Allow max 20% overlap
  let identicalCount = 0;
  
  for (let i = 0; i < current.length; i++) {
    if (current[i].id === previousOrder[i]) {
      identicalCount++;
      
      // Swap with a random different position
      if (identicalCount > maxIdenticalPositions) {
        const swapIndex = Math.floor(rng() * current.length);
        if (swapIndex !== i) {
          [current[i], current[swapIndex]] = [current[swapIndex], current[i]];
          identicalCount--;
        }
      }
    }
  }
}

/**
 * Calculate average difficulty score
 */
function calculateAverageDifficulty(questions: any[]): number {
  const difficultyMap = { easy: 1, medium: 2, hard: 3 };
  const sum = questions.reduce((acc, q) => {
    return acc + (difficultyMap[q.difficulty as keyof typeof difficultyMap] || 2);
  }, 0);
  return sum / questions.length;
}

/**
 * Calculate Bloom's taxonomy distribution
 */
function calculateBloomDistribution(questions: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  const total = questions.length;
  
  questions.forEach(q => {
    const level = q.bloom_level;
    distribution[level] = (distribution[level] || 0) + 1;
  });
  
  // Convert to percentages
  for (const key in distribution) {
    distribution[key] = (distribution[key] / total) * 100;
  }
  
  return distribution;
}

/**
 * Get unique topics covered
 */
function getTopicCoverage(questions: any[]): string[] {
  const topics = new Set<string>();
  questions.forEach(q => topics.add(q.topic));
  return Array.from(topics);
}

/**
 * Validate that parallel forms are truly equivalent
 */
export function validateEquivalence(forms: GeneratedForm[]): {
  areEquivalent: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (forms.length < 2) {
    return { areEquivalent: true, issues };
  }
  
  const baseDifficulty = forms[0].metadata.difficulty;
  const baseTopicCount = forms[0].metadata.topicCoverage.length;
  
  for (let i = 1; i < forms.length; i++) {
    const form = forms[i];
    
    // Check difficulty variance
    const difficultyDiff = Math.abs(form.metadata.difficulty - baseDifficulty);
    if (difficultyDiff > 0.3) {
      issues.push(`Form ${form.versionLabel} difficulty varies significantly (${difficultyDiff.toFixed(2)})`);
    }
    
    // Check topic coverage
    if (form.metadata.topicCoverage.length !== baseTopicCount) {
      issues.push(`Form ${form.versionLabel} has different topic coverage`);
    }
  }
  
  return {
    areEquivalent: issues.length === 0,
    issues
  };
}
