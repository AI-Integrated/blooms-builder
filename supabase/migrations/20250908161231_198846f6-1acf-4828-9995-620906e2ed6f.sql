-- Drop existing rubric tables to recreate with new schema
DROP TABLE IF EXISTS rubric_scores CASCADE;
DROP TABLE IF EXISTS rubric_criteria CASCADE;
DROP TABLE IF EXISTS rubrics CASCADE;

-- Create rubrics table for rubric definitions
CREATE TABLE public.rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create rubric_criteria table for multiple criteria per rubric
CREATE TABLE public.rubric_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id uuid REFERENCES public.rubrics(id) ON DELETE CASCADE,
  name text NOT NULL,
  weight numeric DEFAULT 1.0,
  max_score numeric DEFAULT 5,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create rubric_scores table for teacher scoring
CREATE TABLE public.rubric_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  test_id uuid REFERENCES public.generated_tests(id) ON DELETE SET NULL,
  student_id uuid,
  student_name text,
  scorer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scores jsonb NOT NULL DEFAULT '{}',
  total_score numeric NOT NULL DEFAULT 0,
  comments text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for rubrics
CREATE POLICY "Users can view all rubrics" ON public.rubrics
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own rubrics" ON public.rubrics
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own rubrics" ON public.rubrics
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own rubrics" ON public.rubrics
  FOR DELETE USING (auth.uid() = created_by);

-- RLS policies for rubric_criteria
CREATE POLICY "Users can view all rubric criteria" ON public.rubric_criteria
  FOR SELECT USING (true);

CREATE POLICY "Users can manage criteria for their rubrics" ON public.rubric_criteria
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rubrics 
      WHERE id = rubric_criteria.rubric_id 
      AND created_by = auth.uid()
    )
  );

-- RLS policies for rubric_scores
CREATE POLICY "Users can view their own scores" ON public.rubric_scores
  FOR SELECT USING (auth.uid() = scorer_id);

CREATE POLICY "Users can create scores" ON public.rubric_scores
  FOR INSERT WITH CHECK (auth.uid() = scorer_id);

CREATE POLICY "Users can update their own scores" ON public.rubric_scores
  FOR UPDATE USING (auth.uid() = scorer_id);

CREATE POLICY "Users can delete their own scores" ON public.rubric_scores
  FOR DELETE USING (auth.uid() = scorer_id);

-- Create indexes for better performance
CREATE INDEX idx_rubrics_created_by ON public.rubrics(created_by);
CREATE INDEX idx_rubric_criteria_rubric_id ON public.rubric_criteria(rubric_id);
CREATE INDEX idx_rubric_scores_question_id ON public.rubric_scores(question_id);
CREATE INDEX idx_rubric_scores_test_id ON public.rubric_scores(test_id);
CREATE INDEX idx_rubric_scores_scorer_id ON public.rubric_scores(scorer_id);

-- Create function to automatically calculate total score
CREATE OR REPLACE FUNCTION calculate_rubric_total_score()
RETURNS TRIGGER AS $$
DECLARE
  criterion RECORD;
  total numeric := 0;
BEGIN
  -- Calculate total based on criteria weights and scores
  FOR criterion IN 
    SELECT rc.id, rc.weight, rc.max_score
    FROM public.rubric_criteria rc
    JOIN public.rubrics r ON r.id = rc.rubric_id
    JOIN public.questions q ON q.id = NEW.question_id
  LOOP
    total := total + COALESCE((NEW.scores->>(criterion.id::text))::numeric, 0) * criterion.weight;
  END LOOP;
  
  NEW.total_score := total;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate total score
CREATE TRIGGER calculate_total_score_trigger
  BEFORE INSERT OR UPDATE ON public.rubric_scores
  FOR EACH ROW
  EXECUTE FUNCTION calculate_rubric_total_score();