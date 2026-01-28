-- Fix: Private exports bucket + owner-based access control

-- 1) Make exports bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'exports';

-- 2) Remove overly-broad policies on exports bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload exports" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view exports" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own exports" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own exports" ON storage.objects;

-- (defensive) drop any prior attempted policy names
DROP POLICY IF EXISTS "Users can upload to own folder in exports" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own exports" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own exports" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own exports" ON storage.objects;
DROP POLICY IF EXISTS "Admins can access all exports" ON storage.objects;

-- 3) Create owner-based policies using folder structure: {user_id}/...

-- INSERT: users can upload only into their own folder
CREATE POLICY "Users can upload to own folder in exports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: users can read only their own files
CREATE POLICY "Users can view own exports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: users can update only their own files, and cannot move files outside their folder
CREATE POLICY "Users can update own exports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: users can delete only their own files
CREATE POLICY "Users can delete own exports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) Admin override (read/write) for operational support
CREATE POLICY "Admins can access all exports"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'exports'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'exports'
  AND public.has_role(auth.uid(), 'admin')
);