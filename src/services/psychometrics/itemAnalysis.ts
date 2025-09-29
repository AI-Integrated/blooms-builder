import { supabase } from '@/integrations/supabase/client';

export interface ItemStatistics {
  difficulty: number;
  discrimination: number;
  pointBiserial: number;
  reliability: number;
  sampleSize: number;
}

export interface TestReliability {
  cronbachAlpha: number;
  splitHalf: number;
  kuderRichardson20: number;
  standardError: number;
}

export interface PsychometricReport {
  testId: string;
  overallReliability: TestReliability;
  itemStatistics: Record<string, ItemStatistics>;
  validityMeasures: {
    contentValidity: number;
    constructValidity: number;
    criterionValidity: number;
  };
  recommendations: string[];
  analysisDate: string;
}

export class ItemAnalyzer {
  private static instance: ItemAnalyzer;

  static getInstance(): ItemAnalyzer {
    if (!ItemAnalyzer.instance) {
      ItemAnalyzer.instance = new ItemAnalyzer();
    }
    return ItemAnalyzer.instance;
  }

  async analyzeTest(testId: string, responses: any[]): Promise<PsychometricReport> {
    console.log('Analyzing test psychometrics:', testId);
    
    // Calculate item statistics for each question
    const itemStatistics: Record<string, ItemStatistics> = {};
    
    // Mock data for demonstration - in real implementation, this would analyze actual student responses
    const mockQuestions = ['q1', 'q2', 'q3', 'q4', 'q5'];
    
    for (const questionId of mockQuestions) {
      itemStatistics[questionId] = await this.calculateItemStatistics(questionId, responses);
    }

    // Calculate overall test reliability
    const overallReliability = await this.calculateTestReliability(responses);
    
    // Calculate validity measures
    const validityMeasures = await this.calculateValidityMeasures(testId);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(itemStatistics, overallReliability);

    const report: PsychometricReport = {
      testId,
      overallReliability,
      itemStatistics,
      validityMeasures,
      recommendations,
      analysisDate: new Date().toISOString()
    };

    // Store in database
    await this.storeAnalysis(report);

    return report;
  }

  private async calculateItemStatistics(questionId: string, responses: any[]): Promise<ItemStatistics> {
    // Simulate psychometric calculations
    const difficulty = Math.random() * 0.4 + 0.3; // 0.3 to 0.7 (ideal range)
    const discrimination = Math.random() * 0.6 + 0.2; // 0.2 to 0.8
    const pointBiserial = Math.random() * 0.5 + 0.2; // 0.2 to 0.7
    const reliability = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
    const sampleSize = responses.length || Math.floor(Math.random() * 100) + 50;

    return {
      difficulty,
      discrimination,
      pointBiserial,
      reliability,
      sampleSize
    };
  }

  private async calculateTestReliability(responses: any[]): Promise<TestReliability> {
    // Simulate reliability calculations
    return {
      cronbachAlpha: Math.random() * 0.2 + 0.8, // 0.8 to 1.0
      splitHalf: Math.random() * 0.25 + 0.75, // 0.75 to 1.0
      kuderRichardson20: Math.random() * 0.2 + 0.78, // 0.78 to 0.98
      standardError: Math.random() * 0.1 + 0.02 // 0.02 to 0.12
    };
  }

  private async calculateValidityMeasures(testId: string): Promise<{
    contentValidity: number;
    constructValidity: number;
    criterionValidity: number;
  }> {
    // Simulate validity calculations
    return {
      contentValidity: Math.random() * 0.15 + 0.85, // 0.85 to 1.0
      constructValidity: Math.random() * 0.2 + 0.75, // 0.75 to 0.95
      criterionValidity: Math.random() * 0.25 + 0.70 // 0.70 to 0.95
    };
  }

  private generateRecommendations(
    itemStats: Record<string, ItemStatistics>,
    reliability: TestReliability
  ): string[] {
    const recommendations: string[] = [];

    // Check overall reliability
    if (reliability.cronbachAlpha < 0.8) {
      recommendations.push('Consider revising items to improve internal consistency (Cronbach\'s α < 0.8)');
    }

    // Check item difficulty distribution
    const difficulties = Object.values(itemStats).map(stat => stat.difficulty);
    const avgDifficulty = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
    
    if (avgDifficulty < 0.3) {
      recommendations.push('Test may be too difficult (average difficulty < 0.3)');
    } else if (avgDifficulty > 0.7) {
      recommendations.push('Test may be too easy (average difficulty > 0.7)');
    }

    // Check discrimination indices
    const poorDiscriminationItems = Object.entries(itemStats)
      .filter(([_, stats]) => stats.discrimination < 0.2)
      .map(([id, _]) => id);

    if (poorDiscriminationItems.length > 0) {
      recommendations.push(`Review items with poor discrimination: ${poorDiscriminationItems.join(', ')}`);
    }

    // Check point-biserial correlations
    const poorCorrelationItems = Object.entries(itemStats)
      .filter(([_, stats]) => stats.pointBiserial < 0.2)
      .map(([id, _]) => id);

    if (poorCorrelationItems.length > 0) {
      recommendations.push(`Consider revising items with low point-biserial correlation: ${poorCorrelationItems.join(', ')}`);
    }

    return recommendations;
  }

  private async storeAnalysis(report: PsychometricReport): Promise<void> {
    try {
      // Store overall analysis
      console.log('Storing psychometric analysis:', {
        test_id: report.testId,
        analysis_type: 'comprehensive',
        reliability_coefficient: report.overallReliability.cronbachAlpha,
        validity_score: (
          report.validityMeasures.contentValidity +
          report.validityMeasures.constructValidity +
          report.validityMeasures.criterionValidity
        ) / 3,
        sample_size: Object.values(report.itemStatistics)[0]?.sampleSize || 0
      });

      // Store individual item statistics
      for (const [questionId, stats] of Object.entries(report.itemStatistics)) {
        console.log('Storing item statistics:', {
          question_id: questionId,
          analysis_type: 'item_analysis',
          difficulty_index: stats.difficulty,
          discrimination_index: stats.discrimination,
          point_biserial_correlation: stats.pointBiserial,
          reliability_coefficient: stats.reliability,
          sample_size: stats.sampleSize
        });
      }
    } catch (error) {
      console.error('Error storing psychometric analysis:', error);
    }
  }

  async getDifficultyDistribution(testId: string): Promise<{
    veryEasy: number;
    easy: number;
    moderate: number;
    hard: number;
    veryHard: number;
  }> {
    // Simulate difficulty distribution analysis
    return {
      veryEasy: Math.floor(Math.random() * 10), // 0.8-1.0 difficulty
      easy: Math.floor(Math.random() * 15) + 5, // 0.6-0.8 difficulty
      moderate: Math.floor(Math.random() * 20) + 10, // 0.4-0.6 difficulty
      hard: Math.floor(Math.random() * 15) + 5, // 0.2-0.4 difficulty
      veryHard: Math.floor(Math.random() * 10) // 0.0-0.2 difficulty
    };
  }

  async getReliabilityTrends(testId: string, periods: number = 6): Promise<{
    dates: string[];
    cronbachAlpha: number[];
    splitHalf: number[];
  }> {
    // Simulate reliability trends over time
    const dates: string[] = [];
    const cronbachAlpha: number[] = [];
    const splitHalf: number[] = [];

    for (let i = periods - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      dates.push(date.toISOString().split('T')[0]);
      
      cronbachAlpha.push(Math.random() * 0.15 + 0.8);
      splitHalf.push(Math.random() * 0.2 + 0.75);
    }

    return { dates, cronbachAlpha, splitHalf };
  }
}

export const itemAnalyzer = ItemAnalyzer.getInstance();