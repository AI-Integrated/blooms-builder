import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Input validation schema
const classificationInputSchema = z.object({
  text: z.string().min(10, "Question text must be at least 10 characters").max(5000, "Question text must be less than 5000 characters"),
  type: z.enum(['mcq', 'true_false', 'essay', 'short_answer']),
  topic: z.string().min(2).max(200).optional()
});

const classificationArraySchema = z.array(classificationInputSchema);

type ClassificationInput = z.infer<typeof classificationInputSchema>;

type ClassificationOutput = {
  cognitive_level: 'remembering' | 'understanding' | 'applying' | 'analyzing' | 'evaluating' | 'creating';
  bloom_level: 'remembering' | 'understanding' | 'applying' | 'analyzing' | 'evaluating' | 'creating';
  difficulty: 'easy' | 'average' | 'difficult';
  knowledge_dimension: 'factual' | 'conceptual' | 'procedural' | 'metacognitive';
  confidence: number;
  quality_score: number;
  readability_score: number;
  semantic_vector: number[];
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

const KNOWLEDGE_DIMENSION_MAP: Record<string, ClassificationOutput['knowledge_dimension']> = {
  'define': 'factual', 'list': 'factual', 'name': 'factual', 'identify': 'factual',
  'recall': 'factual', 'recognize': 'factual', 'select': 'factual', 'match': 'factual',
  'explain': 'conceptual', 'classify': 'conceptual', 'compare': 'conceptual',
  'summarize': 'conceptual', 'interpret': 'conceptual', 'illustrate': 'conceptual',
  'contrast': 'conceptual', 'discuss': 'conceptual',
  'apply': 'procedural', 'use': 'procedural', 'implement': 'procedural',
  'execute': 'procedural', 'demonstrate': 'procedural', 'calculate': 'procedural',
  'solve': 'procedural', 'operate': 'procedural', 'construct': 'procedural',
  'evaluate': 'metacognitive', 'assess': 'metacognitive', 'judge': 'metacognitive',
  'critique': 'metacognitive', 'justify': 'metacognitive', 'reflect': 'metacognitive',
  'plan': 'metacognitive', 'monitor': 'metacognitive'
};

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

  for (const [verb, bloom] of Object.entries(BLOOM_VERB_MAP)) {
    if (t.includes(` ${verb} `) || t.startsWith(verb) || t.includes(`${verb}:`)) {
      bestBloom = bloom;
      verbHits++;
      break;
    }
  }

  for (const [verb, kd] of Object.entries(KNOWLEDGE_DIMENSION_MAP)) {
    if (t.includes(` ${verb} `) || t.startsWith(verb)) {
      bestKD = kd;
      kdHits++;
      break;
    }
  }

  if (verbHits === 0) {
    for (const [kd, indicators] of Object.entries(KNOWLEDGE_INDICATORS)) {
      if (indicators.some(indicator => t.includes(indicator))) {
        bestKD = kd as ClassificationOutput['knowledge_dimension'];
        kdHits++;
        break;
      }
    }
  }

  if (type === 'essay' && bestKD === 'factual') {
    bestKD = 'conceptual';
  }

  let confidence = 0.5;
  confidence += verbHits * 0.2;
  confidence += kdHits * 0.1;
  
  const wordCount = t.split(/\s+/).length;
  if (wordCount < 8) confidence -= 0.1;
  if (wordCount > 25) confidence += 0.1;
  
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
  
  const easyIndicators = ['simple', 'basic', 'elementary', 'straightforward', 'fundamental'];
  const difficultIndicators = ['complex', 'advanced', 'sophisticated', 'intricate', 'comprehensive'];
  
  if (easyIndicators.some(word => t.includes(word))) return 'easy';
  if (difficultIndicators.some(word => t.includes(word))) return 'difficult';
  
  const wordCount = t.split(/\s+/).length;
  const complexityScore = (t.match(/[,:;()-]/g)?.length ?? 0);
  
  if (type === 'essay' || complexityScore > 6 || wordCount > 30) return 'difficult';
  if (wordCount > 15 || complexityScore > 3) return 'average';
  
  if (bloom === 'remembering' || bloom === 'understanding') return 'easy';
  if (bloom === 'evaluating' || bloom === 'creating') return 'difficult';
  
  return 'average';
}

function calculateQualityScore(text: string, type: string): number {
  let score = 1.0;
  
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 5) score -= 0.3;
  if (wordCount > 50) score -= 0.2;
  
  if (!/[.?!]$/.test(text.trim())) score -= 0.1;
  if (text.includes('  ')) score -= 0.05;
  
  if (type === 'mcq' && !text.includes('?') && !text.toLowerCase().includes('which')) {
    score -= 0.1;
  }
  
  return Math.max(0, Math.min(1, score));
}

function calculateReadabilityScore(text: string): number {
  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const syllables = estimateSyllables(text);
  
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
  const words = text.toLowerCase().split(/\s+/);
  const vector = new Array(50).fill(0);
  
  words.forEach((word, index) => {
    const hash = simpleHash(word);
    vector[hash % 50] += 1;
  });
  
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }), 
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Parse and validate input
    const rawPayload = await req.json();
    const payload = classificationArraySchema.parse(rawPayload);

    const results: ClassificationOutput[] = payload.map(({ text, type, topic }) => {
      const { bloom_level, knowledge_dimension, confidence } = guessBloomAndKD(text, type);
      const difficulty = guessDifficulty(text, type, bloom_level);
      const quality_score = calculateQualityScore(text, type);
      const readability_score = calculateReadabilityScore(text);
      const semantic_vector = generateSemanticVector(text);
      const needs_review = confidence < 0.7;

      return {
        cognitive_level: bloom_level,
        bloom_level,
        difficulty,
        knowledge_dimension,
        confidence: Math.round(confidence * 100) / 100,
        quality_score: Math.round(quality_score * 100) / 100,
        readability_score: Math.round(readability_score * 10) / 10,
        semantic_vector,
        needs_review
      };
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Classification error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: error.errors 
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: `Classification failed: ${message}` }), 
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
