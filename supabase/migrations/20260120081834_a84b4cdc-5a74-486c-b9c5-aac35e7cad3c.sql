-- Fix profiles table: drop existing admin policy and recreate
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create admin-only SELECT policy for profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix user_analytics: drop any existing policies and create admin-only
DROP POLICY IF EXISTS "Only admins can view user analytics" ON public.user_analytics;

CREATE POLICY "Only admins can view user analytics"
ON public.user_analytics
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));