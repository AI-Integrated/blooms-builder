-- Fix RLS policies for collaboration tables to restrict access

-- ============================================================
-- 1. FIX COLLABORATION TABLES - Restrict to document access
-- ============================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Collaborators can view document collaborators" ON document_collaborators;
DROP POLICY IF EXISTS "Activity is viewable by all" ON document_activity;
DROP POLICY IF EXISTS "Presence is viewable by all" ON document_presence;
DROP POLICY IF EXISTS "Messages are viewable by all" ON collaboration_messages;

-- Create restrictive policies for document_collaborators
CREATE POLICY "View own document collaborators" ON document_collaborators
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM document_collaborators dc2
    WHERE dc2.document_id = document_collaborators.document_id
    AND dc2.user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Create restrictive policies for document_activity
CREATE POLICY "View own document activity" ON document_activity
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM document_collaborators
    WHERE document_collaborators.document_id = document_activity.document_id
    AND document_collaborators.user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Create restrictive policies for document_presence
CREATE POLICY "View own document presence" ON document_presence
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM document_collaborators
    WHERE document_collaborators.document_id = document_presence.document_id
    AND document_collaborators.user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Create restrictive policies for collaboration_messages
CREATE POLICY "View own document messages" ON collaboration_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM document_collaborators
    WHERE document_collaborators.document_id = collaboration_messages.document_id
    AND document_collaborators.user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- ============================================================
-- 2. FIX QUESTION APPROVAL - Separate content from approval
-- ============================================================

-- Drop problematic overlapping UPDATE policies
DROP POLICY IF EXISTS "Owners can update their own questions" ON questions;
DROP POLICY IF EXISTS "Admins can update any question" ON questions;
DROP POLICY IF EXISTS "admins_can_approve_any_question" ON questions;
DROP POLICY IF EXISTS "allow_question_approval_updates" ON questions;

-- Create separate policy for content updates (owners can edit content but NOT approval fields)
CREATE POLICY "Owners can update question content" ON questions
FOR UPDATE USING (owner = auth.uid())
WITH CHECK (
  owner = auth.uid() AND
  -- Prevent modification of approval fields by owners
  approved = (SELECT approved FROM questions q WHERE q.id = questions.id) AND
  approved_by = (SELECT approved_by FROM questions q WHERE q.id = questions.id) AND
  COALESCE(approval_timestamp, '1970-01-01'::timestamptz) = COALESCE((SELECT approval_timestamp FROM questions q WHERE q.id = questions.id), '1970-01-01'::timestamptz)
);

-- Create policy for approval updates (admins/validators only)
CREATE POLICY "Admins and validators can approve questions" ON questions
FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'validator')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'validator')
);

-- Create trigger to auto-set approval metadata
CREATE OR REPLACE FUNCTION set_approval_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-set approval metadata when approved status changes
  IF OLD.approved IS DISTINCT FROM NEW.approved AND NEW.approved = true THEN
    NEW.approved_by := auth.uid()::text;
    NEW.approval_timestamp := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS question_approval_metadata ON questions;
CREATE TRIGGER question_approval_metadata
BEFORE UPDATE ON questions
FOR EACH ROW
WHEN (OLD.approved IS DISTINCT FROM NEW.approved)
EXECUTE FUNCTION set_approval_metadata();

-- ============================================================
-- 3. FIX TEST GENERATION TABLES - Restrict to authenticated users
-- ============================================================

-- Fix generated_tests policies
DROP POLICY IF EXISTS "Users can view generated tests" ON generated_tests;
DROP POLICY IF EXISTS "Users can update generated tests" ON generated_tests;
DROP POLICY IF EXISTS "Users can delete generated tests" ON generated_tests;

CREATE POLICY "Authenticated users can view tests" ON generated_tests
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tests" ON generated_tests
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tests" ON generated_tests
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Fix test_assignments policies
DROP POLICY IF EXISTS "Users can view test assignments" ON test_assignments;
DROP POLICY IF EXISTS "Users can update test assignments" ON test_assignments;
DROP POLICY IF EXISTS "Users can delete test assignments" ON test_assignments;
DROP POLICY IF EXISTS "Users can manage own test assignments" ON test_assignments;

CREATE POLICY "Users can view own test assignments" ON test_assignments
FOR SELECT USING (
  assigned_by = auth.uid() OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can manage own test assignments" ON test_assignments
FOR ALL USING (
  assigned_by = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- Fix student_responses policies  
DROP POLICY IF EXISTS "Student responses are viewable by everyone" ON student_responses;
DROP POLICY IF EXISTS "Student responses can be created by everyone" ON student_responses;
DROP POLICY IF EXISTS "Student responses can be updated by everyone" ON student_responses;
DROP POLICY IF EXISTS "Student responses can be deleted by everyone" ON student_responses;

CREATE POLICY "Teachers can view student responses" ON student_responses
FOR SELECT USING (
  has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Teachers can manage student responses" ON student_responses
FOR ALL USING (
  has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin')
);

-- Fix learning_competencies policies
DROP POLICY IF EXISTS "Learning competencies are viewable by everyone" ON learning_competencies;
DROP POLICY IF EXISTS "Learning competencies can be created by everyone" ON learning_competencies;
DROP POLICY IF EXISTS "Learning competencies can be updated by everyone" ON learning_competencies;
DROP POLICY IF EXISTS "Learning competencies can be deleted by everyone" ON learning_competencies;

CREATE POLICY "Authenticated users can view competencies" ON learning_competencies
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage competencies" ON learning_competencies
FOR ALL USING (auth.uid() IS NOT NULL);