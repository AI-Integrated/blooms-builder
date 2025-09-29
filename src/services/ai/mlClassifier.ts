import { supabase } from '@/integrations/supabase/client';

export interface MLClassificationResult {
  bloom_level: 'remembering' | 'understanding' | 'applying' | 'analyzing' | 'evaluating' | 'creating';
  knowledge_dimension: 'factual' | 'conceptual' | 'procedural' | 'metacognitive';
  difficulty: 'easy' | 'average' | 'difficult';
  confidence: number;
  quality_score: number;
  readability_score: number;
  semantic_vector: number[];
  needs_review: boolean;
}

export interface QuestionInput {
  text: string;
  type: 'mcq' | 'essay' | 'true_false' | 'short_answer';
  topic?: string;
  choices?: Record<string, string>;
}

// Advanced ML-based classifier using multiple models
export class MLClassifier {
  private static instance: MLClassifier;
  private models: Map<string, any> = new Map();
  private initialized = false;

  static getInstance(): MLClassifier {
    if (!MLClassifier.instance) {
      MLClassifier.instance = new MLClassifier();
    }
    return MLClassifier.instance;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize pre-trained models (in production, these would be actual ML models)
      this.models.set('bloom_classifier', await this.loadBloomModel());
      this.models.set('knowledge_classifier', await this.loadKnowledgeModel());
      this.models.set('difficulty_predictor', await this.loadDifficultyModel());
      this.models.set('quality_assessor', await this.loadQualityModel());
      
      this.initialized = true;
      console.log('ML Classifier initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ML Classifier:', error);
      throw error;
    }
  }

  private async loadBloomModel() {
    // In production, this would load a trained transformer model
    return {
      predict: (text: string) => this.predictBloomLevel(text),
      confidence: (text: string) => this.calculateBloomConfidence(text)
    };
  }

  private async loadKnowledgeModel() {
    return {
      predict: (text: string) => this.predictKnowledgeDimension(text),
      confidence: (text: string) => this.calculateKnowledgeConfidence(text)
    };
  }

  private async loadDifficultyModel() {
    return {
      predict: (text: string, type: string) => this.predictDifficulty(text, type),
      confidence: (text: string) => this.calculateDifficultyConfidence(text)
    };
  }

  private async loadQualityModel() {
    return {
      assess: (question: QuestionInput) => this.assessQuality(question),
      readability: (text: string) => this.calculateReadability(text)
    };
  }

  async classifyQuestion(input: QuestionInput): Promise<MLClassificationResult> {
    await this.initialize();

    const text = input.text.toLowerCase();
    
    // Multi-model ensemble prediction
    const bloomResult = await this.classifyBloom(text);
    const knowledgeResult = await this.classifyKnowledge(text, input.type);
    const difficultyResult = await this.classifyDifficulty(text, input.type);
    const qualityResult = await this.assessQuality(input);
    const readabilityScore = await this.calculateReadability(text);
    const semanticVector = await this.generateSemanticVector(text);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence([
      bloomResult.confidence,
      knowledgeResult.confidence,
      difficultyResult.confidence
    ]);

    return {
      bloom_level: bloomResult.level,
      knowledge_dimension: knowledgeResult.dimension,
      difficulty: difficultyResult.level,
      confidence: overallConfidence,
      quality_score: qualityResult.score,
      readability_score: readabilityScore,
      semantic_vector: semanticVector,
      needs_review: overallConfidence < 0.75 || qualityResult.score < 0.7
    };
  }

  private async classifyBloom(text: string): Promise<{ level: any; confidence: number }> {
    // Enhanced Bloom's classification with contextual analysis
    const bloomPatterns = {
      remembering: {
        verbs: ['define', 'list', 'recall', 'identify', 'name', 'state', 'recognize'],
        patterns: ['what is', 'define the', 'list the', 'identify the'],
        weight: 1.0
      },
      understanding: {
        verbs: ['explain', 'describe', 'summarize', 'interpret', 'classify'],
        patterns: ['explain how', 'describe the', 'why does', 'what causes'],
        weight: 1.0
      },
      applying: {
        verbs: ['apply', 'use', 'implement', 'execute', 'solve', 'demonstrate'],
        patterns: ['apply the', 'use the', 'solve for', 'calculate the'],
        weight: 1.0
      },
      analyzing: {
        verbs: ['analyze', 'compare', 'contrast', 'examine', 'differentiate'],
        patterns: ['compare and contrast', 'analyze the', 'examine the'],
        weight: 1.0
      },
      evaluating: {
        verbs: ['evaluate', 'assess', 'judge', 'critique', 'justify'],
        patterns: ['evaluate the', 'assess whether', 'judge the'],
        weight: 1.0
      },
      creating: {
        verbs: ['create', 'design', 'develop', 'construct', 'generate'],
        patterns: ['design a', 'create a', 'develop a'],
        weight: 1.0
      }
    };

    let bestMatch = 'understanding';
    let maxScore = 0;

    for (const [level, data] of Object.entries(bloomPatterns)) {
      let score = 0;
      
      // Check for verb matches
      for (const verb of data.verbs) {
        if (text.includes(` ${verb} `) || text.startsWith(verb)) {
          score += 0.8;
        }
      }
      
      // Check for pattern matches
      for (const pattern of data.patterns) {
        if (text.includes(pattern)) {
          score += 0.6;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = level;
      }
    }

    const confidence = Math.min(1.0, maxScore + 0.3); // Base confidence
    return { level: bestMatch as any, confidence };
  }

  private async classifyKnowledge(text: string, type: string): Promise<{ dimension: any; confidence: number }> {
    const knowledgePatterns = {
      factual: {
        indicators: ['what is', 'define', 'list', 'name', 'when', 'where', 'who'],
        weight: 1.0
      },
      conceptual: {
        indicators: ['explain', 'compare', 'relationship', 'principle', 'theory'],
        weight: 1.0
      },
      procedural: {
        indicators: ['how to', 'steps', 'procedure', 'method', 'calculate'],
        weight: 1.0
      },
      metacognitive: {
        indicators: ['strategy', 'approach', 'best method', 'when to use'],
        weight: 1.0
      }
    };

    let bestMatch = 'conceptual';
    let maxScore = 0;

    for (const [dimension, data] of Object.entries(knowledgePatterns)) {
      let score = 0;
      
      for (const indicator of data.indicators) {
        if (text.includes(indicator)) {
          score += 0.7;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = dimension;
      }
    }

    // Type-based adjustments
    if (type === 'essay' && bestMatch === 'factual') {
      bestMatch = 'conceptual';
      maxScore += 0.2;
    }

    const confidence = Math.min(1.0, maxScore + 0.4);
    return { dimension: bestMatch as any, confidence };
  }

  private async classifyDifficulty(text: string, type: string): Promise<{ level: any; confidence: number }> {
    const wordCount = text.split(/\s+/).length;
    const complexityScore = (text.match(/[,:;()-]/g)?.length ?? 0);
    const syllableCount = this.estimateSyllables(text);
    
    let difficultyScore = 0;
    
    // Length-based scoring
    if (wordCount > 30) difficultyScore += 0.3;
    else if (wordCount > 15) difficultyScore += 0.1;
    
    // Complexity-based scoring
    if (complexityScore > 6) difficultyScore += 0.3;
    else if (complexityScore > 3) difficultyScore += 0.1;
    
    // Readability-based scoring
    const readabilityScore = this.calculateFleschKincaid(wordCount, syllableCount);
    if (readabilityScore > 12) difficultyScore += 0.3;
    else if (readabilityScore > 8) difficultyScore += 0.1;
    
    // Type-based adjustments
    if (type === 'essay') difficultyScore += 0.2;
    
    let level: 'easy' | 'average' | 'difficult';
    if (difficultyScore >= 0.6) level = 'difficult';
    else if (difficultyScore >= 0.3) level = 'average';
    else level = 'easy';
    
    const confidence = Math.min(1.0, 0.6 + difficultyScore);
    return { level, confidence };
  }

  private async assessQuality(question: QuestionInput): Promise<{ score: number; issues: string[] }> {
    const issues: string[] = [];
    let score = 1.0;

    // Text quality checks
    if (question.text.length < 10) {
      issues.push('Question text too short');
      score -= 0.2;
    }

    if (question.text.length > 200) {
      issues.push('Question text may be too long');
      score -= 0.1;
    }

    // Grammar and clarity checks (simplified)
    if (!/[?.]$/.test(question.text.trim())) {
      issues.push('Question should end with proper punctuation');
      score -= 0.1;
    }

    // MCQ-specific quality checks
    if (question.type === 'mcq' && question.choices) {
      const choices = Object.values(question.choices);
      
      if (choices.length < 3) {
        issues.push('Multiple choice questions should have at least 3 options');
        score -= 0.3;
      }

      // Check for similar choices
      const similarities = this.checkChoiceSimilarity(choices);
      if (similarities > 0.8) {
        issues.push('Answer choices are too similar');
        score -= 0.2;
      }

      // Check choice length balance
      const lengths = choices.map(c => c.length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / lengths.length;
      
      if (variance > 100) {
        issues.push('Answer choices have unbalanced lengths');
        score -= 0.1;
      }
    }

    return { score: Math.max(0, score), issues };
  }

  private calculateReadability(text: string): number {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = this.estimateSyllables(text);
    
    // Flesch-Kincaid Grade Level
    return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  }

  private estimateSyllables(text: string): number {
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiou]{2,}/g, 'a')
      .replace(/[^aeiou]/g, '')
      .length || 1;
  }

  private calculateFleschKincaid(words: number, syllables: number): number {
    const sentences = Math.max(1, Math.floor(words / 15)); // Estimate sentences
    return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  }

  private checkChoiceSimilarity(choices: string[]): number {
    let maxSimilarity = 0;
    
    for (let i = 0; i < choices.length; i++) {
      for (let j = i + 1; j < choices.length; j++) {
        const similarity = this.calculateTextSimilarity(choices[i], choices[j]);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }
    
    return maxSimilarity;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private async generateSemanticVector(text: string): Promise<number[]> {
    // Simplified semantic vector generation
    // In production, this would use actual embeddings from a transformer model
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(100).fill(0);
    
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      vector[hash % 100] += 1;
    });
    
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private calculateOverallConfidence(confidences: number[]): number {
    const average = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - average, 2), 0) / confidences.length;
    
    // Penalize high variance (inconsistent predictions)
    return Math.max(0.1, average - Math.sqrt(variance) * 0.5);
  }

  private predictBloomLevel(text: string): string {
    // Enhanced prediction logic would go here
    return 'understanding';
  }

  private calculateBloomConfidence(text: string): number {
    // Enhanced confidence calculation would go here
    return 0.8;
  }

  private predictKnowledgeDimension(text: string): string {
    // Enhanced prediction logic would go here
    return 'conceptual';
  }

  private calculateKnowledgeConfidence(text: string): number {
    // Enhanced confidence calculation would go here
    return 0.75;
  }

  private predictDifficulty(text: string, type: string): string {
    // Enhanced prediction logic would go here
    return 'average';
  }

  private calculateDifficultyConfidence(text: string): number {
    // Enhanced confidence calculation would go here
    return 0.7;
  }

  async batchClassify(questions: QuestionInput[]): Promise<MLClassificationResult[]> {
    await this.initialize();
    
    const results = await Promise.all(
      questions.map(question => this.classifyQuestion(question))
    );
    
    return results;
  }

  async updateModelPerformance(questionId: string, actualClassification: any, predictedClassification: any) {
    // Track model performance for continuous improvement - simplified for now
    try {
      console.log('ML model performance tracked (mock)', {
        question_id: questionId,
        model_version: '1.0',
        predicted: predictedClassification,
        actual: actualClassification,
        accuracy_score: this.calculateAccuracy(actualClassification, predictedClassification)
      });
    } catch (error) {
      console.error('Error tracking model performance:', error);
    }
  }

  private calculateAccuracy(actual: any, predicted: any): number {
    let matches = 0;
    let total = 0;
    
    for (const key of ['bloom_level', 'knowledge_dimension', 'difficulty']) {
      total++;
      if (actual[key] === predicted[key]) {
        matches++;
      }
    }
    
    return matches / total;
  }
}

export const mlClassifier = MLClassifier.getInstance();