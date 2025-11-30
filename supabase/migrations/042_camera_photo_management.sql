-- Migration: 042_camera_photo_management.sql
-- Description: Enhanced Camera & Photo Management system
-- Date: 2025-11-29

-- =============================================
-- PHASE 1: Enhance existing photos table
-- =============================================

-- Add additional metadata columns to photos table
ALTER TABLE photos ADD COLUMN IF NOT EXISTS altitude DECIMAL(10, 2);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS gps_accuracy DECIMAL(10, 2);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS heading DECIMAL(5, 2);

-- Camera metadata
ALTER TABLE photos ADD COLUMN IF NOT EXISTS camera_make VARCHAR(100);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS camera_model VARCHAR(100);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS focal_length DECIMAL(8, 2);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS aperture VARCHAR(20);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS iso INTEGER;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS exposure_time VARCHAR(20);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS flash_used BOOLEAN;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS orientation INTEGER;

-- Weather conditions at capture time
ALTER TABLE photos ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(50);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS temperature DECIMAL(5, 2);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS humidity INTEGER;

-- OCR and AI data
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ocr_text TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(5, 2);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ai_tags VARCHAR[] DEFAULT ARRAY[]::VARCHAR[];
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ai_description TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ai_objects_detected JSONB DEFAULT '[]'::jsonb;

-- Entity linking (explicit foreign keys instead of just JSONB)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS daily_report_id UUID REFERENCES daily_reports(id) ON DELETE SET NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS punch_item_id UUID REFERENCES punch_items(id) ON DELETE SET NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS safety_incident_id UUID REFERENCES safety_incidents(id) ON DELETE SET NULL;

-- Note: rfi_id, submittal_id, change_order_id link through workflow_items
ALTER TABLE photos ADD COLUMN IF NOT EXISTS workflow_item_id UUID REFERENCES workflow_items(id) ON DELETE SET NULL;

-- Checklist response linking
ALTER TABLE photos ADD COLUMN IF NOT EXISTS checklist_response_id UUID;

-- Photo source tracking
ALTER TABLE photos ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'upload'; -- 'camera', 'upload', 'import', 'scan'
ALTER TABLE photos ADD COLUMN IF NOT EXISTS device_type VARCHAR(50); -- 'mobile', 'tablet', 'desktop'
ALTER TABLE photos ADD COLUMN IF NOT EXISTS device_os VARCHAR(50);

-- Approval/review status for photos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'pending'; -- 'pending', 'approved', 'rejected', 'flagged'
ALTER TABLE photos ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_photos_daily_report_id ON photos(daily_report_id) WHERE daily_report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_punch_item_id ON photos(punch_item_id) WHERE punch_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_safety_incident_id ON photos(safety_incident_id) WHERE safety_incident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_workflow_item_id ON photos(workflow_item_id) WHERE workflow_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_source ON photos(source);
CREATE INDEX IF NOT EXISTS idx_photos_review_status ON photos(review_status);
CREATE INDEX IF NOT EXISTS idx_photos_gps ON photos(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- =============================================
-- TABLE: photo_collections (albums/folders)
-- =============================================
CREATE TABLE IF NOT EXISTS photo_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Collection info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,

  -- Collection type
  collection_type VARCHAR(50) NOT NULL DEFAULT 'album', -- 'album', 'smart', 'location', 'date', 'entity'

  -- Smart collection criteria (for auto-populated collections)
  smart_criteria JSONB DEFAULT NULL,
  -- Example: {"tags": ["exterior"], "date_range": {"start": "2025-01-01", "end": "2025-01-31"}}

  -- Location-based collection
  location_name VARCHAR(255),
  location_building VARCHAR(100),
  location_floor VARCHAR(100),
  location_area VARCHAR(100),
  location_grid VARCHAR(100),

  -- Entity-based collection
  entity_type VARCHAR(50), -- 'daily_report', 'punch_item', 'rfi', 'safety_incident'
  entity_id UUID,

  -- Sorting and display
  sort_order INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false, -- Visible to clients

  -- Stats (denormalized for performance)
  photo_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes for photo_collections
CREATE INDEX IF NOT EXISTS idx_photo_collections_project_id ON photo_collections(project_id);
CREATE INDEX IF NOT EXISTS idx_photo_collections_type ON photo_collections(collection_type);
CREATE INDEX IF NOT EXISTS idx_photo_collections_entity ON photo_collections(entity_type, entity_id) WHERE entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_collections_deleted_at ON photo_collections(deleted_at);

-- Trigger for updated_at
CREATE TRIGGER update_photo_collections_updated_at BEFORE UPDATE ON photo_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE photo_collections ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: photo_collection_items (photos in collections)
-- =============================================
CREATE TABLE IF NOT EXISTS photo_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES photo_collections(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,

  -- Order within collection
  sort_order INTEGER DEFAULT 0,

  -- Override photo caption for this collection
  custom_caption TEXT,

  -- Added to collection
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES users(id),

  UNIQUE(collection_id, photo_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photo_collection_items_collection ON photo_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_photo_collection_items_photo ON photo_collection_items(photo_id);

-- Enable RLS
ALTER TABLE photo_collection_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: photo_comparisons (before/after pairs)
-- =============================================
CREATE TABLE IF NOT EXISTS photo_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Comparison info
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Photo pair
  before_photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  after_photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,

  -- Location reference
  building VARCHAR(100),
  floor VARCHAR(100),
  area VARCHAR(100),
  grid VARCHAR(100),

  -- Entity linking
  punch_item_id UUID REFERENCES punch_items(id) ON DELETE SET NULL,
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE SET NULL,
  workflow_item_id UUID REFERENCES workflow_items(id) ON DELETE SET NULL,

  -- Comparison type
  comparison_type VARCHAR(50) DEFAULT 'before_after', -- 'before_after', 'progress', 'issue_resolution'

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'approved'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photo_comparisons_project_id ON photo_comparisons(project_id);
CREATE INDEX IF NOT EXISTS idx_photo_comparisons_before_photo ON photo_comparisons(before_photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comparisons_after_photo ON photo_comparisons(after_photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comparisons_punch_item ON photo_comparisons(punch_item_id) WHERE punch_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_comparisons_status ON photo_comparisons(status);
CREATE INDEX IF NOT EXISTS idx_photo_comparisons_deleted_at ON photo_comparisons(deleted_at);

-- Trigger
CREATE TRIGGER update_photo_comparisons_updated_at BEFORE UPDATE ON photo_comparisons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE photo_comparisons ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: photo_annotations (markup on photos)
-- =============================================
CREATE TABLE IF NOT EXISTS photo_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,

  -- Annotation type
  annotation_type VARCHAR(50) NOT NULL, -- 'arrow', 'circle', 'rectangle', 'text', 'freehand', 'measurement', 'pin'

  -- Annotation data (coordinates, text, etc.)
  annotation_data JSONB NOT NULL,
  -- Example for arrow: {"start": {"x": 100, "y": 100}, "end": {"x": 200, "y": 200}}
  -- Example for text: {"x": 100, "y": 100, "text": "Issue here", "fontSize": 14}
  -- Example for measurement: {"start": {"x": 0, "y": 0}, "end": {"x": 100, "y": 0}, "value": "10 ft"}

  -- Styling
  color VARCHAR(20) DEFAULT '#FF0000',
  stroke_width INTEGER DEFAULT 2,
  fill_color VARCHAR(20),
  opacity DECIMAL(3, 2) DEFAULT 1.0,

  -- Layer/visibility
  layer VARCHAR(50) DEFAULT 'default',
  is_visible BOOLEAN DEFAULT true,

  -- Linked issue/item
  linked_entity_type VARCHAR(50), -- 'punch_item', 'rfi', 'safety_incident'
  linked_entity_id UUID,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photo_annotations_photo_id ON photo_annotations(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_annotations_type ON photo_annotations(annotation_type);
CREATE INDEX IF NOT EXISTS idx_photo_annotations_linked ON photo_annotations(linked_entity_type, linked_entity_id) WHERE linked_entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_annotations_deleted_at ON photo_annotations(deleted_at);

-- Trigger
CREATE TRIGGER update_photo_annotations_updated_at BEFORE UPDATE ON photo_annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE photo_annotations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: photo_access_log
-- =============================================
CREATE TABLE IF NOT EXISTS photo_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  -- Action
  action VARCHAR(50) NOT NULL, -- 'view', 'download', 'share', 'print', 'edit', 'annotate'

  -- Context
  context VARCHAR(100), -- Where the action occurred: 'gallery', 'detail', 'comparison', 'report'

  -- Device info
  device_type VARCHAR(50),
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photo_access_log_photo ON photo_access_log(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_access_log_user ON photo_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_access_log_action ON photo_access_log(action);
CREATE INDEX IF NOT EXISTS idx_photo_access_log_time ON photo_access_log(accessed_at);

-- Enable RLS
ALTER TABLE photo_access_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Supabase Storage bucket for photos
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-photos',
  'project-photos',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];

-- Storage policies for project-photos bucket
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-photos');

CREATE POLICY "Users can view project photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-photos');

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- RLS Policies for new tables
-- =============================================

-- photo_collections policies
CREATE POLICY "Users can view project collections"
ON photo_collections FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_users WHERE user_id = auth.uid()
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Users can create collections in their projects"
ON photo_collections FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT project_id FROM project_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update project collections"
ON photo_collections FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete project collections"
ON photo_collections FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_users WHERE user_id = auth.uid()
  )
);

-- photo_collection_items policies
CREATE POLICY "Users can view collection items"
ON photo_collection_items FOR SELECT
TO authenticated
USING (
  collection_id IN (
    SELECT id FROM photo_collections
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can add items to collections"
ON photo_collection_items FOR INSERT
TO authenticated
WITH CHECK (
  collection_id IN (
    SELECT id FROM photo_collections
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can remove items from collections"
ON photo_collection_items FOR DELETE
TO authenticated
USING (
  collection_id IN (
    SELECT id FROM photo_collections
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  )
);

-- photo_comparisons policies
CREATE POLICY "Users can view project comparisons"
ON photo_comparisons FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_users WHERE user_id = auth.uid()
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Users can create comparisons"
ON photo_comparisons FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT project_id FROM project_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update comparisons"
ON photo_comparisons FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete comparisons"
ON photo_comparisons FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_users WHERE user_id = auth.uid()
  )
);

-- photo_annotations policies
CREATE POLICY "Users can view photo annotations"
ON photo_annotations FOR SELECT
TO authenticated
USING (
  photo_id IN (
    SELECT id FROM photos
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Users can create annotations"
ON photo_annotations FOR INSERT
TO authenticated
WITH CHECK (
  photo_id IN (
    SELECT id FROM photos
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can update annotations"
ON photo_annotations FOR UPDATE
TO authenticated
USING (
  photo_id IN (
    SELECT id FROM photos
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete annotations"
ON photo_annotations FOR DELETE
TO authenticated
USING (
  photo_id IN (
    SELECT id FROM photos
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  )
);

-- photo_access_log policies
CREATE POLICY "Users can view photo access logs"
ON photo_access_log FOR SELECT
TO authenticated
USING (
  photo_id IN (
    SELECT id FROM photos
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can log photo access"
ON photo_access_log FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =============================================
-- Helper functions
-- =============================================

-- Function to update collection photo count
CREATE OR REPLACE FUNCTION update_collection_photo_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photo_collections
    SET photo_count = photo_count + 1, updated_at = NOW()
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photo_collections
    SET photo_count = GREATEST(photo_count - 1, 0), updated_at = NOW()
    WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for photo count updates
CREATE TRIGGER trigger_update_collection_photo_count
AFTER INSERT OR DELETE ON photo_collection_items
FOR EACH ROW EXECUTE FUNCTION update_collection_photo_count();

-- Function to get photos by GPS proximity
CREATE OR REPLACE FUNCTION get_photos_by_location(
  p_project_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_meters INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  file_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_meters DECIMAL,
  captured_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.file_url,
    p.thumbnail_url,
    p.caption,
    p.latitude,
    p.longitude,
    (
      6371000 * acos(
        cos(radians(p_latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(p.latitude))
      )
    )::DECIMAL AS distance_meters,
    p.captured_at
  FROM photos p
  WHERE p.project_id = p_project_id
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.deleted_at IS NULL
    AND (
      6371000 * acos(
        cos(radians(p_latitude)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) * sin(radians(p.latitude))
      )
    ) <= p_radius_meters
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get photo statistics for a project
CREATE OR REPLACE FUNCTION get_project_photo_stats(p_project_id UUID)
RETURNS TABLE (
  total_photos BIGINT,
  photos_today BIGINT,
  photos_this_week BIGINT,
  photos_with_gps BIGINT,
  photos_pending_review BIGINT,
  storage_used_bytes BIGINT,
  unique_locations BIGINT,
  photos_by_category JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_photos,
    COUNT(*) FILTER (WHERE DATE(captured_at) = CURRENT_DATE)::BIGINT AS photos_today,
    COUNT(*) FILTER (WHERE captured_at >= NOW() - INTERVAL '7 days')::BIGINT AS photos_this_week,
    COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL)::BIGINT AS photos_with_gps,
    COUNT(*) FILTER (WHERE review_status = 'pending')::BIGINT AS photos_pending_review,
    COALESCE(SUM(file_size), 0)::BIGINT AS storage_used_bytes,
    COUNT(DISTINCT CONCAT(building, '-', floor, '-', area))::BIGINT AS unique_locations,
    COALESCE(
      jsonb_object_agg(
        COALESCE(photo_category, 'uncategorized'),
        category_count
      ),
      '{}'::jsonb
    ) AS photos_by_category
  FROM photos
  LEFT JOIN (
    SELECT photo_category as cat, COUNT(*) as category_count
    FROM photos
    WHERE project_id = p_project_id AND deleted_at IS NULL
    GROUP BY photo_category
  ) categories ON true
  WHERE project_id = p_project_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE photo_collections IS 'Photo albums and smart collections for organizing project photos';
COMMENT ON TABLE photo_collection_items IS 'Junction table linking photos to collections';
COMMENT ON TABLE photo_comparisons IS 'Before/after photo pairs for progress documentation';
COMMENT ON TABLE photo_annotations IS 'Markup and annotations on photos';
COMMENT ON TABLE photo_access_log IS 'Audit log of photo views, downloads, and edits';
COMMENT ON FUNCTION get_photos_by_location IS 'Returns photos within a given radius of GPS coordinates';
COMMENT ON FUNCTION get_project_photo_stats IS 'Returns aggregated statistics for project photos';
