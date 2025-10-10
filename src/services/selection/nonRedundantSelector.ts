import { findSimilarQuestions, cosineSimilarity } from '../ai/semanticAnalyzer';
import { mlClassifier } from '../ai/mlClassifier';
import { supabase } from '@/integrations/supabase/client';

export interface SelectionCriteria {
  totalQuestions: number;
  topicDistribution: Record<string, number>;
  bloomDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  maxSimilarity: number;
  diversityWeight: number;
  qualityThreshold: number;
}

export interface SelectionResult {
  selectedQuestions: any[];
  rejectedQuestions: Array<{
    question: any;
    reason: string;
    similarity?: number;
  }>;
  diversityScore: number;
  coverageScore: number;
  qualityScore: number;
  redundancyReport: {
    duplicatesFound: number;
    similarPairs: Array<{ id1: string; id2: string; similarity: number }>;
  };
}

export class NonRedundantSelector {
  private static instance: NonRedundantSelector;

  static getInstance(): NonRedundantSelector {
    if (!NonRedundantSelector.instance) {
      NonRedundantSelector.instance = new NonRedundantSelector();
    }
    return NonRedundantSelector.instance;
  }

  async selectQuestions(
    candidateQuestions: any[],
    criteria: SelectionCriteria
  ): Promise<SelectionResult> {
    console.log(`Starting non-redundant selection from ${candidateQuestions.length} candidates`);

    // Step 1: Quality filtering
    const qualityFiltered = await this.filterByQuality(candidateQuestions, criteria.qualityThreshold);
    
    // Step 2: Redundancy detection and removal
    const redundancyResult = await this.detectAndRemoveRedundancy(qualityFiltered, criteria.maxSimilarity);
    
    // Step 3: Diversity optimization
    const diversityOptimized = await this.optimizeForDiversity(
      redundancyResult.nonRedundant,
      criteria
    );
    
    // Step 4: Coverage analysis
    const coverageScore = this.calculateCoverageScore(diversityOptimized.selected, criteria);
    
    // Step 5: Final quality assessment
    const finalQualityScore = await this.calculateFinalQuality(diversityOptimized.selected);

    return {
      selectedQuestions: diversityOptimized.selected,
      rejectedQuestions: [
        ...redundancyResult.rejected,
        ...diversityOptimized.rejected
      ],
      diversityScore: diversityOptimized.diversityScore,
      coverageScore,
      qualityScore: finalQualityScore,
      redundancyReport: {
        duplicatesFound: redundancyResult.duplicatesFound,
        similarPairs: redundancyResult.similarPairs
      }
    };
  }

  private async filterByQuality(questions: any[], threshold: number): Promise<any[]> {
    const qualityResults = await Promise.all(
      questions.map(async (question) => {
        const classification = await mlClassifier.classifyQuestion({
          text: question.question_text,
          type: question.question_type,
          topic: question.topic,
          choices: question.choices
        });
        
        return {
          question,
          qualityScore: classification.quality_score
        };
      })
    );

    return qualityResults
      .filter(result => result.qualityScore >= threshold)
      .map(result => result.question);
  }

  private async detectAndRemoveRedundancy(
    questions: any[],
    maxSimilarity: number
  ): Promise<{
    nonRedundant: any[];
    rejected: Array<{ question: any; reason: string; similarity?: number }>;
    duplicatesFound: number;
    similarPairs: Array<{ id1: string; id2: string; similarity: number }>;
  }> {
    const nonRedundant: any[] = [];
    const rejected: Array<{ question: any; reason: string; similarity?: number }> = [];
    const similarPairs: Array<{ id1: string; id2: string; similarity: number }> = [];
    let duplicatesFound = 0;

    for (const question of questions) {
      let isRedundant = false;
      let maxSim = 0;
      let similarTo = '';

      for (const selected of nonRedundant) {
        // Check semantic similarity using embeddings if available
        let similarity = 0;
        
        if (question.semantic_vector && selected.semantic_vector) {
          try {
            const vector1 = typeof question.semantic_vector === 'string' 
              ? JSON.parse(question.semantic_vector) 
              : question.semantic_vector;
            const vector2 = typeof selected.semantic_vector === 'string'
              ? JSON.parse(selected.semantic_vector)
              : selected.semantic_vector;
            
            similarity = cosineSimilarity(vector1, vector2);
          } catch (error) {
            console.warn('Error calculating semantic similarity:', error);
          }
        }
        
        // Fallback to text-based similarity if no embeddings
        if (similarity === 0) {
          const words1 = new Set(question.question_text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
          const words2 = new Set(selected.question_text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
          const intersection = new Set([...words1].filter(x => words2.has(x)));
          const union = new Set([...words1, ...words2]);
          similarity = union.size > 0 ? intersection.size / union.size : 0;
        }

        if (similarity > maxSimilarity) {
          isRedundant = true;
          maxSim = similarity;
          similarTo = selected.id;
          duplicatesFound++;
          
          similarPairs.push({
            id1: question.id,
            id2: selected.id,
            similarity
          });
          break;
        }
      }

      if (isRedundant) {
        rejected.push({
          question,
          reason: `Too similar to question ${similarTo} (${(maxSim * 100).toFixed(1)}% similarity)`,
          similarity: maxSim
        });
      } else {
        nonRedundant.push(question);
      }
    }

    return {
      nonRedundant,
      rejected,
      duplicatesFound,
      similarPairs
    };
  }

  private async optimizeForDiversity(
    questions: any[],
    criteria: SelectionCriteria
  ): Promise<{
    selected: any[];
    rejected: Array<{ question: any; reason: string }>;
    diversityScore: number;
  }> {
    // Group questions by characteristics
    const grouped = this.groupQuestionsByCharacteristics(questions);
    
    // Select questions to meet distribution requirements
    const selected: any[] = [];
    const rejected: Array<{ question: any; reason: string }> = [];

    // Topic distribution
    for (const [topic, targetCount] of Object.entries(criteria.topicDistribution)) {
      const topicQuestions = grouped.byTopic[topic] || [];
      const selectedFromTopic = topicQuestions.slice(0, targetCount);
      const rejectedFromTopic = topicQuestions.slice(targetCount);

      selected.push(...selectedFromTopic);
      rejected.push(...rejectedFromTopic.map(q => ({
        question: q,
        reason: `Exceeded topic quota for ${topic}`
      })));
    }

    // Bloom's level distribution
    const bloomSelected = this.balanceByBloom(selected, criteria.bloomDistribution);
    
    // Calculate diversity score
    const diversityScore = this.calculateDiversityScore(bloomSelected.selected);

    return {
      selected: bloomSelected.selected.slice(0, criteria.totalQuestions),
      rejected: [...rejected, ...bloomSelected.rejected],
      diversityScore
    };
  }

  private groupQuestionsByCharacteristics(questions: any[]) {
    return {
      byTopic: questions.reduce((acc, q) => {
        acc[q.topic] = acc[q.topic] || [];
        acc[q.topic].push(q);
        return acc;
      }, {} as Record<string, any[]>),
      
      byBloom: questions.reduce((acc, q) => {
        acc[q.bloom_level] = acc[q.bloom_level] || [];
        acc[q.bloom_level].push(q);
        return acc;
      }, {} as Record<string, any[]>),
      
      byDifficulty: questions.reduce((acc, q) => {
        acc[q.difficulty] = acc[q.difficulty] || [];
        acc[q.difficulty].push(q);
        return acc;
      }, {} as Record<string, any[]>)
    };
  }

  private balanceByBloom(questions: any[], bloomDistribution: Record<string, number>) {
    const selected: any[] = [];
    const rejected: Array<{ question: any; reason: string }> = [];
    
    const grouped = questions.reduce((acc, q) => {
      acc[q.bloom_level] = acc[q.bloom_level] || [];
      acc[q.bloom_level].push(q);
      return acc;
    }, {} as Record<string, any[]>);

    for (const [bloom, targetCount] of Object.entries(bloomDistribution)) {
      const bloomQuestions = grouped[bloom] || [];
      const selectedFromBloom = bloomQuestions.slice(0, targetCount);
      const rejectedFromBloom = bloomQuestions.slice(targetCount);

      selected.push(...selectedFromBloom);
      rejected.push(...rejectedFromBloom.map(q => ({
        question: q,
        reason: `Exceeded Bloom's level quota for ${bloom}`
      })));
    }

    return { selected, rejected };
  }

  private calculateDiversityScore(questions: any[]): number {
    if (questions.length === 0) return 0;

    // Calculate diversity across multiple dimensions
    const topicDiversity = this.calculateTopicDiversity(questions);
    const bloomDiversity = this.calculateBloomDiversity(questions);
    const difficultyDiversity = this.calculateDifficultyDiversity(questions);
    const typeDiversity = this.calculateTypeDiversity(questions);

    // Weighted average
    return (topicDiversity * 0.3) + 
           (bloomDiversity * 0.3) + 
           (difficultyDiversity * 0.2) + 
           (typeDiversity * 0.2);
  }

  private calculateTopicDiversity(questions: any[]): number {
    const topics = new Set(questions.map(q => q.topic));
    const maxPossibleTopics = Math.min(10, questions.length); // Reasonable maximum
    return topics.size / maxPossibleTopics;
  }

  private calculateBloomDiversity(questions: any[]): number {
    const bloomLevels = new Set(questions.map(q => q.bloom_level));
    return bloomLevels.size / 6; // 6 Bloom's levels
  }

  private calculateDifficultyDiversity(questions: any[]): number {
    const difficulties = new Set(questions.map(q => q.difficulty));
    return difficulties.size / 3; // 3 difficulty levels
  }

  private calculateTypeDiversity(questions: any[]): number {
    const types = new Set(questions.map(q => q.question_type));
    return types.size / 4; // 4 question types
  }

  private calculateCoverageScore(questions: any[], criteria: SelectionCriteria): number {
    let coverageScore = 0;
    let totalCriteria = 0;

    // Topic coverage
    for (const [topic, targetCount] of Object.entries(criteria.topicDistribution)) {
      const actualCount = questions.filter(q => q.topic === topic).length;
      coverageScore += Math.min(1, actualCount / targetCount);
      totalCriteria++;
    }

    // Bloom's coverage
    for (const [bloom, targetCount] of Object.entries(criteria.bloomDistribution)) {
      const actualCount = questions.filter(q => q.bloom_level === bloom).length;
      coverageScore += Math.min(1, actualCount / targetCount);
      totalCriteria++;
    }

    return totalCriteria > 0 ? coverageScore / totalCriteria : 0;
  }

  private async calculateFinalQuality(questions: any[]): Promise<number> {
    if (questions.length === 0) return 0;

    const qualityScores = await Promise.all(
      questions.map(async (question) => {
        const classification = await mlClassifier.classifyQuestion({
          text: question.question_text,
          type: question.question_type,
          topic: question.topic,
          choices: question.choices
        });
        return classification.quality_score;
      })
    );

    return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  }

  async generateSelectionReport(result: SelectionResult): Promise<string> {
    const report = `
# Question Selection Report

## Summary
- **Selected Questions**: ${result.selectedQuestions.length}
- **Rejected Questions**: ${result.rejectedQuestions.length}
- **Overall Quality Score**: ${(result.qualityScore * 100).toFixed(1)}%
- **Diversity Score**: ${(result.diversityScore * 100).toFixed(1)}%
- **Coverage Score**: ${(result.coverageScore * 100).toFixed(1)}%

## Redundancy Analysis
- **Duplicates Found**: ${result.redundancyReport.duplicatesFound}
- **Similar Pairs Detected**: ${result.redundancyReport.similarPairs.length}

## Quality Metrics
${result.selectedQuestions.map((q, i) => 
  `${i + 1}. ${q.topic} - ${q.bloom_level} (${q.difficulty})`
).join('\n')}

## Recommendations
${result.rejectedQuestions.length > 0 ? 
  `- Review rejected questions for potential improvements\n- Consider expanding question bank for better diversity` : 
  '- Selection meets all quality and diversity criteria'}

Generated on: ${new Date().toLocaleString()}
    `;

    return report.trim();
  }
}

export const nonRedundantSelector = NonRedundantSelector.getInstance();