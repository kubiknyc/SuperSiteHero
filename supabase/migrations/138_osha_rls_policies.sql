-- =============================================
-- Migration: 138_osha_rls_policies.sql
-- Description: Row Level Security policies for OSHA 300 Log data
-- Created: 2025-12-15
--
-- Features:
--   - Restricts OSHA recordable incident viewing to authorized users
--   - Restricts OSHA record editing to safety managers and admins
--   - Uses permission-based access control via user_has_permission()
--   - Maintains existing project-based access for non-OSHA incidents
-- =============================================

-- =============================================
-- DROP EXISTING POLICIES
-- We'll replace the broad policies with more restrictive ones for OSHA data
-- =============================================

-- Note: We keep the existing policies but add additional restrictive policies
-- for OSHA recordable incidents

-- =============================================
-- OSHA-SPECIFIC RLS POLICIES
-- =============================================

-- Policy: Users with safety.osha permission can view all OSHA recordable incidents in their company
CREATE POLICY "Users with safety.osha permission can view OSHA recordable incidents"
  ON safety_incidents FOR SELECT
  USING (
    osha_recordable = TRUE
    AND (
      -- User has safety.osha permission
      user_has_permission(auth.uid(), 'safety.osha')
      AND company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users without safety.osha permission cannot view OSHA recordable incidents
-- This creates a more restrictive policy for OSHA data
CREATE POLICY "Restrict OSHA recordable incident viewing to authorized users"
  ON safety_incidents FOR SELECT
  USING (
    -- If it's an OSHA recordable incident, user must have safety.osha permission
    CASE
      WHEN osha_recordable = TRUE THEN
        user_has_permission(auth.uid(), 'safety.osha')
        AND company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      ELSE
        -- For non-OSHA incidents, use existing project-based access
        project_id IN (
          SELECT p.id FROM projects p
          JOIN project_users pu ON p.id = pu.project_id
          WHERE pu.user_id = auth.uid()
        )
    END
  );

-- Policy: Only users with safety.osha permission can update OSHA recordable incidents
CREATE POLICY "Only authorized users can update OSHA recordable incidents"
  ON safety_incidents FOR UPDATE
  USING (
    CASE
      WHEN osha_recordable = TRUE THEN
        user_has_permission(auth.uid(), 'safety.osha')
        AND company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      ELSE
        -- For non-OSHA incidents, use existing project-based access
        project_id IN (
          SELECT p.id FROM projects p
          JOIN project_users pu ON p.id = pu.project_id
          WHERE pu.user_id = auth.uid()
        )
    END
  );

-- Policy: Only users with safety.osha permission can create OSHA recordable incidents
CREATE POLICY "Only authorized users can create OSHA recordable incidents"
  ON safety_incidents FOR INSERT
  WITH CHECK (
    CASE
      WHEN osha_recordable = TRUE THEN
        user_has_permission(auth.uid(), 'safety.osha')
        AND company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      ELSE
        -- For non-OSHA incidents, use existing project-based access
        project_id IN (
          SELECT p.id FROM projects p
          JOIN project_users pu ON p.id = pu.project_id
          WHERE pu.user_id = auth.uid()
        )
    END
  );

-- =============================================
-- RLS POLICIES FOR OSHA VIEWS
-- =============================================

-- Enable RLS on the OSHA views (if not already enabled)
-- Note: Views inherit RLS from their underlying tables by default in Supabase

-- Create a policy to allow authorized users to access OSHA 300 log view
-- Note: This is handled through the underlying safety_incidents table RLS

-- =============================================
-- OSHA 300A CERTIFICATION TABLE
-- =============================================

-- Table to store OSHA 300A annual summary certifications
CREATE TABLE IF NOT EXISTS osha_300a_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- Optional project scope
  calendar_year INTEGER NOT NULL,

  -- Establishment info
  establishment_name TEXT NOT NULL,

  -- Certifying official
  certifying_official_name TEXT NOT NULL,
  certifying_official_title TEXT NOT NULL,
  certifying_official_phone VARCHAR(20),
  certifying_official_email TEXT,

  -- Signature
  signature_type VARCHAR(20) NOT NULL CHECK (signature_type IN ('typed', 'drawn')),
  signature_data TEXT, -- Base64 encoded signature image for drawn signatures
  signature_typed_name TEXT, -- Typed name for typed signatures

  -- Certification details
  certification_date DATE NOT NULL,
  certified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certified_by UUID NOT NULL REFERENCES users(id),

  -- Annual summary data (cached for historical record)
  total_hours_worked INTEGER, -- Total hours worked by all employees
  average_number_employees INTEGER, -- Average number of employees
  total_deaths INTEGER DEFAULT 0,
  total_days_away_cases INTEGER DEFAULT 0,
  total_job_transfer_cases INTEGER DEFAULT 0,
  total_other_recordable_cases INTEGER DEFAULT 0,
  total_recordable_cases INTEGER DEFAULT 0,
  total_injuries INTEGER DEFAULT 0,
  total_skin_disorders INTEGER DEFAULT 0,
  total_respiratory_conditions INTEGER DEFAULT 0,
  total_poisonings INTEGER DEFAULT 0,
  total_hearing_losses INTEGER DEFAULT 0,
  total_other_illnesses INTEGER DEFAULT 0,
  total_days_away INTEGER DEFAULT 0,
  total_days_transfer INTEGER DEFAULT 0,

  -- Calculated rates
  trir DECIMAL(10, 2), -- Total Recordable Incident Rate
  dart_rate DECIMAL(10, 2), -- Days Away, Restricted, or Transferred Rate

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  -- Posting compliance
  posted_date DATE, -- When the form was posted
  removed_date DATE, -- When the form was removed (should be after April 30)

  -- Constraints
  CONSTRAINT unique_certification_per_company_year UNIQUE (company_id, calendar_year, project_id)
);

COMMENT ON TABLE osha_300a_certifications IS 'OSHA Form 300A certifications with digital signatures';
COMMENT ON COLUMN osha_300a_certifications.signature_type IS 'Type of signature: typed (name only) or drawn (canvas signature)';
COMMENT ON COLUMN osha_300a_certifications.signature_data IS 'Base64 encoded PNG image of drawn signature';
COMMENT ON COLUMN osha_300a_certifications.trir IS 'Total Recordable Incident Rate = (N/EH) x 200,000';
COMMENT ON COLUMN osha_300a_certifications.dart_rate IS 'DART Rate = (N/EH) x 200,000';
COMMENT ON COLUMN osha_300a_certifications.posted_date IS 'Date form was posted (must be by February 1)';
COMMENT ON COLUMN osha_300a_certifications.removed_date IS 'Date form was removed (must be after April 30)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_osha_certifications_company_year ON osha_300a_certifications(company_id, calendar_year);
CREATE INDEX IF NOT EXISTS idx_osha_certifications_project ON osha_300a_certifications(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osha_certifications_certified_by ON osha_300a_certifications(certified_by);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_osha_certification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_osha_certifications_updated ON osha_300a_certifications;
CREATE TRIGGER trg_osha_certifications_updated
  BEFORE UPDATE ON osha_300a_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_osha_certification_timestamp();

-- RLS for certifications table
ALTER TABLE osha_300a_certifications ENABLE ROW LEVEL SECURITY;

-- Users with safety.osha permission can view certifications for their company
CREATE POLICY "Users with safety.osha permission can view certifications"
  ON osha_300a_certifications FOR SELECT
  USING (
    user_has_permission(auth.uid(), 'safety.osha')
    AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users with safety.osha permission can create certifications
CREATE POLICY "Users with safety.osha permission can create certifications"
  ON osha_300a_certifications FOR INSERT
  WITH CHECK (
    user_has_permission(auth.uid(), 'safety.osha')
    AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users with safety.osha permission can update certifications
CREATE POLICY "Users with safety.osha permission can update certifications"
  ON osha_300a_certifications FOR UPDATE
  USING (
    user_has_permission(auth.uid(), 'safety.osha')
    AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users with safety.osha permission can delete certifications
CREATE POLICY "Users with safety.osha permission can delete certifications"
  ON osha_300a_certifications FOR DELETE
  USING (
    user_has_permission(auth.uid(), 'safety.osha')
    AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- =============================================
-- HELPER FUNCTION FOR OSHA DATA ACCESS
-- =============================================

-- Function to check if a user can access OSHA data
CREATE OR REPLACE FUNCTION can_access_osha_data(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_can_access BOOLEAN;
BEGIN
  -- Check if user has safety.osha permission
  SELECT user_has_permission(p_user_id, 'safety.osha') INTO v_can_access;

  RETURN COALESCE(v_can_access, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_access_osha_data IS 'Check if a user has permission to access OSHA 300 log data';

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON osha_300a_certifications TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_osha_data TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY "Users with safety.osha permission can view OSHA recordable incidents" ON safety_incidents IS
  'Allows users with safety.osha permission to view OSHA recordable incidents in their company';

COMMENT ON POLICY "Restrict OSHA recordable incident viewing to authorized users" ON safety_incidents IS
  'Restricts viewing of OSHA recordable incidents to users with safety.osha permission';

COMMENT ON POLICY "Only authorized users can update OSHA recordable incidents" ON safety_incidents IS
  'Only users with safety.osha permission can update OSHA recordable incidents';

COMMENT ON POLICY "Only authorized users can create OSHA recordable incidents" ON safety_incidents IS
  'Only users with safety.osha permission can create OSHA recordable incidents';

-- =============================================
-- SECURITY NOTES
-- =============================================

-- 1. The safety.osha permission is granted to owners, admins, and project_managers by default
--    (see migration 090_advanced_permissions.sql)
--
-- 2. These policies work in conjunction with existing project-based policies
--    to ensure proper access control
--
-- 3. Users without safety.osha permission can still view and manage non-OSHA
--    recordable incidents in their projects
--
-- 4. The user_has_permission() function checks both default roles and custom roles
--    with permission overrides
--
-- 5. OSHA data access is company-scoped, not project-scoped, as OSHA logs are
--    typically managed at the company level

