-- Migration: 111_daily_report_templates_sharing.sql
-- Description: Enhance daily report templates for cross-project sharing at company level
-- Date: 2024-12-13
-- Features: Company-wide template sharing, template library management, import/export

-- =============================================
-- PHASE 1: Enhance daily_report_templates table
-- =============================================

-- Add company_id for company-wide sharing
ALTER TABLE daily_report_templates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add created_by to track template creator
ALTER TABLE daily_report_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add template metadata for better organization
ALTER TABLE daily_report_templates ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT '{}';

-- Add category for organization
ALTER TABLE daily_report_templates ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- Add tags for searchability
ALTER TABLE daily_report_templates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add usage tracking
ALTER TABLE daily_report_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE daily_report_templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Add visibility scope
ALTER TABLE daily_report_templates ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'project';
-- Scope options: 'personal', 'project', 'company'

-- Add version for tracking template updates
ALTER TABLE daily_report_templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add source tracking for copied templates
ALTER TABLE daily_report_templates ADD COLUMN IF NOT EXISTS copied_from_id UUID REFERENCES daily_report_templates(id) ON DELETE SET NULL;

-- =============================================
-- PHASE 2: Create indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_templates_company ON daily_report_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON daily_report_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_scope ON daily_report_templates(scope);
CREATE INDEX IF NOT EXISTS idx_templates_category ON daily_report_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON daily_report_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON daily_report_templates(usage_count DESC);

-- =============================================
-- PHASE 3: Drop existing RLS policies and create new ones
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view templates for their projects" ON daily_report_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON daily_report_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON daily_report_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON daily_report_templates;

-- Create new comprehensive policies for company-wide sharing

-- View Policy: Users can see:
-- 1. Their own personal templates (scope = 'personal' AND created_by = user)
-- 2. Project templates for projects they're part of (scope = 'project' AND project in user's projects)
-- 3. Company templates for their company (scope = 'company' AND company matches user's company)
CREATE POLICY "Users can view accessible templates" ON daily_report_templates
  FOR SELECT USING (
    -- Personal templates: only creator can see
    (scope = 'personal' AND created_by = auth.uid()) OR
    -- Project templates: project members can see
    (scope = 'project' AND project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )) OR
    -- Company templates: company members can see
    (scope = 'company' AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )) OR
    -- Global templates (is_default = true): everyone can see
    is_default = true
  );

-- Insert Policy: Users can create templates
-- They must set appropriate scope and ownership
CREATE POLICY "Users can create templates" ON daily_report_templates
  FOR INSERT WITH CHECK (
    -- User must be the creator
    created_by = auth.uid() AND
    (
      -- Personal scope: anyone can create
      (scope = 'personal') OR
      -- Project scope: must be member of the project
      (scope = 'project' AND project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )) OR
      -- Company scope: must belong to the company
      (scope = 'company' AND company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      ))
    )
  );

-- Update Policy: Users can update templates they created
-- Or project/company admins can update shared templates
CREATE POLICY "Users can update their templates" ON daily_report_templates
  FOR UPDATE USING (
    -- Creator can always update
    created_by = auth.uid() OR
    -- Project admins can update project templates
    (scope = 'project' AND project_id IN (
      SELECT project_id FROM project_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )) OR
    -- Company admins can update company templates
    (scope = 'company' AND company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ))
  );

-- Delete Policy: Similar to update policy
CREATE POLICY "Users can delete their templates" ON daily_report_templates
  FOR DELETE USING (
    -- Creator can always delete
    created_by = auth.uid() OR
    -- Project admins can delete project templates
    (scope = 'project' AND project_id IN (
      SELECT project_id FROM project_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )) OR
    -- Company admins can delete company templates
    (scope = 'company' AND company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ))
  );

-- =============================================
-- PHASE 4: Create function to increment usage count
-- =============================================

CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE daily_report_templates
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PHASE 5: Create function to copy template to another project/scope
-- =============================================

CREATE OR REPLACE FUNCTION copy_template(
  source_template_id UUID,
  new_name VARCHAR(255),
  new_scope VARCHAR(20),
  new_project_id UUID DEFAULT NULL,
  new_company_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_template_id UUID;
  source_template daily_report_templates%ROWTYPE;
BEGIN
  -- Fetch source template
  SELECT * INTO source_template
  FROM daily_report_templates
  WHERE id = source_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source template not found';
  END IF;

  -- Create new template
  INSERT INTO daily_report_templates (
    name,
    description,
    project_id,
    company_id,
    created_by,
    scope,
    category,
    tags,
    workforce_template,
    equipment_template,
    template_data,
    is_default,
    copied_from_id,
    version
  ) VALUES (
    new_name,
    source_template.description,
    new_project_id,
    new_company_id,
    auth.uid(),
    new_scope,
    source_template.category,
    source_template.tags,
    source_template.workforce_template,
    source_template.equipment_template,
    source_template.template_data,
    false,
    source_template_id,
    1
  )
  RETURNING id INTO new_template_id;

  RETURN new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PHASE 6: Create view for template statistics
-- =============================================

CREATE OR REPLACE VIEW template_statistics AS
SELECT
  t.id,
  t.name,
  t.scope,
  t.company_id,
  t.project_id,
  t.category,
  t.usage_count,
  t.last_used_at,
  t.created_at,
  t.created_by,
  u.email as creator_email,
  u.raw_user_meta_data->>'full_name' as creator_name,
  COALESCE(jsonb_array_length(t.workforce_template), 0) as workforce_count,
  COALESCE(jsonb_array_length(t.equipment_template), 0) as equipment_count,
  COALESCE(array_length(t.tags, 1), 0) as tag_count,
  c.name as company_name,
  p.name as project_name
FROM daily_report_templates t
LEFT JOIN auth.users u ON t.created_by = u.id
LEFT JOIN companies c ON t.company_id = c.id
LEFT JOIN projects p ON t.project_id = p.id;

-- =============================================
-- PHASE 7: Add update trigger
-- =============================================

-- Create trigger to update updated_at on template changes
DROP TRIGGER IF EXISTS update_template_updated_at ON daily_report_templates;

CREATE TRIGGER update_template_updated_at
  BEFORE UPDATE ON daily_report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PHASE 8: Add comments for documentation
-- =============================================

COMMENT ON TABLE daily_report_templates IS 'Stores reusable daily report templates with support for personal, project, and company-wide sharing';
COMMENT ON COLUMN daily_report_templates.scope IS 'Template visibility: personal (creator only), project (project members), company (company-wide)';
COMMENT ON COLUMN daily_report_templates.template_data IS 'Additional template configuration stored as JSONB (weather defaults, notes templates, custom sections)';
COMMENT ON COLUMN daily_report_templates.copied_from_id IS 'Reference to the original template when this was created as a copy';
COMMENT ON COLUMN daily_report_templates.usage_count IS 'Number of times this template has been applied to reports';
COMMENT ON FUNCTION increment_template_usage IS 'Safely increments template usage count and updates last_used_at timestamp';
COMMENT ON FUNCTION copy_template IS 'Creates a copy of a template with new scope/project/company settings';
