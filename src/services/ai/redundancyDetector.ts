export interface RedundancyCheck {
  isDuplicate: boolean;
  similarQuestions: Array<{
    id: string;
    text: string;
    similarity: number;
    topic: string;
  }>;
  recommendation: string;
  confidence: number;
}

export interface RedundancyReport {
  totalQuestions: number;
  duplicatePairs: number;
  clusters: Array<{
    questions: string[];
    avgSimilarity: number;
    topic: string;
  }>;
  recommendations: string[];
}

export class RedundancyDetector {
  private static instance: RedundancyDetector;
  private readonly SIMILARITY_THRESHOLD = 0.85;
  private readonly CLUSTER_THRESHOLD = 0.75;

  static getInstance(): RedundancyDetector {
    if (!this.instance) {
      this.instance = new RedundancyDetector();
    }
    return this.instance;
  }

  async checkRedundancy(
    questionText: string,
    existingQuestions: Array<{ id: string; text: string; topic: string }>,
    threshold?: number
  ): Promise<RedundancyCheck> {
    const similarityThreshold = threshold || this.SIMILARITY_THRESHOLD;
    const similarities: Array<{
      id: string;
      text: string;
      similarity: number;
      topic: string;
    }> = [];

    for (const existing of existingQuestions) {
      const similarity = this.calculateSimilarity(questionText, existing.text);
      
      if (similarity >= similarityThreshold) {
        similarities.push({
          id: existing.id,
          text: existing.text,
          similarity,
          topic: existing.topic
        });
      }
    }

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    const isDuplicate = similarities.length > 0 && similarities[0].similarity >= 0.95;
    const recommendation = this.generateRecommendation(similarities, isDuplicate);
    const confidence = similarities.length > 0 ? similarities[0].similarity : 0;

    return {
      isDuplicate,
      similarQuestions: similarities,
      recommendation,
      confidence
    };
  }

  async detectRedundancyInBank(
    questions: Array<{ id: string; text: string; topic: string }>
  ): Promise<RedundancyReport> {
    const duplicatePairs: Array<[string, string]> = [];
    const clusters: Map<string, Set<string>> = new Map();

    // Build similarity matrix
    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const similarity = this.calculateSimilarity(
          questions[i].text,
          questions[j].text
        );

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          duplicatePairs.push([questions[i].id, questions[j].id]);
        }

        if (similarity >= this.CLUSTER_THRESHOLD) {
          this.addToCluster(clusters, questions[i].id, questions[j].id);
        }
      }
    }

    // Convert clusters to report format
    const clusterReport = Array.from(clusters.values()).map(cluster => {
      const clusterQuestions = Array.from(cluster).map(id =>
        questions.find(q => q.id === id)
      ).filter(q => q !== undefined);

      const avgSimilarity = this.calculateClusterSimilarity(clusterQuestions);
      const topic = clusterQuestions[0]?.topic || 'Unknown';

      return {
        questions: Array.from(cluster),
        avgSimilarity,
        topic
      };
    });

    const recommendations = this.generateBankRecommendations(
      duplicatePairs.length,
      clusterReport.length,
      questions.length
    );

    return {
      totalQuestions: questions.length,
      duplicatePairs: duplicatePairs.length,
      clusters: clusterReport,
      recommendations
    };
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Normalize texts
    const normalized1 = this.normalize(text1);
    const normalized2 = this.normalize(text2);

    // Calculate Levenshtein similarity
    const levenshtein = this.levenshteinSimilarity(normalized1, normalized2);

    // Calculate token-based similarity
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);
    const tokenSimilarity = this.jaccardSimilarity(tokens1, tokens2);

    // Calculate n-gram similarity
    const ngramSimilarity = this.ngramSimilarity(normalized1, normalized2, 3);

    // Weighted combination
    return (
      levenshtein * 0.3 +
      tokenSimilarity * 0.4 +
      ngramSimilarity * 0.3
    );
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    return this.normalize(text)
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  private levenshteinSimilarity(text1: string, text2: string): number {
    const distance = this.levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    
    if (maxLength === 0) return 1.0;
    return 1 - distance / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private ngramSimilarity(text1: string, text2: string, n: number): number {
    const ngrams1 = this.getNgrams(text1, n);
    const ngrams2 = this.getNgrams(text2, n);

    return this.jaccardSimilarity(ngrams1, ngrams2);
  }

  private getNgrams(text: string, n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= text.length - n; i++) {
      ngrams.push(text.substring(i, i + n));
    }
    return ngrams;
  }

  private addToCluster(
    clusters: Map<string, Set<string>>,
    id1: string,
    id2: string
  ): void {
    // Find existing cluster containing either ID
    let targetCluster: Set<string> | undefined;

    for (const cluster of clusters.values()) {
      if (cluster.has(id1) || cluster.has(id2)) {
        targetCluster = cluster;
        break;
      }
    }

    if (targetCluster) {
      targetCluster.add(id1);
      targetCluster.add(id2);
    } else {
      const newCluster = new Set([id1, id2]);
      clusters.set(id1, newCluster);
    }
  }

  private calculateClusterSimilarity(
    questions: Array<{ id: string; text: string; topic: string }>
  ): number {
    if (questions.length < 2) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        totalSimilarity += this.calculateSimilarity(
          questions[i].text,
          questions[j].text
        );
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private generateRecommendation(
    similarities: Array<{ similarity: number }>,
    isDuplicate: boolean
  ): string {
    if (isDuplicate) {
      return 'Exact or near-exact duplicate detected. Consider reviewing before adding.';
    }

    if (similarities.length > 0) {
      const highestSimilarity = similarities[0].similarity;
      
      if (highestSimilarity >= 0.9) {
        return 'Very high similarity with existing question. Recommend significant modification.';
      } else if (highestSimilarity >= 0.8) {
        return 'High similarity detected. Consider rephrasing or adding to existing question.';
      } else {
        return 'Moderate similarity found. Review for potential overlap.';
      }
    }

    return 'No significant redundancy detected. Question appears unique.';
  }

  private generateBankRecommendations(
    duplicates: number,
    clusters: number,
    total: number
  ): string[] {
    const recommendations: string[] = [];

    if (duplicates > 0) {
      const duplicateRate = (duplicates / total) * 100;
      recommendations.push(
        `Found ${duplicates} duplicate pairs (${duplicateRate.toFixed(1)}% of questions). Review and consolidate.`
      );
    }

    if (clusters > 0) {
      recommendations.push(
        `Identified ${clusters} clusters of similar questions. Consider diversifying question types.`
      );
    }

    const redundancyRate = ((duplicates + clusters) / total) * 100;
    
    if (redundancyRate > 20) {
      recommendations.push(
        'High redundancy rate detected. Implement stricter similarity checks on new questions.'
      );
    } else if (redundancyRate > 10) {
      recommendations.push(
        'Moderate redundancy. Regular review recommended to maintain question quality.'
      );
    } else {
      recommendations.push(
        'Low redundancy rate. Question bank shows good diversity.'
      );
    }

    return recommendations;
  }

  async analyzeQuestionDiversity(
    questions: Array<{
      id: string;
      text: string;
      topic: string;
      bloomLevel: string;
      difficulty: string;
    }>
  ): Promise<{
    diversityScore: number;
    topicDistribution: Record<string, number>;
    bloomDistribution: Record<string, number>;
    recommendations: string[];
  }> {
    const topicCounts: Record<string, number> = {};
    const bloomCounts: Record<string, number> = {};

    questions.forEach(q => {
      topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
      bloomCounts[q.bloomLevel] = (bloomCounts[q.bloomLevel] || 0) + 1;
    });

    const topicEntropy = this.calculateEntropy(Object.values(topicCounts));
    const bloomEntropy = this.calculateEntropy(Object.values(bloomCounts));

    const diversityScore = (topicEntropy + bloomEntropy) / 2;

    const recommendations: string[] = [];
    
    if (topicEntropy < 0.5) {
      recommendations.push('Low topic diversity. Add questions from underrepresented topics.');
    }
    
    if (bloomEntropy < 0.5) {
      recommendations.push('Low cognitive level diversity. Balance Bloom\'s taxonomy representation.');
    }

    return {
      diversityScore,
      topicDistribution: topicCounts,
      bloomDistribution: bloomCounts,
      recommendations
    };
  }

  private calculateEntropy(distribution: number[]): number {
    const total = distribution.reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0;

    let entropy = 0;
    for (const count of distribution) {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    }

    // Normalize to 0-1 scale (assuming max 10 categories)
    const maxEntropy = Math.log2(Math.min(distribution.length, 10));
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }
}

export const redundancyDetector = RedundancyDetector.getInstance();
