-- ============================================
-- COMPREHENSIVE FIX MIGRATION (CORRECTED)
-- Addresses Critical Issues #2, #4, and #7
-- ============================================

-- PART 1: Fix RLS Policy Violations on quality_metrics
-- ============================================
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "authenticated_can_insert_quality_metrics" ON quality_metrics;
  DROP POLICY IF EXISTS "Authenticated users can create quality metrics" ON quality_metrics;
END $$;

CREATE POLICY "authenticated_can_insert_quality_metrics" 
ON quality_metrics 
FOR INSERT 
TO authenticated 
WITH CHECK (true);


-- PART 2: Fix RLS Policy Violations on system_metrics
-- ============================================
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "authenticated_can_insert_system_metrics" ON system_metrics;
  DROP POLICY IF EXISTS "Authenticated users can create system metrics" ON system_metrics;
END $$;

CREATE POLICY "authenticated_can_insert_system_metrics" 
ON system_metrics 
FOR INSERT 
TO authenticated 
WITH CHECK (true);


-- PART 3: Fix Missing User Role Assignment on Signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();

  -- Assign default teacher role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'teacher'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- PART 4: Add Performance Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_questions_topic_bloom_difficulty 
ON questions(topic, bloom_level, difficulty) 
WHERE approved = true AND deleted = false;

CREATE INDEX IF NOT EXISTS idx_questions_approved_used 
ON questions(approved, used_count) 
WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_tos_entries_owner 
ON tos_entries(owner);


-- PART 5: Grant Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

GRANT SELECT, INSERT ON quality_metrics TO authenticated;
GRANT SELECT, INSERT ON system_metrics TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;


-- ============================================
-- MIGRATION COMPLETE
-- This fixes RLS violations, adds auto-role assignment, and optimizes queries
-- ============================================