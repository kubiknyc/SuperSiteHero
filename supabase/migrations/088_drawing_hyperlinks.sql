-- Migration: 088_drawing_hyperlinks.sql
-- Description: Drawing hyperlinks (hotspots) for linking between drawings
-- Date: 2025-01-02

-- =============================================
-- TABLE: drawing_hyperlinks
-- Clickable hotspots that link between drawings
-- =============================================
CREATE TABLE IF NOT EXISTS drawing_hyperlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Source document (where the hotspot is placed)
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Target document (where it links to)
  target_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  target_drawing_number VARCHAR(50), -- Alternative: reference by drawing number
  target_detail_number VARCHAR(50), -- Specific detail reference (e.g., "3/A-501")

  -- Hotspot position (relative to document, 0-1 range)
  x_position DECIMAL(10, 6) NOT NULL, -- 0 = left, 1 = right
  y_position DECIMAL(10, 6) NOT NULL, -- 0 = top, 1 = bottom
  width DECIMAL(10, 6) DEFAULT 0.05, -- Hotspot width (relative)
  height DECIMAL(10, 6) DEFAULT 0.05, -- Hotspot height (relative)

  -- Hotspot type
  hotspot_type VARCHAR(30) DEFAULT 'detail', -- detail, section, elevation, plan, schedule, note
  shape VARCHAR(20) DEFAULT 'rectangle', -- rectangle, circle, polygon

  -- Display settings
  label VARCHAR(100), -- Display text
  tooltip TEXT, -- Hover text
  icon VARCHAR(50), -- Icon to show
  color VARCHAR(20) DEFAULT '#3b82f6', -- Hotspot color
  show_indicator BOOLEAN DEFAULT true, -- Show visual indicator

  -- Bidirectional linking
  is_bidirectional BOOLEAN DEFAULT false,
  reverse_link_id UUID REFERENCES drawing_hyperlinks(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false, -- Has the link been verified
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawing_hyperlinks_project_id ON drawing_hyperlinks(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_hyperlinks_source_doc ON drawing_hyperlinks(source_document_id);
CREATE INDEX IF NOT EXISTS idx_drawing_hyperlinks_target_doc ON drawing_hyperlinks(target_document_id);
CREATE INDEX IF NOT EXISTS idx_drawing_hyperlinks_is_active ON drawing_hyperlinks(is_active);

-- Enable RLS
ALTER TABLE drawing_hyperlinks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view hyperlinks" ON drawing_hyperlinks;
CREATE POLICY "Users can view hyperlinks" ON drawing_hyperlinks
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage hyperlinks" ON drawing_hyperlinks;
CREATE POLICY "Users can manage hyperlinks" ON drawing_hyperlinks
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: markup_conflicts
-- Track conflicts for offline markup sync
-- =============================================
CREATE TABLE IF NOT EXISTS markup_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Conflict identification
  local_markup_id VARCHAR(100), -- Local markup identifier
  server_markup_id UUID, -- Server markup ID

  -- Conflict data
  local_data JSONB NOT NULL, -- Local version of the markup
  server_data JSONB NOT NULL, -- Server version of the markup
  merged_data JSONB, -- Attempted merge result

  -- Conflict details
  conflict_type VARCHAR(30) NOT NULL, -- position, content, deleted, permission
  overlap_percentage DECIMAL(5, 2), -- For position conflicts
  conflict_areas TEXT[], -- Descriptions of conflicting areas

  -- Resolution
  status VARCHAR(20) DEFAULT 'pending', -- pending, resolved, discarded
  resolution VARCHAR(20), -- local, server, merged, manual
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,

  -- Users involved
  local_user_id UUID REFERENCES users(id),
  server_user_id UUID REFERENCES users(id),
  local_timestamp TIMESTAMPTZ,
  server_timestamp TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markup_conflicts_project_id ON markup_conflicts(project_id);
CREATE INDEX IF NOT EXISTS idx_markup_conflicts_document_id ON markup_conflicts(document_id);
CREATE INDEX IF NOT EXISTS idx_markup_conflicts_status ON markup_conflicts(status);

-- Enable RLS
ALTER TABLE markup_conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view markup conflicts" ON markup_conflicts;
CREATE POLICY "Users can view markup conflicts" ON markup_conflicts
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage markup conflicts" ON markup_conflicts;
CREATE POLICY "Users can manage markup conflicts" ON markup_conflicts
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: document_ocr_data
-- Store OCR results for full-text search
-- =============================================
CREATE TABLE IF NOT EXISTS document_ocr_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  revision_id UUID REFERENCES document_revisions(id) ON DELETE SET NULL,

  -- OCR processing status
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  processed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  error_message TEXT,

  -- OCR results
  full_text TEXT, -- Complete extracted text
  text_blocks JSONB, -- Array of text blocks with positions
  -- Each block: { text, x, y, width, height, confidence, page }

  -- Search optimization
  search_vector TSVECTOR, -- For PostgreSQL full-text search

  -- Page-specific data
  page_count INTEGER,
  pages_data JSONB, -- Per-page OCR data

  -- Quality metrics
  average_confidence DECIMAL(5, 2),
  word_count INTEGER,
  language VARCHAR(10) DEFAULT 'en',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_ocr_document_id ON document_ocr_data(document_id);
CREATE INDEX IF NOT EXISTS idx_document_ocr_status ON document_ocr_data(status);
CREATE INDEX IF NOT EXISTS idx_document_ocr_search_vector ON document_ocr_data USING GIN(search_vector);

-- Enable RLS
ALTER TABLE document_ocr_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view OCR data" ON document_ocr_data;
CREATE POLICY "Users can view OCR data" ON document_ocr_data
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

DROP POLICY IF EXISTS "Users can manage OCR data" ON document_ocr_data;
CREATE POLICY "Users can manage OCR data" ON document_ocr_data
  FOR ALL
  USING (
    document_id IN (
      SELECT id FROM documents WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- FUNCTION: create_bidirectional_link
-- Create a hyperlink and its reverse
-- =============================================
CREATE OR REPLACE FUNCTION create_bidirectional_link(
  p_project_id UUID,
  p_company_id UUID,
  p_source_document_id UUID,
  p_target_document_id UUID,
  p_source_x DECIMAL(10, 6),
  p_source_y DECIMAL(10, 6),
  p_target_x DECIMAL(10, 6),
  p_target_y DECIMAL(10, 6),
  p_label VARCHAR(100) DEFAULT NULL,
  p_hotspot_type VARCHAR(30) DEFAULT 'detail'
)
RETURNS TABLE (forward_link_id UUID, reverse_link_id UUID) AS $$
DECLARE
  v_forward_id UUID;
  v_reverse_id UUID;
BEGIN
  -- Create forward link
  INSERT INTO drawing_hyperlinks (
    project_id, company_id, source_document_id, target_document_id,
    x_position, y_position, label, hotspot_type, is_bidirectional
  )
  VALUES (
    p_project_id, p_company_id, p_source_document_id, p_target_document_id,
    p_source_x, p_source_y, p_label, p_hotspot_type, true
  )
  RETURNING id INTO v_forward_id;

  -- Create reverse link
  INSERT INTO drawing_hyperlinks (
    project_id, company_id, source_document_id, target_document_id,
    x_position, y_position, label, hotspot_type, is_bidirectional, reverse_link_id
  )
  VALUES (
    p_project_id, p_company_id, p_target_document_id, p_source_document_id,
    p_target_x, p_target_y, CONCAT('Back to ', p_label), p_hotspot_type, true, v_forward_id
  )
  RETURNING id INTO v_reverse_id;

  -- Update forward link with reverse reference
  UPDATE drawing_hyperlinks SET reverse_link_id = v_reverse_id WHERE id = v_forward_id;

  RETURN QUERY SELECT v_forward_id, v_reverse_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: search_drawings_text
-- Full-text search across drawing OCR data
-- =============================================
CREATE OR REPLACE FUNCTION search_drawings_text(
  p_project_id UUID,
  p_search_query TEXT,
  p_discipline VARCHAR(10) DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  document_id UUID,
  drawing_number VARCHAR(50),
  drawing_title VARCHAR(255),
  discipline VARCHAR(10),
  match_snippet TEXT,
  rank REAL,
  text_blocks JSONB
) AS $$
DECLARE
  v_query TSQUERY;
BEGIN
  -- Create search query
  v_query := plainto_tsquery('english', p_search_query);

  RETURN QUERY
  SELECT
    d.id AS document_id,
    d.drawing_number,
    d.drawing_title,
    d.drawing_discipline AS discipline,
    ts_headline('english', ocr.full_text, v_query, 'MaxWords=50, MinWords=10') AS match_snippet,
    ts_rank(ocr.search_vector, v_query) AS rank,
    -- Return matching text blocks with positions
    (
      SELECT jsonb_agg(block)
      FROM jsonb_array_elements(ocr.text_blocks) AS block
      WHERE block->>'text' ILIKE '%' || p_search_query || '%'
    ) AS text_blocks
  FROM document_ocr_data ocr
  JOIN documents d ON ocr.document_id = d.id
  WHERE d.project_id = p_project_id
    AND ocr.status = 'completed'
    AND ocr.search_vector @@ v_query
    AND d.is_current_revision = true
    AND d.deleted_at IS NULL
    AND (p_discipline IS NULL OR d.drawing_discipline = p_discipline)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER: Update search vector on OCR completion
-- =============================================
CREATE OR REPLACE FUNCTION update_ocr_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_text IS NOT NULL THEN
    NEW.search_vector := to_tsvector('english', NEW.full_text);
    NEW.word_count := array_length(regexp_split_to_array(NEW.full_text, '\s+'), 1);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ocr_search_vector_trigger ON document_ocr_data;
CREATE TRIGGER ocr_search_vector_trigger
  BEFORE INSERT OR UPDATE OF full_text ON document_ocr_data
  FOR EACH ROW
  EXECUTE FUNCTION update_ocr_search_vector();

-- =============================================
-- VIEW: hyperlinks_with_details
-- Hyperlinks with source and target document info
-- =============================================
CREATE OR REPLACE VIEW hyperlinks_with_details AS
SELECT
  h.id,
  h.project_id,
  h.source_document_id,
  h.target_document_id,
  h.x_position,
  h.y_position,
  h.width,
  h.height,
  h.hotspot_type,
  h.label,
  h.tooltip,
  h.color,
  h.is_bidirectional,
  h.is_active,
  -- Source document info
  sd.drawing_number AS source_drawing_number,
  sd.drawing_title AS source_title,
  sd.drawing_discipline AS source_discipline,
  -- Target document info
  td.drawing_number AS target_drawing_number,
  td.drawing_title AS target_title,
  td.drawing_discipline AS target_discipline,
  td.file_url AS target_file_url
FROM drawing_hyperlinks h
LEFT JOIN documents sd ON h.source_document_id = sd.id
LEFT JOIN documents td ON h.target_document_id = td.id
WHERE h.is_active = true;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 088_drawing_hyperlinks completed successfully';
END $$;
