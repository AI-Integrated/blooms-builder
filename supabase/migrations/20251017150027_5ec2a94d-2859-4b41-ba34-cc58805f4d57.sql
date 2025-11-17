-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================
-- QUESTIONS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies that conflict
DROP POLICY IF EXISTS "Admins can view all questions" ON questions;
DROP POLICY IF EXISTS "Teachers can view approved questions" ON questions;
DROP POLICY IF EXISTS "Admins can create questions" ON questions;
DROP POLICY IF EXISTS "Admins can approve questions" ON questions;
DROP POLICY IF EXISTS "Admins can delete questions" ON questions;
DROP POLICY IF EXISTS "AI can create pending questions" ON questions;

-- Admins have full access to all questions
CREATE POLICY "Admins can view all questions"
  ON questions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND created_by = 'admin');

CREATE POLICY "Admins can update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can only read approved questions
CREATE POLICY "Teachers can view approved questions"
  ON questions FOR SELECT
  TO authenticated
  USING (
    approved = true 
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

-- AI can create pending questions (for test generation)
CREATE POLICY "AI can create pending questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = 'ai' 
    AND status = 'pending' 
    AND approved = false
  );

-- ============================================
-- GENERATED TESTS RLS POLICIES
-- ============================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Authenticated users can view tests" ON generated_tests;
DROP POLICY IF EXISTS "Authenticated users can update tests" ON generated_tests;
DROP POLICY IF EXISTS "Authenticated users can delete tests" ON generated_tests;
DROP POLICY IF EXISTS "Users can create generated tests" ON generated_tests;

-- Admins can view all generated tests
CREATE POLICY "Admins can view all tests"
  ON generated_tests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can only view their own tests
CREATE POLICY "Teachers can view own tests"
  ON generated_tests FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND tos_id IN (SELECT id FROM tos_entries WHERE owner = auth.uid())
  );

-- Teachers can create their own tests
CREATE POLICY "Teachers can create tests"
  ON generated_tests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Teachers can update their own tests
CREATE POLICY "Teachers can update own tests"
  ON generated_tests FOR UPDATE
  TO authenticated
  USING (
    tos_id IN (SELECT id FROM tos_entries WHERE owner = auth.uid())
  );

-- Teachers can delete their own tests
CREATE POLICY "Teachers can delete own tests"
  ON generated_tests FOR DELETE
  TO authenticated
  USING (
    tos_id IN (SELECT id FROM tos_entries WHERE owner = auth.uid())
  );

-- ============================================
-- AI GENERATION LOGS RLS POLICIES
-- ============================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can view all ai logs" ON ai_generation_logs;
DROP POLICY IF EXISTS "Teachers can view relevant ai logs" ON ai_generation_logs;
DROP POLICY IF EXISTS "Authenticated users can insert generation logs" ON ai_generation_logs;

-- Admins can view all AI generation logs
CREATE POLICY "Admins can view all ai logs"
  ON ai_generation_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view their relevant logs
CREATE POLICY "Teachers can view relevant ai logs"
  ON ai_generation_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role));

-- System can insert generation logs
CREATE POLICY "Authenticated users can insert generation logs"
  ON ai_generation_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- USER ROLES TABLE RLS POLICIES
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;

-- Admins can manage all user roles
CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own role
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());