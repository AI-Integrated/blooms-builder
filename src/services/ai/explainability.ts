import { RuleBasedClassifier, POSAnalysis } from './ruleBasedClassifier';
import { ConfidenceResult } from './confidenceScoring';

export interface ClassificationEvidence {
  verbsFound: string[];
  keywordsFound: string[];
  patternsMatched: string[];
  matchedVerbs: string[];
  matchedKeywords: string[];
  matchedPatterns: string[];
  posAnalysis: POSAnalysis;
  similarityScores?: {
    semantic: number;
    lexical: number;
  };
}

export interface ClassificationExplanation {
  decision: string;
  evidenceScore: number;
  confidence: number;
  reasoning: string[];
  supportingEvidence: ClassificationEvidence;
  weaknesses: string[];
  recommendations: string[];
  visualBreakdown: {
    bloomEvidence: number;
    knowledgeEvidence: number;
    structuralEvidence: number;
    contextualEvidence: number;
  };
}

export class ExplainabilityService {
  static generateExplanation(
    questionText: string,
    questionType: string,
    classification: {
      bloom_level: string;
      knowledge_dimension: string;
      difficulty: string;
      confidence: number;
    },
    confidenceResult: ConfidenceResult,
    topic?: string
  ): ClassificationExplanation {
    // Perform rule-based analysis for evidence
    const ruleBasedResult = RuleBasedClassifier.classifyQuestion(questionText, questionType, topic);
    
    // Build comprehensive explanation
    const reasoning = this.buildReasoning(classification, ruleBasedResult, confidenceResult);
    const weaknesses = this.identifyWeaknesses(confidenceResult, ruleBasedResult);
    const recommendations = this.generateRecommendations(confidenceResult, weaknesses);
    
    // Map evidence to the interface
    const supportingEvidence: ClassificationEvidence = {
      verbsFound: ruleBasedResult.evidence.matchedVerbs,
      keywordsFound: ruleBasedResult.evidence.matchedKeywords,
      patternsMatched: ruleBasedResult.evidence.matchedPatterns,
      matchedVerbs: ruleBasedResult.evidence.matchedVerbs,
      matchedKeywords: ruleBasedResult.evidence.matchedKeywords,
      matchedPatterns: ruleBasedResult.evidence.matchedPatterns,
      posAnalysis: ruleBasedResult.evidence.posAnalysis
    };

    // Calculate evidence score
    const evidenceScore = this.calculateEvidenceScore(
      supportingEvidence,
      confidenceResult.factors
    );

    // Create visual breakdown
    const visualBreakdown = {
      bloomEvidence: confidenceResult.factors.verbMatch,
      knowledgeEvidence: confidenceResult.factors.contextMatch,
      structuralEvidence: confidenceResult.factors.structuralClarity,
      contextualEvidence: confidenceResult.factors.domainSpecificity
    };

    return {
      decision: `Classified as ${classification.bloom_level} (Bloom's) and ${classification.knowledge_dimension} (Knowledge)`,
      evidenceScore,
      confidence: classification.confidence,
      reasoning,
      supportingEvidence,
      weaknesses,
      recommendations,
      visualBreakdown
    };
  }

  private static buildReasoning(
    classification: any,
    ruleBasedResult: any,
    confidenceResult: ConfidenceResult
  ): string[] {
    const reasoning: string[] = [];

    // 1. Verb-based reasoning
    if (ruleBasedResult.evidence.matchedVerbs.length > 0) {
      reasoning.push(
        `Action verbs identified: "${ruleBasedResult.evidence.matchedVerbs.join('", "')}" ` +
        `which are characteristic of ${classification.bloom_level} level questions`
      );
    } else {
      reasoning.push(
        `No explicit action verbs found. Classification based on question structure and context`
      );
    }

    // 2. Pattern-based reasoning
    if (ruleBasedResult.evidence.matchedPatterns.length > 0) {
      reasoning.push(
        `Question follows typical patterns for ${classification.bloom_level} level: ` +
        `${ruleBasedResult.evidence.matchedPatterns.slice(0, 2).join(', ')}`
      );
    }

    // 3. Knowledge dimension reasoning
    if (ruleBasedResult.evidence.matchedKeywords.length > 0) {
      reasoning.push(
        `Keywords "${ruleBasedResult.evidence.matchedKeywords.slice(0, 3).join('", "')}" ` +
        `indicate ${classification.knowledge_dimension} knowledge type`
      );
    }

    // 4. Structural reasoning
    if (confidenceResult.factors.structuralClarity > 0.7) {
      reasoning.push(
        `Well-structured question with clear intent and proper grammar`
      );
    } else if (confidenceResult.factors.structuralClarity < 0.5) {
      reasoning.push(
        `Question structure is unclear, which may affect classification accuracy`
      );
    }

    // 5. Complexity reasoning
    const complexity = ruleBasedResult.evidence.posAnalysis.complexity;
    if (complexity > 0.6) {
      reasoning.push(
        `High linguistic complexity (${(complexity * 100).toFixed(0)}%) aligns with ` +
        `${classification.bloom_level} cognitive level`
      );
    } else if (complexity < 0.4) {
      reasoning.push(
        `Lower linguistic complexity suggests more straightforward cognitive demands`
      );
    }

    // 6. Confidence factors
    if (confidenceResult.factors.validationHistory > 0.7) {
      reasoning.push(
        `Strong historical validation accuracy for similar questions`
      );
    }

    return reasoning;
  }

  private static identifyWeaknesses(
    confidenceResult: ConfidenceResult,
    ruleBasedResult: any
  ): string[] {
    const weaknesses: string[] = [];

    if (confidenceResult.factors.verbMatch < 0.5) {
      weaknesses.push('Weak verb alignment with predicted Bloom\'s level');
    }

    if (confidenceResult.factors.contextMatch < 0.5) {
      weaknesses.push('Insufficient contextual indicators for knowledge dimension');
    }

    if (confidenceResult.factors.structuralClarity < 0.5) {
      weaknesses.push('Poor question structure or ambiguous wording');
    }

    if (ruleBasedResult.evidence.matchedVerbs.length === 0) {
      weaknesses.push('No explicit action verbs found in question');
    }

    if (confidenceResult.factors.domainSpecificity < 0.4) {
      weaknesses.push('Lacks domain-specific terminology');
    }

    if (confidenceResult.overallConfidence < 0.6) {
      weaknesses.push('Overall low confidence in classification');
    }

    return weaknesses;
  }

  private static generateRecommendations(
    confidenceResult: ConfidenceResult,
    weaknesses: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (weaknesses.includes('Weak verb alignment with predicted Bloom\'s level')) {
      recommendations.push(
        'Consider revising to include explicit action verbs that match the intended cognitive level'
      );
    }

    if (weaknesses.includes('Insufficient contextual indicators for knowledge dimension')) {
      recommendations.push(
        'Add more context or examples to clarify whether the question tests factual, conceptual, procedural, or metacognitive knowledge'
      );
    }

    if (weaknesses.includes('Poor question structure or ambiguous wording')) {
      recommendations.push(
        'Improve question clarity by using simpler sentence structures and removing ambiguous terms'
      );
    }

    if (weaknesses.includes('No explicit action verbs found in question')) {
      recommendations.push(
        'Start the question with a clear action verb (e.g., "Explain...", "Analyze...", "Create...")'
      );
    }

    if (weaknesses.includes('Lacks domain-specific terminology')) {
      recommendations.push(
        'Incorporate relevant technical or domain-specific terms to increase question specificity'
      );
    }

    if (weaknesses.includes('Overall low confidence in classification')) {
      recommendations.push(
        'Consider manual review by an expert to validate the classification'
      );
    }

    // Add general recommendations based on confidence factors
    if (confidenceResult.recommendations.length > 0) {
      recommendations.push(...confidenceResult.recommendations.slice(0, 2));
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private static calculateEvidenceScore(
    evidence: ClassificationEvidence,
    confidenceFactors: any
  ): number {
    let score = 0;

    // Verb evidence (30%)
    const verbScore = Math.min(1, evidence.verbsFound.length / 3) * 0.3;
    score += verbScore;

    // Keyword evidence (20%)
    const keywordScore = Math.min(1, evidence.keywordsFound.length / 5) * 0.2;
    score += keywordScore;

    // Pattern evidence (20%)
    const patternScore = Math.min(1, evidence.patternsMatched.length / 2) * 0.2;
    score += patternScore;

    // Structural evidence (15%)
    score += confidenceFactors.structuralClarity * 0.15;

    // Contextual evidence (15%)
    score += confidenceFactors.contextMatch * 0.15;

    return Math.min(1, score);
  }

  static formatExplanationForUI(explanation: ClassificationExplanation): {
    summary: string;
    details: Array<{ label: string; value: string | number; type: 'success' | 'warning' | 'info' }>;
    evidenceBreakdown: Array<{ category: string; score: number; items: string[] }>;
  } {
    const summary = `${explanation.decision} with ${(explanation.confidence * 100).toFixed(0)}% confidence`;

    const details = [
      {
        label: 'Evidence Strength',
        value: `${(explanation.evidenceScore * 100).toFixed(0)}%`,
        type: explanation.evidenceScore > 0.7 ? 'success' : explanation.evidenceScore > 0.5 ? 'info' : 'warning'
      },
      {
        label: 'Classification Confidence',
        value: `${(explanation.confidence * 100).toFixed(0)}%`,
        type: explanation.confidence > 0.8 ? 'success' : explanation.confidence > 0.6 ? 'info' : 'warning'
      },
      {
        label: 'Weaknesses Found',
        value: explanation.weaknesses.length,
        type: explanation.weaknesses.length === 0 ? 'success' : explanation.weaknesses.length <= 2 ? 'info' : 'warning'
      }
    ] as Array<{ label: string; value: string | number; type: 'success' | 'warning' | 'info' }>;

    const evidenceBreakdown = [
      {
        category: "Bloom's Level Evidence",
        score: explanation.visualBreakdown.bloomEvidence,
        items: explanation.supportingEvidence.verbsFound
      },
      {
        category: 'Knowledge Type Evidence',
        score: explanation.visualBreakdown.knowledgeEvidence,
        items: explanation.supportingEvidence.keywordsFound
      },
      {
        category: 'Structural Quality',
        score: explanation.visualBreakdown.structuralEvidence,
        items: explanation.supportingEvidence.patternsMatched
      },
      {
        category: 'Contextual Indicators',
        score: explanation.visualBreakdown.contextualEvidence,
        items: explanation.supportingEvidence.posAnalysis.questionWords
      }
    ];

    return { summary, details, evidenceBreakdown };
  }

  static compareClassifications(
    original: ClassificationExplanation,
    revised: ClassificationExplanation
  ): {
    improvements: string[];
    regressions: string[];
    overallChange: 'improved' | 'declined' | 'similar';
  } {
    const improvements: string[] = [];
    const regressions: string[] = [];

    // Compare confidence
    if (revised.confidence > original.confidence + 0.1) {
      improvements.push(`Confidence increased by ${((revised.confidence - original.confidence) * 100).toFixed(0)}%`);
    } else if (revised.confidence < original.confidence - 0.1) {
      regressions.push(`Confidence decreased by ${((original.confidence - revised.confidence) * 100).toFixed(0)}%`);
    }

    // Compare evidence score
    if (revised.evidenceScore > original.evidenceScore + 0.1) {
      improvements.push('Stronger supporting evidence');
    } else if (revised.evidenceScore < original.evidenceScore - 0.1) {
      regressions.push('Weaker supporting evidence');
    }

    // Compare weaknesses
    if (revised.weaknesses.length < original.weaknesses.length) {
      improvements.push(`Reduced weaknesses from ${original.weaknesses.length} to ${revised.weaknesses.length}`);
    } else if (revised.weaknesses.length > original.weaknesses.length) {
      regressions.push(`Increased weaknesses from ${original.weaknesses.length} to ${revised.weaknesses.length}`);
    }

    const overallChange = improvements.length > regressions.length ? 'improved' :
                         regressions.length > improvements.length ? 'declined' : 'similar';

    return { improvements, regressions, overallChange };
  }
}
