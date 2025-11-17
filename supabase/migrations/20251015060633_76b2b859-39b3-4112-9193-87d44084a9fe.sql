-- Add ai_generation_logs table for tracking AI activity
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL, -- 'new', 'variant', 'similar'
  tos_id UUID,
  prompt_used TEXT,
  model_used TEXT DEFAULT 'google/gemini-2.5-flash',
  semantic_similarity_score NUMERIC,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_generation_logs
CREATE POLICY "Admins can view all generation logs"
ON public.ai_generation_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view their own generation logs"
ON public.ai_generation_logs FOR SELECT
USING (generated_by = auth.uid());

CREATE POLICY "System can insert generation logs"
ON public.ai_generation_logs FOR INSERT
WITH CHECK (true);

-- Update questions table to ensure status field exists
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);

-- Create index for faster question lookups
CREATE INDEX IF NOT EXISTS idx_questions_approved_status ON public.questions(approved, status) WHERE NOT deleted;