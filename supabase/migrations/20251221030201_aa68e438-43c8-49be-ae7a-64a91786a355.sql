-- Update all questions to approved = true
UPDATE public.questions SET approved = true WHERE approved = false OR approved IS NULL;