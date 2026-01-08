-- Migration: 084_quickbooks_integration.sql
-- Description: QuickBooks Online Integration Tables
-- Date: 2025-12-08

-- =============================================
-- ENUM: qb_sync_status
-- Status of sync operations
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qb_sync_status') THEN
    CREATE TYPE qb_sync_status AS ENUM (
      'pending',
      'syncing',
      'synced',
      'failed',
      'skipped'
    );
  END IF;
END$$;

-- =============================================
-- ENUM: qb_sync_direction
-- Direction of sync operation
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qb_sync_direction') THEN
    CREATE TYPE qb_sync_direction AS ENUM (
      'to_quickbooks',
      'from_quickbooks',
      'bidirectional'
    );
  END IF;
END$$;

-- =============================================
-- ENUM: qb_entity_type
-- Types of QuickBooks entities
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qb_entity_type') THEN
    CREATE TYPE qb_entity_type AS ENUM (
      'vendor',
      'customer',
      'invoice',
      'bill',
      'payment',
      'expense',
      'account',
      'journal_entry'
    );
  END IF;
END$$;

-- =============================================
-- TABLE: qb_connections
-- QuickBooks OAuth connections per company
-- Tokens stored encrypted via Supabase Vault
-- =============================================
CREATE TABLE IF NOT EXISTS qb_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- QuickBooks Company Info
  realm_id VARCHAR(50) NOT NULL,
  company_name VARCHAR(255),
  
  -- OAuth Tokens (encrypted - stored directly for simplicity, 
  -- in production consider Supabase Vault)
  access_token TEXT,
  refresh_token TEXT,
  
  -- Token Metadata
  token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  
  -- Environment
  is_sandbox BOOLEAN DEFAULT false,
  
  -- Connection Status
  is_active BOOLEAN DEFAULT true,
  last_connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  connection_error TEXT,
  
  -- Settings
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_frequency_hours INTEGER DEFAULT 24,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(company_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qb_connections_company_id ON qb_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_qb_connections_realm_id ON qb_connections(realm_id);
CREATE INDEX IF NOT EXISTS idx_qb_connections_is_active ON qb_connections(is_active);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_qb_connections_updated_at ON qb_connections;
CREATE TRIGGER update_qb_connections_updated_at 
  BEFORE UPDATE ON qb_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE qb_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view QB connections for their company" ON qb_connections;
CREATE POLICY "Users can view QB connections for their company" ON qb_connections
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage QB connections" ON qb_connections;
CREATE POLICY "Admins can manage QB connections" ON qb_connections
  FOR ALL USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- =============================================
-- TABLE: qb_account_mappings
-- Map cost codes to QuickBooks Chart of Accounts
-- =============================================
CREATE TABLE IF NOT EXISTS qb_account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES qb_connections(id) ON DELETE CASCADE,
  
  -- Local Reference
  cost_code_id UUID REFERENCES cost_codes(id) ON DELETE CASCADE,
  cost_code VARCHAR(50),
  
  -- QuickBooks Reference
  qb_account_id VARCHAR(50) NOT NULL,
  qb_account_name VARCHAR(255),
  qb_account_type VARCHAR(50),
  qb_account_number VARCHAR(50),
  
  -- Mapping Type
  is_default BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(company_id, cost_code_id),
  UNIQUE(company_id, qb_account_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qb_account_mappings_company_id ON qb_account_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_qb_account_mappings_cost_code_id ON qb_account_mappings(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_qb_account_mappings_qb_account_id ON qb_account_mappings(qb_account_id);

DROP TRIGGER IF EXISTS update_qb_account_mappings_updated_at ON qb_account_mappings;
CREATE TRIGGER update_qb_account_mappings_updated_at 
  BEFORE UPDATE ON qb_account_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE qb_account_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view QB account mappings for their company" ON qb_account_mappings;
CREATE POLICY "Users can view QB account mappings for their company" ON qb_account_mappings
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage QB account mappings" ON qb_account_mappings;
CREATE POLICY "Admins can manage QB account mappings" ON qb_account_mappings
  FOR ALL USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- =============================================
-- TABLE: qb_entity_mappings
-- Map local entities to QuickBooks entities
-- =============================================
CREATE TABLE IF NOT EXISTS qb_entity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES qb_connections(id) ON DELETE CASCADE,
  
  -- Local Entity
  local_entity_type VARCHAR(50) NOT NULL,
  local_entity_id UUID NOT NULL,
  
  -- QuickBooks Entity
  qb_entity_type qb_entity_type NOT NULL,
  qb_entity_id VARCHAR(50) NOT NULL,
  qb_sync_token VARCHAR(20),
  
  -- Sync Status
  sync_status qb_sync_status DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, local_entity_type, local_entity_id),
  UNIQUE(company_id, qb_entity_type, qb_entity_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qb_entity_mappings_company_id ON qb_entity_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_qb_entity_mappings_local ON qb_entity_mappings(local_entity_type, local_entity_id);
CREATE INDEX IF NOT EXISTS idx_qb_entity_mappings_qb ON qb_entity_mappings(qb_entity_type, qb_entity_id);
CREATE INDEX IF NOT EXISTS idx_qb_entity_mappings_sync_status ON qb_entity_mappings(sync_status);

DROP TRIGGER IF EXISTS update_qb_entity_mappings_updated_at ON qb_entity_mappings;
CREATE TRIGGER update_qb_entity_mappings_updated_at 
  BEFORE UPDATE ON qb_entity_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE qb_entity_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view QB entity mappings for their company" ON qb_entity_mappings;
CREATE POLICY "Users can view QB entity mappings for their company" ON qb_entity_mappings
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "System can manage QB entity mappings" ON qb_entity_mappings;
CREATE POLICY "System can manage QB entity mappings" ON qb_entity_mappings
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- TABLE: qb_sync_logs
-- Audit trail of all sync operations
-- =============================================
CREATE TABLE IF NOT EXISTS qb_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES qb_connections(id) ON DELETE CASCADE,
  
  -- Sync Operation
  sync_type VARCHAR(50) NOT NULL,
  direction qb_sync_direction NOT NULL,
  entity_type qb_entity_type,
  
  -- Results
  status qb_sync_status NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Error Details
  error_message TEXT,
  error_details JSONB,
  
  -- Request/Response (for debugging)
  request_summary JSONB,
  response_summary JSONB,
  
  -- Metadata
  initiated_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_company_id ON qb_sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_connection_id ON qb_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_started_at ON qb_sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_qb_sync_logs_status ON qb_sync_logs(status);

-- Enable RLS
ALTER TABLE qb_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view QB sync logs for their company" ON qb_sync_logs;
CREATE POLICY "Users can view QB sync logs for their company" ON qb_sync_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- TABLE: qb_pending_syncs
-- Queue of items waiting to be synced
-- =============================================
CREATE TABLE IF NOT EXISTS qb_pending_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES qb_connections(id) ON DELETE CASCADE,
  
  -- Entity to Sync
  local_entity_type VARCHAR(50) NOT NULL,
  local_entity_id UUID NOT NULL,
  direction qb_sync_direction NOT NULL,
  
  -- Priority and Scheduling
  priority INTEGER DEFAULT 5,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Retry Logic
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Status
  status qb_sync_status DEFAULT 'pending',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(company_id, local_entity_type, local_entity_id, direction)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qb_pending_syncs_company_id ON qb_pending_syncs(company_id);
CREATE INDEX IF NOT EXISTS idx_qb_pending_syncs_status ON qb_pending_syncs(status);
CREATE INDEX IF NOT EXISTS idx_qb_pending_syncs_scheduled ON qb_pending_syncs(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_qb_pending_syncs_priority ON qb_pending_syncs(priority, scheduled_at);

-- Enable RLS
ALTER TABLE qb_pending_syncs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view QB pending syncs for their company" ON qb_pending_syncs;
CREATE POLICY "Users can view QB pending syncs for their company" ON qb_pending_syncs
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage QB pending syncs for their company" ON qb_pending_syncs;
CREATE POLICY "Users can manage QB pending syncs for their company" ON qb_pending_syncs
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- Success message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 084_quickbooks_integration completed successfully';
  RAISE NOTICE 'Tables created: qb_connections, qb_account_mappings, qb_entity_mappings, qb_sync_logs, qb_pending_syncs';
END $$;
