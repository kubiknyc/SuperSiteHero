-- Migration: Add baseline support to schedule_items
-- This allows comparing planned vs actual schedule performance

-- Add baseline columns to schedule_items
ALTER TABLE schedule_items
ADD COLUMN IF NOT EXISTS baseline_start_date DATE,
ADD COLUMN IF NOT EXISTS baseline_finish_date DATE,
ADD COLUMN IF NOT EXISTS baseline_duration_days INTEGER,
ADD COLUMN IF NOT EXISTS baseline_saved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS baseline_saved_by UUID REFERENCES auth.users(id);

-- Add computed variance columns (virtual, calculated on read)
-- These could also be computed in the application layer
COMMENT ON COLUMN schedule_items.baseline_start_date IS 'Original planned start date when baseline was saved';
COMMENT ON COLUMN schedule_items.baseline_finish_date IS 'Original planned finish date when baseline was saved';
COMMENT ON COLUMN schedule_items.baseline_duration_days IS 'Original planned duration when baseline was saved';
COMMENT ON COLUMN schedule_items.baseline_saved_at IS 'Timestamp when baseline was saved';
COMMENT ON COLUMN schedule_items.baseline_saved_by IS 'User who saved the baseline';

-- Create a table to track baseline history (optional, for multiple baselines)
CREATE TABLE IF NOT EXISTS schedule_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'Baseline',
  description TEXT,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  saved_by UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_active_baseline UNIQUE (project_id, is_active)
    DEFERRABLE INITIALLY DEFERRED
);

-- Create baseline snapshot table for historical tracking
CREATE TABLE IF NOT EXISTS schedule_baseline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id UUID NOT NULL REFERENCES schedule_baselines(id) ON DELETE CASCADE,
  schedule_item_id UUID NOT NULL REFERENCES schedule_items(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  finish_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  percent_complete DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_baseline_item UNIQUE (baseline_id, schedule_item_id)
);

-- Index for efficient baseline queries
CREATE INDEX IF NOT EXISTS idx_schedule_baselines_project ON schedule_baselines(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_baselines_active ON schedule_baselines(project_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_baseline_items_baseline ON schedule_baseline_items(baseline_id);
CREATE INDEX IF NOT EXISTS idx_baseline_items_schedule ON schedule_baseline_items(schedule_item_id);

-- RLS Policies for schedule_baselines
ALTER TABLE schedule_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view baselines for their projects"
  ON schedule_baselines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = schedule_baselines.project_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create baselines for their projects"
  ON schedule_baselines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = schedule_baselines.project_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update baselines for their projects"
  ON schedule_baselines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = schedule_baselines.project_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete baselines for their projects"
  ON schedule_baselines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = schedule_baselines.project_id
      AND pu.user_id = auth.uid()
    )
  );

-- RLS Policies for schedule_baseline_items
ALTER TABLE schedule_baseline_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view baseline items for their projects"
  ON schedule_baseline_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM schedule_baselines sb
      JOIN project_users pu ON pu.project_id = sb.project_id
      WHERE sb.id = schedule_baseline_items.baseline_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create baseline items for their projects"
  ON schedule_baseline_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedule_baselines sb
      JOIN project_users pu ON pu.project_id = sb.project_id
      WHERE sb.id = schedule_baseline_items.baseline_id
      AND pu.user_id = auth.uid()
    )
  );

-- Function to save a baseline snapshot
CREATE OR REPLACE FUNCTION save_schedule_baseline(
  p_project_id UUID,
  p_name VARCHAR(100) DEFAULT 'Baseline',
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_baseline_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Deactivate existing active baseline
  UPDATE schedule_baselines
  SET is_active = false
  WHERE project_id = p_project_id AND is_active = true;

  -- Create new baseline
  INSERT INTO schedule_baselines (project_id, name, description, saved_by)
  VALUES (p_project_id, p_name, p_description, v_user_id)
  RETURNING id INTO v_baseline_id;

  -- Copy current schedule items to baseline
  INSERT INTO schedule_baseline_items (baseline_id, schedule_item_id, start_date, finish_date, duration_days, percent_complete)
  SELECT
    v_baseline_id,
    id,
    start_date,
    finish_date,
    duration_days,
    percent_complete
  FROM schedule_items
  WHERE project_id = p_project_id AND deleted_at IS NULL;

  -- Also update the inline baseline fields on schedule_items for quick access
  UPDATE schedule_items
  SET
    baseline_start_date = start_date,
    baseline_finish_date = finish_date,
    baseline_duration_days = duration_days,
    baseline_saved_at = NOW(),
    baseline_saved_by = v_user_id
  WHERE project_id = p_project_id AND deleted_at IS NULL;

  RETURN v_baseline_id;
END;
$$;

-- Function to clear baseline
CREATE OR REPLACE FUNCTION clear_schedule_baseline(p_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear inline baseline fields
  UPDATE schedule_items
  SET
    baseline_start_date = NULL,
    baseline_finish_date = NULL,
    baseline_duration_days = NULL,
    baseline_saved_at = NULL,
    baseline_saved_by = NULL
  WHERE project_id = p_project_id;

  -- Deactivate all baselines for project
  UPDATE schedule_baselines
  SET is_active = false
  WHERE project_id = p_project_id;
END;
$$;

-- View to get schedule items with variance calculations
CREATE OR REPLACE VIEW schedule_items_with_variance AS
SELECT
  si.*,
  CASE
    WHEN si.baseline_start_date IS NOT NULL
    THEN si.start_date - si.baseline_start_date
    ELSE NULL
  END AS start_variance_days,
  CASE
    WHEN si.baseline_finish_date IS NOT NULL
    THEN si.finish_date - si.baseline_finish_date
    ELSE NULL
  END AS finish_variance_days,
  CASE
    WHEN si.baseline_duration_days IS NOT NULL
    THEN si.duration_days - si.baseline_duration_days
    ELSE NULL
  END AS duration_variance_days,
  CASE
    WHEN si.baseline_finish_date IS NOT NULL THEN
      CASE
        WHEN si.finish_date < si.baseline_finish_date THEN 'ahead'
        WHEN si.finish_date > si.baseline_finish_date THEN 'behind'
        ELSE 'on_track'
      END
    ELSE NULL
  END AS schedule_status
FROM schedule_items si;

-- Grant access to the view
GRANT SELECT ON schedule_items_with_variance TO authenticated;
