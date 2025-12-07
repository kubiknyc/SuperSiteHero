-- Migration: 073_look_ahead_planning.sql
-- Description: Look-ahead planning tables for 3-week rolling schedule
-- Date: 2025-12-07

-- =============================================
-- ENUM: look_ahead_activity_status
-- =============================================
DO $$ BEGIN
  CREATE TYPE look_ahead_activity_status AS ENUM (
    'planned',        -- Scheduled but not started
    'in_progress',    -- Work has begun
    'completed',      -- Work finished
    'delayed',        -- Behind schedule
    'blocked',        -- Cannot proceed due to constraint
    'cancelled'       -- Removed from schedule
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- ENUM: constraint_type
-- =============================================
DO $$ BEGIN
  CREATE TYPE constraint_type AS ENUM (
    'rfi_pending',           -- Waiting for RFI response
    'submittal_pending',     -- Waiting for submittal approval
    'material_delivery',     -- Waiting for materials
    'predecessor_activity',  -- Depends on another activity
    'inspection_required',   -- Needs inspection before proceeding
    'permit_required',       -- Waiting for permit
    'weather_dependent',     -- Weather-sensitive work
    'resource_availability', -- Labor/equipment constraint
    'owner_decision',        -- Waiting for owner direction
    'design_clarification',  -- Needs design input
    'other'                  -- Other constraint
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- ENUM: constraint_status
-- =============================================
DO $$ BEGIN
  CREATE TYPE constraint_status AS ENUM (
    'open',       -- Constraint is active
    'resolved',   -- Constraint has been resolved
    'waived',     -- Constraint was waived/bypassed
    'escalated'   -- Escalated to management
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- TABLE: look_ahead_activities
-- Activities for 3-week rolling schedule
-- =============================================
CREATE TABLE IF NOT EXISTS look_ahead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Activity details
  activity_name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),  -- Area/zone in project

  -- Trade/Subcontractor
  trade VARCHAR(100),  -- e.g., 'Electrical', 'Plumbing', 'HVAC'
  subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL,

  -- Schedule
  planned_start_date DATE NOT NULL,
  planned_end_date DATE NOT NULL,
  actual_start_date DATE,
  actual_end_date DATE,
  duration_days INTEGER GENERATED ALWAYS AS (planned_end_date - planned_start_date + 1) STORED,

  -- Status tracking
  status look_ahead_activity_status DEFAULT 'planned',
  percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),

  -- Week assignment (for display)
  week_number INTEGER,  -- 1, 2, or 3 for the 3-week view
  week_start_date DATE,

  -- Resource estimates
  estimated_labor_hours DECIMAL(8, 2),
  estimated_crew_size INTEGER,

  -- Links to master schedule
  schedule_item_id UUID REFERENCES schedule_items(id) ON DELETE SET NULL,

  -- Priority and ordering
  priority INTEGER DEFAULT 50 CHECK (priority >= 1 AND priority <= 100),
  sort_order INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for look_ahead_activities
CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_project_id ON look_ahead_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_company_id ON look_ahead_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_planned_start ON look_ahead_activities(planned_start_date);
CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_planned_end ON look_ahead_activities(planned_end_date);
CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_status ON look_ahead_activities(status);
CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_trade ON look_ahead_activities(trade);
CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_week ON look_ahead_activities(project_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_look_ahead_activities_subcontractor ON look_ahead_activities(subcontractor_id);

-- =============================================
-- TABLE: look_ahead_constraints
-- Constraints blocking activities
-- =============================================
CREATE TABLE IF NOT EXISTS look_ahead_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES look_ahead_activities(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Constraint details
  constraint_type constraint_type NOT NULL,
  description TEXT NOT NULL,
  status constraint_status DEFAULT 'open',

  -- Linked entities
  rfi_id UUID REFERENCES rfis(id) ON DELETE SET NULL,
  submittal_id UUID REFERENCES submittals(id) ON DELETE SET NULL,
  predecessor_activity_id UUID REFERENCES look_ahead_activities(id) ON DELETE SET NULL,

  -- Expected resolution
  expected_resolution_date DATE,
  actual_resolution_date DATE,

  -- Assignment
  assigned_to UUID REFERENCES users(id),
  responsible_party VARCHAR(255),  -- Company/person responsible

  -- Impact
  impact_description TEXT,
  delay_days INTEGER DEFAULT 0,

  -- Resolution
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for look_ahead_constraints
CREATE INDEX IF NOT EXISTS idx_look_ahead_constraints_activity ON look_ahead_constraints(activity_id);
CREATE INDEX IF NOT EXISTS idx_look_ahead_constraints_project ON look_ahead_constraints(project_id);
CREATE INDEX IF NOT EXISTS idx_look_ahead_constraints_status ON look_ahead_constraints(status);
CREATE INDEX IF NOT EXISTS idx_look_ahead_constraints_type ON look_ahead_constraints(constraint_type);
CREATE INDEX IF NOT EXISTS idx_look_ahead_constraints_rfi ON look_ahead_constraints(rfi_id);
CREATE INDEX IF NOT EXISTS idx_look_ahead_constraints_submittal ON look_ahead_constraints(submittal_id);

-- =============================================
-- TABLE: look_ahead_snapshots
-- Weekly PPC (Percent Plan Complete) tracking
-- =============================================
CREATE TABLE IF NOT EXISTS look_ahead_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Snapshot period
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  snapshot_date TIMESTAMPTZ DEFAULT NOW(),

  -- Metrics
  planned_activities INTEGER DEFAULT 0,
  completed_activities INTEGER DEFAULT 0,
  delayed_activities INTEGER DEFAULT 0,
  blocked_activities INTEGER DEFAULT 0,
  cancelled_activities INTEGER DEFAULT 0,

  -- PPC calculation
  ppc_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN planned_activities > 0
      THEN ROUND((completed_activities::DECIMAL / planned_activities) * 100, 2)
      ELSE 0
    END
  ) STORED,

  -- Constraint analysis
  total_constraints INTEGER DEFAULT 0,
  resolved_constraints INTEGER DEFAULT 0,
  open_constraints INTEGER DEFAULT 0,

  -- Variance reasons (JSON array of reasons)
  variance_reasons JSONB DEFAULT '[]',

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one snapshot per project per week
  UNIQUE(project_id, week_start_date)
);

-- Indexes for look_ahead_snapshots
CREATE INDEX IF NOT EXISTS idx_look_ahead_snapshots_project ON look_ahead_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_look_ahead_snapshots_week ON look_ahead_snapshots(week_start_date);
CREATE INDEX IF NOT EXISTS idx_look_ahead_snapshots_ppc ON look_ahead_snapshots(ppc_percentage);

-- =============================================
-- TABLE: look_ahead_templates
-- Reusable activity templates by trade
-- =============================================
CREATE TABLE IF NOT EXISTS look_ahead_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template details
  template_name VARCHAR(255) NOT NULL,
  trade VARCHAR(100),
  description TEXT,

  -- Default values
  default_duration_days INTEGER DEFAULT 1,
  default_crew_size INTEGER,
  default_labor_hours DECIMAL(8, 2),

  -- Common constraints for this type of work
  typical_constraints JSONB DEFAULT '[]',

  -- Active flag
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for templates
CREATE INDEX IF NOT EXISTS idx_look_ahead_templates_company ON look_ahead_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_look_ahead_templates_trade ON look_ahead_templates(trade);

-- =============================================
-- Enable RLS
-- =============================================
ALTER TABLE look_ahead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE look_ahead_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE look_ahead_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE look_ahead_templates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies: look_ahead_activities
-- =============================================
DROP POLICY IF EXISTS "Users can view look-ahead activities for their company" ON look_ahead_activities;
CREATE POLICY "Users can view look-ahead activities for their company" ON look_ahead_activities
  FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert look-ahead activities for their company" ON look_ahead_activities;
CREATE POLICY "Users can insert look-ahead activities for their company" ON look_ahead_activities
  FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update look-ahead activities for their company" ON look_ahead_activities;
CREATE POLICY "Users can update look-ahead activities for their company" ON look_ahead_activities
  FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete look-ahead activities for their company" ON look_ahead_activities;
CREATE POLICY "Users can delete look-ahead activities for their company" ON look_ahead_activities
  FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- RLS Policies: look_ahead_constraints
-- =============================================
DROP POLICY IF EXISTS "Users can view look-ahead constraints for their company" ON look_ahead_constraints;
CREATE POLICY "Users can view look-ahead constraints for their company" ON look_ahead_constraints
  FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert look-ahead constraints for their company" ON look_ahead_constraints;
CREATE POLICY "Users can insert look-ahead constraints for their company" ON look_ahead_constraints
  FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update look-ahead constraints for their company" ON look_ahead_constraints;
CREATE POLICY "Users can update look-ahead constraints for their company" ON look_ahead_constraints
  FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete look-ahead constraints for their company" ON look_ahead_constraints;
CREATE POLICY "Users can delete look-ahead constraints for their company" ON look_ahead_constraints
  FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- RLS Policies: look_ahead_snapshots
-- =============================================
DROP POLICY IF EXISTS "Users can view look-ahead snapshots for their company" ON look_ahead_snapshots;
CREATE POLICY "Users can view look-ahead snapshots for their company" ON look_ahead_snapshots
  FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert look-ahead snapshots for their company" ON look_ahead_snapshots;
CREATE POLICY "Users can insert look-ahead snapshots for their company" ON look_ahead_snapshots
  FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- RLS Policies: look_ahead_templates
-- =============================================
DROP POLICY IF EXISTS "Users can view look-ahead templates for their company" ON look_ahead_templates;
CREATE POLICY "Users can view look-ahead templates for their company" ON look_ahead_templates
  FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage look-ahead templates for their company" ON look_ahead_templates;
CREATE POLICY "Users can manage look-ahead templates for their company" ON look_ahead_templates
  FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- FUNCTION: get_look_ahead_week_range
-- Get the 3-week date range from a starting Monday
-- =============================================
CREATE OR REPLACE FUNCTION get_look_ahead_week_range(p_start_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  week_number INTEGER,
  week_start DATE,
  week_end DATE,
  week_label TEXT
) AS $$
DECLARE
  v_monday DATE;
BEGIN
  -- Find the Monday of the current week
  v_monday := p_start_date - EXTRACT(DOW FROM p_start_date)::INTEGER + 1;
  IF EXTRACT(DOW FROM p_start_date) = 0 THEN
    v_monday := v_monday - 7;
  END IF;

  -- Return 3 weeks
  FOR i IN 1..3 LOOP
    week_number := i;
    week_start := v_monday + ((i - 1) * 7);
    week_end := week_start + 6;
    week_label := 'Week ' || i || ' (' || to_char(week_start, 'Mon DD') || ' - ' || to_char(week_end, 'Mon DD') || ')';
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- FUNCTION: calculate_ppc_for_week
-- Calculate Percent Plan Complete for a specific week
-- =============================================
CREATE OR REPLACE FUNCTION calculate_ppc_for_week(
  p_project_id UUID,
  p_week_start DATE
)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
  v_planned INTEGER;
  v_completed INTEGER;
  v_ppc DECIMAL(5, 2);
BEGIN
  -- Count planned activities for the week
  SELECT COUNT(*) INTO v_planned
  FROM look_ahead_activities
  WHERE project_id = p_project_id
    AND week_start_date = p_week_start
    AND status != 'cancelled'
    AND deleted_at IS NULL;

  -- Count completed activities
  SELECT COUNT(*) INTO v_completed
  FROM look_ahead_activities
  WHERE project_id = p_project_id
    AND week_start_date = p_week_start
    AND status = 'completed'
    AND deleted_at IS NULL;

  -- Calculate PPC
  IF v_planned > 0 THEN
    v_ppc := ROUND((v_completed::DECIMAL / v_planned) * 100, 2);
  ELSE
    v_ppc := 0;
  END IF;

  RETURN v_ppc;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- FUNCTION: create_weekly_snapshot
-- Create a snapshot of look-ahead performance
-- =============================================
CREATE OR REPLACE FUNCTION create_weekly_snapshot(
  p_project_id UUID,
  p_company_id UUID,
  p_week_start DATE,
  p_notes TEXT DEFAULT NULL,
  p_variance_reasons JSONB DEFAULT '[]'
)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_week_end DATE;
  v_planned INTEGER;
  v_completed INTEGER;
  v_delayed INTEGER;
  v_blocked INTEGER;
  v_cancelled INTEGER;
  v_total_constraints INTEGER;
  v_resolved_constraints INTEGER;
  v_open_constraints INTEGER;
BEGIN
  v_week_end := p_week_start + 6;

  -- Count activities by status
  SELECT
    COUNT(*) FILTER (WHERE status != 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'delayed'),
    COUNT(*) FILTER (WHERE status = 'blocked'),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_planned, v_completed, v_delayed, v_blocked, v_cancelled
  FROM look_ahead_activities
  WHERE project_id = p_project_id
    AND week_start_date = p_week_start
    AND deleted_at IS NULL;

  -- Count constraints
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('resolved', 'waived')),
    COUNT(*) FILTER (WHERE status = 'open')
  INTO v_total_constraints, v_resolved_constraints, v_open_constraints
  FROM look_ahead_constraints c
  JOIN look_ahead_activities a ON c.activity_id = a.id
  WHERE a.project_id = p_project_id
    AND a.week_start_date = p_week_start;

  -- Insert or update snapshot
  INSERT INTO look_ahead_snapshots (
    project_id, company_id, week_start_date, week_end_date,
    planned_activities, completed_activities, delayed_activities,
    blocked_activities, cancelled_activities,
    total_constraints, resolved_constraints, open_constraints,
    variance_reasons, notes, created_by
  ) VALUES (
    p_project_id, p_company_id, p_week_start, v_week_end,
    v_planned, v_completed, v_delayed, v_blocked, v_cancelled,
    v_total_constraints, v_resolved_constraints, v_open_constraints,
    p_variance_reasons, p_notes, auth.uid()
  )
  ON CONFLICT (project_id, week_start_date) DO UPDATE SET
    planned_activities = EXCLUDED.planned_activities,
    completed_activities = EXCLUDED.completed_activities,
    delayed_activities = EXCLUDED.delayed_activities,
    blocked_activities = EXCLUDED.blocked_activities,
    cancelled_activities = EXCLUDED.cancelled_activities,
    total_constraints = EXCLUDED.total_constraints,
    resolved_constraints = EXCLUDED.resolved_constraints,
    open_constraints = EXCLUDED.open_constraints,
    variance_reasons = EXCLUDED.variance_reasons,
    notes = EXCLUDED.notes,
    snapshot_date = NOW()
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: get_activities_for_week
-- Get activities for a specific week with constraints
-- =============================================
CREATE OR REPLACE FUNCTION get_activities_for_week(
  p_project_id UUID,
  p_week_start DATE
)
RETURNS TABLE (
  id UUID,
  activity_name VARCHAR(255),
  description TEXT,
  location VARCHAR(255),
  trade VARCHAR(100),
  subcontractor_name VARCHAR(255),
  planned_start_date DATE,
  planned_end_date DATE,
  duration_days INTEGER,
  status look_ahead_activity_status,
  percent_complete INTEGER,
  priority INTEGER,
  constraint_count BIGINT,
  open_constraint_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.activity_name,
    a.description,
    a.location,
    a.trade,
    s.name as subcontractor_name,
    a.planned_start_date,
    a.planned_end_date,
    a.duration_days,
    a.status,
    a.percent_complete,
    a.priority,
    COUNT(c.id) as constraint_count,
    COUNT(c.id) FILTER (WHERE c.status = 'open') as open_constraint_count
  FROM look_ahead_activities a
  LEFT JOIN subcontractors s ON a.subcontractor_id = s.id
  LEFT JOIN look_ahead_constraints c ON c.activity_id = a.id
  WHERE a.project_id = p_project_id
    AND a.week_start_date = p_week_start
    AND a.deleted_at IS NULL
  GROUP BY a.id, s.name
  ORDER BY a.priority DESC, a.planned_start_date, a.sort_order;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- FUNCTION: assign_activity_to_week
-- Move an activity to a different week
-- =============================================
CREATE OR REPLACE FUNCTION assign_activity_to_week(
  p_activity_id UUID,
  p_new_week_start DATE,
  p_new_week_number INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE look_ahead_activities
  SET
    week_start_date = p_new_week_start,
    week_number = p_new_week_number,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_activity_id
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEW: look_ahead_activity_summary
-- Summary view with constraint info
-- =============================================
CREATE OR REPLACE VIEW look_ahead_activity_summary AS
SELECT
  a.id,
  a.project_id,
  p.name as project_name,
  a.activity_name,
  a.description,
  a.location,
  a.trade,
  s.name as subcontractor_name,
  a.planned_start_date,
  a.planned_end_date,
  a.actual_start_date,
  a.actual_end_date,
  a.duration_days,
  a.status,
  a.percent_complete,
  a.week_number,
  a.week_start_date,
  a.priority,
  a.notes,
  COUNT(c.id) as total_constraints,
  COUNT(c.id) FILTER (WHERE c.status = 'open') as open_constraints,
  a.created_at,
  a.updated_at
FROM look_ahead_activities a
JOIN projects p ON a.project_id = p.id
LEFT JOIN subcontractors s ON a.subcontractor_id = s.id
LEFT JOIN look_ahead_constraints c ON c.activity_id = a.id
WHERE a.deleted_at IS NULL
  AND p.deleted_at IS NULL
GROUP BY a.id, p.name, s.name;

-- =============================================
-- VIEW: project_ppc_trend
-- PPC trend over time for a project
-- =============================================
CREATE OR REPLACE VIEW project_ppc_trend AS
SELECT
  s.project_id,
  p.name as project_name,
  s.week_start_date,
  s.week_end_date,
  s.planned_activities,
  s.completed_activities,
  s.ppc_percentage,
  s.delayed_activities,
  s.blocked_activities,
  s.open_constraints,
  s.variance_reasons,
  s.notes,
  LAG(s.ppc_percentage) OVER (PARTITION BY s.project_id ORDER BY s.week_start_date) as previous_week_ppc,
  s.ppc_percentage - COALESCE(LAG(s.ppc_percentage) OVER (PARTITION BY s.project_id ORDER BY s.week_start_date), 0) as ppc_change
FROM look_ahead_snapshots s
JOIN projects p ON s.project_id = p.id
WHERE p.deleted_at IS NULL
ORDER BY s.project_id, s.week_start_date;

-- =============================================
-- Triggers for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_look_ahead_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_look_ahead_activities_timestamp ON look_ahead_activities;
CREATE TRIGGER update_look_ahead_activities_timestamp
  BEFORE UPDATE ON look_ahead_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_look_ahead_timestamp();

DROP TRIGGER IF EXISTS update_look_ahead_constraints_timestamp ON look_ahead_constraints;
CREATE TRIGGER update_look_ahead_constraints_timestamp
  BEFORE UPDATE ON look_ahead_constraints
  FOR EACH ROW
  EXECUTE FUNCTION update_look_ahead_timestamp();

DROP TRIGGER IF EXISTS update_look_ahead_templates_timestamp ON look_ahead_templates;
CREATE TRIGGER update_look_ahead_templates_timestamp
  BEFORE UPDATE ON look_ahead_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_look_ahead_timestamp();

-- =============================================
-- Insert default templates
-- =============================================
INSERT INTO look_ahead_templates (company_id, template_name, trade, description, default_duration_days, typical_constraints)
SELECT
  c.id,
  t.template_name,
  t.trade,
  t.description,
  t.default_duration_days,
  t.typical_constraints::JSONB
FROM companies c
CROSS JOIN (VALUES
  ('Foundation Pour', 'Concrete', 'Concrete foundation pour with finishing', 2, '["weather_dependent", "inspection_required"]'),
  ('Rough Electrical', 'Electrical', 'Rough-in electrical wiring and boxes', 3, '["predecessor_activity", "inspection_required"]'),
  ('Rough Plumbing', 'Plumbing', 'Rough-in plumbing lines and fixtures', 3, '["predecessor_activity", "inspection_required"]'),
  ('HVAC Rough-In', 'HVAC', 'Install ductwork and mechanical rough-in', 4, '["predecessor_activity", "submittal_pending"]'),
  ('Framing', 'Carpentry', 'Wood or metal stud framing', 5, '["material_delivery", "predecessor_activity"]'),
  ('Drywall Hang', 'Drywall', 'Hang and tape drywall', 3, '["predecessor_activity", "inspection_required"]'),
  ('Drywall Finish', 'Drywall', 'Finish and sand drywall', 2, '["predecessor_activity"]'),
  ('Interior Paint', 'Painting', 'Prime and paint interior walls', 3, '["predecessor_activity"]'),
  ('Flooring Install', 'Flooring', 'Install floor covering', 2, '["material_delivery", "predecessor_activity"]'),
  ('Trim Carpentry', 'Carpentry', 'Install trim, doors, and millwork', 3, '["material_delivery", "predecessor_activity"]')
) AS t(template_name, trade, description, default_duration_days, typical_constraints)
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 073_look_ahead_planning completed successfully';
END $$;
