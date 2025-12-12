-- Fix test_assignments RLS policy to restrict teachers to only their own assignments
-- This prevents teachers from seeing student data from other teachers' classes

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Teachers can read test assignments" ON test_assignments;

-- Create new policy that restricts access to assigned_by owner or admins
CREATE POLICY "Teachers can read their own test assignments"
ON test_assignments FOR SELECT
USING (
  assigned_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Update the UPDATE policy to also be owner-scoped
DROP POLICY IF EXISTS "Teachers can update test assignments" ON test_assignments;

CREATE POLICY "Teachers can update their own test assignments"
ON test_assignments FOR UPDATE
USING (
  assigned_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  assigned_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);