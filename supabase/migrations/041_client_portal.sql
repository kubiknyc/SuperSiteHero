-- Migration: 041_client_portal.sql
-- Description: Client Portal - Settings and RLS policies for client access
-- Date: 2025-11-29

-- =============================================
-- TABLE: client_portal_settings
-- Per-project settings for what clients can see
-- =============================================
CREATE TABLE IF NOT EXISTS client_portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Visibility Settings
  show_budget BOOLEAN DEFAULT false,
  show_contract_value BOOLEAN DEFAULT false,
  show_schedule BOOLEAN DEFAULT true,
  show_daily_reports BOOLEAN DEFAULT false,
  show_documents BOOLEAN DEFAULT true,
  show_photos BOOLEAN DEFAULT true,
  show_rfis BOOLEAN DEFAULT true,
  show_change_orders BOOLEAN DEFAULT true,
  show_punch_lists BOOLEAN DEFAULT false,

  -- Customization
  welcome_message TEXT,
  custom_logo_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One settings record per project
  UNIQUE(project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_portal_settings_project
  ON client_portal_settings(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_portal_settings_updated_at
  BEFORE UPDATE ON client_portal_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE client_portal_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: client_portal_settings
-- =============================================

-- Project team members can view/edit settings
CREATE POLICY "Project team can manage client portal settings"
  ON client_portal_settings
  FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_users
      WHERE user_id = auth.uid()
    )
  );

-- Clients can view settings for their projects (to know what's visible)
CREATE POLICY "Clients can view their portal settings"
  ON client_portal_settings
  FOR SELECT
  USING (
    project_id IN (
      SELECT pu.project_id FROM project_users pu
      JOIN users u ON u.id = pu.user_id
      WHERE pu.user_id = auth.uid() AND u.role = 'client'
    )
  );

-- =============================================
-- HELPER FUNCTION: Check if user is a client
-- =============================================
CREATE OR REPLACE FUNCTION is_client_user(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_uuid AND role = 'client'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: Get client portal setting
-- =============================================
CREATE OR REPLACE FUNCTION get_client_portal_setting(
  p_project_id UUID,
  p_setting TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  EXECUTE format(
    'SELECT %I FROM client_portal_settings WHERE project_id = $1',
    p_setting
  ) INTO result USING p_project_id;

  -- Default to false if no settings exist
  RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RLS POLICIES: Projects for Clients
-- =============================================

-- Drop existing policy if it exists (to recreate with client support)
DROP POLICY IF EXISTS "Clients can view assigned projects" ON projects;

-- Clients can view projects they're assigned to
CREATE POLICY "Clients can view assigned projects"
  ON projects
  FOR SELECT
  USING (
    -- Regular users see projects via company
    (
      company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
      AND NOT is_client_user()
    )
    OR
    -- Clients see only projects they're assigned to
    (
      is_client_user()
      AND id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- RLS POLICIES: Documents for Clients
-- =============================================

DROP POLICY IF EXISTS "Clients can view project documents" ON documents;

CREATE POLICY "Clients can view project documents"
  ON documents
  FOR SELECT
  USING (
    -- Regular users
    (
      project_id IN (
        SELECT p.id FROM projects p
        JOIN users u ON u.company_id = p.company_id
        WHERE u.id = auth.uid()
      )
      AND NOT is_client_user()
    )
    OR
    -- Clients can view if show_documents is enabled
    (
      is_client_user()
      AND project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
      AND get_client_portal_setting(project_id, 'show_documents')
    )
  );

-- =============================================
-- RLS POLICIES: RFIs (workflow_items) for Clients
-- =============================================

DROP POLICY IF EXISTS "Clients can view project RFIs" ON workflow_items;

CREATE POLICY "Clients can view project RFIs"
  ON workflow_items
  FOR SELECT
  USING (
    -- Regular users see all workflow items for their company's projects
    (
      project_id IN (
        SELECT p.id FROM projects p
        JOIN users u ON u.company_id = p.company_id
        WHERE u.id = auth.uid()
      )
      AND NOT is_client_user()
    )
    OR
    -- Clients can view RFIs if enabled
    (
      is_client_user()
      AND project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
      AND get_client_portal_setting(project_id, 'show_rfis')
    )
  );

-- =============================================
-- RLS POLICIES: Photos for Clients
-- =============================================

DROP POLICY IF EXISTS "Clients can view project photos" ON photos;

CREATE POLICY "Clients can view project photos"
  ON photos
  FOR SELECT
  USING (
    -- Regular users
    (
      project_id IN (
        SELECT p.id FROM projects p
        JOIN users u ON u.company_id = p.company_id
        WHERE u.id = auth.uid()
      )
      AND NOT is_client_user()
    )
    OR
    -- Clients with photo access
    (
      is_client_user()
      AND project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
      AND get_client_portal_setting(project_id, 'show_photos')
    )
  );

-- =============================================
-- RLS POLICIES: Schedule Items for Clients
-- =============================================

DROP POLICY IF EXISTS "Clients can view schedule items" ON schedule_items;

CREATE POLICY "Clients can view schedule items"
  ON schedule_items
  FOR SELECT
  USING (
    -- Regular users
    (
      project_id IN (
        SELECT p.id FROM projects p
        JOIN users u ON u.company_id = p.company_id
        WHERE u.id = auth.uid()
      )
      AND NOT is_client_user()
    )
    OR
    -- Clients with schedule access
    (
      is_client_user()
      AND project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
      AND get_client_portal_setting(project_id, 'show_schedule')
    )
  );

-- =============================================
-- VIEW: client_project_summary
-- Read-only view for clients with filtered data
-- =============================================
CREATE OR REPLACE VIEW client_project_summary AS
SELECT
  p.id,
  p.name,
  p.project_number,
  p.description,
  p.address,
  p.city,
  p.state,
  p.zip,
  p.latitude,
  p.longitude,
  p.start_date,
  p.end_date,
  p.substantial_completion_date,
  p.final_completion_date,
  p.status,
  -- Budget fields only if enabled
  CASE WHEN cps.show_budget THEN p.budget ELSE NULL END as budget,
  CASE WHEN cps.show_contract_value THEN p.contract_value ELSE NULL END as contract_value,
  -- Portal settings
  cps.show_schedule,
  cps.show_documents,
  cps.show_photos,
  cps.show_rfis,
  cps.show_change_orders,
  cps.show_daily_reports,
  cps.show_punch_lists,
  cps.welcome_message,
  cps.custom_logo_url
FROM projects p
LEFT JOIN client_portal_settings cps ON cps.project_id = p.id
WHERE p.id IN (
  SELECT project_id FROM project_users WHERE user_id = auth.uid()
);

-- =============================================
-- INSERT DEFAULT SETTINGS FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION create_default_client_portal_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO client_portal_settings (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create settings for new projects
DROP TRIGGER IF EXISTS create_client_portal_settings_on_project ON projects;
CREATE TRIGGER create_client_portal_settings_on_project
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_default_client_portal_settings();

-- Create settings for existing projects
INSERT INTO client_portal_settings (project_id)
SELECT id FROM projects
WHERE id NOT IN (SELECT project_id FROM client_portal_settings)
ON CONFLICT (project_id) DO NOTHING;

-- =============================================
-- Success message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 041_client_portal completed successfully';
END $$;
