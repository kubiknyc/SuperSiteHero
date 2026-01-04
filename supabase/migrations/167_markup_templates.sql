-- Migration: 167_markup_templates.sql
-- Description: Create markup_templates table for storing reusable markup annotations
-- Date: 2025-01-03

-- ============================================================
-- CREATE MARKUP TEMPLATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS markup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'custom',

  -- Template data (stored as JSONB array of annotations)
  markups JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Sharing settings
  is_shared BOOLEAN NOT NULL DEFAULT false,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Metadata
  thumbnail_url TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Audit fields
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT markup_templates_category_check CHECK (
    category IN ('qc_review', 'site_walk', 'punch_list', 'coordination', 'safety_inspection', 'custom')
  )
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Index for fetching templates by creator
CREATE INDEX idx_markup_templates_created_by ON markup_templates(created_by) WHERE deleted_at IS NULL;

-- Index for fetching templates by project
CREATE INDEX idx_markup_templates_project_id ON markup_templates(project_id) WHERE deleted_at IS NULL;

-- Index for fetching shared templates
CREATE INDEX idx_markup_templates_shared ON markup_templates(is_shared) WHERE deleted_at IS NULL AND is_shared = true;

-- Index for fetching by category
CREATE INDEX idx_markup_templates_category ON markup_templates(category) WHERE deleted_at IS NULL;

-- GIN index for tags search
CREATE INDEX idx_markup_templates_tags ON markup_templates USING GIN(tags) WHERE deleted_at IS NULL;

-- Composite index for common query patterns
CREATE INDEX idx_markup_templates_project_category ON markup_templates(project_id, category) WHERE deleted_at IS NULL;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE markup_templates
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_id
    AND deleted_at IS NULL;
END;
$$;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_markup_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_markup_templates_updated_at ON markup_templates;
CREATE TRIGGER trigger_markup_templates_updated_at
  BEFORE UPDATE ON markup_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_markup_templates_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE markup_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own templates
CREATE POLICY markup_templates_select_own ON markup_templates
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    AND deleted_at IS NULL
  );

-- Policy: Users can view shared templates in their projects
CREATE POLICY markup_templates_select_shared ON markup_templates
  FOR SELECT
  TO authenticated
  USING (
    is_shared = true
    AND deleted_at IS NULL
    AND (
      project_id IS NULL
      OR project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can insert their own templates
CREATE POLICY markup_templates_insert ON markup_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      project_id IS NULL
      OR project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own templates
CREATE POLICY markup_templates_update ON markup_templates
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- Policy: Users can delete (soft) their own templates
CREATE POLICY markup_templates_delete ON markup_templates
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND deleted_at IS NULL
  );

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE markup_templates IS 'Stores reusable markup annotation templates for construction drawings';
COMMENT ON COLUMN markup_templates.name IS 'User-friendly name for the template';
COMMENT ON COLUMN markup_templates.category IS 'Template category: qc_review, site_walk, punch_list, coordination, safety_inspection, custom';
COMMENT ON COLUMN markup_templates.markups IS 'JSONB array of annotation data with relative positions';
COMMENT ON COLUMN markup_templates.is_shared IS 'Whether the template is shared with team members';
COMMENT ON COLUMN markup_templates.project_id IS 'Optional project scope; NULL means global availability';
COMMENT ON COLUMN markup_templates.usage_count IS 'Number of times the template has been loaded/used';
COMMENT ON COLUMN markup_templates.tags IS 'Array of searchable tags for the template';
