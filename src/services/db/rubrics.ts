import { supabase } from "@/integrations/supabase/client";

export interface RubricCriterion {
  id?: string;
  name: string;
  weight: number;
  max_score: number;
  order_index?: number;
}

export interface Rubric {
  id?: string;
  title: string;
  description?: string;
  criteria?: RubricCriterion[];
  created_by?: string;
  created_at?: string;
}

export interface RubricScore {
  id?: string;
  question_id: string;
  test_id?: string;
  student_id?: string;
  student_name?: string;
  scorer_id?: string;
  scores: Record<string, number>; // criterion_id -> score
  total_score: number;
  comments?: string;
  created_at?: string;
}

export const Rubrics = {
  // Create a new rubric
  async create(rubricData: { title: string; description?: string; criteria: RubricCriterion[] }) {
    const response = await supabase.functions.invoke('rubrics', {
      body: rubricData
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },

  // Get all rubrics for the current user
  async list() {
    const response = await supabase.functions.invoke('rubrics', {
      method: 'GET'
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data || [];
  },

  // Get a specific rubric with criteria
  async getById(id: string) {
    const response = await supabase.functions.invoke(`rubrics/${id}`, {
      method: 'GET'
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },

  // Update a rubric
  async update(id: string, rubricData: { title: string; description?: string; criteria: RubricCriterion[] }) {
    const response = await supabase.functions.invoke(`rubrics/${id}`, {
      method: 'PUT',
      body: rubricData
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },

  // Delete a rubric
  async delete(id: string) {
    const response = await supabase.functions.invoke(`rubrics/${id}`, {
      method: 'DELETE'
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },

  // Get rubrics associated with a question
  async getByQuestion(questionId: string) {
    // This would require implementing question-rubric associations
    // For now, return null since we need to establish the relationship
    return null;
  },

  // Legacy method for compatibility
  async getForQuestion(questionId: string) {
    return this.getByQuestion(questionId);
  },

  // Submit a score for a student's answer
  async submitScore(scoreData: {
    question_id: string;
    test_id?: string;
    student_id?: string;
    student_name?: string;
    scores: Record<string, number>;
    comments?: string;
  }) {
    const response = await supabase.functions.invoke('rubric-scores', {
      body: scoreData
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },

  // Get scores for a question, test, or student
  async getScores(filters: {
    question_id?: string;
    test_id?: string;
    student_id?: string;
  }) {
    const params = new URLSearchParams();
    if (filters.question_id) params.append('question_id', filters.question_id);
    if (filters.test_id) params.append('test_id', filters.test_id);
    if (filters.student_id) params.append('student_id', filters.student_id);

    const response = await supabase.functions.invoke(`rubric-scores?${params.toString()}`, {
      method: 'GET'
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data || [];
  },

  // Update a score
  async updateScore(id: string, scoreData: {
    scores?: Record<string, number>;
    comments?: string;
  }) {
    const response = await supabase.functions.invoke(`rubric-scores/${id}`, {
      method: 'PUT',
      body: scoreData
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  },

  // Delete a score
  async deleteScore(id: string) {
    const response = await supabase.functions.invoke(`rubric-scores/${id}`, {
      method: 'DELETE'
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  }
};