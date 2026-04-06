
-- 1. Fix test_versions: restrict SELECT to owner/admin
DROP POLICY IF EXISTS "Authenticated users can read test versions" ON test_versions;
CREATE POLICY "select_test_versions" ON test_versions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM test_metadata tm 
      WHERE tm.id = test_versions.test_metadata_id
        AND (tm.created_by = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- 2. Fix test_metadata: restrict SELECT to owner/admin
DROP POLICY IF EXISTS "Authenticated users can read test metadata" ON test_metadata;
CREATE POLICY "select_test_metadata" ON test_metadata
  FOR SELECT TO authenticated USING (
    created_by = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. Fix test_metadata UPDATE: scope to owner or admin
DROP POLICY IF EXISTS "Teachers and admins can update test metadata" ON test_metadata;
CREATE POLICY "update_test_metadata" ON test_metadata
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix questions SELECT: replace public policy with authenticated-only
DROP POLICY IF EXISTS "select_questions" ON questions;
CREATE POLICY "select_questions" ON questions
  FOR SELECT TO authenticated USING (
    owner = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR (approved = true AND deleted = false)
  );

-- 5. Fix storage: restrict question-imports bucket to authenticated users with folder ownership
DROP POLICY IF EXISTS "Users can upload import files" ON storage.objects;
CREATE POLICY "Authenticated users can upload import files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'question-imports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view their import files" ON storage.objects;
CREATE POLICY "Authenticated users can view their import files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'question-imports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
