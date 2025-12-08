-- Migration: 076_submittal_approval_codes.sql
-- Description: Add industry-standard approval codes (A/B/C/D) to submittals
-- Features:
--   - A = Approved (No exceptions taken)
--   - B = Approved as Noted (Make corrections noted)
--   - C = Revise & Resubmit (Revise and resubmit)
--   - D = Rejected (Not approved)

-- =============================================
-- ADD APPROVAL CODE TO SUBMITTALS TABLE
-- =============================================

-- Add approval code field to submittals
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS approval_code VARCHAR(1)
  CHECK (approval_code IS NULL OR approval_code IN ('A', 'B', 'C', 'D'));

-- Track when approval code was set
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS approval_code_date TIMESTAMPTZ;

-- Track who set the approval code
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS approval_code_set_by UUID REFERENCES auth.users(id);

-- Add comment for documentation
COMMENT ON COLUMN submittals.approval_code IS 'Industry-standard approval action code: A=Approved, B=Approved as Noted, C=Revise & Resubmit, D=Rejected';

-- =============================================
-- ADD APPROVAL CODE TO SUBMITTAL REVIEWS TABLE
-- =============================================

-- Add approval code to submittal_reviews for historical tracking
ALTER TABLE submittal_reviews ADD COLUMN IF NOT EXISTS approval_code VARCHAR(1)
  CHECK (approval_code IS NULL OR approval_code IN ('A', 'B', 'C', 'D'));

COMMENT ON COLUMN submittal_reviews.approval_code IS 'Approval action code at time of review: A=Approved, B=Approved as Noted, C=Revise & Resubmit, D=Rejected';

-- =============================================
-- CREATE INDEX FOR FILTERING
-- =============================================

CREATE INDEX IF NOT EXISTS idx_submittals_approval_code ON submittals(approval_code)
  WHERE approval_code IS NOT NULL;

-- =============================================
-- FUNCTION TO AUTO-SET APPROVAL CODE FROM STATUS
-- =============================================

-- Function to suggest approval code based on review status
CREATE OR REPLACE FUNCTION get_suggested_approval_code(review_status VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE review_status
    WHEN 'approved' THEN 'A'
    WHEN 'approved_as_noted' THEN 'B'
    WHEN 'revise_resubmit' THEN 'C'
    WHEN 'rejected' THEN 'D'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_suggested_approval_code(VARCHAR) IS 'Returns suggested approval code based on review status';

-- =============================================
-- TRIGGER TO AUTO-SET APPROVAL CODE DATE
-- =============================================

CREATE OR REPLACE FUNCTION set_approval_code_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- If approval code changed and is not null, set the date
  IF NEW.approval_code IS DISTINCT FROM OLD.approval_code AND NEW.approval_code IS NOT NULL THEN
    NEW.approval_code_date = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_submittal_approval_code_timestamp ON submittals;
CREATE TRIGGER set_submittal_approval_code_timestamp
  BEFORE UPDATE ON submittals
  FOR EACH ROW
  EXECUTE FUNCTION set_approval_code_timestamp();

-- =============================================
-- UPDATE SUBMITTAL HISTORY TRACKING
-- =============================================

-- Add approval code to history tracking if the function exists
DO $$
BEGIN
  -- Check if track_submittal_changes function exists and update it
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'track_submittal_changes') THEN
    CREATE OR REPLACE FUNCTION track_submittal_changes()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- Track status changes
      IF OLD.review_status IS DISTINCT FROM NEW.review_status THEN
        INSERT INTO submittal_history (submittal_id, action, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'status_changed', 'review_status', OLD.review_status, NEW.review_status, NEW.reviewer_id);
      END IF;

      -- Track approval code changes
      IF OLD.approval_code IS DISTINCT FROM NEW.approval_code THEN
        INSERT INTO submittal_history (submittal_id, action, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'approval_code_changed', 'approval_code', OLD.approval_code, NEW.approval_code, NEW.approval_code_set_by);
      END IF;

      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- =============================================
-- VIEW FOR APPROVAL CODE STATISTICS
-- =============================================

CREATE OR REPLACE VIEW submittal_approval_code_stats AS
SELECT
  project_id,
  approval_code,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY project_id), 0), 1) as percentage
FROM submittals
WHERE deleted_at IS NULL
  AND approval_code IS NOT NULL
GROUP BY project_id, approval_code
ORDER BY project_id, approval_code;

COMMENT ON VIEW submittal_approval_code_stats IS 'Statistics of approval codes by project';
