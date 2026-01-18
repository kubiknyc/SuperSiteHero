-- Migration: 20260118000001_drawing_sheets.sql
-- Description: Create drawing_sheets table for individual pages extracted from PDFs
-- Date: 2026-01-18
-- Part of: AI-Powered Drawing Management System

-- =============================================
-- TABLE: drawing_sheets
-- =============================================
-- Stores individual pages extracted from multipage PDF drawing sets.
-- Each page is analyzed by AI to extract metadata from the title block.

CREATE TABLE drawing_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  source_pdf_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Page identification
  page_number INTEGER NOT NULL,
  sheet_number TEXT,  -- e.g., "A2.1", "S-101", "M-001"
  title TEXT,

  -- Classification
  discipline TEXT CHECK (discipline IN (
    'architectural', 'structural', 'mechanical', 'electrical',
    'plumbing', 'civil', 'landscape', 'fire_protection', 'other'
  )),
  scale TEXT,  -- e.g., "1/4\" = 1'-0\"", "1:100", "NTS"

  -- Revision tracking
  revision TEXT,
  revision_date DATE,

  -- AI extraction
  ai_extracted_metadata JSONB DEFAULT '{}',
  ai_confidence_score DECIMAL(3,2),
  ai_processed_at TIMESTAMPTZ,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
    'pending', 'processing', 'completed', 'failed'
  )),
  processing_error TEXT,

  -- Images
  thumbnail_url TEXT,
  full_image_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_page_per_pdf UNIQUE (source_pdf_id, page_number)
);

-- =============================================
-- INDEXES
-- =============================================

-- Primary lookup patterns
CREATE INDEX idx_drawing_sheets_project ON drawing_sheets(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drawing_sheets_company ON drawing_sheets(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drawing_sheets_source_pdf ON drawing_sheets(source_pdf_id) WHERE deleted_at IS NULL;

-- Filtering patterns
CREATE INDEX idx_drawing_sheets_discipline ON drawing_sheets(discipline) WHERE deleted_at IS NULL;
CREATE INDEX idx_drawing_sheets_sheet_number ON drawing_sheets(sheet_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_drawing_sheets_processing ON drawing_sheets(processing_status) WHERE deleted_at IS NULL;

-- Full text search on title and sheet_number
CREATE INDEX idx_drawing_sheets_search ON drawing_sheets
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(sheet_number, '')));

-- =============================================
-- TRIGGER: updated_at
-- =============================================
CREATE TRIGGER update_drawing_sheets_updated_at
  BEFORE UPDATE ON drawing_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE drawing_sheets ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view sheets in projects they have access to
CREATE POLICY "Users can view drawing sheets in their company projects"
  ON drawing_sheets FOR SELECT
  USING (
    project_id IN (
      SELECT pu.project_id FROM project_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

-- INSERT: Users can create sheets in projects they have access to
CREATE POLICY "Users can insert drawing sheets in their company projects"
  ON drawing_sheets FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT pu.project_id FROM project_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update sheets in projects they have access to
CREATE POLICY "Users can update drawing sheets in their company projects"
  ON drawing_sheets FOR UPDATE
  USING (
    project_id IN (
      SELECT pu.project_id FROM project_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete sheets in projects they have access to
CREATE POLICY "Users can delete drawing sheets in their company projects"
  ON drawing_sheets FOR DELETE
  USING (
    project_id IN (
      SELECT pu.project_id FROM project_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE drawing_sheets IS 'Individual pages extracted from multipage PDF drawing sets with AI-extracted metadata';
COMMENT ON COLUMN drawing_sheets.sheet_number IS 'Drawing sheet identifier from title block (e.g., A2.1, S-101)';
COMMENT ON COLUMN drawing_sheets.discipline IS 'Construction discipline: architectural, structural, mechanical, electrical, plumbing, civil, landscape, fire_protection, other';
COMMENT ON COLUMN drawing_sheets.ai_extracted_metadata IS 'JSON containing all metadata extracted by AI including raw values and callouts';
COMMENT ON COLUMN drawing_sheets.ai_confidence_score IS 'Overall confidence score from AI extraction (0.00-1.00)';
COMMENT ON COLUMN drawing_sheets.processing_status IS 'Current processing state: pending, processing, completed, failed';
