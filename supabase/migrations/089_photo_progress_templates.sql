-- Migration: Photo Progress Templates
-- Adds structured progress photo workflow with location templates and requirements tracking

-- ============================================================================
-- PHOTO LOCATION TEMPLATES
-- Define mandatory photo spots per project (e.g., "North Elevation", "Electrical Room")
-- ============================================================================

CREATE TABLE IF NOT EXISTS photo_location_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Location identification
  name VARCHAR(100) NOT NULL,
  description TEXT,
  building VARCHAR(100),
  floor VARCHAR(50),
  area VARCHAR(100),
  grid_reference VARCHAR(50),

  -- GPS coordinates for the exact spot (optional)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  gps_radius_meters INTEGER DEFAULT 50, -- Acceptable distance from coordinates

  -- Reference photo showing the exact angle/framing
  reference_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
  reference_photo_url TEXT,

  -- Requirements
  is_required BOOLEAN DEFAULT true,
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'milestone', 'on_demand')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, for weekly
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31), -- For monthly

  -- Categorization
  category VARCHAR(50) DEFAULT 'progress'
    CHECK (category IN ('progress', 'safety', 'quality', 'weather', 'milestone', 'closeout', 'other')),
  tags TEXT[],

  -- Display
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  color VARCHAR(7), -- Hex color for UI grouping
  icon VARCHAR(50), -- Icon name for UI

  -- Instructions for photographer
  photo_instructions TEXT,
  required_angle VARCHAR(50), -- 'front', 'side', 'aerial', 'detail', etc.
  min_photos_required INTEGER DEFAULT 1,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- PHOTO REQUIREMENTS
-- Track completion of required photos (generated from templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS photo_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES photo_location_templates(id) ON DELETE CASCADE,

  -- When this photo is due
  due_date DATE NOT NULL,
  due_time TIME, -- Optional specific time

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'missed', 'skipped', 'partial')),

  -- Completion details
  completed_photo_ids UUID[] DEFAULT '{}', -- Can have multiple photos
  photos_count INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),

  -- For missed/skipped
  skip_reason TEXT,
  skipped_by UUID REFERENCES users(id),

  -- Quality check
  review_status VARCHAR(20) DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_retake')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Notifications
  reminder_sent_at TIMESTAMPTZ,
  overdue_notification_sent_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate requirements for same template/date
  UNIQUE(template_id, due_date)
);

-- ============================================================================
-- PHOTO PROGRESS VIEWS
-- Track same location over time for progress visualization
-- ============================================================================

CREATE TABLE IF NOT EXISTS photo_progress_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES photo_location_templates(id) ON DELETE SET NULL,

  -- Series identification
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Location (can be independent of template)
  building VARCHAR(100),
  floor VARCHAR(50),
  area VARCHAR(100),

  -- Photos in this series (ordered by date)
  photo_ids UUID[] DEFAULT '{}',

  -- Display settings
  is_featured BOOLEAN DEFAULT false,
  thumbnail_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Photo location templates
CREATE INDEX idx_photo_location_templates_project ON photo_location_templates(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_photo_location_templates_active ON photo_location_templates(project_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_photo_location_templates_frequency ON photo_location_templates(project_id, frequency) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_photo_location_templates_category ON photo_location_templates(project_id, category) WHERE deleted_at IS NULL;

-- Photo requirements
CREATE INDEX idx_photo_requirements_project ON photo_requirements(project_id);
CREATE INDEX idx_photo_requirements_template ON photo_requirements(template_id);
CREATE INDEX idx_photo_requirements_due_date ON photo_requirements(project_id, due_date);
CREATE INDEX idx_photo_requirements_status ON photo_requirements(project_id, status, due_date);
CREATE INDEX idx_photo_requirements_pending ON photo_requirements(project_id, due_date) WHERE status = 'pending';
-- Note: Cannot use CURRENT_DATE in partial index (not immutable); using just status filter
CREATE INDEX idx_photo_requirements_overdue ON photo_requirements(project_id, due_date) WHERE status = 'pending';

-- Photo progress series
CREATE INDEX idx_photo_progress_series_project ON photo_progress_series(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_photo_progress_series_template ON photo_progress_series(template_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to generate daily requirements from templates
CREATE OR REPLACE FUNCTION generate_photo_requirements(
  p_project_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_template RECORD;
  v_day_of_week INTEGER;
  v_day_of_month INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  v_day_of_month := EXTRACT(DAY FROM p_date)::INTEGER;

  FOR v_template IN
    SELECT * FROM photo_location_templates
    WHERE project_id = p_project_id
      AND is_active = true
      AND deleted_at IS NULL
      AND is_required = true
  LOOP
    -- Check if requirement should be generated based on frequency
    IF (
      v_template.frequency = 'daily' OR
      (v_template.frequency = 'weekly' AND v_template.day_of_week = v_day_of_week) OR
      (v_template.frequency = 'biweekly' AND v_template.day_of_week = v_day_of_week AND EXTRACT(WEEK FROM p_date)::INTEGER % 2 = 0) OR
      (v_template.frequency = 'monthly' AND v_template.day_of_month = v_day_of_month)
    ) THEN
      -- Insert requirement if not exists
      INSERT INTO photo_requirements (project_id, template_id, due_date)
      VALUES (p_project_id, v_template.id, p_date)
      ON CONFLICT (template_id, due_date) DO NOTHING;

      IF FOUND THEN
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark a requirement as completed with a photo
CREATE OR REPLACE FUNCTION complete_photo_requirement(
  p_requirement_id UUID,
  p_photo_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_requirement RECORD;
  v_template RECORD;
BEGIN
  -- Get requirement and template
  SELECT pr.*, plt.min_photos_required
  INTO v_requirement
  FROM photo_requirements pr
  JOIN photo_location_templates plt ON pr.template_id = plt.id
  WHERE pr.id = p_requirement_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Add photo to array
  UPDATE photo_requirements
  SET
    completed_photo_ids = array_append(
      COALESCE(completed_photo_ids, '{}'),
      p_photo_id
    ),
    photos_count = COALESCE(photos_count, 0) + 1,
    status = CASE
      WHEN COALESCE(photos_count, 0) + 1 >= v_requirement.min_photos_required THEN 'completed'
      ELSE 'partial'
    END,
    completed_at = CASE
      WHEN COALESCE(photos_count, 0) + 1 >= v_requirement.min_photos_required THEN NOW()
      ELSE completed_at
    END,
    completed_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_requirement_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get photo completion stats for a date range
CREATE OR REPLACE FUNCTION get_photo_completion_stats(
  p_project_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_required BIGINT,
  completed BIGINT,
  missed BIGINT,
  pending BIGINT,
  completion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_required,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed,
    COUNT(*) FILTER (WHERE status = 'missed')::BIGINT as missed,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 1)
      ELSE 0
    END as completion_rate
  FROM photo_requirements
  WHERE project_id = p_project_id
    AND due_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to mark overdue requirements as missed
CREATE OR REPLACE FUNCTION mark_overdue_photo_requirements()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE photo_requirements
  SET
    status = 'missed',
    updated_at = NOW()
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_photo_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_location_templates_updated
  BEFORE UPDATE ON photo_location_templates
  FOR EACH ROW EXECUTE FUNCTION update_photo_templates_timestamp();

CREATE TRIGGER photo_requirements_updated
  BEFORE UPDATE ON photo_requirements
  FOR EACH ROW EXECUTE FUNCTION update_photo_templates_timestamp();

CREATE TRIGGER photo_progress_series_updated
  BEFORE UPDATE ON photo_progress_series
  FOR EACH ROW EXECUTE FUNCTION update_photo_templates_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE photo_location_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_progress_series ENABLE ROW LEVEL SECURITY;

-- Photo location templates policies
CREATE POLICY "Users can view photo templates for their projects"
  ON photo_location_templates FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create photo templates for their projects"
  ON photo_location_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update photo templates for their projects"
  ON photo_location_templates FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photo templates for their projects"
  ON photo_location_templates FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Photo requirements policies
CREATE POLICY "Users can view photo requirements for their projects"
  ON photo_requirements FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create photo requirements for their projects"
  ON photo_requirements FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update photo requirements for their projects"
  ON photo_requirements FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Photo progress series policies
CREATE POLICY "Users can view photo progress series for their projects"
  ON photo_progress_series FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create photo progress series for their projects"
  ON photo_progress_series FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update photo progress series for their projects"
  ON photo_progress_series FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photo progress series for their projects"
  ON photo_progress_series FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE photo_location_templates IS 'Defines mandatory photo spots per project for structured progress documentation';
COMMENT ON TABLE photo_requirements IS 'Tracks completion of required photos generated from templates';
COMMENT ON TABLE photo_progress_series IS 'Groups photos of the same location over time for progress visualization';
COMMENT ON FUNCTION generate_photo_requirements IS 'Generates daily photo requirements from active templates';
COMMENT ON FUNCTION complete_photo_requirement IS 'Marks a requirement as completed when photo is uploaded';
COMMENT ON FUNCTION get_photo_completion_stats IS 'Returns completion statistics for a date range';
