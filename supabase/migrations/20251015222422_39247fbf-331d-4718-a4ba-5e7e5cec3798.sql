-- Update questions table to support the new workflow
-- Add created_by field to track source (admin or ai)
ALTER TABLE questions 
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'admin' CHECK (created_by IN ('admin', 'ai', 'teacher'));

-- Add status field for approval workflow (already exists, but ensure it's properly constrained)
-- The status column already exists from the schema

-- Add semantic_vector for similarity detection (already exists)
-- The semantic_vector column already exists from the schema

-- Ensure ai_generation_logs table exists (already in schema)
-- This table already exists

-- Create index on questions for better performance
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_approved ON questions(approved);

-- Update RLS policies to enforce Admin/Teacher separation
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can delete any question" ON questions;
DROP POLICY IF EXISTS "Owners can delete their own questions" ON questions;
DROP POLICY IF EXISTS "Anyone can read approved questions" ON questions;
DROP POLICY IF EXISTS "Teachers and admins can create questions" ON questions;
DROP POLICY IF EXISTS "Owners can update question content" ON questions;
DROP POLICY IF EXISTS "Admins and validators can approve questions" ON questions;

-- New RLS policies for strict role separation

-- Admin can view ALL questions (approved or pending)
CREATE POLICY "Admins can view all questions"
ON questions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can only view approved questions (not the question bank directly)
CREATE POLICY "Teachers can view approved questions"
ON questions FOR SELECT
TO authenticated
USING (
  approved = true 
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Only Admin can manually create questions
CREATE POLICY "Admins can create questions"
ON questions FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND created_by = 'admin'
);

-- System (AI) can create questions with 'ai' created_by and 'pending' status
CREATE POLICY "AI can create pending questions"
ON questions FOR INSERT
TO authenticated
WITH CHECK (
  created_by = 'ai'
  AND status = 'pending'
  AND approved = false
);

-- Only Admin can approve questions
CREATE POLICY "Admins can approve questions"
ON questions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only Admin can delete questions
CREATE POLICY "Admins can delete questions"
ON questions FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update ai_generation_logs RLS to allow system inserts
DROP POLICY IF EXISTS "System can insert generation logs" ON ai_generation_logs;
DROP POLICY IF EXISTS "Admins can view all generation logs" ON ai_generation_logs;
DROP POLICY IF EXISTS "Teachers can view their own generation logs" ON ai_generation_logs;

CREATE POLICY "Authenticated users can insert generation logs"
ON ai_generation_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all ai logs"
ON ai_generation_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view relevant ai logs"
ON ai_generation_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role));

-- Create function to check for duplicate questions using semantic similarity
CREATE OR REPLACE FUNCTION check_question_similarity(
  p_question_text TEXT,
  p_topic TEXT,
  p_bloom_level TEXT,
  p_threshold NUMERIC DEFAULT 0.85
)
RETURNS TABLE(
  similar_question_id UUID,
  similarity_score NUMERIC,
  question_text TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This is a placeholder for actual semantic similarity logic
  -- In production, this would use vector embeddings
  RETURN QUERY
  SELECT 
    q.id,
    0.9::NUMERIC as similarity,
    q.question_text
  FROM questions q
  WHERE q.topic = p_topic
    AND q.bloom_level = p_bloom_level
    AND q.approved = true
    AND q.question_text ILIKE '%' || p_question_text || '%'
  LIMIT 5;
END;
$$;

-- Create function to mark questions as used in tests
CREATE OR REPLACE FUNCTION mark_question_used(
  p_question_id UUID,
  p_test_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE questions
  SET 
    used_count = COALESCE(used_count, 0) + 1,
    used_history = COALESCE(used_history, '[]'::jsonb) || 
      jsonb_build_object(
        'test_id', p_test_id,
        'used_at', NOW()
      )
  WHERE id = p_question_id;
END;
$$;