/**
 * Curriculum Compliance Checker
 * Validates test compliance with curriculum standards
 */

import { EducationalStandard } from './standardsMapper';

export interface ComplianceReport {
  complianceScore: number; // 0-1
  level: 'excellent' | 'good' | 'fair' | 'poor';
  standardsCovered: number;
  standardsTotal: number;
  coveragePercentage: number;
  alignmentStrength: number;
  gaps: ComplianceGap[];
  recommendations: string[];
  details: ComplianceDetail[];
}

export interface ComplianceGap {
  standard: EducationalStandard;
  severity: 'critical' | 'moderate' | 'minor';
  description: string;
  suggestedAction: string;
}

export interface ComplianceDetail {
  standardCode: string;
  standardTitle: string;
  questionCount: number;
  averageAlignment: number;
  status: 'covered' | 'partial' | 'missing';
}

/**
 * Generate compliance report for a test
 */
export async function generateComplianceReport(
  testQuestions: any[],
  requiredStandards: EducationalStandard[],
  questionStandardMappings: any[]
): Promise<ComplianceReport> {
  const details = analyzeStandardsCoverage(
    testQuestions,
    requiredStandards,
    questionStandardMappings
  );
  
  const gaps = identifyComplianceGaps(details, requiredStandards);
  const recommendations = generateComplianceRecommendations(gaps, details);
  
  const standardsCovered = details.filter(d => d.status === 'covered').length;
  const coveragePercentage = (standardsCovered / requiredStandards.length) * 100;
  
  const alignmentStrength = details.reduce((sum, d) => sum + d.averageAlignment, 0) / details.length || 0;
  
  const complianceScore = calculateComplianceScore(
    coveragePercentage,
    alignmentStrength,
    gaps
  );
  
  const level = determineComplianceLevel(complianceScore);
  
  return {
    complianceScore,
    level,
    standardsCovered,
    standardsTotal: requiredStandards.length,
    coveragePercentage,
    alignmentStrength,
    gaps,
    recommendations,
    details
  };
}

/**
 * Analyze standards coverage
 */
function analyzeStandardsCoverage(
  testQuestions: any[],
  requiredStandards: EducationalStandard[],
  mappings: any[]
): ComplianceDetail[] {
  const details: ComplianceDetail[] = [];
  
  for (const standard of requiredStandards) {
    // Find mappings for this standard
    const standardMappings = mappings.filter(m => m.standard_id === standard.id);
    
    // Find questions mapped to this standard
    const mappedQuestions = standardMappings
      .map(m => testQuestions.find(q => q.id === m.question_id))
      .filter(Boolean);
    
    const questionCount = mappedQuestions.length;
    const averageAlignment = standardMappings.length > 0
      ? standardMappings.reduce((sum, m) => sum + (m.alignment_strength || 0), 0) / standardMappings.length
      : 0;
    
    let status: 'covered' | 'partial' | 'missing';
    if (questionCount === 0) status = 'missing';
    else if (questionCount < 2 || averageAlignment < 0.6) status = 'partial';
    else status = 'covered';
    
    details.push({
      standardCode: standard.code,
      standardTitle: standard.title,
      questionCount,
      averageAlignment,
      status
    });
  }
  
  return details;
}

/**
 * Identify compliance gaps
 */
function identifyComplianceGaps(
  details: ComplianceDetail[],
  standards: EducationalStandard[]
): ComplianceGap[] {
  const gaps: ComplianceGap[] = [];
  
  for (const detail of details) {
    const standard = standards.find(s => s.code === detail.standardCode);
    if (!standard) continue;
    
    if (detail.status === 'missing') {
      gaps.push({
        standard,
        severity: 'critical',
        description: `Standard ${detail.standardCode} has no mapped questions`,
        suggestedAction: `Add at least 2 questions addressing ${detail.standardTitle}`
      });
    } else if (detail.status === 'partial') {
      if (detail.questionCount < 2) {
        gaps.push({
          standard,
          severity: 'moderate',
          description: `Standard ${detail.standardCode} has only ${detail.questionCount} question(s)`,
          suggestedAction: 'Add more questions for better reliability'
        });
      }
      
      if (detail.averageAlignment < 0.6) {
        gaps.push({
          standard,
          severity: 'moderate',
          description: `Weak alignment (${(detail.averageAlignment * 100).toFixed(0)}%) to ${detail.standardCode}`,
          suggestedAction: 'Review and strengthen question alignment'
        });
      }
    }
  }
  
  return gaps;
}

/**
 * Generate compliance recommendations
 */
function generateComplianceRecommendations(
  gaps: ComplianceGap[],
  details: ComplianceDetail[]
): string[] {
  const recommendations: string[] = [];
  
  const critical = gaps.filter(g => g.severity === 'critical');
  const moderate = gaps.filter(g => g.severity === 'moderate');
  
  if (critical.length > 0) {
    recommendations.push(
      `🔴 CRITICAL: ${critical.length} standard(s) have no questions. Add questions immediately.`
    );
  }
  
  if (moderate.length > 0) {
    recommendations.push(
      `⚠️ ${moderate.length} standard(s) need improvement in coverage or alignment.`
    );
  }
  
  const missing = details.filter(d => d.status === 'missing');
  if (missing.length > 0) {
    recommendations.push(
      `Missing standards: ${missing.map(d => d.standardCode).join(', ')}`
    );
  }
  
  const weakAlignment = details.filter(d => d.averageAlignment < 0.6 && d.status !== 'missing');
  if (weakAlignment.length > 0) {
    recommendations.push(
      `Strengthen alignment for: ${weakAlignment.map(d => d.standardCode).join(', ')}`
    );
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Test meets all compliance requirements');
  }
  
  return recommendations;
}

/**
 * Calculate overall compliance score
 */
function calculateComplianceScore(
  coveragePercentage: number,
  alignmentStrength: number,
  gaps: ComplianceGap[]
): number {
  // Base score from coverage
  let score = (coveragePercentage / 100) * 0.5;
  
  // Add alignment strength
  score += alignmentStrength * 0.3;
  
  // Penalty for gaps
  const criticalPenalty = gaps.filter(g => g.severity === 'critical').length * 0.1;
  const moderatePenalty = gaps.filter(g => g.severity === 'moderate').length * 0.05;
  
  score -= (criticalPenalty + moderatePenalty);
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Determine compliance level
 */
function determineComplianceLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 0.85) return 'excellent';
  if (score >= 0.7) return 'good';
  if (score >= 0.5) return 'fair';
  return 'poor';
}

/**
 * Validate regulatory compliance
 */
export function validateRegulatoryCompliance(
  report: ComplianceReport,
  minimumRequirements: {
    minCoverage: number; // percentage
    minAlignment: number; // 0-1
    allowedCriticalGaps: number;
  }
): { compliant: boolean; violations: string[] } {
  const violations: string[] = [];
  
  if (report.coveragePercentage < minimumRequirements.minCoverage) {
    violations.push(
      `Coverage ${report.coveragePercentage.toFixed(1)}% below minimum ${minimumRequirements.minCoverage}%`
    );
  }
  
  if (report.alignmentStrength < minimumRequirements.minAlignment) {
    violations.push(
      `Alignment strength ${(report.alignmentStrength * 100).toFixed(1)}% below minimum ${(minimumRequirements.minAlignment * 100).toFixed(1)}%`
    );
  }
  
  const criticalGaps = report.gaps.filter(g => g.severity === 'critical').length;
  if (criticalGaps > minimumRequirements.allowedCriticalGaps) {
    violations.push(
      `${criticalGaps} critical gaps exceed allowed ${minimumRequirements.allowedCriticalGaps}`
    );
  }
  
  return {
    compliant: violations.length === 0,
    violations
  };
}
