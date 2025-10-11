import { ConfidenceScorer } from './confidenceScoring';

export interface POSAnalysis {
  verbs: string[];
  actionVerbs: string[];
  questionWords: string[];
  keywords: string[];
  complexity: number;
}

export interface RuleBasedResult {
  bloomLevel: string;
  knowledgeDimension: string;
  difficulty: string;
  confidence: number;
  evidence: {
    matchedVerbs: string[];
    matchedKeywords: string[];
    matchedPatterns: string[];
    posAnalysis: POSAnalysis;
  };
  explanation: string;
}

export class RuleBasedClassifier {
  private static readonly BLOOM_VERB_HIERARCHY = {
    remembering: {
      verbs: ['define', 'list', 'recall', 'identify', 'name', 'state', 'recognize', 'select', 'match', 'label', 'memorize', 'repeat', 'duplicate'],
      patterns: [/what is/i, /define (the )?/i, /list (the )?/i, /identify (the )?/i, /name (the )?/i],
      weight: 1.0,
      confidence: 0.9
    },
    understanding: {
      verbs: ['explain', 'describe', 'summarize', 'interpret', 'classify', 'compare', 'contrast', 'illustrate', 'paraphrase', 'translate'],
      patterns: [/explain (how|why)/i, /describe (the )?/i, /what (causes|happens)/i, /compare (and contrast)?/i],
      weight: 1.0,
      confidence: 0.85
    },
    applying: {
      verbs: ['apply', 'use', 'execute', 'implement', 'solve', 'demonstrate', 'operate', 'calculate', 'show', 'practice', 'compute'],
      patterns: [/apply (the )?/i, /use (the )?/i, /solve (for|the)?/i, /calculate (the )?/i, /how would you/i],
      weight: 1.0,
      confidence: 0.85
    },
    analyzing: {
      verbs: ['analyze', 'examine', 'investigate', 'categorize', 'differentiate', 'distinguish', 'organize', 'deconstruct', 'integrate'],
      patterns: [/analyze (the )?/i, /compare and contrast/i, /examine (the )?/i, /what is the relationship/i],
      weight: 1.0,
      confidence: 0.8
    },
    evaluating: {
      verbs: ['evaluate', 'assess', 'judge', 'critique', 'justify', 'defend', 'support', 'argue', 'decide', 'rate', 'prioritize'],
      patterns: [/evaluate (the )?/i, /assess (whether|the)?/i, /judge (the )?/i, /do you agree/i, /justify (your)?/i],
      weight: 1.0,
      confidence: 0.8
    },
    creating: {
      verbs: ['create', 'design', 'develop', 'construct', 'generate', 'produce', 'plan', 'compose', 'formulate', 'invent', 'devise'],
      patterns: [/design (a|an)?/i, /create (a|an)?/i, /develop (a|an)?/i, /propose (a|an)?/i],
      weight: 1.0,
      confidence: 0.8
    }
  };

  private static readonly KNOWLEDGE_INDICATORS = {
    factual: {
      keywords: ['what', 'when', 'where', 'who', 'which', 'define', 'list', 'name', 'identify', 'term', 'fact', 'date', 'place'],
      patterns: [/what is (the|a|an)?/i, /who (is|was|were)/i, /when (did|was)/i, /where (is|was)/i],
      confidence: 0.85
    },
    conceptual: {
      keywords: ['explain', 'why', 'how', 'relationship', 'principle', 'theory', 'concept', 'model', 'framework', 'category'],
      patterns: [/why (does|is|do)/i, /how (does|do|is)/i, /explain (the )?relationship/i, /what is the principle/i],
      confidence: 0.8
    },
    procedural: {
      keywords: ['calculate', 'solve', 'demonstrate', 'steps', 'procedure', 'method', 'process', 'algorithm', 'technique', 'how to'],
      patterns: [/how (to|do you)/i, /what (are the )?steps/i, /calculate (the )?/i, /solve (for|the)?/i],
      confidence: 0.85
    },
    metacognitive: {
      keywords: ['strategy', 'approach', 'best', 'evaluate', 'assess', 'plan', 'monitor', 'reflect', 'when to use', 'appropriate'],
      patterns: [/what (is the )?(best|most appropriate)/i, /when (should|would) you (use)?/i, /evaluate (your|the) (approach|strategy)/i],
      confidence: 0.75
    }
  };

  static performPOSAnalysis(text: string): POSAnalysis {
    const words = text.toLowerCase().split(/\s+/);
    
    // Extract verbs (simplified - in production use NLP library)
    const commonVerbs = [
      'define', 'list', 'recall', 'identify', 'name', 'state', 'recognize',
      'explain', 'describe', 'summarize', 'interpret', 'classify', 'compare',
      'apply', 'use', 'execute', 'implement', 'solve', 'demonstrate',
      'analyze', 'examine', 'investigate', 'categorize', 'differentiate',
      'evaluate', 'assess', 'judge', 'critique', 'justify',
      'create', 'design', 'develop', 'construct', 'generate'
    ];

    const verbs = words.filter(word => 
      commonVerbs.some(verb => word.includes(verb))
    );

    const actionVerbs = verbs.filter(verb =>
      Object.values(this.BLOOM_VERB_HIERARCHY)
        .flatMap(level => level.verbs)
        .includes(verb)
    );

    const questionWords = ['what', 'when', 'where', 'who', 'why', 'how', 'which'];
    const foundQuestionWords = words.filter(word => questionWords.includes(word));

    // Extract keywords (domain-specific terms, capitalized words, etc.)
    const keywords = text.match(/\b[A-Z][a-z]+\b/g) || [];
    
    // Calculate complexity based on word length and sentence structure
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const complexity = Math.min(1, avgWordLength / 8);

    return {
      verbs,
      actionVerbs,
      questionWords: foundQuestionWords,
      keywords,
      complexity
    };
  }

  static extractKeywords(text: string, topic?: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were']);
    
    // Filter out stop words and short words
    let keywords = words.filter(word => 
      !stopWords.has(word) && 
      word.length > 3 &&
      /^[a-z]+$/.test(word)
    );

    // Add capitalized terms
    const capitalizedTerms = (text.match(/\b[A-Z][a-z]+\b/g) || []).map(w => w.toLowerCase());
    keywords = [...new Set([...keywords, ...capitalizedTerms])];

    // Add topic-related keywords if available
    if (topic) {
      const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      keywords = [...new Set([...keywords, ...topicWords])];
    }

    return keywords;
  }

  static classifyQuestion(
    questionText: string,
    questionType: string,
    topic?: string
  ): RuleBasedResult {
    const text = questionText.toLowerCase();
    const posAnalysis = this.performPOSAnalysis(questionText);
    const keywords = this.extractKeywords(questionText, topic);

    // 1. Classify Bloom's Level
    const bloomResult = this.classifyBloomLevel(text, posAnalysis);
    
    // 2. Classify Knowledge Dimension
    const knowledgeResult = this.classifyKnowledgeDimension(text, keywords);
    
    // 3. Determine Difficulty
    const difficulty = this.determineDifficulty(questionText, questionType, posAnalysis);

    // 4. Calculate overall confidence
    const confidence = (bloomResult.confidence + knowledgeResult.confidence) / 2;

    // 5. Generate explanation
    const explanation = this.generateExplanation(bloomResult, knowledgeResult, posAnalysis);

    return {
      bloomLevel: bloomResult.level,
      knowledgeDimension: knowledgeResult.dimension,
      difficulty,
      confidence,
      evidence: {
        matchedVerbs: bloomResult.matchedVerbs,
        matchedKeywords: knowledgeResult.matchedKeywords,
        matchedPatterns: [...bloomResult.matchedPatterns, ...knowledgeResult.matchedPatterns],
        posAnalysis
      },
      explanation
    };
  }

  private static classifyBloomLevel(text: string, posAnalysis: POSAnalysis): {
    level: string;
    confidence: number;
    matchedVerbs: string[];
    matchedPatterns: string[];
  } {
    let bestMatch = { level: 'understanding', score: 0, confidence: 0.5 };
    const matchedVerbs: string[] = [];
    const matchedPatterns: string[] = [];

    for (const [level, data] of Object.entries(this.BLOOM_VERB_HIERARCHY)) {
      let score = 0;
      
      // Check for verb matches
      for (const verb of data.verbs) {
        if (text.includes(` ${verb} `) || text.startsWith(verb + ' ')) {
          score += 1.0;
          matchedVerbs.push(verb);
        }
      }
      
      // Check for pattern matches
      for (const pattern of data.patterns) {
        if (pattern.test(text)) {
          score += 0.8;
          matchedPatterns.push(pattern.source);
        }
      }
      
      // Bonus for multiple indicators
      if (matchedVerbs.length > 1) {
        score *= 1.2;
      }
      
      if (score > bestMatch.score) {
        bestMatch = {
          level,
          score,
          confidence: Math.min(0.95, data.confidence * (1 + score * 0.1))
        };
      }
    }

    return {
      level: bestMatch.level,
      confidence: bestMatch.confidence,
      matchedVerbs,
      matchedPatterns
    };
  }

  private static classifyKnowledgeDimension(text: string, keywords: string[]): {
    dimension: string;
    confidence: number;
    matchedKeywords: string[];
    matchedPatterns: string[];
  } {
    let bestMatch = { dimension: 'conceptual', score: 0, confidence: 0.5 };
    const matchedKeywords: string[] = [];
    const matchedPatterns: string[] = [];

    for (const [dimension, data] of Object.entries(this.KNOWLEDGE_INDICATORS)) {
      let score = 0;
      
      // Check for keyword matches
      for (const keyword of data.keywords) {
        if (text.includes(keyword)) {
          score += 0.7;
          matchedKeywords.push(keyword);
        }
      }
      
      // Check for pattern matches
      for (const pattern of data.patterns) {
        if (pattern.test(text)) {
          score += 0.9;
          matchedPatterns.push(pattern.source);
        }
      }
      
      // Check extracted keywords overlap
      const keywordOverlap = keywords.filter(k => 
        data.keywords.some(dk => dk.includes(k) || k.includes(dk))
      ).length;
      
      score += keywordOverlap * 0.3;
      
      if (score > bestMatch.score) {
        bestMatch = {
          dimension,
          score,
          confidence: Math.min(0.95, data.confidence * (1 + score * 0.1))
        };
      }
    }

    return {
      dimension: bestMatch.dimension,
      confidence: bestMatch.confidence,
      matchedKeywords,
      matchedPatterns
    };
  }

  private static determineDifficulty(
    questionText: string,
    questionType: string,
    posAnalysis: POSAnalysis
  ): string {
    const wordCount = questionText.split(/\s+/).length;
    const sentenceCount = questionText.split(/[.!?]+/).filter(s => s.trim()).length;
    const avgSentenceLength = wordCount / Math.max(1, sentenceCount);
    
    let difficultyScore = 0;

    // Length-based scoring
    if (wordCount > 30) difficultyScore += 0.3;
    else if (wordCount > 15) difficultyScore += 0.1;
    else difficultyScore -= 0.1;

    // Complexity-based scoring
    if (posAnalysis.complexity > 0.7) difficultyScore += 0.3;
    else if (posAnalysis.complexity > 0.5) difficultyScore += 0.1;

    // Sentence structure
    if (avgSentenceLength > 20) difficultyScore += 0.2;
    else if (avgSentenceLength > 15) difficultyScore += 0.1;

    // Type-based adjustments
    if (questionType === 'essay') difficultyScore += 0.2;
    else if (questionType === 'true_false') difficultyScore -= 0.2;

    // Verb complexity
    if (posAnalysis.actionVerbs.length > 2) difficultyScore += 0.1;

    // Determine final difficulty
    if (difficultyScore >= 0.5) return 'difficult';
    if (difficultyScore >= 0.2) return 'average';
    return 'easy';
  }

  private static generateExplanation(
    bloomResult: { level: string; matchedVerbs: string[]; matchedPatterns: string[] },
    knowledgeResult: { dimension: string; matchedKeywords: string[]; matchedPatterns: string[] },
    posAnalysis: POSAnalysis
  ): string {
    const parts: string[] = [];

    if (bloomResult.matchedVerbs.length > 0) {
      parts.push(`Identified action verbs: "${bloomResult.matchedVerbs.join('", "')}" suggesting ${bloomResult.level} level`);
    }

    if (bloomResult.matchedPatterns.length > 0) {
      parts.push(`Question structure patterns indicate ${bloomResult.level} cognitive level`);
    }

    if (knowledgeResult.matchedKeywords.length > 0) {
      parts.push(`Keywords suggest ${knowledgeResult.dimension} knowledge type`);
    }

    if (posAnalysis.complexity > 0.6) {
      parts.push(`High linguistic complexity detected`);
    }

    return parts.join('. ') + '.';
  }

  static combineWithMLClassification(
    ruleBasedResult: RuleBasedResult,
    mlResult: {
      bloom_level: string;
      knowledge_dimension: string;
      difficulty: string;
      confidence: number;
    }
  ): {
    bloomLevel: string;
    knowledgeDimension: string;
    difficulty: string;
    confidence: number;
    method: 'rule-based' | 'ml' | 'ensemble';
    explanation: string;
  } {
    // If both agree, high confidence
    if (ruleBasedResult.bloomLevel === mlResult.bloom_level &&
        ruleBasedResult.knowledgeDimension === mlResult.knowledge_dimension) {
      return {
        bloomLevel: mlResult.bloom_level,
        knowledgeDimension: mlResult.knowledge_dimension,
        difficulty: mlResult.difficulty,
        confidence: Math.min(0.98, (ruleBasedResult.confidence + mlResult.confidence) / 2 + 0.1),
        method: 'ensemble',
        explanation: `Both rule-based and ML models agree. ${ruleBasedResult.explanation}`
      };
    }

    // If they disagree, use the one with higher confidence
    if (ruleBasedResult.confidence > mlResult.confidence) {
      return {
        bloomLevel: ruleBasedResult.bloomLevel,
        knowledgeDimension: ruleBasedResult.knowledgeDimension,
        difficulty: ruleBasedResult.difficulty,
        confidence: ruleBasedResult.confidence * 0.9, // Slight penalty for disagreement
        method: 'rule-based',
        explanation: `Rule-based classification preferred due to higher confidence. ${ruleBasedResult.explanation}`
      };
    }

    return {
      bloomLevel: mlResult.bloom_level,
      knowledgeDimension: mlResult.knowledge_dimension,
      difficulty: mlResult.difficulty,
      confidence: mlResult.confidence * 0.9, // Slight penalty for disagreement
      method: 'ml',
      explanation: `ML classification preferred due to higher confidence. Models disagreed, requiring review.`
    };
  }
}
