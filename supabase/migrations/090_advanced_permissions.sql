-- =============================================
-- Migration: Advanced Permissions System
-- Description: Granular role-based permissions with custom roles and feature flags
-- =============================================

-- =============================================
-- Permission Definitions Table
-- All available permissions in the system
-- =============================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Permission identification
  code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'projects.create', 'rfis.approve'
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Categorization
  category VARCHAR(50) NOT NULL, -- projects, rfis, submittals, safety, etc.
  subcategory VARCHAR(50), -- Optional further grouping

  -- Metadata
  is_dangerous BOOLEAN DEFAULT FALSE, -- Marks permissions that need extra confirmation
  requires_project_assignment BOOLEAN DEFAULT TRUE, -- Some permissions are company-wide
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Custom Roles Table
-- Company-defined roles beyond the default set
-- =============================================

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Role identification
  code VARCHAR(50) NOT NULL, -- Internal code for the role
  name VARCHAR(100) NOT NULL, -- Display name
  description TEXT,
  color VARCHAR(7) DEFAULT '#6B7280', -- Hex color for UI badges

  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  can_be_deleted BOOLEAN DEFAULT TRUE, -- Prevent deletion of system-seeded roles
  inherits_from VARCHAR(50), -- Base role to inherit from (owner, admin, etc.)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_role_code_per_company UNIQUE (company_id, code)
);

-- =============================================
-- Role Permissions Table
-- Maps permissions to both default and custom roles
-- =============================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Either a default role OR a custom role (not both)
  default_role VARCHAR(50), -- owner, admin, project_manager, etc.
  custom_role_id UUID REFERENCES custom_roles(id) ON DELETE CASCADE,

  -- The permission being granted
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  -- Permission level
  granted BOOLEAN DEFAULT TRUE,

  -- Constraints
  CONSTRAINT role_or_custom CHECK (
    (default_role IS NOT NULL AND custom_role_id IS NULL) OR
    (default_role IS NULL AND custom_role_id IS NOT NULL)
  ),
  CONSTRAINT unique_default_role_permission UNIQUE NULLS NOT DISTINCT (default_role, permission_id),
  CONSTRAINT unique_custom_role_permission UNIQUE NULLS NOT DISTINCT (custom_role_id, permission_id)
);

-- =============================================
-- User Permission Overrides Table
-- Allows granting/revoking specific permissions for individual users
-- =============================================

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  -- Override type
  override_type VARCHAR(10) NOT NULL CHECK (override_type IN ('grant', 'revoke')),

  -- Optional: scope to specific project
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Metadata
  reason TEXT, -- Why this override was granted
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration

  -- Constraints
  CONSTRAINT unique_user_permission_override UNIQUE NULLS NOT DISTINCT (user_id, permission_id, project_id)
);

-- =============================================
-- Feature Flags Table
-- Per-company feature toggles
-- =============================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Flag identification
  code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'bim_viewer', 'ai_agents'
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),

  -- Global defaults
  default_enabled BOOLEAN DEFAULT FALSE,
  is_beta BOOLEAN DEFAULT FALSE,
  requires_subscription VARCHAR(50), -- Subscription tier required

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Company Feature Flags Table
-- Per-company feature flag overrides
-- =============================================

CREATE TABLE IF NOT EXISTS company_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,

  -- Override
  enabled BOOLEAN NOT NULL,

  -- Metadata
  enabled_by UUID REFERENCES users(id),
  enabled_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  notes TEXT,

  -- Constraints
  CONSTRAINT unique_company_feature UNIQUE (company_id, feature_flag_id)
);

-- =============================================
-- User Custom Role Assignment Table
-- Assigns custom roles to users (in addition to their default role)
-- =============================================

CREATE TABLE IF NOT EXISTS user_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  custom_role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,

  -- Optional project scope
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Metadata
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_custom_role UNIQUE NULLS NOT DISTINCT (user_id, custom_role_id, project_id)
);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);

CREATE INDEX IF NOT EXISTS idx_custom_roles_company ON custom_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_active ON custom_roles(company_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_role_permissions_default ON role_permissions(default_role) WHERE default_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_permissions_custom ON role_permissions(custom_role_id) WHERE custom_role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user ON user_permission_overrides(user_id);
-- Note: Cannot use NOW() in partial index predicate (not immutable)
-- Instead, index all records and filter at query time
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_active ON user_permission_overrides(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_company_feature_flags_company ON company_feature_flags(company_id);

CREATE INDEX IF NOT EXISTS idx_user_custom_roles_user ON user_custom_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_roles_project ON user_custom_roles(project_id) WHERE project_id IS NOT NULL;

-- =============================================
-- Triggers
-- =============================================

-- Auto-update updated_at for custom_roles
CREATE OR REPLACE FUNCTION update_custom_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_roles_updated ON custom_roles;
CREATE TRIGGER trg_custom_roles_updated
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_roles_timestamp();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_roles ENABLE ROW LEVEL SECURITY;

-- Permissions: Anyone can read (global definitions)
CREATE POLICY permissions_select ON permissions
  FOR SELECT USING (TRUE);

-- Custom Roles: Users can see their company's roles
CREATE POLICY custom_roles_select ON custom_roles
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Custom Roles: Only admins can manage
CREATE POLICY custom_roles_insert ON custom_roles
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY custom_roles_update ON custom_roles
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY custom_roles_delete ON custom_roles
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
    AND can_be_deleted = TRUE
  );

-- Role Permissions: Users can see permissions for their roles
CREATE POLICY role_permissions_select ON role_permissions
  FOR SELECT USING (
    default_role IS NOT NULL
    OR custom_role_id IN (
      SELECT id FROM custom_roles WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Role Permissions: Only admins can modify
CREATE POLICY role_permissions_insert ON role_permissions
  FOR INSERT WITH CHECK (
    (default_role IS NULL) -- Can't modify default roles
    AND custom_role_id IN (
      SELECT id FROM custom_roles WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY role_permissions_update ON role_permissions
  FOR UPDATE USING (
    default_role IS NULL
    AND custom_role_id IN (
      SELECT id FROM custom_roles WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY role_permissions_delete ON role_permissions
  FOR DELETE USING (
    default_role IS NULL
    AND custom_role_id IN (
      SELECT id FROM custom_roles WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- User Permission Overrides: Users can see their own, admins can see all in company
CREATE POLICY user_permission_overrides_select ON user_permission_overrides
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT id FROM users WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- User Permission Overrides: Only admins can manage
CREATE POLICY user_permission_overrides_insert ON user_permission_overrides
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY user_permission_overrides_update ON user_permission_overrides
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY user_permission_overrides_delete ON user_permission_overrides
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Feature Flags: Anyone can read global flags
CREATE POLICY feature_flags_select ON feature_flags
  FOR SELECT USING (TRUE);

-- Company Feature Flags: Users can see their company's flags
CREATE POLICY company_feature_flags_select ON company_feature_flags
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Company Feature Flags: Only owners can manage
CREATE POLICY company_feature_flags_insert ON company_feature_flags
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY company_feature_flags_update ON company_feature_flags
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- User Custom Roles: Users can see their own, admins can see all
CREATE POLICY user_custom_roles_select ON user_custom_roles
  FOR SELECT USING (
    user_id = auth.uid()
    OR custom_role_id IN (
      SELECT id FROM custom_roles WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- User Custom Roles: Only admins can manage
CREATE POLICY user_custom_roles_insert ON user_custom_roles
  FOR INSERT WITH CHECK (
    custom_role_id IN (
      SELECT id FROM custom_roles WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY user_custom_roles_delete ON user_custom_roles
  FOR DELETE USING (
    custom_role_id IN (
      SELECT id FROM custom_roles WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- =============================================
-- Seed Default Permissions
-- =============================================

INSERT INTO permissions (code, name, description, category, subcategory, is_dangerous, requires_project_assignment, display_order) VALUES
-- Projects
('projects.view', 'View Projects', 'View project details and dashboard', 'projects', 'read', FALSE, FALSE, 10),
('projects.create', 'Create Projects', 'Create new projects', 'projects', 'write', FALSE, FALSE, 20),
('projects.edit', 'Edit Projects', 'Edit project details and settings', 'projects', 'write', FALSE, TRUE, 30),
('projects.delete', 'Delete Projects', 'Delete projects permanently', 'projects', 'write', TRUE, TRUE, 40),
('projects.archive', 'Archive Projects', 'Archive completed projects', 'projects', 'write', FALSE, TRUE, 50),

-- Daily Reports
('daily_reports.view', 'View Daily Reports', 'View daily field reports', 'daily_reports', 'read', FALSE, TRUE, 10),
('daily_reports.create', 'Create Daily Reports', 'Create daily field reports', 'daily_reports', 'write', FALSE, TRUE, 20),
('daily_reports.edit', 'Edit Daily Reports', 'Edit existing daily reports', 'daily_reports', 'write', FALSE, TRUE, 30),
('daily_reports.delete', 'Delete Daily Reports', 'Delete daily reports', 'daily_reports', 'write', FALSE, TRUE, 40),
('daily_reports.approve', 'Approve Daily Reports', 'Approve and sign off on daily reports', 'daily_reports', 'approve', FALSE, TRUE, 50),

-- RFIs
('rfis.view', 'View RFIs', 'View requests for information', 'rfis', 'read', FALSE, TRUE, 10),
('rfis.create', 'Create RFIs', 'Create new RFIs', 'rfis', 'write', FALSE, TRUE, 20),
('rfis.edit', 'Edit RFIs', 'Edit existing RFIs', 'rfis', 'write', FALSE, TRUE, 30),
('rfis.respond', 'Respond to RFIs', 'Submit responses to RFIs', 'rfis', 'write', FALSE, TRUE, 40),
('rfis.close', 'Close RFIs', 'Close resolved RFIs', 'rfis', 'write', FALSE, TRUE, 50),
('rfis.delete', 'Delete RFIs', 'Delete RFIs', 'rfis', 'write', TRUE, TRUE, 60),

-- Submittals
('submittals.view', 'View Submittals', 'View submittals and shop drawings', 'submittals', 'read', FALSE, TRUE, 10),
('submittals.create', 'Create Submittals', 'Create new submittals', 'submittals', 'write', FALSE, TRUE, 20),
('submittals.edit', 'Edit Submittals', 'Edit existing submittals', 'submittals', 'write', FALSE, TRUE, 30),
('submittals.review', 'Review Submittals', 'Review and mark up submittals', 'submittals', 'approve', FALSE, TRUE, 40),
('submittals.approve', 'Approve Submittals', 'Approve or reject submittals', 'submittals', 'approve', FALSE, TRUE, 50),
('submittals.delete', 'Delete Submittals', 'Delete submittals', 'submittals', 'write', TRUE, TRUE, 60),

-- Change Orders
('change_orders.view', 'View Change Orders', 'View change orders', 'change_orders', 'read', FALSE, TRUE, 10),
('change_orders.create', 'Create Change Orders', 'Create new change orders', 'change_orders', 'write', FALSE, TRUE, 20),
('change_orders.edit', 'Edit Change Orders', 'Edit existing change orders', 'change_orders', 'write', FALSE, TRUE, 30),
('change_orders.approve', 'Approve Change Orders', 'Approve or reject change orders', 'change_orders', 'approve', FALSE, TRUE, 40),
('change_orders.delete', 'Delete Change Orders', 'Delete change orders', 'change_orders', 'write', TRUE, TRUE, 50),

-- Documents
('documents.view', 'View Documents', 'View documents and drawings', 'documents', 'read', FALSE, TRUE, 10),
('documents.upload', 'Upload Documents', 'Upload new documents', 'documents', 'write', FALSE, TRUE, 20),
('documents.edit', 'Edit Documents', 'Edit document metadata', 'documents', 'write', FALSE, TRUE, 30),
('documents.markup', 'Markup Documents', 'Add markups to drawings', 'documents', 'write', FALSE, TRUE, 40),
('documents.delete', 'Delete Documents', 'Delete documents', 'documents', 'write', FALSE, TRUE, 50),

-- Safety
('safety.view', 'View Safety Records', 'View safety incidents and toolbox talks', 'safety', 'read', FALSE, TRUE, 10),
('safety.create', 'Create Safety Records', 'Report incidents and create toolbox talks', 'safety', 'write', FALSE, TRUE, 20),
('safety.edit', 'Edit Safety Records', 'Edit safety records', 'safety', 'write', FALSE, TRUE, 30),
('safety.investigate', 'Investigate Incidents', 'Conduct safety investigations', 'safety', 'approve', FALSE, TRUE, 40),
('safety.osha', 'Manage OSHA Records', 'View and manage OSHA 300 log', 'safety', 'admin', FALSE, FALSE, 50),

-- Schedule
('schedule.view', 'View Schedule', 'View project schedule and Gantt chart', 'schedule', 'read', FALSE, TRUE, 10),
('schedule.edit', 'Edit Schedule', 'Edit schedule tasks and dependencies', 'schedule', 'write', FALSE, TRUE, 20),
('schedule.baseline', 'Manage Baselines', 'Create and manage schedule baselines', 'schedule', 'admin', FALSE, TRUE, 30),

-- Financial
('financial.view', 'View Financial Data', 'View budgets and costs', 'financial', 'read', FALSE, TRUE, 10),
('financial.edit', 'Edit Financial Data', 'Edit budgets and cost codes', 'financial', 'write', FALSE, TRUE, 20),
('financial.payment_apps', 'Manage Payment Apps', 'Create and manage payment applications', 'financial', 'write', FALSE, TRUE, 30),
('financial.lien_waivers', 'Manage Lien Waivers', 'Track and manage lien waivers', 'financial', 'write', FALSE, TRUE, 40),
('financial.approve', 'Approve Financial Items', 'Approve invoices and payment applications', 'financial', 'approve', FALSE, TRUE, 50),

-- Team Management
('team.view', 'View Team Members', 'View project team assignments', 'team', 'read', FALSE, TRUE, 10),
('team.assign', 'Assign Team Members', 'Add/remove users from projects', 'team', 'write', FALSE, TRUE, 20),
('team.manage_roles', 'Manage Team Roles', 'Change user roles on projects', 'team', 'admin', FALSE, TRUE, 30),

-- Admin
('admin.company_settings', 'Manage Company Settings', 'Edit company profile and settings', 'admin', 'settings', FALSE, FALSE, 10),
('admin.user_management', 'Manage Users', 'Invite and manage company users', 'admin', 'users', FALSE, FALSE, 20),
('admin.roles', 'Manage Roles', 'Create and edit custom roles', 'admin', 'roles', FALSE, FALSE, 30),
('admin.integrations', 'Manage Integrations', 'Configure third-party integrations', 'admin', 'integrations', FALSE, FALSE, 40),
('admin.billing', 'Manage Billing', 'View and manage subscription and billing', 'admin', 'billing', TRUE, FALSE, 50)

ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Seed Default Role Permissions
-- =============================================

-- Owner gets all permissions
INSERT INTO role_permissions (default_role, permission_id, granted)
SELECT 'owner', id, TRUE FROM permissions
ON CONFLICT DO NOTHING;

-- Admin gets all except billing
INSERT INTO role_permissions (default_role, permission_id, granted)
SELECT 'admin', id, TRUE FROM permissions WHERE code != 'admin.billing'
ON CONFLICT DO NOTHING;

-- Project Manager permissions
INSERT INTO role_permissions (default_role, permission_id, granted)
SELECT 'project_manager', id, TRUE FROM permissions
WHERE category IN ('projects', 'daily_reports', 'rfis', 'submittals', 'change_orders', 'documents', 'safety', 'schedule', 'team')
  AND subcategory != 'admin'
  AND NOT is_dangerous
ON CONFLICT DO NOTHING;

-- Superintendent permissions
INSERT INTO role_permissions (default_role, permission_id, granted)
SELECT 'superintendent', id, TRUE FROM permissions
WHERE category IN ('daily_reports', 'rfis', 'submittals', 'documents', 'safety', 'schedule')
  AND subcategory IN ('read', 'write')
ON CONFLICT DO NOTHING;

-- Foreman permissions
INSERT INTO role_permissions (default_role, permission_id, granted)
SELECT 'foreman', id, TRUE FROM permissions
WHERE category IN ('daily_reports', 'safety', 'documents')
  AND subcategory IN ('read', 'write')
ON CONFLICT DO NOTHING;

-- Worker permissions (read-only + create daily reports)
INSERT INTO role_permissions (default_role, permission_id, granted)
SELECT 'worker', id, TRUE FROM permissions
WHERE (subcategory = 'read' AND category IN ('projects', 'daily_reports', 'documents', 'schedule'))
   OR code IN ('daily_reports.create', 'safety.create')
ON CONFLICT DO NOTHING;

-- =============================================
-- Seed Feature Flags
-- =============================================

INSERT INTO feature_flags (code, name, description, category, default_enabled, is_beta) VALUES
('bim_viewer', 'BIM Model Viewer', 'View and navigate 3D BIM models', 'visualization', FALSE, TRUE),
('ai_agents', 'AI Agents', 'AI-powered automation for RFI routing, risk prediction', 'automation', FALSE, TRUE),
('ar_walkthrough', 'AR Site Walkthroughs', '360 photo integration and AR features', 'visualization', FALSE, TRUE),
('iot_sensors', 'IoT Sensor Integration', 'Connect temperature, humidity, and GPS sensors', 'integrations', FALSE, TRUE),
('advanced_analytics', 'Advanced Analytics', 'Predictive analytics and risk dashboards', 'reporting', FALSE, FALSE),
('quickbooks_sync', 'QuickBooks Integration', 'Sync vendors, invoices with QuickBooks', 'integrations', FALSE, FALSE),
('native_mobile', 'Native Mobile Apps', 'iOS and Android native applications', 'mobile', FALSE, FALSE),
('custom_reports', 'Custom Report Builder', 'Build custom reports with drag-and-drop', 'reporting', TRUE, FALSE),
('realtime_collab', 'Real-time Collaboration', 'Live presence and typing indicators', 'collaboration', TRUE, FALSE),
('offline_mode', 'Offline Mode', 'Work offline with automatic sync', 'mobile', TRUE, FALSE)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Helper Functions
-- =============================================

-- Check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_code VARCHAR(100),
  p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role VARCHAR(50);
  v_company_id UUID;
  v_permission_id UUID;
  v_has_permission BOOLEAN := FALSE;
  v_override_type VARCHAR(10);
BEGIN
  -- Get user's role and company
  SELECT role, company_id INTO v_user_role, v_company_id
  FROM users WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get permission ID
  SELECT id INTO v_permission_id FROM permissions WHERE code = p_permission_code;
  IF v_permission_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check for user-specific override first
  SELECT override_type INTO v_override_type
  FROM user_permission_overrides
  WHERE user_id = p_user_id
    AND permission_id = v_permission_id
    AND (project_id = p_project_id OR project_id IS NULL)
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY project_id NULLS LAST -- Project-specific overrides take precedence
  LIMIT 1;

  IF v_override_type = 'grant' THEN
    RETURN TRUE;
  ELSIF v_override_type = 'revoke' THEN
    RETURN FALSE;
  END IF;

  -- Check default role permissions
  SELECT granted INTO v_has_permission
  FROM role_permissions
  WHERE default_role = v_user_role
    AND permission_id = v_permission_id;

  IF v_has_permission THEN
    RETURN TRUE;
  END IF;

  -- Check custom role permissions
  SELECT TRUE INTO v_has_permission
  FROM user_custom_roles ucr
  JOIN role_permissions rp ON rp.custom_role_id = ucr.custom_role_id
  WHERE ucr.user_id = p_user_id
    AND rp.permission_id = v_permission_id
    AND rp.granted = TRUE
    AND (ucr.project_id = p_project_id OR ucr.project_id IS NULL)
  LIMIT 1;

  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  permission_code VARCHAR(100),
  permission_name VARCHAR(200),
  category VARCHAR(50),
  granted BOOLEAN,
  source VARCHAR(50) -- 'default_role', 'custom_role', 'override'
) AS $$
DECLARE
  v_user_role VARCHAR(50);
BEGIN
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;

  RETURN QUERY
  WITH base_permissions AS (
    -- Default role permissions
    SELECT
      p.code,
      p.name,
      p.category,
      rp.granted,
      'default_role'::VARCHAR(50) as source,
      1 as priority
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    WHERE rp.default_role = v_user_role

    UNION ALL

    -- Custom role permissions
    SELECT
      p.code,
      p.name,
      p.category,
      rp.granted,
      'custom_role'::VARCHAR(50) as source,
      2 as priority
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN user_custom_roles ucr ON ucr.custom_role_id = rp.custom_role_id
    WHERE ucr.user_id = p_user_id
      AND (ucr.project_id = p_project_id OR ucr.project_id IS NULL)

    UNION ALL

    -- User overrides
    SELECT
      p.code,
      p.name,
      p.category,
      (upo.override_type = 'grant'),
      'override'::VARCHAR(50) as source,
      3 as priority
    FROM permissions p
    JOIN user_permission_overrides upo ON upo.permission_id = p.id
    WHERE upo.user_id = p_user_id
      AND (upo.project_id = p_project_id OR upo.project_id IS NULL)
      AND (upo.expires_at IS NULL OR upo.expires_at > NOW())
  )
  SELECT DISTINCT ON (bp.code)
    bp.code,
    bp.name,
    bp.category,
    bp.granted,
    bp.source
  FROM base_permissions bp
  ORDER BY bp.code, bp.priority DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if feature is enabled for company
CREATE OR REPLACE FUNCTION company_has_feature(
  p_company_id UUID,
  p_feature_code VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_default_enabled BOOLEAN;
  v_company_enabled BOOLEAN;
BEGIN
  -- Get default state
  SELECT default_enabled INTO v_default_enabled
  FROM feature_flags WHERE code = p_feature_code;

  IF v_default_enabled IS NULL THEN
    RETURN FALSE; -- Feature doesn't exist
  END IF;

  -- Check for company override
  SELECT enabled INTO v_company_enabled
  FROM company_feature_flags cff
  JOIN feature_flags ff ON ff.id = cff.feature_flag_id
  WHERE cff.company_id = p_company_id
    AND ff.code = p_feature_code
    AND (cff.expires_at IS NULL OR cff.expires_at > NOW());

  RETURN COALESCE(v_company_enabled, v_default_enabled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE permissions IS 'All available permissions in the system';
COMMENT ON TABLE custom_roles IS 'Company-defined custom roles';
COMMENT ON TABLE role_permissions IS 'Maps permissions to roles (default or custom)';
COMMENT ON TABLE user_permission_overrides IS 'User-specific permission grants/revokes';
COMMENT ON TABLE feature_flags IS 'System-wide feature flags';
COMMENT ON TABLE company_feature_flags IS 'Per-company feature flag overrides';
COMMENT ON FUNCTION user_has_permission IS 'Check if a user has a specific permission';
COMMENT ON FUNCTION get_user_permissions IS 'Get all permissions for a user';
COMMENT ON FUNCTION company_has_feature IS 'Check if a feature is enabled for a company';
