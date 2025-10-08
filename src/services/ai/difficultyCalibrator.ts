export interface DifficultyMetrics {
  readabilityScore: number;
  conceptualComplexity: number;
  cognitiveLoad: number;
  prerequisiteKnowledge: number;
  overallDifficulty: number;
}

export interface CalibrationResult {
  originalDifficulty: string;
  calibratedDifficulty: string;
  metrics: DifficultyMetrics;
  recommendations: string[];
  confidence: number;
}

export class DifficultyCalibrator {
  private static instance: DifficultyCalibrator;

  static getInstance(): DifficultyCalibrator {
    if (!this.instance) {
      this.instance = new DifficultyCalibrator();
    }
    return this.instance;
  }

  async calibrateDifficulty(
    questionText: string,
    questionType: string,
    bloomLevel: string,
    topic: string,
    choices?: string[]
  ): Promise<CalibrationResult> {
    const metrics = this.calculateMetrics(questionText, questionType, bloomLevel, choices);
    const calibratedDifficulty = this.determineCalibratedDifficulty(metrics, bloomLevel);
    const recommendations = this.generateRecommendations(metrics, calibratedDifficulty);

    return {
      originalDifficulty: this.inferOriginalDifficulty(bloomLevel),
      calibratedDifficulty,
      metrics,
      recommendations,
      confidence: this.calculateConfidence(metrics)
    };
  }

  private calculateMetrics(
    questionText: string,
    questionType: string,
    bloomLevel: string,
    choices?: string[]
  ): DifficultyMetrics {
    const readabilityScore = this.calculateReadability(questionText);
    const conceptualComplexity = this.assessConceptualComplexity(questionText, bloomLevel);
    const cognitiveLoad = this.calculateCognitiveLoad(questionText, questionType, choices);
    const prerequisiteKnowledge = this.estimatePrerequisites(questionText, bloomLevel);

    const overallDifficulty = (
      readabilityScore * 0.25 +
      conceptualComplexity * 0.35 +
      cognitiveLoad * 0.25 +
      prerequisiteKnowledge * 0.15
    );

    return {
      readabilityScore,
      conceptualComplexity,
      cognitiveLoad,
      prerequisiteKnowledge,
      overallDifficulty
    };
  }

  private calculateReadability(text: string): number {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = this.estimateSyllables(text);

    // Flesch-Kincaid Grade Level
    const gradeLevel = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;

    // Normalize to 0-1 scale (assuming grade 6-16 range)
    return Math.max(0, Math.min(1, (gradeLevel - 6) / 10));
  }

  private estimateSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;

    for (const word of words) {
      count += word
        .replace(/[^a-z]/g, '')
        .replace(/e$/, '')
        .match(/[aeiouy]{1,2}/g)?.length || 1;
    }

    return count;
  }

  private assessConceptualComplexity(text: string, bloomLevel: string): number {
    let complexity = 0;

    // Base complexity from Bloom's level
    const bloomComplexity: Record<string, number> = {
      remembering: 0.2,
      understanding: 0.4,
      applying: 0.6,
      analyzing: 0.75,
      evaluating: 0.85,
      creating: 0.95
    };

    complexity += bloomComplexity[bloomLevel.toLowerCase()] || 0.5;

    // Check for complex terms
    const complexTerms = [
      /\b(analyze|synthesize|evaluate|critique|compare|contrast)\b/i,
      /\b(hypothesis|theory|methodology|framework|paradigm)\b/i,
      /\b(implication|inference|assumption|premise|conclusion)\b/i
    ];

    const termMatches = complexTerms.filter(pattern => pattern.test(text)).length;
    complexity += (termMatches / complexTerms.length) * 0.3;

    return Math.min(1, complexity);
  }

  private calculateCognitiveLoad(
    text: string,
    questionType: string,
    choices?: string[]
  ): number {
    let load = 0.3; // Base load

    // Text length impact
    const wordCount = text.split(/\s+/).length;
    load += Math.min(0.3, wordCount / 100);

    // Question type impact
    if (questionType === 'essay' || questionType === 'short_answer') {
      load += 0.2;
    }

    // Choice similarity impact (for MCQ)
    if (choices && choices.length > 0) {
      const avgSimilarity = this.calculateChoiceSimilarity(choices);
      load += avgSimilarity * 0.3; // Higher similarity = higher cognitive load
    }

    return Math.min(1, load);
  }

  private calculateChoiceSimilarity(choices: string[]): number {
    if (choices.length < 2) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < choices.length; i++) {
      for (let j = i + 1; j < choices.length; j++) {
        totalSimilarity += this.textSimilarity(choices[i], choices[j]);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private textSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private estimatePrerequisites(text: string, bloomLevel: string): number {
    let prerequisiteLevel = 0.3; // Base level

    // Higher Bloom levels typically require more prerequisites
    const bloomPrerequisites: Record<string, number> = {
      remembering: 0.2,
      understanding: 0.3,
      applying: 0.5,
      analyzing: 0.7,
      evaluating: 0.8,
      creating: 0.9
    };

    prerequisiteLevel = bloomPrerequisites[bloomLevel.toLowerCase()] || 0.5;

    // Check for domain-specific terminology
    const technicalTerms = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g) || [];
    prerequisiteLevel += Math.min(0.2, technicalTerms.length * 0.05);

    return Math.min(1, prerequisiteLevel);
  }

  private determineCalibratedDifficulty(
    metrics: DifficultyMetrics,
    bloomLevel: string
  ): string {
    const { overallDifficulty } = metrics;

    if (overallDifficulty < 0.35) return 'easy';
    if (overallDifficulty < 0.65) return 'medium';
    return 'hard';
  }

  private inferOriginalDifficulty(bloomLevel: string): string {
    const level = bloomLevel.toLowerCase();
    if (level === 'remembering' || level === 'understanding') return 'easy';
    if (level === 'applying' || level === 'analyzing') return 'medium';
    return 'hard';
  }

  private generateRecommendations(
    metrics: DifficultyMetrics,
    calibratedDifficulty: string
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.readabilityScore > 0.8) {
      recommendations.push('Consider simplifying language for broader accessibility');
    }

    if (metrics.cognitiveLoad > 0.75) {
      recommendations.push('High cognitive load - consider breaking into multiple questions');
    }

    if (metrics.conceptualComplexity > 0.8 && calibratedDifficulty === 'easy') {
      recommendations.push('Conceptual complexity may be too high for easy difficulty');
    }

    if (metrics.prerequisiteKnowledge > 0.7) {
      recommendations.push('Ensure students have necessary prerequisite knowledge');
    }

    if (recommendations.length === 0) {
      recommendations.push('Difficulty level appears well-calibrated');
    }

    return recommendations;
  }

  private calculateConfidence(metrics: DifficultyMetrics): number {
    // Higher variance in metrics = lower confidence
    const values = [
      metrics.readabilityScore,
      metrics.conceptualComplexity,
      metrics.cognitiveLoad,
      metrics.prerequisiteKnowledge
    ];

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    // Low variance = high confidence
    return Math.max(0.5, 1 - Math.sqrt(variance));
  }

  async batchCalibrate(
    questions: Array<{
      text: string;
      type: string;
      bloomLevel: string;
      topic: string;
      choices?: string[];
    }>
  ): Promise<CalibrationResult[]> {
    return Promise.all(
      questions.map(q =>
        this.calibrateDifficulty(q.text, q.type, q.bloomLevel, q.topic, q.choices)
      )
    );
  }
}

export const difficultyCalibrator = DifficultyCalibrator.getInstance();
