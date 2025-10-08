export interface LearningObjective {
  id: string;
  code: string;
  description: string;
  bloomLevel: string;
  knowledgeDimension: string;
  domain: string;
}

export interface AlignmentScore {
  objective: LearningObjective;
  score: number;
  rationale: string;
  bloomAlignment: number;
  knowledgeAlignment: number;
  contentAlignment: number;
}

export interface AlignmentResult {
  question: {
    id?: string;
    text: string;
    bloomLevel: string;
    knowledgeDimension: string;
  };
  alignments: AlignmentScore[];
  bestAlignment: AlignmentScore | null;
  overallQuality: number;
  recommendations: string[];
}

export class ObjectiveAligner {
  private static instance: ObjectiveAligner;

  static getInstance(): ObjectiveAligner {
    if (!this.instance) {
      this.instance = new ObjectiveAligner();
    }
    return this.instance;
  }

  async alignToObjectives(
    questionText: string,
    questionBloom: string,
    questionKnowledge: string,
    objectives: LearningObjective[],
    threshold: number = 0.6
  ): Promise<AlignmentResult> {
    const alignments: AlignmentScore[] = [];

    for (const objective of objectives) {
      const score = await this.calculateAlignmentScore(
        questionText,
        questionBloom,
        questionKnowledge,
        objective
      );

      if (score.score >= threshold) {
        alignments.push(score);
      }
    }

    // Sort by score descending
    alignments.sort((a, b) => b.score - a.score);

    const bestAlignment = alignments.length > 0 ? alignments[0] : null;
    const overallQuality = this.assessAlignmentQuality(alignments);
    const recommendations = this.generateAlignmentRecommendations(
      alignments,
      questionBloom,
      questionKnowledge
    );

    return {
      question: {
        text: questionText,
        bloomLevel: questionBloom,
        knowledgeDimension: questionKnowledge
      },
      alignments,
      bestAlignment,
      overallQuality,
      recommendations
    };
  }

  private async calculateAlignmentScore(
    questionText: string,
    questionBloom: string,
    questionKnowledge: string,
    objective: LearningObjective
  ): Promise<AlignmentScore> {
    // Calculate Bloom's taxonomy alignment
    const bloomAlignment = this.calculateBloomAlignment(
      questionBloom,
      objective.bloomLevel
    );

    // Calculate knowledge dimension alignment
    const knowledgeAlignment = this.calculateKnowledgeAlignment(
      questionKnowledge,
      objective.knowledgeDimension
    );

    // Calculate content/semantic alignment
    const contentAlignment = this.calculateContentAlignment(
      questionText,
      objective.description
    );

    // Weighted overall score
    const score = (
      bloomAlignment * 0.35 +
      knowledgeAlignment * 0.25 +
      contentAlignment * 0.40
    );

    const rationale = this.generateAlignmentRationale(
      bloomAlignment,
      knowledgeAlignment,
      contentAlignment,
      objective
    );

    return {
      objective,
      score,
      rationale,
      bloomAlignment,
      knowledgeAlignment,
      contentAlignment
    };
  }

  private calculateBloomAlignment(
    questionBloom: string,
    objectiveBloom: string
  ): number {
    const bloomLevels = [
      'remembering',
      'understanding',
      'applying',
      'analyzing',
      'evaluating',
      'creating'
    ];

    const qIndex = bloomLevels.indexOf(questionBloom.toLowerCase());
    const oIndex = bloomLevels.indexOf(objectiveBloom.toLowerCase());

    if (qIndex === -1 || oIndex === -1) return 0.5;

    // Exact match = 1.0
    if (qIndex === oIndex) return 1.0;

    // One level difference = 0.7
    if (Math.abs(qIndex - oIndex) === 1) return 0.7;

    // Two levels = 0.4
    if (Math.abs(qIndex - oIndex) === 2) return 0.4;

    // Three+ levels = 0.2
    return 0.2;
  }

  private calculateKnowledgeAlignment(
    questionKnowledge: string,
    objectiveKnowledge: string
  ): number {
    const knowledgeDimensions = [
      'factual',
      'conceptual',
      'procedural',
      'metacognitive'
    ];

    const qIndex = knowledgeDimensions.indexOf(questionKnowledge.toLowerCase());
    const oIndex = knowledgeDimensions.indexOf(objectiveKnowledge.toLowerCase());

    if (qIndex === -1 || oIndex === -1) return 0.5;

    // Exact match
    if (qIndex === oIndex) return 1.0;

    // Adjacent dimensions
    if (Math.abs(qIndex - oIndex) === 1) return 0.6;

    // Far apart
    return 0.3;
  }

  private calculateContentAlignment(
    questionText: string,
    objectiveDescription: string
  ): number {
    const questionTokens = this.tokenize(questionText);
    const objectiveTokens = this.tokenize(objectiveDescription);

    // Calculate Jaccard similarity
    const intersection = questionTokens.filter(t => objectiveTokens.includes(t));
    const union = [...new Set([...questionTokens, ...objectiveTokens])];

    const jaccardSimilarity = intersection.length / union.length;

    // Also check for key concept matching
    const keyConceptMatch = this.checkKeyConceptMatch(questionText, objectiveDescription);

    // Weighted combination
    return jaccardSimilarity * 0.6 + keyConceptMatch * 0.4;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 3) // Filter out short words
      .filter(token => !this.isStopWord(token));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'or', 'but',
      'in', 'with', 'a', 'an', 'to', 'for', 'of', 'as', 'by'
    ]);
    return stopWords.has(word);
  }

  private checkKeyConceptMatch(text1: string, text2: string): number {
    // Extract potential key concepts (capitalized terms, technical terms)
    const concepts1 = this.extractKeyConcepts(text1);
    const concepts2 = this.extractKeyConcepts(text2);

    if (concepts1.length === 0 || concepts2.length === 0) return 0.5;

    const matches = concepts1.filter(c1 =>
      concepts2.some(c2 => c1.toLowerCase() === c2.toLowerCase())
    );

    return matches.length / Math.max(concepts1.length, concepts2.length);
  }

  private extractKeyConcepts(text: string): string[] {
    // Match capitalized terms, acronyms, and technical terms
    const patterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Capitalized terms
      /\b[A-Z]{2,}\b/g, // Acronyms
      /\b\w+(?:tion|ment|ness|ity|ence|ance)\b/g // Technical suffixes
    ];

    const concepts: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      concepts.push(...matches);
    }

    return [...new Set(concepts)];
  }

  private generateAlignmentRationale(
    bloomAlignment: number,
    knowledgeAlignment: number,
    contentAlignment: number,
    objective: LearningObjective
  ): string {
    const parts: string[] = [];

    if (bloomAlignment >= 0.9) {
      parts.push('Perfect Bloom\'s level match');
    } else if (bloomAlignment >= 0.7) {
      parts.push('Good Bloom\'s level alignment');
    } else {
      parts.push('Moderate Bloom\'s level alignment');
    }

    if (knowledgeAlignment >= 0.9) {
      parts.push('exact knowledge dimension');
    } else if (knowledgeAlignment >= 0.6) {
      parts.push('compatible knowledge dimension');
    }

    if (contentAlignment >= 0.7) {
      parts.push('strong content overlap');
    } else if (contentAlignment >= 0.5) {
      parts.push('moderate content overlap');
    } else {
      parts.push('some content overlap');
    }

    return `${parts.join(', ')} with objective ${objective.code}`;
  }

  private assessAlignmentQuality(alignments: AlignmentScore[]): number {
    if (alignments.length === 0) return 0;

    // Quality based on best score and number of good alignments
    const bestScore = alignments[0].score;
    const goodAlignments = alignments.filter(a => a.score >= 0.7).length;

    return Math.min(1.0, bestScore * 0.7 + (goodAlignments / Math.max(alignments.length, 1)) * 0.3);
  }

  private generateAlignmentRecommendations(
    alignments: AlignmentScore[],
    questionBloom: string,
    questionKnowledge: string
  ): string[] {
    const recommendations: string[] = [];

    if (alignments.length === 0) {
      recommendations.push('No learning objectives aligned - review question relevance');
      return recommendations;
    }

    const bestAlignment = alignments[0];

    if (bestAlignment.score < 0.7) {
      recommendations.push('Low alignment score - consider revising question');
    }

    if (bestAlignment.bloomAlignment < 0.6) {
      recommendations.push(
        `Consider adjusting to ${bestAlignment.objective.bloomLevel} level for better alignment`
      );
    }

    if (bestAlignment.contentAlignment < 0.5) {
      recommendations.push('Strengthen content connection to learning objective');
    }

    if (alignments.length > 3 && alignments[0].score - alignments[3].score < 0.2) {
      recommendations.push('Question aligns with multiple objectives - ensure focus is clear');
    }

    if (recommendations.length === 0) {
      recommendations.push('Strong alignment with learning objectives');
    }

    return recommendations;
  }

  async batchAlign(
    questions: Array<{
      text: string;
      bloomLevel: string;
      knowledgeDimension: string;
    }>,
    objectives: LearningObjective[]
  ): Promise<AlignmentResult[]> {
    return Promise.all(
      questions.map(q =>
        this.alignToObjectives(q.text, q.bloomLevel, q.knowledgeDimension, objectives)
      )
    );
  }
}

export const objectiveAligner = ObjectiveAligner.getInstance();
