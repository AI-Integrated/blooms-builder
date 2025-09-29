export type BloomLevel = 'remembering' | 'understanding' | 'applying' | 'analyzing' | 'evaluating' | 'creating';
export type KnowledgeDimension = 'factual' | 'conceptual' | 'procedural' | 'metacognitive';
export type Difficulty = 'easy' | 'average' | 'difficult';

export interface Classification {
  bloom_level: BloomLevel;
  knowledge_dimension: KnowledgeDimension;
  difficulty: Difficulty;
  confidence: number;
  needs_review: boolean;
}

// Enhanced Bloom's taxonomy verb mapping
const bloomVerbMap: Record<BloomLevel, string[]> = {
  remembering: [
    'define', 'list', 'name', 'recall', 'identify', 'label', 'match', 'select',
    'state', 'recognize', 'choose', 'locate', 'find', 'memorize', 'repeat'
  ],
  understanding: [
    'explain', 'describe', 'summarize', 'classify', 'compare', 'illustrate',
    'interpret', 'translate', 'paraphrase', 'convert', 'discuss', 'predict',
    'estimate', 'infer', 'conclude', 'extend'
  ],
  applying: [
    'apply', 'use', 'execute', 'implement', 'solve', 'demonstrate', 'operate',
    'calculate', 'show', 'complete', 'modify', 'relate', 'change', 'compute',
    'discover', 'manipulate', 'prepare', 'produce'
  ],
  analyzing: [
    'analyze', 'differentiate', 'organize', 'structure', 'attribute', 'distinguish',
    'diagram', 'examine', 'investigate', 'categorize', 'breakdown', 'separate',
    'order', 'connect', 'divide', 'select', 'compare', 'contrast'
  ],
  evaluating: [
    'evaluate', 'judge', 'critique', 'justify', 'defend', 'argue', 'assess',
    'appraise', 'decide', 'rate', 'prioritize', 'recommend', 'support',
    'conclude', 'discriminate', 'summarize', 'validate'
  ],
  creating: [
    'create', 'design', 'compose', 'develop', 'plan', 'construct', 'generate',
    'formulate', 'build', 'invent', 'combine', 'synthesize', 'produce',
    'devise', 'modify', 'reorganize', 'substitute', 'validate'
  ]
};

// Knowledge dimension mapping
const knowledgeMap: Record<KnowledgeDimension, string[]> = {
  factual: [
    'define', 'identify', 'list', 'name', 'recall', 'recognize', 'select',
    'state', 'what is', 'when', 'where', 'who', 'which', 'how many'
  ],
  conceptual: [
    'classify', 'explain', 'compare', 'interpret', 'summarize', 'illustrate',
    'contrast', 'discuss', 'relationship', 'principle', 'theory', 'model',
    'framework', 'concept', 'why', 'how does'
  ],
  procedural: [
    'apply', 'use', 'calculate', 'implement', 'execute', 'demonstrate',
    'construct', 'solve', 'operate', 'how to', 'steps', 'procedure',
    'method', 'algorithm', 'technique', 'process'
  ],
  metacognitive: [
    'evaluate', 'reflect', 'justify', 'plan', 'monitor', 'assess',
    'strategy', 'approach', 'best method', 'most appropriate',
    'when to use', 'why choose'
  ]
};

// Context-based indicators
const contextIndicators = {
  factual: ['what is the definition', 'which of the following', 'the term', 'refers to', 'is defined as'],
  conceptual: ['relationship between', 'how are', 'connected', 'why does', 'what causes', 'principle behind'],
  procedural: ['how do you', 'what steps', 'procedure for', 'method to', 'algorithm for', 'technique used'],
  metacognitive: ['best approach', 'most effective', 'when would you', 'why choose', 'strategy for']
};

export function classifyBloom(questionText: string): BloomLevel {
  const t = questionText.toLowerCase();
  
  // Check for explicit verb matches
  for (const [level, verbs] of Object.entries(bloomVerbMap)) {
    if (verbs.some(verb => t.includes(` ${verb} `) || t.startsWith(verb) || t.includes(`${verb}:`))) {
      return level as BloomLevel;
    }
  }
  
  // Fallback patterns
  if (t.includes('what is') || t.includes('define') || t.includes('list')) return 'remembering';
  if (t.includes('explain') || t.includes('describe') || t.includes('why')) return 'understanding';
  if (t.includes('apply') || t.includes('use') || t.includes('solve')) return 'applying';
  if (t.includes('analyze') || t.includes('compare') || t.includes('examine')) return 'analyzing';
  if (t.includes('evaluate') || t.includes('assess') || t.includes('judge')) return 'evaluating';
  if (t.includes('create') || t.includes('design') || t.includes('develop')) return 'creating';
  
  return 'understanding'; // default fallback
}

export function detectKnowledgeDimension(questionText: string, questionType?: string): KnowledgeDimension {
  const t = questionText.toLowerCase();
  
  // Check for explicit verb matches
  for (const [kd, verbs] of Object.entries(knowledgeMap)) {
    if (verbs.some(verb => t.includes(verb))) {
      return kd as KnowledgeDimension;
    }
  }
  
  // Check for context indicators
  for (const [kd, indicators] of Object.entries(contextIndicators)) {
    if (indicators.some(indicator => t.includes(indicator))) {
      return kd as KnowledgeDimension;
    }
  }
  
  // Question type influences knowledge dimension
  if (questionType === 'essay') return 'conceptual'; // Essays are rarely purely factual
  if (questionType === 'mcq' && t.includes('which of the following')) return 'factual';
  
  return 'conceptual'; // default fallback
}

export function inferDifficulty(
  bloom: BloomLevel, 
  questionText: string, 
  questionType?: string
): Difficulty {
  const t = questionText.toLowerCase();
  
  // Explicit difficulty indicators
  const easyIndicators = ['simple', 'basic', 'elementary', 'straightforward', 'fundamental'];
  const difficultIndicators = ['complex', 'advanced', 'sophisticated', 'intricate', 'comprehensive'];
  
  if (easyIndicators.some(word => t.includes(word))) return 'easy';
  if (difficultIndicators.some(word => t.includes(word))) return 'difficult';
  
  // Length and complexity heuristics
  const wordCount = t.split(/\s+/).length;
  const complexityScore = (t.match(/[,:;()-]/g)?.length ?? 0);
  
  if (questionType === 'essay' || complexityScore > 6 || wordCount > 30) return 'difficult';
  if (wordCount > 15 || complexityScore > 3) return 'average';
  
  // Bloom-based inference (primary method)
  if (bloom === 'remembering' || bloom === 'understanding') return 'easy';
  if (bloom === 'evaluating' || bloom === 'creating') return 'difficult';
  
  return 'average'; // applying, analyzing default
}

export function calculateConfidence(
  questionText: string,
  bloom: BloomLevel,
  kd: KnowledgeDimension,
  questionType?: string
): number {
  const t = questionText.toLowerCase();
  let confidence = 0.5; // base confidence
  
  // Boost for explicit verb matches
  const bloomVerbs = bloomVerbMap[bloom];
  if (bloomVerbs.some(verb => t.includes(` ${verb} `) || t.startsWith(verb))) {
    confidence += 0.3;
  }
  
  const kdVerbs = knowledgeMap[kd];
  if (kdVerbs.some(verb => t.includes(verb))) {
    confidence += 0.2;
  }
  
  // Question type consistency
  if (questionType === 'mcq' && kd === 'factual') confidence += 0.1;
  if (questionType === 'essay' && (kd === 'conceptual' || kd === 'metacognitive')) confidence += 0.1;
  
  // Length and structure indicators
  const wordCount = t.split(/\s+/).length;
  if (wordCount >= 8 && wordCount <= 25) confidence += 0.1; // optimal length
  if (wordCount < 5) confidence -= 0.2; // too short to classify well
  
  return Math.min(1, Math.max(0.1, confidence));
}

export function classifyQuestion(
  questionText: string,
  questionType: 'mcq' | 'essay' | 'true_false' | 'short_answer' = 'mcq',
  topic?: string
): Classification {
  const bloom = classifyBloom(questionText);
  const kd = detectKnowledgeDimension(questionText, questionType);
  const difficulty = inferDifficulty(bloom, questionText, questionType);
  const confidence = calculateConfidence(questionText, bloom, kd, questionType);
  const needs_review = confidence < 0.7;
  
  return {
    bloom_level: bloom,
    knowledge_dimension: kd,
    difficulty,
    confidence: Math.round(confidence * 100) / 100,
    needs_review
  };
}

export function batchClassify(
  questions: Array<{ text: string; type: string; topic?: string }>
): Classification[] {
  return questions.map(q => classifyQuestion(
    q.text,
    q.type as any,
    q.topic
  ));
}