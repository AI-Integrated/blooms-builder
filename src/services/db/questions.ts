// Question service - handles all question-related database operations
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Question = Database['public']['Tables']['questions']['Row'];
export type QuestionInsert = Database['public']['Tables']['questions']['Insert'];
export type QuestionUpdate = Database['public']['Tables']['questions']['Update'];

export interface QuestionFilters {
  topic?: string;
  bloom_level?: string;
  difficulty?: string;
  approved?: boolean;
}

// Convert database question to component-compatible format
export function convertQuestion(dbQuestion: Question): Question & { correct_answer: string } {
  return {
    ...dbQuestion,
    correct_answer: dbQuestion.correct_answer || '',
    choices: dbQuestion.choices as any,
    question_type: dbQuestion.question_type as 'mcq' | 'true_false' | 'essay' | 'short_answer',
    created_by: dbQuestion.created_by as 'teacher' | 'ai' | 'bulk_import'
  };
}

export const Questions = {
  async getAll(filters: {
    topic?: string;
    bloom_level?: string;
    difficulty?: string;
    approved?: boolean;
  } = {}): Promise<Question[]> {
    let query = supabase.from('questions').select('*');

    if (filters.topic) {
      query = query.eq('topic', filters.topic);
    }
    if (filters.bloom_level) {
      query = query.eq('bloom_level', filters.bloom_level);
    }
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters.approved !== undefined) {
      query = query.eq('approved', filters.approved);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Question | null> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(question: Omit<QuestionInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Question> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const questionData = {
      ...question,
      approved: false
    };

    const { data, error } = await supabase
      .from('questions')
      .insert(questionData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<QuestionUpdate>): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async bulkInsert(questions: Array<Omit<QuestionInsert, 'id' | 'created_at' | 'updated_at'>>): Promise<Question[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const questionsData = questions.map(q => ({
      ...q,
      approved: false
    }));

    const { data, error } = await supabase
      .from('questions')
      .insert(questionsData)
      .select('*');

    if (error) throw error;
    return data || [];
  },

  async approve(id: string, approved: boolean): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .update({ approved })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async search(filters: {
    topic?: string;
    bloom_level?: string;
    difficulty?: string;
    approved?: boolean;
  } = {}): Promise<Question[]> {
    return this.getAll(filters);
  },

  async getStats() {
    const { data, error } = await supabase
      .from('questions')
      .select('bloom_level, difficulty, approved');
      
    if (error) throw error;
    
    const stats = {
      total: data?.length || 0,
      approved: data?.filter(q => q.approved).length || 0,
      byBloom: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>
    };

    data?.forEach(q => {
      stats.byBloom[q.bloom_level] = (stats.byBloom[q.bloom_level] || 0) + 1;
      stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;
    });

    return stats;
  },

  async toggleApproval(id: string): Promise<Question> {
    const question = await this.getById(id);
    if (!question) throw new Error('Question not found');
    
    return this.update(id, { approved: !question.approved });
  },

  async insert(question: Omit<QuestionInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Question> {
    return this.create(question);
  },

  // New approval toggle function with needs_review sync
  async setApproval(questionId: string, approved: boolean): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .update({ 
        approved, 
        needs_review: !approved,
        approval_timestamp: approved ? new Date().toISOString() : null
      })
      .eq('id', questionId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
};