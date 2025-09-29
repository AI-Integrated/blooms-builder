export interface ConfidenceFactors {
  verbMatch: number;          // 0-1: How well question verbs match Bloom's level
  contextMatch: number;       // 0-1: How well context matches knowledge dimension
  structuralClarity: number;  // 0-1: Question structure and clarity
  domainSpecificity: number;  // 0-1: How domain-specific the question is
  linguisticComplexity: number; // 0-1: Appropriate complexity for level
  validationHistory: number;  // 0-1: Historical validation accuracy
}

export interface ConfidenceResult {
  overallConfidence: number;
  factors: ConfidenceFactors;
  explanation: string;
  recommendations: string[];
  needsReview: boolean;
}

export class ConfidenceScorer {
  private static readonly BLOOM_VERBS: Record<string, string[]> = {
    remembering: ['define', 'list', 'recall', 'identify', 'name', 'state', 'recognize', 'select', 'match', 'choose'],
    understanding: ['explain', 'describe', 'summarize', 'interpret', 'classify', 'compare', 'contrast', 'illustrate'],
    applying: ['apply', 'use', 'execute', 'implement', 'solve', 'demonstrate', 'operate', 'calculate', 'show'],
    analyzing: ['analyze', 'examine', 'investigate', 'categorize', 'differentiate', 'distinguish', 'organize'],
    evaluating: ['evaluate', 'assess', 'judge', 'critique', 'justify', 'defend', 'support', 'argue', 'decide'],
    creating: ['create', 'design', 'develop', 'construct', 'generate', 'produce', 'plan', 'compose', 'formulate']
  };

  private static readonly KNOWLEDGE_INDICATORS: Record<string, string[]> = {
    factual: ['what is', 'define', 'list', 'name', 'identify', 'when', 'where', 'who', 'which'],
    conceptual: ['explain', 'compare', 'relationship', 'why', 'how does', 'principle', 'theory', 'model'],
    procedural: ['calculate', 'solve', 'demonstrate', 'how to', 'steps', 'procedure', 'method', 'algorithm'],
    metacognitive: ['evaluate', 'assess', 'best method', 'strategy', 'approach', 'reflect', 'monitor', 'plan']
  };

  static calculateConfidence(
    questionText: string,
    questionType: string,
    predictedBloom: string,
    predictedKnowledge: string,
    topic?: string,
    validationHistory?: Array<{ correct: boolean; confidence: number }>
  ): ConfidenceResult {
    const factors = this.analyzeConfidenceFactors(
      questionText,
      questionType,
      predictedBloom,
      predictedKnowledge,
      topic,
      validationHistory
    );

    const overallConfidence = this.calculateOverallScore(factors);
    const explanation = this.generateExplanation(factors, overallConfidence);
    const recommendations = this.generateRecommendations(factors);
    const needsReview = overallConfidence < 0.7 || factors.structuralClarity < 0.6;

    return {
      overallConfidence,
      factors,
      explanation,
      recommendations,
      needsReview
    };
  }

  private static analyzeConfidenceFactors(
    questionText: string,
    questionType: string,
    predictedBloom: string,
    predictedKnowledge: string,
    topic?: string,
    validationHistory?: Array<{ correct: boolean; confidence: number }>
  ): ConfidenceFactors {
    const text = questionText.toLowerCase();

    // 1. Verb Match Analysis
    const verbMatch = this.calculateVerbMatch(text, predictedBloom);

    // 2. Context Match Analysis
    const contextMatch = this.calculateContextMatch(text, predictedKnowledge);

    // 3. Structural Clarity Analysis
    const structuralClarity = this.calculateStructuralClarity(questionText, questionType);

    // 4. Domain Specificity Analysis
    const domainSpecificity = this.calculateDomainSpecificity(text, topic);

    // 5. Linguistic Complexity Analysis
    const linguisticComplexity = this.calculateLinguisticComplexity(text, predictedBloom);

    // 6. Validation History Analysis
    const validationHistoryScore = this.calculateValidationHistory(validationHistory);

    return {
      verbMatch,
      contextMatch,
      structuralClarity,
      domainSpecificity,
      linguisticComplexity,
      validationHistory: validationHistoryScore
    };
  }

  private static calculateVerbMatch(text: string, predictedBloom: string): number {
    const bloomVerbs = this.BLOOM_VERBS[predictedBloom.toLowerCase()] || [];
    let matches = 0;
    let totalVerbs = 0;

    // Check for direct verb matches
    for (const verb of bloomVerbs) {
      if (text.includes(` ${verb} `) || text.startsWith(verb) || text.includes(`${verb}:`)) {
        matches++;
      }
      totalVerbs++;
    }

    // Check for related action words
    const actionWords = text.match(/\b(what|how|why|when|where|which|describe|explain|analyze|create|evaluate)\b/g) || [];
    const relevantActions = actionWords.filter(word => bloomVerbs.includes(word)).length;

    const directMatch = totalVerbs > 0 ? matches / totalVerbs : 0;
    const contextualMatch = actionWords.length > 0 ? relevantActions / actionWords.length : 0;

    return Math.max(directMatch, contextualMatch * 0.7);
  }

  private static calculateContextMatch(text: string, predictedKnowledge: string): number {
    const indicators = this.KNOWLEDGE_INDICATORS[predictedKnowledge.toLowerCase()] || [];
    let matches = 0;

    for (const indicator of indicators) {
      if (text.includes(indicator)) {
        matches++;
      }
    }

    // Base score from indicator matches
    let score = indicators.length > 0 ? Math.min(1, matches / indicators.length * 2) : 0.5;

    // Contextual adjustments
    if (predictedKnowledge === 'factual' && (text.includes('define') || text.includes('what is'))) {
      score = Math.max(score, 0.8);
    }
    
    if (predictedKnowledge === 'procedural' && (text.includes('how to') || text.includes('calculate'))) {
      score = Math.max(score, 0.8);
    }

    if (predictedKnowledge === 'metacognitive' && (text.includes('best') || text.includes('strategy'))) {
      score = Math.max(score, 0.8);
    }

    return Math.min(1, score);
  }

  private static calculateStructuralClarity(questionText: string, questionType: string): number {
    let score = 0.5; // base score

    // Length appropriateness
    const wordCount = questionText.split(/\s+/).length;
    if (wordCount >= 8 && wordCount <= 30) {
      score += 0.2; // Good length
    } else if (wordCount < 5 || wordCount > 50) {
      score -= 0.2; // Too short or too long
    }

    // Grammar and punctuation
    if (/[.?!]$/.test(questionText.trim())) {
      score += 0.1; // Proper ending punctuation
    }

    // Question structure
    if (questionText.includes('?') || questionText.toLowerCase().startsWith('what') || 
        questionText.toLowerCase().startsWith('how') || questionText.toLowerCase().startsWith('why')) {
      score += 0.1; // Clear question structure
    }

    // Type-specific checks
    if (questionType === 'mcq') {
      // MCQ should be clear and specific
      if (!questionText.includes('which of the following') && wordCount > 20) {
        score -= 0.1; // Potentially unclear MCQ
      }
    }

    if (questionType === 'essay') {
      // Essays should be open-ended
      if (wordCount < 10) {
        score -= 0.2; // Too brief for essay prompt
      }
    }

    return Math.min(1, Math.max(0, score));
  }

  private static calculateDomainSpecificity(text: string, topic?: string): number {
    if (!topic) return 0.5;

    const topicWords = topic.toLowerCase().split(/\s+/);
    const textWords = text.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const topicWord of topicWords) {
      if (textWords.some(word => word.includes(topicWord) || topicWord.includes(word))) {
        matches++;
      }
    }

    const directMatch = topicWords.length > 0 ? matches / topicWords.length : 0;

    // Domain-specific terminology bonus
    const technicalTerms = text.match(/\b[A-Z]{2,}\b/g)?.length || 0; // Acronyms
    const domainBonus = Math.min(0.2, technicalTerms * 0.05);

    return Math.min(1, directMatch + domainBonus);
  }

  private static calculateLinguisticComplexity(text: string, predictedBloom: string): number {
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const avgSentenceLength = words.length / sentenceCount;

    // Expected complexity by Bloom's level
    const expectedComplexity = {
      remembering: { wordLength: 5, sentenceLength: 8 },
      understanding: { wordLength: 6, sentenceLength: 12 },
      applying: { wordLength: 6, sentenceLength: 15 },
      analyzing: { wordLength: 7, sentenceLength: 18 },
      evaluating: { wordLength: 7, sentenceLength: 20 },
      creating: { wordLength: 8, sentenceLength: 22 }
    };

    const expected = expectedComplexity[predictedBloom.toLowerCase() as keyof typeof expectedComplexity] || 
                    expectedComplexity.understanding;

    // Calculate how well actual complexity matches expected
    const wordLengthMatch = 1 - Math.abs(avgWordLength - expected.wordLength) / expected.wordLength;
    const sentenceLengthMatch = 1 - Math.abs(avgSentenceLength - expected.sentenceLength) / expected.sentenceLength;

    return Math.max(0, (wordLengthMatch + sentenceLengthMatch) / 2);
  }

  private static calculateValidationHistory(
    validationHistory?: Array<{ correct: boolean; confidence: number }>
  ): number {
    if (!validationHistory || validationHistory.length === 0) {
      return 0.5; // Neutral score for no history
    }

    const correctValidations = validationHistory.filter(v => v.correct).length;
    const accuracy = correctValidations / validationHistory.length;
    
    // Weight recent validations more heavily
    const weightedScore = validationHistory.reduce((sum, validation, index) => {
      const weight = Math.pow(0.9, validationHistory.length - index - 1); // Recent validations have higher weight
      return sum + (validation.correct ? weight : 0);
    }, 0);

    const weightedAccuracy = weightedScore / validationHistory.length;

    return Math.min(1, (accuracy + weightedAccuracy) / 2);
  }

  private static calculateOverallScore(factors: ConfidenceFactors): number {
    // Weighted combination of factors
    const weights = {
      verbMatch: 0.25,
      contextMatch: 0.20,
      structuralClarity: 0.20,
      domainSpecificity: 0.15,
      linguisticComplexity: 0.10,
      validationHistory: 0.10
    };

    return Object.entries(weights).reduce((sum, [factor, weight]) => {
      return sum + (factors[factor as keyof ConfidenceFactors] * weight);
    }, 0);
  }

  private static generateExplanation(factors: ConfidenceFactors, overallConfidence: number): string {
    const explanations: string[] = [];

    if (factors.verbMatch > 0.8) {
      explanations.push('Strong verb alignment with Bloom\'s level');
    } else if (factors.verbMatch < 0.4) {
      explanations.push('Weak verb alignment with predicted Bloom\'s level');
    }

    if (factors.contextMatch > 0.8) {
      explanations.push('Clear knowledge dimension indicators');
    } else if (factors.contextMatch < 0.4) {
      explanations.push('Unclear knowledge dimension context');
    }

    if (factors.structuralClarity < 0.5) {
      explanations.push('Question structure could be clearer');
    }

    if (factors.domainSpecificity > 0.7) {
      explanations.push('Good domain-specific terminology');
    }

    if (overallConfidence > 0.8) {
      return `High confidence classification. ${explanations.join('. ')}.`;
    } else if (overallConfidence > 0.6) {
      return `Moderate confidence classification. ${explanations.join('. ')}.`;
    } else {
      return `Low confidence classification. ${explanations.join('. ')}. Manual review recommended.`;
    }
  }

  private static generateRecommendations(factors: ConfidenceFactors): string[] {
    const recommendations: string[] = [];

    if (factors.verbMatch < 0.6) {
      recommendations.push('Consider using more specific action verbs that align with the intended Bloom\'s level');
    }

    if (factors.contextMatch < 0.6) {
      recommendations.push('Add more context clues to clarify the knowledge dimension');
    }

    if (factors.structuralClarity < 0.6) {
      recommendations.push('Improve question structure and clarity');
    }

    if (factors.domainSpecificity < 0.5) {
      recommendations.push('Include more domain-specific terminology');
    }

    if (factors.linguisticComplexity < 0.4) {
      recommendations.push('Adjust linguistic complexity to match the cognitive level');
    }

    return recommendations;
  }

  static batchCalculateConfidence(
    questions: Array<{
      text: string;
      type: string;
      bloom: string;
      knowledge: string;
      topic?: string;
    }>
  ): ConfidenceResult[] {
    return questions.map(q => 
      this.calculateConfidence(q.text, q.type, q.bloom, q.knowledge, q.topic)
    );
  }

  static updateConfidenceWithValidation(
    originalConfidence: number,
    validationResult: { correct: boolean; teacherConfidence: number }
  ): number {
    // Adjust confidence based on teacher validation
    if (validationResult.correct) {
      // Teacher agreed - boost confidence
      return Math.min(1, originalConfidence + (1 - originalConfidence) * 0.3);
    } else {
      // Teacher disagreed - reduce confidence
      return Math.max(0.1, originalConfidence * 0.5);
    }
  }

  static getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  static getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  }
}