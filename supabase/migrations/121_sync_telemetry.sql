-- Migration: Sync Telemetry Table
-- Description: Create table for tracking offline sync performance and metrics
-- Phase 3 Milestone 3.2: Selective Sync Prioritization

-- Create sync_telemetry table
CREATE TABLE IF NOT EXISTS sync_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Sync timing
  sync_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Sync metrics
  items_synced INTEGER NOT NULL DEFAULT 0,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  batch_count INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,

  -- Network information
  network_type TEXT CHECK (network_type IN ('wifi', 'cellular', 'ethernet', 'bluetooth', 'unknown')),
  network_speed TEXT CHECK (network_speed IN ('fast', 'medium', 'slow', 'offline')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_telemetry_user_id ON sync_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_telemetry_company_id ON sync_telemetry(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_telemetry_sync_started_at ON sync_telemetry(sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_telemetry_network_type ON sync_telemetry(network_type);

-- Enable RLS
ALTER TABLE sync_telemetry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sync telemetry"
  ON sync_telemetry
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

CREATE POLICY "Users can insert their own sync telemetry"
  ON sync_telemetry
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Company admins can view all sync telemetry for their company
CREATE POLICY "Company admins can view company sync telemetry"
  ON sync_telemetry
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = sync_telemetry.company_id
      AND users.role IN ('admin', 'owner')
    )
  );

-- Function to automatically set company_id from user's profile
CREATE OR REPLACE FUNCTION set_sync_telemetry_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM users
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set company_id
CREATE TRIGGER set_sync_telemetry_company_id_trigger
  BEFORE INSERT ON sync_telemetry
  FOR EACH ROW
  EXECUTE FUNCTION set_sync_telemetry_company_id();

-- Comments
COMMENT ON TABLE sync_telemetry IS 'Tracks offline sync performance and metrics for analytics and optimization';
COMMENT ON COLUMN sync_telemetry.user_id IS 'User who performed the sync';
COMMENT ON COLUMN sync_telemetry.company_id IS 'Company the user belongs to';
COMMENT ON COLUMN sync_telemetry.sync_started_at IS 'When the sync operation started';
COMMENT ON COLUMN sync_telemetry.sync_completed_at IS 'When the sync operation completed';
COMMENT ON COLUMN sync_telemetry.duration_ms IS 'Total duration of sync in milliseconds';
COMMENT ON COLUMN sync_telemetry.items_synced IS 'Number of items successfully synced';
COMMENT ON COLUMN sync_telemetry.total_bytes IS 'Total data transferred in bytes';
COMMENT ON COLUMN sync_telemetry.batch_count IS 'Number of batches processed';
COMMENT ON COLUMN sync_telemetry.errors IS 'Number of errors encountered';
COMMENT ON COLUMN sync_telemetry.network_type IS 'Type of network connection used';
COMMENT ON COLUMN sync_telemetry.network_speed IS 'Categorized network speed';
