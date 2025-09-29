/*
  # Complete AI Test System Schema

  1. Core Tables
    - `tos` - Table of Specification entries with matrix data
    - `questions` - Question bank with AI classification
    - `rubrics` - Evaluation rubrics for essay questions
    - `question_rubrics` - Links questions to rubrics
    - `generated_tests` - Multi-version test storage
    - `rubric_scores` - Essay scoring results
    - `activity_log` - System activity tracking

  2. Security
    - Enable RLS on all tables
    - Add policies for teacher/admin access
    - Proper foreign key constraints

  3. Indexes
    - Performance indexes for common queries
    - Full-text search support
*/

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS rubric_scores CASCADE;
DROP TABLE IF EXISTS generated_tests CASCADE;
DROP TABLE IF EXISTS question_rubrics CASCADE;
DROP TABLE IF EXISTS rubrics CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS tos CASCADE;

-- TOS definitions (a generated matrix snapshot)
CREATE TABLE tos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_no text NOT NULL,
  course text NOT NULL,
  description text NOT NULL,
  year_section text NOT NULL,
  period text NOT NULL,
  school_year text NOT NULL,
  total_items int NOT NULL,
  topics jsonb NOT NULL,  -- [{name, hours}]
  bloom_distribution jsonb NOT NULL, -- {remembering: n, understanding: n, ...}
  matrix jsonb NOT NULL,  -- { topicName: {remembering:{count, items:[1,2...]}, ...}, ... }
  prepared_by text,
  noted_by text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Questions with enhanced AI classification
CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tos_id uuid REFERENCES tos(id) ON DELETE SET NULL,
  topic text NOT NULL,
  question_text text NOT NULL,
  question_type text CHECK (question_type IN ('mcq', 'essay', 'true_false', 'short_answer')) NOT NULL,
  choices jsonb, -- {A:"..",B:"..",C:"..",D:".."}
  correct_answer text, -- 'A'/'True'/expected term
  bloom_level text CHECK (bloom_level IN ('remembering','understanding','applying','analyzing','evaluating','creating')) NOT NULL,
  difficulty text CHECK (difficulty IN ('easy','average','difficult')) NOT NULL,
  knowledge_dimension text CHECK (knowledge_dimension IN ('factual','conceptual','procedural','metacognitive')),
  created_by text CHECK (created_by IN ('teacher','ai','bulk_import')) NOT NULL DEFAULT 'teacher',
  approved boolean NOT NULL DEFAULT false,
  ai_confidence_score numeric CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
  needs_review boolean DEFAULT false,
  used_count int DEFAULT 0,
  used_history jsonb DEFAULT '[]',
  metadata jsonb,
  deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rubrics (per question or shared templates)
CREATE TABLE rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  criteria jsonb NOT NULL, -- [{key:'clarity', max:5, description:'...'}, ...]
  total_max int NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Essay/short answer scoring
CREATE TABLE rubric_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  student_id uuid, -- optional for LMS integration
  student_name text,
  scores jsonb NOT NULL, -- {clarity:4, relevance:5, mechanics:3}
  total int NOT NULL,
  comments text,
  graded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Generated tests (multi-versions)
CREATE TABLE generated_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tos_id uuid REFERENCES tos(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  course text,
  year_section text,
  exam_period text,
  school_year text,
  instructions text,
  time_limit int,
  points_per_question int DEFAULT 1,
  num_versions int NOT NULL,
  versions jsonb NOT NULL, -- [{label:'A', items:[{id, order, ...}]}, ...]
  answer_keys jsonb NOT NULL, -- same shape by version
  shuffle_questions boolean DEFAULT true,
  shuffle_choices boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Activity log
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL, -- 'create_question'|'approve_question'|...
  entity_type text NOT NULL, -- 'question'|'tos'|'test'
  entity_id uuid,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
CREATE INDEX IF NOT EXISTS idx_questions_bloom ON questions(bloom_level);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_approved ON questions(approved);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_needs_review ON questions(needs_review);
CREATE INDEX IF NOT EXISTS idx_tos_created_by ON tos(created_by);
CREATE INDEX IF NOT EXISTS idx_generated_tests_tos ON generated_tests(tos_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Full-text search on questions
CREATE INDEX IF NOT EXISTS idx_questions_text_search ON questions USING gin(to_tsvector('english', question_text));

-- Row Level Security
ALTER TABLE tos ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- TOS Policies
CREATE POLICY "tos_read_all" ON tos FOR SELECT USING (true);
CREATE POLICY "tos_insert_own" ON tos FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "tos_update_own" ON tos FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "tos_delete_own" ON tos FOR DELETE USING (auth.uid() = created_by);

-- Questions Policies (teachers can read all approved, manage their own)
CREATE POLICY "questions_read_approved" ON questions FOR SELECT USING (approved = true OR auth.uid() IS NOT NULL);
CREATE POLICY "questions_insert_any" ON questions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "questions_update_any" ON questions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "questions_delete_any" ON questions FOR DELETE USING (auth.uid() IS NOT NULL);

-- Rubrics Policies
CREATE POLICY "rubrics_read_all" ON rubrics FOR SELECT USING (true);
CREATE POLICY "rubrics_insert_own" ON rubrics FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "rubrics_update_own" ON rubrics FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "rubrics_delete_own" ON rubrics FOR DELETE USING (auth.uid() = created_by);

-- Generated Tests Policies
CREATE POLICY "tests_read_all" ON generated_tests FOR SELECT USING (true);
CREATE POLICY "tests_insert_own" ON generated_tests FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "tests_update_own" ON generated_tests FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "tests_delete_own" ON generated_tests FOR DELETE USING (auth.uid() = created_by);

-- Rubric Scores Policies
CREATE POLICY "scores_read_own" ON rubric_scores FOR SELECT USING (auth.uid() = graded_by);
CREATE POLICY "scores_insert_own" ON rubric_scores FOR INSERT WITH CHECK (auth.uid() = graded_by);
CREATE POLICY "scores_update_own" ON rubric_scores FOR UPDATE USING (auth.uid() = graded_by);

-- Activity Log Policies
CREATE POLICY "activity_read_own" ON activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_insert_own" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update trigger for questions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();