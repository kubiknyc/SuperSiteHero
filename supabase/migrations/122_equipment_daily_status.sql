-- Migration 122: Equipment Daily Status Integration
-- Phase 2.2: Cross-Feature Integration - Equipment Integration with Daily Reports
-- Enables equipment ready-state checklists and status tracking within daily reports

-- =============================================================================
-- EQUIPMENT DAILY STATUS TABLE
-- =============================================================================

-- Track equipment status for each daily report
CREATE TABLE IF NOT EXISTS equipment_daily_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Checklist status
  checklist_completed BOOLEAN DEFAULT false,
  checklist_completed_at TIMESTAMPTZ,
  checklist_completed_by UUID REFERENCES users(id),

  -- Equipment status for the day
  status TEXT NOT NULL DEFAULT 'not_checked' CHECK (status IN (
    'ready',
    'maintenance_required',
    'down',
    'not_used',
    'not_checked'
  )),

  -- Usage tracking
  hours_used DECIMAL(5, 2) DEFAULT 0,
  hours_start DECIMAL(10, 2),
  hours_end DECIMAL(10, 2),

  -- Operator info
  operator_id UUID REFERENCES users(id),
  operator_name TEXT,

  -- Work performed
  work_area TEXT,
  work_description TEXT,

  -- Pre-use inspection items (stored as JSONB for flexibility)
  inspection_items JSONB DEFAULT '[]'::jsonb,

  -- Maintenance alerts that were active
  maintenance_alerts TEXT[] DEFAULT '{}',

  -- Issues found during pre-use inspection
  issues_found TEXT,
  issue_severity TEXT CHECK (issue_severity IS NULL OR issue_severity IN (
    'minor', 'moderate', 'critical'
  )),

  -- Follow-up required
  requires_maintenance BOOLEAN DEFAULT false,
  maintenance_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint - one status record per equipment per daily report
  CONSTRAINT unique_equipment_daily_status UNIQUE(equipment_id, daily_report_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_equipment_daily_status_report ON equipment_daily_status(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_equipment_daily_status_equipment ON equipment_daily_status(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_daily_status_project ON equipment_daily_status(project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_daily_status_status ON equipment_daily_status(status) WHERE status != 'ready';
CREATE INDEX IF NOT EXISTS idx_equipment_daily_status_date ON equipment_daily_status(created_at DESC);

-- =============================================================================
-- EQUIPMENT READY STATE CHECKLIST TEMPLATES
-- =============================================================================

-- Store standard checklist templates for equipment types
CREATE TABLE IF NOT EXISTS equipment_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  equipment_type TEXT, -- NULL means applies to all types

  -- Checklist items
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each item: { "id": "uuid", "label": "Check fluid levels", "required": true, "category": "Safety" }

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_equipment_checklist_templates_company ON equipment_checklist_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_checklist_templates_type ON equipment_checklist_templates(equipment_type);

-- Insert default checklist templates
INSERT INTO equipment_checklist_templates (company_id, name, equipment_type, items, is_default)
SELECT
  c.id,
  'Heavy Equipment Pre-Use Inspection',
  NULL,
  '[
    {"id": "1", "label": "Check engine oil level", "required": true, "category": "Fluids"},
    {"id": "2", "label": "Check hydraulic fluid level", "required": true, "category": "Fluids"},
    {"id": "3", "label": "Check coolant level", "required": true, "category": "Fluids"},
    {"id": "4", "label": "Check fuel level", "required": false, "category": "Fluids"},
    {"id": "5", "label": "Inspect tires/tracks for damage", "required": true, "category": "Undercarriage"},
    {"id": "6", "label": "Check backup alarm operation", "required": true, "category": "Safety"},
    {"id": "7", "label": "Check horn operation", "required": true, "category": "Safety"},
    {"id": "8", "label": "Check all lights", "required": true, "category": "Safety"},
    {"id": "9", "label": "Check mirrors and visibility", "required": true, "category": "Safety"},
    {"id": "10", "label": "Check seatbelt condition", "required": true, "category": "Safety"},
    {"id": "11", "label": "Check fire extinguisher present", "required": true, "category": "Safety"},
    {"id": "12", "label": "Inspect for fluid leaks", "required": true, "category": "General"},
    {"id": "13", "label": "Check controls respond properly", "required": true, "category": "Operation"},
    {"id": "14", "label": "Check parking brake operation", "required": true, "category": "Operation"}
  ]'::jsonb,
  true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM equipment_checklist_templates ect
  WHERE ect.company_id = c.id AND ect.is_default = true
);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to get equipment status summary for a daily report
CREATE OR REPLACE FUNCTION get_daily_report_equipment_summary(p_daily_report_id UUID)
RETURNS TABLE (
  total_equipment INTEGER,
  ready_count INTEGER,
  maintenance_required_count INTEGER,
  down_count INTEGER,
  not_used_count INTEGER,
  not_checked_count INTEGER,
  total_hours DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_equipment,
    COUNT(*) FILTER (WHERE eds.status = 'ready')::INTEGER as ready_count,
    COUNT(*) FILTER (WHERE eds.status = 'maintenance_required')::INTEGER as maintenance_required_count,
    COUNT(*) FILTER (WHERE eds.status = 'down')::INTEGER as down_count,
    COUNT(*) FILTER (WHERE eds.status = 'not_used')::INTEGER as not_used_count,
    COUNT(*) FILTER (WHERE eds.status = 'not_checked')::INTEGER as not_checked_count,
    COALESCE(SUM(eds.hours_used), 0)::DECIMAL as total_hours
  FROM equipment_daily_status eds
  WHERE eds.daily_report_id = p_daily_report_id;
END;
$$;

-- Function to copy equipment from previous day's report
CREATE OR REPLACE FUNCTION copy_equipment_from_previous_day(
  p_daily_report_id UUID,
  p_project_id UUID,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_date DATE;
  v_previous_report_id UUID;
  v_count INTEGER := 0;
  v_company_id UUID;
BEGIN
  -- Get the date of the current report
  SELECT report_date, company_id INTO v_report_date, v_company_id
  FROM daily_reports
  WHERE id = p_daily_report_id;

  -- Find the previous day's report
  SELECT id INTO v_previous_report_id
  FROM daily_reports
  WHERE project_id = p_project_id
    AND report_date < v_report_date
    AND deleted_at IS NULL
  ORDER BY report_date DESC
  LIMIT 1;

  IF v_previous_report_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Copy equipment status records (without checklist completion)
  INSERT INTO equipment_daily_status (
    equipment_id,
    daily_report_id,
    project_id,
    company_id,
    status,
    operator_id,
    operator_name,
    work_area
  )
  SELECT
    eds.equipment_id,
    p_daily_report_id,
    p_project_id,
    v_company_id,
    'not_checked', -- Reset status for new day
    eds.operator_id,
    eds.operator_name,
    eds.work_area
  FROM equipment_daily_status eds
  WHERE eds.daily_report_id = v_previous_report_id
    AND eds.status IN ('ready', 'not_used') -- Only copy equipment that was available
  ON CONFLICT (equipment_id, daily_report_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to get equipment with maintenance alerts for a project
CREATE OR REPLACE FUNCTION get_equipment_maintenance_alerts(p_project_id UUID)
RETURNS TABLE (
  equipment_id UUID,
  equipment_name TEXT,
  equipment_number TEXT,
  alert_type TEXT,
  alert_message TEXT,
  alert_severity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id as equipment_id,
    e.name as equipment_name,
    e.equipment_number,
    CASE
      WHEN e.status = 'maintenance' THEN 'status'
      WHEN em.scheduled_date < CURRENT_DATE THEN 'overdue_maintenance'
      WHEN em.scheduled_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming_maintenance'
      WHEN e.insurance_expiry < CURRENT_DATE THEN 'expired_insurance'
      WHEN e.registration_expiry < CURRENT_DATE THEN 'expired_registration'
      ELSE 'info'
    END as alert_type,
    CASE
      WHEN e.status = 'maintenance' THEN 'Equipment is in maintenance mode'
      WHEN em.scheduled_date < CURRENT_DATE THEN 'Overdue maintenance: ' || em.description
      WHEN em.scheduled_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Maintenance due: ' || em.description
      WHEN e.insurance_expiry < CURRENT_DATE THEN 'Insurance has expired'
      WHEN e.registration_expiry < CURRENT_DATE THEN 'Registration has expired'
      ELSE NULL
    END as alert_message,
    CASE
      WHEN e.status = 'maintenance' OR em.scheduled_date < CURRENT_DATE THEN 'critical'
      WHEN em.scheduled_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'warning'
      ELSE 'info'
    END as alert_severity
  FROM equipment e
  LEFT JOIN equipment_maintenance em ON e.id = em.equipment_id
    AND em.status = 'scheduled'
    AND em.scheduled_date <= CURRENT_DATE + INTERVAL '7 days'
  INNER JOIN equipment_assignments ea ON e.id = ea.equipment_id
    AND ea.project_id = p_project_id
    AND ea.status = 'active'
  WHERE e.deleted_at IS NULL
    AND (
      e.status = 'maintenance'
      OR em.scheduled_date IS NOT NULL
      OR e.insurance_expiry < CURRENT_DATE
      OR e.registration_expiry < CURRENT_DATE
    )
  ORDER BY
    CASE
      WHEN e.status = 'maintenance' OR em.scheduled_date < CURRENT_DATE THEN 1
      ELSE 2
    END,
    e.equipment_number;
END;
$$;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE equipment_daily_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_checklist_templates ENABLE ROW LEVEL SECURITY;

-- Equipment daily status policies
CREATE POLICY "equipment_daily_status_select" ON equipment_daily_status
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "equipment_daily_status_insert" ON equipment_daily_status
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "equipment_daily_status_update" ON equipment_daily_status
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "equipment_daily_status_delete" ON equipment_daily_status
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Checklist templates policies
CREATE POLICY "equipment_checklist_templates_select" ON equipment_checklist_templates
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "equipment_checklist_templates_insert" ON equipment_checklist_templates
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "equipment_checklist_templates_update" ON equipment_checklist_templates
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_equipment_daily_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_daily_status_updated_at
  BEFORE UPDATE ON equipment_daily_status
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_daily_status_timestamp();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE equipment_daily_status IS 'Track equipment status and pre-use inspections for daily reports';
COMMENT ON TABLE equipment_checklist_templates IS 'Standard checklist templates for equipment pre-use inspections';
COMMENT ON FUNCTION get_daily_report_equipment_summary IS 'Get summary statistics of equipment status for a daily report';
COMMENT ON FUNCTION copy_equipment_from_previous_day IS 'Copy equipment entries from the previous day report';
COMMENT ON FUNCTION get_equipment_maintenance_alerts IS 'Get active maintenance alerts for equipment on a project';
