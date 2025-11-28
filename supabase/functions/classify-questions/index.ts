import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

type ClassificationInput = {
  text: string;
  type: 'mcq' | 'true_false' | 'essay' | 'short_answer';
  topic?: string;
};

type ClassificationOutput = {
  cognitive_level: 'remembering' | 'understanding' | 'applying' | 'analyzing' | 'evaluating' | 'creating';
  bloom_level: 'remembering' | 'understanding' | 'applying' | 'analyzing' | 'evaluating' | 'creating'; // Deprecated
  difficulty: 'easy' | 'average' | 'difficult';
  knowledge_dimension: 'factual' | 'conceptual' | 'procedural' | 'metacognitive';
  confidence: number;           // 0..1
  quality_score: number;       // 0..1
  readability_score: number;   // Grade level
  semantic_vector: number[];   // Embedding vector
  needs_review: boolean;
};

// Enhanced verb mapping for Bloom's taxonomy
const BLOOM_VERB_MAP: Record<string, ClassificationOutput['bloom_level']> = {
  // Remembering
  'define': 'remembering', 'list': 'remembering', 'recall': 'remembering', 'identify': 'remembering',
  'name': 'remembering', 'state': 'remembering', 'recognize': 'remembering', 'select': 'remembering',
  'match': 'remembering', 'choose': 'remembering', 'label': 'remembering', 'locate': 'remembering',
  
  // Understanding
  'explain': 'understanding', 'describe': 'understanding', 'summarize': 'understanding', 
  'interpret': 'understanding', 'classify': 'understanding', 'compare': 'understanding',
  'contrast': 'understanding', 'illustrate': 'understanding', 'translate': 'understanding',
  'paraphrase': 'understanding', 'convert': 'understanding', 'discuss': 'understanding',
  
  // Applying
  'apply': 'applying', 'use': 'applying', 'execute': 'applying', 'implement': 'applying',
  'solve': 'applying', 'demonstrate': 'applying', 'operate': 'applying', 'calculate': 'applying',
  'show': 'applying', 'complete': 'applying', 'modify': 'applying', 'relate': 'applying',
  
  // Analyzing
  'analyze': 'analyzing', 'examine': 'analyzing', 'investigate': 'analyzing', 
  'categorize': 'analyzing', 'differentiate': 'analyzing', 'distinguish': 'analyzing',
  'organize': 'analyzing', 'deconstruct': 'analyzing', 'breakdown': 'analyzing',
  'separate': 'analyzing', 'order': 'analyzing', 'connect': 'analyzing',
  
  // Evaluating
  'evaluate': 'evaluating', 'assess': 'evaluating', 'judge': 'evaluating', 
  'critique': 'evaluating', 'justify': 'evaluating', 'defend': 'evaluating',
  'support': 'evaluating', 'argue': 'evaluating', 'decide': 'evaluating',
  'rate': 'evaluating', 'prioritize': 'evaluating', 'recommend': 'evaluating',
  
  // Creating
  'create': 'creating', 'design': 'creating', 'develop': 'creating', 
  'construct': 'creating', 'generate': 'creating', 'produce': 'creating',
  'plan': 'creating', 'compose': 'creating', 'formulate': 'creating',
  'build': 'creating', 'invent': 'creating', 'combine': 'creating'
};

// Knowledge dimension mapping
const KNOWLEDGE_DIMENSION_MAP: Record<string, ClassificationOutput['knowledge_dimension']> = {
  // Factual
  'define': 'factual', 'list': 'factual', 'name': 'factual', 'identify': 'factual',
  'recall': 'factual', 'recognize': 'factual', 'select': 'factual', 'match': 'factual',
  
  // Conceptual
  'explain': 'conceptual', 'classify': 'conceptual', 'compare': 'conceptual',
  'summarize': 'conceptual', 'interpret': 'conceptual', 'illustrate': 'conceptual',
  'contrast': 'conceptual', 'discuss': 'conceptual',
  
  // Procedural
  'apply': 'procedural', 'use': 'procedural', 'implement': 'procedural',
  'execute': 'procedural', 'demonstrate': 'procedural', 'calculate': 'procedural',
  'solve': 'procedural', 'operate': 'procedural', 'construct': 'procedural',
  
  // Metacognitive
  'evaluate': 'metacognitive', 'assess': 'metacognitive', 'judge': 'metacognitive',
  'critique': 'metacognitive', 'justify': 'metacognitive', 'reflect': 'metacognitive',
  'plan': 'metacognitive', 'monitor': 'metacognitive'
};

// Context-based indicators for knowledge dimensions
const KNOWLEDGE_INDICATORS = {
  factual: ['what is', 'define', 'list', 'name', 'identify', 'when', 'where', 'who', 'which', 'what year', 'how many'],
  conceptual: ['explain', 'compare', 'contrast', 'relationship', 'why', 'how does', 'principle', 'theory', 'model', 'framework'],
  procedural: ['calculate', 'solve', 'demonstrate', 'perform', 'how to', 'steps', 'procedure', 'method', 'algorithm'],
  metacognitive: ['evaluate', 'assess', 'best method', 'most appropriate', 'strategy', 'approach', 'reflect', 'monitor']
};

function guessBloomAndKD(text: string, type: ClassificationInput['type']): Pick<ClassificationOutput, 'bloom_level' | 'knowledge_dimension' | 'confidence'> {
  const t = text.toLowerCase();
  let bestBloom: ClassificationOutput['bloom_level'] = 'understanding';
  let bestKD: ClassificationOutput['knowledge_dimension'] = 'conceptual';
  let verbHits = 0;
  let kdHits = 0;

  // Check for explicit verb indicators
  for (const [verb, bloom] of Object.entries(BLOOM_VERB_MAP)) {
    if (t.includes(` ${verb} `) || t.startsWith(verb) || t.includes(`${verb}:`)) {
      bestBloom = bloom;
      verbHits++;
      break;
    }
  }

  // Check for knowledge dimension verbs
  for (const [verb, kd] of Object.entries(KNOWLEDGE_DIMENSION_MAP)) {
    if (t.includes(` ${verb} `) || t.startsWith(verb)) {
      bestKD = kd;
      kdHits++;
      break;
    }
  }

  // Check for context indicators if no direct verb match
  if (verbHits === 0) {
    for (const [kd, indicators] of Object.entries(KNOWLEDGE_INDICATORS)) {
      if (indicators.some(indicator => t.includes(indicator))) {
        bestKD = kd as ClassificationOutput['knowledge_dimension'];
        kdHits++;
        break;
      }
    }
  }

  // Question type influences knowledge dimension
  if (type === 'essay' && bestKD === 'factual') {
    bestKD = 'conceptual'; // Essays are rarely purely factual
  }

  // Calculate confidence based on hits and question characteristics
  let confidence = 0.5; // base confidence
  confidence += verbHits * 0.2; // boost for verb matches
  confidence += kdHits * 0.1; // boost for KD matches
  
  // Adjust for question length and complexity
  const wordCount = t.split(/\s+/).length;
  if (wordCount < 8) confidence -= 0.1; // very short questions are harder to classify
  if (wordCount > 25) confidence += 0.1; // longer questions often have clearer indicators
  
  // Type-specific adjustments
  if (type === 'mcq' && t.includes('which of the following')) confidence += 0.1;
  if (type === 'essay' && bestBloom === 'creating') confidence += 0.1;

  return {
    bloom_level: bestBloom,
    knowledge_dimension: bestKD,
    confidence: Math.min(1, Math.max(0.1, confidence))
  };
}

function guessDifficulty(text: string, type: ClassificationInput['type'], bloom: ClassificationOutput['bloom_level']): ClassificationOutput['difficulty'] {
  const t = text.toLowerCase();
  
  // Explicit difficulty indicators
  const easyIndicators = ['simple', 'basic', 'elementary', 'straightforward', 'fundamental'];
  const difficultIndicators = ['complex', 'advanced', 'sophisticated', 'intricate', 'comprehensive'];
  
  if (easyIndicators.some(word => t.includes(word))) return 'easy';
  if (difficultIndicators.some(word => t.includes(word))) return 'difficult';
  
  // Length-based heuristics
  const wordCount = t.split(/\s+/).length;
  const complexityScore = (t.match(/[,:;()-]/g)?.length ?? 0);
  
  if (type === 'essay' || complexityScore > 6 || wordCount > 30) return 'difficult';
  if (wordCount > 15 || complexityScore > 3) return 'average';
  
  // Bloom-based inference
  if (bloom === 'remembering' || bloom === 'understanding') return 'easy';
  if (bloom === 'evaluating' || bloom === 'creating') return 'difficult';
  
  return 'average'; // default
}

function calculateQualityScore(text: string, type: string): number {
  let score = 1.0;
  
  // Length appropriateness
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 5) score -= 0.3;
  if (wordCount > 50) score -= 0.2;
  
  // Grammar and structure
  if (!/[.?!]$/.test(text.trim())) score -= 0.1;
  if (text.includes('  ')) score -= 0.05; // Double spaces
  
  // Question clarity
  if (type === 'mcq' && !text.includes('?') && !text.toLowerCase().includes('which')) {
    score -= 0.1;
  }
  
  return Math.max(0, Math.min(1, score));
}

function calculateReadabilityScore(text: string): number {
  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const syllables = estimateSyllables(text);
  
  // Flesch-Kincaid Grade Level
  if (sentences === 0) return 8.0;
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

function estimateSyllables(text: string): number {
  return text.toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/[aeiou]{2,}/g, 'a')
    .replace(/[^aeiou]/g, '')
    .length || 1;
}

function generateSemanticVector(text: string): number[] {
  // Simplified semantic vector (in production, use actual embeddings)
  const words = text.toLowerCase().split(/\s+/);
  const vector = new Array(50).fill(0);
  
  words.forEach((word, index) => {
    const hash = simpleHash(word);
    vector[hash % 50] += 1;
  });
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let operationSuccess = true;
  let errorType = '';

  try {
    // Parse and validate request body
    let payload: ClassificationInput[];
    
    try {
      const body = await req.text();
      console.log('Received body:', body ? body.substring(0, 200) : 'empty');
      
      if (!body || body.trim() === '') {
        throw new Error('Request body is empty');
      }
      
      payload = JSON.parse(body);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Invalid JSON';
      console.error('JSON parse error:', message);
      throw new Error(`Invalid request body: ${message}`);
    }
    
    if (!Array.isArray(payload)) {
      throw new Error('Expected array of classification inputs');
    }
    
    if (payload.length === 0) {
      throw new Error('Empty array provided');
    }
    
    // Validate each input
    for (const item of payload) {
      if (!item.text || typeof item.text !== 'string') {
        throw new Error('Each item must have a "text" field');
      }
      if (!item.type || !['mcq', 'true_false', 'essay', 'short_answer'].includes(item.type)) {
        throw new Error('Each item must have a valid "type" field');
      }
    }

    const results: ClassificationOutput[] = payload.map(({ text, type, topic }) => {
      const { bloom_level, knowledge_dimension, confidence } = guessBloomAndKD(text, type);
      const difficulty = guessDifficulty(text, type, bloom_level);
      const quality_score = calculateQualityScore(text, type);
      const readability_score = calculateReadabilityScore(text);
      const semantic_vector = generateSemanticVector(text);
      const needs_review = confidence < 0.7; // Flag for manual review if confidence is low

      return {
        cognitive_level: bloom_level, // Use cognitive_level as primary
        bloom_level, // Keep for backward compatibility
        difficulty,
        knowledge_dimension,
        confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
        quality_score: Math.round(quality_score * 100) / 100,
        readability_score: Math.round(readability_score * 10) / 10,
        semantic_vector,
        needs_review
      };
    });

    // Track metrics
    const duration = Date.now() - startTime;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    // Initialize Supabase for metrics
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Record performance metrics (fire and forget)
    supabase.from('performance_benchmarks').insert({
      operation_name: 'classify_questions',
      min_response_time: duration,
      average_response_time: duration,
      max_response_time: duration,
      error_rate: 0,
      throughput: results.length,
      measurement_period_minutes: 1
    });

    // Record quality metrics (fire and forget)
    supabase.from('quality_metrics').insert({
      entity_type: 'ai_classification',
      characteristic: 'Functional Correctness',
      metric_name: 'classification_confidence',
      value: avgConfidence,
      unit: 'score',
      automated: true
    });

    // Record system metrics (fire and forget)
    supabase.from('system_metrics').insert({
      metric_category: 'classification',
      metric_name: 'batch_classification',
      metric_value: results.length,
      metric_unit: 'questions',
      dimensions: {
        avg_confidence: avgConfidence,
        duration_ms: duration,
        needs_review: results.filter(r => r.needs_review).length
      }
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    operationSuccess = false;
    errorType = error instanceof Error ? error.name : 'UnknownError';
    console.error('Classification error:', error);
    
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Record error metrics
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await supabase.from('performance_benchmarks').insert({
        operation_name: 'classify_questions',
        min_response_time: duration,
        average_response_time: duration,
        max_response_time: duration,
        error_rate: 1,
        throughput: 0,
        measurement_period_minutes: 1
      });

      await supabase.from('system_metrics').insert({
        metric_category: 'reliability',
        metric_name: 'error_occurrence',
        metric_value: 1,
        dimensions: {
          error_type: errorType,
          error_message: message,
          operation: 'classify_questions'
        }
      });
    } catch (metricsError) {
      console.error('Failed to record error metrics:', metricsError);
    }

    return new Response(
      JSON.stringify({ error: `Classification failed: ${message}` }), 
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});