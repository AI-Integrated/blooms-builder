CREATE TABLE public.user_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  draft_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, draft_key)
);

CREATE INDEX idx_user_drafts_user_key ON public.user_drafts(user_id, draft_key);

ALTER TABLE public.user_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own drafts"
  ON public.user_drafts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts"
  ON public.user_drafts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
  ON public.user_drafts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON public.user_drafts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_drafts_updated_at
  BEFORE UPDATE ON public.user_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();