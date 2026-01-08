-- Migration: 072_weather_history.sql
-- Description: Weather data caching and history for daily reports
-- Date: 2025-12-07

-- =============================================
-- TABLE: weather_history
-- Cache weather data for projects by date
-- =============================================
CREATE TABLE IF NOT EXISTS weather_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Date and Location
  weather_date DATE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,

  -- Weather Conditions
  weather_condition VARCHAR(100),  -- e.g., 'Sunny', 'Cloudy', 'Rain', 'Snow'
  weather_code INTEGER,  -- WMO weather code from Open-Meteo

  -- Temperature (in Fahrenheit for US construction industry)
  temperature_high DECIMAL(5, 1),
  temperature_low DECIMAL(5, 1),
  temperature_avg DECIMAL(5, 1),

  -- Precipitation
  precipitation DECIMAL(6, 2),  -- in inches
  precipitation_probability INTEGER,  -- 0-100%
  snow_depth DECIMAL(6, 2),  -- in inches

  -- Wind
  wind_speed_max DECIMAL(5, 1),  -- mph
  wind_speed_avg DECIMAL(5, 1),  -- mph
  wind_direction INTEGER,  -- degrees

  -- Other conditions
  humidity_percent INTEGER,  -- 0-100%
  uv_index_max DECIMAL(3, 1),
  visibility DECIMAL(6, 2),  -- miles

  -- Sunrise/Sunset (for daylight hours calculation)
  sunrise TIME,
  sunset TIME,
  daylight_hours DECIMAL(4, 2),

  -- Source metadata
  source VARCHAR(50) DEFAULT 'open-meteo',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  raw_response JSONB,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per project per date
  UNIQUE(project_id, weather_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weather_history_project_id ON weather_history(project_id);
CREATE INDEX IF NOT EXISTS idx_weather_history_company_id ON weather_history(company_id);
CREATE INDEX IF NOT EXISTS idx_weather_history_weather_date ON weather_history(weather_date);
CREATE INDEX IF NOT EXISTS idx_weather_history_project_date ON weather_history(project_id, weather_date);

-- Enable RLS
ALTER TABLE weather_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view weather history for their company" ON weather_history;
CREATE POLICY "Users can view weather history for their company" ON weather_history
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert weather history for their company" ON weather_history;
CREATE POLICY "Users can insert weather history for their company" ON weather_history
  FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- TABLE: project_locations
-- Store GPS coordinates for projects
-- =============================================

-- Add location columns to projects table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE projects ADD COLUMN latitude DECIMAL(10, 8);
    ALTER TABLE projects ADD COLUMN longitude DECIMAL(11, 8);
    ALTER TABLE projects ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/New_York';
  END IF;
END$$;

-- =============================================
-- FUNCTION: get_weather_conditions_label
-- Convert WMO weather code to human-readable label
-- =============================================
CREATE OR REPLACE FUNCTION get_weather_conditions_label(weather_code INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN weather_code = 0 THEN 'Clear sky'
    WHEN weather_code IN (1, 2, 3) THEN 'Partly cloudy'
    WHEN weather_code IN (45, 48) THEN 'Foggy'
    WHEN weather_code IN (51, 53, 55) THEN 'Drizzle'
    WHEN weather_code IN (56, 57) THEN 'Freezing drizzle'
    WHEN weather_code IN (61, 63, 65) THEN 'Rain'
    WHEN weather_code IN (66, 67) THEN 'Freezing rain'
    WHEN weather_code IN (71, 73, 75, 77) THEN 'Snow'
    WHEN weather_code IN (80, 81, 82) THEN 'Rain showers'
    WHEN weather_code IN (85, 86) THEN 'Snow showers'
    WHEN weather_code IN (95, 96, 99) THEN 'Thunderstorm'
    ELSE 'Unknown'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- FUNCTION: upsert_weather_history
-- Insert or update weather data for a project/date
-- =============================================
CREATE OR REPLACE FUNCTION upsert_weather_history(
  p_project_id UUID,
  p_company_id UUID,
  p_weather_date DATE,
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_weather_code INTEGER,
  p_temperature_high DECIMAL(5, 1),
  p_temperature_low DECIMAL(5, 1),
  p_precipitation DECIMAL(6, 2),
  p_wind_speed_max DECIMAL(5, 1),
  p_humidity_percent INTEGER,
  p_raw_response JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_weather_condition TEXT;
BEGIN
  v_weather_condition := get_weather_conditions_label(p_weather_code);

  INSERT INTO weather_history (
    project_id, company_id, weather_date, latitude, longitude,
    weather_code, weather_condition, temperature_high, temperature_low,
    temperature_avg, precipitation, wind_speed_max, humidity_percent,
    raw_response, fetched_at
  ) VALUES (
    p_project_id, p_company_id, p_weather_date, p_latitude, p_longitude,
    p_weather_code, v_weather_condition, p_temperature_high, p_temperature_low,
    ROUND((p_temperature_high + p_temperature_low) / 2, 1), p_precipitation,
    p_wind_speed_max, p_humidity_percent, p_raw_response, NOW()
  )
  ON CONFLICT (project_id, weather_date) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    weather_code = EXCLUDED.weather_code,
    weather_condition = EXCLUDED.weather_condition,
    temperature_high = EXCLUDED.temperature_high,
    temperature_low = EXCLUDED.temperature_low,
    temperature_avg = EXCLUDED.temperature_avg,
    precipitation = EXCLUDED.precipitation,
    wind_speed_max = EXCLUDED.wind_speed_max,
    humidity_percent = EXCLUDED.humidity_percent,
    raw_response = EXCLUDED.raw_response,
    fetched_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: get_weather_for_date_range
-- Get weather data for a project over a date range
-- =============================================
CREATE OR REPLACE FUNCTION get_weather_for_date_range(
  p_project_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  weather_date DATE,
  weather_condition VARCHAR(100),
  temperature_high DECIMAL(5, 1),
  temperature_low DECIMAL(5, 1),
  precipitation DECIMAL(6, 2),
  wind_speed_max DECIMAL(5, 1)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wh.weather_date,
    wh.weather_condition,
    wh.temperature_high,
    wh.temperature_low,
    wh.precipitation,
    wh.wind_speed_max
  FROM weather_history wh
  WHERE wh.project_id = p_project_id
    AND wh.weather_date BETWEEN p_start_date AND p_end_date
  ORDER BY wh.weather_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEW: weather_summary
-- Recent weather with project info
-- =============================================
CREATE OR REPLACE VIEW weather_summary AS
SELECT
  wh.id,
  wh.project_id,
  p.name as project_name,
  p.project_number,
  wh.weather_date,
  wh.weather_condition,
  wh.temperature_high,
  wh.temperature_low,
  wh.precipitation,
  wh.wind_speed_max,
  wh.humidity_percent,
  wh.fetched_at
FROM weather_history wh
JOIN projects p ON wh.project_id = p.id
WHERE p.deleted_at IS NULL
ORDER BY wh.weather_date DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 072_weather_history completed successfully';
END $$;
