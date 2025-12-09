-- Migration: Schedule Integration
-- Comprehensive project scheduling with Gantt charts, dependencies, and MS Project import
-- Supports critical path analysis, resource allocation, and baseline tracking

-- ============================================================================
-- SCHEDULE ACTIVITIES (Tasks/Activities in the schedule)
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Activity identification
  activity_id VARCHAR(50) NOT NULL, -- WBS code like "1.1.3" or P6/MSP ID
  activity_code VARCHAR(50), -- Optional additional code
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- WBS (Work Breakdown Structure)
  wbs_code VARCHAR(50),
  wbs_level INTEGER DEFAULT 1,
  parent_activity_id UUID REFERENCES schedule_activities(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,

  -- Dates
  planned_start DATE,
  planned_finish DATE,
  actual_start DATE,
  actual_finish DATE,
  baseline_start DATE,
  baseline_finish DATE,

  -- Duration
  planned_duration INTEGER, -- Days
  actual_duration INTEGER,
  remaining_duration INTEGER,
  duration_type VARCHAR(20) DEFAULT 'fixed_duration'
    CHECK (duration_type IN ('fixed_duration', 'fixed_units', 'fixed_work')),

  -- Progress
  percent_complete DECIMAL(5,2) DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  physical_percent_complete DECIMAL(5,2), -- Separate from duration-based

  -- Activity type
  activity_type VARCHAR(30) DEFAULT 'task'
    CHECK (activity_type IN ('task', 'milestone', 'summary', 'hammock', 'level_of_effort', 'wbs_summary')),
  is_milestone BOOLEAN DEFAULT false,
  is_critical BOOLEAN DEFAULT false,

  -- Float/Slack
  total_float INTEGER, -- Days
  free_float INTEGER,
  is_on_critical_path BOOLEAN DEFAULT false,

  -- Calendar
  calendar_id UUID, -- References schedule_calendars

  -- Constraints
  constraint_type VARCHAR(30)
    CHECK (constraint_type IN ('as_soon_as_possible', 'as_late_as_possible',
           'must_start_on', 'must_finish_on', 'start_no_earlier_than',
           'start_no_later_than', 'finish_no_earlier_than', 'finish_no_later_than')),
  constraint_date DATE,

  -- Assignment
  responsible_party VARCHAR(255),
  responsible_user_id UUID REFERENCES users(id),
  subcontractor_id UUID REFERENCES subcontractors(id),

  -- Cost tracking
  budgeted_cost DECIMAL(15,2),
  actual_cost DECIMAL(15,2),
  earned_value DECIMAL(15,2),

  -- Resource hours
  budgeted_labor_hours DECIMAL(10,2),
  actual_labor_hours DECIMAL(10,2),

  -- Status
  status VARCHAR(20) DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),

  -- Notes and attachments
  notes TEXT,

  -- External references (for import/sync)
  external_id VARCHAR(100), -- MS Project/P6 unique ID
  external_source VARCHAR(50), -- 'ms_project', 'primavera_p6', 'procore', etc.

  -- Colors for Gantt display
  bar_color VARCHAR(7),
  milestone_color VARCHAR(7),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(project_id, activity_id)
);

-- ============================================================================
-- SCHEDULE DEPENDENCIES (Predecessor/Successor relationships)
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Relationship
  predecessor_id UUID NOT NULL REFERENCES schedule_activities(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES schedule_activities(id) ON DELETE CASCADE,

  -- Dependency type (Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish)
  dependency_type VARCHAR(5) NOT NULL DEFAULT 'FS'
    CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),

  -- Lag/Lead time (positive = lag, negative = lead)
  lag_days INTEGER DEFAULT 0,
  lag_type VARCHAR(20) DEFAULT 'days'
    CHECK (lag_type IN ('days', 'percent', 'hours')),
  lag_value DECIMAL(10,2) DEFAULT 0,

  -- Driving dependency flag
  is_driving BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(predecessor_id, successor_id)
);

-- ============================================================================
-- SCHEDULE BASELINES (Snapshot of schedule at a point in time)
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Baseline info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  baseline_number INTEGER NOT NULL,
  baseline_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Status
  is_active BOOLEAN DEFAULT false, -- Only one active baseline per project

  -- Summary stats at baseline time
  total_activities INTEGER,
  total_duration_days INTEGER,
  planned_start DATE,
  planned_finish DATE,
  total_budget DECIMAL(15,2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(project_id, baseline_number)
);

-- ============================================================================
-- BASELINE ACTIVITY SNAPSHOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS baseline_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id UUID NOT NULL REFERENCES schedule_baselines(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES schedule_activities(id) ON DELETE CASCADE,

  -- Snapshot of activity data at baseline time
  planned_start DATE,
  planned_finish DATE,
  planned_duration INTEGER,
  budgeted_cost DECIMAL(15,2),
  budgeted_labor_hours DECIMAL(10,2),

  UNIQUE(baseline_id, activity_id)
);

-- ============================================================================
-- SCHEDULE CALENDARS (Work calendars for scheduling)
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL = company-wide
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Calendar info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,

  -- Standard work week (hours per day, null = non-work day)
  sunday_hours DECIMAL(4,2) DEFAULT 0,
  monday_hours DECIMAL(4,2) DEFAULT 8,
  tuesday_hours DECIMAL(4,2) DEFAULT 8,
  wednesday_hours DECIMAL(4,2) DEFAULT 8,
  thursday_hours DECIMAL(4,2) DEFAULT 8,
  friday_hours DECIMAL(4,2) DEFAULT 8,
  saturday_hours DECIMAL(4,2) DEFAULT 0,

  -- Standard work times
  work_start_time TIME DEFAULT '07:00',
  work_end_time TIME DEFAULT '17:00',
  lunch_start TIME DEFAULT '12:00',
  lunch_duration_minutes INTEGER DEFAULT 60,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================================================
-- CALENDAR EXCEPTIONS (Holidays, special days)
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES schedule_calendars(id) ON DELETE CASCADE,

  -- Exception details
  exception_date DATE NOT NULL,
  name VARCHAR(100), -- e.g., "Thanksgiving"
  is_working_day BOOLEAN DEFAULT false,
  work_hours DECIMAL(4,2) DEFAULT 0, -- Override hours for this day

  UNIQUE(calendar_id, exception_date)
);

-- ============================================================================
-- SCHEDULE RESOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Resource info
  name VARCHAR(100) NOT NULL,
  resource_type VARCHAR(30) DEFAULT 'labor'
    CHECK (resource_type IN ('labor', 'equipment', 'material', 'cost')),

  -- For labor resources
  user_id UUID REFERENCES users(id),

  -- Capacity
  max_units DECIMAL(5,2) DEFAULT 1.0, -- 1.0 = 100% availability
  standard_rate DECIMAL(12,2),
  overtime_rate DECIMAL(12,2),
  cost_per_use DECIMAL(12,2),

  -- Calendar
  calendar_id UUID REFERENCES schedule_calendars(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RESOURCE ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES schedule_activities(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES schedule_resources(id) ON DELETE CASCADE,

  -- Assignment details
  units DECIMAL(5,2) DEFAULT 1.0, -- Allocation percentage
  planned_work_hours DECIMAL(10,2),
  actual_work_hours DECIMAL(10,2),
  remaining_work_hours DECIMAL(10,2),

  -- Dates (can differ from activity dates)
  start_date DATE,
  finish_date DATE,

  -- Cost
  planned_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),

  UNIQUE(activity_id, resource_id)
);

-- ============================================================================
-- SCHEDULE UPDATES (Progress updates/status reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Update info
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_date DATE NOT NULL, -- The "as-of" date for the update
  description TEXT,
  update_number INTEGER,

  -- Summary at update time
  activities_complete INTEGER,
  activities_in_progress INTEGER,
  activities_not_started INTEGER,
  overall_percent_complete DECIMAL(5,2),

  -- Schedule variance
  schedule_variance_days INTEGER, -- Positive = ahead, Negative = behind
  critical_path_changed BOOLEAN DEFAULT false,
  new_completion_date DATE,

  -- Who submitted
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Approval
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'))
);

-- ============================================================================
-- SCHEDULE IMPORT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Import details
  file_name VARCHAR(255),
  file_type VARCHAR(50), -- 'mpp', 'xml', 'xer', 'csv'
  source_system VARCHAR(50), -- 'ms_project', 'primavera_p6', etc.
  import_date TIMESTAMPTZ DEFAULT NOW(),

  -- Results
  activities_imported INTEGER DEFAULT 0,
  dependencies_imported INTEGER DEFAULT 0,
  resources_imported INTEGER DEFAULT 0,
  warnings TEXT[],
  errors TEXT[],
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- File storage
  file_url TEXT,

  -- Metadata
  imported_by UUID REFERENCES users(id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_schedule_activities_project ON schedule_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_parent ON schedule_activities(parent_activity_id);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_dates ON schedule_activities(planned_start, planned_finish);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_critical ON schedule_activities(project_id, is_critical) WHERE is_critical = true;
CREATE INDEX IF NOT EXISTS idx_schedule_activities_status ON schedule_activities(project_id, status);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_wbs ON schedule_activities(project_id, wbs_code);
CREATE INDEX IF NOT EXISTS idx_schedule_dependencies_pred ON schedule_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_schedule_dependencies_succ ON schedule_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_schedule_baselines_project ON schedule_baselines(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_activity ON resource_assignments(activity_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_resource ON resource_assignments(resource_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_schedule_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_activities_updated_at
  BEFORE UPDATE ON schedule_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_activities_updated_at();

CREATE TRIGGER schedule_calendars_updated_at
  BEFORE UPDATE ON schedule_calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_activities_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE schedule_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_import_logs ENABLE ROW LEVEL SECURITY;

-- Company members can view schedule data
CREATE POLICY schedule_activities_select ON schedule_activities
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY schedule_activities_insert ON schedule_activities
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY schedule_activities_update ON schedule_activities
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY schedule_activities_delete ON schedule_activities
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Similar policies for other tables
CREATE POLICY schedule_dependencies_all ON schedule_dependencies
  FOR ALL USING (
    project_id IN (SELECT project_id FROM schedule_activities WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY schedule_baselines_all ON schedule_baselines
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY baseline_activities_all ON baseline_activities
  FOR ALL USING (
    baseline_id IN (SELECT id FROM schedule_baselines WHERE project_id IN (SELECT id FROM projects WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())))
  );

CREATE POLICY schedule_calendars_all ON schedule_calendars
  FOR ALL USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY calendar_exceptions_all ON calendar_exceptions
  FOR ALL USING (
    calendar_id IN (SELECT id FROM schedule_calendars WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY schedule_resources_all ON schedule_resources
  FOR ALL USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY resource_assignments_all ON resource_assignments
  FOR ALL USING (
    activity_id IN (SELECT id FROM schedule_activities WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY schedule_updates_all ON schedule_updates
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY schedule_import_logs_all ON schedule_import_logs
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate working days between two dates
CREATE OR REPLACE FUNCTION calculate_working_days(
  p_start_date DATE,
  p_end_date DATE,
  p_calendar_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_days INTEGER := 0;
  v_current DATE := p_start_date;
  v_day_of_week INTEGER;
  v_hours DECIMAL;
  v_calendar schedule_calendars%ROWTYPE;
BEGIN
  -- Get calendar or use default
  IF p_calendar_id IS NOT NULL THEN
    SELECT * INTO v_calendar FROM schedule_calendars WHERE id = p_calendar_id;
  ELSE
    -- Default 5-day work week
    v_calendar.sunday_hours := 0;
    v_calendar.monday_hours := 8;
    v_calendar.tuesday_hours := 8;
    v_calendar.wednesday_hours := 8;
    v_calendar.thursday_hours := 8;
    v_calendar.friday_hours := 8;
    v_calendar.saturday_hours := 0;
  END IF;

  WHILE v_current <= p_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current);

    -- Check if it's a working day based on calendar
    v_hours := CASE v_day_of_week
      WHEN 0 THEN v_calendar.sunday_hours
      WHEN 1 THEN v_calendar.monday_hours
      WHEN 2 THEN v_calendar.tuesday_hours
      WHEN 3 THEN v_calendar.wednesday_hours
      WHEN 4 THEN v_calendar.thursday_hours
      WHEN 5 THEN v_calendar.friday_hours
      WHEN 6 THEN v_calendar.saturday_hours
    END;

    -- Check for calendar exceptions
    IF p_calendar_id IS NOT NULL THEN
      SELECT COALESCE(ce.work_hours, v_hours) INTO v_hours
      FROM calendar_exceptions ce
      WHERE ce.calendar_id = p_calendar_id AND ce.exception_date = v_current;
    END IF;

    IF v_hours > 0 THEN
      v_days := v_days + 1;
    END IF;

    v_current := v_current + 1;
  END LOOP;

  RETURN v_days;
END;
$$ LANGUAGE plpgsql;

-- Get critical path activities for a project
CREATE OR REPLACE FUNCTION get_critical_path_activities(p_project_id UUID)
RETURNS TABLE(
  activity_id UUID,
  activity_name VARCHAR,
  planned_start DATE,
  planned_finish DATE,
  total_float INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.id,
    sa.name,
    sa.planned_start,
    sa.planned_finish,
    sa.total_float
  FROM schedule_activities sa
  WHERE sa.project_id = p_project_id
    AND sa.deleted_at IS NULL
    AND (sa.is_critical = true OR sa.total_float = 0)
  ORDER BY sa.planned_start, sa.sort_order;
END;
$$ LANGUAGE plpgsql;

-- Calculate schedule variance
CREATE OR REPLACE FUNCTION calculate_schedule_variance(p_project_id UUID)
RETURNS TABLE(
  total_activities INTEGER,
  completed INTEGER,
  in_progress INTEGER,
  not_started INTEGER,
  behind_schedule INTEGER,
  on_track INTEGER,
  ahead_of_schedule INTEGER,
  overall_percent_complete DECIMAL,
  projected_finish DATE,
  baseline_finish DATE,
  variance_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
      COUNT(*) FILTER (WHERE status = 'not_started') AS not_started,
      COUNT(*) FILTER (WHERE planned_finish < CURRENT_DATE AND status != 'completed') AS behind,
      COUNT(*) FILTER (WHERE planned_finish >= CURRENT_DATE OR status = 'completed') AS on_track,
      COUNT(*) FILTER (WHERE actual_finish < planned_finish) AS ahead,
      AVG(percent_complete) AS avg_complete,
      MAX(planned_finish) AS max_finish,
      MAX(baseline_finish) AS max_baseline
    FROM schedule_activities
    WHERE project_id = p_project_id AND deleted_at IS NULL
  )
  SELECT
    stats.total::INTEGER,
    stats.completed::INTEGER,
    stats.in_progress::INTEGER,
    stats.not_started::INTEGER,
    stats.behind::INTEGER,
    stats.on_track::INTEGER,
    stats.ahead::INTEGER,
    ROUND(stats.avg_complete, 2),
    stats.max_finish,
    stats.max_baseline,
    (stats.max_finish - stats.max_baseline)::INTEGER
  FROM stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW schedule_activity_details AS
SELECT
  sa.*,
  p.name AS project_name,
  p.project_number,
  parent.name AS parent_activity_name,
  u.full_name AS responsible_user_name,
  sub.company_name AS subcontractor_name,
  (sa.planned_finish - sa.planned_start) AS calculated_duration,
  CASE
    WHEN sa.actual_finish IS NOT NULL THEN 'completed'
    WHEN sa.actual_start IS NOT NULL THEN 'in_progress'
    WHEN sa.planned_start <= CURRENT_DATE THEN 'should_have_started'
    ELSE 'future'
  END AS derived_status,
  CASE
    WHEN sa.planned_finish < CURRENT_DATE AND sa.actual_finish IS NULL THEN true
    ELSE false
  END AS is_overdue
FROM schedule_activities sa
LEFT JOIN projects p ON sa.project_id = p.id
LEFT JOIN schedule_activities parent ON sa.parent_activity_id = parent.id
LEFT JOIN users u ON sa.responsible_user_id = u.id
LEFT JOIN subcontractors sub ON sa.subcontractor_id = sub.id
WHERE sa.deleted_at IS NULL;

-- Grant access to views
GRANT SELECT ON schedule_activity_details TO authenticated;
