-- Migration 015: Weather Logs
-- Track daily weather conditions and their impact on construction activities

-- Create weather_logs table
CREATE TABLE IF NOT EXISTS weather_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Temperature data (Fahrenheit)
  temperature_high INTEGER CHECK (temperature_high >= -50 AND temperature_high <= 150),
  temperature_low INTEGER CHECK (temperature_low >= -50 AND temperature_low <= 150),

  -- Weather conditions
  conditions TEXT NOT NULL CHECK (conditions IN (
    'sunny', 'partly_cloudy', 'cloudy', 'overcast',
    'rain', 'heavy_rain', 'drizzle',
    'snow', 'heavy_snow', 'sleet', 'hail',
    'fog', 'wind', 'storm', 'thunderstorm'
  )),

  -- Precipitation data
  precipitation_amount NUMERIC(5, 2) DEFAULT 0 CHECK (precipitation_amount >= 0),
  precipitation_type TEXT DEFAULT 'none' CHECK (precipitation_type IN (
    'none', 'rain', 'snow', 'sleet', 'hail', 'mixed'
  )),

  -- Wind data
  wind_speed INTEGER CHECK (wind_speed >= 0 AND wind_speed <= 200),
  wind_direction TEXT CHECK (wind_direction IN (
    'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'variable'
  )),

  -- Additional weather data
  humidity_percent INTEGER CHECK (humidity_percent >= 0 AND humidity_percent <= 100),

  -- Work impact tracking
  work_impact TEXT NOT NULL DEFAULT 'none' CHECK (work_impact IN (
    'none', 'minor', 'moderate', 'severe'
  )),
  impact_notes TEXT,
  work_stopped BOOLEAN DEFAULT false,
  hours_lost NUMERIC(5, 2) DEFAULT 0 CHECK (hours_lost >= 0),
  affected_activities TEXT[] DEFAULT '{}',
  safety_concerns TEXT,

  -- Photo documentation
  photo_urls TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure only one weather log per project per day
  CONSTRAINT unique_weather_log_per_project_date UNIQUE (project_id, log_date),

  -- Ensure temperature_low <= temperature_high
  CONSTRAINT valid_temperature_range CHECK (
    temperature_low IS NULL OR
    temperature_high IS NULL OR
    temperature_low <= temperature_high
  )
);

-- Create indexes for performance
CREATE INDEX idx_weather_logs_company_id ON weather_logs(company_id);
CREATE INDEX idx_weather_logs_project_id ON weather_logs(project_id);
CREATE INDEX idx_weather_logs_log_date ON weather_logs(log_date);
CREATE INDEX idx_weather_logs_recorded_by ON weather_logs(recorded_by);
CREATE INDEX idx_weather_logs_work_impact ON weather_logs(work_impact);
CREATE INDEX idx_weather_logs_conditions ON weather_logs(conditions);
CREATE INDEX idx_weather_logs_project_date ON weather_logs(project_id, log_date DESC);

-- Create composite index for common queries
CREATE INDEX idx_weather_logs_company_project_date ON weather_logs(company_id, project_id, log_date DESC);

-- Enable Row Level Security
ALTER TABLE weather_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view weather logs for their company's projects
CREATE POLICY weather_logs_select_policy ON weather_logs
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert weather logs for their company's projects
CREATE POLICY weather_logs_insert_policy ON weather_logs
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
    AND recorded_by = auth.uid()
  );

-- Policy: Users can update weather logs they created (within 30 days)
CREATE POLICY weather_logs_update_policy ON weather_logs
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
    AND (
      recorded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('superintendent', 'project_manager', 'office_admin')
      )
    )
    AND log_date >= CURRENT_DATE - INTERVAL '30 days'
  );

-- Policy: Superintendents and admins can delete weather logs
CREATE POLICY weather_logs_delete_policy ON weather_logs
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('superintendent', 'project_manager', 'office_admin')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_weather_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER weather_logs_updated_at
  BEFORE UPDATE ON weather_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_weather_logs_updated_at();

-- Add helpful comments
COMMENT ON TABLE weather_logs IS 'Daily weather conditions and their impact on construction work';
COMMENT ON COLUMN weather_logs.conditions IS 'Primary weather condition for the day';
COMMENT ON COLUMN weather_logs.work_impact IS 'Level of impact on construction work: none, minor, moderate, severe';
COMMENT ON COLUMN weather_logs.work_stopped IS 'Whether work was completely stopped due to weather';
COMMENT ON COLUMN weather_logs.hours_lost IS 'Total hours of work lost due to weather';
COMMENT ON COLUMN weather_logs.affected_activities IS 'List of construction activities affected by weather';
COMMENT ON COLUMN weather_logs.safety_concerns IS 'Any safety concerns related to weather conditions';
