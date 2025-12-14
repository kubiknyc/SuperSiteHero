-- Migration: Add floor plan location fields to punch_items
-- Allows marking punch item locations on floor plan drawings

-- Add floor_plan_location JSON field to store pin drop data
ALTER TABLE punch_items
  ADD COLUMN IF NOT EXISTS floor_plan_location JSONB;

-- Add index for efficient querying of punch items with floor plan locations
CREATE INDEX IF NOT EXISTS idx_punch_items_floor_plan_location
  ON punch_items USING GIN (floor_plan_location)
  WHERE floor_plan_location IS NOT NULL;

-- Add document reference for the floor plan image
ALTER TABLE punch_items
  ADD COLUMN IF NOT EXISTS floor_plan_document_id UUID REFERENCES documents(id);

-- Create index on floor_plan_document_id for efficient joins
CREATE INDEX IF NOT EXISTS idx_punch_items_floor_plan_document_id
  ON punch_items (floor_plan_document_id)
  WHERE floor_plan_document_id IS NOT NULL;

-- Comment on column
COMMENT ON COLUMN punch_items.floor_plan_location IS 'JSON object with x, y coordinates (0-1 normalized), documentId, pageNumber, and sheetName for pin drop on floor plan';
COMMENT ON COLUMN punch_items.floor_plan_document_id IS 'Reference to the floor plan document where the punch item is marked';

-- Grant permissions
GRANT SELECT, UPDATE ON punch_items TO authenticated;
