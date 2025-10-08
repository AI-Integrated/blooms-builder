/**
 * Curriculum Standards Mapping Service
 * Maps questions to educational standards and validates alignment
 */

import { supabase } from '@/integrations/supabase/client';

export interface EducationalStandard {
  id: string;
  code: string;
  title: string;
  description?: string;
  category: 'national' | 'state' | 'local' | 'international';
  grade_level?: string;
  subject_area: string;
  framework?: string;
  parent_standard_id?: string;
  metadata?: any;
}

export interface QuestionStandardMapping {
  id?: string;
  question_id: string;
  standard_id: string;
  alignment_strength: number; // 0-1
  validated_by?: string;
  validated_at?: string;
  notes?: string;
}

export interface AlignmentAnalysis {
  overallAlignment: number;
  standardsCoverage: Record<string, number>;
  unmappedQuestions: string[];
  weakAlignments: QuestionStandardMapping[];
  recommendations: string[];
}

export class StandardsMapper {
  /**
   * Fetch all available standards
   */
  static async getStandards(filters?: {
    category?: string;
    subject_area?: string;
    framework?: string;
  }): Promise<EducationalStandard[]> {
    let query = supabase
      .from('educational_standards')
      .select('*')
      .order('code', { ascending: true });
    
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.subject_area) {
      query = query.eq('subject_area', filters.subject_area);
    }
    if (filters?.framework) {
      query = query.eq('framework', filters.framework);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return (data || []) as EducationalStandard[];
  }
  
  /**
   * Create or update standard
   */
  static async upsertStandard(standard: Partial<EducationalStandard>): Promise<EducationalStandard> {
    const { data, error } = await supabase
      .from('educational_standards')
      .upsert([standard as any])
      .select()
      .single();
    
    if (error) throw error;
    return data as EducationalStandard;
  }
  
  /**
   * Map question to standard
   */
  static async mapQuestionToStandard(mapping: Omit<QuestionStandardMapping, 'id'>): Promise<QuestionStandardMapping> {
    const { data, error } = await supabase
      .from('question_standards')
      .upsert(mapping)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Get all mappings for a question
   */
  static async getQuestionMappings(questionId: string): Promise<QuestionStandardMapping[]> {
    const { data, error } = await supabase
      .from('question_standards')
      .select(`
        *,
        educational_standards (*)
      `)
      .eq('question_id', questionId);
    
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Get all questions mapped to a standard
   */
  static async getStandardQuestions(standardId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('question_standards')
      .select(`
        *,
        questions (*)
      `)
      .eq('standard_id', standardId);
    
    if (error) throw error;
    return data || [];
  }
  
  /**
   * Validate learning outcome alignment
   */
  static validateAlignment(
    questionText: string,
    questionBloomLevel: string,
    standard: EducationalStandard
  ): { isAligned: boolean; strength: number; notes: string[] } {
    const notes: string[] = [];
    let strength = 0.5; // Base alignment
    
    // Check if question text mentions key terms from standard
    const standardKeywords = this.extractKeywords(standard.title + ' ' + (standard.description || ''));
    const questionKeywords = this.extractKeywords(questionText);
    
    const overlap = standardKeywords.filter(k => questionKeywords.includes(k));
    const keywordScore = overlap.length / standardKeywords.length;
    
    strength += keywordScore * 0.3;
    
    if (keywordScore > 0.5) {
      notes.push(`Strong keyword overlap: ${overlap.slice(0, 3).join(', ')}`);
    }
    
    // Check cognitive level alignment
    const standardMetadata = standard.metadata || {};
    const expectedBloomLevel = standardMetadata.bloom_level;
    
    if (expectedBloomLevel && expectedBloomLevel === questionBloomLevel) {
      strength += 0.2;
      notes.push(`Bloom level matches: ${questionBloomLevel}`);
    }
    
    // Final alignment determination
    const isAligned = strength >= 0.6;
    
    if (!isAligned) {
      notes.push('Consider revising question to better align with standard');
    }
    
    return { isAligned, strength, notes };
  }
  
  /**
   * Analyze alignment for a test or question bank
   */
  static async analyzeTestAlignment(questionIds: string[]): Promise<AlignmentAnalysis> {
    const mappings = await Promise.all(
      questionIds.map(id => this.getQuestionMappings(id))
    );
    
    const flatMappings = mappings.flat();
    const unmappedQuestions = questionIds.filter((id, idx) => mappings[idx].length === 0);
    const weakAlignments = flatMappings.filter(m => m.alignment_strength < 0.6);
    
    // Calculate standards coverage
    const standardsCoverage: Record<string, number> = {};
    flatMappings.forEach(m => {
      standardsCoverage[m.standard_id] = (standardsCoverage[m.standard_id] || 0) + 1;
    });
    
    // Calculate overall alignment
    const overallAlignment = flatMappings.length > 0
      ? flatMappings.reduce((sum, m) => sum + m.alignment_strength, 0) / flatMappings.length
      : 0;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (unmappedQuestions.length > 0) {
      recommendations.push(`${unmappedQuestions.length} questions need standards mapping`);
    }
    
    if (weakAlignments.length > 0) {
      recommendations.push(`${weakAlignments.length} questions have weak alignment (< 60%)`);
    }
    
    if (Object.keys(standardsCoverage).length < 3) {
      recommendations.push('Consider mapping to more diverse standards');
    }
    
    return {
      overallAlignment,
      standardsCoverage,
      unmappedQuestions,
      weakAlignments,
      recommendations
    };
  }
  
  /**
   * Generate compliance report
   */
  static generateComplianceReport(analysis: AlignmentAnalysis): {
    complianceLevel: 'excellent' | 'good' | 'fair' | 'poor';
    summary: string;
    details: string[];
  } {
    const { overallAlignment, unmappedQuestions, weakAlignments } = analysis;
    
    let complianceLevel: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (overallAlignment >= 0.85 && unmappedQuestions.length === 0) {
      complianceLevel = 'excellent';
    } else if (overallAlignment >= 0.7 && unmappedQuestions.length < 5) {
      complianceLevel = 'good';
    } else if (overallAlignment >= 0.5) {
      complianceLevel = 'fair';
    } else {
      complianceLevel = 'poor';
    }
    
    const summary = `Compliance Level: ${complianceLevel.toUpperCase()} (${(overallAlignment * 100).toFixed(1)}% alignment)`;
    
    const details = [
      `Total alignment score: ${(overallAlignment * 100).toFixed(1)}%`,
      `Unmapped questions: ${unmappedQuestions.length}`,
      `Weak alignments: ${weakAlignments.length}`,
      `Standards covered: ${Object.keys(analysis.standardsCoverage).length}`
    ];
    
    return { complianceLevel, summary, details };
  }
  
  /**
   * Cross-curricular analysis
   */
  static analyzeCrossCurricular(questionIds: string[]): Promise<{
    subjectAreas: string[];
    integrationOpportunities: string[];
    multidisciplinaryCount: number;
  }> {
    // This would analyze which questions span multiple subject areas
    // Implementation would query mappings and group by subject area
    return Promise.resolve({
      subjectAreas: [],
      integrationOpportunities: [],
      multidisciplinaryCount: 0
    });
  }
  
  /**
   * Suggest standards for a question based on content
   */
  static async suggestStandards(
    questionText: string,
    bloomLevel: string,
    subjectArea: string
  ): Promise<Array<{ standard: EducationalStandard; confidence: number }>> {
    // Fetch relevant standards
    const standards = await this.getStandards({ subject_area: subjectArea });
    
    // Score each standard
    const suggestions = standards.map(standard => {
      const { strength } = this.validateAlignment(questionText, bloomLevel, standard);
      return { standard, confidence: strength };
    });
    
    // Sort by confidence and return top 5
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }
  
  // Helper methods
  
  private static extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
  }
  
  /**
   * Import standards from CSV/JSON
   */
  static async importStandards(
    standards: Partial<EducationalStandard>[],
    framework: string
  ): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];
    
    for (const standard of standards) {
      try {
        await this.upsertStandard({ ...standard, framework });
        imported++;
      } catch (error) {
        errors.push(`Failed to import ${standard.code}: ${error}`);
      }
    }
    
    return { imported, errors };
  }
}
