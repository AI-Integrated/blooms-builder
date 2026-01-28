-- Fix security warnings: Add search_path to functions and improve RLS policies

-- PART 1: Fix functions missing SET search_path = public

-- Fix cleanup_old_presence
CREATE OR REPLACE FUNCTION public.cleanup_old_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM document_presence 
  WHERE last_seen < now() - interval '1 hour' OR is_active = false;
END;
$function$;

-- Fix get_available_test_versions
CREATE OR REPLACE FUNCTION public.get_available_test_versions(p_parent_test_id uuid)
RETURNS TABLE(version_id uuid, version_number integer, assignment_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix get_user_role - use user_roles table with correct enum values (admin, teacher)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role::text FROM user_roles WHERE user_roles.user_id = $1
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'teacher' THEN 2
  END
  LIMIT 1;
$function$;

-- Fix increment_usage_count
CREATE OR REPLACE FUNCTION public.increment_usage_count(question_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE questions 
  SET used_count = COALESCE(used_count, 0) + 1,
      used_history = COALESCE(used_history, '[]'::jsonb) || jsonb_build_object('used_at', now())
  WHERE id = question_id;
END;
$function$;

-- Fix is_teacher_or_admin - use user_roles table
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 AND role IN ('admin', 'teacher')
  );
END;
$function$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_validation_timestamp
CREATE OR REPLACE FUNCTION public.update_validation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF OLD.validation_status IS DISTINCT FROM NEW.validation_status THEN
    NEW.validation_timestamp = NOW();
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix validate_version_balance
CREATE OR REPLACE FUNCTION public.validate_version_balance(p_parent_test_id uuid)
RETURNS TABLE(is_balanced boolean, max_diff integer, warning_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix assign_admin_role - use user_roles table
CREATE OR REPLACE FUNCTION public.assign_admin_role(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id FROM profiles WHERE email = user_email;
  IF target_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$function$;

-- PART 2: Fix RLS policies with WITH CHECK (true)

-- Fix activity_log policy
DROP POLICY IF EXISTS "System can create activity logs" ON activity_log;
CREATE POLICY "Authenticated users can create activity logs"
ON activity_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix document_activity policy
DROP POLICY IF EXISTS "System can create activity logs" ON document_activity;
CREATE POLICY "Authenticated users can create document activity"
ON document_activity
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix quality_metrics policy
DROP POLICY IF EXISTS "System can record quality metrics" ON quality_metrics;
CREATE POLICY "Authenticated users can record quality metrics"
ON quality_metrics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix system_metrics policy
DROP POLICY IF EXISTS "System can record metrics" ON system_metrics;
CREATE POLICY "Authenticated users can record system metrics"
ON system_metrics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix version_security_logs policy
DROP POLICY IF EXISTS "System can create security logs" ON version_security_logs;
CREATE POLICY "Authenticated users can create security logs"
ON version_security_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);