-- Test Assembly metadata tables
CREATE TABLE IF NOT EXISTS test_assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  tos_id uuid REFERENCES tos_entries(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  params jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assembly_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid REFERENCES test_assemblies(id) ON DELETE CASCADE NOT NULL,
  version_label text NOT NULL,
  question_order uuid[] NOT NULL,
  shuffle_seed text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies for test_assemblies
ALTER TABLE test_assemblies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own assemblies"
  ON test_assemblies FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own assemblies"
  ON test_assemblies FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can update their own assemblies"
  ON test_assemblies FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own assemblies"
  ON test_assemblies FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for assembly_versions
ALTER TABLE assembly_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of their assemblies"
  ON assembly_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM test_assemblies
      WHERE test_assemblies.id = assembly_versions.assembly_id
      AND test_assemblies.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create versions for their assemblies"
  ON assembly_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM test_assemblies
      WHERE test_assemblies.id = assembly_versions.assembly_id
      AND test_assemblies.created_by = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_test_assemblies_created_by ON test_assemblies(created_by);
CREATE INDEX idx_test_assemblies_tos_id ON test_assemblies(tos_id);
CREATE INDEX idx_assembly_versions_assembly_id ON assembly_versions(assembly_id);

-- Trigger to update updated_at
CREATE TRIGGER update_test_assemblies_updated_at
  BEFORE UPDATE ON test_assemblies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();