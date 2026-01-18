-- Migration: 20260118000002_sheet_callouts.sql
-- Description: Create sheet_callouts table for cross-reference links between sheets
-- Date: 2026-01-18
-- Part of: AI-Powered Drawing Management System

-- =============================================
-- TABLE: sheet_callouts
-- =============================================
-- Stores cross-reference callouts detected on drawing sheets.
-- Links detail bubbles, section markers, and other references to their target sheets.

CREATE TABLE sheet_callouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_sheet_id UUID NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
  target_sheet_id UUID REFERENCES drawing_sheets(id) ON DELETE SET NULL,

  -- Callout details
  callout_text TEXT NOT NULL,  -- e.g., "3/A5.1", "SEE DETAIL A"
  callout_type TEXT CHECK (callout_type IN (
    'detail', 'section', 'elevation', 'plan', 'reference', 'other'
  )),
  target_sheet_number TEXT,  -- Parsed target sheet number for matching

  -- Location on source sheet (percentages 0-100 of image dimensions)
  bounding_box JSONB,  -- {"x": 10.5, "y": 20.3, "width": 5.2, "height": 3.1}

  -- AI confidence
  ai_confidence DECIMAL(3,2),
  is_verified BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- Primary lookups
CREATE INDEX idx_sheet_callouts_source ON sheet_callouts(source_sheet_id);
CREATE INDEX idx_sheet_callouts_target ON sheet_callouts(target_sheet_id);

-- Find unlinked callouts that need resolution
CREATE INDEX idx_sheet_callouts_unlinked ON sheet_callouts(target_sheet_number)
  WHERE target_sheet_id IS NULL;

-- Find unverified callouts for review
CREATE INDEX idx_sheet_callouts_unverified ON sheet_callouts(source_sheet_id)
  WHERE is_verified = FALSE;

-- =============================================
-- TRIGGER: updated_at
-- =============================================
CREATE TRIGGER update_sheet_callouts_updated_at
  BEFORE UPDATE ON sheet_callouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE sheet_callouts ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view callouts for sheets they can access (via drawing_sheets RLS)
CREATE POLICY "Users can view callouts for sheets they can access"
  ON sheet_callouts FOR SELECT
  USING (
    source_sheet_id IN (
      SELECT ds.id FROM drawing_sheets ds
      JOIN project_users pu ON pu.project_id = ds.project_id
      WHERE pu.user_id = auth.uid() AND ds.deleted_at IS NULL
    )
  );

-- INSERT: Users can create callouts for sheets they can access
CREATE POLICY "Users can insert callouts for sheets they can access"
  ON sheet_callouts FOR INSERT
  WITH CHECK (
    source_sheet_id IN (
      SELECT ds.id FROM drawing_sheets ds
      JOIN project_users pu ON pu.project_id = ds.project_id
      WHERE pu.user_id = auth.uid() AND ds.deleted_at IS NULL
    )
  );

-- UPDATE: Users can update callouts for sheets they can access
CREATE POLICY "Users can update callouts for sheets they can access"
  ON sheet_callouts FOR UPDATE
  USING (
    source_sheet_id IN (
      SELECT ds.id FROM drawing_sheets ds
      JOIN project_users pu ON pu.project_id = ds.project_id
      WHERE pu.user_id = auth.uid() AND ds.deleted_at IS NULL
    )
  );

-- DELETE: Users can delete callouts for sheets they can access
CREATE POLICY "Users can delete callouts for sheets they can access"
  ON sheet_callouts FOR DELETE
  USING (
    source_sheet_id IN (
      SELECT ds.id FROM drawing_sheets ds
      JOIN project_users pu ON pu.project_id = ds.project_id
      WHERE pu.user_id = auth.uid() AND ds.deleted_at IS NULL
    )
  );

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE sheet_callouts IS 'Cross-reference links between drawing sheets detected by AI';
COMMENT ON COLUMN sheet_callouts.callout_text IS 'The text shown in the callout bubble (e.g., "3/A5.1", "SEE DETAIL A")';
COMMENT ON COLUMN sheet_callouts.callout_type IS 'Type of callout: detail, section, elevation, plan, reference, other';
COMMENT ON COLUMN sheet_callouts.target_sheet_number IS 'Parsed target sheet number for auto-linking';
COMMENT ON COLUMN sheet_callouts.bounding_box IS 'Location on source sheet as percentages: {x, y, width, height}';
COMMENT ON COLUMN sheet_callouts.is_verified IS 'Whether the callout link has been verified by a user';
