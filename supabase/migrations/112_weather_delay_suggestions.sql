-- Migration: 112_weather_delay_suggestions.sql
-- Description: Weather delay auto-suggestion tracking and integration
-- Date: 2024-12-13

-- =============================================
-- TABLE: weather_delay_suggestions
-- Track weather-based delay suggestions and their usage
-- =============================================
CREATE TABLE IF NOT EXISTS weather_delay_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE SET NULL,

  -- Suggestion details
  suggestion_date DATE NOT NULL,
  delay_type VARCHAR(50) NOT NULL, -- rain, heavy_rain, snow, ice, extreme_heat, extreme_cold, high_wind, lightning, fog, flooding
  title VARCHAR(200) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  estimated_hours DECIMAL(4, 1),

  -- Weather conditions that triggered the suggestion
  weather_condition VARCHAR(100),
  temperature_high DECIMAL(5, 1),
  temperature_low DECIMAL(5, 1),
  precipitation DECIMAL(6, 2),
  wind_speed DECIMAL(5, 1),
  snow_depth DECIMAL(6, 2),

  -- Affected work
  affected_activities TEXT[], -- Array of affected activities
  safety_concerns TEXT[], -- Array of safety concerns

  -- Suggestion status
  status VARCHAR(20) DEFAULT 'suggested', -- suggested, accepted, rejected, expired
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Link to actual delay entry if accepted
  delay_entry_id UUID,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weather_delay_suggestions_project_id
  ON weather_delay_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_weather_delay_suggestions_company_id
  ON weather_delay_suggestions(company_id);
CREATE INDEX IF NOT EXISTS idx_weather_delay_suggestions_date
  ON weather_delay_suggestions(suggestion_date);
CREATE INDEX IF NOT EXISTS idx_weather_delay_suggestions_status
  ON weather_delay_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_weather_delay_suggestions_daily_report
  ON weather_delay_suggestions(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_weather_delay_suggestions_delay_type
  ON weather_delay_suggestions(delay_type);

-- Enable RLS
ALTER TABLE weather_delay_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view weather suggestions for their company" ON weather_delay_suggestions;
CREATE POLICY "Users can view weather suggestions for their company" ON weather_delay_suggestions
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert weather suggestions for their company" ON weather_delay_suggestions;
CREATE POLICY "Users can insert weather suggestions for their company" ON weather_delay_suggestions
  FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update weather suggestions for their company" ON weather_delay_suggestions;
CREATE POLICY "Users can update weather suggestions for their company" ON weather_delay_suggestions
  FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- TABLE: weather_delay_analytics
-- Aggregate weather delay statistics per project/month
-- =============================================
CREATE TABLE IF NOT EXISTS weather_delay_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,

  -- Aggregated statistics
  total_suggestions INTEGER DEFAULT 0,
  accepted_suggestions INTEGER DEFAULT 0,
  rejected_suggestions INTEGER DEFAULT 0,
  total_delay_hours DECIMAL(8, 2) DEFAULT 0,

  -- Breakdown by delay type
  rain_delays INTEGER DEFAULT 0,
  rain_hours DECIMAL(6, 2) DEFAULT 0,
  snow_delays INTEGER DEFAULT 0,
  snow_hours DECIMAL(6, 2) DEFAULT 0,
  heat_delays INTEGER DEFAULT 0,
  heat_hours DECIMAL(6, 2) DEFAULT 0,
  cold_delays INTEGER DEFAULT 0,
  cold_hours DECIMAL(6, 2) DEFAULT 0,
  wind_delays INTEGER DEFAULT 0,
  wind_hours DECIMAL(6, 2) DEFAULT 0,
  lightning_delays INTEGER DEFAULT 0,
  lightning_hours DECIMAL(6, 2) DEFAULT 0,
  other_delays INTEGER DEFAULT 0,
  other_hours DECIMAL(6, 2) DEFAULT 0,

  -- Weather conditions summary
  avg_temperature_high DECIMAL(5, 1),
  avg_temperature_low DECIMAL(5, 1),
  total_precipitation DECIMAL(8, 2),
  max_wind_speed DECIMAL(5, 1),
  total_snow_accumulation DECIMAL(8, 2),

  -- Impact assessment
  estimated_cost_impact DECIMAL(12, 2),
  schedule_impact_days INTEGER DEFAULT 0,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per project per month
  UNIQUE(project_id, year, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weather_delay_analytics_project
  ON weather_delay_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_weather_delay_analytics_company
  ON weather_delay_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_weather_delay_analytics_period
  ON weather_delay_analytics(year, month);

-- Enable RLS
ALTER TABLE weather_delay_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view weather analytics for their company" ON weather_delay_analytics;
CREATE POLICY "Users can view weather analytics for their company" ON weather_delay_analytics
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage weather analytics for their company" ON weather_delay_analytics;
CREATE POLICY "Users can manage weather analytics for their company" ON weather_delay_analytics
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- FUNCTION: record_weather_delay_suggestion
-- Record a new weather delay suggestion
-- =============================================
CREATE OR REPLACE FUNCTION record_weather_delay_suggestion(
  p_project_id UUID,
  p_company_id UUID,
  p_suggestion_date DATE,
  p_delay_type VARCHAR(50),
  p_title VARCHAR(200),
  p_description TEXT,
  p_severity VARCHAR(20),
  p_estimated_hours DECIMAL(4, 1),
  p_weather_condition VARCHAR(100) DEFAULT NULL,
  p_temperature_high DECIMAL(5, 1) DEFAULT NULL,
  p_temperature_low DECIMAL(5, 1) DEFAULT NULL,
  p_precipitation DECIMAL(6, 2) DEFAULT NULL,
  p_wind_speed DECIMAL(5, 1) DEFAULT NULL,
  p_affected_activities TEXT[] DEFAULT NULL,
  p_safety_concerns TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO weather_delay_suggestions (
    project_id,
    company_id,
    suggestion_date,
    delay_type,
    title,
    description,
    severity,
    estimated_hours,
    weather_condition,
    temperature_high,
    temperature_low,
    precipitation,
    wind_speed,
    affected_activities,
    safety_concerns,
    created_by
  ) VALUES (
    p_project_id,
    p_company_id,
    p_suggestion_date,
    p_delay_type,
    p_title,
    p_description,
    p_severity,
    p_estimated_hours,
    p_weather_condition,
    p_temperature_high,
    p_temperature_low,
    p_precipitation,
    p_wind_speed,
    p_affected_activities,
    p_safety_concerns,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: accept_weather_delay_suggestion
-- Mark a suggestion as accepted and optionally link to delay entry
-- =============================================
CREATE OR REPLACE FUNCTION accept_weather_delay_suggestion(
  p_suggestion_id UUID,
  p_daily_report_id UUID DEFAULT NULL,
  p_delay_entry_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE weather_delay_suggestions
  SET
    status = 'accepted',
    accepted_at = NOW(),
    daily_report_id = COALESCE(p_daily_report_id, daily_report_id),
    delay_entry_id = p_delay_entry_id,
    updated_at = NOW()
  WHERE id = p_suggestion_id
    AND company_id IN (SELECT company_id FROM users WHERE id = auth.uid());

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: reject_weather_delay_suggestion
-- Mark a suggestion as rejected with optional reason
-- =============================================
CREATE OR REPLACE FUNCTION reject_weather_delay_suggestion(
  p_suggestion_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE weather_delay_suggestions
  SET
    status = 'rejected',
    rejected_at = NOW(),
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_suggestion_id
    AND company_id IN (SELECT company_id FROM users WHERE id = auth.uid());

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: calculate_weather_delay_analytics
-- Calculate monthly weather delay analytics for a project
-- =============================================
CREATE OR REPLACE FUNCTION calculate_weather_delay_analytics(
  p_project_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
  v_result UUID;
  v_stats RECORD;
BEGIN
  -- Get company_id from project
  SELECT company_id INTO v_company_id
  FROM projects
  WHERE id = p_project_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Calculate statistics from suggestions
  SELECT
    COUNT(*) as total_suggestions,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_suggestions,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_suggestions,
    COALESCE(SUM(estimated_hours) FILTER (WHERE status = 'accepted'), 0) as total_delay_hours,
    COUNT(*) FILTER (WHERE delay_type IN ('rain', 'heavy_rain')) as rain_delays,
    COALESCE(SUM(estimated_hours) FILTER (WHERE delay_type IN ('rain', 'heavy_rain') AND status = 'accepted'), 0) as rain_hours,
    COUNT(*) FILTER (WHERE delay_type = 'snow') as snow_delays,
    COALESCE(SUM(estimated_hours) FILTER (WHERE delay_type = 'snow' AND status = 'accepted'), 0) as snow_hours,
    COUNT(*) FILTER (WHERE delay_type = 'extreme_heat') as heat_delays,
    COALESCE(SUM(estimated_hours) FILTER (WHERE delay_type = 'extreme_heat' AND status = 'accepted'), 0) as heat_hours,
    COUNT(*) FILTER (WHERE delay_type = 'extreme_cold') as cold_delays,
    COALESCE(SUM(estimated_hours) FILTER (WHERE delay_type = 'extreme_cold' AND status = 'accepted'), 0) as cold_hours,
    COUNT(*) FILTER (WHERE delay_type = 'high_wind') as wind_delays,
    COALESCE(SUM(estimated_hours) FILTER (WHERE delay_type = 'high_wind' AND status = 'accepted'), 0) as wind_hours,
    COUNT(*) FILTER (WHERE delay_type = 'lightning') as lightning_delays,
    COALESCE(SUM(estimated_hours) FILTER (WHERE delay_type = 'lightning' AND status = 'accepted'), 0) as lightning_hours,
    COUNT(*) FILTER (WHERE delay_type IN ('fog', 'flooding', 'ice')) as other_delays,
    COALESCE(SUM(estimated_hours) FILTER (WHERE delay_type IN ('fog', 'flooding', 'ice') AND status = 'accepted'), 0) as other_hours,
    AVG(temperature_high) as avg_temperature_high,
    AVG(temperature_low) as avg_temperature_low,
    COALESCE(SUM(precipitation), 0) as total_precipitation,
    MAX(wind_speed) as max_wind_speed,
    COALESCE(SUM(snow_depth), 0) as total_snow_accumulation
  INTO v_stats
  FROM weather_delay_suggestions
  WHERE project_id = p_project_id
    AND EXTRACT(YEAR FROM suggestion_date) = p_year
    AND EXTRACT(MONTH FROM suggestion_date) = p_month;

  -- Upsert analytics record
  INSERT INTO weather_delay_analytics (
    project_id,
    company_id,
    year,
    month,
    total_suggestions,
    accepted_suggestions,
    rejected_suggestions,
    total_delay_hours,
    rain_delays,
    rain_hours,
    snow_delays,
    snow_hours,
    heat_delays,
    heat_hours,
    cold_delays,
    cold_hours,
    wind_delays,
    wind_hours,
    lightning_delays,
    lightning_hours,
    other_delays,
    other_hours,
    avg_temperature_high,
    avg_temperature_low,
    total_precipitation,
    max_wind_speed,
    total_snow_accumulation,
    calculated_at
  ) VALUES (
    p_project_id,
    v_company_id,
    p_year,
    p_month,
    v_stats.total_suggestions,
    v_stats.accepted_suggestions,
    v_stats.rejected_suggestions,
    v_stats.total_delay_hours,
    v_stats.rain_delays,
    v_stats.rain_hours,
    v_stats.snow_delays,
    v_stats.snow_hours,
    v_stats.heat_delays,
    v_stats.heat_hours,
    v_stats.cold_delays,
    v_stats.cold_hours,
    v_stats.wind_delays,
    v_stats.wind_hours,
    v_stats.lightning_delays,
    v_stats.lightning_hours,
    v_stats.other_delays,
    v_stats.other_hours,
    v_stats.avg_temperature_high,
    v_stats.avg_temperature_low,
    v_stats.total_precipitation,
    v_stats.max_wind_speed,
    v_stats.total_snow_accumulation,
    NOW()
  )
  ON CONFLICT (project_id, year, month) DO UPDATE SET
    total_suggestions = EXCLUDED.total_suggestions,
    accepted_suggestions = EXCLUDED.accepted_suggestions,
    rejected_suggestions = EXCLUDED.rejected_suggestions,
    total_delay_hours = EXCLUDED.total_delay_hours,
    rain_delays = EXCLUDED.rain_delays,
    rain_hours = EXCLUDED.rain_hours,
    snow_delays = EXCLUDED.snow_delays,
    snow_hours = EXCLUDED.snow_hours,
    heat_delays = EXCLUDED.heat_delays,
    heat_hours = EXCLUDED.heat_hours,
    cold_delays = EXCLUDED.cold_delays,
    cold_hours = EXCLUDED.cold_hours,
    wind_delays = EXCLUDED.wind_delays,
    wind_hours = EXCLUDED.wind_hours,
    lightning_delays = EXCLUDED.lightning_delays,
    lightning_hours = EXCLUDED.lightning_hours,
    other_delays = EXCLUDED.other_delays,
    other_hours = EXCLUDED.other_hours,
    avg_temperature_high = EXCLUDED.avg_temperature_high,
    avg_temperature_low = EXCLUDED.avg_temperature_low,
    total_precipitation = EXCLUDED.total_precipitation,
    max_wind_speed = EXCLUDED.max_wind_speed,
    total_snow_accumulation = EXCLUDED.total_snow_accumulation,
    calculated_at = NOW()
  RETURNING id INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEW: weather_delay_summary
-- Quick view of recent weather delays with project info
-- =============================================
CREATE OR REPLACE VIEW weather_delay_summary AS
SELECT
  wds.id,
  wds.project_id,
  p.name as project_name,
  p.project_number,
  wds.suggestion_date,
  wds.delay_type,
  wds.title,
  wds.severity,
  wds.estimated_hours,
  wds.status,
  wds.weather_condition,
  wds.temperature_high,
  wds.temperature_low,
  wds.precipitation,
  wds.wind_speed,
  wds.created_at
FROM weather_delay_suggestions wds
JOIN projects p ON wds.project_id = p.id
WHERE p.deleted_at IS NULL
ORDER BY wds.suggestion_date DESC, wds.severity DESC;

-- =============================================
-- Add weather-related columns to daily_reports if not exists
-- =============================================
DO $$
BEGIN
  -- Add weather_delay_reason column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_reports' AND column_name = 'weather_delay_reason'
  ) THEN
    ALTER TABLE daily_reports ADD COLUMN weather_delay_reason VARCHAR(50);
    COMMENT ON COLUMN daily_reports.weather_delay_reason IS 'Type of weather delay: rain, snow, ice, heat, cold, wind, lightning, fog, flooding';
  END IF;

  -- Add weather_suggestion_id column to link to suggestion that was accepted
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_reports' AND column_name = 'weather_suggestion_id'
  ) THEN
    ALTER TABLE daily_reports ADD COLUMN weather_suggestion_id UUID REFERENCES weather_delay_suggestions(id);
    COMMENT ON COLUMN daily_reports.weather_suggestion_id IS 'Reference to weather delay suggestion that was accepted';
  END IF;
END$$;

-- =============================================
-- Add weather_history_id to daily_reports
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_reports' AND column_name = 'weather_history_id'
  ) THEN
    ALTER TABLE daily_reports ADD COLUMN weather_history_id UUID REFERENCES weather_history(id);
    COMMENT ON COLUMN daily_reports.weather_history_id IS 'Reference to cached weather data for the report date';
  END IF;
END$$;

-- =============================================
-- Create index for weather history link
-- =============================================
CREATE INDEX IF NOT EXISTS idx_daily_reports_weather_history
  ON daily_reports(weather_history_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_weather_suggestion
  ON daily_reports(weather_suggestion_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 112_weather_delay_suggestions completed successfully';
END $$;
