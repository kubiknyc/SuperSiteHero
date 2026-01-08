-- Migration: 088_project_templates.sql
-- Description: Project templates for standardized project creation
-- Date: 2025-12-08

-- =============================================
-- TABLES
-- =============================================

-- Main project templates table
CREATE TABLE IF NOT EXISTS project_templates (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'commercial', 'residential', 'industrial', etc.
  tags TEXT[], -- searchable keywords

  -- Visibility
  visibility VARCHAR(50) DEFAULT 'company' CHECK (visibility IN ('company', 'private')),
  is_system_template BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Icon/Color for UI
  icon VARCHAR(50),
  color VARCHAR(7), -- hex color code

  -- Template Configuration (JSONB)
  default_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  folder_structure JSONB DEFAULT '[]'::jsonb,
  default_roles JSONB DEFAULT '[]'::jsonb,
  numbering_config JSONB DEFAULT '{}'::jsonb,
  notification_rules JSONB DEFAULT '[]'::jsonb,
  enabled_features JSONB DEFAULT '{}'::jsonb,
  custom_fields JSONB DEFAULT '[]'::jsonb,

  -- Usage Statistics
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_template_name_per_company UNIQUE(company_id, name)
);

COMMENT ON TABLE project_templates IS 'Reusable project templates for standardized project setup';
COMMENT ON COLUMN project_templates.visibility IS 'company = visible to all company users, private = only creator';
COMMENT ON COLUMN project_templates.is_system_template IS 'Industry-standard templates provided by the system';
COMMENT ON COLUMN project_templates.default_settings IS 'Default project settings (weather units, schedule, budget, safety)';
COMMENT ON COLUMN project_templates.folder_structure IS 'Hierarchical folder structure to create';
COMMENT ON COLUMN project_templates.default_roles IS 'Standard team roles and permissions';
COMMENT ON COLUMN project_templates.numbering_config IS 'Numbering schemes for RFIs, submittals, change orders, etc.';
COMMENT ON COLUMN project_templates.enabled_features IS 'Which features are enabled for projects using this template';
COMMENT ON COLUMN project_templates.custom_fields IS 'Custom field definitions to add to projects';

-- Phase/milestone templates
CREATE TABLE IF NOT EXISTS project_template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,

  -- Phase Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  phase_order INTEGER NOT NULL,

  -- Duration
  estimated_duration_days INTEGER,

  -- Dependencies
  depends_on_phase_id UUID REFERENCES project_template_phases(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_phase_order_per_template UNIQUE(template_id, phase_order)
);

COMMENT ON TABLE project_template_phases IS 'Phase/milestone templates for project schedules';

-- Checklist template associations
CREATE TABLE IF NOT EXISTS project_template_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  checklist_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,

  -- Configuration
  is_required BOOLEAN DEFAULT TRUE,
  auto_create BOOLEAN DEFAULT TRUE,
  trigger_phase VARCHAR(100), -- When to create: 'project_start', 'substantial_completion', etc.

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_checklist_per_template UNIQUE(template_id, checklist_template_id)
);

COMMENT ON TABLE project_template_checklists IS 'Associates checklist templates with project templates';
COMMENT ON COLUMN project_template_checklists.auto_create IS 'Automatically create checklist when project is created';
COMMENT ON COLUMN project_template_checklists.trigger_phase IS 'When to create the checklist (project_start, phase_name, milestone)';

-- Approval workflow associations
CREATE TABLE IF NOT EXISTS project_template_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,

  -- Assignment
  workflow_type VARCHAR(50) NOT NULL, -- 'document', 'submittal', 'rfi', 'change_order'
  is_default BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_workflow_type_per_template UNIQUE(template_id, workflow_type)
);

COMMENT ON TABLE project_template_workflows IS 'Associates approval workflows with project templates';
COMMENT ON COLUMN project_template_workflows.workflow_type IS 'Type of entity this workflow applies to';
COMMENT ON COLUMN project_template_workflows.is_default IS 'Use as default workflow for this entity type';

-- Distribution list templates
CREATE TABLE IF NOT EXISTS project_template_distribution_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,

  -- List definition
  list_name VARCHAR(200) NOT NULL,
  list_type VARCHAR(50) NOT NULL, -- 'rfi', 'submittal', 'transmittal', 'daily_report', etc.
  is_default BOOLEAN DEFAULT FALSE,

  -- Members configuration (role-based, resolved at project creation)
  -- Example: [{"role": "project_manager", "member_role": "to"}, {"email": "architect@firm.com", "member_role": "cc"}]
  members JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE project_template_distribution_lists IS 'Distribution list definitions to create per project';
COMMENT ON COLUMN project_template_distribution_lists.members IS 'Array of member configs with role or email and member_role (to/cc/bcc)';

-- =============================================
-- INDEXES
-- =============================================

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_project_templates_company ON project_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category);
CREATE INDEX IF NOT EXISTS idx_project_templates_active ON project_templates(company_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_project_templates_usage ON project_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_project_templates_tags ON project_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_project_templates_not_deleted ON project_templates(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_templates_created_by ON project_templates(created_by);

-- Phases indexes
CREATE INDEX IF NOT EXISTS idx_template_phases_template ON project_template_phases(template_id);
CREATE INDEX IF NOT EXISTS idx_template_phases_order ON project_template_phases(template_id, phase_order);

-- Checklists indexes
CREATE INDEX IF NOT EXISTS idx_template_checklists_template ON project_template_checklists(template_id);
CREATE INDEX IF NOT EXISTS idx_template_checklists_checklist ON project_template_checklists(checklist_template_id);

-- Workflows indexes
CREATE INDEX IF NOT EXISTS idx_template_workflows_template ON project_template_workflows(template_id);
CREATE INDEX IF NOT EXISTS idx_template_workflows_workflow ON project_template_workflows(workflow_id);
CREATE INDEX IF NOT EXISTS idx_template_workflows_type ON project_template_workflows(workflow_type);

-- Distribution Lists indexes
CREATE INDEX IF NOT EXISTS idx_template_dist_lists_template ON project_template_distribution_lists(template_id);
CREATE INDEX IF NOT EXISTS idx_template_dist_lists_type ON project_template_distribution_lists(list_type);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger for project_templates
CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON project_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS
-- =============================================

-- Increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE project_templates
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_template_usage IS 'Increment usage count and update last_used_at timestamp';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_distribution_lists ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROJECT TEMPLATES POLICIES
-- =============================================

-- SELECT: Users can view templates for their company (respecting visibility)
CREATE POLICY "Users can view templates for their company"
  ON project_templates FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      visibility = 'company'
      OR (visibility = 'private' AND created_by = auth.uid())
    )
    AND deleted_at IS NULL
  );

-- INSERT: Users can create templates for their company
CREATE POLICY "Users can create templates for their company"
  ON project_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- UPDATE: Users can update their own templates or company templates if admin/owner
CREATE POLICY "Users can update their own or company templates"
  ON project_templates FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
      )
    )
  );

-- DELETE: Users can delete their own templates or any if admin/owner
CREATE POLICY "Users can delete their own templates"
  ON project_templates FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND company_id = project_templates.company_id
      AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- PROJECT TEMPLATE PHASES POLICIES
-- =============================================

-- SELECT: Users can view phases for accessible templates
CREATE POLICY "Users can view phases for accessible templates"
  ON project_template_phases FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
      AND deleted_at IS NULL
    )
  );

-- INSERT: Users can create phases for their templates
CREATE POLICY "Users can create phases for their templates"
  ON project_template_phases FOR INSERT
  TO authenticated
  WITH CHECK (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- UPDATE: Users can update phases for their templates
CREATE POLICY "Users can update phases for their templates"
  ON project_template_phases FOR UPDATE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- DELETE: Users can delete phases for their templates
CREATE POLICY "Users can delete phases for their templates"
  ON project_template_phases FOR DELETE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- =============================================
-- PROJECT TEMPLATE CHECKLISTS POLICIES
-- =============================================

-- SELECT: Users can view checklist associations for accessible templates
CREATE POLICY "Users can view checklist associations"
  ON project_template_checklists FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
      AND deleted_at IS NULL
    )
  );

-- INSERT: Users can create checklist associations for their templates
CREATE POLICY "Users can create checklist associations"
  ON project_template_checklists FOR INSERT
  TO authenticated
  WITH CHECK (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- UPDATE: Users can update checklist associations for their templates
CREATE POLICY "Users can update checklist associations"
  ON project_template_checklists FOR UPDATE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- DELETE: Users can delete checklist associations for their templates
CREATE POLICY "Users can delete checklist associations"
  ON project_template_checklists FOR DELETE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- =============================================
-- PROJECT TEMPLATE WORKFLOWS POLICIES
-- =============================================

-- SELECT: Users can view workflow associations for accessible templates
CREATE POLICY "Users can view workflow associations"
  ON project_template_workflows FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
      AND deleted_at IS NULL
    )
  );

-- INSERT: Users can create workflow associations for their templates
CREATE POLICY "Users can create workflow associations"
  ON project_template_workflows FOR INSERT
  TO authenticated
  WITH CHECK (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- UPDATE: Users can update workflow associations for their templates
CREATE POLICY "Users can update workflow associations"
  ON project_template_workflows FOR UPDATE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- DELETE: Users can delete workflow associations for their templates
CREATE POLICY "Users can delete workflow associations"
  ON project_template_workflows FOR DELETE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- =============================================
-- PROJECT TEMPLATE DISTRIBUTION LISTS POLICIES
-- =============================================

-- SELECT: Users can view distribution list templates for accessible templates
CREATE POLICY "Users can view distribution list templates"
  ON project_template_distribution_lists FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
      AND deleted_at IS NULL
    )
  );

-- INSERT: Users can create distribution list templates for their templates
CREATE POLICY "Users can create distribution list templates"
  ON project_template_distribution_lists FOR INSERT
  TO authenticated
  WITH CHECK (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- UPDATE: Users can update distribution list templates for their templates
CREATE POLICY "Users can update distribution list templates"
  ON project_template_distribution_lists FOR UPDATE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- DELETE: Users can delete distribution list templates for their templates
CREATE POLICY "Users can delete distribution list templates"
  ON project_template_distribution_lists FOR DELETE
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')))
    )
  );

-- =============================================
-- ADD template_id TO PROJECTS TABLE
-- =============================================

-- Add template reference to projects table for tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES project_templates(id);
CREATE INDEX IF NOT EXISTS idx_projects_template_id ON projects(template_id);

COMMENT ON COLUMN projects.template_id IS 'Reference to project template used to create this project';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 088_project_templates completed successfully';
  RAISE NOTICE 'Created tables: project_templates, project_template_phases, project_template_checklists, project_template_workflows, project_template_distribution_lists';
  RAISE NOTICE 'Added template_id column to projects table';
END $$;
