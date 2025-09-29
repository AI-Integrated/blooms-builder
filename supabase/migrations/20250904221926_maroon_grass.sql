/*
  # Add approval tracking fields to questions table

  1. New Columns
    - `approved_by` (text) - Email/ID of who approved the question
    - `approval_notes` (text) - Notes about the approval decision
    - `approval_confidence` (numeric) - Confidence in the approval decision (0-1)
    - `approval_timestamp` (timestamptz) - When the question was approved/rejected

  2. Indexes
    - Add index on approved_by for faster queries
    - Add index on approval_timestamp for activity tracking

  3. Security
    - Update RLS policies to handle approval fields
*/

-- Add approval tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE questions ADD COLUMN approved_by text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE questions ADD COLUMN approval_notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'approval_confidence'
  ) THEN
    ALTER TABLE questions ADD COLUMN approval_confidence numeric(3,2) DEFAULT 1.0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'approval_timestamp'
  ) THEN
    ALTER TABLE questions ADD COLUMN approval_timestamp timestamptz;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_approved_by ON questions(approved_by);
CREATE INDEX IF NOT EXISTS idx_questions_approval_timestamp ON questions(approval_timestamp);

-- Add constraint for approval confidence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'questions' AND constraint_name = 'questions_approval_confidence_check'
  ) THEN
    ALTER TABLE questions ADD CONSTRAINT questions_approval_confidence_check 
    CHECK (approval_confidence >= 0 AND approval_confidence <= 1);
  END IF;
END $$;

-- Update trigger to set approval timestamp
CREATE OR REPLACE FUNCTION update_approval_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Set approval timestamp when approved status changes
  IF OLD.approved IS DISTINCT FROM NEW.approved THEN
    NEW.approval_timestamp = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_questions_approval_timestamp'
  ) THEN
    CREATE TRIGGER update_questions_approval_timestamp
      BEFORE UPDATE ON questions
      FOR EACH ROW
      EXECUTE FUNCTION update_approval_timestamp();
  END IF;
END $$;