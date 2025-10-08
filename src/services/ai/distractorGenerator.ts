export interface DistractorOptions {
  questionText: string;
  correctAnswer: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  bloomLevel: string;
  numDistractors?: number;
}

export interface GeneratedDistractor {
  text: string;
  type: 'plausible' | 'common_misconception' | 'partial_knowledge' | 'related_concept';
  rationale: string;
  qualityScore: number;
}

export class DistractorGenerator {
  private static instance: DistractorGenerator;

  static getInstance(): DistractorGenerator {
    if (!this.instance) {
      this.instance = new DistractorGenerator();
    }
    return this.instance;
  }

  async generateDistractors(options: DistractorOptions): Promise<GeneratedDistractor[]> {
    const {
      questionText,
      correctAnswer,
      topic,
      difficulty,
      bloomLevel,
      numDistractors = 3
    } = options;

    const distractors: GeneratedDistractor[] = [];

    // Generate different types of distractors
    if (numDistractors >= 1) {
      distractors.push(this.generateCommonMisconception(correctAnswer, topic, difficulty));
    }

    if (numDistractors >= 2) {
      distractors.push(this.generatePartialKnowledge(correctAnswer, topic, bloomLevel));
    }

    if (numDistractors >= 3) {
      distractors.push(this.generateRelatedConcept(correctAnswer, topic));
    }

    if (numDistractors >= 4) {
      distractors.push(this.generatePlausibleDistractor(correctAnswer, topic, difficulty));
    }

    return distractors.slice(0, numDistractors);
  }

  private generateCommonMisconception(
    correctAnswer: string,
    topic: string,
    difficulty: string
  ): GeneratedDistractor {
    // Generate a distractor based on common misconceptions
    const misconception = this.applyMisconceptionPattern(correctAnswer, difficulty);
    
    return {
      text: misconception,
      type: 'common_misconception',
      rationale: 'Based on common student misconceptions in ' + topic,
      qualityScore: 0.85
    };
  }

  private generatePartialKnowledge(
    correctAnswer: string,
    topic: string,
    bloomLevel: string
  ): GeneratedDistractor {
    // Generate a distractor that shows partial understanding
    const partial = this.applyPartialKnowledgePattern(correctAnswer, bloomLevel);
    
    return {
      text: partial,
      type: 'partial_knowledge',
      rationale: 'Represents incomplete understanding at ' + bloomLevel + ' level',
      qualityScore: 0.80
    };
  }

  private generateRelatedConcept(
    correctAnswer: string,
    topic: string
  ): GeneratedDistractor {
    // Generate a distractor using related but incorrect concepts
    const related = this.applyRelatedConceptPattern(correctAnswer, topic);
    
    return {
      text: related,
      type: 'related_concept',
      rationale: 'Uses related concepts from ' + topic + ' domain',
      qualityScore: 0.75
    };
  }

  private generatePlausibleDistractor(
    correctAnswer: string,
    topic: string,
    difficulty: string
  ): GeneratedDistractor {
    // Generate a generally plausible wrong answer
    const plausible = this.applyPlausibilityPattern(correctAnswer, difficulty);
    
    return {
      text: plausible,
      type: 'plausible',
      rationale: 'Plausible alternative at ' + difficulty + ' difficulty',
      qualityScore: 0.70
    };
  }

  private applyMisconceptionPattern(answer: string, difficulty: string): string {
    // Pattern: Opposite or inverted concept
    const patterns = [
      (a: string) => a.replace(/increase/gi, 'decrease').replace(/decrease/gi, 'increase'),
      (a: string) => a.replace(/positive/gi, 'negative').replace(/negative/gi, 'positive'),
      (a: string) => a.replace(/before/gi, 'after').replace(/after/gi, 'before'),
    ];
    
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    return pattern(answer);
  }

  private applyPartialKnowledgePattern(answer: string, bloomLevel: string): string {
    // Pattern: Incomplete or oversimplified version
    if (bloomLevel === 'analyzing' || bloomLevel === 'evaluating') {
      return answer.split('.')[0]; // Take only first sentence
    }
    return answer.replace(/and/gi, 'or'); // Change conjunctions
  }

  private applyRelatedConceptPattern(answer: string, topic: string): string {
    // Pattern: Use terms from same domain but different context
    return `Related to ${topic}: ` + answer.split(' ').reverse().slice(0, 5).join(' ');
  }

  private applyPlausibilityPattern(answer: string, difficulty: string): string {
    // Pattern: Similar structure but different content
    const words = answer.split(' ');
    if (words.length > 3) {
      const modified = [...words];
      modified[Math.floor(words.length / 2)] = '[alternative]';
      return modified.join(' ');
    }
    return `Alternative: ${answer}`;
  }

  async evaluateDistractorQuality(
    distractor: string,
    correctAnswer: string,
    questionText: string
  ): Promise<number> {
    let quality = 0.5; // Base quality

    // Check similarity to correct answer (should be moderate)
    const similarity = this.calculateTextSimilarity(distractor, correctAnswer);
    if (similarity > 0.3 && similarity < 0.7) quality += 0.2;

    // Check plausibility (length and complexity similar)
    const lengthRatio = distractor.length / correctAnswer.length;
    if (lengthRatio > 0.7 && lengthRatio < 1.3) quality += 0.15;

    // Check for question keywords (should contain some)
    const questionWords = new Set(questionText.toLowerCase().split(' '));
    const distractorWords = distractor.toLowerCase().split(' ');
    const overlap = distractorWords.filter(w => questionWords.has(w)).length;
    if (overlap > 2) quality += 0.15;

    return Math.min(1.0, quality);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(' '));
    const words2 = new Set(text2.toLowerCase().split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

export const distractorGenerator = DistractorGenerator.getInstance();
