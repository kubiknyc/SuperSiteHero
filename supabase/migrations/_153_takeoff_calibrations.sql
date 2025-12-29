-- Migration: 153_takeoff_calibrations.sql
-- Description: Add takeoff calibration persistence per document/page
-- Date: 2025-12-26

-- =============================================
-- TAKEOFF CALIBRATIONS TABLE
-- Stores scale calibration per document page
-- =============================================

CREATE TABLE IF NOT EXISTS takeoff_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,

  -- Calibration data
  pixels_per_unit NUMERIC NOT NULL,
  unit VARCHAR(10) NOT NULL, -- 'in', 'ft', 'm', 'cm', 'mm', etc.
  pixel_distance NUMERIC, -- Original calibration line length in pixels
  real_world_distance NUMERIC, -- Known length entered by user
  accuracy VARCHAR(10) CHECK (accuracy IN ('high', 'medium', 'low')),

  -- Calibration line coordinates (for visual reference)
  start_x NUMERIC,
  start_y NUMERIC,
  end_x NUMERIC,
  end_y NUMERIC,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One calibration per document page
  UNIQUE(document_id, page_number)
);

-- Comment on table
COMMENT ON TABLE takeoff_calibrations IS 'Stores takeoff scale calibrations per document page for measurement accuracy';

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_takeoff_calibrations_document
  ON takeoff_calibrations(document_id, page_number);

CREATE INDEX IF NOT EXISTS idx_takeoff_calibrations_company
  ON takeoff_calibrations(company_id);

-- =============================================
-- TAKEOFF CALIBRATION HISTORY TABLE
-- Tracks calibration changes for audit/revert
-- =============================================

CREATE TABLE IF NOT EXISTS takeoff_calibration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calibration_id UUID NOT NULL REFERENCES takeoff_calibrations(id) ON DELETE CASCADE,

  -- Previous calibration values
  pixels_per_unit NUMERIC NOT NULL,
  unit VARCHAR(10) NOT NULL,
  pixel_distance NUMERIC,
  real_world_distance NUMERIC,
  accuracy VARCHAR(10),

  -- Calibration line coordinates
  start_x NUMERIC,
  start_y NUMERIC,
  end_x NUMERIC,
  end_y NUMERIC,

  -- Change metadata
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason VARCHAR(255)
);

-- Comment on table
COMMENT ON TABLE takeoff_calibration_history IS 'Audit trail for calibration changes, enables reverting to previous calibrations';

-- Index for history lookups
CREATE INDEX IF NOT EXISTS idx_calibration_history_calibration
  ON takeoff_calibration_history(calibration_id, changed_at DESC);

-- =============================================
-- TRIGGER: Auto-record calibration history on update
-- =============================================

CREATE OR REPLACE FUNCTION record_calibration_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only record if calibration values actually changed
    IF OLD.pixels_per_unit != NEW.pixels_per_unit OR OLD.unit != NEW.unit THEN
      INSERT INTO takeoff_calibration_history (
        calibration_id,
        pixels_per_unit,
        unit,
        pixel_distance,
        real_world_distance,
        accuracy,
        start_x,
        start_y,
        end_x,
        end_y,
        changed_by,
        changed_at
      ) VALUES (
        OLD.id,
        OLD.pixels_per_unit,
        OLD.unit,
        OLD.pixel_distance,
        OLD.real_world_distance,
        OLD.accuracy,
        OLD.start_x,
        OLD.start_y,
        OLD.end_x,
        OLD.end_y,
        auth.uid(),
        NOW()
      );
    END IF;
  END IF;

  -- Update the updated_at timestamp
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS calibration_history_trigger ON takeoff_calibrations;
CREATE TRIGGER calibration_history_trigger
  BEFORE UPDATE ON takeoff_calibrations
  FOR EACH ROW EXECUTE FUNCTION record_calibration_history();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE takeoff_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE takeoff_calibration_history ENABLE ROW LEVEL SECURITY;

-- Calibrations: Users can view calibrations for documents in their company
CREATE POLICY "Users can view calibrations for their company documents"
  ON takeoff_calibrations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Calibrations: Users can create calibrations for their company
CREATE POLICY "Users can create calibrations for their company"
  ON takeoff_calibrations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Calibrations: Users can update calibrations for their company
CREATE POLICY "Users can update calibrations for their company"
  ON takeoff_calibrations FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Calibrations: Users can delete calibrations for their company
CREATE POLICY "Users can delete calibrations for their company"
  ON takeoff_calibrations FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- History: Users can view history for calibrations in their company
CREATE POLICY "Users can view calibration history for their company"
  ON takeoff_calibration_history FOR SELECT
  USING (
    calibration_id IN (
      SELECT id FROM takeoff_calibrations
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- HELPER FUNCTION: Get calibration for document page
-- =============================================

CREATE OR REPLACE FUNCTION get_document_calibration(
  p_document_id UUID,
  p_page_number INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  pixels_per_unit NUMERIC,
  unit VARCHAR,
  pixel_distance NUMERIC,
  real_world_distance NUMERIC,
  accuracy VARCHAR,
  start_x NUMERIC,
  start_y NUMERIC,
  end_x NUMERIC,
  end_y NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.pixels_per_unit,
    tc.unit,
    tc.pixel_distance,
    tc.real_world_distance,
    tc.accuracy,
    tc.start_x,
    tc.start_y,
    tc.end_x,
    tc.end_y,
    tc.created_at,
    tc.updated_at
  FROM takeoff_calibrations tc
  WHERE tc.document_id = p_document_id
    AND tc.page_number = p_page_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: Copy calibration to another page
-- =============================================

CREATE OR REPLACE FUNCTION copy_calibration_to_page(
  p_source_document_id UUID,
  p_source_page_number INTEGER,
  p_target_document_id UUID,
  p_target_page_number INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
  v_new_id UUID;
  v_source_cal RECORD;
BEGIN
  -- Get the source calibration
  SELECT * INTO v_source_cal
  FROM takeoff_calibrations
  WHERE document_id = p_source_document_id
    AND page_number = p_source_page_number;

  IF v_source_cal IS NULL THEN
    RAISE EXCEPTION 'Source calibration not found';
  END IF;

  -- Get company_id from source or target document
  SELECT company_id INTO v_company_id
  FROM documents
  WHERE id = p_target_document_id;

  -- Upsert the calibration for target page
  INSERT INTO takeoff_calibrations (
    company_id,
    document_id,
    page_number,
    pixels_per_unit,
    unit,
    pixel_distance,
    real_world_distance,
    accuracy,
    start_x,
    start_y,
    end_x,
    end_y,
    created_by
  ) VALUES (
    v_company_id,
    p_target_document_id,
    p_target_page_number,
    v_source_cal.pixels_per_unit,
    v_source_cal.unit,
    v_source_cal.pixel_distance,
    v_source_cal.real_world_distance,
    v_source_cal.accuracy,
    v_source_cal.start_x,
    v_source_cal.start_y,
    v_source_cal.end_x,
    v_source_cal.end_y,
    auth.uid()
  )
  ON CONFLICT (document_id, page_number)
  DO UPDATE SET
    pixels_per_unit = EXCLUDED.pixels_per_unit,
    unit = EXCLUDED.unit,
    pixel_distance = EXCLUDED.pixel_distance,
    real_world_distance = EXCLUDED.real_world_distance,
    accuracy = EXCLUDED.accuracy,
    start_x = EXCLUDED.start_x,
    start_y = EXCLUDED.start_y,
    end_x = EXCLUDED.end_x,
    end_y = EXCLUDED.end_y,
    updated_at = NOW()
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_document_calibration TO authenticated;
GRANT EXECUTE ON FUNCTION copy_calibration_to_page TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 153_takeoff_calibrations completed successfully';
END $$;
