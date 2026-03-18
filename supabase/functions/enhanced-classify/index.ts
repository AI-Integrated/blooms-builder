import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Role check - teacher or admin only
    const roleClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userRole } = await roleClient.rpc('get_user_role', { user_id: claimsData.claims.sub });
    if (!userRole || !['admin', 'teacher'].includes(userRole)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { questionText, questionType, topic, choices } = await req.json();

    if (!questionText) {
      throw new Error('Question text is required');
    }

    // Input validation
    if (typeof questionText !== 'string' || questionText.length > 10000) {
      return new Response(JSON.stringify({ error: 'questionText must be a string of at most 10000 characters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Perform ML-based classification
    const classification = await classifyQuestion(questionText, questionType, topic, choices);
    
    // Calculate confidence scores
    const confidence = calculateConfidence(classification, questionText, choices);
    
    // Check for semantic similarity with existing questions
    const similarities = await checkSimilarity(supabaseClient, questionText, topic);

    return new Response(
      JSON.stringify({
        classification,
        confidence,
        similarities,
        needsReview: confidence.overall < 0.7 || similarities.hasDuplicates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in enhanced-classify:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function classifyQuestion(
  questionText: string,
  questionType: string,
  topic: string,
  choices?: any[]
): Promise<{
  bloomLevel: string;
  knowledgeDimension: string;
  difficulty: string;
  cognitiveProcesses: string[];
}> {
  const lowerText = questionText.toLowerCase();
  
  const bloomIndicators = {
    remembering: ['define', 'list', 'recall', 'name', 'identify', 'state', 'describe'],
    understanding: ['explain', 'summarize', 'interpret', 'classify', 'compare', 'exemplify'],
    applying: ['apply', 'demonstrate', 'solve', 'use', 'execute', 'implement'],
    analyzing: ['analyze', 'differentiate', 'organize', 'attribute', 'deconstruct'],
    evaluating: ['evaluate', 'critique', 'judge', 'defend', 'support', 'argue'],
    creating: ['create', 'design', 'construct', 'develop', 'formulate', 'compose']
  };

  let bloomLevel = 'understanding';
  let maxMatches = 0;

  for (const [level, indicators] of Object.entries(bloomIndicators)) {
    const matches = indicators.filter(indicator => lowerText.includes(indicator)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bloomLevel = level;
    }
  }

  const knowledgeIndicators = {
    factual: ['what is', 'who is', 'when did', 'define', 'list'],
    conceptual: ['why', 'how does', 'relationship', 'principle', 'theory'],
    procedural: ['how to', 'steps', 'procedure', 'method', 'process'],
    metacognitive: ['strategy', 'approach', 'reflect', 'monitor', 'evaluate']
  };

  let knowledgeDimension = 'conceptual';
  maxMatches = 0;

  for (const [dimension, indicators] of Object.entries(knowledgeIndicators)) {
    const matches = indicators.filter(indicator => lowerText.includes(indicator)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      knowledgeDimension = dimension;
    }
  }

  const wordCount = questionText.split(/\s+/).length;
  const hasNegation = /\b(not|except|unless)\b/i.test(questionText);
  const questionComplexity = questionText.split(/[,;()]/).length;
  
  let difficulty = 'medium';
  if (wordCount < 15 && !hasNegation && questionComplexity < 3) {
    difficulty = 'easy';
  } else if (wordCount > 30 || hasNegation || questionComplexity > 5) {
    difficulty = 'hard';
  }

  const cognitiveProcesses: string[] = [];
  if (lowerText.includes('compare') || lowerText.includes('contrast')) cognitiveProcesses.push('comparing');
  if (lowerText.includes('analyze') || lowerText.includes('break down')) cognitiveProcesses.push('analyzing');
  if (lowerText.includes('create') || lowerText.includes('design')) cognitiveProcesses.push('creating');
  if (lowerText.includes('evaluate') || lowerText.includes('judge')) cognitiveProcesses.push('evaluating');

  return { bloomLevel, knowledgeDimension, difficulty, cognitiveProcesses };
}

function calculateConfidence(
  classification: any,
  questionText: string,
  choices?: any[]
): {
  overall: number;
  bloomConfidence: number;
  knowledgeConfidence: number;
  difficultyConfidence: number;
} {
  const wordCount = questionText.split(/\s+/).length;
  const textClarity = wordCount >= 10 && wordCount <= 50 ? 0.9 : 0.7;
  
  let choicesQuality = 0.8;
  if (choices && choices.length > 0) {
    const avgChoiceLength = choices.reduce((sum, c) => sum + c.length, 0) / choices.length;
    choicesQuality = avgChoiceLength > 10 && avgChoiceLength < 100 ? 0.9 : 0.7;
  }

  const hasStrongIndicators = classification.cognitiveProcesses.length > 0 ? 0.95 : 0.75;

  return {
    bloomConfidence: hasStrongIndicators,
    knowledgeConfidence: textClarity,
    difficultyConfidence: choicesQuality,
    overall: (hasStrongIndicators + textClarity + choicesQuality) / 3
  };
}

async function checkSimilarity(
  supabaseClient: any,
  questionText: string,
  topic: string
): Promise<{
  hasDuplicates: boolean;
  similarQuestions: Array<{ id: string; similarity: number; text: string }>;
}> {
  const { data: questions, error } = await supabaseClient
    .from('questions')
    .select('id, question_text')
    .eq('topic', topic)
    .limit(100);

  if (error || !questions) {
    return { hasDuplicates: false, similarQuestions: [] };
  }

  const similarQuestions: Array<{ id: string; similarity: number; text: string }> = [];
  const threshold = 0.8;

  for (const q of questions) {
    const similarity = calculateTextSimilarity(questionText, q.question_text);
    if (similarity >= threshold) {
      similarQuestions.push({ id: q.id, similarity, text: q.question_text });
    }
  }

  return {
    hasDuplicates: similarQuestions.length > 0,
    similarQuestions: similarQuestions.slice(0, 5)
  };
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  
  const intersection = tokens1.filter(t => tokens2.includes(t));
  const union = new Set([...tokens1, ...tokens2]);
  
  return intersection.length / union.size;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}
