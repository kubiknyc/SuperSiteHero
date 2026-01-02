-- Migration: Holiday Calendar for Lead Time Calculations
-- Provides accurate working days calculation for submittal lead times

-- =============================================
-- HOLIDAY CALENDARS TABLE
-- Company-specific holiday calendar configuration
-- =============================================

CREATE TABLE IF NOT EXISTS holiday_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Calendar Settings
  name TEXT NOT NULL DEFAULT 'Default Calendar',
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  year INTEGER NOT NULL,

  -- Working Days Configuration (1 = Monday, 7 = Sunday)
  working_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- Mon-Fri by default

  -- Standard Hours (for future time-based calculations)
  work_start_time TIME DEFAULT '08:00',
  work_end_time TIME DEFAULT '17:00',

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT unique_company_year_calendar UNIQUE (company_id, year, name)
);

-- =============================================
-- HOLIDAYS TABLE
-- Individual holiday entries
-- =============================================

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES holiday_calendars(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Holiday Details
  name TEXT NOT NULL,
  holiday_date DATE NOT NULL,

  -- Type of holiday
  holiday_type VARCHAR(30) NOT NULL DEFAULT 'company' CHECK (holiday_type IN (
    'federal', 'state', 'company', 'construction', 'weather', 'custom'
  )),

  -- If recurring, applies to all years
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_month INTEGER, -- 1-12
  recurring_day INTEGER, -- 1-31 (or special values for things like "4th Thursday")
  recurring_week INTEGER, -- 1-5 for nth week of month
  recurring_weekday INTEGER, -- 1-7 for day of week

  -- Notes
  notes TEXT,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_calendar_holiday UNIQUE (calendar_id, holiday_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_holiday_calendars_company ON holiday_calendars(company_id);
CREATE INDEX IF NOT EXISTS idx_holiday_calendars_year ON holiday_calendars(company_id, year);
CREATE INDEX IF NOT EXISTS idx_holidays_calendar ON holidays(calendar_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_company ON holidays(company_id);

-- Enable RLS
ALTER TABLE holiday_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for holiday_calendars
CREATE POLICY "Users can view their company holiday calendars"
  ON holiday_calendars FOR SELECT
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage holiday calendars"
  ON holiday_calendars FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'project_manager')
    )
  );

-- RLS Policies for holidays
CREATE POLICY "Users can view their company holidays"
  ON holidays FOR SELECT
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage holidays"
  ON holidays FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'project_manager')
    )
  );

-- =============================================
-- FUNCTIONS FOR WORKING DAYS CALCULATION
-- =============================================

-- Function to check if a date is a holiday
CREATE OR REPLACE FUNCTION is_holiday(
  p_company_id UUID,
  p_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_holiday BOOLEAN;
BEGIN
  -- Check for exact date match or recurring holiday
  SELECT EXISTS (
    SELECT 1 FROM holidays h
    JOIN holiday_calendars hc ON h.calendar_id = hc.id
    WHERE h.company_id = p_company_id
    AND (
      -- Exact date match
      h.holiday_date = p_date
      OR (
        -- Recurring holiday by month and day
        h.is_recurring = true
        AND h.recurring_month = EXTRACT(MONTH FROM p_date)
        AND h.recurring_day = EXTRACT(DAY FROM p_date)
      )
      OR (
        -- Recurring holiday by week and weekday (e.g., 4th Thursday of November)
        h.is_recurring = true
        AND h.recurring_month = EXTRACT(MONTH FROM p_date)
        AND h.recurring_weekday = EXTRACT(DOW FROM p_date) + 1 -- DOW is 0-6, we use 1-7
        AND h.recurring_week = CEIL(EXTRACT(DAY FROM p_date)::NUMERIC / 7)
      )
    )
    AND hc.deleted_at IS NULL
  ) INTO v_is_holiday;

  RETURN COALESCE(v_is_holiday, false);
END;
$$ LANGUAGE plpgsql;

-- Function to check if a date is a working day
CREATE OR REPLACE FUNCTION is_working_day(
  p_company_id UUID,
  p_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_working_days INTEGER[];
  v_is_holiday BOOLEAN;
BEGIN
  -- Get day of week (1=Monday, 7=Sunday)
  v_day_of_week := EXTRACT(ISODOW FROM p_date)::INTEGER;

  -- Get company working days configuration
  SELECT hc.working_days INTO v_working_days
  FROM holiday_calendars hc
  WHERE hc.company_id = p_company_id
  AND hc.year = EXTRACT(YEAR FROM p_date)
  AND hc.is_default = true
  AND hc.deleted_at IS NULL
  LIMIT 1;

  -- Default to Mon-Fri if no calendar configured
  IF v_working_days IS NULL THEN
    v_working_days := '{1,2,3,4,5}';
  END IF;

  -- Check if day is a working day
  IF NOT (v_day_of_week = ANY(v_working_days)) THEN
    RETURN false;
  END IF;

  -- Check if it's a holiday
  v_is_holiday := is_holiday(p_company_id, p_date);

  RETURN NOT v_is_holiday;
END;
$$ LANGUAGE plpgsql;

-- Function to add working days to a date
CREATE OR REPLACE FUNCTION add_working_days(
  p_company_id UUID,
  p_start_date DATE,
  p_days INTEGER
)
RETURNS DATE AS $$
DECLARE
  v_current_date DATE := p_start_date;
  v_days_added INTEGER := 0;
  v_direction INTEGER := SIGN(p_days);
  v_days_to_add INTEGER := ABS(p_days);
BEGIN
  IF p_days = 0 THEN
    RETURN p_start_date;
  END IF;

  WHILE v_days_added < v_days_to_add LOOP
    v_current_date := v_current_date + v_direction;

    IF is_working_day(p_company_id, v_current_date) THEN
      v_days_added := v_days_added + 1;
    END IF;

    -- Safety check to prevent infinite loops
    IF v_current_date > p_start_date + INTERVAL '5 years' OR
       v_current_date < p_start_date - INTERVAL '5 years' THEN
      RETURN v_current_date;
    END IF;
  END LOOP;

  RETURN v_current_date;
END;
$$ LANGUAGE plpgsql;

-- Function to subtract working days from a date (for lead time calculation)
CREATE OR REPLACE FUNCTION subtract_working_days(
  p_company_id UUID,
  p_end_date DATE,
  p_days INTEGER
)
RETURNS DATE AS $$
BEGIN
  RETURN add_working_days(p_company_id, p_end_date, -p_days);
END;
$$ LANGUAGE plpgsql;

-- Function to count working days between two dates
CREATE OR REPLACE FUNCTION count_working_days(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_current_date DATE := p_start_date;
BEGIN
  IF p_start_date > p_end_date THEN
    RETURN -count_working_days(p_company_id, p_end_date, p_start_date);
  END IF;

  WHILE v_current_date < p_end_date LOOP
    v_current_date := v_current_date + 1;

    IF is_working_day(p_company_id, v_current_date) THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate submittal submit-by date with holidays
CREATE OR REPLACE FUNCTION calculate_submittal_deadline(
  p_company_id UUID,
  p_required_on_site DATE,
  p_lead_time_weeks INTEGER,
  p_review_days INTEGER
)
RETURNS TABLE (
  submit_by_date DATE,
  working_days_until_deadline INTEGER,
  total_calendar_days INTEGER,
  holidays_in_range INTEGER
) AS $$
DECLARE
  v_lead_time_days INTEGER;
  v_total_days INTEGER;
  v_submit_by_date DATE;
  v_working_days INTEGER;
  v_holidays INTEGER;
BEGIN
  -- Calculate total working days needed
  v_lead_time_days := p_lead_time_weeks * 5; -- Working days (5 per week)
  v_total_days := v_lead_time_days + p_review_days;

  -- Calculate submit-by date using working days
  v_submit_by_date := subtract_working_days(p_company_id, p_required_on_site, v_total_days);

  -- Count working days from today to submit-by date
  v_working_days := count_working_days(p_company_id, CURRENT_DATE, v_submit_by_date);

  -- Count holidays in range
  SELECT COUNT(*)::INTEGER INTO v_holidays
  FROM holidays h
  JOIN holiday_calendars hc ON h.calendar_id = hc.id
  WHERE h.company_id = p_company_id
  AND h.holiday_date BETWEEN v_submit_by_date AND p_required_on_site
  AND hc.deleted_at IS NULL;

  RETURN QUERY SELECT
    v_submit_by_date,
    v_working_days,
    (p_required_on_site - v_submit_by_date)::INTEGER,
    COALESCE(v_holidays, 0);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SEED US FEDERAL HOLIDAYS FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION seed_us_federal_holidays(
  p_company_id UUID,
  p_year INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_calendar_id UUID;
BEGIN
  -- Create calendar for the year
  INSERT INTO holiday_calendars (company_id, year, name, is_default, created_by)
  VALUES (p_company_id, p_year, 'US Federal Holidays', true, auth.uid())
  ON CONFLICT (company_id, year, name) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_calendar_id;

  -- New Year's Day (January 1)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_day)
  VALUES (v_calendar_id, p_company_id, 'New Year''s Day', make_date(p_year, 1, 1), 'federal', true, 1, 1)
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Martin Luther King Jr. Day (3rd Monday of January)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_week, recurring_weekday)
  VALUES (v_calendar_id, p_company_id, 'Martin Luther King Jr. Day',
    (SELECT d FROM generate_series(make_date(p_year, 1, 15), make_date(p_year, 1, 21), '1 day'::interval) d
     WHERE EXTRACT(DOW FROM d) = 1 LIMIT 1)::DATE,
    'federal', true, 1, 3, 1)
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Presidents' Day (3rd Monday of February)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_week, recurring_weekday)
  VALUES (v_calendar_id, p_company_id, 'Presidents'' Day',
    (SELECT d FROM generate_series(make_date(p_year, 2, 15), make_date(p_year, 2, 21), '1 day'::interval) d
     WHERE EXTRACT(DOW FROM d) = 1 LIMIT 1)::DATE,
    'federal', true, 2, 3, 1)
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Memorial Day (Last Monday of May)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_week, recurring_weekday)
  VALUES (v_calendar_id, p_company_id, 'Memorial Day',
    (SELECT d FROM generate_series(make_date(p_year, 5, 25), make_date(p_year, 5, 31), '1 day'::interval) d
     WHERE EXTRACT(DOW FROM d) = 1 ORDER BY d DESC LIMIT 1)::DATE,
    'federal', true, 5, 5, 1) -- 5th Monday (last) of May
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Juneteenth (June 19)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_day)
  VALUES (v_calendar_id, p_company_id, 'Juneteenth', make_date(p_year, 6, 19), 'federal', true, 6, 19)
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Independence Day (July 4)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_day)
  VALUES (v_calendar_id, p_company_id, 'Independence Day', make_date(p_year, 7, 4), 'federal', true, 7, 4)
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Labor Day (1st Monday of September)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_week, recurring_weekday)
  VALUES (v_calendar_id, p_company_id, 'Labor Day',
    (SELECT d FROM generate_series(make_date(p_year, 9, 1), make_date(p_year, 9, 7), '1 day'::interval) d
     WHERE EXTRACT(DOW FROM d) = 1 LIMIT 1)::DATE,
    'federal', true, 9, 1, 1)
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Columbus Day (2nd Monday of October)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_week, recurring_weekday)
  VALUES (v_calendar_id, p_company_id, 'Columbus Day',
    (SELECT d FROM generate_series(make_date(p_year, 10, 8), make_date(p_year, 10, 14), '1 day'::interval) d
     WHERE EXTRACT(DOW FROM d) = 1 LIMIT 1)::DATE,
    'federal', true, 10, 2, 1)
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Veterans Day (November 11)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_day)
  VALUES (v_calendar_id, p_company_id, 'Veterans Day', make_date(p_year, 11, 11), 'federal', true, 11, 11)
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Thanksgiving (4th Thursday of November)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_week, recurring_weekday)
  VALUES (v_calendar_id, p_company_id, 'Thanksgiving',
    (SELECT d FROM generate_series(make_date(p_year, 11, 22), make_date(p_year, 11, 28), '1 day'::interval) d
     WHERE EXTRACT(DOW FROM d) = 4 LIMIT 1)::DATE,
    'federal', true, 11, 4, 4) -- 4 = Thursday
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Day after Thanksgiving (common in construction)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type)
  VALUES (v_calendar_id, p_company_id, 'Day after Thanksgiving',
    ((SELECT d FROM generate_series(make_date(p_year, 11, 22), make_date(p_year, 11, 28), '1 day'::interval) d
     WHERE EXTRACT(DOW FROM d) = 4 LIMIT 1) + INTERVAL '1 day')::DATE,
    'construction')
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Christmas Eve (common in construction)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_day)
  VALUES (v_calendar_id, p_company_id, 'Christmas Eve', make_date(p_year, 12, 24), 'company', true, 12, 24)
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  -- Christmas Day (December 25)
  INSERT INTO holidays (calendar_id, company_id, name, holiday_date, holiday_type, is_recurring, recurring_month, recurring_day)
  VALUES (v_calendar_id, p_company_id, 'Christmas Day', make_date(p_year, 12, 25), 'federal', true, 12, 25)
  ON CONFLICT (calendar_id, holiday_date) DO NOTHING;

  RETURN v_calendar_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for holiday_calendars
CREATE OR REPLACE FUNCTION update_holiday_calendars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_holiday_calendars_updated_at
  BEFORE UPDATE ON holiday_calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_holiday_calendars_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON holiday_calendars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON holidays TO authenticated;
GRANT EXECUTE ON FUNCTION is_holiday TO authenticated;
GRANT EXECUTE ON FUNCTION is_working_day TO authenticated;
GRANT EXECUTE ON FUNCTION add_working_days TO authenticated;
GRANT EXECUTE ON FUNCTION subtract_working_days TO authenticated;
GRANT EXECUTE ON FUNCTION count_working_days TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_submittal_deadline TO authenticated;
GRANT EXECUTE ON FUNCTION seed_us_federal_holidays TO authenticated;
