-- Ensure all required tables exist with proper structure

-- Update profiles table if needed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'teacher';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;

-- Update tos_entries table structure
ALTER TABLE tos_entries ADD COLUMN IF NOT EXISTS subject_no text;
ALTER TABLE tos_entries ADD COLUMN IF NOT EXISTS course text;
ALTER TABLE tos_entries ADD COLUMN IF NOT EXISTS year_section text;
ALTER TABLE tos_entries ADD COLUMN IF NOT EXISTS exam_period text;
ALTER TABLE tos_entries ADD COLUMN IF NOT EXISTS school_year text;
ALTER TABLE tos_entries ADD COLUMN IF NOT EXISTS prepared_by text;
ALTER TABLE tos_entries ADD COLUMN IF NOT EXISTS noted_by text;

-- Update questions table structure
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tos_id uuid REFERENCES tos_entries(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS stem text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS type text DEFAULT 'mcq';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source text DEFAULT 'teacher';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS confidence numeric DEFAULT 0.7;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS used_history jsonb DEFAULT '[]'::jsonb;

-- Update questions table to use 'stem' instead of 'question_text'
UPDATE questions SET stem = question_text WHERE stem IS NULL;

-- Generated tests table
CREATE TABLE IF NOT EXISTS generated_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tos_id uuid REFERENCES tos_entries(id) ON DELETE SET NULL,
  title text,
  params jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Test versions table  
CREATE TABLE IF NOT EXISTS test_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES generated_tests(id) ON DELETE CASCADE,
  label text NOT NULL,
  question_ids uuid[] NOT NULL,
  answer_key jsonb NOT NULL,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Activities table for analytics
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text,
  meta jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Bulk imports table
CREATE TABLE IF NOT EXISTS bulk_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text,
  status text DEFAULT 'processing',
  summary jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Storage bucket for PDF exports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exports', 'exports', true)
ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_q_tos ON questions(tos_id);
CREATE INDEX IF NOT EXISTS idx_q_bloom ON questions(bloom_level);
CREATE INDEX IF NOT EXISTS idx_q_topic ON questions(topic);
CREATE INDEX IF NOT EXISTS idx_q_approved ON questions(approved);
CREATE INDEX IF NOT EXISTS idx_tv_test ON test_versions(test_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_actor ON activities(actor);

-- Enable RLS on new tables
ALTER TABLE generated_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_imports ENABLE ROW LEVEL SECURITY;

-- RLS policies for generated_tests
CREATE POLICY "generated_tests owner or admin" ON generated_tests
FOR ALL USING (
  owner = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  owner = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- RLS policies for test_versions
CREATE POLICY "test_versions by test owner/admin" ON test_versions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM generated_tests gt 
    WHERE gt.id = test_versions.test_id AND (
      gt.owner = auth.uid() OR 
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM generated_tests gt 
    WHERE gt.id = test_versions.test_id AND (
      gt.owner = auth.uid() OR 
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
);

-- RLS policies for activities
CREATE POLICY "activities owner/admin read" ON activities
FOR SELECT USING (
  actor = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "activities insert own" ON activities
FOR INSERT WITH CHECK (actor = auth.uid());

-- RLS policies for bulk_imports
CREATE POLICY "bulk_imports owner or admin" ON bulk_imports
FOR ALL USING (
  owner = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  owner = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Storage policies for exports bucket
CREATE POLICY "Users can upload export files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'exports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view export files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'exports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own export files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'exports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own export files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'exports' AND auth.uid() IS NOT NULL);