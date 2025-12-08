-- Migration: 078_rfi_response_types.sql
-- Description: Add RFI response types for better workflow tracking
-- Features:
--   - Response type classification
--   - Required response days tracking
--   - Internal RFI flag (not sent to architect)

-- =============================================
-- CREATE RESPONSE TYPE ENUM
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rfi_response_type') THEN
    CREATE TYPE rfi_response_type AS ENUM (
      'answered',              -- Question fully answered
      'see_drawings',          -- Answer references drawings
      'see_specs',             -- Answer references specifications
      'deferred',              -- Answer deferred to later date
      'partial_response',      -- Partial answer provided, more to come
      'request_clarification', -- Need more info from requestor
      'no_change_required',    -- Confirmed no change needed
      'see_submittal',         -- Answer provided via submittal
      'see_change_order',      -- Results in change order
      'verbal_direction'       -- Verbal direction provided (confirm in writing)
    );
  END IF;
END $$;

COMMENT ON TYPE rfi_response_type IS 'Classification of RFI response type for workflow tracking';

-- =============================================
-- ADD COLUMNS TO RFIS TABLE
-- =============================================

-- Response type
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS response_type rfi_response_type;

COMMENT ON COLUMN rfis.response_type IS 'Type of response provided (answered, see_drawings, deferred, etc.)';

-- Required response days (contract-specific)
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS required_response_days INTEGER DEFAULT 14;

COMMENT ON COLUMN rfis.required_response_days IS 'Number of days allowed for response per contract (typically 7, 14, or 21)';

-- Internal RFI flag
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN rfis.is_internal IS 'True if RFI is internal only (not sent to architect/engineer)';

-- Calculated response due date
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS response_due_date DATE;

COMMENT ON COLUMN rfis.response_due_date IS 'Calculated date when response is due';

-- Track if response was on time
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS response_on_time BOOLEAN;

COMMENT ON COLUMN rfis.response_on_time IS 'True if response was received by due date';

-- =============================================
-- INDEXES FOR NEW COLUMNS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_rfis_response_type ON rfis(response_type)
  WHERE response_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rfis_is_internal ON rfis(is_internal)
  WHERE is_internal = TRUE;

CREATE INDEX IF NOT EXISTS idx_rfis_response_due_date ON rfis(response_due_date)
  WHERE response_due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rfis_response_overdue ON rfis(response_due_date)
  WHERE response_due_date < CURRENT_DATE AND status NOT IN ('responded', 'closed');

-- =============================================
-- FUNCTION TO CALCULATE RESPONSE DUE DATE
-- =============================================

CREATE OR REPLACE FUNCTION calculate_rfi_response_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate response due date when RFI is submitted
  IF NEW.date_submitted IS NOT NULL AND NEW.response_due_date IS NULL THEN
    NEW.response_due_date = (NEW.date_submitted::DATE + COALESCE(NEW.required_response_days, 14));
  END IF;

  -- Check if response was on time
  IF NEW.date_responded IS NOT NULL AND NEW.response_due_date IS NOT NULL THEN
    NEW.response_on_time = (NEW.date_responded::DATE <= NEW.response_due_date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_rfi_response_due ON rfis;
CREATE TRIGGER calculate_rfi_response_due
  BEFORE INSERT OR UPDATE ON rfis
  FOR EACH ROW
  EXECUTE FUNCTION calculate_rfi_response_due_date();

-- =============================================
-- UPDATE EXISTING RFIS WITH DUE DATES
-- =============================================

-- Set response due dates for existing submitted RFIs
UPDATE rfis
SET response_due_date = (date_submitted::DATE + COALESCE(required_response_days, 14))
WHERE date_submitted IS NOT NULL
  AND response_due_date IS NULL;

-- Set response_on_time for existing responded RFIs
UPDATE rfis
SET response_on_time = (date_responded::DATE <= response_due_date)
WHERE date_responded IS NOT NULL
  AND response_due_date IS NOT NULL
  AND response_on_time IS NULL;

-- =============================================
-- VIEW FOR RFI RESPONSE TIME ANALYSIS
-- =============================================

CREATE OR REPLACE VIEW rfi_response_time_analysis AS
SELECT
  project_id,
  COUNT(*) as total_rfis,
  COUNT(*) FILTER (WHERE date_responded IS NOT NULL) as responded_count,
  COUNT(*) FILTER (WHERE response_on_time = TRUE) as on_time_count,
  COUNT(*) FILTER (WHERE response_on_time = FALSE) as late_count,
  COUNT(*) FILTER (WHERE response_due_date < CURRENT_DATE AND date_responded IS NULL) as overdue_count,
  ROUND(AVG(
    CASE WHEN date_responded IS NOT NULL AND date_submitted IS NOT NULL
    THEN (date_responded::DATE - date_submitted::DATE)
    END
  ), 1) as avg_response_days,
  ROUND(
    COUNT(*) FILTER (WHERE response_on_time = TRUE)::DECIMAL * 100 /
    NULLIF(COUNT(*) FILTER (WHERE date_responded IS NOT NULL), 0),
    1
  ) as on_time_percentage
FROM rfis
WHERE deleted_at IS NULL
GROUP BY project_id;

COMMENT ON VIEW rfi_response_time_analysis IS 'Analysis of RFI response times by project';

-- =============================================
-- VIEW FOR RFI RESPONSE TYPE DISTRIBUTION
-- =============================================

CREATE OR REPLACE VIEW rfi_response_type_distribution AS
SELECT
  project_id,
  response_type,
  COUNT(*) as count,
  ROUND(
    COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY project_id), 0),
    1
  ) as percentage
FROM rfis
WHERE deleted_at IS NULL
  AND response_type IS NOT NULL
GROUP BY project_id, response_type
ORDER BY project_id, count DESC;

COMMENT ON VIEW rfi_response_type_distribution IS 'Distribution of RFI response types by project';

-- =============================================
-- UPDATE RFI HISTORY TRACKING
-- =============================================

-- Update history tracking function to include response_type
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'track_rfi_changes') THEN
    CREATE OR REPLACE FUNCTION track_rfi_changes()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- Track status changes
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO rfi_history (rfi_id, action, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'status_changed', 'status', OLD.status, NEW.status, NEW.ball_in_court);
      END IF;

      -- Track response type changes
      IF OLD.response_type IS DISTINCT FROM NEW.response_type THEN
        INSERT INTO rfi_history (rfi_id, action, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'response_type_set', 'response_type', OLD.response_type::TEXT, NEW.response_type::TEXT, NEW.ball_in_court);
      END IF;

      -- Track ball in court changes
      IF OLD.ball_in_court IS DISTINCT FROM NEW.ball_in_court THEN
        INSERT INTO rfi_history (rfi_id, action, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'ball_in_court_changed', 'ball_in_court', OLD.ball_in_court::TEXT, NEW.ball_in_court::TEXT, NEW.ball_in_court);
      END IF;

      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;
