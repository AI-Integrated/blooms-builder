-- Add comprehensive approval fields to questions table
ALTER TABLE public.questions
ADD COLUMN approved boolean DEFAULT false,
ADD COLUMN approved_by text,
ADD COLUMN approval_notes text,
ADD COLUMN approval_confidence float;