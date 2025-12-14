-- Migration: 113_drawing_packages.sql
-- Description: Add Drawing Set Packaging feature for organizing and distributing drawing packages
-- Supports bid packages, submittal packages, construction packages, and as-built packages

-- ============================================================================
-- Drawing Package Types
-- ============================================================================

CREATE TYPE drawing_package_type AS ENUM (
  'bid',           -- For contractors bidding on work
  'submittal',     -- For review by engineers/architects
  'construction',  -- For field teams during construction
  'as_built'       -- For project closeout
);

CREATE TYPE drawing_package_status AS ENUM (
  'draft',         -- Being assembled
  'pending_review',-- Awaiting approval before distribution
  'approved',      -- Approved for distribution
  'distributed',   -- Sent to recipients
  'superseded',    -- Replaced by newer version
  'archived'       -- No longer active
);

-- ============================================================================
-- Drawing Packages Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS drawing_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Package identification
  package_number VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  package_type drawing_package_type NOT NULL DEFAULT 'construction',

  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  supersedes_package_id UUID REFERENCES drawing_packages(id),

  -- Status tracking
  status drawing_package_status NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Cover sheet information
  cover_sheet_title VARCHAR(200),
  cover_sheet_subtitle VARCHAR(200),
  cover_sheet_logo_url TEXT,
  cover_sheet_notes TEXT,
  include_cover_sheet BOOLEAN NOT NULL DEFAULT true,
  include_toc BOOLEAN NOT NULL DEFAULT true,
  include_revision_history BOOLEAN NOT NULL DEFAULT true,

  -- Distribution settings
  require_acknowledgment BOOLEAN NOT NULL DEFAULT false,
  acknowledgment_deadline TIMESTAMPTZ,
  allow_download BOOLEAN NOT NULL DEFAULT true,
  download_expires_at TIMESTAMPTZ,
  access_password VARCHAR(100), -- Optional password protection

  -- Generated files
  merged_pdf_url TEXT,
  merged_pdf_generated_at TIMESTAMPTZ,
  cover_sheet_pdf_url TEXT,
  toc_pdf_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,

  -- Unique package number per project
  CONSTRAINT unique_package_number_per_project UNIQUE (project_id, package_number)
);

-- Indexes for efficient queries
CREATE INDEX idx_drawing_packages_project ON drawing_packages(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drawing_packages_company ON drawing_packages(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drawing_packages_type ON drawing_packages(package_type);
CREATE INDEX idx_drawing_packages_status ON drawing_packages(status);
CREATE INDEX idx_drawing_packages_created ON drawing_packages(created_at DESC);

-- ============================================================================
-- Drawing Package Items Table - Links drawings to packages
-- ============================================================================

CREATE TABLE IF NOT EXISTS drawing_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES drawing_packages(id) ON DELETE CASCADE,
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES drawing_revisions(id),

  -- Ordering and organization
  sort_order INTEGER NOT NULL DEFAULT 0,
  section_name VARCHAR(100), -- Optional section grouping (e.g., "Architectural", "Structural")

  -- Override display info
  display_number VARCHAR(50), -- Can override drawing number for this package
  display_title VARCHAR(200), -- Can override title for this package

  -- Inclusion status
  is_included BOOLEAN NOT NULL DEFAULT true, -- Can temporarily exclude without removing
  notes TEXT,

  -- Metadata
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES user_profiles(id),

  -- Unique drawing per package
  CONSTRAINT unique_drawing_per_package UNIQUE (package_id, drawing_id)
);

-- Indexes
CREATE INDEX idx_package_items_package ON drawing_package_items(package_id);
CREATE INDEX idx_package_items_drawing ON drawing_package_items(drawing_id);
CREATE INDEX idx_package_items_sort ON drawing_package_items(package_id, sort_order);

-- ============================================================================
-- Package Distribution Recipients Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS drawing_package_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES drawing_packages(id) ON DELETE CASCADE,

  -- Recipient information
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(100),
  recipient_company VARCHAR(200),
  recipient_role VARCHAR(100), -- e.g., "Contractor", "Architect", "Engineer"

  -- Distribution tracking
  distribution_method VARCHAR(50) NOT NULL DEFAULT 'email', -- email, link, download
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES user_profiles(id),

  -- Access tracking
  access_token VARCHAR(100) UNIQUE,
  access_token_expires_at TIMESTAMPTZ,
  first_accessed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,

  -- Download tracking
  downloaded_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,

  -- Acknowledgment
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_notes TEXT,
  acknowledgment_ip VARCHAR(50),

  -- Notification preferences
  send_reminder BOOLEAN NOT NULL DEFAULT true,
  reminder_sent_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique recipient per package
  CONSTRAINT unique_recipient_per_package UNIQUE (package_id, recipient_email)
);

-- Indexes
CREATE INDEX idx_package_recipients_package ON drawing_package_recipients(package_id);
CREATE INDEX idx_package_recipients_email ON drawing_package_recipients(recipient_email);
CREATE INDEX idx_package_recipients_token ON drawing_package_recipients(access_token) WHERE access_token IS NOT NULL;

-- ============================================================================
-- Package Activity Log - Track all package-related events
-- ============================================================================

CREATE TABLE IF NOT EXISTS drawing_package_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES drawing_packages(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES drawing_package_recipients(id) ON DELETE SET NULL,

  -- Activity details
  activity_type VARCHAR(50) NOT NULL, -- created, updated, approved, distributed, accessed, downloaded, acknowledged
  activity_description TEXT,
  activity_metadata JSONB DEFAULT '{}',

  -- Actor information
  performed_by UUID REFERENCES user_profiles(id),
  performed_by_email VARCHAR(255),
  performed_by_ip VARCHAR(50),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_package_activity_package ON drawing_package_activity(package_id);
CREATE INDEX idx_package_activity_type ON drawing_package_activity(activity_type);
CREATE INDEX idx_package_activity_created ON drawing_package_activity(created_at DESC);

-- ============================================================================
-- Function: Generate unique package number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_package_number(
  p_project_id UUID,
  p_package_type drawing_package_type
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_count INTEGER;
  v_number VARCHAR(50);
BEGIN
  -- Set prefix based on package type
  v_prefix := CASE p_package_type
    WHEN 'bid' THEN 'BID'
    WHEN 'submittal' THEN 'SUB'
    WHEN 'construction' THEN 'CON'
    WHEN 'as_built' THEN 'ABP'
  END;

  -- Count existing packages of this type for project
  SELECT COUNT(*) + 1 INTO v_count
  FROM drawing_packages
  WHERE project_id = p_project_id
    AND package_type = p_package_type;

  -- Generate number
  v_number := v_prefix || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_number;
END;
$$;

-- ============================================================================
-- Function: Log package activity
-- ============================================================================

CREATE OR REPLACE FUNCTION log_package_activity(
  p_package_id UUID,
  p_activity_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_performed_by UUID DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO drawing_package_activity (
    package_id,
    recipient_id,
    activity_type,
    activity_description,
    activity_metadata,
    performed_by
  ) VALUES (
    p_package_id,
    p_recipient_id,
    p_activity_type,
    p_description,
    p_metadata,
    p_performed_by
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- ============================================================================
-- Function: Get package summary statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_package_statistics(p_package_id UUID)
RETURNS TABLE (
  total_drawings INTEGER,
  included_drawings INTEGER,
  total_recipients INTEGER,
  sent_count INTEGER,
  accessed_count INTEGER,
  downloaded_count INTEGER,
  acknowledged_count INTEGER,
  pending_acknowledgments INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM drawing_package_items WHERE package_id = p_package_id) AS total_drawings,
    (SELECT COUNT(*)::INTEGER FROM drawing_package_items WHERE package_id = p_package_id AND is_included = true) AS included_drawings,
    (SELECT COUNT(*)::INTEGER FROM drawing_package_recipients WHERE package_id = p_package_id) AS total_recipients,
    (SELECT COUNT(*)::INTEGER FROM drawing_package_recipients WHERE package_id = p_package_id AND sent_at IS NOT NULL) AS sent_count,
    (SELECT COUNT(*)::INTEGER FROM drawing_package_recipients WHERE package_id = p_package_id AND first_accessed_at IS NOT NULL) AS accessed_count,
    (SELECT COUNT(*)::INTEGER FROM drawing_package_recipients WHERE package_id = p_package_id AND downloaded_at IS NOT NULL) AS downloaded_count,
    (SELECT COUNT(*)::INTEGER FROM drawing_package_recipients WHERE package_id = p_package_id AND acknowledged_at IS NOT NULL) AS acknowledged_count,
    (SELECT COUNT(*)::INTEGER FROM drawing_package_recipients r
     JOIN drawing_packages p ON r.package_id = p.id
     WHERE r.package_id = p_package_id
       AND r.sent_at IS NOT NULL
       AND r.acknowledged_at IS NULL
       AND p.require_acknowledgment = true) AS pending_acknowledgments;
END;
$$;

-- ============================================================================
-- Trigger: Update timestamp on package update
-- ============================================================================

CREATE OR REPLACE FUNCTION update_drawing_package_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_drawing_package_timestamp
  BEFORE UPDATE ON drawing_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_drawing_package_timestamp();

-- ============================================================================
-- Trigger: Log package status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_package_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_package_activity(
      NEW.id,
      'status_changed',
      'Package status changed from ' || OLD.status::TEXT || ' to ' || NEW.status::TEXT,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_package_status_change
  AFTER UPDATE ON drawing_packages
  FOR EACH ROW
  EXECUTE FUNCTION log_package_status_change();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE drawing_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_package_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_package_activity ENABLE ROW LEVEL SECURITY;

-- Packages: Company members can view and manage
CREATE POLICY drawing_packages_select_policy ON drawing_packages
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY drawing_packages_insert_policy ON drawing_packages
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY drawing_packages_update_policy ON drawing_packages
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY drawing_packages_delete_policy ON drawing_packages
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Package items: Based on package access
CREATE POLICY package_items_select_policy ON drawing_package_items
  FOR SELECT USING (
    package_id IN (
      SELECT id FROM drawing_packages
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY package_items_insert_policy ON drawing_package_items
  FOR INSERT WITH CHECK (
    package_id IN (
      SELECT id FROM drawing_packages
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY package_items_update_policy ON drawing_package_items
  FOR UPDATE USING (
    package_id IN (
      SELECT id FROM drawing_packages
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY package_items_delete_policy ON drawing_package_items
  FOR DELETE USING (
    package_id IN (
      SELECT id FROM drawing_packages
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Recipients: Based on package access
CREATE POLICY package_recipients_select_policy ON drawing_package_recipients
  FOR SELECT USING (
    package_id IN (
      SELECT id FROM drawing_packages
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY package_recipients_insert_policy ON drawing_package_recipients
  FOR INSERT WITH CHECK (
    package_id IN (
      SELECT id FROM drawing_packages
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY package_recipients_update_policy ON drawing_package_recipients
  FOR UPDATE USING (
    package_id IN (
      SELECT id FROM drawing_packages
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY package_recipients_delete_policy ON drawing_package_recipients
  FOR DELETE USING (
    package_id IN (
      SELECT id FROM drawing_packages
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Activity: Based on package access
CREATE POLICY package_activity_select_policy ON drawing_package_activity
  FOR SELECT USING (
    package_id IN (
      SELECT id FROM drawing_packages
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY package_activity_insert_policy ON drawing_package_activity
  FOR INSERT WITH CHECK (
    package_id IN (
      SELECT id FROM drawing_packages
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE drawing_packages IS 'Drawing packages for organizing and distributing sets of drawings';
COMMENT ON TABLE drawing_package_items IS 'Individual drawings included in a package';
COMMENT ON TABLE drawing_package_recipients IS 'Recipients who will receive or have received a package';
COMMENT ON TABLE drawing_package_activity IS 'Activity log for package events';
COMMENT ON FUNCTION generate_package_number IS 'Generates unique package numbers based on type prefix';
COMMENT ON FUNCTION get_package_statistics IS 'Returns summary statistics for a package';
