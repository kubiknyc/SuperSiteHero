-- Migration: Customizable Dashboards
-- Description: Adds tables for user-customizable dashboard layouts with drag-drop widgets

-- ============================================================================
-- Table: dashboard_layouts
-- ============================================================================
-- Stores user-created dashboard layout configurations

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL means global/all projects

  -- Layout metadata
  name TEXT NOT NULL,
  description TEXT,

  -- Layout configuration (widget positions as JSONB array)
  layout_config JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Settings
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_shared BOOLEAN NOT NULL DEFAULT false, -- Allow other users to use this layout

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_layout_config CHECK (jsonb_typeof(layout_config) = 'array')
);

-- Unique constraint: only one default layout per user/project combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_layouts_unique_default
  ON dashboard_layouts (user_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE is_default = true;

-- ============================================================================
-- Table: dashboard_widget_preferences
-- ============================================================================
-- Stores individual widget configurations within a layout

CREATE TABLE IF NOT EXISTS dashboard_widget_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES dashboard_layouts(id) ON DELETE CASCADE,

  -- Widget identification
  widget_type TEXT NOT NULL, -- References the widget registry key

  -- Widget configuration (custom settings per widget instance)
  widget_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Position and size in the grid layout
  position JSONB NOT NULL, -- { x: number, y: number, w: number, h: number }

  -- Visibility and refresh
  is_visible BOOLEAN NOT NULL DEFAULT true,
  refresh_interval INTEGER, -- Seconds between auto-refresh, NULL for no auto-refresh

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_position CHECK (
    position ? 'x' AND position ? 'y' AND position ? 'w' AND position ? 'h'
  )
);

-- ============================================================================
-- Indexes for dashboard_layouts
-- ============================================================================

-- User lookup (find all layouts for a user)
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user ON dashboard_layouts(user_id);

-- Project lookup (find layouts for a specific project)
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_project ON dashboard_layouts(project_id);

-- User + Project combination for default lookup
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_project
  ON dashboard_layouts(user_id, project_id);

-- Shared layouts for discovery
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_shared
  ON dashboard_layouts(is_shared) WHERE is_shared = true;

-- ============================================================================
-- Indexes for dashboard_widget_preferences
-- ============================================================================

-- Layout lookup (get all widgets for a layout)
CREATE INDEX IF NOT EXISTS idx_widget_preferences_layout ON dashboard_widget_preferences(layout_id);

-- Widget type index for analytics
CREATE INDEX IF NOT EXISTS idx_widget_preferences_type ON dashboard_widget_preferences(widget_type);

-- ============================================================================
-- Updated timestamp triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_dashboard_layouts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dashboard_layouts_updated_at ON dashboard_layouts;
CREATE TRIGGER dashboard_layouts_updated_at
  BEFORE UPDATE ON dashboard_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_layouts_timestamp();

CREATE OR REPLACE FUNCTION update_widget_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS widget_preferences_updated_at ON dashboard_widget_preferences;
CREATE TRIGGER widget_preferences_updated_at
  BEFORE UPDATE ON dashboard_widget_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_widget_preferences_timestamp();

-- ============================================================================
-- Row Level Security - dashboard_layouts
-- ============================================================================

ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own layouts" ON dashboard_layouts;
DROP POLICY IF EXISTS "Users can view shared layouts" ON dashboard_layouts;
DROP POLICY IF EXISTS "Users can create own layouts" ON dashboard_layouts;
DROP POLICY IF EXISTS "Users can update own layouts" ON dashboard_layouts;
DROP POLICY IF EXISTS "Users can delete own layouts" ON dashboard_layouts;

-- Policy: Users can view their own layouts
CREATE POLICY "Users can view own layouts"
  ON dashboard_layouts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can view shared layouts
CREATE POLICY "Users can view shared layouts"
  ON dashboard_layouts
  FOR SELECT
  TO authenticated
  USING (is_shared = true);

-- Policy: Users can create their own layouts
CREATE POLICY "Users can create own layouts"
  ON dashboard_layouts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own layouts
CREATE POLICY "Users can update own layouts"
  ON dashboard_layouts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own layouts
CREATE POLICY "Users can delete own layouts"
  ON dashboard_layouts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- Row Level Security - dashboard_widget_preferences
-- ============================================================================

ALTER TABLE dashboard_widget_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view widgets for accessible layouts" ON dashboard_widget_preferences;
DROP POLICY IF EXISTS "Users can manage widgets for own layouts" ON dashboard_widget_preferences;

-- Policy: Users can view widgets for layouts they can access
CREATE POLICY "Users can view widgets for accessible layouts"
  ON dashboard_widget_preferences
  FOR SELECT
  TO authenticated
  USING (
    layout_id IN (
      SELECT id FROM dashboard_layouts
      WHERE user_id = auth.uid() OR is_shared = true
    )
  );

-- Policy: Users can manage widgets for their own layouts
CREATE POLICY "Users can manage widgets for own layouts"
  ON dashboard_widget_preferences
  FOR ALL
  TO authenticated
  USING (
    layout_id IN (
      SELECT id FROM dashboard_layouts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    layout_id IN (
      SELECT id FROM dashboard_layouts WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Function: Get user's default layout for a project
-- ============================================================================

CREATE OR REPLACE FUNCTION get_default_dashboard_layout(
  p_user_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_layout_id UUID;
BEGIN
  -- First try to find project-specific default
  IF p_project_id IS NOT NULL THEN
    SELECT id INTO v_layout_id
    FROM dashboard_layouts
    WHERE user_id = p_user_id
      AND project_id = p_project_id
      AND is_default = true
    LIMIT 1;

    IF v_layout_id IS NOT NULL THEN
      RETURN v_layout_id;
    END IF;
  END IF;

  -- Fall back to global default (project_id IS NULL)
  SELECT id INTO v_layout_id
  FROM dashboard_layouts
  WHERE user_id = p_user_id
    AND project_id IS NULL
    AND is_default = true
  LIMIT 1;

  RETURN v_layout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_default_dashboard_layout(UUID, UUID) TO authenticated;

-- ============================================================================
-- Function: Set a layout as default (unsets other defaults)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_default_dashboard_layout(
  p_layout_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  -- Get the layout's user and project
  SELECT user_id, project_id INTO v_user_id, v_project_id
  FROM dashboard_layouts
  WHERE id = p_layout_id AND user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false; -- Layout not found or not owned by user
  END IF;

  -- Unset other defaults for same user/project combination
  UPDATE dashboard_layouts
  SET is_default = false
  WHERE user_id = v_user_id
    AND (
      (v_project_id IS NULL AND project_id IS NULL)
      OR (v_project_id IS NOT NULL AND project_id = v_project_id)
    )
    AND is_default = true
    AND id != p_layout_id;

  -- Set this layout as default
  UPDATE dashboard_layouts
  SET is_default = true
  WHERE id = p_layout_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_default_dashboard_layout(UUID) TO authenticated;

-- ============================================================================
-- Function: Clone a shared layout for user
-- ============================================================================

CREATE OR REPLACE FUNCTION clone_dashboard_layout(
  p_source_layout_id UUID,
  p_new_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_layout_id UUID;
  v_source_name TEXT;
BEGIN
  -- Get source layout name
  SELECT name INTO v_source_name
  FROM dashboard_layouts
  WHERE id = p_source_layout_id
    AND (user_id = auth.uid() OR is_shared = true);

  IF v_source_name IS NULL THEN
    RAISE EXCEPTION 'Layout not found or not accessible';
  END IF;

  -- Create new layout
  INSERT INTO dashboard_layouts (user_id, project_id, name, description, layout_config, is_default, is_shared)
  SELECT
    auth.uid(),
    project_id,
    COALESCE(p_new_name, v_source_name || ' (Copy)'),
    description,
    layout_config,
    false, -- New clones are not default
    false  -- New clones are not shared
  FROM dashboard_layouts
  WHERE id = p_source_layout_id
  RETURNING id INTO v_new_layout_id;

  -- Clone widget preferences
  INSERT INTO dashboard_widget_preferences (layout_id, widget_type, widget_config, position, is_visible, refresh_interval)
  SELECT
    v_new_layout_id,
    widget_type,
    widget_config,
    position,
    is_visible,
    refresh_interval
  FROM dashboard_widget_preferences
  WHERE layout_id = p_source_layout_id;

  RETURN v_new_layout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION clone_dashboard_layout(UUID, TEXT) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE dashboard_layouts IS 'Stores user-created dashboard layout configurations with widget positions';
COMMENT ON COLUMN dashboard_layouts.user_id IS 'The user who owns this layout';
COMMENT ON COLUMN dashboard_layouts.project_id IS 'Optional project association. NULL means layout applies globally';
COMMENT ON COLUMN dashboard_layouts.layout_config IS 'JSONB array storing the order and positions of widgets';
COMMENT ON COLUMN dashboard_layouts.is_default IS 'Whether this is the default layout for this user/project';
COMMENT ON COLUMN dashboard_layouts.is_shared IS 'Whether other users can view and clone this layout';

COMMENT ON TABLE dashboard_widget_preferences IS 'Stores individual widget configurations within a dashboard layout';
COMMENT ON COLUMN dashboard_widget_preferences.widget_type IS 'References the widget type key from the widget registry';
COMMENT ON COLUMN dashboard_widget_preferences.widget_config IS 'Custom configuration specific to this widget instance';
COMMENT ON COLUMN dashboard_widget_preferences.position IS 'Grid position object: { x, y, w, h }';
COMMENT ON COLUMN dashboard_widget_preferences.refresh_interval IS 'Auto-refresh interval in seconds. NULL disables auto-refresh';
