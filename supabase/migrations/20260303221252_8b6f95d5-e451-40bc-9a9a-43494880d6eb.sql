
-- Add category, specialization, subject_code, subject_description columns to questions table
ALTER TABLE public.questions 
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS subject_code text,
  ADD COLUMN IF NOT EXISTS subject_description text;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_specialization ON public.questions(specialization);
CREATE INDEX IF NOT EXISTS idx_questions_subject_code ON public.questions(subject_code);
