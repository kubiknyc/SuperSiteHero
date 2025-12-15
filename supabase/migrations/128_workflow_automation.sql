-- Migration: 121_workflow_automation.sql
-- Phase 5: Field Workflow Automation
-- Implements: Auto-Escalation Engine, Equipment Maintenance Schedules, Automated Reports

-- =============================================
-- Milestone 5.1: Auto-Escalation Engine
-- =============================================

-- Escalation Rules Table
-- Defines conditions and actions for automatic escalation
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Rule Definition
  name TEXT NOT NULL,
  description TEXT,

  -- Source Configuration
  source_type TEXT NOT NULL CHECK (source_type IN (
    'inspection', 'checklist', 'safety_observation', 'punch_item',
    'rfi', 'submittal', 'task', 'equipment_inspection'
  )),

  -- Trigger Conditions (JSONB for flexible conditions)
  -- Example: {"field": "status", "operator": "equals", "value": "failed"}
  -- Complex: {"and": [{"field": "severity", "operator": "gte", "value": 3}, {"field": "category", "operator": "in", "value": ["safety", "quality"]}]}
  trigger_condition JSONB NOT NULL DEFAULT '{}',

  -- Action Configuration
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create_punch_item', 'create_task', 'send_notification',
    'create_rfi', 'assign_user', 'change_status', 'create_inspection'
  )),

  -- Action-specific configuration
  -- For create_punch_item: {"priority": "high", "trade": "General", "assignee_type": "project_manager"}
  -- For send_notification: {"recipients": ["role:project_manager"], "template": "escalation_alert"}
  action_config JSONB NOT NULL DEFAULT '{}',

  -- Rule Settings
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority rules execute first
  execution_delay_minutes INTEGER DEFAULT 0, -- Delay before executing action

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escalation Events Table
-- Tracks each time an escalation rule is triggered
CREATE TABLE IF NOT EXISTS escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES escalation_rules(id) ON DELETE SET NULL,

  -- Source Item
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  source_data JSONB, -- Snapshot of source data at trigger time

  -- Result Item (created by the action)
  result_type TEXT,
  result_id UUID,

  -- Execution Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'skipped')),
  error_message TEXT,

  -- Timing
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ, -- When action should execute (for delayed executions)
  executed_at TIMESTAMPTZ,

  -- Context
  project_id UUID REFERENCES projects(id),
  triggered_by UUID REFERENCES users(id), -- User whose action triggered the rule

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for escalation_rules
CREATE INDEX IF NOT EXISTS idx_escalation_rules_project ON escalation_rules(project_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_escalation_rules_company ON escalation_rules(company_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_escalation_rules_source_type ON escalation_rules(source_type) WHERE is_active = true;

-- Indexes for escalation_events
CREATE INDEX IF NOT EXISTS idx_escalation_events_source ON escalation_events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_escalation_events_status ON escalation_events(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_escalation_events_scheduled ON escalation_events(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_escalation_events_project ON escalation_events(project_id);
CREATE INDEX IF NOT EXISTS idx_escalation_events_rule ON escalation_events(rule_id);

-- =============================================
-- Milestone 5.2: Equipment Maintenance Schedules
-- =============================================

-- Equipment Maintenance Schedules
-- Defines recurring maintenance requirements
CREATE TABLE IF NOT EXISTS equipment_maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,

  -- Maintenance Definition
  maintenance_type TEXT NOT NULL,
  description TEXT,

  -- Frequency (can be hour-based, day-based, or both)
  frequency_hours INTEGER, -- Every X hours of operation
  frequency_days INTEGER,  -- Every X days

  -- Last Performed
  last_performed_at TIMESTAMPTZ,
  last_performed_hours DECIMAL(10, 2),

  -- Next Due
  next_due_at TIMESTAMPTZ,
  next_due_hours DECIMAL(10, 2),

  -- Settings
  block_usage_when_overdue BOOLEAN DEFAULT false,
  warning_threshold_hours INTEGER DEFAULT 50, -- Warn when within X hours of due
  warning_threshold_days INTEGER DEFAULT 7,   -- Warn when within X days of due

  -- Assignee
  default_assignee_id UUID REFERENCES users(id),
  service_provider TEXT,

  -- Notifications
  notify_on_due BOOLEAN DEFAULT true,
  notify_on_overdue BOOLEAN DEFAULT true,
  notification_recipients UUID[], -- Array of user IDs

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Maintenance Alerts
-- Tracks triggered maintenance alerts
CREATE TABLE IF NOT EXISTS equipment_maintenance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES equipment_maintenance_schedules(id) ON DELETE SET NULL,

  -- Alert Info
  alert_type TEXT NOT NULL CHECK (alert_type IN ('upcoming', 'due', 'overdue', 'critical')),
  message TEXT,

  -- Timing
  triggered_at TIMESTAMPTZ DEFAULT NOW(),

  -- Acknowledgment
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,

  -- Dismissal (temporary hide)
  dismissed_by UUID REFERENCES users(id),
  dismissed_at TIMESTAMPTZ,
  dismiss_until TIMESTAMPTZ, -- Auto-show again after this time

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by_maintenance_id UUID REFERENCES equipment_maintenance(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for maintenance schedules
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_schedules_equipment ON equipment_maintenance_schedules(equipment_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_schedules_next_due ON equipment_maintenance_schedules(next_due_at) WHERE is_active = true;

-- Indexes for maintenance alerts
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_alerts_equipment ON equipment_maintenance_alerts(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_alerts_unacked ON equipment_maintenance_alerts(equipment_id, triggered_at)
  WHERE acknowledged_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_alerts_schedule ON equipment_maintenance_alerts(schedule_id);

-- =============================================
-- Milestone 5.3: Scheduled Field Reports
-- =============================================

-- Auto-compiled Field Reports Configuration
CREATE TABLE IF NOT EXISTS scheduled_field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Report Definition
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'daily_summary', 'weekly_progress', 'safety_summary',
    'quality_metrics', 'equipment_status', 'client_report', 'custom'
  )),

  -- Schedule Configuration
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER, -- 0=Sunday, 6=Saturday (for weekly/biweekly)
  day_of_month INTEGER, -- 1-28 (for monthly)
  time_of_day TIME NOT NULL DEFAULT '18:00',
  timezone TEXT DEFAULT 'America/New_York',

  -- Content Configuration
  -- Specifies what data to include and how to format it
  content_config JSONB NOT NULL DEFAULT '{
    "sections": ["summary", "safety", "quality", "schedule", "photos"],
    "include_charts": true,
    "date_range": "period"
  }',

  -- Distribution
  distribution_list_id UUID REFERENCES distribution_lists(id),
  recipient_emails TEXT[], -- Direct email addresses
  recipient_user_ids UUID[], -- User IDs from profiles

  -- Email Configuration
  email_subject_template TEXT,
  email_body_template TEXT,
  include_pdf_attachment BOOLEAN DEFAULT true,

  -- Output
  output_format TEXT DEFAULT 'pdf' CHECK (output_format IN ('pdf', 'excel', 'html')),

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Field Reports History
CREATE TABLE IF NOT EXISTS generated_field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID REFERENCES scheduled_field_reports(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id),

  -- Report Info
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  period_start DATE,
  period_end DATE,

  -- Content
  report_data JSONB, -- Compiled report data

  -- Storage
  file_url TEXT,
  file_size_bytes INTEGER,

  -- Distribution
  recipients_sent TEXT[],
  sent_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed', 'sent')),
  error_message TEXT,

  -- Metadata
  generated_by UUID REFERENCES users(id), -- NULL if auto-generated
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scheduled field reports
CREATE INDEX IF NOT EXISTS idx_scheduled_field_reports_project ON scheduled_field_reports(project_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_field_reports_company ON scheduled_field_reports(company_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_field_reports_next ON scheduled_field_reports(next_scheduled_at) WHERE is_active = true;

-- Indexes for generated field reports
CREATE INDEX IF NOT EXISTS idx_generated_field_reports_scheduled ON generated_field_reports(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_generated_field_reports_project ON generated_field_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_field_reports_created ON generated_field_reports(created_at DESC);

-- =============================================
-- Helper Functions
-- =============================================

-- Function to evaluate escalation conditions
CREATE OR REPLACE FUNCTION evaluate_escalation_condition(
  p_condition JSONB,
  p_source_data JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_field TEXT;
  v_operator TEXT;
  v_value JSONB;
  v_actual_value JSONB;
  v_result BOOLEAN;
  v_condition JSONB;
  v_all_match BOOLEAN;
BEGIN
  -- Handle null condition
  IF p_condition IS NULL OR p_condition = '{}'::JSONB THEN
    RETURN true;
  END IF;

  -- Handle AND conditions
  IF p_condition ? 'and' THEN
    v_all_match := true;
    FOR v_condition IN SELECT jsonb_array_elements(p_condition->'and')
    LOOP
      IF NOT evaluate_escalation_condition(v_condition, p_source_data) THEN
        v_all_match := false;
        EXIT;
      END IF;
    END LOOP;
    RETURN v_all_match;
  END IF;

  -- Handle OR conditions
  IF p_condition ? 'or' THEN
    FOR v_condition IN SELECT jsonb_array_elements(p_condition->'or')
    LOOP
      IF evaluate_escalation_condition(v_condition, p_source_data) THEN
        RETURN true;
      END IF;
    END LOOP;
    RETURN false;
  END IF;

  -- Simple condition
  v_field := p_condition->>'field';
  v_operator := p_condition->>'operator';
  v_value := p_condition->'value';

  IF v_field IS NULL THEN
    RETURN true;
  END IF;

  v_actual_value := p_source_data->v_field;

  -- Evaluate based on operator
  CASE v_operator
    WHEN 'equals', 'eq' THEN
      RETURN v_actual_value = v_value;
    WHEN 'not_equals', 'neq' THEN
      RETURN v_actual_value != v_value;
    WHEN 'greater_than', 'gt' THEN
      RETURN (v_actual_value::TEXT)::NUMERIC > (v_value::TEXT)::NUMERIC;
    WHEN 'greater_or_equal', 'gte' THEN
      RETURN (v_actual_value::TEXT)::NUMERIC >= (v_value::TEXT)::NUMERIC;
    WHEN 'less_than', 'lt' THEN
      RETURN (v_actual_value::TEXT)::NUMERIC < (v_value::TEXT)::NUMERIC;
    WHEN 'less_or_equal', 'lte' THEN
      RETURN (v_actual_value::TEXT)::NUMERIC <= (v_value::TEXT)::NUMERIC;
    WHEN 'contains' THEN
      RETURN (v_actual_value::TEXT) ILIKE '%' || (v_value::TEXT) || '%';
    WHEN 'in' THEN
      RETURN v_actual_value <@ v_value;
    WHEN 'not_in' THEN
      RETURN NOT (v_actual_value <@ v_value);
    WHEN 'is_null' THEN
      RETURN v_actual_value IS NULL;
    WHEN 'is_not_null' THEN
      RETURN v_actual_value IS NOT NULL;
    ELSE
      RETURN true;
  END CASE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next maintenance due
CREATE OR REPLACE FUNCTION calculate_next_maintenance_due(
  p_schedule_id UUID
) RETURNS VOID AS $$
DECLARE
  v_schedule equipment_maintenance_schedules%ROWTYPE;
  v_equipment equipment%ROWTYPE;
  v_next_due_at TIMESTAMPTZ;
  v_next_due_hours DECIMAL(10, 2);
BEGIN
  SELECT * INTO v_schedule FROM equipment_maintenance_schedules WHERE id = p_schedule_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_equipment FROM equipment WHERE id = v_schedule.equipment_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Calculate next due date based on days
  IF v_schedule.frequency_days IS NOT NULL THEN
    IF v_schedule.last_performed_at IS NOT NULL THEN
      v_next_due_at := v_schedule.last_performed_at + (v_schedule.frequency_days || ' days')::INTERVAL;
    ELSE
      v_next_due_at := NOW() + (v_schedule.frequency_days || ' days')::INTERVAL;
    END IF;
  END IF;

  -- Calculate next due hours
  IF v_schedule.frequency_hours IS NOT NULL THEN
    IF v_schedule.last_performed_hours IS NOT NULL THEN
      v_next_due_hours := v_schedule.last_performed_hours + v_schedule.frequency_hours;
    ELSE
      v_next_due_hours := v_equipment.current_hours + v_schedule.frequency_hours;
    END IF;
  END IF;

  -- Update the schedule
  UPDATE equipment_maintenance_schedules
  SET
    next_due_at = v_next_due_at,
    next_due_hours = v_next_due_hours,
    updated_at = NOW()
  WHERE id = p_schedule_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check equipment maintenance status
CREATE OR REPLACE FUNCTION check_equipment_maintenance_status(
  p_equipment_id UUID
) RETURNS TABLE (
  schedule_id UUID,
  maintenance_type TEXT,
  alert_type TEXT,
  is_blocked BOOLEAN
) AS $$
DECLARE
  v_schedule equipment_maintenance_schedules%ROWTYPE;
  v_equipment equipment%ROWTYPE;
  v_alert_type TEXT;
BEGIN
  SELECT * INTO v_equipment FROM equipment WHERE id = p_equipment_id;
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_schedule IN
    SELECT * FROM equipment_maintenance_schedules
    WHERE equipment_id = p_equipment_id AND is_active = true
  LOOP
    v_alert_type := NULL;

    -- Check hour-based due
    IF v_schedule.next_due_hours IS NOT NULL THEN
      IF v_equipment.current_hours >= v_schedule.next_due_hours THEN
        v_alert_type := 'overdue';
      ELSIF v_equipment.current_hours >= (v_schedule.next_due_hours - COALESCE(v_schedule.warning_threshold_hours, 50)) THEN
        v_alert_type := 'upcoming';
      END IF;
    END IF;

    -- Check date-based due
    IF v_schedule.next_due_at IS NOT NULL THEN
      IF NOW() >= v_schedule.next_due_at THEN
        v_alert_type := CASE
          WHEN v_alert_type = 'overdue' THEN 'critical'
          ELSE 'overdue'
        END;
      ELSIF NOW() >= (v_schedule.next_due_at - (COALESCE(v_schedule.warning_threshold_days, 7) || ' days')::INTERVAL) THEN
        v_alert_type := COALESCE(v_alert_type, 'upcoming');
      END IF;
    END IF;

    IF v_alert_type IS NOT NULL THEN
      schedule_id := v_schedule.id;
      maintenance_type := v_schedule.maintenance_type;
      alert_type := v_alert_type;
      is_blocked := v_schedule.block_usage_when_overdue AND v_alert_type IN ('overdue', 'critical');
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next scheduled report run time
CREATE OR REPLACE FUNCTION calculate_next_report_run(
  p_frequency TEXT,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_time_of_day TIME,
  p_timezone TEXT
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_now TIMESTAMPTZ;
  v_next_run TIMESTAMPTZ;
  v_current_day INTEGER;
  v_days_until INTEGER;
BEGIN
  v_now := NOW() AT TIME ZONE COALESCE(p_timezone, 'UTC');

  -- Start with today at the specified time
  v_next_run := DATE(v_now) + p_time_of_day;

  CASE p_frequency
    WHEN 'daily' THEN
      IF v_next_run <= v_now THEN
        v_next_run := v_next_run + INTERVAL '1 day';
      END IF;

    WHEN 'weekly' THEN
      v_current_day := EXTRACT(DOW FROM v_now)::INTEGER;
      v_days_until := COALESCE(p_day_of_week, 1) - v_current_day;
      IF v_days_until <= 0 OR (v_days_until = 0 AND v_next_run <= v_now) THEN
        v_days_until := v_days_until + 7;
      END IF;
      v_next_run := DATE(v_now) + (v_days_until || ' days')::INTERVAL + p_time_of_day;

    WHEN 'biweekly' THEN
      v_current_day := EXTRACT(DOW FROM v_now)::INTEGER;
      v_days_until := COALESCE(p_day_of_week, 1) - v_current_day;
      IF v_days_until <= 0 OR (v_days_until = 0 AND v_next_run <= v_now) THEN
        v_days_until := v_days_until + 14;
      END IF;
      v_next_run := DATE(v_now) + (v_days_until || ' days')::INTERVAL + p_time_of_day;

    WHEN 'monthly' THEN
      v_next_run := DATE_TRUNC('month', v_now) + ((COALESCE(p_day_of_month, 1) - 1) || ' days')::INTERVAL + p_time_of_day;
      IF v_next_run <= v_now THEN
        v_next_run := DATE_TRUNC('month', v_now) + INTERVAL '1 month' + ((COALESCE(p_day_of_month, 1) - 1) || ' days')::INTERVAL + p_time_of_day;
      END IF;
  END CASE;

  RETURN v_next_run AT TIME ZONE COALESCE(p_timezone, 'UTC');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Triggers
-- =============================================

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_workflow_automation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_escalation_rules_timestamp
  BEFORE UPDATE ON escalation_rules
  FOR EACH ROW EXECUTE FUNCTION update_workflow_automation_timestamp();

CREATE TRIGGER update_equipment_maintenance_schedules_timestamp
  BEFORE UPDATE ON equipment_maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION update_workflow_automation_timestamp();

CREATE TRIGGER update_scheduled_field_reports_timestamp
  BEFORE UPDATE ON scheduled_field_reports
  FOR EACH ROW EXECUTE FUNCTION update_workflow_automation_timestamp();

-- Trigger to calculate next maintenance due on schedule update
CREATE OR REPLACE FUNCTION trigger_calculate_next_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_performed_at IS DISTINCT FROM OLD.last_performed_at
     OR NEW.last_performed_hours IS DISTINCT FROM OLD.last_performed_hours
     OR NEW.frequency_hours IS DISTINCT FROM OLD.frequency_hours
     OR NEW.frequency_days IS DISTINCT FROM OLD.frequency_days THEN
    PERFORM calculate_next_maintenance_due(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_maintenance_due_trigger
  AFTER UPDATE ON equipment_maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION trigger_calculate_next_maintenance();

-- Trigger to set initial next_scheduled_at for field reports
CREATE OR REPLACE FUNCTION trigger_set_next_report_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.next_scheduled_at IS NULL OR TG_OP = 'INSERT' THEN
    NEW.next_scheduled_at := calculate_next_report_run(
      NEW.frequency,
      NEW.day_of_week,
      NEW.day_of_month,
      NEW.time_of_day,
      NEW.timezone
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_next_report_run_trigger
  BEFORE INSERT OR UPDATE ON scheduled_field_reports
  FOR EACH ROW EXECUTE FUNCTION trigger_set_next_report_run();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_field_reports ENABLE ROW LEVEL SECURITY;

-- Escalation Rules Policies
CREATE POLICY "Users can view escalation rules for their projects"
  ON escalation_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = escalation_rules.project_id
      AND pu.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = escalation_rules.company_id
    )
  );

CREATE POLICY "Project admins can manage escalation rules"
  ON escalation_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = escalation_rules.project_id
      AND pu.user_id = auth.uid()
      AND pu.project_role IN ('owner', 'admin', 'project_manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = escalation_rules.company_id
      AND u.role IN ('owner', 'admin')
    )
  );

-- Escalation Events Policies
CREATE POLICY "Users can view escalation events for their projects"
  ON escalation_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = escalation_events.project_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert escalation events"
  ON escalation_events FOR INSERT
  WITH CHECK (true);

-- Equipment Maintenance Schedules Policies
CREATE POLICY "Users can view maintenance schedules for their equipment"
  ON equipment_maintenance_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      JOIN users u ON u.company_id = e.company_id
      WHERE e.id = equipment_maintenance_schedules.equipment_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage maintenance schedules"
  ON equipment_maintenance_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      JOIN users u ON u.company_id = e.company_id
      WHERE e.id = equipment_maintenance_schedules.equipment_id
      AND u.id = auth.uid()
      AND u.role IN ('owner', 'admin', 'project_manager')
    )
  );

-- Equipment Maintenance Alerts Policies
CREATE POLICY "Users can view maintenance alerts for their equipment"
  ON equipment_maintenance_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      JOIN users u ON u.company_id = e.company_id
      WHERE e.id = equipment_maintenance_alerts.equipment_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can acknowledge/dismiss maintenance alerts"
  ON equipment_maintenance_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM equipment e
      JOIN users u ON u.company_id = e.company_id
      WHERE e.id = equipment_maintenance_alerts.equipment_id
      AND u.id = auth.uid()
    )
  );

-- Scheduled Field Reports Policies
CREATE POLICY "Users can view scheduled reports for their projects"
  ON scheduled_field_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = scheduled_field_reports.project_id
      AND pu.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = scheduled_field_reports.company_id
    )
  );

CREATE POLICY "Project admins can manage scheduled reports"
  ON scheduled_field_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = scheduled_field_reports.project_id
      AND pu.user_id = auth.uid()
      AND pu.project_role IN ('owner', 'admin', 'project_manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = scheduled_field_reports.company_id
      AND u.role IN ('owner', 'admin')
    )
  );

-- Generated Field Reports Policies
CREATE POLICY "Users can view generated reports for their projects"
  ON generated_field_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = generated_field_reports.project_id
      AND pu.user_id = auth.uid()
    )
  );

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE escalation_rules IS 'Defines automated escalation rules that trigger actions based on conditions';
COMMENT ON TABLE escalation_events IS 'Tracks each time an escalation rule is triggered and its outcome';
COMMENT ON TABLE equipment_maintenance_schedules IS 'Recurring maintenance schedules for equipment';
COMMENT ON TABLE equipment_maintenance_alerts IS 'Alerts generated when maintenance is upcoming or overdue';
COMMENT ON TABLE scheduled_field_reports IS 'Configuration for automatically generated field reports';
COMMENT ON TABLE generated_field_reports IS 'History of generated field reports';

COMMENT ON FUNCTION evaluate_escalation_condition IS 'Evaluates JSONB conditions against source data for escalation rules';
COMMENT ON FUNCTION calculate_next_maintenance_due IS 'Calculates and updates next maintenance due date/hours for a schedule';
COMMENT ON FUNCTION check_equipment_maintenance_status IS 'Returns maintenance status and alerts for an equipment item';
COMMENT ON FUNCTION calculate_next_report_run IS 'Calculates next scheduled run time for a field report';
