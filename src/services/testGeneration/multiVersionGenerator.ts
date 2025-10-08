import seedrandom from 'seedrandom';

export interface QuestionItem {
  id: string;
  question_text: string;
  question_type: string;
  choices?: Record<string, string>;
  correct_answer?: string;
  bloom_level: string;
  difficulty: string;
  topic: string;
  points?: number;
}

export interface TestVersion {
  version_label: string;
  version_number: number;
  questions: QuestionItem[];
  answer_key: Record<string, string>;
  shuffle_seed: string;
  question_order: string[];
}

export interface VersionGenerationConfig {
  numberOfVersions: number;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  preventAdjacentDuplicates: boolean;
  balanceDistributions: boolean;
}

/**
 * Fisher-Yates shuffle with deterministic seed
 */
export function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  const rng = seedrandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Shuffle MCQ choices and track correct answer position
 */
export function shuffleChoicesWithSeed(
  question: QuestionItem,
  seed: string
): { question: QuestionItem; newCorrectAnswer: string } {
  if (!question.choices || question.question_type !== 'multiple_choice') {
    return { question, newCorrectAnswer: question.correct_answer || '' };
  }

  const choiceEntries = Object.entries(question.choices);
  const shuffled = shuffleWithSeed(choiceEntries, seed);
  
  const newChoices: Record<string, string> = {};
  const choiceKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  let newCorrectAnswer = question.correct_answer || 'A';
  const originalCorrectValue = question.choices[question.correct_answer || 'A'];
  
  shuffled.forEach(([, value], index) => {
    if (index < choiceKeys.length) {
      const newKey = choiceKeys[index];
      newChoices[newKey] = value as string;
      
      if (value === originalCorrectValue) {
        newCorrectAnswer = newKey;
      }
    }
  });

  return {
    question: {
      ...question,
      choices: newChoices,
      correct_answer: newCorrectAnswer
    },
    newCorrectAnswer
  };
}

/**
 * Check if versions maintain balanced distributions
 */
export function validateVersionBalance(versions: TestVersion[]): {
  isBalanced: boolean;
  warnings: string[];
  metrics: {
    bloomDistribution: Record<string, number[]>;
    difficultyDistribution: Record<string, number[]>;
    topicDistribution: Record<string, number[]>;
  };
} {
  const warnings: string[] = [];
  const metrics = {
    bloomDistribution: {} as Record<string, number[]>,
    difficultyDistribution: {} as Record<string, number[]>,
    topicDistribution: {} as Record<string, number[]>
  };

  // Collect distributions for each version
  versions.forEach((version, vIndex) => {
    const bloomCounts: Record<string, number> = {};
    const difficultyCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};

    version.questions.forEach(q => {
      bloomCounts[q.bloom_level] = (bloomCounts[q.bloom_level] || 0) + 1;
      difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;
      topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
    });

    // Store in metrics
    Object.keys(bloomCounts).forEach(key => {
      if (!metrics.bloomDistribution[key]) metrics.bloomDistribution[key] = [];
      metrics.bloomDistribution[key][vIndex] = bloomCounts[key];
    });

    Object.keys(difficultyCounts).forEach(key => {
      if (!metrics.difficultyDistribution[key]) metrics.difficultyDistribution[key] = [];
      metrics.difficultyDistribution[key][vIndex] = difficultyCounts[key];
    });

    Object.keys(topicCounts).forEach(key => {
      if (!metrics.topicDistribution[key]) metrics.topicDistribution[key] = [];
      metrics.topicDistribution[key][vIndex] = topicCounts[key];
    });
  });

  // Check for imbalances
  const checkBalance = (distribution: Record<string, number[]>, name: string) => {
    Object.entries(distribution).forEach(([key, counts]) => {
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      const diff = max - min;
      
      if (diff > 2) {
        warnings.push(`${name} "${key}" varies by ${diff} questions across versions`);
      }
    });
  };

  checkBalance(metrics.bloomDistribution, 'Bloom level');
  checkBalance(metrics.difficultyDistribution, 'Difficulty');
  checkBalance(metrics.topicDistribution, 'Topic');

  return {
    isBalanced: warnings.length === 0,
    warnings,
    metrics
  };
}

/**
 * Generate multiple test versions with deterministic shuffling
 */
export async function generateMultipleVersions(
  questions: QuestionItem[],
  config: VersionGenerationConfig
): Promise<TestVersion[]> {
  const versions: TestVersion[] = [];
  const versionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  
  for (let i = 0; i < config.numberOfVersions; i++) {
    const versionSeed = `version-${i}-${Date.now()}`;
    const versionLabel = versionLabels[i] || `V${i + 1}`;
    
    let versionQuestions = [...questions];
    
    // Shuffle questions if enabled
    if (config.shuffleQuestions) {
      versionQuestions = shuffleWithSeed(versionQuestions, `${versionSeed}-questions`);
    }
    
    // Shuffle choices if enabled
    if (config.shuffleChoices) {
      versionQuestions = versionQuestions.map((q, qIndex) => {
        const { question, newCorrectAnswer } = shuffleChoicesWithSeed(
          q,
          `${versionSeed}-choices-${qIndex}`
        );
        return question;
      });
    }
    
    // Build answer key
    const answerKey: Record<string, string> = {};
    const questionOrder: string[] = [];
    
    versionQuestions.forEach((q, index) => {
      const questionNum = (index + 1).toString();
      answerKey[questionNum] = q.correct_answer || '';
      questionOrder.push(q.id);
    });
    
    versions.push({
      version_label: versionLabel,
      version_number: i + 1,
      questions: versionQuestions,
      answer_key: answerKey,
      shuffle_seed: versionSeed,
      question_order: questionOrder
    });
  }
  
  // Validate balance if required
  if (config.balanceDistributions) {
    const { isBalanced, warnings } = validateVersionBalance(versions);
    if (!isBalanced) {
      console.warn('Version balance warnings:', warnings);
    }
  }
  
  return versions;
}
