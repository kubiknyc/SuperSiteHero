-- Migration: 167_shop_drawings_enhancements.sql
-- Description: Add shop drawing specific fields and workflow validation
-- Date: 2026-01-03

-- =============================================
-- ADD SHOP DRAWING SPECIFIC COLUMNS
-- =============================================

-- Priority field for shop drawings (critical path tracking)
ALTER TABLE submittals
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'standard'
  CHECK (priority IN ('critical_path', 'standard', 'non_critical'));

-- Long lead item flag (items requiring extended procurement time)
ALTER TABLE submittals
ADD COLUMN IF NOT EXISTS long_lead_item BOOLEAN DEFAULT false;

-- Drawing number (unique identifier for shop drawings within a project)
ALTER TABLE submittals
ADD COLUMN IF NOT EXISTS drawing_number VARCHAR(50);

-- Parent revision reference (for tracking revision chain)
ALTER TABLE submittals
ADD COLUMN IF NOT EXISTS parent_revision_id UUID REFERENCES submittals(id);

-- Add index for shop drawing queries
CREATE INDEX IF NOT EXISTS idx_submittals_submittal_type_shop ON submittals(submittal_type)
  WHERE submittal_type = 'shop_drawing';

CREATE INDEX IF NOT EXISTS idx_submittals_priority ON submittals(priority);
CREATE INDEX IF NOT EXISTS idx_submittals_long_lead ON submittals(long_lead_item) WHERE long_lead_item = true;
CREATE INDEX IF NOT EXISTS idx_submittals_drawing_number ON submittals(project_id, drawing_number);
CREATE INDEX IF NOT EXISTS idx_submittals_parent_revision ON submittals(parent_revision_id);

-- =============================================
-- STATUS TRANSITION VALIDATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION validate_submittal_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_valid_transitions TEXT[][];
  v_is_valid BOOLEAN := false;
  v_current_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Only validate if review_status is changing
  IF OLD.review_status IS NOT DISTINCT FROM NEW.review_status THEN
    RETURN NEW;
  END IF;

  v_current_status := OLD.review_status;
  v_new_status := NEW.review_status;

  -- Define valid transitions
  -- Format: current_status -> allowed_next_statuses
  CASE v_current_status
    WHEN 'not_submitted' THEN
      v_is_valid := v_new_status IN ('submitted');
    WHEN 'submitted' THEN
      v_is_valid := v_new_status IN ('under_gc_review', 'under_review');
    WHEN 'under_gc_review' THEN
      v_is_valid := v_new_status IN ('approved', 'approved_as_noted', 'revise_resubmit', 'rejected', 'submitted_to_architect');
    WHEN 'under_review' THEN
      v_is_valid := v_new_status IN ('approved', 'approved_as_noted', 'revise_resubmit', 'rejected', 'submitted_to_architect');
    WHEN 'submitted_to_architect' THEN
      v_is_valid := v_new_status IN ('approved', 'approved_as_noted', 'revise_resubmit', 'rejected');
    WHEN 'revise_resubmit' THEN
      -- Can go back to submitted (new revision) or void
      v_is_valid := v_new_status IN ('submitted', 'not_submitted', 'void');
    WHEN 'rejected' THEN
      -- Can go back to submitted (as new product) or void
      v_is_valid := v_new_status IN ('submitted', 'not_submitted', 'void');
    WHEN 'approved', 'approved_as_noted' THEN
      -- Terminal states - can only be voided (admin action)
      v_is_valid := v_new_status IN ('void');
    WHEN 'void' THEN
      -- Void is terminal
      v_is_valid := false;
    ELSE
      -- Unknown status, allow any transition
      v_is_valid := true;
  END CASE;

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid status transition from % to %. Approved/Approved as Noted submittals are locked.',
      v_current_status, v_new_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status validation (only for shop drawings initially, can be extended)
DROP TRIGGER IF EXISTS trigger_validate_submittal_status ON submittals;
CREATE TRIGGER trigger_validate_submittal_status
  BEFORE UPDATE OF review_status ON submittals
  FOR EACH ROW
  EXECUTE FUNCTION validate_submittal_status_transition();

-- =============================================
-- DRAWING NUMBER GENERATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION generate_shop_drawing_number(
  p_project_id UUID,
  p_discipline VARCHAR(100) DEFAULT NULL
)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_count INTEGER;
  v_prefix VARCHAR(10);
  v_number VARCHAR(50);
BEGIN
  -- Generate discipline prefix
  v_prefix := CASE p_discipline
    WHEN 'Structural' THEN 'SD-S'
    WHEN 'Mechanical' THEN 'SD-M'
    WHEN 'Electrical' THEN 'SD-E'
    WHEN 'Plumbing' THEN 'SD-P'
    WHEN 'Fire Protection' THEN 'SD-FP'
    WHEN 'Architectural' THEN 'SD-A'
    ELSE 'SD'
  END;

  -- Count existing shop drawings for this project
  SELECT COUNT(*) + 1 INTO v_count
  FROM submittals
  WHERE project_id = p_project_id
    AND submittal_type = 'shop_drawing'
    AND deleted_at IS NULL;

  -- Format: SD-S-001, SD-M-002, etc.
  v_number := v_prefix || '-' || LPAD(v_count::TEXT, 3, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SHOP DRAWING VIEW
-- =============================================

CREATE OR REPLACE VIEW shop_drawings_register AS
SELECT
  s.*,
  -- Revision label
  CASE
    WHEN s.revision_number = 0 THEN 'Original'
    ELSE 'Rev ' || s.revision_number::TEXT
  END as revision_label,
  -- Days calculations
  CASE
    WHEN s.date_required IS NOT NULL AND s.review_status NOT IN ('approved', 'approved_as_noted', 'rejected', 'void')
    THEN (s.date_required::date - CURRENT_DATE)::INTEGER
    ELSE NULL
  END as days_until_required,
  CASE
    WHEN s.date_submitted IS NOT NULL AND s.date_returned IS NULL
    THEN (CURRENT_DATE - s.date_submitted::date)::INTEGER
    ELSE NULL
  END as days_in_review,
  CASE
    WHEN s.date_required IS NOT NULL
      AND s.date_required < CURRENT_DATE
      AND s.review_status NOT IN ('approved', 'approved_as_noted', 'rejected', 'void')
    THEN true
    ELSE false
  END as is_overdue,
  -- Is terminal state
  CASE
    WHEN s.review_status IN ('approved', 'approved_as_noted') THEN true
    ELSE false
  END as is_locked,
  -- Attachment count
  (SELECT COUNT(*) FROM submittal_attachments sa WHERE sa.submittal_id = s.id) as attachment_count,
  -- Item count
  (SELECT COUNT(*) FROM submittal_items si WHERE si.submittal_id = s.id) as item_count
FROM submittals s
WHERE s.submittal_type = 'shop_drawing'
  AND s.deleted_at IS NULL;

-- =============================================
-- PERMISSIONS
-- =============================================

GRANT SELECT ON shop_drawings_register TO authenticated;
GRANT EXECUTE ON FUNCTION generate_shop_drawing_number TO authenticated;
GRANT EXECUTE ON FUNCTION validate_submittal_status_transition TO authenticated;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 167_shop_drawings_enhancements completed successfully';
END $$;
