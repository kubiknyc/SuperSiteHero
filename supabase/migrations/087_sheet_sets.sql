-- Migration: 087_sheet_sets.sql
-- Description: Sheet set organization by discipline with custom grouping
-- Date: 2025-01-02

-- =============================================
-- TABLE: discipline_codes
-- Custom discipline codes per company
-- =============================================
CREATE TABLE IF NOT EXISTS discipline_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Discipline identification
  code VARCHAR(10) NOT NULL, -- A, S, M, E, P, etc.
  name VARCHAR(100) NOT NULL, -- Architectural, Structural, etc.
  description TEXT,

  -- Display settings
  color VARCHAR(20) DEFAULT '#6366f1', -- Hex color for UI
  icon VARCHAR(50), -- Icon name if applicable
  sort_order INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_discipline_codes_company_id ON discipline_codes(company_id);

-- Enable RLS
ALTER TABLE discipline_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view discipline codes" ON discipline_codes;
CREATE POLICY "Users can view discipline codes" ON discipline_codes
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage discipline codes" ON discipline_codes;
CREATE POLICY "Users can manage discipline codes" ON discipline_codes
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- =============================================
-- TABLE: sheet_sets
-- Organize drawings into logical sets
-- =============================================
CREATE TABLE IF NOT EXISTS sheet_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Set identification
  name VARCHAR(100) NOT NULL,
  description TEXT,
  set_number VARCHAR(20), -- Optional numbering

  -- Organization
  discipline_code VARCHAR(10), -- Primary discipline filter
  document_set VARCHAR(100), -- Issued for Construction, Bid Set, etc.

  -- Filters/Rules
  filter_criteria JSONB DEFAULT '{}', -- Dynamic filter rules

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Default set for new drawings

  -- Sort order
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sheet_sets_project_id ON sheet_sets(project_id);
CREATE INDEX IF NOT EXISTS idx_sheet_sets_discipline_code ON sheet_sets(discipline_code);
CREATE INDEX IF NOT EXISTS idx_sheet_sets_document_set ON sheet_sets(document_set);

-- Enable RLS
ALTER TABLE sheet_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sheet sets" ON sheet_sets;
CREATE POLICY "Users can view sheet sets" ON sheet_sets
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage sheet sets" ON sheet_sets;
CREATE POLICY "Users can manage sheet sets" ON sheet_sets
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: sheet_set_items
-- Individual drawings in a sheet set
-- =============================================
CREATE TABLE IF NOT EXISTS sheet_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_set_id UUID NOT NULL REFERENCES sheet_sets(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Override values (optional)
  custom_sheet_number VARCHAR(20),
  custom_title VARCHAR(255),
  notes TEXT,

  -- Inclusion settings
  include_in_index BOOLEAN DEFAULT true,
  is_placeholder BOOLEAN DEFAULT false, -- For future sheets

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (sheet_set_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_sheet_set_items_sheet_set_id ON sheet_set_items(sheet_set_id);
CREATE INDEX IF NOT EXISTS idx_sheet_set_items_document_id ON sheet_set_items(document_id);

-- Enable RLS
ALTER TABLE sheet_set_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sheet set items" ON sheet_set_items;
CREATE POLICY "Users can view sheet set items" ON sheet_set_items
  FOR SELECT
  USING (
    sheet_set_id IN (
      SELECT id FROM sheet_sets WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage sheet set items" ON sheet_set_items;
CREATE POLICY "Users can manage sheet set items" ON sheet_set_items
  FOR ALL
  USING (
    sheet_set_id IN (
      SELECT id FROM sheet_sets WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- FUNCTION: generate_sheet_index
-- Generate a formatted sheet index
-- =============================================
CREATE OR REPLACE FUNCTION generate_sheet_index(
  p_project_id UUID,
  p_sheet_set_id UUID DEFAULT NULL,
  p_discipline VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE (
  sheet_number VARCHAR(20),
  discipline VARCHAR(10),
  discipline_name VARCHAR(100),
  drawing_number VARCHAR(50),
  title VARCHAR(255),
  revision VARCHAR(10),
  revision_date DATE,
  asi_number VARCHAR(20),
  document_id UUID,
  sort_key INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ssi.custom_sheet_number, d.sheet_number) AS sheet_number,
    d.drawing_discipline AS discipline,
    COALESCE(dc.name,
      CASE d.drawing_discipline
        WHEN 'A' THEN 'Architectural'
        WHEN 'S' THEN 'Structural'
        WHEN 'M' THEN 'Mechanical'
        WHEN 'E' THEN 'Electrical'
        WHEN 'P' THEN 'Plumbing'
        WHEN 'C' THEN 'Civil'
        WHEN 'L' THEN 'Landscape'
        WHEN 'G' THEN 'General'
        ELSE 'Other'
      END
    ) AS discipline_name,
    d.drawing_number,
    COALESCE(ssi.custom_title, d.drawing_title, d.title) AS title,
    CONCAT(d.revision_number::TEXT, COALESCE(d.revision_letter, '')) AS revision,
    d.revision_date,
    d.asi_number,
    d.id AS document_id,
    COALESCE(ssi.sort_order,
      CASE d.drawing_discipline
        WHEN 'G' THEN 100
        WHEN 'C' THEN 200
        WHEN 'L' THEN 300
        WHEN 'A' THEN 400
        WHEN 'S' THEN 500
        WHEN 'M' THEN 600
        WHEN 'E' THEN 700
        WHEN 'P' THEN 800
        ELSE 900
      END
    ) AS sort_key
  FROM documents d
  LEFT JOIN sheet_set_items ssi ON d.id = ssi.document_id
  LEFT JOIN sheet_sets ss ON ssi.sheet_set_id = ss.id
  LEFT JOIN discipline_codes dc ON d.drawing_discipline = dc.code
    AND dc.company_id = (SELECT company_id FROM projects WHERE id = p_project_id)
  WHERE d.project_id = p_project_id
    AND d.drawing_number IS NOT NULL
    AND d.is_current_revision = true
    AND d.deleted_at IS NULL
    AND (ssi.include_in_index IS NULL OR ssi.include_in_index = true)
    AND (p_sheet_set_id IS NULL OR ssi.sheet_set_id = p_sheet_set_id)
    AND (p_discipline IS NULL OR d.drawing_discipline = p_discipline)
  ORDER BY sort_key, d.drawing_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: get_drawings_by_discipline
-- Get drawings grouped by discipline
-- =============================================
CREATE OR REPLACE FUNCTION get_drawings_by_discipline(p_project_id UUID)
RETURNS TABLE (
  discipline VARCHAR(10),
  discipline_name VARCHAR(100),
  drawing_count BIGINT,
  latest_revision_date DATE,
  has_asi_affected BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.drawing_discipline AS discipline,
    COALESCE(dc.name,
      CASE d.drawing_discipline
        WHEN 'A' THEN 'Architectural'
        WHEN 'S' THEN 'Structural'
        WHEN 'M' THEN 'Mechanical'
        WHEN 'E' THEN 'Electrical'
        WHEN 'P' THEN 'Plumbing'
        WHEN 'C' THEN 'Civil'
        WHEN 'L' THEN 'Landscape'
        WHEN 'G' THEN 'General'
        ELSE 'Other'
      END
    ) AS discipline_name,
    COUNT(*)::BIGINT AS drawing_count,
    MAX(d.revision_date) AS latest_revision_date,
    BOOL_OR(d.affected_by_asi) AS has_asi_affected
  FROM documents d
  LEFT JOIN discipline_codes dc ON d.drawing_discipline = dc.code
    AND dc.company_id = (SELECT company_id FROM projects WHERE id = p_project_id)
  WHERE d.project_id = p_project_id
    AND d.drawing_number IS NOT NULL
    AND d.is_current_revision = true
    AND d.deleted_at IS NULL
  GROUP BY d.drawing_discipline, dc.name
  ORDER BY
    CASE d.drawing_discipline
      WHEN 'G' THEN 1
      WHEN 'C' THEN 2
      WHEN 'L' THEN 3
      WHEN 'A' THEN 4
      WHEN 'S' THEN 5
      WHEN 'M' THEN 6
      WHEN 'E' THEN 7
      WHEN 'P' THEN 8
      ELSE 9
    END;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Seed default discipline codes
-- =============================================
CREATE OR REPLACE FUNCTION seed_default_discipline_codes(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO discipline_codes (company_id, code, name, sort_order, color)
  VALUES
    (p_company_id, 'G', 'General', 1, '#6b7280'),
    (p_company_id, 'C', 'Civil', 2, '#92400e'),
    (p_company_id, 'L', 'Landscape', 3, '#16a34a'),
    (p_company_id, 'A', 'Architectural', 4, '#2563eb'),
    (p_company_id, 'S', 'Structural', 5, '#7c3aed'),
    (p_company_id, 'M', 'Mechanical', 6, '#ea580c'),
    (p_company_id, 'E', 'Electrical', 7, '#eab308'),
    (p_company_id, 'P', 'Plumbing', 8, '#0891b2'),
    (p_company_id, 'F', 'Fire Protection', 9, '#dc2626'),
    (p_company_id, 'T', 'Technology', 10, '#8b5cf6'),
    (p_company_id, 'I', 'Interiors', 11, '#ec4899')
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 087_sheet_sets completed successfully';
END $$;
