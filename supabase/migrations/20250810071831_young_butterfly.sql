/*
  # Rubric-Based Evaluation System

  1. New Tables
    - `question_rubrics` - Links questions to their evaluation rubrics
    - `rubric_criteria` - Individual criteria for each rubric
    - `rubric_scores` - Student scores for each criterion
    - `student_responses` - Store student answers for grading

  2. Security
    - Enable RLS on all new tables
    - Add policies for teachers and students

  3. Features
    - Support for multiple criteria per question
    - Flexible scoring system
    - Comment system for detailed feedback
    - Integration with existing questions table
*/

-- Create question_rubrics table to link questions with their rubrics
CREATE TABLE IF NOT EXISTS question_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  total_points integer NOT NULL DEFAULT 10,
  created_by text NOT NULL DEFAULT 'teacher',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rubric_criteria table for individual evaluation criteria
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id uuid REFERENCES question_rubrics(id) ON DELETE CASCADE,
  criterion_name text NOT NULL,
  description text,
  max_points integer NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create student_responses table to store student answers
CREATE TABLE IF NOT EXISTS student_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_id text,
  response_text text NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  graded boolean DEFAULT false,
  total_score integer DEFAULT 0,
  graded_by text,
  graded_at timestamptz
);

-- Create rubric_scores table for detailed scoring
CREATE TABLE IF NOT EXISTS rubric_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES student_responses(id) ON DELETE CASCADE,
  criterion_id uuid REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  comments text,
  graded_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE question_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for question_rubrics
CREATE POLICY "Question rubrics are viewable by everyone"
  ON question_rubrics FOR SELECT
  USING (true);

CREATE POLICY "Question rubrics can be created by everyone"
  ON question_rubrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Question rubrics can be updated by everyone"
  ON question_rubrics FOR UPDATE
  USING (true);

CREATE POLICY "Question rubrics can be deleted by everyone"
  ON question_rubrics FOR DELETE
  USING (true);

-- Create policies for rubric_criteria
CREATE POLICY "Rubric criteria are viewable by everyone"
  ON rubric_criteria FOR SELECT
  USING (true);

CREATE POLICY "Rubric criteria can be created by everyone"
  ON rubric_criteria FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Rubric criteria can be updated by everyone"
  ON rubric_criteria FOR UPDATE
  USING (true);

CREATE POLICY "Rubric criteria can be deleted by everyone"
  ON rubric_criteria FOR DELETE
  USING (true);

-- Create policies for student_responses
CREATE POLICY "Student responses are viewable by everyone"
  ON student_responses FOR SELECT
  USING (true);

CREATE POLICY "Student responses can be created by everyone"
  ON student_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Student responses can be updated by everyone"
  ON student_responses FOR UPDATE
  USING (true);

CREATE POLICY "Student responses can be deleted by everyone"
  ON student_responses FOR DELETE
  USING (true);

-- Create policies for rubric_scores
CREATE POLICY "Rubric scores are viewable by everyone"
  ON rubric_scores FOR SELECT
  USING (true);

CREATE POLICY "Rubric scores can be created by everyone"
  ON rubric_scores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Rubric scores can be updated by everyone"
  ON rubric_scores FOR UPDATE
  USING (true);

CREATE POLICY "Rubric scores can be deleted by everyone"
  ON rubric_scores FOR DELETE
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for question_rubrics
CREATE TRIGGER update_question_rubrics_updated_at
  BEFORE UPDATE ON question_rubrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for demonstration
INSERT INTO question_rubrics (question_id, title, description, total_points, created_by) 
SELECT 
  q.id,
  'Essay Evaluation Rubric',
  'Comprehensive rubric for evaluating essay responses',
  20,
  'teacher'
FROM questions q 
WHERE q.question_type IN ('essay', 'short_answer')
LIMIT 1;

-- Insert sample criteria for the rubric
INSERT INTO rubric_criteria (rubric_id, criterion_name, description, max_points, order_index)
SELECT 
  r.id,
  criterion_data.name,
  criterion_data.description,
  criterion_data.points,
  criterion_data.order_idx
FROM question_rubrics r
CROSS JOIN (
  VALUES 
    ('Content Knowledge', 'Demonstrates understanding of key concepts', 8, 1),
    ('Organization', 'Clear structure with logical flow of ideas', 6, 2),
    ('Writing Quality', 'Grammar, spelling, and sentence structure', 4, 3),
    ('Critical Thinking', 'Analysis and evaluation of ideas', 2, 4)
) AS criterion_data(name, description, points, order_idx)
WHERE r.title = 'Essay Evaluation Rubric'
LIMIT 4;