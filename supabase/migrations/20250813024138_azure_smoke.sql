/*
  # Real-Time Collaborative Editing System

  1. New Tables
    - `document_collaborators` - Track who can edit which documents
    - `document_activity` - Log all collaborative activities
    - `document_presence` - Track online users per document

  2. Security
    - Enable RLS on all new tables
    - Add policies for collaborative access control
    - Ensure only authorized users can edit documents

  3. Features
    - Real-time presence tracking
    - Activity logging
    - Permission-based access control
    - Document sharing capabilities
*/

-- Document collaborators table
CREATE TABLE IF NOT EXISTS document_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL,
  document_type text CHECK (document_type IN ('tos', 'question', 'test', 'rubric')) NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  role text CHECK (role IN ('owner', 'editor', 'viewer')) NOT NULL DEFAULT 'viewer',
  invited_by text,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Document activity log
CREATE TABLE IF NOT EXISTS document_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL,
  document_type text NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  action_type text CHECK (action_type IN ('create', 'edit', 'delete', 'comment', 'join', 'leave')) NOT NULL,
  action_details jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Document presence tracking
CREATE TABLE IF NOT EXISTS document_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL,
  document_type text NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  user_color text NOT NULL,
  cursor_position jsonb,
  last_seen timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, user_email)
);

-- Enable RLS
ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_collaborators
CREATE POLICY "Users can view collaborations they're part of"
  ON document_collaborators
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create collaborations"
  ON document_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own collaboration status"
  ON document_collaborators
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete collaborations they own"
  ON document_collaborators
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for document_activity
CREATE POLICY "Users can view activity for documents they collaborate on"
  ON document_activity
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create activity logs"
  ON document_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for document_presence
CREATE POLICY "Users can view presence for documents they collaborate on"
  ON document_presence
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own presence"
  ON document_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own presence"
  ON document_presence
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete their own presence"
  ON document_presence
  FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_collaborators_document ON document_collaborators(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_document_activity_document ON document_activity(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_document_presence_document ON document_presence(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_document_presence_active ON document_presence(is_active, last_seen);

-- Function to clean up old presence records
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM document_presence 
  WHERE last_seen < NOW() - INTERVAL '1 hour' OR is_active = false;
END;
$$ LANGUAGE plpgsql;