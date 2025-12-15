-- Migration: 111_checklist_time_tracking.sql
-- Description: Add comprehensive time tracking fields to checklist_executions
-- Date: 2025-12-15
-- Feature: Checklist Completion Time Tracking

-- =============================================
-- ENHANCEMENTS TO checklists (executions)
-- =============================================
-- Add time tracking columns for execution analytics

ALTER TABLE checklists
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_duration_minutes INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN checklists.started_at IS 'Timestamp when checklist execution was started';
COMMENT ON COLUMN checklists.actual_duration_minutes IS 'Calculated actual time spent (completed_at - started_at - paused_duration)';
COMMENT ON COLUMN checklists.pause_count IS 'Number of times execution was paused';
COMMENT ON COLUMN checklists.paused_duration_minutes IS 'Total time spent in paused state (minutes)';

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_checklists_started_at ON checklists(started_at);

-- =============================================
-- TABLE: checklist_execution_pauses
-- =============================================
-- Track individual pause/resume events for detailed analytics

CREATE TABLE IF NOT EXISTS checklist_execution_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,

  -- Pause tracking
  paused_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resumed_at TIMESTAMPTZ,
  pause_duration_minutes INTEGER,

  -- Context
  paused_by UUID REFERENCES users(id),
  pause_reason VARCHAR(255),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for checklist_execution_pauses
CREATE INDEX idx_checklist_execution_pauses_checklist_id ON checklist_execution_pauses(checklist_id);
CREATE INDEX idx_checklist_execution_pauses_paused_at ON checklist_execution_pauses(paused_at);
CREATE INDEX idx_checklist_execution_pauses_resumed_at ON checklist_execution_pauses(resumed_at);

-- Trigger for updated_at
CREATE TRIGGER update_checklist_execution_pauses_updated_at
  BEFORE UPDATE ON checklist_execution_pauses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE checklist_execution_pauses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklist_execution_pauses
-- Allow users to view pauses for checklists in their projects
CREATE POLICY "Users can view checklist pauses in their projects"
  ON checklist_execution_pauses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM checklists c
      INNER JOIN projects p ON c.project_id = p.id
      INNER JOIN project_users pm ON p.id = pm.project_id
      WHERE c.id = checklist_execution_pauses.checklist_id
        AND pm.user_id = auth.uid()
    )
  );

-- Allow users to insert pauses for checklists they can edit
CREATE POLICY "Users can create checklist pauses in their projects"
  ON checklist_execution_pauses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists c
      INNER JOIN projects p ON c.project_id = p.id
      INNER JOIN project_users pm ON p.id = pm.project_id
      WHERE c.id = checklist_execution_pauses.checklist_id
        AND pm.user_id = auth.uid()
    )
  );

-- Allow users to update pauses for checklists they can edit
CREATE POLICY "Users can update checklist pauses in their projects"
  ON checklist_execution_pauses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM checklists c
      INNER JOIN projects p ON c.project_id = p.id
      INNER JOIN project_users pm ON p.id = pm.project_id
      WHERE c.id = checklist_execution_pauses.checklist_id
        AND pm.user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTION: calculate_actual_duration
-- =============================================
-- Automatically calculate actual duration when checklist is completed

CREATE OR REPLACE FUNCTION calculate_checklist_actual_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if checklist is being completed
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    -- Calculate actual duration if started_at exists
    IF NEW.started_at IS NOT NULL THEN
      NEW.actual_duration_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60 - COALESCE(NEW.paused_duration_minutes, 0);

      -- Ensure it's not negative
      IF NEW.actual_duration_minutes < 0 THEN
        NEW.actual_duration_minutes := 0;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_calculate_checklist_actual_duration ON checklists;
CREATE TRIGGER trigger_calculate_checklist_actual_duration
  BEFORE UPDATE ON checklists
  FOR EACH ROW
  EXECUTE FUNCTION calculate_checklist_actual_duration();

-- =============================================
-- VIEW: checklist_time_analytics
-- =============================================
-- Pre-calculated view for time tracking analytics

CREATE OR REPLACE VIEW checklist_time_analytics AS
SELECT
  c.id,
  c.project_id,
  c.checklist_template_id,
  c.inspector_user_id,
  c.name,
  c.category,
  c.status,

  -- Time tracking
  c.started_at,
  c.completed_at,
  c.actual_duration_minutes,
  c.pause_count,
  c.paused_duration_minutes,

  -- Template info
  ct.estimated_duration_minutes,

  -- Calculated fields
  CASE
    WHEN c.actual_duration_minutes IS NOT NULL AND ct.estimated_duration_minutes IS NOT NULL
    THEN c.actual_duration_minutes - ct.estimated_duration_minutes
    ELSE NULL
  END AS variance_minutes,

  CASE
    WHEN c.actual_duration_minutes IS NOT NULL AND ct.estimated_duration_minutes IS NOT NULL AND ct.estimated_duration_minutes > 0
    THEN ROUND(((c.actual_duration_minutes - ct.estimated_duration_minutes)::NUMERIC / ct.estimated_duration_minutes::NUMERIC) * 100, 2)
    ELSE NULL
  END AS variance_percentage,

  CASE
    WHEN c.actual_duration_minutes IS NULL OR ct.estimated_duration_minutes IS NULL THEN NULL
    WHEN ABS(c.actual_duration_minutes - ct.estimated_duration_minutes)::NUMERIC / NULLIF(ct.estimated_duration_minutes, 0) < 0.1 THEN 'excellent'
    WHEN ABS(c.actual_duration_minutes - ct.estimated_duration_minutes)::NUMERIC / NULLIF(ct.estimated_duration_minutes, 0) < 0.2 THEN 'good'
    WHEN ABS(c.actual_duration_minutes - ct.estimated_duration_minutes)::NUMERIC / NULLIF(ct.estimated_duration_minutes, 0) < 0.3 THEN 'fair'
    ELSE 'poor'
  END AS accuracy_rating,

  CASE
    WHEN c.actual_duration_minutes IS NOT NULL AND ct.estimated_duration_minutes IS NOT NULL
    THEN c.actual_duration_minutes <= ct.estimated_duration_minutes
    ELSE NULL
  END AS completed_on_time,

  -- Metadata
  c.created_at,
  c.updated_at

FROM checklists c
LEFT JOIN checklist_templates ct ON c.checklist_template_id = ct.id
WHERE c.deleted_at IS NULL;

COMMENT ON VIEW checklist_time_analytics IS 'Analytics view for checklist completion time tracking with variance calculations';

-- =============================================
-- FUNCTION: get_template_average_completion_time
-- =============================================
-- Get average completion time for a template

CREATE OR REPLACE FUNCTION get_template_average_completion_time(
  p_template_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  avg_duration_minutes NUMERIC,
  median_duration_minutes NUMERIC,
  min_duration_minutes INTEGER,
  max_duration_minutes INTEGER,
  std_dev_minutes NUMERIC,
  total_executions BIGINT,
  on_time_count BIGINT,
  on_time_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(actual_duration_minutes), 2) AS avg_duration_minutes,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_duration_minutes) AS median_duration_minutes,
    MIN(actual_duration_minutes) AS min_duration_minutes,
    MAX(actual_duration_minutes) AS max_duration_minutes,
    ROUND(STDDEV(actual_duration_minutes), 2) AS std_dev_minutes,
    COUNT(*) AS total_executions,
    SUM(CASE WHEN completed_on_time THEN 1 ELSE 0 END) AS on_time_count,
    ROUND(
      (SUM(CASE WHEN completed_on_time THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS on_time_percentage
  FROM checklist_time_analytics
  WHERE checklist_template_id = p_template_id
    AND actual_duration_minutes IS NOT NULL
    AND (p_date_from IS NULL OR completed_at >= p_date_from)
    AND (p_date_to IS NULL OR completed_at <= p_date_to);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: get_user_completion_time_stats
-- =============================================
-- Get completion time statistics for a user

CREATE OR REPLACE FUNCTION get_user_completion_time_stats(
  p_user_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  avg_duration_minutes NUMERIC,
  total_executions BIGINT,
  on_time_count BIGINT,
  on_time_percentage NUMERIC,
  avg_variance_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(actual_duration_minutes), 2) AS avg_duration_minutes,
    COUNT(*) AS total_executions,
    SUM(CASE WHEN completed_on_time THEN 1 ELSE 0 END) AS on_time_count,
    ROUND(
      (SUM(CASE WHEN completed_on_time THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS on_time_percentage,
    ROUND(AVG(variance_percentage), 2) AS avg_variance_percentage
  FROM checklist_time_analytics
  WHERE inspector_user_id = p_user_id
    AND actual_duration_minutes IS NOT NULL
    AND (p_date_from IS NULL OR completed_at >= p_date_from)
    AND (p_date_to IS NULL OR completed_at <= p_date_to);
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON FUNCTION get_template_average_completion_time IS 'Calculate comprehensive completion time statistics for a checklist template';
COMMENT ON FUNCTION get_user_completion_time_stats IS 'Calculate completion time performance statistics for a user';
