-- Migration: Report Sharing & Embedding
-- Description: Adds shared_reports table for public/private report sharing with token-based access

-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Table: shared_reports
-- ============================================================================
-- Stores sharing configurations for report templates

CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,

  -- Public access token for sharing (unique, cryptographically secure)
  public_token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),

  -- Access settings
  is_public BOOLEAN NOT NULL DEFAULT false,
  allowed_users UUID[] DEFAULT NULL, -- Array of user IDs who can access (if not public)

  -- Expiration settings
  expires_at TIMESTAMPTZ DEFAULT NULL, -- NULL means never expires

  -- Settings/permissions
  allow_export BOOLEAN NOT NULL DEFAULT true, -- Allow PDF/Excel/CSV export
  show_branding BOOLEAN NOT NULL DEFAULT true, -- Show "Powered by SuperSiteHero" footer
  custom_message TEXT DEFAULT NULL, -- Optional message shown on shared view

  -- Ownership
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Access tracking
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Primary lookup by token for public access
CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_reports_token ON shared_reports(public_token);

-- Lookup by report template
CREATE INDEX IF NOT EXISTS idx_shared_reports_template ON shared_reports(report_template_id);

-- Lookup by company
CREATE INDEX IF NOT EXISTS idx_shared_reports_company ON shared_reports(company_id);

-- Lookup by creator
CREATE INDEX IF NOT EXISTS idx_shared_reports_creator ON shared_reports(created_by);

-- Find active (non-expired) shares - simplified without NOW() to avoid immutability issues
CREATE INDEX IF NOT EXISTS idx_shared_reports_active ON shared_reports(expires_at, is_public) WHERE expires_at IS NULL;

-- ============================================================================
-- Updated timestamp trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_shared_reports_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shared_reports_updated_at ON shared_reports;
CREATE TRIGGER shared_reports_updated_at
  BEFORE UPDATE ON shared_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_reports_timestamp();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own shared reports" ON shared_reports;
DROP POLICY IF EXISTS "Users can create shared reports for own templates" ON shared_reports;
DROP POLICY IF EXISTS "Users can update own shared reports" ON shared_reports;
DROP POLICY IF EXISTS "Users can delete own shared reports" ON shared_reports;
DROP POLICY IF EXISTS "Public access with valid token" ON shared_reports;

-- Policy: Users can view shared reports they created or that belong to their company
CREATE POLICY "Users can view own shared reports"
  ON shared_reports
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can create shared reports for templates they own or that belong to their company
CREATE POLICY "Users can create shared reports for own templates"
  ON shared_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be authenticated
    auth.uid() IS NOT NULL
    -- Template must belong to user's company
    AND report_template_id IN (
      SELECT id FROM report_templates
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
      AND deleted_at IS NULL
    )
    -- Company must match user's company
    AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update shared reports they created
CREATE POLICY "Users can update own shared reports"
  ON shared_reports
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Policy: Users can delete shared reports they created
CREATE POLICY "Users can delete own shared reports"
  ON shared_reports
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Policy: Allow public (anonymous) SELECT access for valid non-expired tokens
-- This is used by the public viewer endpoint
CREATE POLICY "Public access with valid token"
  ON shared_reports
  FOR SELECT
  TO anon
  USING (
    is_public = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- ============================================================================
-- Function: Get shared report by token (for public access)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_shared_report_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  report_template_id UUID,
  public_token TEXT,
  is_public BOOLEAN,
  allowed_users UUID[],
  expires_at TIMESTAMPTZ,
  allow_export BOOLEAN,
  show_branding BOOLEAN,
  custom_message TEXT,
  company_id UUID,
  created_at TIMESTAMPTZ,
  view_count INTEGER,
  -- Include template data
  template_name TEXT,
  template_description TEXT,
  template_data_source TEXT,
  template_configuration JSONB,
  template_default_format TEXT,
  template_page_orientation TEXT,
  template_include_charts BOOLEAN,
  template_include_summary BOOLEAN,
  -- Include company data for branding
  company_name TEXT,
  company_logo_url TEXT
) AS $$
BEGIN
  -- Increment view count
  UPDATE shared_reports
  SET view_count = shared_reports.view_count + 1,
      last_viewed_at = NOW()
  WHERE shared_reports.public_token = p_token
    AND shared_reports.is_public = true
    AND (shared_reports.expires_at IS NULL OR shared_reports.expires_at > NOW());

  -- Return the data
  RETURN QUERY
  SELECT
    sr.id,
    sr.report_template_id,
    sr.public_token,
    sr.is_public,
    sr.allowed_users,
    sr.expires_at,
    sr.allow_export,
    sr.show_branding,
    sr.custom_message,
    sr.company_id,
    sr.created_at,
    sr.view_count,
    -- Template data
    rt.name AS template_name,
    rt.description AS template_description,
    rt.data_source AS template_data_source,
    rt.configuration AS template_configuration,
    rt.default_format AS template_default_format,
    rt.page_orientation AS template_page_orientation,
    rt.include_charts AS template_include_charts,
    rt.include_summary AS template_include_summary,
    -- Company data
    c.name AS company_name,
    c.logo_url AS company_logo_url
  FROM shared_reports sr
  INNER JOIN report_templates rt ON rt.id = sr.report_template_id
  INNER JOIN companies c ON c.id = sr.company_id
  WHERE sr.public_token = p_token
    AND sr.is_public = true
    AND (sr.expires_at IS NULL OR sr.expires_at > NOW())
    AND rt.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon users for public access
GRANT EXECUTE ON FUNCTION get_shared_report_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_shared_report_by_token(TEXT) TO authenticated;

-- ============================================================================
-- Function: Regenerate share token (for security)
-- ============================================================================

CREATE OR REPLACE FUNCTION regenerate_share_token(p_share_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_new_token TEXT;
BEGIN
  -- Generate new token
  v_new_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  -- Update the share
  UPDATE shared_reports
  SET public_token = v_new_token,
      updated_at = NOW()
  WHERE id = p_share_id
    AND (
      created_by = auth.uid()
      OR company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
      )
    );

  RETURN v_new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION regenerate_share_token(UUID) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE shared_reports IS 'Stores sharing configurations for report templates with token-based public access';
COMMENT ON COLUMN shared_reports.public_token IS 'Unique cryptographically secure token for public access URL';
COMMENT ON COLUMN shared_reports.is_public IS 'If true, anyone with the token can view the report';
COMMENT ON COLUMN shared_reports.allowed_users IS 'Array of user IDs who can access if not public';
COMMENT ON COLUMN shared_reports.expires_at IS 'When the share expires. NULL means never expires';
COMMENT ON COLUMN shared_reports.allow_export IS 'Whether users can export to PDF/Excel/CSV';
COMMENT ON COLUMN shared_reports.show_branding IS 'Whether to show SuperSiteHero branding';
COMMENT ON COLUMN shared_reports.view_count IS 'Number of times the shared report has been viewed';
