import { supabase } from "@/integrations/supabase/client";

export interface TOSEntry {
  id?: string;
  title: string;
  subject_no: string;
  course: string;
  description: string;
  year_section: string;
  exam_period: string;
  school_year: string;
  total_items: number;
  prepared_by: string;
  noted_by: string;
  created_by?: string;
  owner?: string;
  topics?: any[];
  distribution?: any;
  matrix?: any;
  created_at?: string;
  updated_at?: string;
}

export interface LearningCompetency {
  id?: string;
  tos_id: string;
  topic_name: string;
  hours: number;
  percentage: number;
  remembering_items: number;
  understanding_items: number;
  applying_items: number;
  analyzing_items: number;
  evaluating_items: number;
  creating_items: number;
  total_items: number;
  item_numbers: any;
  created_at?: string;
}

export const TOS = {
  async create(payload: Omit<TOSEntry, 'id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    const tosData = {
      ...payload,
      created_by: 'teacher',
      owner: user?.id
    };
    
    const { data, error } = await supabase
      .from("tos_entries")
      .insert(tosData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("tos_entries")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async list() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tos_entries")
      .select("*")
      .eq("owner", user?.id)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data ?? [];
  },

  async update(id: string, patch: Partial<TOSEntry>) {
    const { data, error } = await supabase
      .from("tos_entries")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from("tos_entries")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  async createLearningCompetencies(competencies: Omit<LearningCompetency, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from("learning_competencies")
      .insert(competencies)
      .select();
    
    if (error) throw error;
    return data;
  },

  async getLearningCompetencies(tosId: string) {
    const { data, error } = await supabase
      .from("learning_competencies")
      .select("*")
      .eq("tos_id", tosId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data ?? [];
  }
};