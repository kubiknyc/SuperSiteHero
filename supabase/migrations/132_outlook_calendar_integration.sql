-- Migration: 132_outlook_calendar_integration.sql
-- Description: Outlook Calendar Integration with Microsoft Graph API
-- Date: 2025-12-15

-- =============================================
-- ENUM: outlook_sync_status
-- Status of sync operations
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outlook_sync_status') THEN
    CREATE TYPE outlook_sync_status AS ENUM (
      'pending',
      'syncing',
      'synced',
      'failed',
      'skipped'
    );
  END IF;
END$$;

-- =============================================
-- ENUM: outlook_sync_direction
-- Direction of sync operation
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outlook_sync_direction') THEN
    CREATE TYPE outlook_sync_direction AS ENUM (
      'to_outlook',
      'from_outlook',
      'bidirectional'
    );
  END IF;
END$$;

-- =============================================
-- TABLE: outlook_calendar_connections
-- Microsoft/Outlook OAuth connections per user
-- =============================================
CREATE TABLE IF NOT EXISTS outlook_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Microsoft Account Info
  microsoft_user_id VARCHAR(255),
  email VARCHAR(255),
  display_name VARCHAR(255),

  -- OAuth Tokens (encrypted)
  access_token TEXT,
  refresh_token TEXT,

  -- Token Metadata
  token_expires_at TIMESTAMPTZ,

  -- Selected Calendar
  calendar_id VARCHAR(255) DEFAULT 'primary',
  calendar_name VARCHAR(255),

  -- Connection Status
  is_active BOOLEAN DEFAULT true,
  last_connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  connection_error TEXT,

  -- Sync Settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 15,
  sync_direction outlook_sync_direction DEFAULT 'bidirectional',

  -- What to sync
  sync_meetings BOOLEAN DEFAULT true,
  sync_inspections BOOLEAN DEFAULT true,
  sync_tasks BOOLEAN DEFAULT false,
  sync_milestones BOOLEAN DEFAULT true,

  -- Webhook subscription for real-time updates
  webhook_subscription_id VARCHAR(255),
  webhook_expiration TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outlook_connections_user_id ON outlook_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_connections_company_id ON outlook_calendar_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_outlook_connections_is_active ON outlook_calendar_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_outlook_connections_webhook_expiration ON outlook_calendar_connections(webhook_expiration);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_outlook_calendar_connections_updated_at ON outlook_calendar_connections;
CREATE TRIGGER update_outlook_calendar_connections_updated_at
  BEFORE UPDATE ON outlook_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE outlook_calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own Outlook connection" ON outlook_calendar_connections;
CREATE POLICY "Users can view their own Outlook connection" ON outlook_calendar_connections
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own Outlook connection" ON outlook_calendar_connections;
CREATE POLICY "Users can manage their own Outlook connection" ON outlook_calendar_connections
  FOR ALL USING (user_id = auth.uid());

-- =============================================
-- TABLE: outlook_event_mappings
-- Map local events (meetings, inspections, etc.) to Outlook events
-- =============================================
CREATE TABLE IF NOT EXISTS outlook_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES outlook_calendar_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Local Entity Reference
  local_entity_type VARCHAR(50) NOT NULL, -- 'meeting', 'inspection', 'task', 'milestone', 'schedule_activity'
  local_entity_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Outlook Event Reference
  outlook_event_id VARCHAR(255) NOT NULL,
  outlook_calendar_id VARCHAR(255),
  outlook_change_key VARCHAR(255), -- For conflict detection (etag equivalent)

  -- Sync Status
  sync_status outlook_sync_status DEFAULT 'pending',
  sync_direction outlook_sync_direction DEFAULT 'bidirectional',
  last_synced_at TIMESTAMPTZ,
  last_local_update TIMESTAMPTZ,
  last_outlook_update TIMESTAMPTZ,
  last_sync_error TEXT,

  -- Event Cache (for conflict detection)
  cached_title VARCHAR(500),
  cached_start TIMESTAMPTZ,
  cached_end TIMESTAMPTZ,
  cached_location TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(connection_id, local_entity_type, local_entity_id),
  UNIQUE(connection_id, outlook_event_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outlook_event_mappings_connection_id ON outlook_event_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_outlook_event_mappings_user_id ON outlook_event_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_event_mappings_local ON outlook_event_mappings(local_entity_type, local_entity_id);
CREATE INDEX IF NOT EXISTS idx_outlook_event_mappings_outlook_event ON outlook_event_mappings(outlook_event_id);
CREATE INDEX IF NOT EXISTS idx_outlook_event_mappings_project_id ON outlook_event_mappings(project_id);
CREATE INDEX IF NOT EXISTS idx_outlook_event_mappings_sync_status ON outlook_event_mappings(sync_status);
CREATE INDEX IF NOT EXISTS idx_outlook_event_mappings_last_synced ON outlook_event_mappings(last_synced_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_outlook_event_mappings_updated_at ON outlook_event_mappings;
CREATE TRIGGER update_outlook_event_mappings_updated_at
  BEFORE UPDATE ON outlook_event_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE outlook_event_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own Outlook event mappings" ON outlook_event_mappings;
CREATE POLICY "Users can view their own Outlook event mappings" ON outlook_event_mappings
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own Outlook event mappings" ON outlook_event_mappings;
CREATE POLICY "Users can manage their own Outlook event mappings" ON outlook_event_mappings
  FOR ALL USING (user_id = auth.uid());

-- =============================================
-- TABLE: outlook_sync_logs
-- Audit trail of sync operations
-- =============================================
CREATE TABLE IF NOT EXISTS outlook_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES outlook_calendar_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Sync Operation
  sync_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled', 'webhook', 'initial'
  direction outlook_sync_direction NOT NULL,
  entity_type VARCHAR(50),

  -- Results
  status outlook_sync_status NOT NULL,
  events_processed INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  events_failed INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Error Details
  error_message TEXT,
  error_details JSONB,

  -- Delta Token for incremental sync
  delta_token TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outlook_sync_logs_connection_id ON outlook_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_outlook_sync_logs_user_id ON outlook_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_sync_logs_started_at ON outlook_sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_outlook_sync_logs_status ON outlook_sync_logs(status);

-- Enable RLS
ALTER TABLE outlook_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own Outlook sync logs" ON outlook_sync_logs;
CREATE POLICY "Users can view their own Outlook sync logs" ON outlook_sync_logs
  FOR SELECT USING (user_id = auth.uid());

-- =============================================
-- TABLE: outlook_oauth_states
-- Temporary storage for OAuth state validation
-- =============================================
CREATE TABLE IF NOT EXISTS outlook_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup and lookup
CREATE INDEX IF NOT EXISTS idx_outlook_oauth_states_state ON outlook_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_outlook_oauth_states_expires_at ON outlook_oauth_states(expires_at);

-- Enable RLS
ALTER TABLE outlook_oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role access only for OAuth flow)
DROP POLICY IF EXISTS "Service role can manage OAuth states" ON outlook_oauth_states;
CREATE POLICY "Service role can manage OAuth states" ON outlook_oauth_states
  FOR ALL USING (true);

-- =============================================
-- TABLE: outlook_webhook_notifications
-- Queue for incoming webhook notifications
-- =============================================
CREATE TABLE IF NOT EXISTS outlook_webhook_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES outlook_calendar_connections(id) ON DELETE CASCADE,
  subscription_id VARCHAR(255) NOT NULL,

  -- Notification Data
  change_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted'
  resource_id VARCHAR(255) NOT NULL,
  resource_data JSONB,

  -- Processing Status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,

  -- Metadata
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outlook_webhook_notifications_connection_id ON outlook_webhook_notifications(connection_id);
CREATE INDEX IF NOT EXISTS idx_outlook_webhook_notifications_subscription_id ON outlook_webhook_notifications(subscription_id);
CREATE INDEX IF NOT EXISTS idx_outlook_webhook_notifications_processed ON outlook_webhook_notifications(processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_outlook_webhook_notifications_received_at ON outlook_webhook_notifications(received_at DESC);

-- Enable RLS
ALTER TABLE outlook_webhook_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role access)
DROP POLICY IF EXISTS "Service role can manage webhook notifications" ON outlook_webhook_notifications;
CREATE POLICY "Service role can manage webhook notifications" ON outlook_webhook_notifications
  FOR ALL USING (true);

-- =============================================
-- FUNCTION: Clean up expired OAuth states
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_expired_outlook_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM outlook_oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Clean up old webhook notifications
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_old_outlook_webhook_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM outlook_webhook_notifications
  WHERE processed = true AND processed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Get events needing sync
-- =============================================
CREATE OR REPLACE FUNCTION get_outlook_events_needing_sync(p_connection_id UUID)
RETURNS TABLE (
  mapping_id UUID,
  local_entity_type VARCHAR(50),
  local_entity_id UUID,
  outlook_event_id VARCHAR(255),
  sync_status outlook_sync_status,
  last_synced_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as mapping_id,
    m.local_entity_type,
    m.local_entity_id,
    m.outlook_event_id,
    m.sync_status,
    m.last_synced_at
  FROM outlook_event_mappings m
  WHERE m.connection_id = p_connection_id
    AND (
      m.sync_status IN ('pending', 'failed')
      OR m.last_synced_at < NOW() - INTERVAL '1 hour'
    )
  ORDER BY
    CASE m.sync_status
      WHEN 'failed' THEN 1
      WHEN 'pending' THEN 2
      ELSE 3
    END,
    m.last_synced_at ASC NULLS FIRST
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Get sync statistics
-- =============================================
CREATE OR REPLACE FUNCTION get_outlook_sync_stats(p_user_id UUID)
RETURNS TABLE (
  total_mappings BIGINT,
  synced_count BIGINT,
  pending_count BIGINT,
  failed_count BIGINT,
  last_sync_at TIMESTAMPTZ,
  entity_type VARCHAR(50),
  entity_count BIGINT
) AS $$
BEGIN
  -- Overall stats
  RETURN QUERY
  SELECT
    COUNT(*) as total_mappings,
    COUNT(*) FILTER (WHERE sync_status = 'synced') as synced_count,
    COUNT(*) FILTER (WHERE sync_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE sync_status = 'failed') as failed_count,
    MAX(last_synced_at) as last_sync_at,
    NULL::VARCHAR(50) as entity_type,
    0::BIGINT as entity_count
  FROM outlook_event_mappings
  WHERE user_id = p_user_id

  UNION ALL

  -- Stats by entity type
  SELECT
    0::BIGINT,
    0::BIGINT,
    0::BIGINT,
    0::BIGINT,
    NULL::TIMESTAMPTZ,
    local_entity_type,
    COUNT(*)
  FROM outlook_event_mappings
  WHERE user_id = p_user_id
  GROUP BY local_entity_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Success message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 132_outlook_calendar_integration completed successfully';
  RAISE NOTICE 'Tables created: outlook_calendar_connections, outlook_event_mappings, outlook_sync_logs, outlook_oauth_states, outlook_webhook_notifications';
END $$;
