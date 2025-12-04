-- 1. Drop and recreate is_admin function with consistent parameter name
DROP FUNCTION IF EXISTS public.is_admin(uuid);

CREATE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = uid AND ur.role = 'admin'
  );
$$;

-- 2. Update can_access_tos helper to use is_admin properly
CREATE OR REPLACE FUNCTION public.can_access_tos(tos_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (tos_owner = auth.uid()) OR public.is_admin(auth.uid());
$$;

-- 3. Drop existing tos_entries policies that may cause recursion
DROP POLICY IF EXISTS "select_own_tos" ON public.tos_entries;
DROP POLICY IF EXISTS "insert_own_tos" ON public.tos_entries;
DROP POLICY IF EXISTS "update_own_tos" ON public.tos_entries;
DROP POLICY IF EXISTS "delete_own_tos" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can create TOS entries" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can read their TOS" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can update their TOS" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can delete their TOS" ON public.tos_entries;

-- 4. Create safe RLS policies for tos_entries using helper functions
CREATE POLICY "select_own_tos"
ON public.tos_entries
FOR SELECT
USING (public.can_access_tos(owner));

CREATE POLICY "insert_own_tos"
ON public.tos_entries
FOR INSERT
WITH CHECK (owner = auth.uid());

CREATE POLICY "update_own_tos"
ON public.tos_entries
FOR UPDATE
USING (public.can_access_tos(owner))
WITH CHECK (public.can_access_tos(owner));

CREATE POLICY "delete_own_tos"
ON public.tos_entries
FOR DELETE
USING (public.can_access_tos(owner));

-- 5. Drop existing generated_tests policies
DROP POLICY IF EXISTS "insert_generated_tests" ON public.generated_tests;
DROP POLICY IF EXISTS "select_generated_tests" ON public.generated_tests;
DROP POLICY IF EXISTS "Users can create generated tests" ON public.generated_tests;
DROP POLICY IF EXISTS "Users can read their own generated tests" ON public.generated_tests;

-- 6. Create safe RLS policies for generated_tests
CREATE POLICY "insert_generated_tests"
ON public.generated_tests
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "select_generated_tests"
ON public.generated_tests
FOR SELECT
TO authenticated
USING ((created_by = auth.uid()) OR public.is_admin(auth.uid()));

-- 7. Allow users to update/delete their own generated tests
CREATE POLICY "update_generated_tests"
ON public.generated_tests
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "delete_generated_tests"
ON public.generated_tests
FOR DELETE
TO authenticated
USING (created_by = auth.uid());