-- =============================================
-- Migration: Distribution Lists
-- Description: Reusable distribution lists for RFIs, Submittals, Transmittals, etc.
-- =============================================

-- Distribution Lists table
CREATE TABLE IF NOT EXISTS distribution_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL = company-wide list

  -- List identification
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Type categorization
  list_type VARCHAR(50) DEFAULT 'general', -- general, rfi, submittal, transmittal, safety, etc.

  -- Defaults
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_list_name_per_scope UNIQUE NULLS NOT DISTINCT (company_id, project_id, name)
);

-- Distribution List Members table
CREATE TABLE IF NOT EXISTS distribution_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES distribution_lists(id) ON DELETE CASCADE,

  -- Member identification (either internal user OR external contact)
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  external_email VARCHAR(255),
  external_name VARCHAR(200),
  external_company VARCHAR(200),

  -- Member role in distribution
  member_role VARCHAR(50) DEFAULT 'cc', -- to, cc, bcc

  -- Notification preferences
  notify_email BOOLEAN DEFAULT TRUE,
  notify_in_app BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES users(id),

  -- Constraints: must have either user_id OR external_email
  CONSTRAINT member_identity_required CHECK (
    user_id IS NOT NULL OR external_email IS NOT NULL
  ),
  -- Unique member per list
  CONSTRAINT unique_member_per_list UNIQUE NULLS NOT DISTINCT (list_id, user_id, external_email)
);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_distribution_lists_company
  ON distribution_lists(company_id);

CREATE INDEX IF NOT EXISTS idx_distribution_lists_project
  ON distribution_lists(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_distribution_lists_type
  ON distribution_lists(list_type);

CREATE INDEX IF NOT EXISTS idx_distribution_lists_default
  ON distribution_lists(company_id, project_id, is_default)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_distribution_list_members_list
  ON distribution_list_members(list_id);

CREATE INDEX IF NOT EXISTS idx_distribution_list_members_user
  ON distribution_list_members(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_distribution_list_members_email
  ON distribution_list_members(external_email)
  WHERE external_email IS NOT NULL;

-- =============================================
-- Triggers
-- =============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_distribution_lists_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_distribution_lists_updated ON distribution_lists;
CREATE TRIGGER trg_distribution_lists_updated
  BEFORE UPDATE ON distribution_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_distribution_lists_timestamp();

-- Ensure only one default per scope
CREATE OR REPLACE FUNCTION ensure_single_default_distribution_list()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    -- Unset other defaults in same scope
    UPDATE distribution_lists
    SET is_default = FALSE
    WHERE company_id = NEW.company_id
      AND (project_id = NEW.project_id OR (project_id IS NULL AND NEW.project_id IS NULL))
      AND list_type = NEW.list_type
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_single_default ON distribution_lists;
CREATE TRIGGER trg_ensure_single_default
  BEFORE INSERT OR UPDATE OF is_default ON distribution_lists
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_distribution_list();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE distribution_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_list_members ENABLE ROW LEVEL SECURITY;

-- Distribution Lists: Users can see lists for their company/projects
CREATE POLICY distribution_lists_select ON distribution_lists
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      project_id IS NULL
      OR project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Distribution Lists: Users can create lists for their company
CREATE POLICY distribution_lists_insert ON distribution_lists
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      project_id IS NULL
      OR project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Distribution Lists: Users can update lists they created or are admin
CREATE POLICY distribution_lists_update ON distribution_lists
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

-- Distribution Lists: Users can delete lists they created or are admin
CREATE POLICY distribution_lists_delete ON distribution_lists
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

-- Distribution List Members: Users can see members of lists they can see
CREATE POLICY distribution_list_members_select ON distribution_list_members
  FOR SELECT USING (
    list_id IN (
      SELECT id FROM distribution_lists
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Distribution List Members: Users can add members to lists they can manage
CREATE POLICY distribution_list_members_insert ON distribution_list_members
  FOR INSERT WITH CHECK (
    list_id IN (
      SELECT id FROM distribution_lists
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Distribution List Members: Users can remove members from lists they can manage
CREATE POLICY distribution_list_members_delete ON distribution_list_members
  FOR DELETE USING (
    list_id IN (
      SELECT id FROM distribution_lists
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
      )
    )
  );

-- =============================================
-- Helper Functions
-- =============================================

-- Get all recipients from a distribution list
CREATE OR REPLACE FUNCTION get_distribution_list_recipients(p_list_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  email VARCHAR(255),
  name VARCHAR(200),
  company VARCHAR(200),
  member_role VARCHAR(50),
  is_internal BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dlm.id AS member_id,
    dlm.user_id,
    COALESCE(p.email, dlm.external_email) AS email,
    COALESCE(p.full_name, dlm.external_name) AS name,
    COALESCE(c.name, dlm.external_company) AS company,
    dlm.member_role,
    (dlm.user_id IS NOT NULL) AS is_internal
  FROM distribution_list_members dlm
  LEFT JOIN users p ON dlm.user_id = p.id
  LEFT JOIN companies c ON p.company_id = c.id
  WHERE dlm.list_id = p_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expand multiple distribution lists + ad-hoc users into a unified recipient list
CREATE OR REPLACE FUNCTION expand_distribution(
  p_list_ids UUID[],
  p_additional_user_ids UUID[]
)
RETURNS TABLE (
  user_id UUID,
  email VARCHAR(255),
  name VARCHAR(200),
  source VARCHAR(50) -- 'list' or 'adhoc'
) AS $$
BEGIN
  RETURN QUERY
  -- Recipients from distribution lists
  SELECT DISTINCT
    dlm.user_id,
    COALESCE(p.email, dlm.external_email)::VARCHAR(255) AS email,
    COALESCE(p.full_name, dlm.external_name)::VARCHAR(200) AS name,
    'list'::VARCHAR(50) AS source
  FROM distribution_list_members dlm
  LEFT JOIN users p ON dlm.user_id = p.id
  WHERE dlm.list_id = ANY(p_list_ids)

  UNION

  -- Ad-hoc users
  SELECT DISTINCT
    p.id AS user_id,
    p.email::VARCHAR(255),
    p.full_name::VARCHAR(200) AS name,
    'adhoc'::VARCHAR(50) AS source
  FROM users p
  WHERE p.id = ANY(p_additional_user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE distribution_lists IS 'Reusable distribution lists for RFIs, Submittals, Transmittals, etc.';
COMMENT ON TABLE distribution_list_members IS 'Members of distribution lists (internal users or external contacts)';
COMMENT ON COLUMN distribution_lists.project_id IS 'NULL for company-wide lists, set for project-specific lists';
COMMENT ON COLUMN distribution_list_members.member_role IS 'to = primary recipient, cc = copied, bcc = blind copied';
