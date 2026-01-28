/**
 * Question Uniqueness Checker
 * FIX #5: Ensures no two questions assess the same learning outcome
 * using the same mental process.
 */

import type { AnswerType, KnowledgeDimension } from '@/types/knowledge';

export interface QuestionFingerprint {
  topic: string;
  concept: string;
  answerType: AnswerType;
  bloomLevel: string;
  knowledgeDimension: KnowledgeDimension;
}

/**
 * Extract concept from question text
 * Identifies what the question is actually asking about
 */
export function extractConcept(questionText: string): string {
  const lowerText = questionText.toLowerCase();
  
  // Common concept patterns
  const conceptPatterns = [
    // "key factors of X"
    /(?:key|main|primary|important)\s+(?:factors?|elements?|components?|aspects?)\s+(?:of|in|for)\s+([^?.,]+)/i,
    // "what are the X of Y"
    /what\s+(?:are|is)\s+(?:the\s+)?([^?.,]+)/i,
    // "how does X affect Y"
    /how\s+(?:does|do|can|should)\s+([^?.,]+)\s+(?:affect|influence|impact)/i,
    // "compare X and Y"
    /compare\s+([^?.,]+)\s+(?:and|with|to)/i,
    // "differentiate between X and Y"
    /differentiate\s+(?:between\s+)?([^?.,]+)/i,
    // "evaluate the X"
    /evaluate\s+(?:the\s+)?([^?.,]+)/i,
    // "design a X"
    /design\s+(?:a\s+)?([^?.,]+)/i,
    // General: focus on the subject after common verbs
    /(?:explain|describe|analyze|assess|discuss|examine)\s+(?:the\s+)?([^?.,]+)/i
  ];
  
  for (const pattern of conceptPatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 50); // Cap at 50 chars
    }
  }
  
  // Fallback: extract main noun phrase (first significant words after question word)
  const words = lowerText
    .replace(/[?.,!]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'which', 'when', 'where', 'how', 'does', 'the', 'are', 'can', 'should', 'would', 'could'].includes(w));
  
  return words.slice(0, 3).join(' ') || 'general';
}

/**
 * Create a fingerprint for a question
 */
export function createQuestionFingerprint(
  questionText: string,
  topic: string,
  answerType: AnswerType,
  bloomLevel: string,
  knowledgeDimension: KnowledgeDimension
): QuestionFingerprint {
  return {
    topic: topic.toLowerCase().trim(),
    concept: extractConcept(questionText),
    answerType,
    bloomLevel,
    knowledgeDimension
  };
}

/**
 * Question Uniqueness Store
 * Tracks question fingerprints to prevent duplicates
 */
export class QuestionUniquenessStore {
  private fingerprints: Map<string, QuestionFingerprint> = new Map();
  
  /**
   * Create a hash key from a fingerprint
   */
  private createKey(fp: QuestionFingerprint): string {
    return `${fp.topic}|${fp.concept}|${fp.answerType}|${fp.bloomLevel}|${fp.knowledgeDimension}`;
  }
  
  /**
   * Create a partial key for concept-only matching
   */
  private createConceptKey(topic: string, concept: string): string {
    return `${topic.toLowerCase()}|${concept.toLowerCase()}`;
  }
  
  /**
   * Check if a question is unique
   * FIX #5: Prevents same topic + concept + answer_type combinations
   */
  isUnique(fingerprint: QuestionFingerprint): { unique: boolean; reason?: string } {
    const fullKey = this.createKey(fingerprint);
    
    // Check exact match
    if (this.fingerprints.has(fullKey)) {
      return {
        unique: false,
        reason: `Duplicate intent: same topic, concept, answer type, bloom level, and knowledge dimension`
      };
    }
    
    // Check for same topic + concept + answer_type (regardless of bloom/knowledge)
    for (const [, existingFp] of this.fingerprints) {
      if (
        existingFp.topic === fingerprint.topic &&
        existingFp.concept === fingerprint.concept &&
        existingFp.answerType === fingerprint.answerType
      ) {
        return {
          unique: false,
          reason: `Redundant question: same topic "${fingerprint.topic}", concept "${fingerprint.concept}", and answer type "${fingerprint.answerType}"`
        };
      }
    }
    
    return { unique: true };
  }
  
  /**
   * Check if adding would create redundancy and suggest alternatives
   */
  checkWithSuggestions(fingerprint: QuestionFingerprint): {
    unique: boolean;
    reason?: string;
    suggestions?: AnswerType[];
  } {
    const result = this.isUnique(fingerprint);
    
    if (!result.unique) {
      // Find answer types not yet used for this topic+concept
      const usedTypes = new Set<AnswerType>();
      for (const [, fp] of this.fingerprints) {
        if (fp.topic === fingerprint.topic && fp.concept === fingerprint.concept) {
          usedTypes.add(fp.answerType);
        }
      }
      
      const allTypes: AnswerType[] = [
        'definition', 'explanation', 'comparison', 'procedure',
        'application', 'evaluation', 'justification', 'analysis',
        'design', 'construction'
      ];
      
      const available = allTypes.filter(t => !usedTypes.has(t));
      return { ...result, suggestions: available };
    }
    
    return result;
  }
  
  /**
   * Register a question fingerprint
   */
  register(fingerprint: QuestionFingerprint): void {
    const key = this.createKey(fingerprint);
    this.fingerprints.set(key, fingerprint);
  }
  
  /**
   * Get all registered fingerprints
   */
  getAll(): QuestionFingerprint[] {
    return Array.from(this.fingerprints.values());
  }
  
  /**
   * Get count by topic
   */
  getCountByTopic(topic: string): number {
    let count = 0;
    for (const [, fp] of this.fingerprints) {
      if (fp.topic === topic.toLowerCase()) {
        count++;
      }
    }
    return count;
  }
  
  /**
   * Get concepts used for a topic
   */
  getConceptsForTopic(topic: string): string[] {
    const concepts = new Set<string>();
    for (const [, fp] of this.fingerprints) {
      if (fp.topic === topic.toLowerCase()) {
        concepts.add(fp.concept);
      }
    }
    return Array.from(concepts);
  }
  
  /**
   * Clear all fingerprints
   */
  clear(): void {
    this.fingerprints.clear();
  }
  
  /**
   * Get stats
   */
  getStats(): {
    totalQuestions: number;
    topicsCovered: number;
    conceptsCovered: number;
    answerTypesUsed: Set<AnswerType>;
  } {
    const topics = new Set<string>();
    const concepts = new Set<string>();
    const answerTypes = new Set<AnswerType>();
    
    for (const [, fp] of this.fingerprints) {
      topics.add(fp.topic);
      concepts.add(`${fp.topic}:${fp.concept}`);
      answerTypes.add(fp.answerType);
    }
    
    return {
      totalQuestions: this.fingerprints.size,
      topicsCovered: topics.size,
      conceptsCovered: concepts.size,
      answerTypesUsed: answerTypes
    };
  }
}

// Singleton for session-level tracking
export const globalUniquenessStore = new QuestionUniquenessStore();

/**
 * Validate before saving - FIX #5 implementation
 */
export function shouldRegenerateQuestion(
  questionText: string,
  topic: string,
  answerType: AnswerType,
  bloomLevel: string,
  knowledgeDimension: KnowledgeDimension,
  store: QuestionUniquenessStore = globalUniquenessStore
): { regenerate: boolean; reason?: string; suggestions?: AnswerType[] } {
  const fingerprint = createQuestionFingerprint(
    questionText,
    topic,
    answerType,
    bloomLevel,
    knowledgeDimension
  );
  
  const result = store.checkWithSuggestions(fingerprint);
  
  return {
    regenerate: !result.unique,
    reason: result.reason,
    suggestions: result.suggestions
  };
}
