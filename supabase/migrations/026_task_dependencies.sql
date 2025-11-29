-- Migration: 026_task_dependencies.sql
-- Description: Add task dependencies table and enhance schedule_items for Gantt chart
-- Created: 2025-11-27

-- =============================================
-- Add missing columns to schedule_items if they don't exist
-- =============================================

DO $$
BEGIN
  -- Add is_milestone column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_items' AND column_name = 'is_milestone'
  ) THEN
    ALTER TABLE schedule_items ADD COLUMN is_milestone BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add notes column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_items' AND column_name = 'notes'
  ) THEN
    ALTER TABLE schedule_items ADD COLUMN notes TEXT;
  END IF;

  -- Add color column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_items' AND column_name = 'color'
  ) THEN
    ALTER TABLE schedule_items ADD COLUMN color VARCHAR(20);
  END IF;

  -- Add parent_id for hierarchy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_items' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE schedule_items ADD COLUMN parent_id UUID REFERENCES schedule_items(id) ON DELETE SET NULL;
  END IF;

  -- Add sort_order column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_items' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE schedule_items ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;

  -- Add deleted_at for soft delete if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_items' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE schedule_items ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  -- Add created_by column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedule_items' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE schedule_items ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;
END $$;

-- =============================================
-- Create task_dependencies table
-- =============================================

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  predecessor_id UUID NOT NULL REFERENCES schedule_items(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES schedule_items(id) ON DELETE CASCADE,
  dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS' CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Prevent duplicate dependencies
  CONSTRAINT unique_dependency UNIQUE (predecessor_id, successor_id),

  -- Prevent self-referencing dependencies
  CONSTRAINT no_self_dependency CHECK (predecessor_id != successor_id)
);

-- Add comment
COMMENT ON TABLE task_dependencies IS 'Task dependency relationships for Gantt chart scheduling';
COMMENT ON COLUMN task_dependencies.dependency_type IS 'FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish';
COMMENT ON COLUMN task_dependencies.lag_days IS 'Positive=delay after predecessor, Negative=lead before predecessor finishes';

-- =============================================
-- Create indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_task_dependencies_project
  ON task_dependencies(project_id);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_predecessor
  ON task_dependencies(predecessor_id);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_successor
  ON task_dependencies(successor_id);

CREATE INDEX IF NOT EXISTS idx_schedule_items_project_dates
  ON schedule_items(project_id, start_date, finish_date);

CREATE INDEX IF NOT EXISTS idx_schedule_items_parent
  ON schedule_items(parent_id) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_items_critical
  ON schedule_items(project_id) WHERE is_critical = TRUE;

-- =============================================
-- Row Level Security for task_dependencies
-- =============================================

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view dependencies for projects they have access to
CREATE POLICY task_dependencies_select_policy ON task_dependencies
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert dependencies for projects they have access to
CREATE POLICY task_dependencies_insert_policy ON task_dependencies
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update dependencies for projects they have access to
CREATE POLICY task_dependencies_update_policy ON task_dependencies
  FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete dependencies for projects they have access to
CREATE POLICY task_dependencies_delete_policy ON task_dependencies
  FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- Helper function to calculate task duration
-- =============================================

CREATE OR REPLACE FUNCTION calculate_duration_days(
  p_start_date DATE,
  p_finish_date DATE
) RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, (p_finish_date - p_start_date) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- Trigger to auto-update duration_days
-- =============================================

CREATE OR REPLACE FUNCTION update_schedule_item_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.finish_date IS NOT NULL THEN
    NEW.duration_days := calculate_duration_days(NEW.start_date::DATE, NEW.finish_date::DATE);
  END IF;
  NEW.last_updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schedule_item_duration_trigger ON schedule_items;
CREATE TRIGGER schedule_item_duration_trigger
  BEFORE INSERT OR UPDATE OF start_date, finish_date
  ON schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_item_duration();

-- =============================================
-- Function to detect circular dependencies
-- =============================================

CREATE OR REPLACE FUNCTION check_circular_dependency(
  p_predecessor_id UUID,
  p_successor_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_cycle BOOLEAN := FALSE;
BEGIN
  -- Use recursive CTE to check if adding this dependency would create a cycle
  WITH RECURSIVE dependency_chain AS (
    -- Start with the successor
    SELECT successor_id, 1 AS depth
    FROM task_dependencies
    WHERE predecessor_id = p_successor_id

    UNION ALL

    -- Follow the chain
    SELECT td.successor_id, dc.depth + 1
    FROM task_dependencies td
    JOIN dependency_chain dc ON td.predecessor_id = dc.successor_id
    WHERE dc.depth < 100 -- Prevent infinite loops
  )
  SELECT EXISTS (
    SELECT 1 FROM dependency_chain WHERE successor_id = p_predecessor_id
  ) INTO v_has_cycle;

  RETURN v_has_cycle;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Trigger to prevent circular dependencies
-- =============================================

CREATE OR REPLACE FUNCTION prevent_circular_dependency()
RETURNS TRIGGER AS $$
BEGIN
  IF check_circular_dependency(NEW.predecessor_id, NEW.successor_id) THEN
    RAISE EXCEPTION 'Circular dependency detected: adding this dependency would create a cycle';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_circular_dependency_trigger ON task_dependencies;
CREATE TRIGGER check_circular_dependency_trigger
  BEFORE INSERT OR UPDATE
  ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_dependency();
