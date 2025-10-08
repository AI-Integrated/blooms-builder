/**
 * Test Assembly Hook
 * Manages test assembly operations and state
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { applyStrategy, AssemblyResult, StrategyConfig } from '@/services/testAssembly/assemblyStrategies';
import { generateParallelForms, ParallelFormConfig } from '@/services/testAssembly/parallelForms';
import { optimizeTestLength, LengthOptimizerConfig } from '@/services/testAssembly/lengthOptimizer';

export function useTestAssembly() {
  const [isLoading, setIsLoading] = useState(false);
  const [assemblyResult, setAssemblyResult] = useState<AssemblyResult | null>(null);

  /**
   * Preview assembly with given configuration
   */
  const previewAssembly = async (config: StrategyConfig) => {
    setIsLoading(true);
    try {
      const result = applyStrategy(config);
      setAssemblyResult(result);
      
      if (result.metadata.warnings.length > 0) {
        result.metadata.warnings.forEach(warning => toast.warning(warning));
      }
      
      toast.success(`Preview generated: ${result.selectedQuestions.length} questions selected`);
      return result;
    } catch (error: any) {
      toast.error('Failed to generate preview: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate and save assembly to database
   */
  const generateAssembly = async (
    tosId: string,
    title: string,
    config: StrategyConfig
  ) => {
    setIsLoading(true);
    try {
      // Run assembly strategy
      const result = applyStrategy(config);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      // Save assembly to database
      const { data: assembly, error: assemblyError } = await supabase
        .from('test_assemblies')
        .insert({
          title,
          tos_id: tosId,
          created_by: user.user.id,
          params: {
            strategy: config.strategy,
            targetCount: config.targetCount,
            constraints: config.constraints
          },
          status: 'ready'
        })
        .select()
        .single();
      
      if (assemblyError) throw assemblyError;
      
      // Generate parallel forms
      const forms = generateParallelForms({
        numForms: 1,
        questions: result.selectedQuestions,
        seed: assembly.id
      });
      
      // Save version
      const { error: versionError } = await supabase
        .from('assembly_versions')
        .insert({
          assembly_id: assembly.id,
          version_label: forms[0].versionLabel,
          question_order: forms[0].questionOrder,
          shuffle_seed: forms[0].shuffleSeed,
          metadata: forms[0].metadata
        });
      
      if (versionError) throw versionError;
      
      toast.success('Assembly generated successfully!');
      return assembly;
    } catch (error: any) {
      toast.error('Failed to generate assembly: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get assembly by ID
   */
  const getAssembly = async (assemblyId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_assemblies')
        .select(`
          *,
          assembly_versions(*)
        `)
        .eq('id', assemblyId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error('Failed to fetch assembly: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get all assemblies for current user
   */
  const getAssemblies = async () => {
    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('test_assemblies')
        .select(`
          *,
          assembly_versions(count)
        `)
        .eq('created_by', user.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast.error('Failed to fetch assemblies: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate multiple parallel forms
   */
  const generateForms = async (config: ParallelFormConfig) => {
    setIsLoading(true);
    try {
      const forms = generateParallelForms(config);
      toast.success(`Generated ${forms.length} parallel forms`);
      return forms;
    } catch (error: any) {
      toast.error('Failed to generate forms: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Optimize test length
   */
  const optimizeLength = async (config: LengthOptimizerConfig) => {
    try {
      const result = optimizeTestLength(config);
      toast.success(`Recommended length: ${result.recommendedLength} questions`);
      return result;
    } catch (error: any) {
      toast.error('Failed to optimize length: ' + error.message);
      throw error;
    }
  };

  /**
   * Delete assembly
   */
  const deleteAssembly = async (assemblyId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('test_assemblies')
        .delete()
        .eq('id', assemblyId);
      
      if (error) throw error;
      toast.success('Assembly deleted');
    } catch (error: any) {
      toast.error('Failed to delete assembly: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    assemblyResult,
    previewAssembly,
    generateAssembly,
    getAssembly,
    getAssemblies,
    generateForms,
    optimizeLength,
    deleteAssembly
  };
}
