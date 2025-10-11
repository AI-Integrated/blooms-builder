-- Phase 1: Security Infrastructure - Roles & RLS Policies

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'validator', 'student');

-- 2. Create user_roles table (CRITICAL: roles must be in separate table)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    granted_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Update get_current_user_role to use user_roles table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'validator' THEN 2
    WHEN 'teacher' THEN 3
    WHEN 'student' THEN 4
  END
  LIMIT 1
$$;

-- 5. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Drop existing overly permissive policies on questions
DROP POLICY IF EXISTS "questions_read_approved" ON questions;
DROP POLICY IF EXISTS "questions_insert_any" ON questions;
DROP POLICY IF EXISTS "questions_update_any" ON questions;
DROP POLICY IF EXISTS "questions_delete_any" ON questions;
DROP POLICY IF EXISTS "Users can view all questions" ON questions;
DROP POLICY IF EXISTS "Users can update questions" ON questions;
DROP POLICY IF EXISTS "Users can delete questions" ON questions;

-- 8. Implement proper RLS policies for questions table
CREATE POLICY "Anyone can read approved questions"
ON public.questions FOR SELECT
USING (approved = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Teachers and admins can create questions"
ON public.questions FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'teacher') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Owners can update their own questions"
ON public.questions FOR UPDATE
TO authenticated
USING (owner = auth.uid())
WITH CHECK (owner = auth.uid());

CREATE POLICY "Admins can update any question"
ON public.questions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete their own questions"
ON public.questions FOR DELETE
TO authenticated
USING (owner = auth.uid());

CREATE POLICY "Admins can delete any question"
ON public.questions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 9. RLS policies for classification_validations (admin/validator only)
DROP POLICY IF EXISTS "Classification validations are viewable by all authenticated us" ON classification_validations;
DROP POLICY IF EXISTS "Users can create classification validations" ON classification_validations;
DROP POLICY IF EXISTS "Users can update their own validations" ON classification_validations;

CREATE POLICY "Validators and admins can view validations"
ON public.classification_validations FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'validator')
);

CREATE POLICY "Validators and admins can create validations"
ON public.classification_validations FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'validator'))
  AND validator_id = auth.uid()
);

CREATE POLICY "Validators can update their own validations"
ON public.classification_validations FOR UPDATE
TO authenticated
USING (validator_id = auth.uid());

-- 10. Trigger for automatic similarity recalculation
CREATE OR REPLACE FUNCTION public.trigger_similarity_recalculation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark question for recalculation by setting metadata flag
  NEW.metadata = COALESCE(NEW.metadata, '{}'::jsonb) || 
    jsonb_build_object(
      'needs_similarity_update', true,
      'similarity_update_queued_at', NOW()
    );
  
  -- Send notification for background worker
  PERFORM pg_notify(
    'similarity_update',
    json_build_object(
      'question_id', NEW.id,
      'question_text', NEW.question_text,
      'action', TG_OP
    )::text
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on questions table
DROP TRIGGER IF EXISTS on_question_change_similarity ON questions;
CREATE TRIGGER on_question_change_similarity
  BEFORE INSERT OR UPDATE OF question_text, topic, bloom_level
  ON questions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_similarity_recalculation();

-- 11. Function to log classification metrics
CREATE OR REPLACE FUNCTION public.log_classification_metric(
  p_question_id UUID,
  p_confidence NUMERIC,
  p_cognitive_level TEXT,
  p_response_time_ms NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO system_metrics (
    metric_category,
    metric_name,
    metric_value,
    metric_unit,
    dimensions
  ) VALUES (
    'classification',
    'confidence_score',
    p_confidence,
    'score',
    jsonb_build_object(
      'question_id', p_question_id,
      'cognitive_level', p_cognitive_level,
      'response_time_ms', p_response_time_ms
    )
  );
END;
$$;

-- 12. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_questions_owner ON questions(owner);
CREATE INDEX IF NOT EXISTS idx_questions_approved ON questions(approved);
CREATE INDEX IF NOT EXISTS idx_questions_needs_review ON questions(needs_review);
CREATE INDEX IF NOT EXISTS idx_classification_validations_validator ON classification_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_category_measured ON system_metrics(metric_category, measured_at DESC);

-- 13. Grant necessary permissions to authenticated role
GRANT SELECT ON user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION log_classification_metric(UUID, NUMERIC, TEXT, NUMERIC) TO authenticated;