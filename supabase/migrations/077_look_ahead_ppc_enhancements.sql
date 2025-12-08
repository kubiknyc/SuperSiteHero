-- Migration: 077_look_ahead_ppc_enhancements.sql
-- Description: Enhance Look-Ahead Planning with Last Planner System (LPS) features
-- Features:
--   - Make-ready status tracking (will_do, should_do, can_do, did_do)
--   - Commitment tracking (who committed, when)
--   - Variance category standardization
--   - Reliability index calculation
--   - Planning meeting tracking

-- =============================================
-- CREATE VARIANCE CATEGORY ENUM
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'variance_category') THEN
    CREATE TYPE variance_category AS ENUM (
      'prereq_incomplete',      -- Prerequisite work not complete
      'labor_shortage',         -- Insufficient labor available
      'material_delay',         -- Materials not delivered/available
      'equipment_unavailable',  -- Equipment not available
      'weather',                -- Weather-related delay
      'design_change',          -- Design change or clarification needed
      'inspection_delay',       -- Waiting for inspection
      'rework_required',        -- Quality issues requiring rework
      'owner_decision',         -- Waiting for owner decision
      'permit_delay',           -- Permit not obtained
      'coordination_issue',     -- Trade coordination problem
      'safety_stop',            -- Safety concern stopped work
      'other'                   -- Other reasons
    );
  END IF;
END $$;

COMMENT ON TYPE variance_category IS 'Standardized categories for tracking why planned work was not completed';

-- =============================================
-- ENHANCE LOOK-AHEAD ACTIVITIES TABLE
-- =============================================

-- Make-ready status for Last Planner System workflow
ALTER TABLE look_ahead_activities ADD COLUMN IF NOT EXISTS make_ready_status VARCHAR(20)
  CHECK (make_ready_status IS NULL OR make_ready_status IN ('will_do', 'should_do', 'can_do', 'did_do'));

COMMENT ON COLUMN look_ahead_activities.make_ready_status IS 'LPS make-ready status: will_do (6-week), should_do (commitment), can_do (ready), did_do (completed)';

-- Commitment tracking
ALTER TABLE look_ahead_activities ADD COLUMN IF NOT EXISTS committed_by UUID REFERENCES auth.users(id);
ALTER TABLE look_ahead_activities ADD COLUMN IF NOT EXISTS commitment_date TIMESTAMPTZ;

COMMENT ON COLUMN look_ahead_activities.committed_by IS 'User who committed to completing this activity';
COMMENT ON COLUMN look_ahead_activities.commitment_date IS 'Date when commitment was made';

-- Constraint removal planning
ALTER TABLE look_ahead_activities ADD COLUMN IF NOT EXISTS constraint_removal_plan TEXT;
ALTER TABLE look_ahead_activities ADD COLUMN IF NOT EXISTS ready_to_execute BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN look_ahead_activities.constraint_removal_plan IS 'Plan for removing constraints blocking this activity';
COMMENT ON COLUMN look_ahead_activities.ready_to_execute IS 'True when all constraints are resolved and activity is ready';

-- Variance tracking when activity doesn't complete as planned
ALTER TABLE look_ahead_activities ADD COLUMN IF NOT EXISTS variance_category variance_category;
ALTER TABLE look_ahead_activities ADD COLUMN IF NOT EXISTS variance_notes TEXT;

COMMENT ON COLUMN look_ahead_activities.variance_category IS 'Category of variance if activity did not complete as planned';
COMMENT ON COLUMN look_ahead_activities.variance_notes IS 'Detailed notes about why activity did not complete';

-- =============================================
-- ENHANCE LOOK-AHEAD SNAPSHOTS TABLE
-- =============================================

-- Reliability index (alternative to PPC for overall reliability tracking)
ALTER TABLE look_ahead_snapshots ADD COLUMN IF NOT EXISTS reliability_index DECIMAL(5,2);

COMMENT ON COLUMN look_ahead_snapshots.reliability_index IS 'Reliability index = completed / (completed + not_completed) * 100';

-- Planning meeting tracking
ALTER TABLE look_ahead_snapshots ADD COLUMN IF NOT EXISTS planning_meeting_date DATE;
ALTER TABLE look_ahead_snapshots ADD COLUMN IF NOT EXISTS meeting_attendees UUID[];
ALTER TABLE look_ahead_snapshots ADD COLUMN IF NOT EXISTS meeting_notes TEXT;

COMMENT ON COLUMN look_ahead_snapshots.planning_meeting_date IS 'Date of the weekly planning meeting';
COMMENT ON COLUMN look_ahead_snapshots.meeting_attendees IS 'Array of user IDs who attended the planning meeting';
COMMENT ON COLUMN look_ahead_snapshots.meeting_notes IS 'Notes from the weekly planning meeting';

-- Variance analysis summary
ALTER TABLE look_ahead_snapshots ADD COLUMN IF NOT EXISTS variance_summary JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN look_ahead_snapshots.variance_summary IS 'Summary of variance categories: [{category, count, percentage}]';

-- =============================================
-- INDEXES FOR NEW COLUMNS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_make_ready ON look_ahead_activities(make_ready_status)
  WHERE make_ready_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_committed_by ON look_ahead_activities(committed_by)
  WHERE committed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_ready_to_execute ON look_ahead_activities(ready_to_execute)
  WHERE ready_to_execute = TRUE;

CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_variance ON look_ahead_activities(variance_category)
  WHERE variance_category IS NOT NULL;

-- =============================================
-- FUNCTION TO CALCULATE RELIABILITY INDEX
-- =============================================

CREATE OR REPLACE FUNCTION calculate_reliability_index(
  p_project_id UUID,
  p_week_start DATE
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_completed INTEGER;
  v_not_completed INTEGER;
  v_total INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status IN ('delayed', 'blocked', 'cancelled')),
    COUNT(*)
  INTO v_completed, v_not_completed, v_total
  FROM look_ahead_activities
  WHERE project_id = p_project_id
    AND week_start_date = p_week_start
    AND make_ready_status = 'should_do'  -- Only count committed work
    AND deleted_at IS NULL;

  IF v_total = 0 THEN
    RETURN NULL;
  END IF;

  RETURN ROUND((v_completed::DECIMAL / v_total) * 100, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_reliability_index(UUID, DATE) IS 'Calculate reliability index for committed work in a given week';

-- =============================================
-- FUNCTION TO AUTO-UPDATE READY_TO_EXECUTE
-- =============================================

CREATE OR REPLACE FUNCTION update_activity_ready_status()
RETURNS TRIGGER AS $$
DECLARE
  v_has_open_constraints BOOLEAN;
BEGIN
  -- Check if there are any open constraints for this activity
  SELECT EXISTS (
    SELECT 1
    FROM look_ahead_constraints
    WHERE activity_id = NEW.id
      AND status = 'open'
      AND deleted_at IS NULL
  ) INTO v_has_open_constraints;

  -- Update ready_to_execute based on constraints
  NEW.ready_to_execute = NOT v_has_open_constraints;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_activity_ready_on_change') THEN
    CREATE TRIGGER update_activity_ready_on_change
      BEFORE UPDATE ON look_ahead_activities
      FOR EACH ROW
      EXECUTE FUNCTION update_activity_ready_status();
  END IF;
END $$;

-- =============================================
-- FUNCTION TO GENERATE VARIANCE SUMMARY
-- =============================================

CREATE OR REPLACE FUNCTION generate_variance_summary(
  p_project_id UUID,
  p_week_start DATE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', variance_category,
        'count', count,
        'percentage', ROUND(count * 100.0 / NULLIF(SUM(count) OVER(), 0), 1)
      )
      ORDER BY count DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      variance_category,
      COUNT(*) as count
    FROM look_ahead_activities
    WHERE project_id = p_project_id
      AND week_start_date = p_week_start
      AND variance_category IS NOT NULL
      AND deleted_at IS NULL
    GROUP BY variance_category
  ) sub;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_variance_summary(UUID, DATE) IS 'Generate variance summary for a given week';

-- =============================================
-- VIEW FOR WEEKLY PPC DASHBOARD
-- =============================================

CREATE OR REPLACE VIEW look_ahead_weekly_ppc AS
SELECT
  project_id,
  week_start_date,
  COUNT(*) FILTER (WHERE make_ready_status = 'should_do') as committed_count,
  COUNT(*) FILTER (WHERE make_ready_status = 'should_do' AND status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE make_ready_status = 'can_do') as ready_count,
  COUNT(*) FILTER (WHERE ready_to_execute = TRUE) as executable_count,
  COUNT(*) FILTER (WHERE variance_category IS NOT NULL) as variance_count,
  ROUND(
    COUNT(*) FILTER (WHERE make_ready_status = 'should_do' AND status = 'completed')::DECIMAL * 100 /
    NULLIF(COUNT(*) FILTER (WHERE make_ready_status = 'should_do'), 0),
    1
  ) as ppc_percentage
FROM look_ahead_activities
WHERE deleted_at IS NULL
GROUP BY project_id, week_start_date
ORDER BY project_id, week_start_date DESC;

COMMENT ON VIEW look_ahead_weekly_ppc IS 'Weekly PPC (Percent Plan Complete) dashboard view';

-- =============================================
-- VIEW FOR VARIANCE ANALYSIS
-- =============================================

CREATE OR REPLACE VIEW look_ahead_variance_analysis AS
SELECT
  la.project_id,
  la.week_start_date,
  la.variance_category,
  COUNT(*) as occurrence_count,
  ROUND(
    COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY la.project_id, la.week_start_date), 0),
    1
  ) as percentage,
  array_agg(DISTINCT la.trade) FILTER (WHERE la.trade IS NOT NULL) as affected_trades
FROM look_ahead_activities la
WHERE la.variance_category IS NOT NULL
  AND la.deleted_at IS NULL
GROUP BY la.project_id, la.week_start_date, la.variance_category
ORDER BY la.project_id, la.week_start_date DESC, occurrence_count DESC;

COMMENT ON VIEW look_ahead_variance_analysis IS 'Variance analysis by category for root cause identification';
