-- Migration: 166_submittal_drawing_links.sql
-- Description: Add drawing links to submittals similar to RFI drawing links
-- Date: 2025-01-02

-- =============================================
-- TABLE: submittal_drawing_links
-- Multiple drawing references per submittal with pin locations
-- =============================================
CREATE TABLE IF NOT EXISTS submittal_drawing_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Drawing reference info
  drawing_number VARCHAR(100),
  sheet_number VARCHAR(50),

  -- Pin location on drawing (normalized 0-1 coordinates)
  pin_x DECIMAL(5, 4),  -- X position as percentage (0-1)
  pin_y DECIMAL(5, 4),  -- Y position as percentage (0-1)

  -- Pin metadata
  pin_label VARCHAR(100),
  pin_color VARCHAR(20) DEFAULT '#8B5CF6',  -- Purple default for submittals

  -- Notes specific to this drawing reference
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submittal_drawing_links_submittal_id ON submittal_drawing_links(submittal_id);
CREATE INDEX IF NOT EXISTS idx_submittal_drawing_links_document_id ON submittal_drawing_links(document_id);

-- Enable RLS
ALTER TABLE submittal_drawing_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view submittal drawing links" ON submittal_drawing_links;
CREATE POLICY "Users can view submittal drawing links" ON submittal_drawing_links
  FOR SELECT
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert submittal drawing links" ON submittal_drawing_links;
CREATE POLICY "Users can insert submittal drawing links" ON submittal_drawing_links
  FOR INSERT
  WITH CHECK (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update submittal drawing links" ON submittal_drawing_links;
CREATE POLICY "Users can update submittal drawing links" ON submittal_drawing_links
  FOR UPDATE
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete submittal drawing links" ON submittal_drawing_links;
CREATE POLICY "Users can delete submittal drawing links" ON submittal_drawing_links
  FOR DELETE
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 166_submittal_drawing_links completed successfully';
END $$;
