-- Migration: Create audit_logs table for comprehensive audit trail
-- Description: Audit logging for security-critical actions
-- Date: 2026-01-05

-- ============================================================================
-- Audit Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID,  -- Denormalized for query performance

  -- What was done
  action VARCHAR(50) NOT NULL,  -- login, logout, create, update, delete, export, access, etc.
  resource_type VARCHAR(100) NOT NULL,  -- project, document, rfi, user, etc.
  resource_id UUID,  -- The specific resource affected

  -- Request context
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,  -- For tracking related actions

  -- Change details
  old_values JSONB,  -- Previous state (for updates/deletes)
  new_values JSONB,  -- New state (for creates/updates)

  -- Additional context
  metadata JSONB DEFAULT '{}',  -- Extra context (reason, notes, etc.)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Indexes for Query Performance
-- ============================================================================

-- User activity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs (user_id, created_at DESC);

-- Company activity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
  ON audit_logs (company_id, created_at DESC);

-- Resource history queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs (resource_type, resource_id, created_at DESC);

-- Action type queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (action, created_at DESC);

-- Time-based queries for compliance reports
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_action_created
  ON audit_logs (company_id, action, created_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Company admins can view their company's audit logs
CREATE POLICY "Company admins can view audit logs" ON audit_logs
  FOR SELECT
  USING (
    company_id IN (
      SELECT u.company_id FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'owner')
    )
  );

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- Audit Event Types (for documentation)
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for security and compliance.

Action Types:
- Authentication: login, logout, failed_login, mfa_setup, mfa_verify, password_reset, password_change
- Authorization: role_change, permission_grant, permission_revoke, invite_sent, invite_accepted
- Data Access: view, download, export, print, share
- Data Modification: create, update, delete, restore, archive
- Critical: project_delete, user_delete, company_delete, bulk_delete, settings_change

Resource Types:
- user, company, project, document, rfi, submittal, change_order, daily_report
- payment_application, lien_waiver, safety_incident, meeting, task, punch_item
- settings, notification, integration

Metadata Examples:
- {"reason": "User requested deletion"}
- {"export_format": "pdf", "record_count": 150}
- {"field_changed": "email", "change_source": "admin"}
';

-- ============================================================================
-- Trigger Function for Auto-Auditing
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_user_id UUID;
  v_company_id UUID;
  v_resource_id UUID;
BEGIN
  -- Determine action type
  v_action := LOWER(TG_OP);

  -- Get current user
  v_user_id := auth.uid();

  -- Get resource ID
  IF TG_OP = 'DELETE' THEN
    v_resource_id := OLD.id;
  ELSE
    v_resource_id := NEW.id;
  END IF;

  -- Try to get company_id from the record or current user
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_company_id := OLD.company_id;
    ELSE
      v_company_id := NEW.company_id;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    -- Table doesn't have company_id, try to get from current user
    SELECT company_id INTO v_company_id FROM users WHERE id = v_user_id;
  END;

  -- Insert audit log entry
  INSERT INTO audit_logs (
    user_id,
    company_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata
  ) VALUES (
    v_user_id,
    v_company_id,
    v_action,
    TG_TABLE_NAME,
    v_resource_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    jsonb_build_object(
      'trigger_name', TG_NAME,
      'table_schema', TG_TABLE_SCHEMA
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Apply Triggers to Critical Tables
-- ============================================================================

-- Users table
DROP TRIGGER IF EXISTS audit_users_changes ON users;
CREATE TRIGGER audit_users_changes
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Projects table
DROP TRIGGER IF EXISTS audit_projects_changes ON projects;
CREATE TRIGGER audit_projects_changes
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Companies table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'companies') THEN
    DROP TRIGGER IF EXISTS audit_companies_changes ON companies;
    CREATE TRIGGER audit_companies_changes
      AFTER INSERT OR UPDATE OR DELETE ON companies
      FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
  END IF;
END $$;

-- RFIs table
DROP TRIGGER IF EXISTS audit_rfis_changes ON rfis;
CREATE TRIGGER audit_rfis_changes
  AFTER INSERT OR UPDATE OR DELETE ON rfis
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Submittals table
DROP TRIGGER IF EXISTS audit_submittals_changes ON submittals;
CREATE TRIGGER audit_submittals_changes
  AFTER INSERT OR UPDATE OR DELETE ON submittals
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Change Orders table
DROP TRIGGER IF EXISTS audit_change_orders_changes ON change_orders;
CREATE TRIGGER audit_change_orders_changes
  AFTER INSERT OR UPDATE OR DELETE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Payment Applications table
DROP TRIGGER IF EXISTS audit_payment_applications_changes ON payment_applications;
CREATE TRIGGER audit_payment_applications_changes
  AFTER INSERT OR UPDATE OR DELETE ON payment_applications
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Safety Incidents table
DROP TRIGGER IF EXISTS audit_safety_incidents_changes ON safety_incidents;
CREATE TRIGGER audit_safety_incidents_changes
  AFTER INSERT OR UPDATE OR DELETE ON safety_incidents
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- ============================================================================
-- Helper Function to Log Custom Audit Events
-- ============================================================================

CREATE OR REPLACE FUNCTION log_custom_audit(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get company_id from current user
  SELECT company_id INTO v_company_id FROM users WHERE id = v_user_id;

  INSERT INTO audit_logs (
    user_id,
    company_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    v_user_id,
    v_company_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_custom_audit TO authenticated;

-- ============================================================================
-- Cleanup Function for Old Audit Logs (optional retention policy)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Deletes audit logs older than specified retention period. Default: 365 days.';
