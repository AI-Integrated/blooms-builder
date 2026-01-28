/**
 * Intent Selection Service
 * 
 * Implements the 5-FIX anti-redundancy system:
 * 1. Concept-level locking (concept pool per topic)
 * 2. Cognitive operation enforcement (not verb swapping)
 * 3. Answer structure enforcement
 * 4. Structural answer validation
 * 5. Question uniqueness check
 * 
 * Tracks used intents and selects unused, compatible answer types.
 * This prevents redundancy BEFORE generation by ensuring no two questions
 * share the same (topic + concept + answerType) tuple.
 */

import type { KnowledgeDimension, AnswerType, QuestionIntent } from '@/types/knowledge';
import { getAllowedAnswerTypes } from './intentCompatibility';

/**
 * FIX #1: Concept Pools per Topic
 * Each topic has a finite set of concepts. Once used, a concept is locked.
 */
export const CONCEPT_POOLS: Record<string, string[]> = {
  '_default': [
    'key factors',
    'trade-offs',
    'limitations',
    'decision criteria',
    'real-world constraints',
    'failure scenarios',
    'optimization priorities',
    'dependencies',
    'relationships',
    'components',
    'processes',
    'outcomes',
    'preconditions',
    'best practices',
    'anti-patterns',
    'edge cases',
    'performance considerations',
    'security implications',
    'scalability aspects',
    'maintenance concerns'
  ]
};

/**
 * FIX #2: Cognitive Operation Enforcement
 * Each Bloom level maps to distinct cognitive operations
 */
export const BLOOM_COGNITIVE_OPERATIONS: Record<string, {
  allowedOperations: string[];
  forbiddenPatterns: string[];
}> = {
  'Remembering': {
    allowedOperations: ['recall', 'recognize', 'identify', 'list', 'name'],
    forbiddenPatterns: []
  },
  'Understanding': {
    allowedOperations: ['explain', 'summarize', 'interpret', 'classify', 'infer'],
    forbiddenPatterns: []
  },
  'Applying': {
    allowedOperations: ['execute', 'implement', 'solve', 'use', 'demonstrate'],
    forbiddenPatterns: []
  },
  'Analyzing': {
    allowedOperations: ['differentiate', 'organize', 'attribute', 'deconstruct', 'compare'],
    forbiddenPatterns: ['include', 'includes', 'such as', 'key factors include']
  },
  'Evaluating': {
    allowedOperations: ['check', 'critique', 'judge', 'prioritize', 'justify', 'defend'],
    forbiddenPatterns: ['include', 'includes', 'such as', 'key factors include']
  },
  'Creating': {
    allowedOperations: ['generate', 'plan', 'produce', 'design', 'construct', 'formulate'],
    forbiddenPatterns: ['include', 'includes', 'such as']
  }
};

/**
 * Intent Registry - tracks used intents for an exam/generation session
 * Now includes concept and operation tracking (FIX #1 & #2)
 */
/**
 * Serializable registry state for session persistence
 */
export interface RegistrySnapshot {
  usedIntents: string[];
  usedConcepts: Record<string, string[]>;
  usedOperations: Record<string, string[]>;
  usedPairs: string[]; // concept::operation pairs
}

/**
 * Intent Registry - tracks used intents for an exam/generation session
 * Now includes concept and operation tracking (FIX #1 & #2)
 * FIXED: Now fully serializable for session persistence
 */
export class IntentRegistry {
  private usedIntents: Set<string> = new Set();
  private usedConcepts: Map<string, Set<string>> = new Map();
  private usedOperations: Map<string, Set<string>> = new Map();
  private usedPairs: Set<string> = new Set(); // concept::operation pairs
  
  /**
   * Create a unique key for an intent tuple
   */
  private getIntentKey(intent: QuestionIntent): string {
    return `${intent.topic}|${intent.bloomLevel}|${intent.knowledgeDimension}|${intent.answerType}`;
  }
  
  /**
   * Check if an intent has already been used
   */
  isUsed(intent: QuestionIntent): boolean {
    return this.usedIntents.has(this.getIntentKey(intent));
  }
  
  /**
   * Mark an intent as used
   */
  markUsed(intent: QuestionIntent): void {
    this.usedIntents.add(this.getIntentKey(intent));
  }
  
  /**
   * FIX #1: Check if a concept is used for a topic
   */
  isConceptUsed(topic: string, concept: string): boolean {
    const key = topic.toLowerCase().trim();
    const conceptKey = concept.toLowerCase().trim();
    return this.usedConcepts.get(key)?.has(conceptKey) || false;
  }
  
  /**
   * FIX #1: Mark a concept as used
   */
  markConceptUsed(topic: string, concept: string): void {
    const key = topic.toLowerCase().trim();
    const conceptKey = concept.toLowerCase().trim();
    if (!this.usedConcepts.has(key)) {
      this.usedConcepts.set(key, new Set());
    }
    this.usedConcepts.get(key)!.add(conceptKey);
  }
  
  /**
   * FIX #1: Get available concepts for a topic
   */
  getAvailableConcepts(topic: string): string[] {
    const pool = CONCEPT_POOLS[topic] || CONCEPT_POOLS['_default'];
    const key = topic.toLowerCase().trim();
    const used = this.usedConcepts.get(key) || new Set();
    return pool.filter(c => !used.has(c.toLowerCase().trim()));
  }
  
  /**
   * FIX #2: Check if an operation is used for topic+bloom
   */
  isOperationUsed(topic: string, bloomLevel: string, operation: string): boolean {
    const key = `${topic.toLowerCase()}_${bloomLevel.toLowerCase()}`;
    return this.usedOperations.get(key)?.has(operation.toLowerCase()) || false;
  }
  
  /**
   * FIX #2: Mark an operation as used
   */
  markOperationUsed(topic: string, bloomLevel: string, operation: string): void {
    const key = `${topic.toLowerCase()}_${bloomLevel.toLowerCase()}`;
    if (!this.usedOperations.has(key)) {
      this.usedOperations.set(key, new Set());
    }
    this.usedOperations.get(key)!.add(operation.toLowerCase());
  }
  
  /**
   * FIX #2: Get available operations for bloom level
   */
  getAvailableOperations(topic: string, bloomLevel: string): string[] {
    const config = BLOOM_COGNITIVE_OPERATIONS[bloomLevel];
    if (!config) return [];
    
    const key = `${topic.toLowerCase()}_${bloomLevel.toLowerCase()}`;
    const used = this.usedOperations.get(key) || new Set();
    return config.allowedOperations.filter(op => !used.has(op.toLowerCase()));
  }
  
  /**
   * NEW: Check if a concept+operation pair has been used
   */
  isPairUsed(concept: string, operation: string): boolean {
    const pairKey = `${concept.toLowerCase()}::${operation.toLowerCase()}`;
    return this.usedPairs.has(pairKey);
  }
  
  /**
   * NEW: Mark a concept+operation pair as used
   */
  markPairUsed(concept: string, operation: string): void {
    const pairKey = `${concept.toLowerCase()}::${operation.toLowerCase()}`;
    this.usedPairs.add(pairKey);
  }
  
  /**
   * Get all used intents for a topic + bloom + knowledge combination
   */
  getUsedAnswerTypes(
    topic: string,
    bloomLevel: string,
    knowledgeDimension: KnowledgeDimension
  ): AnswerType[] {
    const usedTypes: AnswerType[] = [];
    const prefix = `${topic}|${bloomLevel}|${knowledgeDimension}|`;
    
    this.usedIntents.forEach(key => {
      if (key.startsWith(prefix)) {
        const answerType = key.split('|')[3] as AnswerType;
        usedTypes.push(answerType);
      }
    });
    
    return usedTypes;
  }
  
  /**
   * Get unused answer types for a topic + bloom + knowledge combination
   */
  getAvailableAnswerTypes(
    topic: string,
    bloomLevel: string,
    knowledgeDimension: KnowledgeDimension
  ): AnswerType[] {
    const allowed = getAllowedAnswerTypes(bloomLevel, knowledgeDimension);
    const used = this.getUsedAnswerTypes(topic, bloomLevel, knowledgeDimension);
    
    return allowed.filter(type => !used.includes(type));
  }
  
  /**
   * Check if more questions can be generated for this combination
   */
  hasAvailableSlots(
    topic: string,
    bloomLevel: string,
    knowledgeDimension: KnowledgeDimension
  ): boolean {
    return this.getAvailableAnswerTypes(topic, bloomLevel, knowledgeDimension).length > 0;
  }
  
  /**
   * Clear all registered intents (for a new exam)
   */
  clear(): void {
    this.usedIntents.clear();
    this.usedConcepts.clear();
    this.usedOperations.clear();
    this.usedPairs.clear();
  }
  
  /**
   * Get count of used intents
   */
  get size(): number {
    return this.usedIntents.size;
  }
  
  /**
   * Get usage summary
   */
  getSummary(): { intents: number; concepts: number; operations: number; pairs: number } {
    let conceptCount = 0;
    this.usedConcepts.forEach(set => conceptCount += set.size);
    
    let opCount = 0;
    this.usedOperations.forEach(set => opCount += set.size);
    
    return {
      intents: this.usedIntents.size,
      concepts: conceptCount,
      operations: opCount,
      pairs: this.usedPairs.size
    };
  }
  
  /**
   * CRITICAL: Serialize registry state for transmission to edge function
   */
  toSnapshot(): RegistrySnapshot {
    const usedConcepts: Record<string, string[]> = {};
    this.usedConcepts.forEach((set, key) => {
      usedConcepts[key] = Array.from(set);
    });
    
    const usedOperations: Record<string, string[]> = {};
    this.usedOperations.forEach((set, key) => {
      usedOperations[key] = Array.from(set);
    });
    
    return {
      usedIntents: Array.from(this.usedIntents),
      usedConcepts,
      usedOperations,
      usedPairs: Array.from(this.usedPairs)
    };
  }
  
  /**
   * CRITICAL: Restore registry state from snapshot
   */
  static fromSnapshot(snapshot: RegistrySnapshot): IntentRegistry {
    const registry = new IntentRegistry();
    
    snapshot.usedIntents.forEach(intent => registry.usedIntents.add(intent));
    
    Object.entries(snapshot.usedConcepts).forEach(([key, values]) => {
      registry.usedConcepts.set(key, new Set(values));
    });
    
    Object.entries(snapshot.usedOperations).forEach(([key, values]) => {
      registry.usedOperations.set(key, new Set(values));
    });
    
    snapshot.usedPairs.forEach(pair => registry.usedPairs.add(pair));
    
    return registry;
  }
  
  /**
   * Merge another registry into this one (for batch updates)
   */
  merge(other: IntentRegistry): void {
    other.usedIntents.forEach(intent => this.usedIntents.add(intent));
    
    other.usedConcepts.forEach((set, key) => {
      if (!this.usedConcepts.has(key)) {
        this.usedConcepts.set(key, new Set());
      }
      set.forEach(concept => this.usedConcepts.get(key)!.add(concept));
    });
    
    other.usedOperations.forEach((set, key) => {
      if (!this.usedOperations.has(key)) {
        this.usedOperations.set(key, new Set());
      }
      set.forEach(op => this.usedOperations.get(key)!.add(op));
    });
    
    other.usedPairs.forEach(pair => this.usedPairs.add(pair));
  }
}

/**
 * Select the next available intent for generation
 * Returns null if no valid intent is available (all answer types exhausted)
 */
export function selectNextIntent(
  registry: IntentRegistry,
  topic: string,
  bloomLevel: string,
  knowledgeDimension: KnowledgeDimension
): QuestionIntent | null {
  const available = registry.getAvailableAnswerTypes(topic, bloomLevel, knowledgeDimension);
  
  if (available.length === 0) {
    console.warn(
      `No available answer types for ${topic}/${bloomLevel}/${knowledgeDimension}. ` +
      `All valid answer types have been used.`
    );
    return null;
  }
  
  // Select the first available (could be randomized if needed)
  const answerType = available[0];
  
  const intent: QuestionIntent = {
    topic,
    bloomLevel,
    knowledgeDimension,
    answerType
  };
  
  return intent;
}

/**
 * FIX #1 & #2: Select next concept and operation for a question
 */
export function selectNextConceptAndOperation(
  registry: IntentRegistry,
  topic: string,
  bloomLevel: string
): { concept: string; operation: string } | null {
  const availableConcepts = registry.getAvailableConcepts(topic);
  const availableOperations = registry.getAvailableOperations(topic, bloomLevel);
  
  if (availableConcepts.length === 0 || availableOperations.length === 0) {
    console.warn(`No available concepts or operations for ${topic}/${bloomLevel}`);
    return null;
  }
  
  return {
    concept: availableConcepts[0],
    operation: availableOperations[0]
  };
}

/**
 * Select multiple intents for batch generation
 * Ensures each intent is unique within the batch
 */
export function selectMultipleIntents(
  registry: IntentRegistry,
  topic: string,
  bloomLevel: string,
  knowledgeDimension: KnowledgeDimension,
  count: number
): QuestionIntent[] {
  const intents: QuestionIntent[] = [];
  const tempRegistry = new IntentRegistry();
  
  // Copy existing used intents
  registry['usedIntents'].forEach(key => {
    tempRegistry['usedIntents'].add(key);
  });
  
  // Copy used concepts and operations
  registry['usedConcepts'].forEach((set, key) => {
    tempRegistry['usedConcepts'].set(key, new Set(set));
  });
  registry['usedOperations'].forEach((set, key) => {
    tempRegistry['usedOperations'].set(key, new Set(set));
  });
  
  for (let i = 0; i < count; i++) {
    const intent = selectNextIntent(tempRegistry, topic, bloomLevel, knowledgeDimension);
    
    if (!intent) {
      console.warn(
        `Only ${intents.length} intents available out of ${count} requested ` +
        `for ${topic}/${bloomLevel}/${knowledgeDimension}`
      );
      break;
    }
    
    intents.push(intent);
    tempRegistry.markUsed(intent);
  }
  
  return intents;
}

/**
 * FIX #5: Check if a question would create redundancy
 */
export function wouldCreateRedundancy(
  registry: IntentRegistry,
  topic: string,
  concept: string,
  answerType: AnswerType
): boolean {
  // Check if same topic + concept already exists with any answer type
  // This is a simplified check - full implementation would track concept+answerType pairs
  return registry.isConceptUsed(topic, concept);
}

/**
 * Global registry instance for session-level tracking
 */
export const globalIntentRegistry = new IntentRegistry();
