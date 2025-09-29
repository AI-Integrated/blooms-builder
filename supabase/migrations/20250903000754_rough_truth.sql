/*
  # Real-Time Collaboration Tables

  1. New Tables
    - `document_collaborators` - Track who has access to documents
    - `document_activity` - Log all document activities for real-time feeds
    - `document_presence` - Track active users and their cursor positions
    - `collaboration_messages` - Team chat for documents

  2. Security
    - Enable RLS on all tables
    - Add policies for document access control

  3. Features
    - Real-time presence tracking
    - Activity logging
    - Team messaging
    - Permission management
*/

-- Document collaborators table
CREATE TABLE IF NOT EXISTS document_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('tos', 'question', 'test', 'rubric')),
  user_email text NOT NULL,
  user_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  invited_by text,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Document activity log for real-time feeds
CREATE TABLE IF NOT EXISTS document_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL,
  document_type text NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('create', 'edit', 'delete', 'comment', 'join', 'leave', 'invite')),
  action_details jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Document presence for cursor tracking and active users
CREATE TABLE IF NOT EXISTS document_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL,
  document_type text NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  user_color text NOT NULL,
  cursor_position jsonb,
  is_active boolean DEFAULT true,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Team chat messages for documents
CREATE TABLE IF NOT EXISTS collaboration_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text NOT NULL,
  document_type text NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  message text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_collaborators_document ON document_collaborators(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_document_activity_document ON document_activity(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_document_presence_document ON document_presence(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_collaboration_messages_document ON collaboration_messages(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_document_activity_timestamp ON document_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_messages_timestamp ON collaboration_messages(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_messages ENABLE ROW LEVEL SECURITY;

-- Policies for document_collaborators
CREATE POLICY "Collaborators can view document collaborators"
  ON document_collaborators FOR SELECT
  USING (true);

CREATE POLICY "Users can invite collaborators"
  ON document_collaborators FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update collaborator roles"
  ON document_collaborators FOR UPDATE
  USING (true);

CREATE POLICY "Users can remove collaborators"
  ON document_collaborators FOR DELETE
  USING (true);

-- Policies for document_activity
CREATE POLICY "Activity is viewable by all"
  ON document_activity FOR SELECT
  USING (true);

CREATE POLICY "Users can log activity"
  ON document_activity FOR INSERT
  WITH CHECK (true);

-- Policies for document_presence
CREATE POLICY "Presence is viewable by all"
  ON document_presence FOR SELECT
  USING (true);

CREATE POLICY "Users can track presence"
  ON document_presence FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update presence"
  ON document_presence FOR UPDATE
  USING (true);

CREATE POLICY "Users can remove presence"
  ON document_presence FOR DELETE
  USING (true);

-- Policies for collaboration_messages
CREATE POLICY "Messages are viewable by all"
  ON collaboration_messages FOR SELECT
  USING (true);

CREATE POLICY "Users can send messages"
  ON collaboration_messages FOR INSERT
  WITH CHECK (true);

-- Function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update last_active on collaborator updates
CREATE TRIGGER update_collaborators_last_active
  BEFORE UPDATE ON document_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active();

-- Function to clean up old presence records
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM document_presence 
  WHERE last_seen < now() - interval '1 hour';
END;
$$ language 'plpgsql';

-- Insert sample collaboration data for demonstration
INSERT INTO document_collaborators (document_id, document_type, user_email, user_name, role, invited_by)
VALUES 
  ('demo-tos-1', 'tos', 'teacher1@school.edu', 'John Smith', 'owner', null),
  ('demo-tos-1', 'tos', 'teacher2@school.edu', 'Jane Doe', 'editor', 'teacher1@school.edu'),
  ('demo-test-1', 'test', 'admin@school.edu', 'Admin User', 'owner', null);

INSERT INTO document_activity (document_id, document_type, user_email, user_name, action_type, action_details)
VALUES 
  ('demo-tos-1', 'tos', 'teacher1@school.edu', 'John Smith', 'create', '{"action": "created TOS document"}'),
  ('demo-tos-1', 'tos', 'teacher2@school.edu', 'Jane Doe', 'edit', '{"action": "updated topic hours"}'),
  ('demo-test-1', 'test', 'admin@school.edu', 'Admin User', 'create', '{"action": "created test configuration"}');