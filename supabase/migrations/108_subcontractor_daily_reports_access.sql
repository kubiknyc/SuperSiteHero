-- Migration: 108_subcontractor_daily_reports_access.sql
-- Description: Add daily reports view permission to subcontractor portal access

-- ============================================================================
-- Add can_view_daily_reports permission to subcontractor_portal_access
-- ============================================================================

ALTER TABLE subcontractor_portal_access
ADD COLUMN IF NOT EXISTS can_view_daily_reports BOOLEAN NOT NULL DEFAULT false;

-- Comment on the new column
COMMENT ON COLUMN subcontractor_portal_access.can_view_daily_reports IS
  'Permission to view daily reports for assigned projects (read-only)';

-- ============================================================================
-- Create view for subcontractor daily reports
-- Filtered to only show reports for projects where subcontractor has work
-- ============================================================================

CREATE OR REPLACE VIEW subcontractor_daily_reports_view AS
SELECT
  dr.id,
  dr.project_id,
  dr.report_date,
  dr.shift_start_time,
  dr.shift_end_time,
  dr.shift_type,
  dr.total_hours,
  dr.weather_condition,
  dr.temperature_high,
  dr.temperature_low,
  dr.wind_speed,
  dr.precipitation,
  dr.work_summary,
  dr.work_completed,
  dr.work_planned_tomorrow,
  dr.issues,
  dr.observations,
  dr.overall_progress_percentage,
  dr.schedule_status,
  dr.status,
  dr.submitted_at,
  dr.approved_at,
  dr.submitted_by_name,
  dr.approved_by_name,
  dr.created_at,
  dr.updated_at,
  p.name as project_name,
  p.number as project_number,
  up.full_name as reporter_name,
  -- Subcontractor-relevant data (filtered)
  (
    SELECT COUNT(*)
    FROM daily_report_workforce_v2 drw
    WHERE drw.daily_report_id = dr.id
  ) as workforce_count,
  (
    SELECT COUNT(*)
    FROM daily_report_equipment_v2 dre
    WHERE dre.daily_report_id = dr.id
  ) as equipment_count,
  (
    SELECT COUNT(*)
    FROM daily_report_deliveries_v2 drd
    WHERE drd.daily_report_id = dr.id
  ) as deliveries_count,
  (
    SELECT COUNT(*)
    FROM daily_report_photos_v2 drp
    WHERE drp.daily_report_id = dr.id
  ) as photos_count
FROM daily_reports_v2 dr
JOIN projects p ON dr.project_id = p.id
LEFT JOIN user_profiles up ON dr.reporter_id = up.id
WHERE dr.deleted_at IS NULL
  AND dr.status IN ('submitted', 'approved'); -- Only show submitted/approved reports

-- ============================================================================
-- Function to get daily reports accessible to a subcontractor
-- ============================================================================

CREATE OR REPLACE FUNCTION get_subcontractor_daily_reports(
  p_subcontractor_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  project_name TEXT,
  project_number TEXT,
  report_date DATE,
  reporter_name TEXT,
  shift_type TEXT,
  total_hours DECIMAL,
  weather_condition TEXT,
  temperature_high DECIMAL,
  temperature_low DECIMAL,
  work_summary TEXT,
  overall_progress_percentage DECIMAL,
  schedule_status TEXT,
  status TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  workforce_count BIGINT,
  equipment_count BIGINT,
  deliveries_count BIGINT,
  photos_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.project_id,
    v.project_name,
    v.project_number,
    v.report_date,
    v.reporter_name,
    v.shift_type,
    v.total_hours,
    v.weather_condition,
    v.temperature_high,
    v.temperature_low,
    v.work_summary,
    v.overall_progress_percentage,
    v.schedule_status,
    v.status,
    v.submitted_at,
    v.approved_at,
    v.workforce_count,
    v.equipment_count,
    v.deliveries_count,
    v.photos_count,
    v.created_at
  FROM subcontractor_daily_reports_view v
  WHERE EXISTS (
    -- Must have portal access with daily reports permission
    SELECT 1 FROM subcontractor_portal_access spa
    WHERE spa.subcontractor_id = p_subcontractor_id
      AND spa.project_id = v.project_id
      AND spa.is_active = true
      AND spa.can_view_daily_reports = true
  )
  AND (p_project_id IS NULL OR v.project_id = p_project_id)
  AND (p_date_from IS NULL OR v.report_date >= p_date_from)
  AND (p_date_to IS NULL OR v.report_date <= p_date_to)
  ORDER BY v.report_date DESC, v.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- Function to get single daily report for subcontractor
-- ============================================================================

CREATE OR REPLACE FUNCTION get_subcontractor_daily_report_detail(
  p_subcontractor_id UUID,
  p_report_id UUID
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  project_name TEXT,
  project_number TEXT,
  report_date DATE,
  reporter_name TEXT,
  shift_start_time TIME,
  shift_end_time TIME,
  shift_type TEXT,
  total_hours DECIMAL,
  weather_condition TEXT,
  temperature_high DECIMAL,
  temperature_low DECIMAL,
  wind_speed DECIMAL,
  precipitation DECIMAL,
  work_summary TEXT,
  work_completed TEXT,
  work_planned_tomorrow TEXT,
  issues TEXT,
  observations TEXT,
  overall_progress_percentage DECIMAL,
  schedule_status TEXT,
  status TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  submitted_by_name TEXT,
  approved_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.project_id,
    v.project_name,
    v.project_number,
    v.report_date,
    v.reporter_name,
    v.shift_start_time,
    v.shift_end_time,
    v.shift_type,
    v.total_hours,
    v.weather_condition,
    v.temperature_high,
    v.temperature_low,
    v.wind_speed,
    v.precipitation,
    v.work_summary,
    v.work_completed,
    v.work_planned_tomorrow,
    v.issues,
    v.observations,
    v.overall_progress_percentage,
    v.schedule_status,
    v.status,
    v.submitted_at,
    v.approved_at,
    v.submitted_by_name,
    v.approved_by_name,
    v.created_at
  FROM subcontractor_daily_reports_view v
  WHERE v.id = p_report_id
    AND EXISTS (
      -- Must have portal access with daily reports permission
      SELECT 1 FROM subcontractor_portal_access spa
      WHERE spa.subcontractor_id = p_subcontractor_id
        AND spa.project_id = v.project_id
        AND spa.is_active = true
        AND spa.can_view_daily_reports = true
    );
END;
$$;

-- ============================================================================
-- Function to get daily report workforce for subcontractor view
-- ============================================================================

CREATE OR REPLACE FUNCTION get_subcontractor_daily_report_workforce(
  p_subcontractor_id UUID,
  p_report_id UUID
)
RETURNS TABLE (
  id UUID,
  crew_name TEXT,
  trade TEXT,
  headcount INTEGER,
  hours_worked DECIMAL,
  work_description TEXT,
  company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify access first
  IF NOT EXISTS (
    SELECT 1 FROM daily_reports_v2 dr
    JOIN subcontractor_portal_access spa ON spa.project_id = dr.project_id
    WHERE dr.id = p_report_id
      AND spa.subcontractor_id = p_subcontractor_id
      AND spa.is_active = true
      AND spa.can_view_daily_reports = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    w.id,
    w.crew_name,
    w.trade,
    w.headcount,
    w.hours_worked,
    w.work_description,
    COALESCE(s.company_name, w.company_name) as company_name
  FROM daily_report_workforce_v2 w
  LEFT JOIN subcontractors s ON w.subcontractor_id = s.id
  WHERE w.daily_report_id = p_report_id
  ORDER BY w.crew_name;
END;
$$;

-- ============================================================================
-- Function to get daily report equipment for subcontractor view
-- ============================================================================

CREATE OR REPLACE FUNCTION get_subcontractor_daily_report_equipment(
  p_subcontractor_id UUID,
  p_report_id UUID
)
RETURNS TABLE (
  id UUID,
  equipment_name TEXT,
  equipment_type TEXT,
  ownership_type TEXT,
  hours_used DECIMAL,
  operator_name TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify access first
  IF NOT EXISTS (
    SELECT 1 FROM daily_reports_v2 dr
    JOIN subcontractor_portal_access spa ON spa.project_id = dr.project_id
    WHERE dr.id = p_report_id
      AND spa.subcontractor_id = p_subcontractor_id
      AND spa.is_active = true
      AND spa.can_view_daily_reports = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.equipment_name,
    e.equipment_type,
    e.ownership_type,
    e.hours_used,
    e.operator_name,
    e.notes
  FROM daily_report_equipment_v2 e
  WHERE e.daily_report_id = p_report_id
  ORDER BY e.equipment_name;
END;
$$;

-- ============================================================================
-- Function to get daily report photos for subcontractor view
-- ============================================================================

CREATE OR REPLACE FUNCTION get_subcontractor_daily_report_photos(
  p_subcontractor_id UUID,
  p_report_id UUID
)
RETURNS TABLE (
  id UUID,
  photo_url TEXT,
  caption TEXT,
  category TEXT,
  taken_at TIMESTAMPTZ,
  location TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify access first
  IF NOT EXISTS (
    SELECT 1 FROM daily_reports_v2 dr
    JOIN subcontractor_portal_access spa ON spa.project_id = dr.project_id
    WHERE dr.id = p_report_id
      AND spa.subcontractor_id = p_subcontractor_id
      AND spa.is_active = true
      AND spa.can_view_daily_reports = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.photo_url,
    p.caption,
    p.category,
    p.taken_at,
    p.location
  FROM daily_report_photos_v2 p
  WHERE p.daily_report_id = p_report_id
  ORDER BY p.taken_at DESC NULLS LAST;
END;
$$;

-- ============================================================================
-- RLS Policies (if needed)
-- ============================================================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_subcontractor_daily_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_subcontractor_daily_report_detail TO authenticated;
GRANT EXECUTE ON FUNCTION get_subcontractor_daily_report_workforce TO authenticated;
GRANT EXECUTE ON FUNCTION get_subcontractor_daily_report_equipment TO authenticated;
GRANT EXECUTE ON FUNCTION get_subcontractor_daily_report_photos TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION get_subcontractor_daily_reports IS
  'Get list of daily reports accessible to a subcontractor based on their portal permissions';
COMMENT ON FUNCTION get_subcontractor_daily_report_detail IS
  'Get detailed daily report for subcontractor with permission check';
COMMENT ON FUNCTION get_subcontractor_daily_report_workforce IS
  'Get workforce entries for a daily report (subcontractor view)';
COMMENT ON FUNCTION get_subcontractor_daily_report_equipment IS
  'Get equipment entries for a daily report (subcontractor view)';
COMMENT ON FUNCTION get_subcontractor_daily_report_photos IS
  'Get photos for a daily report (subcontractor view)';
