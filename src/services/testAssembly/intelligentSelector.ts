/**
 * Intelligent Question Selector
 * Prevents redundant questions using semantic similarity and usage tracking
 */

import { supabase } from '@/integrations/supabase/client';
import { findSimilarQuestions, cosineSimilarity } from '../ai/semanticAnalyzer';

export interface SelectionConfig {
  topicDistribution: Record<string, number>;
  bloomDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  totalQuestions: number;
  similarityThreshold: number; // 0.85 = duplicate
  recentUseWindowDays: number; // Default 365
  diversityWeight: number; // 0-1, higher = more diverse
  qualityThreshold: number; // Minimum quality score
}

export interface ScoredQuestion {
  question: any;
  score: number;
  penalties: {
    recency: number;
    similarity: number;
    quality: number;
  };
  usageHistory: Array<{ test_id: string; used_at: string }>;
}

export interface SelectionReport {
  selected: any[];
  rejected: Array<{
    question: any;
    reason: string;
    score: number;
  }>;
  metrics: {
    avgSimilarity: number;
    avgRecency: number;
    diversityScore: number;
    coverageScore: number;
  };
}

export class IntelligentSelector {
  private config: SelectionConfig;
  
  constructor(config: SelectionConfig) {
    this.config = config;
  }

  /**
   * Main selection method with comprehensive filtering
   */
  async selectQuestions(candidatePool: any[]): Promise<SelectionReport> {
    console.log(`Starting intelligent selection from ${candidatePool.length} candidates`);

    // Step 1: Fetch usage history and similarities
    const enrichedCandidates = await this.enrichWithMetadata(candidatePool);
    
    // Step 2: Score each candidate
    const scoredCandidates = await this.scoreQuestions(enrichedCandidates);
    
    // Step 3: Greedy selection with balancing
    const selected = await this.greedySelection(scoredCandidates);
    
    // Step 4: Generate report
    const report = this.generateReport(selected, scoredCandidates);
    
    return report;
  }

  /**
   * Enrich candidates with usage history and similarity data
   */
  private async enrichWithMetadata(questions: any[]): Promise<any[]> {
    return Promise.all(
      questions.map(async (question) => {
        // Parse usage history
        const usageHistory = Array.isArray(question.used_history) 
          ? question.used_history 
          : [];

        // Get similar questions if semantic vector exists
        let similarQuestions: any[] = [];
        if (question.semantic_vector) {
          try {
            similarQuestions = await findSimilarQuestions(
              question.id,
              10,
              this.config.similarityThreshold
            );
          } catch (error) {
            console.warn(`Could not fetch similar questions for ${question.id}:`, error);
          }
        }

        return {
          ...question,
          usageHistory,
          similarQuestions
        };
      })
    );
  }

  /**
   * Score questions based on recency, similarity, and quality
   */
  private async scoreQuestions(questions: any[]): Promise<ScoredQuestion[]> {
    const now = new Date();
    const recentUseWindow = this.config.recentUseWindowDays * 24 * 60 * 60 * 1000;

    return questions.map((question) => {
      // Calculate recency penalty (0-1, higher = more recent)
      const recencyPenalty = this.calculateRecencyPenalty(
        question.usageHistory,
        now,
        recentUseWindow
      );

      // Calculate similarity penalty (0-1, higher = more similar to selected)
      const similarityPenalty = 0; // Will be updated during selection

      // Quality score (0-1)
      const qualityScore = question.quality_score || 0.7;

      // Combined score (higher is better)
      const score = qualityScore * (1 - recencyPenalty * 0.5) * (1 - similarityPenalty * 0.3);

      return {
        question,
        score,
        penalties: {
          recency: recencyPenalty,
          similarity: similarityPenalty,
          quality: 1 - qualityScore
        },
        usageHistory: question.usageHistory
      };
    });
  }

  /**
   * Calculate recency penalty based on usage history
   */
  private calculateRecencyPenalty(
    usageHistory: Array<{ used_at: string }>,
    now: Date,
    windowMs: number
  ): number {
    if (!usageHistory || usageHistory.length === 0) {
      return 0; // Never used = no penalty
    }

    // Find most recent use
    const mostRecentUse = usageHistory.reduce((latest, usage) => {
      const usedAt = new Date(usage.used_at);
      return usedAt > latest ? usedAt : latest;
    }, new Date(0));

    const timeSinceUse = now.getTime() - mostRecentUse.getTime();

    // Penalty decreases exponentially over time
    if (timeSinceUse >= windowMs) {
      return 0; // Outside window = no penalty
    }

    // Linear penalty within window: 1.0 = just used, 0.0 = at window edge
    return 1 - (timeSinceUse / windowMs);
  }

  /**
   * Greedy selection with balance constraints and similarity checking
   */
  private async greedySelection(
    scoredCandidates: ScoredQuestion[]
  ): Promise<ScoredQuestion[]> {
    const selected: ScoredQuestion[] = [];
    const remaining = [...scoredCandidates].sort((a, b) => b.score - a.score);

    // Track requirements
    const topicNeeds = { ...this.config.topicDistribution };
    const bloomNeeds = { ...this.config.bloomDistribution };
    const difficultyNeeds = { ...this.config.difficultyDistribution };

    while (selected.length < this.config.totalQuestions && remaining.length > 0) {
      // Find best candidate that meets requirements
      const candidateIndex = remaining.findIndex(candidate => {
        const q = candidate.question;
        
        // Check if topic/bloom/difficulty still needed
        const topicOk = (topicNeeds[q.topic] || 0) > 0;
        const bloomOk = (bloomNeeds[q.bloom_level] || 0) > 0;
        const difficultyOk = (difficultyNeeds[q.difficulty] || 0) > 0;

        return topicOk && bloomOk && difficultyOk;
      });

      if (candidateIndex === -1) {
        console.warn('Could not satisfy all constraints. Relaxing requirements...');
        break;
      }

      const candidate = remaining.splice(candidateIndex, 1)[0];

      // Check similarity to already selected questions
      const similarityPenalty = await this.checkSimilarityToSelected(
        candidate.question,
        selected.map(s => s.question)
      );

      // Update penalty and score
      candidate.penalties.similarity = similarityPenalty;
      candidate.score = candidate.question.quality_score * 
        (1 - candidate.penalties.recency * 0.5) * 
        (1 - similarityPenalty * 0.3);

      // If too similar, skip (unless desperate)
      if (similarityPenalty > this.config.similarityThreshold && remaining.length > 5) {
        continue;
      }

      // Add to selected
      selected.push(candidate);

      // Update needs
      const q = candidate.question;
      topicNeeds[q.topic] = Math.max(0, (topicNeeds[q.topic] || 0) - 1);
      bloomNeeds[q.bloom_level] = Math.max(0, (bloomNeeds[q.bloom_level] || 0) - 1);
      difficultyNeeds[q.difficulty] = Math.max(0, (difficultyNeeds[q.difficulty] || 0) - 1);
    }

    return selected;
  }

  /**
   * Check similarity between candidate and already selected questions
   */
  private async checkSimilarityToSelected(
    candidate: any,
    selected: any[]
  ): Promise<number> {
    if (selected.length === 0) return 0;
    if (!candidate.semantic_vector) return 0;

    let maxSimilarity = 0;

    for (const selectedQ of selected) {
      if (!selectedQ.semantic_vector) continue;

      try {
        const vector1 = typeof candidate.semantic_vector === 'string'
          ? JSON.parse(candidate.semantic_vector)
          : candidate.semantic_vector;
        const vector2 = typeof selectedQ.semantic_vector === 'string'
          ? JSON.parse(selectedQ.semantic_vector)
          : selectedQ.semantic_vector;

        const similarity = cosineSimilarity(vector1, vector2);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      } catch (error) {
        console.warn('Error calculating similarity:', error);
      }
    }

    return maxSimilarity;
  }

  /**
   * Generate selection report
   */
  private generateReport(
    selected: ScoredQuestion[],
    allCandidates: ScoredQuestion[]
  ): SelectionReport {
    const rejected = allCandidates.filter(
      c => !selected.find(s => s.question.id === c.question.id)
    );

    // Calculate metrics
    const avgSimilarity = selected.reduce((sum, s) => sum + s.penalties.similarity, 0) / 
      Math.max(1, selected.length);
    
    const avgRecency = selected.reduce((sum, s) => sum + s.penalties.recency, 0) / 
      Math.max(1, selected.length);

    const diversityScore = this.calculateDiversityScore(selected.map(s => s.question));
    const coverageScore = this.calculateCoverageScore(selected.map(s => s.question));

    return {
      selected: selected.map(s => s.question),
      rejected: rejected.map(r => ({
        question: r.question,
        reason: this.determineRejectionReason(r),
        score: r.score
      })),
      metrics: {
        avgSimilarity,
        avgRecency,
        diversityScore,
        coverageScore
      }
    };
  }

  private determineRejectionReason(candidate: ScoredQuestion): string {
    if (candidate.penalties.similarity > this.config.similarityThreshold) {
      return `Too similar to selected questions (${(candidate.penalties.similarity * 100).toFixed(1)}%)`;
    }
    if (candidate.penalties.recency > 0.7) {
      return 'Recently used in other tests';
    }
    if (candidate.penalties.quality > 0.5) {
      return 'Quality score below threshold';
    }
    return 'Did not meet distribution requirements';
  }

  private calculateDiversityScore(questions: any[]): number {
    const topics = new Set(questions.map(q => q.topic)).size;
    const blooms = new Set(questions.map(q => q.bloom_level)).size;
    const difficulties = new Set(questions.map(q => q.difficulty)).size;
    
    return (topics / 10 + blooms / 6 + difficulties / 3) / 3;
  }

  private calculateCoverageScore(questions: any[]): number {
    let coverage = 0;
    let totalNeeds = 0;

    // Check topic coverage
    for (const [topic, needed] of Object.entries(this.config.topicDistribution)) {
      const actual = questions.filter(q => q.topic === topic).length;
      coverage += Math.min(1, actual / needed);
      totalNeeds++;
    }

    // Check bloom coverage
    for (const [bloom, needed] of Object.entries(this.config.bloomDistribution)) {
      const actual = questions.filter(q => q.bloom_level === bloom).length;
      coverage += Math.min(1, actual / needed);
      totalNeeds++;
    }

    return totalNeeds > 0 ? coverage / totalNeeds : 0;
  }
}

/**
 * Mark questions as used after selection
 */
export async function markQuestionsAsUsed(
  questionIds: string[],
  testId: string
): Promise<void> {
  const usageEntry = {
    test_id: testId,
    used_at: new Date().toISOString()
  };

  for (const questionId of questionIds) {
    try {
      // Fetch current question
      const { data: question, error: fetchError } = await supabase
        .from('questions')
        .select('used_history, used_count')
        .eq('id', questionId)
        .single();

      if (fetchError) {
        console.error(`Error fetching question ${questionId}:`, fetchError);
        continue;
      }

      // Update usage history and count
      const currentHistory = Array.isArray(question.used_history) 
        ? question.used_history 
        : [];
      
      const newHistory = [...currentHistory, usageEntry];
      const newCount = (question.used_count || 0) + 1;

      const { error: updateError } = await supabase
        .from('questions')
        .update({
          used_history: newHistory,
          used_count: newCount
        })
        .eq('id', questionId);

      if (updateError) {
        console.error(`Error updating question ${questionId}:`, updateError);
      }
    } catch (error) {
      console.error(`Error marking question ${questionId} as used:`, error);
    }
  }
}
