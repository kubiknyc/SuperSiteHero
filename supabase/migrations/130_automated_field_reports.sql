-- Migration: 123_automated_field_reports.sql
-- Phase 5.3: Automated Field Reports Enhancement
-- Adds additional features to the scheduled_field_reports and generated_field_reports tables

-- =============================================
-- Schema Enhancements for Automated Field Reports
-- =============================================

-- Add company_id column if missing (for company-wide reports)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_field_reports' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE scheduled_field_reports ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_scheduled_field_reports_company_v2 ON scheduled_field_reports(company_id) WHERE is_active = true;
  END IF;
END $$;

-- Add client_facing_mode to hide sensitive data in client reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_field_reports' AND column_name = 'client_facing_mode'
  ) THEN
    ALTER TABLE scheduled_field_reports ADD COLUMN client_facing_mode BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add custom sections filter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_field_reports' AND column_name = 'section_filters'
  ) THEN
    ALTER TABLE scheduled_field_reports ADD COLUMN section_filters JSONB DEFAULT '{}';
    COMMENT ON COLUMN scheduled_field_reports.section_filters IS 'Per-section filtering options (by trade, location, priority, etc.)';
  END IF;
END $$;

-- Add report branding configuration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_field_reports' AND column_name = 'branding_config'
  ) THEN
    ALTER TABLE scheduled_field_reports ADD COLUMN branding_config JSONB DEFAULT '{
      "include_logo": true,
      "header_text": null,
      "footer_text": null,
      "color_scheme": "default"
    }';
  END IF;
END $$;

-- Add CC list for email distribution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_field_reports' AND column_name = 'cc_emails'
  ) THEN
    ALTER TABLE scheduled_field_reports ADD COLUMN cc_emails TEXT[];
  END IF;
END $$;

-- Add failed generation tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_field_reports' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE scheduled_field_reports ADD COLUMN last_error TEXT;
    ALTER TABLE scheduled_field_reports ADD COLUMN consecutive_failures INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add generation stats to generated_field_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_field_reports' AND column_name = 'generation_time_ms'
  ) THEN
    ALTER TABLE generated_field_reports ADD COLUMN generation_time_ms INTEGER;
  END IF;
END $$;

-- Add resend tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_field_reports' AND column_name = 'resend_count'
  ) THEN
    ALTER TABLE generated_field_reports ADD COLUMN resend_count INTEGER DEFAULT 0;
    ALTER TABLE generated_field_reports ADD COLUMN last_resent_at TIMESTAMPTZ;
  END IF;
END $$;

-- =============================================
-- Report Templates (reusable configurations)
-- =============================================

CREATE TABLE IF NOT EXISTS field_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Template Info
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'daily_summary', 'weekly_progress', 'safety_summary',
    'quality_metrics', 'equipment_status', 'client_report', 'custom'
  )),

  -- Configuration
  content_config JSONB NOT NULL DEFAULT '{
    "sections": ["summary", "safety", "quality", "schedule", "photos"],
    "include_charts": true
  }',
  section_filters JSONB DEFAULT '{}',
  branding_config JSONB DEFAULT '{}',

  -- Template Settings
  is_system_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false, -- Shared within company

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add template reference to scheduled reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_field_reports' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE scheduled_field_reports ADD COLUMN template_id UUID REFERENCES field_report_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_field_report_templates_company ON field_report_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_field_report_templates_type ON field_report_templates(report_type);

-- =============================================
-- Enhanced Functions
-- =============================================

-- Function to calculate the period for a report based on frequency
CREATE OR REPLACE FUNCTION calculate_report_period(
  p_frequency TEXT,
  p_base_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (period_start DATE, period_end DATE) AS $$
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      period_start := p_base_date;
      period_end := p_base_date;

    WHEN 'weekly' THEN
      -- Week ending on the given date
      period_start := p_base_date - INTERVAL '6 days';
      period_end := p_base_date;

    WHEN 'biweekly' THEN
      -- Two weeks ending on the given date
      period_start := p_base_date - INTERVAL '13 days';
      period_end := p_base_date;

    WHEN 'monthly' THEN
      -- Previous month
      period_start := DATE_TRUNC('month', p_base_date - INTERVAL '1 month')::DATE;
      period_end := (DATE_TRUNC('month', p_base_date) - INTERVAL '1 day')::DATE;

    ELSE
      period_start := p_base_date;
      period_end := p_base_date;
  END CASE;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending scheduled reports
CREATE OR REPLACE FUNCTION get_pending_scheduled_reports(
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  project_id UUID,
  company_id UUID,
  name TEXT,
  report_type TEXT,
  frequency TEXT,
  time_of_day TIME,
  timezone TEXT,
  content_config JSONB,
  distribution_list_id UUID,
  recipient_emails TEXT[],
  cc_emails TEXT[],
  email_subject_template TEXT,
  email_body_template TEXT,
  include_pdf_attachment BOOLEAN,
  output_format TEXT,
  client_facing_mode BOOLEAN,
  branding_config JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sfr.id,
    sfr.project_id,
    sfr.company_id,
    sfr.name,
    sfr.report_type,
    sfr.frequency,
    sfr.time_of_day,
    sfr.timezone,
    sfr.content_config,
    sfr.distribution_list_id,
    sfr.recipient_emails,
    sfr.cc_emails,
    sfr.email_subject_template,
    sfr.email_body_template,
    sfr.include_pdf_attachment,
    sfr.output_format,
    sfr.client_facing_mode,
    sfr.branding_config
  FROM scheduled_field_reports sfr
  WHERE sfr.is_active = true
    AND sfr.next_scheduled_at <= NOW()
    AND (sfr.consecutive_failures < 5 OR sfr.consecutive_failures IS NULL)
  ORDER BY sfr.next_scheduled_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update report generation status
CREATE OR REPLACE FUNCTION update_report_generation_status(
  p_schedule_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF p_success THEN
    UPDATE scheduled_field_reports
    SET
      last_generated_at = NOW(),
      last_error = NULL,
      consecutive_failures = 0,
      next_scheduled_at = calculate_next_report_run(
        frequency, day_of_week, day_of_month, time_of_day, timezone
      )
    WHERE id = p_schedule_id;
  ELSE
    UPDATE scheduled_field_reports
    SET
      last_error = p_error_message,
      consecutive_failures = COALESCE(consecutive_failures, 0) + 1,
      next_scheduled_at = calculate_next_report_run(
        frequency, day_of_week, day_of_month, time_of_day, timezone
      )
    WHERE id = p_schedule_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Trigger for template timestamp
-- =============================================

CREATE TRIGGER update_field_report_templates_timestamp
  BEFORE UPDATE ON field_report_templates
  FOR EACH ROW EXECUTE FUNCTION update_workflow_automation_timestamp();

-- =============================================
-- RLS Policies for Templates
-- =============================================

ALTER TABLE field_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates for their company"
  ON field_report_templates FOR SELECT
  USING (
    is_system_template = true
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = field_report_templates.company_id
    )
  );

CREATE POLICY "Admins can manage templates for their company"
  ON field_report_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = field_report_templates.company_id
      AND u.role IN ('owner', 'admin')
    )
  );

-- =============================================
-- Insert default system templates
-- =============================================

INSERT INTO field_report_templates (name, description, report_type, is_system_template, is_public, content_config)
VALUES
  (
    'Daily Field Summary',
    'End-of-day summary of all field activities including weather, workforce, equipment, and progress.',
    'daily_summary',
    true,
    true,
    '{
      "sections": ["weather", "manpower", "equipment", "safety", "quality", "deliveries", "visitors", "photos"],
      "include_charts": false,
      "date_range": "period"
    }'::JSONB
  ),
  (
    'Weekly Progress Report',
    'Weekly summary of project progress with schedule variance, cost tracking, and key metrics.',
    'weekly_progress',
    true,
    true,
    '{
      "sections": ["summary", "schedule", "quality", "safety", "manpower", "equipment", "photos"],
      "include_charts": true,
      "date_range": "period"
    }'::JSONB
  ),
  (
    'Safety Summary Report',
    'Comprehensive safety report including incidents, near misses, observations, and toolbox talks.',
    'safety_summary',
    true,
    true,
    '{
      "sections": ["safety"],
      "include_charts": true,
      "date_range": "period"
    }'::JSONB
  ),
  (
    'Quality Metrics Report',
    'Quality-focused report with inspections, punch items, and deficiency tracking.',
    'quality_metrics',
    true,
    true,
    '{
      "sections": ["quality", "inspections", "punch_items"],
      "include_charts": true,
      "date_range": "period"
    }'::JSONB
  ),
  (
    'Client Progress Report',
    'Client-facing report with filtered data appropriate for external stakeholders.',
    'client_report',
    true,
    true,
    '{
      "sections": ["summary", "schedule", "photos"],
      "include_charts": true,
      "date_range": "period",
      "include_photos": true,
      "max_photos": 10
    }'::JSONB
  )
ON CONFLICT DO NOTHING;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE field_report_templates IS 'Reusable report templates for consistent report configuration';
COMMENT ON FUNCTION calculate_report_period IS 'Calculates period start and end dates based on report frequency';
COMMENT ON FUNCTION get_pending_scheduled_reports IS 'Returns scheduled reports that are due to be generated';
COMMENT ON FUNCTION update_report_generation_status IS 'Updates a scheduled report after generation attempt';
