-- Add cognitive_level column to questions table
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS cognitive_level TEXT;

-- Update existing records to use bloom_level as cognitive_level if not set
UPDATE questions 
SET cognitive_level = bloom_level 
WHERE cognitive_level IS NULL;

-- Add index for better query performance on classification fields
CREATE INDEX IF NOT EXISTS idx_questions_cognitive_level ON questions(cognitive_level);
CREATE INDEX IF NOT EXISTS idx_questions_knowledge_dimension ON questions(knowledge_dimension);

-- Update classification_validations to include both dimensions
ALTER TABLE classification_validations
  ADD COLUMN IF NOT EXISTS cognitive_level TEXT,
  ADD COLUMN IF NOT EXISTS knowledge_dimension TEXT;

-- Add comment for documentation
COMMENT ON COLUMN questions.cognitive_level IS 'Bloom''s Taxonomy cognitive process: remembering, understanding, applying, analyzing, evaluating, creating';
COMMENT ON COLUMN questions.knowledge_dimension IS 'Knowledge dimension: factual, conceptual, procedural, metacognitive';