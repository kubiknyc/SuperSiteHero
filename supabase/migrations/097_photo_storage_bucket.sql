-- Migration: 097_photo_storage_bucket.sql
-- Description: Create public storage bucket for daily report photos
-- Date: 2024-12-10
-- Features: 50MB limit, image type restrictions, RLS policies

-- =============================================
-- CREATE STORAGE BUCKET
-- =============================================

-- Note: This needs to be run via Supabase Dashboard or Management API
-- The SQL below sets up the policies assuming the bucket exists

-- Create the bucket (this is typically done via Supabase Dashboard)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'daily-report-photos',
--   'daily-report-photos',
--   true,
--   52428800, -- 50MB in bytes
--   ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   public = EXCLUDED.public,
--   file_size_limit = EXCLUDED.file_size_limit,
--   allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Drop existing policies if they exist (for idempotent migration)
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for daily report photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own photos" ON storage.objects;

-- Policy: Authenticated users can upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'daily-report-photos'
);

-- Policy: Public read access (since bucket is public)
CREATE POLICY "Public read access for daily report photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'daily-report-photos');

-- Policy: Users can update their own photos (for metadata updates)
CREATE POLICY "Authenticated users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'daily-report-photos'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'daily-report-photos'
);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'daily-report-photos'
  AND owner = auth.uid()
);

-- =============================================
-- HELPER FUNCTION FOR PHOTO PATHS
-- =============================================

-- Function to generate a standardized photo path
CREATE OR REPLACE FUNCTION generate_photo_path(
  project_id UUID,
  report_date DATE,
  photo_id UUID
)
RETURNS TEXT AS $$
BEGIN
  RETURN format(
    '%s/%s/%s',
    project_id::TEXT,
    to_char(report_date, 'YYYY-MM-DD'),
    photo_id::TEXT
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract project_id from photo path
CREATE OR REPLACE FUNCTION extract_project_from_photo_path(path TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN (string_to_array(path, '/'))[1]::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- BUCKET CREATION INSTRUCTION
-- =============================================

-- Since we cannot create buckets via SQL directly in all Supabase setups,
-- here is the equivalent JavaScript/TypeScript to run:
--
-- const { data, error } = await supabase.storage.createBucket('daily-report-photos', {
--   public: true,
--   fileSizeLimit: 52428800, // 50MB
--   allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
-- });

-- =============================================
-- MANUAL BUCKET CREATION (if needed)
-- =============================================

-- For self-hosted or if the bucket doesn't exist yet:
DO $$
BEGIN
  -- Check if bucket exists and create if not
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'daily-report-photos') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'daily-report-photos',
      'daily-report-photos',
      true,
      52428800,
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
    );
    RAISE NOTICE 'Created storage bucket: daily-report-photos';
  ELSE
    -- Update existing bucket settings
    UPDATE storage.buckets
    SET
      public = true,
      file_size_limit = 52428800,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
    WHERE id = 'daily-report-photos';
    RAISE NOTICE 'Updated existing storage bucket: daily-report-photos';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create/update bucket via SQL. Please create manually via Supabase Dashboard.';
    RAISE NOTICE 'Bucket settings: name=daily-report-photos, public=true, size_limit=50MB';
    RAISE NOTICE 'Allowed types: jpeg, png, gif, webp, heic, heif';
END $$;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 097_photo_storage_bucket completed successfully';
  RAISE NOTICE 'Storage policies created for bucket: daily-report-photos';
  RAISE NOTICE 'Helper functions created: generate_photo_path, extract_project_from_photo_path';
END $$;
