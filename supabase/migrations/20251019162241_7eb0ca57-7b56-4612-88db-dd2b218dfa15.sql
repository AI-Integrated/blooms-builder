-- Fix infinite recursion in RLS policies by creating security definer functions
-- and removing security definer from analytics views

-- ============================================
-- PART 1: Create security definer functions to break RLS recursion
-- ============================================

-- Function to check if user is a document collaborator
CREATE OR REPLACE FUNCTION public.is_document_collaborator(p_document_id text, p_document_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.document_collaborators
    WHERE document_id = p_document_id
      AND document_type = p_document_type
      AND user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
$$;

-- Function to check if user is a TOS collaborator
CREATE OR REPLACE FUNCTION public.is_tos_collaborator(p_tos_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tos_collaborators
    WHERE tos_id = p_tos_id
      AND user_id = auth.uid()
  )
$$;

-- Function to check if user owns TOS
CREATE OR REPLACE FUNCTION public.is_tos_owner(p_tos_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tos_entries
    WHERE id = p_tos_id
      AND owner = auth.uid()
  )
$$;

-- ============================================
-- PART 2: Drop and recreate RLS policies without recursion
-- ============================================

-- Fix document_collaborators policies
DROP POLICY IF EXISTS "View own document collaborators" ON public.document_collaborators;
DROP POLICY IF EXISTS "Users can invite collaborators" ON public.document_collaborators;
DROP POLICY IF EXISTS "Users can update collaborator roles" ON public.document_collaborators;
DROP POLICY IF EXISTS "Users can remove collaborators" ON public.document_collaborators;

CREATE POLICY "Users can view collaborators for their documents"
ON public.document_collaborators
FOR SELECT
USING (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR is_document_collaborator(document_id, document_type)
);

CREATE POLICY "Users can invite collaborators to their documents"
ON public.document_collaborators
FOR INSERT
WITH CHECK (
  invited_by = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Document owners can update collaborators"
ON public.document_collaborators
FOR UPDATE
USING (
  invited_by = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR is_document_collaborator(document_id, document_type)
);

CREATE POLICY "Users can remove collaborators from their documents"
ON public.document_collaborators
FOR DELETE
USING (
  invited_by = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Fix document_presence policies
DROP POLICY IF EXISTS "View own document presence" ON public.document_presence;
DROP POLICY IF EXISTS "Users can track presence" ON public.document_presence;
DROP POLICY IF EXISTS "Users can update presence" ON public.document_presence;
DROP POLICY IF EXISTS "Users can remove presence" ON public.document_presence;

CREATE POLICY "Users can view presence for collaborative documents"
ON public.document_presence
FOR SELECT
USING (
  is_document_collaborator(document_id, document_type)
);

CREATE POLICY "Authenticated users can track their presence"
ON public.document_presence
FOR INSERT
WITH CHECK (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own presence"
ON public.document_presence
FOR UPDATE
USING (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can remove their own presence"
ON public.document_presence
FOR DELETE
USING (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Fix collaboration_messages policies
DROP POLICY IF EXISTS "View own document messages" ON public.collaboration_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.collaboration_messages;

CREATE POLICY "Collaborators can view document messages"
ON public.collaboration_messages
FOR SELECT
USING (
  is_document_collaborator(document_id, document_type)
);

CREATE POLICY "Collaborators can send messages"
ON public.collaboration_messages
FOR INSERT
WITH CHECK (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND is_document_collaborator(document_id, document_type)
);

-- Fix document_activity policies
DROP POLICY IF EXISTS "View own document activity" ON public.document_activity;
DROP POLICY IF EXISTS "Users can log activity" ON public.document_activity;

CREATE POLICY "Collaborators can view document activity"
ON public.document_activity
FOR SELECT
USING (
  is_document_collaborator(document_id, document_type)
);

CREATE POLICY "Collaborators can log activity"
ON public.document_activity
FOR INSERT
WITH CHECK (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND is_document_collaborator(document_id, document_type)
);

-- ============================================
-- PART 3: Remove SECURITY DEFINER from analytics views
-- ============================================

-- Recreate analytics views as SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.analytics_approval_stats;
CREATE VIEW public.analytics_approval_stats AS
SELECT 
  CASE 
    WHEN approved THEN 'Approved'
    ELSE 'Pending'
  END as name,
  COUNT(*) as value
FROM public.questions
WHERE owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
GROUP BY approved;

DROP VIEW IF EXISTS public.analytics_bloom_distribution;
CREATE VIEW public.analytics_bloom_distribution AS
SELECT 
  bloom_level as name,
  COUNT(*) as value,
  ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0), 2) as percentage
FROM public.questions
WHERE owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
GROUP BY bloom_level;

DROP VIEW IF EXISTS public.analytics_creator_stats;
CREATE VIEW public.analytics_creator_stats AS
SELECT 
  created_by as name,
  COUNT(*) as value
FROM public.questions
WHERE owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
GROUP BY created_by;

DROP VIEW IF EXISTS public.analytics_difficulty_spread;
CREATE VIEW public.analytics_difficulty_spread AS
SELECT 
  difficulty as name,
  COUNT(*) as value,
  ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0), 2) as percentage
FROM public.questions
WHERE owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
GROUP BY difficulty;

DROP VIEW IF EXISTS public.analytics_topic_analysis;
CREATE VIEW public.analytics_topic_analysis AS
SELECT 
  topic,
  COUNT(*) as count,
  SUM(CASE WHEN approved THEN 1 ELSE 0 END) as approved
FROM public.questions
WHERE owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
GROUP BY topic
ORDER BY count DESC
LIMIT 20;