-- Migration: 083_custom_report_builder.sql
-- Description: Custom Report Builder for generating ad-hoc reports
-- Features:
--   - Report templates with field selection
--   - Filtering, grouping, and sorting options
--   - Scheduled report delivery via email
--   - Generated report history
--   - Support for multiple data sources (RFIs, Submittals, Daily Reports, etc.)

-- =============================================
-- ENUMS
-- =============================================

-- Report data sources
CREATE TYPE report_data_source AS ENUM (
  'rfis',
  'submittals',
  'daily_reports',
  'change_orders',
  'payment_applications',
  'safety_incidents',
  'inspections',
  'punch_list',
  'tasks',
  'meetings',
  'documents',
  'equipment',
  'lien_waivers',
  'insurance_certificates',
  'toolbox_talks'
);

-- Report output formats
CREATE TYPE report_output_format AS ENUM (
  'pdf',
  'excel',
  'csv'
);

-- Report schedule frequency
CREATE TYPE report_schedule_frequency AS ENUM (
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly'
);

-- Report field data types
CREATE TYPE report_field_type AS ENUM (
  'text',
  'number',
  'currency',
  'date',
  'datetime',
  'boolean',
  'status',
  'user',
  'project',
  'company'
);

-- Aggregation types for numeric fields
CREATE TYPE report_aggregation_type AS ENUM (
  'none',
  'sum',
  'average',
  'count',
  'min',
  'max'
);

-- Filter operators
CREATE TYPE report_filter_operator AS ENUM (
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'greater_than',
  'less_than',
  'greater_or_equal',
  'less_or_equal',
  'between',
  'in',
  'not_in',
  'is_null',
  'is_not_null'
);

-- Sort direction
CREATE TYPE report_sort_direction AS ENUM (
  'asc',
  'desc'
);

-- =============================================
-- REPORT TEMPLATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  data_source report_data_source NOT NULL,

  -- Template ownership
  created_by UUID REFERENCES auth.users(id),
  is_system_template BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,

  -- Template configuration (stored as JSONB for flexibility)
  -- Contains: fields, filters, grouping, sorting, formatting options
  configuration JSONB NOT NULL DEFAULT '{}',

  -- Default output settings
  default_format report_output_format DEFAULT 'pdf',
  page_orientation VARCHAR(20) DEFAULT 'portrait',
  include_charts BOOLEAN DEFAULT TRUE,
  include_summary BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE report_templates IS 'User-defined report templates for the Custom Report Builder';
COMMENT ON COLUMN report_templates.configuration IS 'JSON containing fields, filters, grouping, sorting, and formatting options';

-- =============================================
-- REPORT TEMPLATE FIELDS TABLE
-- Stores the selected fields for each template
-- =============================================

CREATE TABLE IF NOT EXISTS report_template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,

  -- Field configuration
  field_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  field_type report_field_type NOT NULL,

  -- Display options
  display_order INTEGER NOT NULL DEFAULT 0,
  column_width INTEGER, -- In pixels or percentage
  is_visible BOOLEAN DEFAULT TRUE,

  -- Aggregation for grouping
  aggregation report_aggregation_type DEFAULT 'none',

  -- Formatting
  format_string VARCHAR(100), -- e.g., 'MMM dd, yyyy' for dates, '$#,##0.00' for currency

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE report_template_fields IS 'Fields selected for inclusion in a report template';

-- =============================================
-- REPORT TEMPLATE FILTERS TABLE
-- Stores filter conditions for templates
-- =============================================

CREATE TABLE IF NOT EXISTS report_template_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,

  -- Filter configuration
  field_name VARCHAR(255) NOT NULL,
  operator report_filter_operator NOT NULL,

  -- Filter values (JSONB to support various types and arrays)
  filter_value JSONB,

  -- For relative date filters
  is_relative_date BOOLEAN DEFAULT FALSE,
  relative_date_value INTEGER, -- Number of days/weeks/months
  relative_date_unit VARCHAR(20), -- 'days', 'weeks', 'months'

  -- Grouping filters with AND/OR
  filter_group INTEGER DEFAULT 0,

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE report_template_filters IS 'Filter conditions for report templates';

-- =============================================
-- REPORT TEMPLATE SORTING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS report_template_sorting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,

  field_name VARCHAR(255) NOT NULL,
  direction report_sort_direction DEFAULT 'asc',
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE report_template_sorting IS 'Sort configuration for report templates';

-- =============================================
-- REPORT TEMPLATE GROUPING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS report_template_grouping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,

  field_name VARCHAR(255) NOT NULL,
  group_order INTEGER NOT NULL DEFAULT 0,
  include_subtotals BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE report_template_grouping IS 'Grouping configuration for report templates';

-- =============================================
-- SCHEDULED REPORTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Schedule name
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Schedule configuration
  frequency report_schedule_frequency NOT NULL,
  day_of_week INTEGER, -- 0-6 for weekly, biweekly
  day_of_month INTEGER, -- 1-31 for monthly
  time_of_day TIME DEFAULT '08:00:00',
  timezone VARCHAR(50) DEFAULT 'America/New_York',

  -- Output settings
  output_format report_output_format DEFAULT 'pdf',

  -- Recipients (email addresses as JSONB array)
  recipients JSONB NOT NULL DEFAULT '[]',

  -- Email settings
  email_subject VARCHAR(500),
  email_body TEXT,

  -- Project filter (optional - null means all projects)
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  -- Ownership
  created_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE scheduled_reports IS 'Scheduled report delivery configuration';

-- =============================================
-- GENERATED REPORTS TABLE (History)
-- =============================================

CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Report info
  report_name VARCHAR(255) NOT NULL,
  data_source report_data_source NOT NULL,

  -- Generated by
  generated_by UUID REFERENCES auth.users(id),
  is_scheduled BOOLEAN DEFAULT FALSE,

  -- Output
  output_format report_output_format NOT NULL,
  file_url TEXT, -- Storage URL for generated file
  file_size_bytes BIGINT,

  -- Execution details
  row_count INTEGER,
  execution_time_ms INTEGER,

  -- Filters applied (snapshot for historical reference)
  filters_applied JSONB DEFAULT '{}',

  -- Project scope
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Date range covered
  date_from DATE,
  date_to DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'completed', -- pending, generating, completed, failed
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optional expiration for auto-cleanup
);

COMMENT ON TABLE generated_reports IS 'History of generated reports';

-- =============================================
-- REPORT FIELD DEFINITIONS TABLE
-- Master list of available fields per data source
-- =============================================

CREATE TABLE IF NOT EXISTS report_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  data_source report_data_source NOT NULL,
  field_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  field_type report_field_type NOT NULL,

  -- Field metadata
  description TEXT,
  category VARCHAR(100), -- For grouping in UI
  is_default BOOLEAN DEFAULT FALSE, -- Include by default in new templates
  is_sortable BOOLEAN DEFAULT TRUE,
  is_filterable BOOLEAN DEFAULT TRUE,
  is_groupable BOOLEAN DEFAULT FALSE,

  -- For related data
  source_table VARCHAR(255),
  source_column VARCHAR(255),
  join_path TEXT, -- JSON path for joins

  -- Display order in field picker
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(data_source, field_name)
);

COMMENT ON TABLE report_field_definitions IS 'Master list of available fields for each data source';

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_report_templates_company ON report_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_data_source ON report_templates(data_source);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_report_templates_deleted ON report_templates(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_report_template_fields_template ON report_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_report_template_filters_template ON report_template_filters(template_id);
CREATE INDEX IF NOT EXISTS idx_report_template_sorting_template ON report_template_sorting(template_id);
CREATE INDEX IF NOT EXISTS idx_report_template_grouping_template ON report_template_grouping(template_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_company ON scheduled_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_template ON scheduled_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_generated_reports_company ON generated_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_template ON generated_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON generated_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_by ON generated_reports(generated_by);

CREATE INDEX IF NOT EXISTS idx_report_field_definitions_source ON report_field_definitions(data_source);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_template_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_template_sorting ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_template_grouping ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_field_definitions ENABLE ROW LEVEL SECURITY;

-- Report Templates policies
CREATE POLICY "Users can view their company report templates"
  ON report_templates FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR is_system_template = TRUE
  );

CREATE POLICY "Users can create report templates for their company"
  ON report_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own templates or company templates"
  ON report_templates FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    AND (created_by = auth.uid() OR is_shared = TRUE)
    AND is_system_template = FALSE
  );

CREATE POLICY "Users can delete their own templates"
  ON report_templates FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND is_system_template = FALSE
  );

-- Template fields policies (inherit from template)
CREATE POLICY "Users can view template fields"
  ON report_template_fields FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM report_templates
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
      OR is_system_template = TRUE
    )
  );

CREATE POLICY "Users can manage template fields"
  ON report_template_fields FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM report_templates
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
      AND is_system_template = FALSE
    )
  );

-- Template filters policies (inherit from template)
CREATE POLICY "Users can view template filters"
  ON report_template_filters FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM report_templates
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
      OR is_system_template = TRUE
    )
  );

CREATE POLICY "Users can manage template filters"
  ON report_template_filters FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM report_templates
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
      AND is_system_template = FALSE
    )
  );

-- Template sorting policies (inherit from template)
CREATE POLICY "Users can view template sorting"
  ON report_template_sorting FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM report_templates
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
      OR is_system_template = TRUE
    )
  );

CREATE POLICY "Users can manage template sorting"
  ON report_template_sorting FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM report_templates
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
      AND is_system_template = FALSE
    )
  );

-- Template grouping policies (inherit from template)
CREATE POLICY "Users can view template grouping"
  ON report_template_grouping FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM report_templates
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
      OR is_system_template = TRUE
    )
  );

CREATE POLICY "Users can manage template grouping"
  ON report_template_grouping FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM report_templates
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
      AND is_system_template = FALSE
    )
  );

-- Scheduled reports policies
CREATE POLICY "Users can view their company scheduled reports"
  ON scheduled_reports FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create scheduled reports"
  ON scheduled_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their scheduled reports"
  ON scheduled_reports FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete their own scheduled reports"
  ON scheduled_reports FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
  );

-- Generated reports policies
CREATE POLICY "Users can view their company generated reports"
  ON generated_reports FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create generated reports"
  ON generated_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Field definitions are read-only for users
CREATE POLICY "Anyone can view field definitions"
  ON report_field_definitions FOR SELECT
  TO authenticated
  USING (TRUE);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger for templates
CREATE TRIGGER update_report_template_timestamp
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for scheduled reports
CREATE TRIGGER update_scheduled_report_timestamp
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTION: Calculate next run time for scheduled reports
-- =============================================

CREATE OR REPLACE FUNCTION calculate_next_run_time(
  p_frequency report_schedule_frequency,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_time_of_day TIME,
  p_timezone VARCHAR
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_run TIMESTAMPTZ;
  v_now TIMESTAMPTZ;
BEGIN
  v_now := NOW() AT TIME ZONE p_timezone;

  CASE p_frequency
    WHEN 'daily' THEN
      v_next_run := DATE_TRUNC('day', v_now) + p_time_of_day;
      IF v_next_run <= v_now THEN
        v_next_run := v_next_run + INTERVAL '1 day';
      END IF;

    WHEN 'weekly' THEN
      v_next_run := DATE_TRUNC('week', v_now) + (p_day_of_week || ' days')::INTERVAL + p_time_of_day;
      IF v_next_run <= v_now THEN
        v_next_run := v_next_run + INTERVAL '1 week';
      END IF;

    WHEN 'biweekly' THEN
      v_next_run := DATE_TRUNC('week', v_now) + (p_day_of_week || ' days')::INTERVAL + p_time_of_day;
      IF v_next_run <= v_now THEN
        v_next_run := v_next_run + INTERVAL '2 weeks';
      END IF;

    WHEN 'monthly' THEN
      v_next_run := DATE_TRUNC('month', v_now) + ((p_day_of_month - 1) || ' days')::INTERVAL + p_time_of_day;
      IF v_next_run <= v_now THEN
        v_next_run := v_next_run + INTERVAL '1 month';
      END IF;

    WHEN 'quarterly' THEN
      v_next_run := DATE_TRUNC('quarter', v_now) + ((p_day_of_month - 1) || ' days')::INTERVAL + p_time_of_day;
      IF v_next_run <= v_now THEN
        v_next_run := v_next_run + INTERVAL '3 months';
      END IF;
  END CASE;

  RETURN v_next_run AT TIME ZONE p_timezone;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate next run time
CREATE OR REPLACE FUNCTION update_scheduled_report_next_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    NEW.next_run_at := calculate_next_run_time(
      NEW.frequency,
      NEW.day_of_week,
      NEW.day_of_month,
      NEW.time_of_day,
      NEW.timezone
    );
  ELSE
    NEW.next_run_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_scheduled_report_next_run
  BEFORE INSERT OR UPDATE OF frequency, day_of_week, day_of_month, time_of_day, timezone, is_active
  ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_report_next_run();

-- =============================================
-- SEED DATA: Field Definitions
-- =============================================

-- RFI Fields
INSERT INTO report_field_definitions (data_source, field_name, display_name, field_type, category, is_default, is_sortable, is_filterable, is_groupable, display_order)
VALUES
  ('rfis', 'rfi_number', 'RFI Number', 'text', 'Identification', TRUE, TRUE, TRUE, FALSE, 1),
  ('rfis', 'subject', 'Subject', 'text', 'Identification', TRUE, TRUE, TRUE, FALSE, 2),
  ('rfis', 'status', 'Status', 'status', 'Status', TRUE, TRUE, TRUE, TRUE, 3),
  ('rfis', 'priority', 'Priority', 'status', 'Status', TRUE, TRUE, TRUE, TRUE, 4),
  ('rfis', 'created_at', 'Created Date', 'date', 'Dates', TRUE, TRUE, TRUE, FALSE, 5),
  ('rfis', 'due_date', 'Due Date', 'date', 'Dates', TRUE, TRUE, TRUE, FALSE, 6),
  ('rfis', 'responded_date', 'Response Date', 'date', 'Dates', FALSE, TRUE, TRUE, FALSE, 7),
  ('rfis', 'days_open', 'Days Open', 'number', 'Metrics', FALSE, TRUE, TRUE, FALSE, 8),
  ('rfis', 'assigned_to', 'Assigned To', 'user', 'People', TRUE, TRUE, TRUE, TRUE, 9),
  ('rfis', 'created_by', 'Created By', 'user', 'People', FALSE, TRUE, TRUE, TRUE, 10),
  ('rfis', 'spec_section', 'Spec Section', 'text', 'Reference', FALSE, TRUE, TRUE, TRUE, 11),
  ('rfis', 'drawing_number', 'Drawing Number', 'text', 'Reference', FALSE, TRUE, TRUE, FALSE, 12),
  ('rfis', 'cost_impact', 'Cost Impact', 'boolean', 'Impacts', FALSE, TRUE, TRUE, TRUE, 13),
  ('rfis', 'schedule_impact', 'Schedule Impact', 'boolean', 'Impacts', FALSE, TRUE, TRUE, TRUE, 14),
  ('rfis', 'response_type', 'Response Type', 'status', 'Status', FALSE, TRUE, TRUE, TRUE, 15)
ON CONFLICT (data_source, field_name) DO NOTHING;

-- Submittal Fields
INSERT INTO report_field_definitions (data_source, field_name, display_name, field_type, category, is_default, is_sortable, is_filterable, is_groupable, display_order)
VALUES
  ('submittals', 'submittal_number', 'Submittal Number', 'text', 'Identification', TRUE, TRUE, TRUE, FALSE, 1),
  ('submittals', 'title', 'Title', 'text', 'Identification', TRUE, TRUE, TRUE, FALSE, 2),
  ('submittals', 'status', 'Status', 'status', 'Status', TRUE, TRUE, TRUE, TRUE, 3),
  ('submittals', 'approval_status', 'Approval Status', 'status', 'Status', TRUE, TRUE, TRUE, TRUE, 4),
  ('submittals', 'submittal_type', 'Type', 'status', 'Classification', TRUE, TRUE, TRUE, TRUE, 5),
  ('submittals', 'spec_section', 'Spec Section', 'text', 'Reference', TRUE, TRUE, TRUE, TRUE, 6),
  ('submittals', 'submitted_date', 'Submitted Date', 'date', 'Dates', TRUE, TRUE, TRUE, FALSE, 7),
  ('submittals', 'required_date', 'Required Date', 'date', 'Dates', TRUE, TRUE, TRUE, FALSE, 8),
  ('submittals', 'reviewed_date', 'Reviewed Date', 'date', 'Dates', FALSE, TRUE, TRUE, FALSE, 9),
  ('submittals', 'lead_time_days', 'Lead Time (Days)', 'number', 'Metrics', FALSE, TRUE, TRUE, FALSE, 10),
  ('submittals', 'revision_number', 'Revision', 'number', 'Identification', FALSE, TRUE, TRUE, FALSE, 11),
  ('submittals', 'subcontractor', 'Subcontractor', 'text', 'People', TRUE, TRUE, TRUE, TRUE, 12),
  ('submittals', 'responsible_contractor', 'Responsible Contractor', 'text', 'People', FALSE, TRUE, TRUE, TRUE, 13)
ON CONFLICT (data_source, field_name) DO NOTHING;

-- Daily Reports Fields
INSERT INTO report_field_definitions (data_source, field_name, display_name, field_type, category, is_default, is_sortable, is_filterable, is_groupable, display_order)
VALUES
  ('daily_reports', 'report_date', 'Report Date', 'date', 'Identification', TRUE, TRUE, TRUE, FALSE, 1),
  ('daily_reports', 'weather_condition', 'Weather', 'text', 'Weather', TRUE, TRUE, TRUE, TRUE, 2),
  ('daily_reports', 'temperature_high', 'High Temp', 'number', 'Weather', FALSE, TRUE, TRUE, FALSE, 3),
  ('daily_reports', 'temperature_low', 'Low Temp', 'number', 'Weather', FALSE, TRUE, TRUE, FALSE, 4),
  ('daily_reports', 'total_workers', 'Total Workers', 'number', 'Manpower', TRUE, TRUE, TRUE, FALSE, 5),
  ('daily_reports', 'work_performed', 'Work Performed', 'text', 'Activities', TRUE, FALSE, TRUE, FALSE, 6),
  ('daily_reports', 'delays', 'Delays', 'text', 'Issues', FALSE, FALSE, TRUE, FALSE, 7),
  ('daily_reports', 'safety_incidents', 'Safety Incidents', 'number', 'Safety', FALSE, TRUE, TRUE, FALSE, 8),
  ('daily_reports', 'visitors', 'Visitors', 'text', 'Visitors', FALSE, FALSE, TRUE, FALSE, 9),
  ('daily_reports', 'created_by', 'Created By', 'user', 'People', TRUE, TRUE, TRUE, TRUE, 10),
  ('daily_reports', 'status', 'Status', 'status', 'Status', TRUE, TRUE, TRUE, TRUE, 11)
ON CONFLICT (data_source, field_name) DO NOTHING;

-- Safety Incidents Fields
INSERT INTO report_field_definitions (data_source, field_name, display_name, field_type, category, is_default, is_sortable, is_filterable, is_groupable, display_order)
VALUES
  ('safety_incidents', 'incident_number', 'Incident Number', 'text', 'Identification', TRUE, TRUE, TRUE, FALSE, 1),
  ('safety_incidents', 'incident_date', 'Incident Date', 'date', 'Dates', TRUE, TRUE, TRUE, FALSE, 2),
  ('safety_incidents', 'incident_type', 'Type', 'status', 'Classification', TRUE, TRUE, TRUE, TRUE, 3),
  ('safety_incidents', 'severity', 'Severity', 'status', 'Classification', TRUE, TRUE, TRUE, TRUE, 4),
  ('safety_incidents', 'status', 'Status', 'status', 'Status', TRUE, TRUE, TRUE, TRUE, 5),
  ('safety_incidents', 'location', 'Location', 'text', 'Location', TRUE, TRUE, TRUE, TRUE, 6),
  ('safety_incidents', 'description', 'Description', 'text', 'Details', TRUE, FALSE, TRUE, FALSE, 7),
  ('safety_incidents', 'osha_recordable', 'OSHA Recordable', 'boolean', 'Compliance', TRUE, TRUE, TRUE, TRUE, 8),
  ('safety_incidents', 'days_away_from_work', 'Days Away', 'number', 'Metrics', FALSE, TRUE, TRUE, FALSE, 9),
  ('safety_incidents', 'days_restricted_duty', 'Days Restricted', 'number', 'Metrics', FALSE, TRUE, TRUE, FALSE, 10),
  ('safety_incidents', 'root_cause_category', 'Root Cause', 'status', 'Analysis', FALSE, TRUE, TRUE, TRUE, 11),
  ('safety_incidents', 'reported_by', 'Reported By', 'user', 'People', FALSE, TRUE, TRUE, TRUE, 12)
ON CONFLICT (data_source, field_name) DO NOTHING;

-- Change Orders Fields
INSERT INTO report_field_definitions (data_source, field_name, display_name, field_type, category, is_default, is_sortable, is_filterable, is_groupable, display_order)
VALUES
  ('change_orders', 'change_order_number', 'CO Number', 'text', 'Identification', TRUE, TRUE, TRUE, FALSE, 1),
  ('change_orders', 'title', 'Title', 'text', 'Identification', TRUE, TRUE, TRUE, FALSE, 2),
  ('change_orders', 'status', 'Status', 'status', 'Status', TRUE, TRUE, TRUE, TRUE, 3),
  ('change_orders', 'type', 'Type', 'status', 'Classification', TRUE, TRUE, TRUE, TRUE, 4),
  ('change_orders', 'amount', 'Amount', 'currency', 'Financial', TRUE, TRUE, TRUE, FALSE, 5),
  ('change_orders', 'submitted_date', 'Submitted Date', 'date', 'Dates', TRUE, TRUE, TRUE, FALSE, 6),
  ('change_orders', 'approved_date', 'Approved Date', 'date', 'Dates', FALSE, TRUE, TRUE, FALSE, 7),
  ('change_orders', 'days_impact', 'Schedule Impact (Days)', 'number', 'Impacts', FALSE, TRUE, TRUE, FALSE, 8),
  ('change_orders', 'reason', 'Reason', 'text', 'Details', FALSE, FALSE, TRUE, FALSE, 9),
  ('change_orders', 'requested_by', 'Requested By', 'text', 'People', FALSE, TRUE, TRUE, TRUE, 10)
ON CONFLICT (data_source, field_name) DO NOTHING;

-- Payment Applications Fields
INSERT INTO report_field_definitions (data_source, field_name, display_name, field_type, category, is_default, is_sortable, is_filterable, is_groupable, display_order)
VALUES
  ('payment_applications', 'application_number', 'Pay App #', 'number', 'Identification', TRUE, TRUE, TRUE, FALSE, 1),
  ('payment_applications', 'period_to', 'Period To', 'date', 'Dates', TRUE, TRUE, TRUE, FALSE, 2),
  ('payment_applications', 'status', 'Status', 'status', 'Status', TRUE, TRUE, TRUE, TRUE, 3),
  ('payment_applications', 'scheduled_value', 'Scheduled Value', 'currency', 'Financial', TRUE, TRUE, TRUE, FALSE, 4),
  ('payment_applications', 'work_completed', 'Work Completed', 'currency', 'Financial', TRUE, TRUE, TRUE, FALSE, 5),
  ('payment_applications', 'materials_stored', 'Materials Stored', 'currency', 'Financial', FALSE, TRUE, TRUE, FALSE, 6),
  ('payment_applications', 'total_earned', 'Total Earned', 'currency', 'Financial', TRUE, TRUE, TRUE, FALSE, 7),
  ('payment_applications', 'retainage', 'Retainage', 'currency', 'Financial', FALSE, TRUE, TRUE, FALSE, 8),
  ('payment_applications', 'current_payment_due', 'Current Payment Due', 'currency', 'Financial', TRUE, TRUE, TRUE, FALSE, 9),
  ('payment_applications', 'percent_complete', 'Percent Complete', 'number', 'Metrics', TRUE, TRUE, TRUE, FALSE, 10),
  ('payment_applications', 'subcontractor', 'Subcontractor', 'text', 'People', TRUE, TRUE, TRUE, TRUE, 11)
ON CONFLICT (data_source, field_name) DO NOTHING;

-- =============================================
-- GRANTS
-- =============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON report_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_template_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_template_filters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_template_sorting TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_template_grouping TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_reports TO authenticated;
GRANT SELECT, INSERT ON generated_reports TO authenticated;
GRANT SELECT ON report_field_definitions TO authenticated;

-- =============================================
-- STORAGE BUCKET FOR GENERATED REPORTS
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-reports',
  'generated-reports',
  FALSE,
  52428800, -- 50MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view their company reports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-reports'
    AND EXISTS (
      SELECT 1 FROM generated_reports gr
      JOIN users u ON gr.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND gr.file_url LIKE '%' || storage.objects.name
    )
  );

CREATE POLICY "Users can upload reports for their company"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'generated-reports'
  );
