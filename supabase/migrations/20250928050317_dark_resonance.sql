/*
  # Enhanced AI Classification System Schema

  1. New Columns for questions table
    - `classification_confidence` - ML model confidence score
    - `semantic_vector` - Text embeddings for similarity analysis
    - `validation_status` - Validation workflow status
    - `validated_by` - Who validated the classification
    - `validation_timestamp` - When validation occurred

  2. New Tables
    - `question_similarities` - Store similarity relationships
    - `classification_validations` - Track validation history
    - `quality_metrics` - Store quality assessment data

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

-- Add new columns to questions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'classification_confidence'
  ) THEN
    ALTER TABLE questions ADD COLUMN classification_confidence NUMERIC DEFAULT 0.0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'semantic_vector'
  ) THEN
    ALTER TABLE questions ADD COLUMN semantic_vector TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'validation_status'
  ) THEN
    ALTER TABLE questions ADD COLUMN validation_status TEXT DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'validated_by'
  ) THEN
    ALTER TABLE questions ADD COLUMN validated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'validation_timestamp'
  ) THEN
    ALTER TABLE questions ADD COLUMN validation_timestamp TIMESTAMP;
  END IF;
END $$;

-- Create question_similarities table
CREATE TABLE IF NOT EXISTS question_similarities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question1_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  question2_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  similarity_score NUMERIC NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  algorithm_used TEXT NOT NULL,
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(question1_id, question2_id)
);

-- Create classification_validations table
CREATE TABLE IF NOT EXISTS classification_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  original_classification JSONB NOT NULL,
  validated_classification JSONB,
  validator_id UUID REFERENCES auth.users(id),
  validation_confidence NUMERIC CHECK (validation_confidence >= 0 AND validation_confidence <= 1),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create quality_metrics table for ISO 25010 compliance
CREATE TABLE IF NOT EXISTS quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'question', 'test', 'system'
  entity_id UUID,
  characteristic TEXT NOT NULL, -- 'functional_suitability', 'performance_efficiency', etc.
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  target_value NUMERIC,
  measurement_method TEXT,
  measured_at TIMESTAMP DEFAULT NOW(),
  measured_by UUID REFERENCES auth.users(id)
);

-- Add constraints
ALTER TABLE questions ADD CONSTRAINT questions_classification_confidence_check 
  CHECK (classification_confidence >= 0 AND classification_confidence <= 1);

ALTER TABLE questions ADD CONSTRAINT questions_validation_status_check 
  CHECK (validation_status IN ('pending', 'validated', 'rejected', 'needs_review'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_classification_confidence ON questions(classification_confidence);
CREATE INDEX IF NOT EXISTS idx_questions_validation_status ON questions(validation_status);
CREATE INDEX IF NOT EXISTS idx_questions_validated_by ON questions(validated_by);
CREATE INDEX IF NOT EXISTS idx_question_similarities_q1 ON question_similarities(question1_id);
CREATE INDEX IF NOT EXISTS idx_question_similarities_q2 ON question_similarities(question2_id);
CREATE INDEX IF NOT EXISTS idx_question_similarities_score ON question_similarities(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_classification_validations_question ON classification_validations(question_id);
CREATE INDEX IF NOT EXISTS idx_classification_validations_validator ON classification_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_entity ON quality_metrics(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_characteristic ON quality_metrics(characteristic);

-- Enable Row Level Security
ALTER TABLE question_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for question_similarities
CREATE POLICY "Question similarities are viewable by all authenticated users"
  ON question_similarities FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Question similarities can be created by authenticated users"
  ON question_similarities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Question similarities can be updated by authenticated users"
  ON question_similarities FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Policies for classification_validations
CREATE POLICY "Classification validations are viewable by all authenticated users"
  ON classification_validations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Classification validations can be created by authenticated users"
  ON classification_validations FOR INSERT
  WITH CHECK (auth.uid() = validator_id);

CREATE POLICY "Classification validations can be updated by validator"
  ON classification_validations FOR UPDATE
  USING (auth.uid() = validator_id);

-- Policies for quality_metrics
CREATE POLICY "Quality metrics are viewable by all authenticated users"
  ON quality_metrics FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Quality metrics can be created by authenticated users"
  ON quality_metrics FOR INSERT
  WITH CHECK (auth.uid() = measured_by);

CREATE POLICY "Quality metrics can be updated by measurer"
  ON quality_metrics FOR UPDATE
  USING (auth.uid() = measured_by);

-- Function to update validation status when questions are validated
CREATE OR REPLACE FUNCTION update_question_validation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update question validation status when a validation is created
  IF TG_OP = 'INSERT' THEN
    UPDATE questions 
    SET 
      validation_status = CASE 
        WHEN NEW.validated_classification IS NOT NULL THEN 'validated'
        ELSE 'rejected'
      END,
      validated_by = NEW.validator_id,
      validation_timestamp = NEW.created_at
    WHERE id = NEW.question_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation status updates
CREATE TRIGGER update_validation_status_trigger
  AFTER INSERT ON classification_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_question_validation_status();

-- Add realtime publication for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE question_similarities;
ALTER PUBLICATION supabase_realtime ADD TABLE classification_validations;
ALTER PUBLICATION supabase_realtime ADD TABLE quality_metrics;

-- Insert sample quality metrics for demonstration
INSERT INTO quality_metrics (entity_type, characteristic, metric_name, value, unit, target_value, measurement_method)
VALUES 
  ('system', 'functional_suitability', 'feature_completeness', 0.85, 'ratio', 0.90, 'manual_assessment'),
  ('system', 'performance_efficiency', 'response_time', 250, 'ms', 200, 'automated_monitoring'),
  ('system', 'usability', 'learnability', 0.82, 'ratio', 0.80, 'user_testing'),
  ('system', 'reliability', 'availability', 0.995, 'ratio', 0.99, 'uptime_monitoring');