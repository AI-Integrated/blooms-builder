/*
  # Enhanced AI Classification System Schema

  1. Database Extensions
    - Add missing columns to questions table for enhanced classification
    - Create tables for similarity tracking and validation workflow
    - Add quality metrics tracking
    - Create ML model performance tracking

  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies for teachers and admins
    - Ensure data privacy and access control

  3. Indexes
    - Add performance indexes for classification queries
    - Add full-text search capabilities
    - Optimize similarity lookups
*/

-- Add missing columns to questions table if they don't exist
DO $$
BEGIN
  -- Add classification_confidence column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'classification_confidence'
  ) THEN
    ALTER TABLE questions ADD COLUMN classification_confidence NUMERIC DEFAULT 0.0;
  END IF;

  -- Add semantic_vector column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'semantic_vector'
  ) THEN
    ALTER TABLE questions ADD COLUMN semantic_vector TEXT;
  END IF;

  -- Add validation_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'validation_status'
  ) THEN
    ALTER TABLE questions ADD COLUMN validation_status TEXT DEFAULT 'pending';
  END IF;

  -- Add validated_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'validated_by'
  ) THEN
    ALTER TABLE questions ADD COLUMN validated_by UUID REFERENCES users(id);
  END IF;

  -- Add validation_timestamp column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'validation_timestamp'
  ) THEN
    ALTER TABLE questions ADD COLUMN validation_timestamp TIMESTAMP;
  END IF;

  -- Add quality_score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE questions ADD COLUMN quality_score NUMERIC DEFAULT 0.7;
  END IF;

  -- Add readability_score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'readability_score'
  ) THEN
    ALTER TABLE questions ADD COLUMN readability_score NUMERIC DEFAULT 8.0;
  END IF;
END $$;

-- Add constraints for new columns
DO $$
BEGIN
  -- Classification confidence constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'questions' AND constraint_name = 'questions_classification_confidence_check'
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_classification_confidence_check 
    CHECK (classification_confidence >= 0 AND classification_confidence <= 1);
  END IF;

  -- Validation status constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'questions' AND constraint_name = 'questions_validation_status_check'
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_validation_status_check 
    CHECK (validation_status IN ('pending', 'validated', 'rejected', 'needs_review'));
  END IF;

  -- Quality score constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'questions' AND constraint_name = 'questions_quality_score_check'
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_quality_score_check 
    CHECK (quality_score >= 0 AND quality_score <= 1);
  END IF;
END $$;

-- Create question_similarities table if it doesn't exist
CREATE TABLE IF NOT EXISTS question_similarities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question1_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  question2_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  similarity_score NUMERIC NOT NULL,
  algorithm_used TEXT NOT NULL,
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(question1_id, question2_id)
);

-- Add constraints for question_similarities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'question_similarities' AND constraint_name = 'question_similarities_similarity_score_check'
  ) THEN
    ALTER TABLE question_similarities ADD CONSTRAINT question_similarities_similarity_score_check 
    CHECK (similarity_score >= 0 AND similarity_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'question_similarities' AND constraint_name = 'question_similarities_algorithm_used_check'
  ) THEN
    ALTER TABLE question_similarities ADD CONSTRAINT question_similarities_algorithm_used_check 
    CHECK (algorithm_used IN ('cosine', 'jaccard', 'semantic'));
  END IF;
END $$;

-- Create classification_validations table if it doesn't exist
CREATE TABLE IF NOT EXISTS classification_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  original_classification JSONB NOT NULL,
  validated_classification JSONB NOT NULL,
  validator_id UUID REFERENCES users(id),
  validation_confidence NUMERIC NOT NULL,
  validation_type TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add constraints for classification_validations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'classification_validations' AND constraint_name = 'classification_validations_validation_confidence_check'
  ) THEN
    ALTER TABLE classification_validations ADD CONSTRAINT classification_validations_validation_confidence_check 
    CHECK (validation_confidence >= 0 AND validation_confidence <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'classification_validations' AND constraint_name = 'classification_validations_validation_type_check'
  ) THEN
    ALTER TABLE classification_validations ADD CONSTRAINT classification_validations_validation_type_check 
    CHECK (validation_type IN ('manual', 'peer_review', 'expert_review'));
  END IF;
END $$;

-- Create ml_model_performance table if it doesn't exist
CREATE TABLE IF NOT EXISTS ml_model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  predicted_classification JSONB NOT NULL,
  actual_classification JSONB,
  accuracy_score NUMERIC,
  confidence_score NUMERIC,
  evaluation_date TIMESTAMP DEFAULT NOW()
);

-- Add constraints for ml_model_performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'ml_model_performance' AND constraint_name = 'ml_model_performance_accuracy_score_check'
  ) THEN
    ALTER TABLE ml_model_performance ADD CONSTRAINT ml_model_performance_accuracy_score_check 
    CHECK (accuracy_score >= 0 AND accuracy_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'ml_model_performance' AND constraint_name = 'ml_model_performance_confidence_score_check'
  ) THEN
    ALTER TABLE ml_model_performance ADD CONSTRAINT ml_model_performance_confidence_score_check 
    CHECK (confidence_score >= 0 AND confidence_score <= 1);
  END IF;
END $$;

-- Create quality_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  characteristic TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  measurement_method TEXT,
  automated BOOLEAN DEFAULT true,
  measured_by UUID REFERENCES users(id),
  measured_at TIMESTAMP DEFAULT NOW()
);

-- Add constraints for quality_metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'quality_metrics' AND constraint_name = 'quality_metrics_entity_type_check'
  ) THEN
    ALTER TABLE quality_metrics ADD CONSTRAINT quality_metrics_entity_type_check 
    CHECK (entity_type IN ('question', 'test', 'system', 'user'));
  END IF;
END $$;

-- Create review_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  requested_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  notes TEXT,
  review_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Add constraints for review_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'review_requests' AND constraint_name = 'review_requests_request_type_check'
  ) THEN
    ALTER TABLE review_requests ADD CONSTRAINT review_requests_request_type_check 
    CHECK (request_type IN ('peer_review', 'expert_review'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'review_requests' AND constraint_name = 'review_requests_status_check'
  ) THEN
    ALTER TABLE review_requests ADD CONSTRAINT review_requests_status_check 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE question_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_similarities
CREATE POLICY "Question similarities are viewable by all authenticated users"
  ON question_similarities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Question similarities can be created by authenticated users"
  ON question_similarities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for classification_validations
CREATE POLICY "Classification validations are viewable by all authenticated us"
  ON classification_validations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create classification validations"
  ON classification_validations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = validator_id);

CREATE POLICY "Users can update their own validations"
  ON classification_validations FOR UPDATE
  TO authenticated
  USING (auth.uid() = validator_id);

-- RLS Policies for ml_model_performance
CREATE POLICY "ML model performance is viewable by all authenticated users"
  ON ml_model_performance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert ML model performance data"
  ON ml_model_performance FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for quality_metrics
CREATE POLICY "Quality metrics are viewable by all authenticated users"
  ON quality_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create quality metrics"
  ON quality_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = measured_by OR measured_by IS NULL);

-- RLS Policies for review_requests
CREATE POLICY "Users can view review requests they created or are assigned to"
  ON review_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requested_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can create review requests"
  ON review_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Assigned reviewers can update review requests"
  ON review_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = assigned_to);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_classification_confidence ON questions(classification_confidence);
CREATE INDEX IF NOT EXISTS idx_questions_validation_status ON questions(validation_status);
CREATE INDEX IF NOT EXISTS idx_questions_quality_score ON questions(quality_score);
CREATE INDEX IF NOT EXISTS idx_question_similarities_score ON question_similarities(similarity_score);
CREATE INDEX IF NOT EXISTS idx_classification_validations_question ON classification_validations(question_id);
CREATE INDEX IF NOT EXISTS idx_ml_model_performance_model ON ml_model_performance(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_entity ON quality_metrics(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);

-- Create trigger functions for automatic updates
CREATE OR REPLACE FUNCTION update_validation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.validation_status = 'validated' AND OLD.validation_status != 'validated' THEN
    NEW.validation_timestamp = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation timestamp
DROP TRIGGER IF EXISTS update_questions_validation_timestamp ON questions;
CREATE TRIGGER update_questions_validation_timestamp
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_validation_timestamp();

-- Create function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policies for questions table
DROP POLICY IF EXISTS "allow_question_approval_updates" ON questions;
CREATE POLICY "allow_question_approval_updates"
  ON questions FOR UPDATE
  TO authenticated
  USING (
    get_current_user_role() = 'admin' OR 
    (get_current_user_role() = 'teacher' AND created_by = auth.uid()::text)
  );

DROP POLICY IF EXISTS "admins_can_approve_any_question" ON questions;
CREATE POLICY "admins_can_approve_any_question"
  ON questions FOR UPDATE
  TO authenticated
  USING (get_current_user_role() = 'admin');