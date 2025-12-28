-- =============================================
-- Migration: 153_daily_report_cost_aggregation.sql
-- Description: Create views for aggregating daily report costs by cost code
-- Date: 2025-12-26
-- Purpose: Enable work_performed_by_cost_code, labor_by_cost_code, equipment_by_cost_code reporting
-- =============================================

-- =============================================
-- VIEW 1: labor_by_cost_code
-- Aggregates workforce hours by cost code and date
-- =============================================

CREATE OR REPLACE VIEW labor_by_cost_code AS
SELECT
  dr.project_id,
  dr.report_date,
  drw.cost_code,
  drw.phase_code,
  COUNT(DISTINCT drw.id) as entry_count,
  SUM(COALESCE(drw.headcount, 1)) as total_headcount,
  SUM(COALESCE(drw.hours_regular, 0)) as total_regular_hours,
  SUM(COALESCE(drw.hours_overtime, 0)) as total_overtime_hours,
  SUM(COALESCE(drw.hours_double_time, 0)) as total_double_time_hours,
  SUM(
    COALESCE(drw.hours_regular, 0) +
    COALESCE(drw.hours_overtime, 0) +
    COALESCE(drw.hours_double_time, 0)
  ) as total_hours,
  SUM(
    COALESCE(drw.hours_regular, 0) +
    COALESCE(drw.hours_overtime, 0) * 1.5 +
    COALESCE(drw.hours_double_time, 0) * 2
  ) as total_weighted_hours
FROM daily_reports dr
JOIN daily_report_workforce drw ON dr.id = drw.daily_report_id
WHERE dr.deleted_at IS NULL
  AND drw.cost_code IS NOT NULL
  AND drw.cost_code != ''
GROUP BY dr.project_id, dr.report_date, drw.cost_code, drw.phase_code;

COMMENT ON VIEW labor_by_cost_code IS 'Aggregates workforce labor hours by cost code, phase, project, and date for cost tracking';

-- =============================================
-- VIEW 2: equipment_by_cost_code
-- Aggregates equipment usage by cost code and date
-- =============================================

CREATE OR REPLACE VIEW equipment_by_cost_code AS
SELECT
  dr.project_id,
  dr.report_date,
  dre.cost_code,
  COUNT(DISTINCT dre.id) as entry_count,
  SUM(COALESCE(dre.hours_operated, 0)) as total_operated_hours,
  SUM(COALESCE(dre.hours_idle, 0)) as total_idle_hours,
  SUM(COALESCE(dre.hours_breakdown, 0)) as total_breakdown_hours,
  SUM(COALESCE(dre.fuel_used, 0)) as total_fuel_used
FROM daily_reports dr
JOIN daily_report_equipment dre ON dr.id = dre.daily_report_id
WHERE dr.deleted_at IS NULL
  AND dre.cost_code IS NOT NULL
  AND dre.cost_code != ''
GROUP BY dr.project_id, dr.report_date, dre.cost_code;

COMMENT ON VIEW equipment_by_cost_code IS 'Aggregates equipment usage hours and fuel by cost code, project, and date for cost tracking';

-- =============================================
-- VIEW 3: progress_by_cost_code
-- Aggregates production/progress by cost code and date
-- =============================================

CREATE OR REPLACE VIEW progress_by_cost_code AS
SELECT
  dr.project_id,
  dr.report_date,
  drp.cost_code,
  drp.unit_of_measure,
  COUNT(DISTINCT drp.id) as entry_count,
  SUM(COALESCE(drp.planned_quantity_today, 0)) as total_planned_quantity,
  SUM(COALESCE(drp.actual_quantity_today, 0)) as total_actual_quantity,
  CASE
    WHEN SUM(COALESCE(drp.planned_quantity_today, 0)) > 0
    THEN ROUND(
      (SUM(COALESCE(drp.actual_quantity_today, 0))::DECIMAL /
       SUM(COALESCE(drp.planned_quantity_today, 0))) * 100,
      2
    )
    ELSE 0
  END as productivity_percentage
FROM daily_reports dr
JOIN daily_report_progress drp ON dr.id = drp.daily_report_id
WHERE dr.deleted_at IS NULL
  AND drp.cost_code IS NOT NULL
  AND drp.cost_code != ''
GROUP BY dr.project_id, dr.report_date, drp.cost_code, drp.unit_of_measure;

COMMENT ON VIEW progress_by_cost_code IS 'Aggregates production quantities by cost code, unit of measure, project, and date';

-- =============================================
-- VIEW 4: work_performed_by_cost_code
-- Comprehensive view combining labor, equipment, and progress
-- =============================================

CREATE OR REPLACE VIEW work_performed_by_cost_code AS
SELECT
  project_id,
  report_date,
  cost_code,
  SUM(labor_hours) as total_labor_hours,
  SUM(labor_weighted_hours) as total_labor_weighted_hours,
  SUM(equipment_hours) as total_equipment_hours,
  SUM(quantity_installed) as total_quantity_installed,
  SUM(headcount) as total_headcount,
  SUM(equipment_count) as total_equipment_count
FROM (
  -- Labor data
  SELECT
    project_id,
    report_date,
    cost_code,
    total_hours as labor_hours,
    total_weighted_hours as labor_weighted_hours,
    0::DECIMAL as equipment_hours,
    0::DECIMAL as quantity_installed,
    total_headcount::DECIMAL as headcount,
    0::DECIMAL as equipment_count
  FROM labor_by_cost_code

  UNION ALL

  -- Equipment data
  SELECT
    project_id,
    report_date,
    cost_code,
    0::DECIMAL as labor_hours,
    0::DECIMAL as labor_weighted_hours,
    total_operated_hours as equipment_hours,
    0::DECIMAL as quantity_installed,
    0::DECIMAL as headcount,
    entry_count::DECIMAL as equipment_count
  FROM equipment_by_cost_code

  UNION ALL

  -- Progress/quantity data
  SELECT
    project_id,
    report_date,
    cost_code,
    0::DECIMAL as labor_hours,
    0::DECIMAL as labor_weighted_hours,
    0::DECIMAL as equipment_hours,
    total_actual_quantity as quantity_installed,
    0::DECIMAL as headcount,
    0::DECIMAL as equipment_count
  FROM progress_by_cost_code
) combined
GROUP BY project_id, report_date, cost_code;

COMMENT ON VIEW work_performed_by_cost_code IS 'Comprehensive view combining labor, equipment, and progress data by cost code for daily report cost tracking';

-- =============================================
-- VIEW 5: daily_report_cost_summary
-- Project-level summary with cost code details joined
-- =============================================

CREATE OR REPLACE VIEW daily_report_cost_summary AS
SELECT
  w.project_id,
  w.report_date,
  w.cost_code,
  cc.name as cost_code_name,
  cc.division,
  cc.description as cost_code_description,
  w.total_labor_hours,
  w.total_labor_weighted_hours,
  w.total_equipment_hours,
  w.total_quantity_installed,
  w.total_headcount,
  w.total_equipment_count
FROM work_performed_by_cost_code w
LEFT JOIN cost_codes cc ON cc.code = w.cost_code AND cc.deleted_at IS NULL;

COMMENT ON VIEW daily_report_cost_summary IS 'Daily report cost summary with cost code details for reporting';

-- =============================================
-- FUNCTION: Get project cost summary by date range
-- =============================================

CREATE OR REPLACE FUNCTION get_project_cost_by_date_range(
  p_project_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  cost_code VARCHAR,
  cost_code_name VARCHAR,
  division VARCHAR,
  total_labor_hours DECIMAL,
  total_labor_weighted_hours DECIMAL,
  total_equipment_hours DECIMAL,
  total_quantity_installed DECIMAL,
  total_headcount DECIMAL,
  day_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.cost_code::VARCHAR,
    cc.name::VARCHAR as cost_code_name,
    cc.division::VARCHAR,
    SUM(w.total_labor_hours)::DECIMAL as total_labor_hours,
    SUM(w.total_labor_weighted_hours)::DECIMAL as total_labor_weighted_hours,
    SUM(w.total_equipment_hours)::DECIMAL as total_equipment_hours,
    SUM(w.total_quantity_installed)::DECIMAL as total_quantity_installed,
    SUM(w.total_headcount)::DECIMAL as total_headcount,
    COUNT(DISTINCT w.report_date) as day_count
  FROM work_performed_by_cost_code w
  LEFT JOIN cost_codes cc ON cc.code = w.cost_code AND cc.deleted_at IS NULL
  WHERE w.project_id = p_project_id
    AND w.report_date >= p_start_date
    AND w.report_date <= p_end_date
  GROUP BY w.cost_code, cc.name, cc.division
  ORDER BY w.cost_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_project_cost_by_date_range IS 'Returns aggregated cost data by cost code for a project within a date range';

-- =============================================
-- FUNCTION: Get daily cost trend for a project
-- =============================================

CREATE OR REPLACE FUNCTION get_daily_cost_trend(
  p_project_id UUID,
  p_cost_code VARCHAR DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  report_date DATE,
  total_labor_hours DECIMAL,
  total_equipment_hours DECIMAL,
  total_quantity_installed DECIMAL,
  total_headcount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.report_date,
    SUM(w.total_labor_hours)::DECIMAL as total_labor_hours,
    SUM(w.total_equipment_hours)::DECIMAL as total_equipment_hours,
    SUM(w.total_quantity_installed)::DECIMAL as total_quantity_installed,
    SUM(w.total_headcount)::DECIMAL as total_headcount
  FROM work_performed_by_cost_code w
  WHERE w.project_id = p_project_id
    AND w.report_date >= CURRENT_DATE - p_days
    AND (p_cost_code IS NULL OR w.cost_code = p_cost_code)
  GROUP BY w.report_date
  ORDER BY w.report_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_daily_cost_trend IS 'Returns daily trend of costs for a project, optionally filtered by cost code';

-- =============================================
-- Indexes for performance on base tables
-- =============================================

-- Ensure indexes exist on cost_code columns
CREATE INDEX IF NOT EXISTS idx_daily_report_workforce_cost_code
  ON daily_report_workforce(cost_code)
  WHERE cost_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_report_equipment_cost_code
  ON daily_report_equipment(cost_code)
  WHERE cost_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_report_progress_cost_code
  ON daily_report_progress(cost_code)
  WHERE cost_code IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_date
  ON daily_reports(project_id, report_date)
  WHERE deleted_at IS NULL;

-- =============================================
-- Grant permissions
-- =============================================

GRANT SELECT ON labor_by_cost_code TO authenticated;
GRANT SELECT ON equipment_by_cost_code TO authenticated;
GRANT SELECT ON progress_by_cost_code TO authenticated;
GRANT SELECT ON work_performed_by_cost_code TO authenticated;
GRANT SELECT ON daily_report_cost_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_cost_by_date_range TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_cost_trend TO authenticated;
