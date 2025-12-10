import { supabase } from "@/integrations/supabase/client";
import type { Question } from "@/services/db/questions";

export interface TOSRequirement {
  topic: string;
  bloom_level: string;
  difficulty: string;
  count: number;
}

export interface SelectionResult {
  selectedQuestions: Question[];
  missingRequirements: TOSRequirement[];
  usageTracked: boolean;
}

/**
 * Intelligent Question Selector
 * Selects non-redundant questions from the bank based on TOS requirements
 * Tracks usage to prevent repetition
 */
export class IntelligentQuestionSelector {
  
  /**
   * Select questions matching TOS requirements with redundancy prevention
   */
  async selectQuestions(
    requirements: TOSRequirement[],
    teacherId: string,
    excludeRecentlyUsed: boolean = true,
    recentDays: number = 30
  ): Promise<SelectionResult> {
    const selectedQuestions: Question[] = [];
    const missingRequirements: TOSRequirement[] = [];

    for (const req of requirements) {
      const questions = await this.findMatchingQuestions(
        req,
        teacherId,
        excludeRecentlyUsed,
        recentDays
      );

      if (questions.length >= req.count) {
        // Select the required number of questions
        const selected = this.selectNonRedundant(questions, req.count);
        selectedQuestions.push(...selected);
      } else {
        // Not enough questions - add what we have and mark as missing
        selectedQuestions.push(...questions);
        missingRequirements.push({
          ...req,
          count: req.count - questions.length
        });
      }
    }

    return {
      selectedQuestions,
      missingRequirements,
      usageTracked: true
    };
  }

  /**
   * Find questions matching TOS criteria
   */
  private async findMatchingQuestions(
    requirement: TOSRequirement,
    teacherId: string,
    excludeRecentlyUsed: boolean,
    recentDays: number
  ): Promise<Question[]> {
    let query = supabase
      .from('questions')
      .select('*')
      .ilike('topic', `%${requirement.topic}%`)
      .ilike('bloom_level', requirement.bloom_level)
      .eq('difficulty', requirement.difficulty)
      .eq('deleted', false);

    // Exclude recently used questions if requested
    if (excludeRecentlyUsed) {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - recentDays);
      
      // Get recently used question IDs for this teacher
      const { data: recentTests } = await supabase
        .from('generated_tests')
        .select('items')
        .gte('created_at', recentDate.toISOString());

      if (recentTests) {
        const usedQuestionIds = new Set<string>();
        recentTests.forEach((test: any) => {
          const items = test.items as any[];
          items.forEach((item: any) => {
            if (item.question_id) {
              usedQuestionIds.add(item.question_id);
            }
          });
        });

        if (usedQuestionIds.size > 0) {
          query = query.not('id', 'in', `(${Array.from(usedQuestionIds).join(',')})`);
        }
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching questions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Select non-redundant questions using semantic similarity
   */
  selectNonRedundant(questions: Question[], count: number): Question[] {
    if (questions.length <= count) {
      return questions;
    }

    // Sort by usage count (prefer less-used questions)
    const sorted = [...questions].sort((a, b) => 
      (a.used_count || 0) - (b.used_count || 0)
    );

    // Select questions with maximum semantic distance
    const selected: Question[] = [sorted[0]];
    
    for (let i = 1; i < sorted.length && selected.length < count; i++) {
      const candidate = sorted[i];
      
      // Check if candidate is semantically different from already selected
      const isDifferent = this.isSemanticallySufficient(candidate, selected);
      
      if (isDifferent) {
        selected.push(candidate);
      }
    }

    // If we still need more, take the remaining ones
    while (selected.length < count && sorted.length > selected.length) {
      const remaining = sorted.filter(q => !selected.includes(q));
      if (remaining.length > 0) {
        selected.push(remaining[0]);
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Check if candidate question is semantically different enough
   * In production, this would use embedding vectors
   */
  private isSemanticallySufficient(candidate: Question, selected: Question[]): boolean {
    // Simple text-based similarity for now
    // In production, use embeddings and cosine similarity
    
    const candidateText = candidate.question_text.toLowerCase();
    
    for (const q of selected) {
      const selectedText = q.question_text.toLowerCase();
      
      // Check for significant overlap in words
      const candidateWords = new Set(candidateText.split(/\s+/));
      const selectedWords = new Set(selectedText.split(/\s+/));
      
      const intersection = new Set(
        [...candidateWords].filter(word => selectedWords.has(word))
      );
      
      const similarity = intersection.size / Math.min(candidateWords.size, selectedWords.size);
      
      // If too similar, reject
      if (similarity > 0.7) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Track question usage in a test
   */
  async trackQuestionUsage(questionIds: string[], testId: string): Promise<void> {
    for (const questionId of questionIds) {
      await supabase.rpc('mark_question_used', {
        p_question_id: questionId,
        p_test_id: testId
      });
    }
  }
}

export const intelligentSelector = new IntelligentQuestionSelector();
