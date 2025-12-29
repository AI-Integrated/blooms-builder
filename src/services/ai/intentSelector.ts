/**
 * Intent Selection Service
 * 
 * Tracks used intents and selects unused, compatible answer types.
 * This prevents redundancy BEFORE generation by ensuring no two questions
 * share the same (topic + bloomLevel + knowledgeDimension + answerType) tuple.
 */

import type { KnowledgeDimension, AnswerType, QuestionIntent } from '@/types/knowledge';
import { getAllowedAnswerTypes } from './intentCompatibility';

/**
 * Intent Registry - tracks used intents for an exam/generation session
 */
export class IntentRegistry {
  private usedIntents: Set<string> = new Set();
  
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
  }
  
  /**
   * Get count of used intents
   */
  get size(): number {
    return this.usedIntents.size;
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
 * Global registry instance for session-level tracking
 */
export const globalIntentRegistry = new IntentRegistry();
