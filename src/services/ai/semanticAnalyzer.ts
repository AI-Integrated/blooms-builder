import { supabase } from '@/integrations/supabase/client';

export interface SimilarityResult {
  questionId1: string;
  questionId2: string;
  similarity: number;
  algorithm: 'cosine' | 'jaccard' | 'semantic';
  confidence: number;
}

export interface ClusterResult {
  clusterId: string;
  questions: string[];
  centroid: number[];
  coherence: number;
  topic: string;
}

export class SemanticAnalyzer {
  private static instance: SemanticAnalyzer;
  private vectorCache: Map<string, number[]> = new Map();

  static getInstance(): SemanticAnalyzer {
    if (!SemanticAnalyzer.instance) {
      SemanticAnalyzer.instance = new SemanticAnalyzer();
    }
    return SemanticAnalyzer.instance;
  }

  async calculateSimilarity(text1: string, text2: string, algorithm: 'cosine' | 'jaccard' | 'semantic' = 'semantic'): Promise<number> {
    switch (algorithm) {
      case 'cosine':
        return this.cosineSimilarity(text1, text2);
      case 'jaccard':
        return this.jaccardSimilarity(text1, text2);
      case 'semantic':
        return this.semanticSimilarity(text1, text2);
      default:
        return this.semanticSimilarity(text1, text2);
    }
  }

  private async cosineSimilarity(text1: string, text2: string): Promise<number> {
    const vector1 = await this.getTextVector(text1);
    const vector2 = await this.getTextVector(text2);
    
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  private jaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.tokenize(text1));
    const words2 = new Set(this.tokenize(text2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private async semanticSimilarity(text1: string, text2: string): Promise<number> {
    // Combine multiple similarity measures for better accuracy
    const cosine = await this.cosineSimilarity(text1, text2);
    const jaccard = this.jaccardSimilarity(text1, text2);
    const conceptual = this.conceptualSimilarity(text1, text2);
    
    // Weighted combination
    return (cosine * 0.5) + (jaccard * 0.3) + (conceptual * 0.2);
  }

  private conceptualSimilarity(text1: string, text2: string): number {
    // Analyze conceptual overlap using educational keywords
    const educationalConcepts = [
      'analysis', 'synthesis', 'evaluation', 'application', 'comprehension',
      'knowledge', 'skill', 'understanding', 'problem', 'solution',
      'method', 'process', 'system', 'theory', 'principle'
    ];

    const concepts1 = this.extractConcepts(text1, educationalConcepts);
    const concepts2 = this.extractConcepts(text2, educationalConcepts);
    
    if (concepts1.length === 0 && concepts2.length === 0) return 0;
    
    const intersection = concepts1.filter(c => concepts2.includes(c));
    const union = [...new Set([...concepts1, ...concepts2])];
    
    return intersection.length / union.length;
  }

  private extractConcepts(text: string, concepts: string[]): string[] {
    const words = this.tokenize(text);
    return concepts.filter(concept => 
      words.some(word => word.includes(concept) || concept.includes(word))
    );
  }

  private async getTextVector(text: string): Promise<number[]> {
    const cacheKey = this.hashText(text);
    
    if (this.vectorCache.has(cacheKey)) {
      return this.vectorCache.get(cacheKey)!;
    }

    const vector = await this.generateTextVector(text);
    this.vectorCache.set(cacheKey, vector);
    
    return vector;
  }

  private async generateTextVector(text: string): Promise<number[]> {
    // Simplified TF-IDF-like vectorization
    const words = this.tokenize(text);
    const vocabulary = await this.getVocabulary();
    const vector = new Array(vocabulary.length).fill(0);
    
    // Calculate term frequencies
    const termFreq: Record<string, number> = {};
    words.forEach(word => {
      termFreq[word] = (termFreq[word] || 0) + 1;
    });
    
    // Create vector based on vocabulary
    vocabulary.forEach((term, index) => {
      if (termFreq[term]) {
        vector[index] = termFreq[term] / words.length; // Normalized frequency
      }
    });
    
    return vector;
  }

  private async getVocabulary(): Promise<string[]> {
    // In production, this would be a pre-computed vocabulary from training data
    return [
      'define', 'explain', 'analyze', 'evaluate', 'create', 'apply',
      'system', 'process', 'method', 'theory', 'principle', 'concept',
      'problem', 'solution', 'approach', 'strategy', 'technique',
      'data', 'information', 'knowledge', 'skill', 'understanding'
    ];
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word);
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  async findSimilarQuestions(questionText: string, threshold: number = 0.7): Promise<SimilarityResult[]> {
    try {
      // Get all questions for comparison
      const { data: questions, error } = await supabase
        .from('questions')
        .select('id, question_text')
        .neq('question_text', questionText);

      if (error) throw error;

      const similarities: SimilarityResult[] = [];
      
      for (const question of questions || []) {
        const similarity = await this.calculateSimilarity(questionText, question.question_text);
        
        if (similarity >= threshold) {
          similarities.push({
            questionId1: 'current',
            questionId2: question.id,
            similarity,
            algorithm: 'semantic',
            confidence: 0.8
          });
        }
      }
      
      return similarities.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('Error finding similar questions:', error);
      return [];
    }
  }

  async clusterQuestions(questions: Array<{ id: string; text: string; topic: string }>): Promise<ClusterResult[]> {
    const clusters: ClusterResult[] = [];
    const processed = new Set<string>();
    
    for (const question of questions) {
      if (processed.has(question.id)) continue;
      
      const cluster: ClusterResult = {
        clusterId: `cluster_${clusters.length + 1}`,
        questions: [question.id],
        centroid: await this.getTextVector(question.text),
        coherence: 1.0,
        topic: question.topic
      };
      
      // Find similar questions for this cluster
      for (const otherQuestion of questions) {
        if (otherQuestion.id === question.id || processed.has(otherQuestion.id)) continue;
        
        const similarity = await this.calculateSimilarity(question.text, otherQuestion.text);
        
        if (similarity >= 0.6) {
          cluster.questions.push(otherQuestion.id);
          processed.add(otherQuestion.id);
        }
      }
      
      // Calculate cluster coherence
      if (cluster.questions.length > 1) {
        cluster.coherence = await this.calculateClusterCoherence(cluster.questions, questions);
      }
      
      clusters.push(cluster);
      processed.add(question.id);
    }
    
    return clusters;
  }

  private async calculateClusterCoherence(questionIds: string[], allQuestions: Array<{ id: string; text: string }>): Promise<number> {
    const clusterQuestions = allQuestions.filter(q => questionIds.includes(q.id));
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < clusterQuestions.length; i++) {
      for (let j = i + 1; j < clusterQuestions.length; j++) {
        const similarity = await this.calculateSimilarity(
          clusterQuestions[i].text,
          clusterQuestions[j].text
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 1.0;
  }

  async detectRedundancy(newQuestion: string, existingQuestions: string[], threshold: number = 0.8): Promise<{
    isRedundant: boolean;
    similarQuestions: Array<{ text: string; similarity: number }>;
    recommendation: string;
  }> {
    const similarities = await Promise.all(
      existingQuestions.map(async (existing) => ({
        text: existing,
        similarity: await this.calculateSimilarity(newQuestion, existing)
      }))
    );
    
    const highSimilarity = similarities.filter(s => s.similarity >= threshold);
    const isRedundant = highSimilarity.length > 0;
    
    let recommendation = '';
    if (isRedundant) {
      recommendation = `Question appears similar to ${highSimilarity.length} existing question(s). Consider revising or removing duplicates.`;
    } else if (similarities.some(s => s.similarity >= 0.5)) {
      recommendation = 'Question has moderate similarity to existing content. Review for potential overlap.';
    } else {
      recommendation = 'Question appears unique and adds value to the question bank.';
    }
    
    return {
      isRedundant,
      similarQuestions: highSimilarity,
      recommendation
    };
  }
}

export const semanticAnalyzer = SemanticAnalyzer.getInstance();