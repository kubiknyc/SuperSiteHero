-- =============================================
-- Migration: Drawing Register
-- Description: Track construction drawings, revisions, and distribution history
-- =============================================

-- =============================================
-- Drawings Table
-- Master record for each drawing in the project
-- =============================================

CREATE TABLE IF NOT EXISTS drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Drawing identification
  drawing_number VARCHAR(100) NOT NULL, -- e.g., A-101, S-001, M-100
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Discipline/Category
  discipline VARCHAR(50) NOT NULL, -- architectural, structural, mechanical, electrical, plumbing, civil, landscape, fire_protection, other
  subdiscipline VARCHAR(100), -- e.g., "Floor Plans", "Elevations", "Details"
  sheet_size VARCHAR(20) DEFAULT 'D', -- A, B, C, D, E, ARCH D, etc.

  -- Current revision info (denormalized for quick access)
  current_revision VARCHAR(20), -- Current revision letter/number
  current_revision_id UUID, -- FK to drawing_revisions
  current_revision_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, superseded, void, for_reference_only
  is_issued_for_construction BOOLEAN DEFAULT FALSE,
  ifc_date DATE, -- Issued for Construction date

  -- Document library link
  document_id UUID REFERENCES documents(id), -- Link to document library
  folder_id UUID REFERENCES folders(id),

  -- Spec section reference
  spec_section VARCHAR(20), -- CSI spec section, e.g., "03 30 00"

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_drawing_number_per_project UNIQUE (project_id, drawing_number)
);

-- =============================================
-- Drawing Revisions Table
-- Track all revisions of each drawing
-- =============================================

CREATE TABLE IF NOT EXISTS drawing_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,

  -- Revision identification
  revision VARCHAR(20) NOT NULL, -- A, B, C or 1, 2, 3 or ASI-1, etc.
  revision_date DATE NOT NULL,
  revision_description TEXT, -- What changed in this revision

  -- Source of revision
  revision_type VARCHAR(50) DEFAULT 'standard', -- standard, asi (Architect's Supplemental Instruction), bulletin, addendum, rfi_response
  source_reference VARCHAR(100), -- ASI number, RFI number, Bulletin number

  -- File information
  file_path TEXT,
  file_url TEXT,
  file_name VARCHAR(500),
  file_size INTEGER,
  thumbnail_url TEXT,

  -- Status
  is_current BOOLEAN DEFAULT FALSE,
  is_superseded BOOLEAN DEFAULT FALSE,
  superseded_date DATE,
  superseded_by UUID REFERENCES drawing_revisions(id),

  -- Approval/Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  -- Distribution tracking
  first_issued_date DATE,
  first_issued_via VARCHAR(100), -- transmittal number

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  notes TEXT,

  -- Constraints
  CONSTRAINT unique_revision_per_drawing UNIQUE (drawing_id, revision)
);

-- Add FK constraint after table creation
ALTER TABLE drawings
  DROP CONSTRAINT IF EXISTS drawings_current_revision_id_fkey;
ALTER TABLE drawings
  ADD CONSTRAINT drawings_current_revision_id_fkey
  FOREIGN KEY (current_revision_id) REFERENCES drawing_revisions(id);

-- =============================================
-- Drawing Sets Table
-- Group drawings into sets (e.g., "IFC Set", "100% CD", "Permit Set")
-- =============================================

CREATE TABLE IF NOT EXISTS drawing_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Set identification
  name VARCHAR(200) NOT NULL, -- e.g., "100% Construction Documents", "Permit Set"
  set_number VARCHAR(50), -- Optional set number
  description TEXT,

  -- Set date
  set_date DATE NOT NULL,
  issue_purpose VARCHAR(100), -- For Construction, For Permit, For Bid, For Review

  -- Status
  is_current BOOLEAN DEFAULT FALSE, -- Is this the current working set?
  status VARCHAR(50) DEFAULT 'draft', -- draft, issued, superseded

  -- Transmittal link
  transmittal_id UUID REFERENCES transmittals(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_set_name_per_project UNIQUE (project_id, name)
);

-- =============================================
-- Drawing Set Items Table
-- Links specific drawing revisions to a set
-- =============================================

CREATE TABLE IF NOT EXISTS drawing_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_set_id UUID NOT NULL REFERENCES drawing_sets(id) ON DELETE CASCADE,
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES drawing_revisions(id) ON DELETE CASCADE,

  -- Order within set
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_drawing_per_set UNIQUE (drawing_set_id, drawing_id)
);

-- =============================================
-- Drawing Transmittal History
-- Track when drawings were distributed
-- =============================================

CREATE TABLE IF NOT EXISTS drawing_transmittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES drawing_revisions(id) ON DELETE CASCADE,

  -- Transmittal reference
  transmittal_id UUID REFERENCES transmittals(id),
  transmittal_number VARCHAR(100),
  transmittal_date DATE NOT NULL,

  -- Recipient info
  recipient_company VARCHAR(200),
  recipient_name VARCHAR(200),
  recipient_email VARCHAR(255),

  -- Copies
  copies_sent INTEGER DEFAULT 1,
  format VARCHAR(50), -- pdf, dwg, paper, both

  -- Acknowledgment
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(200),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  notes TEXT
);

-- =============================================
-- Drawing Markups/Comments Table
-- Track markups and review comments on drawings
-- =============================================

CREATE TABLE IF NOT EXISTS drawing_markups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES drawing_revisions(id) ON DELETE CASCADE,

  -- Markup identification
  markup_number INTEGER, -- Auto-incremented per drawing

  -- Location on drawing
  page_number INTEGER DEFAULT 1,
  x_position DECIMAL(10, 4),
  y_position DECIMAL(10, 4),
  width DECIMAL(10, 4),
  height DECIMAL(10, 4),

  -- Markup content
  markup_type VARCHAR(50) NOT NULL, -- comment, cloud, arrow, dimension, text, highlight, redline
  content TEXT,
  color VARCHAR(20) DEFAULT '#FF0000',

  -- Markup data (for complex shapes)
  markup_data JSONB, -- Store points, paths, etc.

  -- Status
  status VARCHAR(50) DEFAULT 'open', -- open, resolved, void
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,

  -- Related items
  related_rfi_id UUID, -- FK to rfis if exists
  related_submittal_id UUID, -- FK to submittals

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Drawings indexes
CREATE INDEX IF NOT EXISTS idx_drawings_company ON drawings(company_id);
CREATE INDEX IF NOT EXISTS idx_drawings_project ON drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_drawings_number ON drawings(drawing_number);
CREATE INDEX IF NOT EXISTS idx_drawings_discipline ON drawings(discipline);
CREATE INDEX IF NOT EXISTS idx_drawings_status ON drawings(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_drawings_ifc ON drawings(project_id) WHERE is_issued_for_construction = TRUE;
CREATE INDEX IF NOT EXISTS idx_drawings_not_deleted ON drawings(project_id) WHERE deleted_at IS NULL;

-- Drawing revisions indexes
CREATE INDEX IF NOT EXISTS idx_drawing_revisions_drawing ON drawing_revisions(drawing_id);
CREATE INDEX IF NOT EXISTS idx_drawing_revisions_current ON drawing_revisions(drawing_id) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_drawing_revisions_date ON drawing_revisions(revision_date);

-- Drawing sets indexes
CREATE INDEX IF NOT EXISTS idx_drawing_sets_project ON drawing_sets(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sets_current ON drawing_sets(project_id) WHERE is_current = TRUE;

-- Drawing set items indexes
CREATE INDEX IF NOT EXISTS idx_drawing_set_items_set ON drawing_set_items(drawing_set_id);
CREATE INDEX IF NOT EXISTS idx_drawing_set_items_drawing ON drawing_set_items(drawing_id);

-- Drawing transmittals indexes
CREATE INDEX IF NOT EXISTS idx_drawing_transmittals_drawing ON drawing_transmittals(drawing_id);
CREATE INDEX IF NOT EXISTS idx_drawing_transmittals_revision ON drawing_transmittals(revision_id);
CREATE INDEX IF NOT EXISTS idx_drawing_transmittals_transmittal ON drawing_transmittals(transmittal_id);

-- Drawing markups indexes
CREATE INDEX IF NOT EXISTS idx_drawing_markups_drawing ON drawing_markups(drawing_id);
CREATE INDEX IF NOT EXISTS idx_drawing_markups_revision ON drawing_markups(revision_id);
CREATE INDEX IF NOT EXISTS idx_drawing_markups_open ON drawing_markups(drawing_id) WHERE status = 'open';

-- =============================================
-- Triggers
-- =============================================

-- Auto-update updated_at for drawings
CREATE OR REPLACE FUNCTION update_drawings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_drawings_updated ON drawings;
CREATE TRIGGER trg_drawings_updated
  BEFORE UPDATE ON drawings
  FOR EACH ROW
  EXECUTE FUNCTION update_drawings_timestamp();

-- Auto-update drawing current revision when a new revision is added
CREATE OR REPLACE FUNCTION update_drawing_current_revision()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    -- Mark previous revisions as not current
    UPDATE drawing_revisions
    SET is_current = FALSE, is_superseded = TRUE, superseded_date = NEW.revision_date
    WHERE drawing_id = NEW.drawing_id
      AND id != NEW.id
      AND is_current = TRUE;

    -- Update the drawing's current revision info
    UPDATE drawings
    SET current_revision = NEW.revision,
        current_revision_id = NEW.id,
        current_revision_date = NEW.revision_date,
        updated_at = NOW()
    WHERE id = NEW.drawing_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_drawing_revision_current ON drawing_revisions;
CREATE TRIGGER trg_drawing_revision_current
  AFTER INSERT OR UPDATE OF is_current ON drawing_revisions
  FOR EACH ROW
  WHEN (NEW.is_current = TRUE)
  EXECUTE FUNCTION update_drawing_current_revision();

-- Auto-number markups per drawing
CREATE OR REPLACE FUNCTION set_markup_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.markup_number IS NULL THEN
    SELECT COALESCE(MAX(markup_number), 0) + 1
    INTO NEW.markup_number
    FROM drawing_markups
    WHERE drawing_id = NEW.drawing_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_markup_number ON drawing_markups;
CREATE TRIGGER trg_markup_number
  BEFORE INSERT ON drawing_markups
  FOR EACH ROW
  EXECUTE FUNCTION set_markup_number();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_set_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_transmittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_markups ENABLE ROW LEVEL SECURITY;

-- Drawings: Users can see drawings for their projects
CREATE POLICY drawings_select ON drawings
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Drawings: Users can create drawings for their projects
CREATE POLICY drawings_insert ON drawings
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Drawings: Users can update drawings for their projects
CREATE POLICY drawings_update ON drawings
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Drawings: Only admins can delete drawings
CREATE POLICY drawings_delete ON drawings
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner', 'project_manager')
    )
  );

-- Drawing Revisions: Same access as parent drawing
CREATE POLICY drawing_revisions_select ON drawing_revisions
  FOR SELECT USING (
    drawing_id IN (
      SELECT id FROM drawings WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY drawing_revisions_insert ON drawing_revisions
  FOR INSERT WITH CHECK (
    drawing_id IN (
      SELECT id FROM drawings WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY drawing_revisions_update ON drawing_revisions
  FOR UPDATE USING (
    drawing_id IN (
      SELECT id FROM drawings WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Drawing Sets: Project users can view
CREATE POLICY drawing_sets_select ON drawing_sets
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY drawing_sets_insert ON drawing_sets
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY drawing_sets_update ON drawing_sets
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Drawing Set Items: Same as parent set
CREATE POLICY drawing_set_items_select ON drawing_set_items
  FOR SELECT USING (
    drawing_set_id IN (
      SELECT id FROM drawing_sets WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY drawing_set_items_insert ON drawing_set_items
  FOR INSERT WITH CHECK (
    drawing_set_id IN (
      SELECT id FROM drawing_sets WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY drawing_set_items_delete ON drawing_set_items
  FOR DELETE USING (
    drawing_set_id IN (
      SELECT id FROM drawing_sets WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Drawing Transmittals: Project users can view
CREATE POLICY drawing_transmittals_select ON drawing_transmittals
  FOR SELECT USING (
    drawing_id IN (
      SELECT id FROM drawings WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY drawing_transmittals_insert ON drawing_transmittals
  FOR INSERT WITH CHECK (
    drawing_id IN (
      SELECT id FROM drawings WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- Drawing Markups: Project users can view and create
CREATE POLICY drawing_markups_select ON drawing_markups
  FOR SELECT USING (
    drawing_id IN (
      SELECT id FROM drawings WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY drawing_markups_insert ON drawing_markups
  FOR INSERT WITH CHECK (
    drawing_id IN (
      SELECT id FROM drawings WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY drawing_markups_update ON drawing_markups
  FOR UPDATE USING (
    created_by = auth.uid()
    OR drawing_id IN (
      SELECT id FROM drawings WHERE project_id IN (
        SELECT project_id FROM project_users pu
        JOIN users u ON pu.user_id = u.id
        WHERE pu.user_id = auth.uid()
          AND u.role IN ('admin', 'owner', 'project_manager')
      )
    )
  );

-- =============================================
-- Helper Functions
-- =============================================

-- Get latest revision for a drawing
CREATE OR REPLACE FUNCTION get_latest_drawing_revision(p_drawing_id UUID)
RETURNS drawing_revisions AS $$
  SELECT * FROM drawing_revisions
  WHERE drawing_id = p_drawing_id
    AND is_current = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get all drawings with their current revision
CREATE OR REPLACE FUNCTION get_project_drawing_register(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  drawing_number VARCHAR(100),
  title VARCHAR(500),
  discipline VARCHAR(50),
  current_revision VARCHAR(20),
  current_revision_date DATE,
  status VARCHAR(50),
  is_issued_for_construction BOOLEAN,
  revision_count BIGINT,
  last_transmittal_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.drawing_number,
    d.title,
    d.discipline,
    d.current_revision,
    d.current_revision_date,
    d.status,
    d.is_issued_for_construction,
    (SELECT COUNT(*) FROM drawing_revisions WHERE drawing_id = d.id) as revision_count,
    (SELECT MAX(transmittal_date) FROM drawing_transmittals WHERE drawing_id = d.id) as last_transmittal_date
  FROM drawings d
  WHERE d.project_id = p_project_id
    AND d.deleted_at IS NULL
  ORDER BY d.discipline, d.drawing_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get revision history for a drawing
CREATE OR REPLACE FUNCTION get_drawing_revision_history(p_drawing_id UUID)
RETURNS TABLE (
  revision VARCHAR(20),
  revision_date DATE,
  revision_description TEXT,
  revision_type VARCHAR(50),
  is_current BOOLEAN,
  is_superseded BOOLEAN,
  file_url TEXT,
  created_by_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dr.revision,
    dr.revision_date,
    dr.revision_description,
    dr.revision_type,
    dr.is_current,
    dr.is_superseded,
    dr.file_url,
    u.full_name as created_by_name
  FROM drawing_revisions dr
  LEFT JOIN users u ON dr.created_by = u.id
  WHERE dr.drawing_id = p_drawing_id
  ORDER BY dr.revision_date DESC, dr.revision DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get drawings by discipline summary
CREATE OR REPLACE FUNCTION get_drawings_by_discipline(p_project_id UUID)
RETURNS TABLE (
  discipline VARCHAR(50),
  total_drawings BIGINT,
  ifc_drawings BIGINT,
  latest_revision_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.discipline,
    COUNT(*) as total_drawings,
    COUNT(*) FILTER (WHERE d.is_issued_for_construction = TRUE) as ifc_drawings,
    MAX(d.current_revision_date) as latest_revision_date
  FROM drawings d
  WHERE d.project_id = p_project_id
    AND d.deleted_at IS NULL
  GROUP BY d.discipline
  ORDER BY d.discipline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Views
-- =============================================

-- Active drawings view with current revision
CREATE OR REPLACE VIEW active_drawings AS
SELECT
  d.*,
  dr.file_url as current_file_url,
  dr.thumbnail_url as current_thumbnail_url,
  dr.revision_description as current_revision_description,
  p.name as project_name,
  c.name as company_name
FROM drawings d
LEFT JOIN drawing_revisions dr ON d.current_revision_id = dr.id
JOIN projects p ON d.project_id = p.id
JOIN companies c ON d.company_id = c.id
WHERE d.deleted_at IS NULL
  AND d.status = 'active';

COMMENT ON VIEW active_drawings IS 'Active drawings with their current revision details';

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE drawings IS 'Master record for construction drawings in a project';
COMMENT ON TABLE drawing_revisions IS 'Revision history for each drawing';
COMMENT ON TABLE drawing_sets IS 'Named sets of drawings (e.g., IFC Set, Permit Set)';
COMMENT ON TABLE drawing_set_items IS 'Links specific drawing revisions to a set';
COMMENT ON TABLE drawing_transmittals IS 'History of when drawings were distributed';
COMMENT ON TABLE drawing_markups IS 'Markups and review comments on drawings';
COMMENT ON COLUMN drawings.discipline IS 'Drawing discipline: architectural, structural, mechanical, electrical, plumbing, civil, landscape, fire_protection, other';
COMMENT ON COLUMN drawings.is_issued_for_construction IS 'Whether this drawing has been issued for construction';
COMMENT ON COLUMN drawing_revisions.revision_type IS 'Type of revision: standard, asi, bulletin, addendum, rfi_response';
COMMENT ON COLUMN drawing_sets.issue_purpose IS 'Purpose of the set: For Construction, For Permit, For Bid, For Review';
