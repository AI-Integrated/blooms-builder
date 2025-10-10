-- Add metadata fields to questions table for organized repository
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS grade_level TEXT,
  ADD COLUMN IF NOT EXISTS term TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_grade_level ON questions(grade_level);
CREATE INDEX IF NOT EXISTS idx_questions_term ON questions(term);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);

-- Add full-text search support
ALTER TABLE questions ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_questions_search ON questions USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_question_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.question_text, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.topic, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.choices::text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
DROP TRIGGER IF EXISTS questions_search_vector_update ON questions;
CREATE TRIGGER questions_search_vector_update
  BEFORE INSERT OR UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_question_search_vector();