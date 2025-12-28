-- ============================================================================
-- Migration: Photo Progress Reports
-- Description: Track visual project progress with time-lapse photo comparisons
-- ============================================================================

-- ============================================================================
-- PHOTO LOCATIONS (Camera positions for consistent shots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS photo_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Location identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location_code VARCHAR(50), -- e.g., "CAM-01", "NORTH-ENTRY"

  -- Physical location
  building VARCHAR(100),
  floor VARCHAR(50),
  area VARCHAR(100),

  -- GPS coordinates (optional, for outdoor/site photos)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Camera guidance
  camera_direction VARCHAR(50), -- 'north', 'south', 'east', 'west', 'up', 'down'
  camera_height VARCHAR(50), -- 'ground', 'eye_level', 'elevated', 'aerial'
  reference_image_url TEXT, -- Example/template photo for this location
  capture_instructions TEXT, -- Notes for photographer

  -- Scheduling
  capture_frequency VARCHAR(50) DEFAULT 'weekly', -- 'daily', 'weekly', 'biweekly', 'monthly', 'milestone'
  next_capture_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT unique_location_code UNIQUE (project_id, location_code)
);

-- ============================================================================
-- PROGRESS PHOTOS (Individual photos at a location)
-- ============================================================================

CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  location_id UUID REFERENCES photo_locations(id) ON DELETE SET NULL,

  -- Photo details
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_filename VARCHAR(255),
  file_size INTEGER,

  -- Capture information
  capture_date DATE NOT NULL,
  capture_time TIME,
  captured_by UUID REFERENCES users(id),

  -- Weather conditions at capture
  weather_condition VARCHAR(50), -- 'sunny', 'cloudy', 'rainy', 'overcast', etc.
  temperature DECIMAL(5, 2),

  -- Photo metadata
  caption TEXT,
  notes TEXT,
  tags TEXT[], -- Array of tags for filtering

  -- Camera/EXIF data (if available)
  camera_model VARCHAR(100),
  lens_info VARCHAR(100),
  focal_length VARCHAR(20),
  aperture VARCHAR(20),
  shutter_speed VARCHAR(20),
  iso INTEGER,

  -- Location data from photo
  photo_latitude DECIMAL(10, 8),
  photo_longitude DECIMAL(11, 8),

  -- Linking
  daily_report_id UUID REFERENCES daily_reports_v2(id) ON DELETE SET NULL,
  milestone_id UUID, -- Can link to project milestones

  -- Status
  is_featured BOOLEAN DEFAULT false, -- Highlight important progress shots
  is_approved BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- PHOTO COMPARISONS (Side-by-side or before/after views)
-- ============================================================================

CREATE TABLE IF NOT EXISTS photo_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  location_id UUID REFERENCES photo_locations(id) ON DELETE SET NULL,

  -- Comparison details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  comparison_type VARCHAR(50) DEFAULT 'before_after', -- 'before_after', 'timelapse', 'milestone'

  -- Photo references
  before_photo_id UUID REFERENCES progress_photos(id) ON DELETE SET NULL,
  after_photo_id UUID REFERENCES progress_photos(id) ON DELETE SET NULL,

  -- For timelapse comparisons (multiple photos)
  photo_ids UUID[], -- Array of photo IDs in chronological order

  -- Date range
  start_date DATE,
  end_date DATE,

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  share_token VARCHAR(100) UNIQUE,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- PHOTO PROGRESS REPORTS (Generated reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS photo_progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Report details
  report_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) DEFAULT 'progress', -- 'progress', 'milestone', 'monthly', 'final'

  -- Date range covered
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Content
  location_ids UUID[], -- Locations included in report
  photo_ids UUID[], -- Photos included in report
  comparison_ids UUID[], -- Comparisons included in report

  -- Narrative
  executive_summary TEXT,
  progress_notes TEXT,
  issues_noted TEXT,

  -- Weather summary for period
  weather_summary JSONB, -- { "sunny_days": 15, "rain_days": 5, ... }

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'distributed'

  -- Distribution
  distributed_at TIMESTAMPTZ,
  distributed_to UUID[], -- Array of user IDs
  pdf_url TEXT,

  -- Approval
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT unique_report_number UNIQUE (project_id, report_number)
);

-- ============================================================================
-- AUTO-INCREMENT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_photo_report_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(report_number), 0) + 1
  INTO next_num
  FROM photo_progress_reports
  WHERE project_id = p_project_id;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set report number
CREATE OR REPLACE FUNCTION set_photo_report_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_number IS NULL OR NEW.report_number = 0 THEN
    NEW.report_number := get_next_photo_report_number(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_photo_progress_reports_set_number
  BEFORE INSERT ON photo_progress_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_photo_report_number();

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_photo_locations_updated_at
  BEFORE UPDATE ON photo_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_progress_photos_updated_at
  BEFORE UPDATE ON progress_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_photo_comparisons_updated_at
  BEFORE UPDATE ON photo_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_photo_progress_reports_updated_at
  BEFORE UPDATE ON photo_progress_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_photo_locations_project ON photo_locations(project_id);
CREATE INDEX idx_photo_locations_active ON photo_locations(project_id) WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX idx_progress_photos_project ON progress_photos(project_id);
CREATE INDEX idx_progress_photos_location ON progress_photos(location_id);
CREATE INDEX idx_progress_photos_date ON progress_photos(project_id, capture_date DESC);
CREATE INDEX idx_progress_photos_featured ON progress_photos(project_id) WHERE is_featured = true AND deleted_at IS NULL;
CREATE INDEX idx_progress_photos_tags ON progress_photos USING GIN(tags);

CREATE INDEX idx_photo_comparisons_project ON photo_comparisons(project_id);
CREATE INDEX idx_photo_comparisons_location ON photo_comparisons(location_id);

CREATE INDEX idx_photo_progress_reports_project ON photo_progress_reports(project_id);
CREATE INDEX idx_photo_progress_reports_period ON photo_progress_reports(project_id, period_start, period_end);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Photo location with latest photo
CREATE OR REPLACE VIEW photo_locations_with_latest AS
SELECT
  pl.*,
  pp.id AS latest_photo_id,
  pp.photo_url AS latest_photo_url,
  pp.thumbnail_url AS latest_thumbnail_url,
  pp.capture_date AS latest_capture_date,
  (
    SELECT COUNT(*)::INTEGER
    FROM progress_photos p
    WHERE p.location_id = pl.id AND p.deleted_at IS NULL
  ) AS photo_count
FROM photo_locations pl
LEFT JOIN LATERAL (
  SELECT id, photo_url, thumbnail_url, capture_date
  FROM progress_photos
  WHERE location_id = pl.id AND deleted_at IS NULL
  ORDER BY capture_date DESC, created_at DESC
  LIMIT 1
) pp ON true
WHERE pl.deleted_at IS NULL;

-- Progress photos summary by month
CREATE OR REPLACE VIEW photo_progress_by_month AS
SELECT
  project_id,
  DATE_TRUNC('month', capture_date)::DATE AS month,
  COUNT(*)::INTEGER AS photo_count,
  COUNT(DISTINCT location_id)::INTEGER AS locations_covered,
  COUNT(*) FILTER (WHERE is_featured)::INTEGER AS featured_count
FROM progress_photos
WHERE deleted_at IS NULL
GROUP BY project_id, DATE_TRUNC('month', capture_date)
ORDER BY project_id, month DESC;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE photo_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_progress_reports ENABLE ROW LEVEL SECURITY;

-- Photo Locations policies
CREATE POLICY "Users can view photo locations for their company's projects"
  ON photo_locations FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage photo locations for their company's projects"
  ON photo_locations FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Progress Photos policies
CREATE POLICY "Users can view progress photos for their company's projects"
  ON progress_photos FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage progress photos for their company's projects"
  ON progress_photos FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Photo Comparisons policies
CREATE POLICY "Users can view photo comparisons for their company's projects"
  ON photo_comparisons FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
    OR is_public = true
  );

CREATE POLICY "Users can manage photo comparisons for their company's projects"
  ON photo_comparisons FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Photo Progress Reports policies
CREATE POLICY "Users can view photo reports for their company's projects"
  ON photo_progress_reports FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage photo reports for their company's projects"
  ON photo_progress_reports FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE photo_locations IS 'Predefined camera positions for consistent progress photography';
COMMENT ON TABLE progress_photos IS 'Individual progress photos captured at specific locations';
COMMENT ON TABLE photo_comparisons IS 'Before/after and timelapse photo comparisons';
COMMENT ON TABLE photo_progress_reports IS 'Generated photo progress reports for distribution';
