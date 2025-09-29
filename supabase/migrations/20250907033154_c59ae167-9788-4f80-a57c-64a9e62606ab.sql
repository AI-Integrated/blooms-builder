-- Enable realtime for collaboration tables
ALTER TABLE public.tos_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tos_entries;

ALTER TABLE public.questions REPLICA IDENTITY FULL;  
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;

ALTER TABLE public.learning_competencies REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_competencies;

ALTER TABLE public.generated_tests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generated_tests;