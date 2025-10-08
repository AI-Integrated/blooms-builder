-- Add RLS policies for question_similarities (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'question_similarities' AND policyname = 'Users can view question similarities'
  ) THEN
    CREATE POLICY "Users can view question similarities"
    ON question_similarities FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'question_similarities' AND policyname = 'System can insert question similarities'
  ) THEN
    CREATE POLICY "System can insert question similarities"
    ON question_similarities FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Trigger to update validation timestamp on questions
CREATE OR REPLACE FUNCTION update_validation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.validation_status IS DISTINCT FROM NEW.validation_status THEN
    NEW.validation_timestamp = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_question_validation_timestamp ON questions;
CREATE TRIGGER update_question_validation_timestamp
BEFORE UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION update_validation_timestamp();

-- Function to recalculate semantic similarities for a question
CREATE OR REPLACE FUNCTION recalculate_question_similarities()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark that recalculation is needed
  NEW.metadata = COALESCE(NEW.metadata, '{}'::jsonb) || 
    jsonb_build_object('needs_similarity_recalc', true, 'recalc_queued_at', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS queue_similarity_recalculation ON questions;
CREATE TRIGGER queue_similarity_recalculation
BEFORE UPDATE ON questions
FOR EACH ROW
WHEN (OLD.question_text IS DISTINCT FROM NEW.question_text OR 
      OLD.bloom_level IS DISTINCT FROM NEW.bloom_level OR
      OLD.semantic_vector IS DISTINCT FROM NEW.semantic_vector)
EXECUTE FUNCTION recalculate_question_similarities();

-- Enable realtime for classification tables
DO $$
BEGIN
  -- Add tables to realtime publication if not already added
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE questions;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE classification_validations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE question_similarities;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;