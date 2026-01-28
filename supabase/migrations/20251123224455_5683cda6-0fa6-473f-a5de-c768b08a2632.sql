-- Drop ALL existing policies on tos_entries to start fresh
DROP POLICY IF EXISTS "Teachers can create TOS entries" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can create TOS entries" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can update their TOS entries" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can delete their TOS entries" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can read their TOS entries" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can read their own TOS entries" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can update their own TOS entries" ON public.tos_entries;
DROP POLICY IF EXISTS "Users can delete their own TOS entries" ON public.tos_entries;

-- Recreate policies using security definer functions to avoid recursion
CREATE POLICY "Teachers can create TOS entries"
ON public.tos_entries
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can read their own TOS entries"
ON public.tos_entries
FOR SELECT
TO authenticated
USING (
  owner = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  is_tos_collaborator(id)
);

CREATE POLICY "Users can update their own TOS entries"
ON public.tos_entries
FOR UPDATE
TO authenticated
USING (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own TOS entries"
ON public.tos_entries
FOR DELETE
TO authenticated
USING (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));