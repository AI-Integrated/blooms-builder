-- Enable realtime replication for analytics tables
ALTER TABLE public.questions REPLICA IDENTITY FULL;
ALTER TABLE public.activity_log REPLICA IDENTITY FULL;
ALTER TABLE public.tos_entries REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tos_entries;

-- Create optimized analytics views for better performance
CREATE OR REPLACE VIEW analytics_bloom_distribution AS
SELECT 
  bloom_level as name,
  COUNT(*) as value,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM questions WHERE NOT deleted), 2) as percentage
FROM questions 
WHERE NOT deleted
GROUP BY bloom_level;

CREATE OR REPLACE VIEW analytics_difficulty_spread AS
SELECT 
  difficulty as name,
  COUNT(*) as value,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM questions WHERE NOT deleted), 2) as percentage
FROM questions 
WHERE NOT deleted
GROUP BY difficulty;

CREATE OR REPLACE VIEW analytics_creator_stats AS
SELECT 
  CASE 
    WHEN created_by IN ('ai', 'bulk_import') THEN 'AI Generated'
    ELSE 'Teacher Created'
  END as name,
  COUNT(*) as value
FROM questions 
WHERE NOT deleted
GROUP BY 
  CASE 
    WHEN created_by IN ('ai', 'bulk_import') THEN 'AI Generated'
    ELSE 'Teacher Created'
  END;

CREATE OR REPLACE VIEW analytics_approval_stats AS
SELECT 
  CASE 
    WHEN approved = true THEN 'Approved'
    ELSE 'Pending Review'
  END as name,
  COUNT(*) as value
FROM questions 
WHERE NOT deleted
GROUP BY approved;

CREATE OR REPLACE VIEW analytics_topic_analysis AS
SELECT 
  topic,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE approved = true) as approved
FROM questions 
WHERE NOT deleted
GROUP BY topic
ORDER BY count DESC;