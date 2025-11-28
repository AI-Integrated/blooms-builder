-- =====================================================
-- COMPREHENSIVE DATABASE REPAIR MIGRATION
-- Fixes: RLS policies, user roles, triggers, constraints
-- =====================================================

-- 1. FIX RLS POLICIES FOR METRICS TABLES
-- Allow authenticated users to insert metrics
DROP POLICY IF EXISTS "authenticated_can_insert_system_metrics" ON public.system_metrics;
DROP POLICY IF EXISTS "authenticated_can_insert_quality_metrics" ON public.quality_metrics;

CREATE POLICY "System can record metrics"
  ON public.system_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can record quality metrics"
  ON public.quality_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. FIX USER ROLE ASSIGNMENT TRIGGER
-- Ensure new users automatically get 'teacher' role
CREATE OR REPLACE FUNCTION public.assign_default_teacher_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign default teacher role if no role exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'teacher'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_teacher_role();

-- 3. ADD MISSING SEARCH_PATH TO FUNCTIONS (Fix linter warnings)
ALTER FUNCTION public.update_last_active() SET search_path = public;
ALTER FUNCTION public.update_approval_timestamp() SET search_path = public;
ALTER FUNCTION public.recalculate_question_similarities() SET search_path = public;
ALTER FUNCTION public.calculate_similarity_metrics() SET search_path = public;
ALTER FUNCTION public.get_validation_statistics() SET search_path = public;
ALTER FUNCTION public.sync_profile_email() SET search_path = public;
ALTER FUNCTION public.calculate_rubric_total_score() SET search_path = public;
ALTER FUNCTION public.update_question_search_vector() SET search_path = public;

-- 4. FIX FOREIGN KEY VALIDATION FOR TOS
-- Add helper function to validate TOS existence
CREATE OR REPLACE FUNCTION public.validate_tos_exists(p_tos_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tos_entries WHERE id = p_tos_id
  );
$$;

-- 5. ADD INDEX FOR BETTER PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_generated_tests_tos_id ON public.generated_tests(tos_id);
CREATE INDEX IF NOT EXISTS idx_generated_tests_created_by ON public.generated_tests(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_owner ON public.questions(owner);
CREATE INDEX IF NOT EXISTS idx_questions_approved ON public.questions(approved);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.questions(topic);
CREATE INDEX IF NOT EXISTS idx_tos_entries_owner ON public.tos_entries(owner);

-- 6. FIX RLS FOR TOS_ENTRIES (Remove recursive policy)
-- Drop problematic policies
DROP POLICY IF EXISTS "Teachers can read their own TOS" ON public.tos_entries;
DROP POLICY IF EXISTS "Admins can read all TOS" ON public.tos_entries;

-- Create non-recursive policies
CREATE POLICY "Users can read own TOS entries"
  ON public.tos_entries
  FOR SELECT
  TO authenticated
  USING (owner = auth.uid());

CREATE POLICY "Admins can read all TOS entries"
  ON public.tos_entries
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. ENSURE PROPER PERMISSIONS FOR GENERATED_TESTS
-- Fix created_by to use UUID instead of text
ALTER TABLE public.generated_tests 
  ALTER COLUMN created_by TYPE uuid USING created_by::uuid;

-- Update policy for generated_tests
DROP POLICY IF EXISTS "Teachers can create generated tests" ON public.generated_tests;
DROP POLICY IF EXISTS "Authenticated users can read generated tests" ON public.generated_tests;

CREATE POLICY "Users can create generated tests"
  ON public.generated_tests
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can read their own generated tests"
  ON public.generated_tests
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 8. STANDARDIZE APPROVAL FIELDS
-- Ensure approval_timestamp is set automatically
CREATE OR REPLACE FUNCTION public.set_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.approved IS DISTINCT FROM NEW.approved AND NEW.approved = true THEN
    NEW.approved_by := auth.uid()::text;
    NEW.approval_timestamp := NOW();
    NEW.needs_review := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_approval_fields ON public.questions;
CREATE TRIGGER trigger_set_approval_fields
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_approval_fields();