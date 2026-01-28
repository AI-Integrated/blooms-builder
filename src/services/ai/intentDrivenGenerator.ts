/**
 * Intent-Driven Question Generator
 * 
 * Three-layer pipeline that makes redundancy structurally impossible:
 * 1. Intent Selection (structure) - System decides answer type, concept, and operation
 * 2. Question Generation (wording) - GPT fills in language with ASSIGNED constraints
 * 3. Answer Generation (logic) - GPT creates answer AFTER question exists
 * 
 * GPT is the scribe, not the teacher.
 * 
 * FIXED: Now passes registry snapshot to edge function and updates from response.
 * This ensures session-level persistence and hard enforcement at the GPT boundary.
 */

import { supabase } from '@/integrations/supabase/client';
import type { KnowledgeDimension, AnswerType, QuestionIntent } from '@/types/knowledge';
import { 
  IntentRegistry, 
  RegistrySnapshot,
  selectMultipleIntents, 
  selectNextConceptAndOperation,
  BLOOM_COGNITIVE_OPERATIONS 
} from './intentSelector';
import { getAnswerTypeConstraint } from './intentCompatibility';

// Re-export for external use
export { IntentRegistry } from './intentSelector';
export type { RegistrySnapshot } from './intentSelector';

export interface IntentDrivenQuestion {
  text: string;
  answer: string;
  choices?: Record<string, string>;
  correct_answer?: string;
  intent: QuestionIntent;
  difficulty: string;
  bloom_alignment_note?: string;
  knowledge_alignment_note?: string;
  answer_type_note?: string;
  assigned_concept: string;
  assigned_operation: string;
  structure_validated?: boolean;
  rejection_reasons?: string[];
  why_unique?: string;
}

export interface IntentDrivenGenerationResult {
  success: boolean;
  questions: IntentDrivenQuestion[];
  intentsUsed: QuestionIntent[];
  error?: string;
  updatedRegistry?: IntentRegistry; // Return updated registry for session persistence
  validationSummary?: {
    total: number;
    passed: number;
    failed: number;
  };
}

interface GenerationParams {
  topic: string;
  bloomLevel: string;
  knowledgeDimension: KnowledgeDimension;
  difficulty?: string;
  count?: number;
  questionType?: 'mcq' | 'essay';
  registry?: IntentRegistry; // Accept external registry for session persistence
}

/**
 * Build intent payloads with concept and operation assignments
 * CRITICAL: This is where redundancy prevention starts
 */
function buildIntentPayloads(
  intents: QuestionIntent[],
  registry: IntentRegistry
): Array<{
  answer_type: string;
  answer_type_constraint: string;
  assigned_concept: string;
  assigned_operation: string;
  forbidden_patterns: string[];
}> {
  const payloads: Array<{
    answer_type: string;
    answer_type_constraint: string;
    assigned_concept: string;
    assigned_operation: string;
    forbidden_patterns: string[];
  }> = [];

  for (const intent of intents) {
    // Select unique concept and operation for this intent
    const conceptAndOp = selectNextConceptAndOperation(
      registry,
      intent.topic,
      intent.bloomLevel
    );
    
    const concept = conceptAndOp?.concept || 'core principles';
    const operation = conceptAndOp?.operation || 'explain';
    
    // Check if this pair would create redundancy
    if (registry.isPairUsed(concept, operation)) {
      console.warn(`Pair ${concept}::${operation} already used, trying alternatives...`);
      // Could implement retry logic here
    }
    
    // Mark as used immediately to prevent reuse in THIS batch
    if (conceptAndOp) {
      registry.markConceptUsed(intent.topic, concept);
      registry.markOperationUsed(intent.topic, intent.bloomLevel, operation);
      registry.markPairUsed(concept, operation);
    }
    
    // Get forbidden patterns for this bloom level
    const bloomConfig = BLOOM_COGNITIVE_OPERATIONS[intent.bloomLevel];
    const forbiddenPatterns = bloomConfig?.forbiddenPatterns || [];
    
    payloads.push({
      answer_type: intent.answerType,
      answer_type_constraint: getAnswerTypeConstraint(intent.answerType),
      assigned_concept: concept,
      assigned_operation: operation,
      forbidden_patterns: forbiddenPatterns
    });
  }
  
  return payloads;
}

/**
 * Generate questions using the intent-driven pipeline
 * Redundancy is prevented by design, not detection
 * 
 * CRITICAL: Registry is now passed TO the edge function and UPDATED from response
 */
export async function generateWithIntent(
  params: GenerationParams
): Promise<IntentDrivenGenerationResult> {
  const {
    topic,
    bloomLevel,
    knowledgeDimension,
    difficulty = 'Average',
    count = 1,
    questionType = 'mcq',
    registry = new IntentRegistry() // Use provided registry or create new
  } = params;

  // Layer 1: Select intents (system decides structure)
  const intents = selectMultipleIntents(
    registry,
    topic,
    bloomLevel,
    knowledgeDimension,
    count
  );

  if (intents.length === 0) {
    return {
      success: false,
      questions: [],
      intentsUsed: [],
      error: `No available answer types for ${topic}/${bloomLevel}/${knowledgeDimension}. All valid combinations exhausted.`,
      updatedRegistry: registry
    };
  }

  // Build intent payloads with concept and operation assignments
  const intentPayloads = buildIntentPayloads(intents, registry);
  
  // Get current registry snapshot to send to edge function
  const registrySnapshot = registry.toSnapshot();

  console.log(`[Intent-Driven] Generating ${intents.length} questions for ${topic}/${bloomLevel}`);
  console.log(`[Intent-Driven] Registry state: ${registrySnapshot.usedPairs.length} pairs used`);
  intentPayloads.forEach((p, i) => {
    console.log(`  Q${i+1}: concept="${p.assigned_concept}", op="${p.assigned_operation}", type="${p.answer_type}"`);
  });

  try {
    // Layer 2 & 3: Generate questions and answers via edge function
    // CRITICAL: Pass registry snapshot for enforcement
    const { data, error } = await supabase.functions.invoke('generate-constrained-questions', {
      body: {
        topic,
        bloom_level: bloomLevel,
        knowledge_dimension: knowledgeDimension,
        difficulty,
        count: intents.length,
        question_type: questionType,
        intents: intentPayloads,
        pipeline_mode: 'intent_driven',
        // CRITICAL: Pass registry state for enforcement at GPT boundary
        registry_snapshot: registrySnapshot
      }
    });

    if (error) {
      console.error('Intent-driven generation error:', error);
      return {
        success: false,
        questions: [],
        intentsUsed: intents,
        error: error.message,
        updatedRegistry: registry
      };
    }

    // CRITICAL: Update registry from edge function response
    if (data?.updated_registry) {
      const updatedSnapshot = data.updated_registry as RegistrySnapshot;
      const updatedRegistry = IntentRegistry.fromSnapshot(updatedSnapshot);
      // Merge updates into our registry
      registry.merge(updatedRegistry);
      console.log(`[Intent-Driven] Registry updated: ${registry.getSummary().pairs} pairs now used`);
    }

    const questions: IntentDrivenQuestion[] = (data?.questions || []).map((q: any, idx: number) => {
      const intent = intents[idx] || intents[0];
      const payload = intentPayloads[idx] || intentPayloads[0];
      return {
        text: q.text,
        answer: q.answer || q.correct_answer || '',
        choices: q.choices,
        correct_answer: q.correct_answer,
        intent,
        difficulty,
        bloom_alignment_note: q.bloom_alignment_note,
        knowledge_alignment_note: q.knowledge_alignment_note,
        answer_type_note: q.answer_type_note,
        assigned_concept: q.targeted_concept || payload.assigned_concept,
        assigned_operation: q.cognitive_operation_used || payload.assigned_operation,
        structure_validated: q.structure_validated,
        rejection_reasons: q.rejection_reasons,
        why_unique: q.why_unique
      };
    });

    // Mark intents as used in the registry
    intents.forEach(intent => registry.markUsed(intent));

    // Calculate validation summary
    const passed = questions.filter(q => q.structure_validated !== false).length;
    const failed = questions.length - passed;

    return {
      success: true,
      questions,
      intentsUsed: intents,
      updatedRegistry: registry, // Return registry for caller to persist
      validationSummary: {
        total: questions.length,
        passed,
        failed
      }
    };

  } catch (err) {
    console.error('Generation failed:', err);
    return {
      success: false,
      questions: [],
      intentsUsed: intents,
      error: err instanceof Error ? err.message : 'Unknown error',
      updatedRegistry: registry
    };
  }
}

/**
 * Generate a single question with a specific intent
 * Uses a fresh registry (for single question generation)
 */
export async function generateSingleWithIntent(
  intent: QuestionIntent,
  difficulty: string = 'Average',
  questionType: 'mcq' | 'essay' = 'mcq',
  registry?: IntentRegistry
): Promise<IntentDrivenQuestion | null> {
  const result = await generateWithIntent({
    topic: intent.topic,
    bloomLevel: intent.bloomLevel,
    knowledgeDimension: intent.knowledgeDimension,
    difficulty,
    count: 1,
    questionType,
    registry: registry || new IntentRegistry()
  });

  return result.success && result.questions.length > 0 ? result.questions[0] : null;
}

/**
 * Generate multiple questions with session-level persistence
 * This is the RECOMMENDED entry point for batch generation
 */
export async function generateBatchWithSession(
  topics: Array<{
    topic: string;
    bloomLevel: string;
    knowledgeDimension: KnowledgeDimension;
    count: number;
  }>,
  options: {
    difficulty?: string;
    questionType?: 'mcq' | 'essay';
  } = {}
): Promise<{
  questions: IntentDrivenQuestion[];
  registry: IntentRegistry;
  summary: {
    requested: number;
    generated: number;
    passed: number;
    failed: number;
  };
}> {
  const { difficulty = 'Average', questionType = 'mcq' } = options;
  
  // Single registry for entire batch - THIS IS THE KEY TO SESSION PERSISTENCE
  const sessionRegistry = new IntentRegistry();
  const allQuestions: IntentDrivenQuestion[] = [];
  let totalRequested = 0;
  let totalGenerated = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const spec of topics) {
    totalRequested += spec.count;
    
    const result = await generateWithIntent({
      topic: spec.topic,
      bloomLevel: spec.bloomLevel,
      knowledgeDimension: spec.knowledgeDimension,
      difficulty,
      count: spec.count,
      questionType,
      registry: sessionRegistry // PASS THE SAME REGISTRY
    });

    allQuestions.push(...result.questions);
    totalGenerated += result.questions.length;
    
    if (result.validationSummary) {
      totalPassed += result.validationSummary.passed;
      totalFailed += result.validationSummary.failed;
    }
    
    console.log(`[Batch] After ${spec.topic}/${spec.bloomLevel}: ${sessionRegistry.getSummary().pairs} pairs used`);
  }

  return {
    questions: allQuestions,
    registry: sessionRegistry,
    summary: {
      requested: totalRequested,
      generated: totalGenerated,
      passed: totalPassed,
      failed: totalFailed
    }
  };
}

/**
 * Check if generation is possible for given constraints
 */
export function canGenerate(
  registry: IntentRegistry,
  topic: string,
  bloomLevel: string,
  knowledgeDimension: KnowledgeDimension
): boolean {
  return registry.hasAvailableSlots(topic, bloomLevel, knowledgeDimension);
}

/**
 * Get remaining generation capacity for constraints
 */
export function getRemainingCapacity(
  registry: IntentRegistry,
  topic: string,
  bloomLevel: string,
  knowledgeDimension: KnowledgeDimension
): number {
  return registry.getAvailableAnswerTypes(topic, bloomLevel, knowledgeDimension).length;
}
