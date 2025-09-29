-- Drop the existing generated_tests table first to recreate with proper schema
DROP TABLE IF EXISTS public.generated_tests CASCADE;

-- Recreate with correct schema
CREATE TABLE public.generated_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tos_id UUID REFERENCES public.tos_entries(id) ON DELETE CASCADE,
  version_label TEXT DEFAULT 'A',
  items JSONB NOT NULL,
  answer_key JSONB NOT NULL,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_tests
CREATE POLICY "Users can view generated tests" ON public.generated_tests FOR SELECT USING (true);
CREATE POLICY "Users can create generated tests" ON public.generated_tests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update generated tests" ON public.generated_tests FOR UPDATE USING (true);
CREATE POLICY "Users can delete generated tests" ON public.generated_tests FOR DELETE USING (true);