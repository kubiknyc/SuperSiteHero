-- Migration: 161_inspection_photos
-- Description: Add photo support for inspections
-- Created: 2024-12-31

-- ============================================
-- INSPECTION PHOTOS TABLE
-- ============================================
-- Store photos associated with inspections

CREATE TABLE IF NOT EXISTS inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,

  -- Photo Storage
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT,  -- Path in Supabase Storage for cleanup

  -- Photo Information
  caption TEXT,
  photo_type VARCHAR(50) DEFAULT 'general',  -- general, before, after, deficiency, compliance

  -- Metadata
  file_name VARCHAR(255),
  file_size INTEGER,  -- Size in bytes
  mime_type VARCHAR(100),
  width INTEGER,
  height INTEGER,

  -- GPS Location (if available from EXIF)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_description VARCHAR(500),

  -- Capture Details
  taken_at TIMESTAMPTZ,  -- From EXIF data
  device_info VARCHAR(255),  -- Device that took the photo

  -- Uploaded By
  uploaded_by UUID REFERENCES users(id),

  -- Sort Order
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection_id
  ON inspection_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_photo_type
  ON inspection_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_created_at
  ON inspection_photos(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

-- Users can view photos for inspections in their projects
CREATE POLICY "Users can view inspection photos for their projects"
  ON inspection_photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN project_users pu ON i.project_id = pu.project_id
      WHERE i.id = inspection_photos.inspection_id
        AND pu.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN projects p ON i.project_id = p.id
      JOIN users u ON p.company_id = u.company_id
      WHERE i.id = inspection_photos.inspection_id
        AND u.id = auth.uid()
        AND u.role IN ('owner', 'admin')
    )
  );

-- Users can insert photos if they can edit the project
CREATE POLICY "Users can add inspection photos for their projects"
  ON inspection_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN project_users pu ON i.project_id = pu.project_id
      WHERE i.id = inspection_photos.inspection_id
        AND pu.user_id = auth.uid()
        AND pu.can_edit = true
    )
    OR
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN projects p ON i.project_id = p.id
      JOIN users u ON p.company_id = u.company_id
      WHERE i.id = inspection_photos.inspection_id
        AND u.id = auth.uid()
        AND u.role IN ('owner', 'admin')
    )
  );

-- Users can update their own photos or if they're admins
CREATE POLICY "Users can update inspection photos"
  ON inspection_photos
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN projects p ON i.project_id = p.id
      JOIN users u ON p.company_id = u.company_id
      WHERE i.id = inspection_photos.inspection_id
        AND u.id = auth.uid()
        AND u.role IN ('owner', 'admin')
    )
  );

-- Users can delete their own photos or if they're admins
CREATE POLICY "Users can delete inspection photos"
  ON inspection_photos
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN projects p ON i.project_id = p.id
      JOIN users u ON p.company_id = u.company_id
      WHERE i.id = inspection_photos.inspection_id
        AND u.id = auth.uid()
        AND u.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- STORAGE BUCKET
-- ============================================

-- Create storage bucket for inspection photos (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  true,
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for inspection photos bucket
CREATE POLICY "Users can upload inspection photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-photos'
  );

CREATE POLICY "Anyone can view inspection photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'inspection-photos'
  );

CREATE POLICY "Users can delete their inspection photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'inspection-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_inspection_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inspection_photos_updated_at
  BEFORE UPDATE ON inspection_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_inspection_photos_updated_at();

-- ============================================
-- HELPER FUNCTION: Get photo count for inspection
-- ============================================

CREATE OR REPLACE FUNCTION get_inspection_photo_count(p_inspection_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM inspection_photos
    WHERE inspection_id = p_inspection_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE inspection_photos IS 'Photos attached to inspections for documentation';
COMMENT ON COLUMN inspection_photos.photo_type IS 'Type of photo: general, before, after, deficiency, compliance';
COMMENT ON COLUMN inspection_photos.storage_path IS 'Path in Supabase Storage, used for cleanup on delete';
