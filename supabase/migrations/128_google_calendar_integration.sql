-- Migration: Google Calendar Integration
-- Description: Tables for Google Calendar OAuth connections, event mappings, and sync queue

-- ============================================================================
-- Table: google_calendar_connections
-- ============================================================================
-- Stores OAuth connections to Google Calendar

CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Google account info
  google_account_email TEXT NOT NULL,
  google_account_name TEXT,

  -- OAuth tokens (encrypted at rest by Supabase)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Selected calendar
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  calendar_name TEXT,
  calendar_timezone TEXT,

  -- Sync settings
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('to_google', 'from_google', 'bidirectional')),
  auto_sync_meetings BOOLEAN NOT NULL DEFAULT true,
  auto_sync_inspections BOOLEAN NOT NULL DEFAULT false,
  auto_sync_deadlines BOOLEAN NOT NULL DEFAULT false,

  -- Push notification channel for real-time updates
  webhook_channel_id TEXT,
  webhook_resource_id TEXT,
  webhook_expiration TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  connection_error TEXT,
  last_sync_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(company_id, user_id, google_account_email)
);

-- ============================================================================
-- Table: calendar_event_mappings
-- ============================================================================
-- Maps local entities (meetings, inspections, etc.) to Google Calendar events

CREATE TABLE IF NOT EXISTS calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES google_calendar_connections(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Local entity reference
  local_entity_type TEXT NOT NULL CHECK (local_entity_type IN ('meeting', 'inspection', 'deadline', 'milestone', 'task')),
  local_entity_id UUID NOT NULL,

  -- Google Calendar event reference
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL,

  -- Sync tracking
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict')),
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,

  -- Version tracking for conflict detection
  local_version INTEGER NOT NULL DEFAULT 1,
  google_etag TEXT,
  last_local_update TIMESTAMPTZ,
  last_google_update TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(connection_id, local_entity_type, local_entity_id),
  UNIQUE(connection_id, google_event_id)
);

-- ============================================================================
-- Table: calendar_sync_queue
-- ============================================================================
-- Queue for pending calendar sync operations

CREATE TABLE IF NOT EXISTS calendar_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES google_calendar_connections(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Operation details
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  direction TEXT NOT NULL CHECK (direction IN ('to_google', 'from_google')),

  -- Entity reference
  local_entity_type TEXT NOT NULL,
  local_entity_id UUID NOT NULL,
  google_event_id TEXT,

  -- Payload for the operation
  payload JSONB,

  -- Queue management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 5,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- Table: calendar_sync_logs
-- ============================================================================
-- Audit log for sync operations

CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES google_calendar_connections(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Operation details
  operation TEXT NOT NULL,
  direction TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  google_event_id TEXT,

  -- Result
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  error_details JSONB,

  -- Duration
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- google_calendar_connections indexes
CREATE INDEX IF NOT EXISTS idx_gcal_connections_company ON google_calendar_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_gcal_connections_user ON google_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_gcal_connections_active ON google_calendar_connections(company_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gcal_connections_webhook_channel ON google_calendar_connections(webhook_channel_id) WHERE webhook_channel_id IS NOT NULL;

-- calendar_event_mappings indexes
CREATE INDEX IF NOT EXISTS idx_cal_mappings_connection ON calendar_event_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_cal_mappings_company ON calendar_event_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_cal_mappings_local_entity ON calendar_event_mappings(local_entity_type, local_entity_id);
CREATE INDEX IF NOT EXISTS idx_cal_mappings_google_event ON calendar_event_mappings(google_event_id);
CREATE INDEX IF NOT EXISTS idx_cal_mappings_status ON calendar_event_mappings(sync_status) WHERE sync_status != 'synced';

-- calendar_sync_queue indexes
CREATE INDEX IF NOT EXISTS idx_cal_queue_connection ON calendar_sync_queue(connection_id);
CREATE INDEX IF NOT EXISTS idx_cal_queue_company ON calendar_sync_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_cal_queue_pending ON calendar_sync_queue(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_cal_queue_processing ON calendar_sync_queue(status, last_attempt_at) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_cal_queue_entity ON calendar_sync_queue(local_entity_type, local_entity_id);

-- calendar_sync_logs indexes
CREATE INDEX IF NOT EXISTS idx_cal_logs_connection ON calendar_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_cal_logs_company ON calendar_sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_cal_logs_entity ON calendar_sync_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cal_logs_created ON calendar_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cal_logs_status ON calendar_sync_logs(status, created_at DESC);

-- ============================================================================
-- Updated timestamp triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_gcal_connections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gcal_connections_updated_at ON google_calendar_connections;
CREATE TRIGGER gcal_connections_updated_at
  BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_gcal_connections_timestamp();

CREATE OR REPLACE FUNCTION update_cal_mappings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cal_mappings_updated_at ON calendar_event_mappings;
CREATE TRIGGER cal_mappings_updated_at
  BEFORE UPDATE ON calendar_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_cal_mappings_timestamp();

CREATE OR REPLACE FUNCTION update_cal_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cal_queue_updated_at ON calendar_sync_queue;
CREATE TRIGGER cal_queue_updated_at
  BEFORE UPDATE ON calendar_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_cal_queue_timestamp();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- google_calendar_connections policies
DROP POLICY IF EXISTS "Users can view own calendar connections" ON google_calendar_connections;
CREATE POLICY "Users can view own calendar connections"
  ON google_calendar_connections
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Users can create own calendar connections" ON google_calendar_connections;
CREATE POLICY "Users can create own calendar connections"
  ON google_calendar_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own calendar connections" ON google_calendar_connections;
CREATE POLICY "Users can update own calendar connections"
  ON google_calendar_connections
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own calendar connections" ON google_calendar_connections;
CREATE POLICY "Users can delete own calendar connections"
  ON google_calendar_connections
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- calendar_event_mappings policies
DROP POLICY IF EXISTS "Users can view own event mappings" ON calendar_event_mappings;
CREATE POLICY "Users can view own event mappings"
  ON calendar_event_mappings
  FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM google_calendar_connections WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own event mappings" ON calendar_event_mappings;
CREATE POLICY "Users can manage own event mappings"
  ON calendar_event_mappings
  FOR ALL
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM google_calendar_connections WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    connection_id IN (
      SELECT id FROM google_calendar_connections WHERE user_id = auth.uid()
    )
  );

-- calendar_sync_queue policies
DROP POLICY IF EXISTS "Users can view own sync queue" ON calendar_sync_queue;
CREATE POLICY "Users can view own sync queue"
  ON calendar_sync_queue
  FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM google_calendar_connections WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own sync queue" ON calendar_sync_queue;
CREATE POLICY "Users can manage own sync queue"
  ON calendar_sync_queue
  FOR ALL
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM google_calendar_connections WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    connection_id IN (
      SELECT id FROM google_calendar_connections WHERE user_id = auth.uid()
    )
  );

-- calendar_sync_logs policies
DROP POLICY IF EXISTS "Users can view own sync logs" ON calendar_sync_logs;
CREATE POLICY "Users can view own sync logs"
  ON calendar_sync_logs
  FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM google_calendar_connections WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- Add google_calendar_event_id to meetings table
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'google_calendar_event_id'
  ) THEN
    ALTER TABLE meetings ADD COLUMN google_calendar_event_id TEXT;
    ALTER TABLE meetings ADD COLUMN google_calendar_synced_at TIMESTAMPTZ;
    CREATE INDEX idx_meetings_gcal_event ON meetings(google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to get pending sync items for processing
CREATE OR REPLACE FUNCTION get_pending_calendar_syncs(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  connection_id UUID,
  company_id UUID,
  operation TEXT,
  direction TEXT,
  local_entity_type TEXT,
  local_entity_id UUID,
  google_event_id TEXT,
  payload JSONB,
  attempts INTEGER,
  access_token TEXT,
  refresh_token TEXT,
  calendar_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.connection_id,
    q.company_id,
    q.operation,
    q.direction,
    q.local_entity_type,
    q.local_entity_id,
    q.google_event_id,
    q.payload,
    q.attempts,
    c.access_token,
    c.refresh_token,
    c.calendar_id
  FROM calendar_sync_queue q
  INNER JOIN google_calendar_connections c ON c.id = q.connection_id
  WHERE q.status = 'pending'
    AND q.scheduled_for <= NOW()
    AND q.attempts < q.max_attempts
    AND c.is_active = true
    AND c.sync_enabled = true
  ORDER BY q.priority DESC, q.scheduled_for ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark sync item as processing
CREATE OR REPLACE FUNCTION mark_calendar_sync_processing(p_sync_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE calendar_sync_queue
  SET status = 'processing',
      last_attempt_at = NOW(),
      attempts = attempts + 1
  WHERE id = p_sync_id
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete sync item
CREATE OR REPLACE FUNCTION complete_calendar_sync(
  p_sync_id UUID,
  p_success BOOLEAN,
  p_error TEXT DEFAULT NULL,
  p_google_event_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF p_success THEN
    UPDATE calendar_sync_queue
    SET status = 'completed',
        completed_at = NOW(),
        google_event_id = COALESCE(p_google_event_id, google_event_id)
    WHERE id = p_sync_id;
  ELSE
    UPDATE calendar_sync_queue
    SET status = CASE
          WHEN attempts >= max_attempts THEN 'failed'
          ELSE 'pending'
        END,
        last_error = p_error,
        scheduled_for = CASE
          WHEN attempts < max_attempts THEN NOW() + INTERVAL '1 minute' * power(2, attempts)
          ELSE scheduled_for
        END
    WHERE id = p_sync_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE google_calendar_connections IS 'OAuth connections to Google Calendar accounts';
COMMENT ON TABLE calendar_event_mappings IS 'Maps local entities (meetings, etc.) to Google Calendar events';
COMMENT ON TABLE calendar_sync_queue IS 'Queue for pending calendar sync operations';
COMMENT ON TABLE calendar_sync_logs IS 'Audit log for calendar sync operations';

COMMENT ON COLUMN google_calendar_connections.sync_direction IS 'Direction of sync: to_google, from_google, or bidirectional';
COMMENT ON COLUMN google_calendar_connections.webhook_channel_id IS 'Google push notification channel ID for real-time updates';
COMMENT ON COLUMN calendar_event_mappings.google_etag IS 'Google event etag for conflict detection';
COMMENT ON COLUMN calendar_sync_queue.priority IS 'Higher priority items are processed first (1-10)';
