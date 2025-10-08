/**
 * Constraint-Based Test Assembly Engine
 * Implements optimization algorithms for test construction
 */

export interface TestConstraint {
  type: 'topic_coverage' | 'difficulty_balance' | 'bloom_distribution' | 'time_limit' | 'point_distribution' | 'standards_alignment';
  config: any;
  priority: number;
  isRequired: boolean;
}

export interface Question {
  id: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
  knowledge_dimension?: string;
  estimated_time?: number;
  points?: number;
  standards?: string[];
}

export interface AssemblyResult {
  selectedQuestions: Question[];
  score: number;
  constraintsSatisfied: Record<string, boolean>;
  metrics: {
    topicCoverage: Record<string, number>;
    difficultyDistribution: Record<string, number>;
    bloomDistribution: Record<string, number>;
    totalTime: number;
    totalPoints: number;
  };
}

/**
 * Constraint-based test assembly using greedy approximation
 */
export class ConstraintSolver {
  /**
   * Assemble a test that satisfies the given constraints
   */
  static assembleTest(
    questionPool: Question[],
    constraints: TestConstraint[],
    targetLength: number
  ): AssemblyResult {
    // Sort constraints by priority
    const sortedConstraints = [...constraints].sort((a, b) => b.priority - a.priority);
    
    // Initialize selected questions
    const selected: Question[] = [];
    const remaining = [...questionPool];
    
    // Greedy selection with constraint satisfaction
    let finalScore = 0;
    while (selected.length < targetLength && remaining.length > 0) {
      let bestQuestion: Question | null = null;
      let bestScore = -Infinity;
      
      for (const question of remaining) {
        const tempSelected = [...selected, question];
        const score = this.evaluateSelection(tempSelected, sortedConstraints, targetLength);
        
        if (score > bestScore) {
          bestScore = score;
          bestQuestion = question;
        }
      }
      
      if (bestQuestion) {
        selected.push(bestQuestion);
        const index = remaining.indexOf(bestQuestion);
        remaining.splice(index, 1);
        finalScore = bestScore;
      } else {
        break;
      }
    }
    
    // Calculate final metrics
    const metrics = this.calculateMetrics(selected);
    const constraintsSatisfied = this.checkConstraints(selected, sortedConstraints, targetLength);
    
    return {
      selectedQuestions: selected,
      score: finalScore,
      constraintsSatisfied,
      metrics
    };
  }
  
  /**
   * Generate parallel forms (equivalent tests)
   */
  static generateParallelForms(
    questionPool: Question[],
    constraints: TestConstraint[],
    targetLength: number,
    numberOfForms: number
  ): AssemblyResult[] {
    const forms: AssemblyResult[] = [];
    const usedQuestions = new Set<string>();
    
    for (let i = 0; i < numberOfForms; i++) {
      // Filter out already used questions
      const availablePool = questionPool.filter(q => !usedQuestions.has(q.id));
      
      if (availablePool.length < targetLength) {
        console.warn(`Not enough questions for form ${i + 1}`);
        break;
      }
      
      // Assemble the form
      const form = this.assembleTest(availablePool, constraints, targetLength);
      
      // Mark questions as used
      form.selectedQuestions.forEach(q => usedQuestions.add(q.id));
      
      forms.push(form);
    }
    
    // Calculate equivalence scores
    this.calculateEquivalenceScores(forms);
    
    return forms;
  }
  
  /**
   * Optimize test length based on content coverage and time constraints
   */
  static optimizeTestLength(
    questionPool: Question[],
    constraints: TestConstraint[],
    minLength: number = 10,
    maxLength: number = 100,
    targetReliability: number = 0.8
  ): { optimalLength: number; reasoning: string[] } {
    const reasoning: string[] = [];
    let optimalLength = Math.floor((minLength + maxLength) / 2);
    
    // Check time constraint
    const timeConstraint = constraints.find(c => c.type === 'time_limit');
    if (timeConstraint) {
      const availableTime = timeConstraint.config.maxTime || 60;
      const avgTimePerQuestion = 2; // minutes
      const maxByTime = Math.floor(availableTime / avgTimePerQuestion);
      
      if (maxByTime < optimalLength) {
        optimalLength = maxByTime;
        reasoning.push(`Adjusted to ${maxByTime} questions based on ${availableTime} minute time limit`);
      }
    }
    
    // Check topic coverage
    const topicConstraint = constraints.find(c => c.type === 'topic_coverage');
    if (topicConstraint) {
      const topics = Object.keys(topicConstraint.config.distribution || {});
      const minQuestionsPerTopic = 3;
      const minForTopics = topics.length * minQuestionsPerTopic;
      
      if (optimalLength < minForTopics) {
        optimalLength = minForTopics;
        reasoning.push(`Increased to ${minForTopics} to cover ${topics.length} topics adequately`);
      }
    }
    
    // Check reliability
    const estimatedReliability = this.estimateReliability(optimalLength);
    if (estimatedReliability < targetReliability) {
      const adjustedLength = Math.ceil(optimalLength * (targetReliability / estimatedReliability));
      reasoning.push(`Adjusted to ${adjustedLength} questions for target reliability of ${targetReliability}`);
      optimalLength = Math.min(adjustedLength, maxLength);
    }
    
    // Ensure within bounds
    optimalLength = Math.max(minLength, Math.min(maxLength, optimalLength));
    reasoning.push(`Final optimal length: ${optimalLength} questions`);
    
    return { optimalLength, reasoning };
  }
  
  /**
   * Balance test content across dimensions
   */
  static balanceContent(
    selectedQuestions: Question[],
    constraints: TestConstraint[]
  ): { isBalanced: boolean; recommendations: string[] } {
    const recommendations: string[] = [];
    
    // Check Bloom's taxonomy distribution
    const bloomDistribution = this.calculateBloomDistribution(selectedQuestions);
    const bloomConstraint = constraints.find(c => c.type === 'bloom_distribution');
    
    if (bloomConstraint) {
      const target = bloomConstraint.config.distribution;
      for (const [level, count] of Object.entries(bloomDistribution)) {
        const targetCount = target[level] || 0;
        const diff = Math.abs(count - targetCount);
        if (diff > 2) {
          recommendations.push(`Bloom level '${level}': Current ${count}, Target ${targetCount}`);
        }
      }
    }
    
    // Check difficulty balance
    const difficultyDist = this.calculateDifficultyDistribution(selectedQuestions);
    const targetEasy = Math.floor(selectedQuestions.length * 0.3);
    const targetAverage = Math.floor(selectedQuestions.length * 0.5);
    const targetDifficult = Math.floor(selectedQuestions.length * 0.2);
    
    if (Math.abs((difficultyDist['Easy'] || 0) - targetEasy) > 2) {
      recommendations.push(`Easy questions: Current ${difficultyDist['Easy'] || 0}, Target ~${targetEasy}`);
    }
    if (Math.abs((difficultyDist['Average'] || 0) - targetAverage) > 2) {
      recommendations.push(`Average questions: Current ${difficultyDist['Average'] || 0}, Target ~${targetAverage}`);
    }
    if (Math.abs((difficultyDist['Difficult'] || 0) - targetDifficult) > 2) {
      recommendations.push(`Difficult questions: Current ${difficultyDist['Difficult'] || 0}, Target ~${targetDifficult}`);
    }
    
    return {
      isBalanced: recommendations.length === 0,
      recommendations
    };
  }
  
  // Private helper methods
  
  private static evaluateSelection(
    selected: Question[],
    constraints: TestConstraint[],
    targetLength: number
  ): number {
    let score = 0;
    
    for (const constraint of constraints) {
      const satisfaction = this.evaluateConstraint(selected, constraint, targetLength);
      score += satisfaction * constraint.priority;
    }
    
    return score;
  }
  
  private static evaluateConstraint(
    selected: Question[],
    constraint: TestConstraint,
    targetLength: number
  ): number {
    switch (constraint.type) {
      case 'topic_coverage':
        return this.evaluateTopicCoverage(selected, constraint.config);
      
      case 'difficulty_balance':
        return this.evaluateDifficultyBalance(selected, constraint.config);
      
      case 'bloom_distribution':
        return this.evaluateBloomDistribution(selected, constraint.config);
      
      case 'time_limit':
        return this.evaluateTimeLimit(selected, constraint.config);
      
      case 'point_distribution':
        return this.evaluatePointDistribution(selected, constraint.config);
      
      default:
        return 0;
    }
  }
  
  private static evaluateTopicCoverage(selected: Question[], config: any): number {
    const topicCounts: Record<string, number> = {};
    selected.forEach(q => {
      topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
    });
    
    const targetDist = config.distribution || {};
    let score = 0;
    
    for (const [topic, target] of Object.entries(targetDist)) {
      const actual = topicCounts[topic] || 0;
      const diff = Math.abs(actual - (target as number));
      score += Math.max(0, 1 - diff / (target as number));
    }
    
    return score / Object.keys(targetDist).length;
  }
  
  private static evaluateDifficultyBalance(selected: Question[], config: any): number {
    const dist = this.calculateDifficultyDistribution(selected);
    const total = selected.length;
    
    const targetEasy = config.easyPercent || 0.3;
    const targetAverage = config.averagePercent || 0.5;
    const targetDifficult = config.difficultPercent || 0.2;
    
    const actualEasy = (dist['Easy'] || 0) / total;
    const actualAverage = (dist['Average'] || 0) / total;
    const actualDifficult = (dist['Difficult'] || 0) / total;
    
    const easyDiff = Math.abs(actualEasy - targetEasy);
    const avgDiff = Math.abs(actualAverage - targetAverage);
    const diffDiff = Math.abs(actualDifficult - targetDifficult);
    
    return 1 - (easyDiff + avgDiff + diffDiff) / 3;
  }
  
  private static evaluateBloomDistribution(selected: Question[], config: any): number {
    const dist = this.calculateBloomDistribution(selected);
    const targetDist = config.distribution || {};
    
    let totalDiff = 0;
    let count = 0;
    
    for (const [level, target] of Object.entries(targetDist)) {
      const actual = dist[level] || 0;
      totalDiff += Math.abs(actual - (target as number));
      count++;
    }
    
    return count > 0 ? Math.max(0, 1 - totalDiff / (selected.length * count)) : 0;
  }
  
  private static evaluateTimeLimit(selected: Question[], config: any): number {
    const totalTime = selected.reduce((sum, q) => sum + (q.estimated_time || 2), 0);
    const maxTime = config.maxTime || 60;
    
    return totalTime <= maxTime ? 1 : maxTime / totalTime;
  }
  
  private static evaluatePointDistribution(selected: Question[], config: any): number {
    const totalPoints = selected.reduce((sum, q) => sum + (q.points || 1), 0);
    const targetPoints = config.targetPoints || selected.length;
    
    return 1 - Math.abs(totalPoints - targetPoints) / targetPoints;
  }
  
  private static checkConstraints(
    selected: Question[],
    constraints: TestConstraint[],
    targetLength: number
  ): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    
    for (const constraint of constraints) {
      const satisfaction = this.evaluateConstraint(selected, constraint, targetLength);
      results[constraint.type] = satisfaction >= 0.8; // 80% threshold
    }
    
    return results;
  }
  
  private static calculateMetrics(selected: Question[]) {
    return {
      topicCoverage: this.calculateTopicCoverage(selected),
      difficultyDistribution: this.calculateDifficultyDistribution(selected),
      bloomDistribution: this.calculateBloomDistribution(selected),
      totalTime: selected.reduce((sum, q) => sum + (q.estimated_time || 2), 0),
      totalPoints: selected.reduce((sum, q) => sum + (q.points || 1), 0)
    };
  }
  
  private static calculateTopicCoverage(questions: Question[]): Record<string, number> {
    const coverage: Record<string, number> = {};
    questions.forEach(q => {
      coverage[q.topic] = (coverage[q.topic] || 0) + 1;
    });
    return coverage;
  }
  
  private static calculateDifficultyDistribution(questions: Question[]): Record<string, number> {
    const dist: Record<string, number> = {};
    questions.forEach(q => {
      dist[q.difficulty] = (dist[q.difficulty] || 0) + 1;
    });
    return dist;
  }
  
  private static calculateBloomDistribution(questions: Question[]): Record<string, number> {
    const dist: Record<string, number> = {};
    questions.forEach(q => {
      dist[q.bloom_level] = (dist[q.bloom_level] || 0) + 1;
    });
    return dist;
  }
  
  private static calculateEquivalenceScores(forms: AssemblyResult[]): void {
    // Calculate statistical equivalence between forms
    for (let i = 0; i < forms.length; i++) {
      for (let j = i + 1; j < forms.length; j++) {
        const score = this.compareFormsEquivalence(forms[i], forms[j]);
        // Store equivalence score (could be extended to persist to database)
        console.log(`Forms ${i + 1} and ${j + 1} equivalence: ${score.toFixed(2)}`);
      }
    }
  }
  
  private static compareFormsEquivalence(form1: AssemblyResult, form2: AssemblyResult): number {
    // Compare difficulty distributions
    const diff1 = form1.metrics.difficultyDistribution;
    const diff2 = form2.metrics.difficultyDistribution;
    
    const diffScore = this.compareDistributions(diff1, diff2);
    
    // Compare Bloom distributions
    const bloom1 = form1.metrics.bloomDistribution;
    const bloom2 = form2.metrics.bloomDistribution;
    
    const bloomScore = this.compareDistributions(bloom1, bloom2);
    
    // Compare total metrics
    const timeRatio = Math.min(form1.metrics.totalTime, form2.metrics.totalTime) / 
                      Math.max(form1.metrics.totalTime, form2.metrics.totalTime);
    
    return (diffScore + bloomScore + timeRatio) / 3;
  }
  
  private static compareDistributions(dist1: Record<string, number>, dist2: Record<string, number>): number {
    const keys = new Set([...Object.keys(dist1), ...Object.keys(dist2)]);
    let totalDiff = 0;
    
    keys.forEach(key => {
      const val1 = dist1[key] || 0;
      const val2 = dist2[key] || 0;
      totalDiff += Math.abs(val1 - val2);
    });
    
    const maxPossibleDiff = Math.max(
      Object.values(dist1).reduce((a, b) => a + b, 0),
      Object.values(dist2).reduce((a, b) => a + b, 0)
    );
    
    return 1 - (totalDiff / (maxPossibleDiff * 2));
  }
  
  private static estimateReliability(testLength: number): number {
    // Simplified Spearman-Brown prediction formula
    // Assumes base reliability of 0.7 for 20 questions
    const baseLength = 20;
    const baseReliability = 0.7;
    
    const ratio = testLength / baseLength;
    return (ratio * baseReliability) / (1 + (ratio - 1) * baseReliability);
  }
}
