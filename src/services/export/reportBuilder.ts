/**
 * Assessment Report Builder
 * Combines test data, analytics, and compliance into comprehensive reports
 */

import { ComplianceReport } from '../curriculum/complianceChecker';
import { TestDocumentation } from './documentationGenerator';

export interface AssessmentReport {
  metadata: ReportMetadata;
  summary: ReportSummary;
  sections: ReportSection[];
}

export interface ReportMetadata {
  reportId: string;
  generatedAt: Date;
  generatedBy: string;
  testId: string;
  testTitle: string;
  reportType: 'comprehensive' | 'summary' | 'compliance' | 'psychometric';
}

export interface ReportSummary {
  totalQuestions: number;
  totalPoints: number;
  estimatedTime: number;
  coverageScore: number;
  complianceLevel?: string;
  keyFindings: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'text' | 'table' | 'chart' | 'matrix';
  content: any;
  importance: 'high' | 'medium' | 'low';
}

/**
 * Build comprehensive assessment report
 */
export async function buildComprehensiveReport(
  test: any,
  questions: any[],
  documentation: TestDocumentation,
  compliance?: ComplianceReport,
  analytics?: any
): Promise<AssessmentReport> {
  const metadata: ReportMetadata = {
    reportId: `report-${Date.now()}`,
    generatedAt: new Date(),
    generatedBy: test.created_by || 'System',
    testId: test.id,
    testTitle: test.title,
    reportType: 'comprehensive'
  };
  
  const summary = buildSummary(test, questions, compliance, analytics);
  const sections = buildSections(test, questions, documentation, compliance, analytics);
  
  return {
    metadata,
    summary,
    sections
  };
}

/**
 * Build report summary
 */
function buildSummary(
  test: any,
  questions: any[],
  compliance?: ComplianceReport,
  analytics?: any
): ReportSummary {
  const keyFindings: string[] = [];
  
  // Coverage analysis
  const topics = new Set(questions.map(q => q.topic)).size;
  const coverageScore = Math.min((topics / 5) * 0.8, 1.0);
  keyFindings.push(`Covers ${topics} distinct topics`);
  
  // Bloom distribution
  const bloomLevels = new Set(questions.map(q => q.bloom_level)).size;
  if (bloomLevels >= 4) {
    keyFindings.push('Diverse cognitive levels represented');
  }
  
  // Compliance
  if (compliance) {
    keyFindings.push(`Compliance: ${compliance.level} (${(compliance.complianceScore * 100).toFixed(0)}%)`);
  }
  
  // Analytics
  if (analytics?.reliability) {
    keyFindings.push(`Reliability: ${analytics.reliability.toFixed(2)}`);
  }
  
  return {
    totalQuestions: questions.length,
    totalPoints: questions.length * (test.points_per_question || 1),
    estimatedTime: test.time_limit || questions.length * 2,
    coverageScore,
    complianceLevel: compliance?.level,
    keyFindings
  };
}

/**
 * Build report sections
 */
function buildSections(
  test: any,
  questions: any[],
  documentation: TestDocumentation,
  compliance?: ComplianceReport,
  analytics?: any
): ReportSection[] {
  const sections: ReportSection[] = [];
  
  // 1. Test Overview
  sections.push({
    id: 'overview',
    title: 'Test Overview',
    type: 'text',
    content: formatTestOverview(test),
    importance: 'high'
  });
  
  // 2. Content Analysis
  sections.push({
    id: 'content',
    title: 'Content Analysis',
    type: 'table',
    content: buildContentTable(questions),
    importance: 'high'
  });
  
  // 3. Bloom's Distribution
  sections.push({
    id: 'bloom',
    title: "Bloom's Taxonomy Distribution",
    type: 'chart',
    content: buildBloomChart(questions),
    importance: 'medium'
  });
  
  // 4. Difficulty Distribution
  sections.push({
    id: 'difficulty',
    title: 'Difficulty Distribution',
    type: 'chart',
    content: buildDifficultyChart(questions),
    importance: 'medium'
  });
  
  // 5. Compliance Report (if available)
  if (compliance) {
    sections.push({
      id: 'compliance',
      title: 'Standards Compliance',
      type: 'text',
      content: formatComplianceReport(compliance),
      importance: 'high'
    });
  }
  
  // 6. Quality Metrics (if available)
  if (analytics) {
    sections.push({
      id: 'quality',
      title: 'Quality Metrics',
      type: 'table',
      content: buildQualityTable(analytics),
      importance: 'medium'
    });
  }
  
  // 7. Recommendations
  sections.push({
    id: 'recommendations',
    title: 'Recommendations',
    type: 'text',
    content: generateRecommendations(test, questions, compliance),
    importance: 'high'
  });
  
  return sections;
}

/**
 * Format test overview
 */
function formatTestOverview(test: any): string {
  return `
**Title:** ${test.title}
**Subject:** ${test.subject}
**Course:** ${test.course || 'N/A'}
**Grade Level:** ${test.year_section || 'N/A'}
**Exam Period:** ${test.exam_period || 'N/A'}
**School Year:** ${test.school_year || 'N/A'}

**Created By:** ${test.created_by}
**Created On:** ${new Date(test.created_at).toLocaleDateString()}
  `.trim();
}

/**
 * Build content table
 */
function buildContentTable(questions: any[]): any {
  const topics = new Map<string, number>();
  questions.forEach(q => {
    topics.set(q.topic, (topics.get(q.topic) || 0) + 1);
  });
  
  return Array.from(topics.entries()).map(([topic, count]) => ({
    topic,
    questions: count,
    percentage: ((count / questions.length) * 100).toFixed(1)
  }));
}

/**
 * Build Bloom's chart data
 */
function buildBloomChart(questions: any[]): any {
  const bloomCounts = new Map<string, number>();
  questions.forEach(q => {
    bloomCounts.set(q.bloom_level, (bloomCounts.get(q.bloom_level) || 0) + 1);
  });
  
  return Array.from(bloomCounts.entries()).map(([level, count]) => ({
    level,
    count,
    percentage: ((count / questions.length) * 100).toFixed(1)
  }));
}

/**
 * Build difficulty chart data
 */
function buildDifficultyChart(questions: any[]): any {
  const difficultyCounts = new Map<string, number>();
  questions.forEach(q => {
    difficultyCounts.set(q.difficulty, (difficultyCounts.get(q.difficulty) || 0) + 1);
  });
  
  return Array.from(difficultyCounts.entries()).map(([level, count]) => ({
    level,
    count,
    percentage: ((count / questions.length) * 100).toFixed(1)
  }));
}

/**
 * Format compliance report
 */
function formatComplianceReport(compliance: ComplianceReport): string {
  let report = `**Compliance Level:** ${compliance.level.toUpperCase()}\n`;
  report += `**Compliance Score:** ${(compliance.complianceScore * 100).toFixed(1)}%\n`;
  report += `**Standards Coverage:** ${compliance.standardsCovered}/${compliance.standardsTotal} (${compliance.coveragePercentage.toFixed(1)}%)\n\n`;
  
  if (compliance.gaps.length > 0) {
    report += `**Issues Found:**\n`;
    compliance.gaps.forEach(gap => {
      report += `- [${gap.severity.toUpperCase()}] ${gap.description}\n`;
    });
  }
  
  if (compliance.recommendations.length > 0) {
    report += `\n**Recommendations:**\n`;
    compliance.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
  }
  
  return report;
}

/**
 * Build quality table
 */
function buildQualityTable(analytics: any): any {
  return [
    { metric: 'Reliability', value: analytics.reliability?.toFixed(2) || 'N/A' },
    { metric: 'Difficulty Index', value: analytics.difficultyIndex?.toFixed(2) || 'N/A' },
    { metric: 'Discrimination', value: analytics.discrimination?.toFixed(2) || 'N/A' },
    { metric: 'Internal Consistency', value: analytics.alpha?.toFixed(2) || 'N/A' }
  ];
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  test: any,
  questions: any[],
  compliance?: ComplianceReport
): string {
  const recommendations: string[] = [];
  
  // Check question count
  if (questions.length < 20) {
    recommendations.push('⚠️ Consider adding more questions for better reliability (recommended: 20+ items)');
  }
  
  // Check cognitive level diversity
  const bloomLevels = new Set(questions.map(q => q.bloom_level)).size;
  if (bloomLevels < 3) {
    recommendations.push('📊 Include more diverse cognitive levels (currently ' + bloomLevels + ' levels)');
  }
  
  // Check compliance
  if (compliance && compliance.gaps.length > 0) {
    recommendations.push(`⚠️ Address ${compliance.gaps.length} compliance gap(s)`);
  }
  
  // Check time limit
  const suggestedTime = questions.length * 2;
  if (!test.time_limit || Math.abs(test.time_limit - suggestedTime) > suggestedTime * 0.3) {
    recommendations.push(`⏱️ Suggested time limit: ${suggestedTime} minutes (2 min/question)`);
  }
  
  if (recommendations.length === 0) {
    return '✅ Test appears well-constructed. No major improvements needed.';
  }
  
  return recommendations.join('\n');
}

/**
 * Export report to different formats
 */
export async function exportReport(
  report: AssessmentReport,
  format: 'json' | 'markdown' | 'html'
): Promise<string> {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);
      
    case 'markdown':
      return convertToMarkdown(report);
      
    case 'html':
      return convertToHTML(report);
      
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function convertToMarkdown(report: AssessmentReport): string {
  let md = `# Assessment Report: ${report.metadata.testTitle}\n\n`;
  md += `Generated: ${report.metadata.generatedAt.toLocaleString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Questions:** ${report.summary.totalQuestions}\n`;
  md += `- **Total Points:** ${report.summary.totalPoints}\n`;
  md += `- **Estimated Time:** ${report.summary.estimatedTime} minutes\n\n`;
  
  report.sections.forEach(section => {
    md += `## ${section.title}\n\n`;
    if (section.type === 'text') {
      md += section.content + '\n\n';
    }
  });
  
  return md;
}

function convertToHTML(report: AssessmentReport): string {
  let html = `<!DOCTYPE html><html><head><title>${report.metadata.testTitle}</title></head><body>`;
  html += `<h1>Assessment Report: ${report.metadata.testTitle}</h1>`;
  html += `<p>Generated: ${report.metadata.generatedAt.toLocaleString()}</p>`;
  // Simplified HTML generation
  html += '</body></html>';
  return html;
}
