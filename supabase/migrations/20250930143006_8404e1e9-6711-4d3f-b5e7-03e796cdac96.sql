-- Phase 3: Multi-Version Test Generation Schema

-- Add versioning support to generated_tests
ALTER TABLE generated_tests 
ADD COLUMN IF NOT EXISTS parent_test_id UUID REFERENCES generated_tests(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS question_order JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS shuffle_seed TEXT,
ADD COLUMN IF NOT EXISTS watermark_data JSONB DEFAULT '{}'::jsonb;

-- Create test_assignments table for secure distribution
CREATE TABLE IF NOT EXISTS test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  test_version_id UUID REFERENCES generated_tests(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  seat_number TEXT,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'started', 'completed', 'submitted')),
  started_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test_distribution_logs for auditing
CREATE TABLE IF NOT EXISTS test_distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_test_id UUID REFERENCES generated_tests(id) ON DELETE CASCADE,
  distribution_strategy TEXT NOT NULL,
  total_versions INTEGER NOT NULL,
  total_students INTEGER NOT NULL,
  distributed_by UUID REFERENCES auth.users(id),
  distributed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create version_security_logs for anti-cheating tracking
CREATE TABLE IF NOT EXISTS version_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_version_id UUID REFERENCES generated_tests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical'))
);

-- Enable RLS
ALTER TABLE test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_distribution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_security_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_assignments
CREATE POLICY "Teachers can view all test assignments"
ON test_assignments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Teachers can create test assignments"
ON test_assignments FOR INSERT
WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Teachers can update their test assignments"
ON test_assignments FOR UPDATE
USING (auth.uid() = assigned_by);

CREATE POLICY "Teachers can delete their test assignments"
ON test_assignments FOR DELETE
USING (auth.uid() = assigned_by);

-- RLS Policies for test_distribution_logs
CREATE POLICY "Teachers can view distribution logs"
ON test_distribution_logs FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Teachers can create distribution logs"
ON test_distribution_logs FOR INSERT
WITH CHECK (auth.uid() = distributed_by);

-- RLS Policies for version_security_logs
CREATE POLICY "Teachers can view security logs"
ON version_security_logs FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert security logs"
ON version_security_logs FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_assignments_student ON test_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_test_assignments_version ON test_assignments(test_version_id);
CREATE INDEX IF NOT EXISTS idx_test_assignments_status ON test_assignments(status);
CREATE INDEX IF NOT EXISTS idx_generated_tests_parent ON generated_tests(parent_test_id);
CREATE INDEX IF NOT EXISTS idx_distribution_logs_parent ON test_distribution_logs(parent_test_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_version ON version_security_logs(test_version_id);

-- Create function to get available versions for distribution
CREATE OR REPLACE FUNCTION get_available_test_versions(p_parent_test_id UUID)
RETURNS TABLE(
  version_id UUID,
  version_number INTEGER,
  assignment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gt.id as version_id,
    gt.version_number,
    COUNT(ta.id) as assignment_count
  FROM generated_tests gt
  LEFT JOIN test_assignments ta ON ta.test_version_id = gt.id
  WHERE gt.parent_test_id = p_parent_test_id 
     OR (gt.id = p_parent_test_id AND gt.parent_test_id IS NULL)
  GROUP BY gt.id, gt.version_number
  ORDER BY gt.version_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate version distribution
CREATE OR REPLACE FUNCTION validate_version_balance(p_parent_test_id UUID)
RETURNS TABLE(
  is_balanced BOOLEAN,
  max_diff INTEGER,
  warning_message TEXT
) AS $$
DECLARE
  v_max_count INTEGER;
  v_min_count INTEGER;
  v_diff INTEGER;
BEGIN
  SELECT MAX(cnt), MIN(cnt) INTO v_max_count, v_min_count
  FROM (
    SELECT COUNT(*) as cnt
    FROM test_assignments ta
    JOIN generated_tests gt ON gt.id = ta.test_version_id
    WHERE gt.parent_test_id = p_parent_test_id 
       OR (gt.id = p_parent_test_id AND gt.parent_test_id IS NULL)
    GROUP BY gt.id
  ) counts;
  
  v_diff := COALESCE(v_max_count - v_min_count, 0);
  
  RETURN QUERY SELECT 
    v_diff <= 2 as is_balanced,
    v_diff as max_diff,
    CASE 
      WHEN v_diff > 5 THEN 'Severe imbalance detected'
      WHEN v_diff > 2 THEN 'Minor imbalance detected'
      ELSE 'Distribution is balanced'
    END as warning_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;