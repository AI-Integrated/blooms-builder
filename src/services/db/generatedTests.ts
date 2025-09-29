import { supabase } from "@/integrations/supabase/client";

export interface GeneratedTest {
  id?: string;
  tos_id?: string;
  version_label?: string;
  items?: any;
  answer_key?: any;
  instructions?: string;
  created_at?: string;
  // Additional properties for UI compatibility
  title?: string;
  subject?: string;
  tosId?: string;
  answerKey?: any;
}

export const GeneratedTests = {
  async create(payload: Omit<GeneratedTest, 'id' | 'created_at'>) {
    const testData = {
      tos_id: payload.tos_id || payload.tosId,
      version_label: payload.version_label || 'A',
      items: payload.items || [],
      answer_key: payload.answer_key || payload.answerKey || {},
      instructions: payload.instructions || ''
    };
    
    const { data, error } = await supabase
      .from("generated_tests")
      .insert(testData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async createVersion(payload: Omit<GeneratedTest, 'id' | 'created_at'>) {
    const testData = {
      tos_id: payload.tos_id || payload.tosId,
      version_label: payload.version_label || 'A',
      items: payload.items || [],
      answer_key: payload.answer_key || payload.answerKey || {},
      instructions: payload.instructions || ''
    };
    
    const { data, error } = await supabase
      .from("generated_tests")
      .insert(testData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async createMultipleVersions(configs: Omit<GeneratedTest, 'id' | 'created_at'>[]) {
    const testDataArray = configs.map(config => ({
      tos_id: config.tos_id || config.tosId,
      version_label: config.version_label || 'A',
      items: config.items || [],
      answer_key: config.answer_key || config.answerKey || {},
      instructions: config.instructions || ''
    }));
    
    const { data, error } = await supabase
      .from("generated_tests")
      .insert(testDataArray)
      .select();
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("generated_tests")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async list() {
    const { data, error } = await supabase
      .from("generated_tests")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data ?? [];
  },

  async listByBaseTest(tosId: string) {
    const { data, error } = await supabase
      .from("generated_tests")
      .select("*")
      .eq("tos_id", tosId)
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    return data ?? [];
  },

  async update(id: string, patch: Partial<GeneratedTest>) {
    const { data, error } = await supabase
      .from("generated_tests")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from("generated_tests")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  }
};