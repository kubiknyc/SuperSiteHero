-- Migration: 117_enhanced_punch_list_mobile_ux.sql
-- Description: Add subcontractor update tracking and proof of completion photo support
-- Date: 2025-01-14
-- Milestone: 1.1 - Enhanced Punch List Mobile UX

-- =============================================
-- PUNCH ITEMS: Add subcontractor update tracking columns
-- =============================================

-- Subcontractor notes field for subs to add their own notes
ALTER TABLE punch_items
ADD COLUMN IF NOT EXISTS subcontractor_notes TEXT;

-- Track when subcontractor last updated the item
ALTER TABLE punch_items
ADD COLUMN IF NOT EXISTS subcontractor_updated_at TIMESTAMPTZ;

-- Track when a status change was requested by subcontractor
ALTER TABLE punch_items
ADD COLUMN IF NOT EXISTS status_change_requested_at TIMESTAMPTZ;

-- Status change request details (JSON: { requested_status, reason, requested_by })
ALTER TABLE punch_items
ADD COLUMN IF NOT EXISTS status_change_request JSONB;

-- =============================================
-- PHOTOS: Add proof of completion flag
-- =============================================

-- Mark photos as proof of completion (for subcontractor completion verification)
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS is_proof_of_completion BOOLEAN DEFAULT false;

-- Index for efficient queries on completion photos
CREATE INDEX IF NOT EXISTS idx_photos_proof_of_completion
ON photos(punch_item_id, is_proof_of_completion)
WHERE is_proof_of_completion = true AND deleted_at IS NULL;

-- =============================================
-- PUNCH ITEMS: Add indexes for subcontractor queries
-- =============================================

-- Index for subcontractor update tracking
CREATE INDEX IF NOT EXISTS idx_punch_items_subcontractor_updated
ON punch_items(subcontractor_id, subcontractor_updated_at DESC)
WHERE deleted_at IS NULL;

-- Index for status change requests
CREATE INDEX IF NOT EXISTS idx_punch_items_status_change_requests
ON punch_items(project_id, status_change_requested_at)
WHERE status_change_requested_at IS NOT NULL AND deleted_at IS NULL;

-- =============================================
-- FUNCTION: Update subcontractor_updated_at automatically
-- =============================================

CREATE OR REPLACE FUNCTION update_subcontractor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if subcontractor_notes changed
  IF NEW.subcontractor_notes IS DISTINCT FROM OLD.subcontractor_notes THEN
    NEW.subcontractor_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update subcontractor_updated_at
DROP TRIGGER IF EXISTS trigger_punch_items_subcontractor_updated ON punch_items;
CREATE TRIGGER trigger_punch_items_subcontractor_updated
  BEFORE UPDATE ON punch_items
  FOR EACH ROW
  EXECUTE FUNCTION update_subcontractor_updated_at();

-- =============================================
-- COMMENTS: Document new columns
-- =============================================

COMMENT ON COLUMN punch_items.subcontractor_notes IS 'Notes added by assigned subcontractor';
COMMENT ON COLUMN punch_items.subcontractor_updated_at IS 'Timestamp when subcontractor last updated this item';
COMMENT ON COLUMN punch_items.status_change_requested_at IS 'Timestamp when subcontractor requested a status change';
COMMENT ON COLUMN punch_items.status_change_request IS 'JSON object with status change request details: { requested_status, reason, requested_by }';
COMMENT ON COLUMN photos.is_proof_of_completion IS 'Whether this photo serves as proof of punch item completion';

-- =============================================
-- Success message
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 117_enhanced_punch_list_mobile_ux completed successfully';
  RAISE NOTICE 'Added columns: subcontractor_notes, subcontractor_updated_at, status_change_requested_at, status_change_request to punch_items';
  RAISE NOTICE 'Added column: is_proof_of_completion to photos';
END $$;
