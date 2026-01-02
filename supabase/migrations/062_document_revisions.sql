-- Migration: 062_document_revisions.sql
-- Description: Document revision tracking for construction drawings with ASI support
-- Date: 2025-01-01

-- =============================================
-- ENHANCED DOCUMENT/DRAWING FIELDS
-- =============================================

-- Add revision tracking fields to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS revision_letter VARCHAR(5);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_current_revision BOOLEAN DEFAULT true;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS previous_revision_id UUID REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS revision_date DATE;

-- Add drawing-specific fields
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drawing_number VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sheet_number VARCHAR(20);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drawing_discipline VARCHAR(50); -- A, S, M, E, P, etc.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drawing_title VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS scale VARCHAR(50);

-- Add set/phase tracking
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_set VARCHAR(100); -- 'Issued for Construction', 'Bid Set', 'Permit Set', etc.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS received_date DATE;

-- Add ASI (Architect's Supplemental Instruction) tracking
ALTER TABLE documents ADD COLUMN IF NOT EXISTS asi_number VARCHAR(20);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS asi_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS affected_by_asi BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_drawing_number ON documents(drawing_number);
CREATE INDEX IF NOT EXISTS idx_documents_revision_number ON documents(revision_number);
CREATE INDEX IF NOT EXISTS idx_documents_previous_revision ON documents(previous_revision_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_current ON documents(is_current_revision);
CREATE INDEX IF NOT EXISTS idx_documents_document_set ON documents(document_set);
CREATE INDEX IF NOT EXISTS idx_documents_discipline ON documents(drawing_discipline);

-- =============================================
-- TABLE: document_revisions
-- History of document revisions
-- =============================================
CREATE TABLE IF NOT EXISTS document_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Revision identification
  revision_number INTEGER NOT NULL,
  revision_letter VARCHAR(5),
  revision_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Files
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  thumbnail_url TEXT,

  -- Revision details
  description TEXT,
  changes_summary TEXT,
  clouded_areas TEXT[], -- Array of area descriptions with revision clouds

  -- Related ASI
  asi_number VARCHAR(20),

  -- Status
  status VARCHAR(30) DEFAULT 'issued', -- draft, issued, superseded, void

  -- Who/When
  issued_by UUID REFERENCES users(id),
  issued_by_firm VARCHAR(255),
  received_by UUID REFERENCES users(id),
  received_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_document_revisions_document_id ON document_revisions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_revisions_revision_number ON document_revisions(revision_number);
CREATE INDEX IF NOT EXISTS idx_document_revisions_asi ON document_revisions(asi_number);

-- Enable RLS
ALTER TABLE document_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can view document revisions" ON document_revisions;
CREATE POLICY "Users can view document revisions" ON document_revisions
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert document revisions" ON document_revisions;
CREATE POLICY "Users can insert document revisions" ON document_revisions
  FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- TABLE: document_transmittals
-- Track document transmittals with cover sheets
-- =============================================
CREATE TABLE IF NOT EXISTS document_transmittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Transmittal identification
  transmittal_number VARCHAR(50) NOT NULL,

  -- Parties
  from_company VARCHAR(255),
  from_contact VARCHAR(255),
  to_company VARCHAR(255),
  to_contact VARCHAR(255),
  cc_contacts TEXT[], -- Array of CC recipients

  -- Dates
  date_sent DATE NOT NULL DEFAULT CURRENT_DATE,
  date_required DATE,

  -- Purpose
  transmitted_for VARCHAR(100), -- approval, review, information, construction, record, etc.

  -- Notes
  remarks TEXT,

  -- Status
  status VARCHAR(30) DEFAULT 'sent', -- draft, sent, acknowledged, returned
  acknowledged_date DATE,
  acknowledged_by UUID REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transmittals_project_id ON document_transmittals(project_id);
CREATE INDEX IF NOT EXISTS idx_transmittals_date_sent ON document_transmittals(date_sent);
CREATE INDEX IF NOT EXISTS idx_transmittals_status ON document_transmittals(status);

-- Enable RLS
ALTER TABLE document_transmittals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view transmittals" ON document_transmittals;
CREATE POLICY "Users can view transmittals" ON document_transmittals
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert transmittals" ON document_transmittals;
CREATE POLICY "Users can insert transmittals" ON document_transmittals
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: document_transmittal_items
-- Documents included in a transmittal
-- =============================================
CREATE TABLE IF NOT EXISTS document_transmittal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transmittal_id UUID NOT NULL REFERENCES document_transmittals(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  document_revision_id UUID REFERENCES document_revisions(id),

  -- Item details (if document not linked)
  drawing_number VARCHAR(50),
  title VARCHAR(255),
  revision VARCHAR(10),

  -- Quantity
  copies INTEGER DEFAULT 1,

  -- Notes
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_transmittal_items_transmittal_id ON document_transmittal_items(transmittal_id);
CREATE INDEX IF NOT EXISTS idx_transmittal_items_document_id ON document_transmittal_items(document_id);

-- Enable RLS
ALTER TABLE document_transmittal_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can view transmittal items" ON document_transmittal_items;
CREATE POLICY "Users can view transmittal items" ON document_transmittal_items
  FOR SELECT
  USING (
    transmittal_id IN (
      SELECT id FROM document_transmittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert transmittal items" ON document_transmittal_items;
CREATE POLICY "Users can insert transmittal items" ON document_transmittal_items
  FOR INSERT
  WITH CHECK (
    transmittal_id IN (
      SELECT id FROM document_transmittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- VIEW: drawing_register
-- Standard drawing log view
-- =============================================
CREATE OR REPLACE VIEW drawing_register AS
SELECT
  d.id,
  d.project_id,
  d.drawing_number,
  d.sheet_number,
  d.drawing_discipline,
  d.drawing_title,
  d.title AS document_title,
  d.revision_number,
  d.revision_letter,
  d.revision_date,
  d.document_set,
  d.issue_date,
  d.received_date,
  d.scale,
  d.asi_number,
  d.affected_by_asi,
  d.is_current_revision,
  -- Counts
  (SELECT COUNT(*) FROM document_revisions dr WHERE dr.document_id = d.id) AS revision_count,
  -- Previous revision
  prev.revision_letter AS previous_revision,
  prev.revision_date AS previous_revision_date,
  -- Project info
  p.name AS project_name,
  p.project_number
FROM documents d
LEFT JOIN documents prev ON d.previous_revision_id = prev.id
LEFT JOIN projects p ON d.project_id = p.id
WHERE d.deleted_at IS NULL
  AND d.drawing_number IS NOT NULL
ORDER BY d.drawing_number, d.revision_number DESC;

-- =============================================
-- FUNCTION: create_document_revision
-- Create a new revision and mark previous as superseded
-- =============================================
CREATE OR REPLACE FUNCTION create_document_revision(
  p_document_id UUID,
  p_file_url TEXT,
  p_file_name VARCHAR(255),
  p_revision_letter VARCHAR(5) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_changes_summary TEXT DEFAULT NULL,
  p_asi_number VARCHAR(20) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_current_revision INTEGER;
  v_new_revision_id UUID;
BEGIN
  -- Get current max revision number
  SELECT COALESCE(MAX(revision_number), 0) INTO v_current_revision
  FROM document_revisions WHERE document_id = p_document_id;

  -- Create new revision record
  INSERT INTO document_revisions (
    document_id,
    revision_number,
    revision_letter,
    file_url,
    file_name,
    description,
    changes_summary,
    asi_number,
    status,
    created_by
  ) VALUES (
    p_document_id,
    v_current_revision + 1,
    COALESCE(p_revision_letter, CHR(65 + v_current_revision)), -- A, B, C...
    p_file_url,
    p_file_name,
    p_description,
    p_changes_summary,
    p_asi_number,
    'issued',
    auth.uid()
  )
  RETURNING id INTO v_new_revision_id;

  -- Update the main document
  UPDATE documents
  SET
    revision_number = v_current_revision + 1,
    revision_letter = COALESCE(p_revision_letter, CHR(65 + v_current_revision)),
    revision_date = CURRENT_DATE,
    file_url = p_file_url,
    file_name = p_file_name,
    asi_number = COALESCE(p_asi_number, asi_number),
    affected_by_asi = CASE WHEN p_asi_number IS NOT NULL THEN true ELSE affected_by_asi END,
    updated_at = NOW()
  WHERE id = p_document_id;

  RETURN v_new_revision_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: get_next_transmittal_number
-- Generate next transmittal number for a project
-- =============================================
CREATE OR REPLACE FUNCTION get_next_transmittal_number(p_project_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_project_number VARCHAR(100);
  v_next_number INTEGER;
  v_date_prefix VARCHAR(10);
BEGIN
  -- Get project number
  SELECT project_number INTO v_project_number FROM projects WHERE id = p_project_id;

  -- Get next sequence
  SELECT COALESCE(MAX(
    CAST(REGEXP_REPLACE(transmittal_number, '[^0-9]', '', 'g') AS INTEGER)
  ), 0) + 1
  INTO v_next_number
  FROM document_transmittals
  WHERE project_id = p_project_id;

  -- Format: PROJECT#-T-001
  RETURN COALESCE(v_project_number, 'PROJ') || '-T-' || LPAD(v_next_number::TEXT, 3, '0');
END;
$$ LANGUAGE SQL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 062_document_revisions completed successfully';
END $$;
