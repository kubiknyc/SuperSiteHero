-- Migration: 107_earned_value_management.sql
-- Description: Add Earned Value Management (EVM) calculations (CPI/SPI/EAC/ETC)
-- Implements PMI/PMBOK standard EVM methodology

-- ============================================================================
-- EVM Snapshots Table - Store historical EVM data points
-- ============================================================================

CREATE TABLE IF NOT EXISTS evm_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Status date for this snapshot
  status_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Core EVM Values
  bac DECIMAL(15, 2) NOT NULL DEFAULT 0,          -- Budget at Completion
  pv DECIMAL(15, 2) NOT NULL DEFAULT 0,           -- Planned Value
  ev DECIMAL(15, 2) NOT NULL DEFAULT 0,           -- Earned Value
  ac DECIMAL(15, 2) NOT NULL DEFAULT 0,           -- Actual Cost

  -- Variance Metrics (computed but stored for history)
  cv DECIMAL(15, 2) NOT NULL DEFAULT 0,           -- Cost Variance
  sv DECIMAL(15, 2) NOT NULL DEFAULT 0,           -- Schedule Variance

  -- Performance Indices
  cpi DECIMAL(8, 4) DEFAULT NULL,                 -- Cost Performance Index
  spi DECIMAL(8, 4) DEFAULT NULL,                 -- Schedule Performance Index
  csi DECIMAL(8, 4) DEFAULT NULL,                 -- Cost-Schedule Index

  -- Forecasts
  eac DECIMAL(15, 2) DEFAULT NULL,                -- Estimate at Completion
  etc DECIMAL(15, 2) DEFAULT NULL,                -- Estimate to Complete
  vac DECIMAL(15, 2) DEFAULT NULL,                -- Variance at Completion
  tcpi_bac DECIMAL(8, 4) DEFAULT NULL,            -- TCPI to meet BAC
  tcpi_eac DECIMAL(8, 4) DEFAULT NULL,            -- TCPI to meet EAC

  -- Schedule metrics
  planned_duration_days INTEGER DEFAULT NULL,
  actual_duration_days INTEGER DEFAULT NULL,
  estimated_duration_days INTEGER DEFAULT NULL,
  planned_percent_complete DECIMAL(5, 2) DEFAULT 0,
  actual_percent_complete DECIMAL(5, 2) DEFAULT 0,

  -- Management overrides
  management_eac DECIMAL(15, 2) DEFAULT NULL,
  management_completion_date DATE DEFAULT NULL,
  management_notes TEXT DEFAULT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  -- Unique constraint for one snapshot per project per date
  CONSTRAINT unique_project_snapshot_date UNIQUE (project_id, status_date)
);

-- Index for efficient queries
CREATE INDEX idx_evm_snapshots_project ON evm_snapshots(project_id);
CREATE INDEX idx_evm_snapshots_company ON evm_snapshots(company_id);
CREATE INDEX idx_evm_snapshots_date ON evm_snapshots(status_date DESC);
CREATE INDEX idx_evm_snapshots_project_date ON evm_snapshots(project_id, status_date DESC);

-- ============================================================================
-- Function: Calculate Earned Value from Schedule Activities
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_earned_value(p_project_id UUID)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_earned_value DECIMAL(15, 2);
BEGIN
  -- EV = Sum of (budgeted_cost * percent_complete / 100) for all activities
  SELECT COALESCE(SUM(
    COALESCE(budgeted_cost, 0) * COALESCE(percent_complete, 0) / 100
  ), 0)
  INTO v_earned_value
  FROM schedule_activities
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND activity_type != 'wbs_summary'; -- Don't double-count summaries

  RETURN v_earned_value;
END;
$$;

-- ============================================================================
-- Function: Calculate Planned Value as of a specific date
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_planned_value(
  p_project_id UUID,
  p_status_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_planned_value DECIMAL(15, 2);
BEGIN
  -- PV = Sum of budgeted costs for activities that should be complete by status_date
  -- Plus proportional value for activities that should be in progress
  SELECT COALESCE(SUM(
    CASE
      -- Fully completed activities (planned finish <= status date)
      WHEN planned_finish <= p_status_date THEN COALESCE(budgeted_cost, 0)
      -- In-progress activities (planned start <= status date < planned finish)
      WHEN planned_start <= p_status_date AND planned_finish > p_status_date THEN
        CASE
          WHEN planned_duration > 0 THEN
            COALESCE(budgeted_cost, 0) *
            GREATEST(0, EXTRACT(DAY FROM p_status_date - planned_start::DATE) + 1) /
            planned_duration
          ELSE COALESCE(budgeted_cost, 0) * 0.5 -- Default to 50% if no duration
        END
      -- Future activities (planned start > status date)
      ELSE 0
    END
  ), 0)
  INTO v_planned_value
  FROM schedule_activities
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND activity_type != 'wbs_summary'
    AND planned_start IS NOT NULL;

  RETURN v_planned_value;
END;
$$;

-- ============================================================================
-- Function: Get Budget at Completion (BAC)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_budget_at_completion(p_project_id UUID)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_bac DECIMAL(15, 2);
BEGIN
  -- BAC from project_budgets (sum of revised budgets)
  SELECT COALESCE(SUM(original_budget + COALESCE(approved_changes, 0)), 0)
  INTO v_bac
  FROM project_budgets
  WHERE project_id = p_project_id;

  -- If no budget data, try from schedule activities
  IF v_bac = 0 THEN
    SELECT COALESCE(SUM(budgeted_cost), 0)
    INTO v_bac
    FROM schedule_activities
    WHERE project_id = p_project_id
      AND deleted_at IS NULL
      AND activity_type != 'wbs_summary';
  END IF;

  RETURN v_bac;
END;
$$;

-- ============================================================================
-- Function: Get Actual Cost to Date
-- ============================================================================

CREATE OR REPLACE FUNCTION get_actual_cost(p_project_id UUID)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_actual_cost DECIMAL(15, 2);
BEGIN
  -- AC from project_budgets actual_cost
  SELECT COALESCE(SUM(actual_cost), 0)
  INTO v_actual_cost
  FROM project_budgets
  WHERE project_id = p_project_id;

  RETURN v_actual_cost;
END;
$$;

-- ============================================================================
-- Function: Calculate Complete EVM Metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_evm_metrics(
  p_project_id UUID,
  p_status_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  bac DECIMAL(15, 2),
  pv DECIMAL(15, 2),
  ev DECIMAL(15, 2),
  ac DECIMAL(15, 2),
  cv DECIMAL(15, 2),
  sv DECIMAL(15, 2),
  cv_percent DECIMAL(8, 4),
  sv_percent DECIMAL(8, 4),
  cpi DECIMAL(8, 4),
  spi DECIMAL(8, 4),
  csi DECIMAL(8, 4),
  eac DECIMAL(15, 2),
  etc DECIMAL(15, 2),
  vac DECIMAL(15, 2),
  vac_percent DECIMAL(8, 4),
  tcpi_bac DECIMAL(8, 4),
  tcpi_eac DECIMAL(8, 4),
  planned_duration_days INTEGER,
  actual_duration_days INTEGER,
  estimated_duration_days INTEGER,
  percent_complete_planned DECIMAL(5, 2),
  percent_complete_actual DECIMAL(5, 2),
  percent_spent DECIMAL(5, 2),
  cost_status TEXT,
  schedule_status TEXT,
  overall_status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_bac DECIMAL(15, 2);
  v_pv DECIMAL(15, 2);
  v_ev DECIMAL(15, 2);
  v_ac DECIMAL(15, 2);
  v_cv DECIMAL(15, 2);
  v_sv DECIMAL(15, 2);
  v_cpi DECIMAL(8, 4);
  v_spi DECIMAL(8, 4);
  v_csi DECIMAL(8, 4);
  v_eac DECIMAL(15, 2);
  v_etc DECIMAL(15, 2);
  v_vac DECIMAL(15, 2);
  v_tcpi_bac DECIMAL(8, 4);
  v_tcpi_eac DECIMAL(8, 4);
  v_project_start DATE;
  v_project_end DATE;
  v_planned_duration INTEGER;
  v_actual_duration INTEGER;
  v_estimated_duration INTEGER;
BEGIN
  -- Get core values
  v_bac := get_budget_at_completion(p_project_id);
  v_pv := calculate_planned_value(p_project_id, p_status_date);
  v_ev := calculate_earned_value(p_project_id);
  v_ac := get_actual_cost(p_project_id);

  -- Calculate variances
  v_cv := v_ev - v_ac;  -- Positive = under budget
  v_sv := v_ev - v_pv;  -- Positive = ahead of schedule

  -- Calculate indices (protect against division by zero)
  v_cpi := CASE WHEN v_ac > 0 THEN v_ev / v_ac ELSE NULL END;
  v_spi := CASE WHEN v_pv > 0 THEN v_ev / v_pv ELSE NULL END;
  v_csi := CASE WHEN v_cpi IS NOT NULL AND v_spi IS NOT NULL
           THEN v_cpi * v_spi ELSE NULL END;

  -- Calculate EAC (using CPI method)
  v_eac := CASE WHEN v_cpi > 0 THEN v_bac / v_cpi ELSE v_bac END;

  -- Calculate ETC and VAC
  v_etc := GREATEST(0, v_eac - v_ac);
  v_vac := v_bac - v_eac;

  -- Calculate TCPI
  v_tcpi_bac := CASE WHEN (v_bac - v_ac) > 0
                THEN (v_bac - v_ev) / (v_bac - v_ac) ELSE NULL END;
  v_tcpi_eac := CASE WHEN (v_eac - v_ac) > 0
                THEN (v_bac - v_ev) / (v_eac - v_ac) ELSE NULL END;

  -- Get project dates for duration calculations
  SELECT MIN(planned_start), MAX(planned_finish)
  INTO v_project_start, v_project_end
  FROM schedule_activities
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND planned_start IS NOT NULL;

  -- Calculate durations
  v_planned_duration := CASE
    WHEN v_project_start IS NOT NULL AND v_project_end IS NOT NULL
    THEN v_project_end - v_project_start
    ELSE NULL END;

  v_actual_duration := CASE
    WHEN v_project_start IS NOT NULL
    THEN GREATEST(0, p_status_date - v_project_start)
    ELSE NULL END;

  v_estimated_duration := CASE
    WHEN v_spi > 0 AND v_planned_duration IS NOT NULL
    THEN CEIL(v_planned_duration / v_spi)::INTEGER
    ELSE v_planned_duration END;

  -- Return all metrics
  RETURN QUERY SELECT
    v_bac,
    v_pv,
    v_ev,
    v_ac,
    v_cv,
    v_sv,
    CASE WHEN v_ev > 0 THEN (v_cv / v_ev * 100) ELSE 0 END,  -- CV%
    CASE WHEN v_pv > 0 THEN (v_sv / v_pv * 100) ELSE 0 END,  -- SV%
    v_cpi,
    v_spi,
    v_csi,
    v_eac,
    v_etc,
    v_vac,
    CASE WHEN v_bac > 0 THEN (v_vac / v_bac * 100) ELSE 0 END,  -- VAC%
    v_tcpi_bac,
    v_tcpi_eac,
    v_planned_duration,
    v_actual_duration,
    v_estimated_duration,
    CASE WHEN v_bac > 0 THEN LEAST(100, v_pv / v_bac * 100) ELSE 0 END,  -- Planned %
    CASE WHEN v_bac > 0 THEN LEAST(100, v_ev / v_bac * 100) ELSE 0 END,  -- Actual %
    CASE WHEN v_bac > 0 THEN LEAST(100, v_ac / v_bac * 100) ELSE 0 END,  -- Spent %
    -- Status determination based on CPI
    CASE
      WHEN v_cpi IS NULL THEN 'unknown'
      WHEN v_cpi >= 1.05 THEN 'excellent'
      WHEN v_cpi >= 1.0 THEN 'good'
      WHEN v_cpi >= 0.95 THEN 'fair'
      WHEN v_cpi >= 0.90 THEN 'poor'
      ELSE 'critical'
    END,
    -- Status determination based on SPI
    CASE
      WHEN v_spi IS NULL THEN 'unknown'
      WHEN v_spi >= 1.05 THEN 'excellent'
      WHEN v_spi >= 1.0 THEN 'good'
      WHEN v_spi >= 0.95 THEN 'fair'
      WHEN v_spi >= 0.90 THEN 'poor'
      ELSE 'critical'
    END,
    -- Overall status (worst of cost and schedule)
    CASE
      WHEN v_cpi IS NULL OR v_spi IS NULL THEN 'unknown'
      WHEN LEAST(COALESCE(v_cpi, 0), COALESCE(v_spi, 0)) >= 1.05 THEN 'excellent'
      WHEN LEAST(COALESCE(v_cpi, 0), COALESCE(v_spi, 0)) >= 1.0 THEN 'good'
      WHEN LEAST(COALESCE(v_cpi, 0), COALESCE(v_spi, 0)) >= 0.95 THEN 'fair'
      WHEN LEAST(COALESCE(v_cpi, 0), COALESCE(v_spi, 0)) >= 0.90 THEN 'poor'
      ELSE 'critical'
    END;
END;
$$;

-- ============================================================================
-- Function: Get EVM by Cost Code Division
-- ============================================================================

CREATE OR REPLACE FUNCTION get_evm_by_division(
  p_project_id UUID,
  p_status_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  division TEXT,
  division_name TEXT,
  bac DECIMAL(15, 2),
  pv DECIMAL(15, 2),
  ev DECIMAL(15, 2),
  ac DECIMAL(15, 2),
  cv DECIMAL(15, 2),
  sv DECIMAL(15, 2),
  cpi DECIMAL(8, 4),
  spi DECIMAL(8, 4),
  eac DECIMAL(15, 2),
  percent_complete DECIMAL(5, 2),
  cost_status TEXT,
  schedule_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH division_budgets AS (
    SELECT
      COALESCE(cc.division, '00') as div,
      COALESCE(
        (SELECT name FROM cost_codes WHERE division = cc.division AND level = 1 LIMIT 1),
        'General'
      ) as div_name,
      COALESCE(SUM(pb.original_budget + COALESCE(pb.approved_changes, 0)), 0) as bac,
      COALESCE(SUM(pb.actual_cost), 0) as ac
    FROM project_budgets pb
    JOIN cost_codes cc ON pb.cost_code_id = cc.id
    WHERE pb.project_id = p_project_id
    GROUP BY COALESCE(cc.division, '00')
  ),
  division_schedule AS (
    -- Get earned value from schedule activities linked to cost codes
    SELECT
      COALESCE(cc.division, '00') as div,
      COALESCE(SUM(sa.budgeted_cost), 0) as total_budgeted,
      COALESCE(SUM(sa.budgeted_cost * sa.percent_complete / 100), 0) as earned,
      COALESCE(SUM(
        CASE
          WHEN sa.planned_finish <= p_status_date THEN sa.budgeted_cost
          WHEN sa.planned_start <= p_status_date AND sa.planned_finish > p_status_date THEN
            sa.budgeted_cost *
            GREATEST(0, EXTRACT(DAY FROM p_status_date - sa.planned_start::DATE) + 1) /
            NULLIF(sa.planned_duration, 0)
          ELSE 0
        END
      ), 0) as planned
    FROM schedule_activities sa
    LEFT JOIN cost_codes cc ON sa.activity_code = cc.code
      OR sa.notes LIKE '%' || cc.code || '%'  -- Fallback match
    WHERE sa.project_id = p_project_id
      AND sa.deleted_at IS NULL
      AND sa.activity_type != 'wbs_summary'
    GROUP BY COALESCE(cc.division, '00')
  )
  SELECT
    db.div,
    db.div_name,
    db.bac,
    COALESCE(ds.planned, 0),
    COALESCE(ds.earned, 0),
    db.ac,
    COALESCE(ds.earned, 0) - db.ac as cv,
    COALESCE(ds.earned, 0) - COALESCE(ds.planned, 0) as sv,
    CASE WHEN db.ac > 0 THEN COALESCE(ds.earned, 0) / db.ac ELSE NULL END as cpi,
    CASE WHEN ds.planned > 0 THEN COALESCE(ds.earned, 0) / ds.planned ELSE NULL END as spi,
    CASE WHEN db.ac > 0 AND COALESCE(ds.earned, 0) > 0
      THEN db.bac / (COALESCE(ds.earned, 0) / db.ac)
      ELSE db.bac END as eac,
    CASE WHEN db.bac > 0 THEN COALESCE(ds.earned, 0) / db.bac * 100 ELSE 0 END as pct,
    CASE
      WHEN db.ac = 0 OR COALESCE(ds.earned, 0) = 0 THEN 'unknown'
      WHEN (COALESCE(ds.earned, 0) / db.ac) >= 1.05 THEN 'excellent'
      WHEN (COALESCE(ds.earned, 0) / db.ac) >= 1.0 THEN 'good'
      WHEN (COALESCE(ds.earned, 0) / db.ac) >= 0.95 THEN 'fair'
      WHEN (COALESCE(ds.earned, 0) / db.ac) >= 0.90 THEN 'poor'
      ELSE 'critical'
    END,
    CASE
      WHEN ds.planned IS NULL OR ds.planned = 0 THEN 'unknown'
      WHEN (COALESCE(ds.earned, 0) / ds.planned) >= 1.05 THEN 'excellent'
      WHEN (COALESCE(ds.earned, 0) / ds.planned) >= 1.0 THEN 'good'
      WHEN (COALESCE(ds.earned, 0) / ds.planned) >= 0.95 THEN 'fair'
      WHEN (COALESCE(ds.earned, 0) / ds.planned) >= 0.90 THEN 'poor'
      ELSE 'critical'
    END
  FROM division_budgets db
  LEFT JOIN division_schedule ds ON db.div = ds.div
  ORDER BY db.div;
END;
$$;

-- ============================================================================
-- Function: Create EVM Snapshot
-- ============================================================================

CREATE OR REPLACE FUNCTION create_evm_snapshot(
  p_project_id UUID,
  p_company_id UUID,
  p_status_date DATE DEFAULT CURRENT_DATE,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_snapshot_id UUID;
  v_metrics RECORD;
BEGIN
  -- Get current EVM metrics
  SELECT * INTO v_metrics FROM calculate_evm_metrics(p_project_id, p_status_date);

  -- Insert or update snapshot for this date
  INSERT INTO evm_snapshots (
    project_id,
    company_id,
    status_date,
    bac, pv, ev, ac, cv, sv,
    cpi, spi, csi,
    eac, etc, vac, tcpi_bac, tcpi_eac,
    planned_duration_days, actual_duration_days, estimated_duration_days,
    planned_percent_complete, actual_percent_complete,
    created_by
  )
  VALUES (
    p_project_id,
    p_company_id,
    p_status_date,
    v_metrics.bac, v_metrics.pv, v_metrics.ev, v_metrics.ac, v_metrics.cv, v_metrics.sv,
    v_metrics.cpi, v_metrics.spi, v_metrics.csi,
    v_metrics.eac, v_metrics.etc, v_metrics.vac, v_metrics.tcpi_bac, v_metrics.tcpi_eac,
    v_metrics.planned_duration_days, v_metrics.actual_duration_days, v_metrics.estimated_duration_days,
    v_metrics.percent_complete_planned, v_metrics.percent_complete_actual,
    p_created_by
  )
  ON CONFLICT (project_id, status_date)
  DO UPDATE SET
    bac = EXCLUDED.bac,
    pv = EXCLUDED.pv,
    ev = EXCLUDED.ev,
    ac = EXCLUDED.ac,
    cv = EXCLUDED.cv,
    sv = EXCLUDED.sv,
    cpi = EXCLUDED.cpi,
    spi = EXCLUDED.spi,
    csi = EXCLUDED.csi,
    eac = EXCLUDED.eac,
    etc = EXCLUDED.etc,
    vac = EXCLUDED.vac,
    tcpi_bac = EXCLUDED.tcpi_bac,
    tcpi_eac = EXCLUDED.tcpi_eac,
    planned_duration_days = EXCLUDED.planned_duration_days,
    actual_duration_days = EXCLUDED.actual_duration_days,
    estimated_duration_days = EXCLUDED.estimated_duration_days,
    planned_percent_complete = EXCLUDED.planned_percent_complete,
    actual_percent_complete = EXCLUDED.actual_percent_complete
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

-- ============================================================================
-- Function: Get EVM Trend Data
-- ============================================================================

CREATE OR REPLACE FUNCTION get_evm_trend(
  p_project_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  status_date DATE,
  pv DECIMAL(15, 2),
  ev DECIMAL(15, 2),
  ac DECIMAL(15, 2),
  cpi DECIMAL(8, 4),
  spi DECIMAL(8, 4),
  percent_complete DECIMAL(5, 2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.status_date,
    es.pv,
    es.ev,
    es.ac,
    es.cpi,
    es.spi,
    es.actual_percent_complete
  FROM evm_snapshots es
  WHERE es.project_id = p_project_id
    AND es.status_date >= CURRENT_DATE - p_days
  ORDER BY es.status_date ASC;
END;
$$;

-- ============================================================================
-- Trigger: Update earned_value on schedule_activities when percent_complete changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_activity_earned_value()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate earned_value = budgeted_cost * percent_complete / 100
  NEW.earned_value := COALESCE(NEW.budgeted_cost, 0) * COALESCE(NEW.percent_complete, 0) / 100;
  RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_activity_earned_value'
  ) THEN
    CREATE TRIGGER trg_update_activity_earned_value
      BEFORE INSERT OR UPDATE OF percent_complete, budgeted_cost
      ON schedule_activities
      FOR EACH ROW
      EXECUTE FUNCTION update_activity_earned_value();
  END IF;
END
$$;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE evm_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow users to view snapshots for projects they have access to
CREATE POLICY evm_snapshots_select_policy ON evm_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = evm_snapshots.project_id
        AND pm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.company_id = evm_snapshots.company_id
        AND up.role IN ('owner', 'admin', 'project_manager')
    )
  );

-- Allow PMs and above to create/update snapshots
CREATE POLICY evm_snapshots_insert_policy ON evm_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.company_id = evm_snapshots.company_id
        AND up.role IN ('owner', 'admin', 'project_manager')
    )
  );

CREATE POLICY evm_snapshots_update_policy ON evm_snapshots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.company_id = evm_snapshots.company_id
        AND up.role IN ('owner', 'admin', 'project_manager')
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE evm_snapshots IS 'Historical EVM snapshots for trend analysis and reporting';
COMMENT ON FUNCTION calculate_evm_metrics IS 'Calculate complete EVM metrics for a project as of a status date';
COMMENT ON FUNCTION get_evm_by_division IS 'Get EVM metrics broken down by CSI cost code division';
COMMENT ON FUNCTION create_evm_snapshot IS 'Create or update an EVM snapshot for a project on a given date';
COMMENT ON FUNCTION get_evm_trend IS 'Get historical EVM trend data for charting';
