-- Migration: 157_live_cursor_persistence.sql
-- Description: Add persistence layer for live cursor positions in collaborative sessions
-- Created: December 2025
--
-- This enables cursor position restoration when users reconnect to collaboration sessions.
-- Cursor data is ephemeral (auto-cleaned after session timeout) but persisted for recovery.

-- =============================================
-- TABLE: collaboration_sessions
-- Tracks active collaboration sessions for a room
-- =============================================
CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Room identification
  room_id TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'document',
  -- room_type: 'document', 'project', 'markup', etc.

  -- Reference to the resource being collaborated on
  resource_id UUID,
  resource_type TEXT,
  -- e.g., document_id + 'document', project_id + 'project'

  -- Session metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),

  -- Session configuration
  max_participants INT DEFAULT 50,
  is_active BOOLEAN DEFAULT true
);

-- Unique index on room_id to prevent duplicate sessions
CREATE UNIQUE INDEX IF NOT EXISTS idx_collaboration_sessions_room_id
  ON collaboration_sessions(room_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_resource
  ON collaboration_sessions(resource_id, resource_type);

CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_activity
  ON collaboration_sessions(last_activity_at);

CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active
  ON collaboration_sessions(is_active) WHERE is_active = true;

-- =============================================
-- TABLE: collaboration_cursors
-- Persists cursor positions for recovery and tracking
-- =============================================
CREATE TABLE IF NOT EXISTS collaboration_cursors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to session
  session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,

  -- User information
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_color TEXT NOT NULL,
  avatar_url TEXT,

  -- Cursor position (coordinates relative to container)
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  page_x FLOAT,
  page_y FLOAT,

  -- For document-specific cursors, track page number
  page_number INT DEFAULT 1,

  -- Current action/state
  current_action TEXT DEFAULT 'idle',
  -- actions: 'idle', 'drawing', 'selecting', 'transforming', 'typing'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Is the cursor still active (user connected)
  is_active BOOLEAN DEFAULT true
);

-- Each user can only have one active cursor per session
CREATE UNIQUE INDEX IF NOT EXISTS idx_collaboration_cursors_user_session
  ON collaboration_cursors(session_id, user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_collaboration_cursors_session
  ON collaboration_cursors(session_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_collaboration_cursors_user
  ON collaboration_cursors(user_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_cursors_last_seen
  ON collaboration_cursors(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_collaboration_cursors_active
  ON collaboration_cursors(is_active, session_id);

-- =============================================
-- TABLE: collaboration_cursor_history
-- Optional: Track cursor movement history for analytics
-- (Kept minimal - only stores summarized positions)
-- =============================================
CREATE TABLE IF NOT EXISTS collaboration_cursor_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Summarized position data (avg position per time bucket)
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  page_number INT DEFAULT 1,

  -- Time bucket (for aggregation)
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collaboration_cursor_history_session
  ON collaboration_cursor_history(session_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_cursor_history_user
  ON collaboration_cursor_history(user_id, recorded_at DESC);

-- Partition by time for efficient cleanup (if table grows large)
-- For now, just use a simple cleanup approach

-- =============================================
-- FUNCTIONS: Session management
-- =============================================

-- Get or create a collaboration session for a room
CREATE OR REPLACE FUNCTION get_or_create_collaboration_session(
  p_room_id TEXT,
  p_room_type TEXT DEFAULT 'document',
  p_resource_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Try to find existing active session
  SELECT id INTO v_session_id
  FROM collaboration_sessions
  WHERE room_id = p_room_id AND is_active = true
  LIMIT 1;

  -- Create new session if none exists
  IF v_session_id IS NULL THEN
    INSERT INTO collaboration_sessions (room_id, room_type, resource_id, resource_type)
    VALUES (p_room_id, p_room_type, p_resource_id, p_resource_type)
    RETURNING id INTO v_session_id;
  ELSE
    -- Update last activity
    UPDATE collaboration_sessions
    SET last_activity_at = NOW(), updated_at = NOW()
    WHERE id = v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$;

-- Upsert cursor position (create or update)
CREATE OR REPLACE FUNCTION upsert_cursor_position(
  p_session_id UUID,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_email TEXT,
  p_user_color TEXT,
  p_avatar_url TEXT,
  p_position_x FLOAT,
  p_position_y FLOAT,
  p_page_x FLOAT DEFAULT NULL,
  p_page_y FLOAT DEFAULT NULL,
  p_page_number INT DEFAULT 1,
  p_current_action TEXT DEFAULT 'idle'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_cursor_id UUID;
BEGIN
  -- Try to update existing cursor
  UPDATE collaboration_cursors
  SET
    position_x = p_position_x,
    position_y = p_position_y,
    page_x = p_page_x,
    page_y = p_page_y,
    page_number = p_page_number,
    current_action = p_current_action,
    user_name = p_user_name,
    avatar_url = p_avatar_url,
    updated_at = NOW(),
    last_seen_at = NOW(),
    is_active = true
  WHERE session_id = p_session_id
    AND user_id = p_user_id
  RETURNING id INTO v_cursor_id;

  -- Insert if not exists
  IF v_cursor_id IS NULL THEN
    INSERT INTO collaboration_cursors (
      session_id, user_id, user_name, user_email, user_color, avatar_url,
      position_x, position_y, page_x, page_y, page_number, current_action
    )
    VALUES (
      p_session_id, p_user_id, p_user_name, p_user_email, p_user_color, p_avatar_url,
      p_position_x, p_position_y, p_page_x, p_page_y, p_page_number, p_current_action
    )
    RETURNING id INTO v_cursor_id;
  END IF;

  -- Update session last activity
  UPDATE collaboration_sessions
  SET last_activity_at = NOW()
  WHERE id = p_session_id;

  RETURN v_cursor_id;
END;
$$;

-- Mark cursor as inactive (user left)
CREATE OR REPLACE FUNCTION deactivate_cursor(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE collaboration_cursors
  SET is_active = false, updated_at = NOW()
  WHERE session_id = p_session_id AND user_id = p_user_id;
END;
$$;

-- Get all active cursors in a session
CREATE OR REPLACE FUNCTION get_session_cursors(
  p_session_id UUID,
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  cursor_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_color TEXT,
  avatar_url TEXT,
  position_x FLOAT,
  position_y FLOAT,
  page_x FLOAT,
  page_y FLOAT,
  page_number INT,
  current_action TEXT,
  last_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id as cursor_id,
    cc.user_id,
    cc.user_name,
    cc.user_email,
    cc.user_color,
    cc.avatar_url,
    cc.position_x,
    cc.position_y,
    cc.page_x,
    cc.page_y,
    cc.page_number,
    cc.current_action,
    cc.last_seen_at
  FROM collaboration_cursors cc
  WHERE cc.session_id = p_session_id
    AND cc.is_active = true
    AND (p_exclude_user_id IS NULL OR cc.user_id != p_exclude_user_id)
    AND cc.last_seen_at > NOW() - INTERVAL '30 seconds'
  ORDER BY cc.last_seen_at DESC;
END;
$$;

-- =============================================
-- CLEANUP: Automatic stale data removal
-- =============================================

-- Mark stale cursors as inactive (no activity for 30 seconds)
CREATE OR REPLACE FUNCTION cleanup_stale_cursors()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE collaboration_cursors
  SET is_active = false
  WHERE is_active = true
    AND last_seen_at < NOW() - INTERVAL '30 seconds';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Also mark sessions as inactive if no active cursors
  UPDATE collaboration_sessions cs
  SET is_active = false
  WHERE is_active = true
    AND last_activity_at < NOW() - INTERVAL '5 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM collaboration_cursors cc
      WHERE cc.session_id = cs.id AND cc.is_active = true
    );

  RETURN v_count;
END;
$$;

-- Delete old cursor history (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_cursor_history()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM collaboration_cursor_history
  WHERE recorded_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Delete old inactive sessions (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM collaboration_sessions
  WHERE is_active = false
    AND updated_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_cursor_history ENABLE ROW LEVEL SECURITY;

-- Sessions: Users can see sessions they participate in
CREATE POLICY collaboration_sessions_select ON collaboration_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_cursors cc
      WHERE cc.session_id = id AND cc.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN collaboration_sessions cs ON cs.resource_id = pm.project_id
      WHERE cs.id = collaboration_sessions.id AND pm.user_id = auth.uid()
    )
  );

-- Sessions: Authenticated users can create sessions
CREATE POLICY collaboration_sessions_insert ON collaboration_sessions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Sessions: Allow updates from participants
CREATE POLICY collaboration_sessions_update ON collaboration_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_cursors cc
      WHERE cc.session_id = id AND cc.user_id = auth.uid()
    )
  );

-- Cursors: Users can see all cursors in sessions they're in
CREATE POLICY collaboration_cursors_select ON collaboration_cursors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_cursors cc
      WHERE cc.session_id = collaboration_cursors.session_id
        AND cc.user_id = auth.uid()
    )
  );

-- Cursors: Users can insert/update their own cursors
CREATE POLICY collaboration_cursors_insert ON collaboration_cursors
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY collaboration_cursors_update ON collaboration_cursors
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY collaboration_cursors_delete ON collaboration_cursors
  FOR DELETE
  USING (user_id = auth.uid());

-- Cursor history: Same as cursors
CREATE POLICY collaboration_cursor_history_select ON collaboration_cursor_history
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY collaboration_cursor_history_insert ON collaboration_cursor_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger for collaboration_sessions
CREATE TRIGGER update_collaboration_sessions_updated_at
  BEFORE UPDATE ON collaboration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for collaboration_cursors
CREATE TRIGGER update_collaboration_cursors_updated_at
  BEFORE UPDATE ON collaboration_cursors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ENABLE REALTIME
-- =============================================

DO $$
BEGIN
  -- Add collaboration_cursors to realtime publication for live updates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'collaboration_cursors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_cursors;
    RAISE NOTICE 'Added collaboration_cursors to realtime publication';
  END IF;
END $$;

-- =============================================
-- Success message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 157_live_cursor_persistence completed successfully';
  RAISE NOTICE 'Created tables: collaboration_sessions, collaboration_cursors, collaboration_cursor_history';
  RAISE NOTICE 'Created functions: get_or_create_collaboration_session, upsert_cursor_position, get_session_cursors, cleanup functions';
END $$;
