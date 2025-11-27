-- File: /supabase/migrations/025_checklist_storage_buckets.sql
-- Create storage buckets and RLS policies for checklist photos and signatures
-- Phase: 3.2 - Photo & Signature Capture

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create checklist-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'checklist-photos',
  'checklist-photos',
  false,  -- Private bucket (use signed URLs)
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create checklist-signatures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'checklist-signatures',
  'checklist-signatures',
  false,  -- Private bucket (use signed URLs)
  2097152,  -- 2MB file size limit
  ARRAY['image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES FOR CHECKLIST-PHOTOS BUCKET
-- ============================================================================

-- Allow users to upload photos to checklists in their assigned projects
CREATE POLICY "Users can upload photos to their project checklists"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'checklist-photos'
  AND auth.uid() IN (
    SELECT pu.user_id
    FROM checklist_responses cr
    JOIN checklists c ON c.id = cr.checklist_id
    JOIN project_users pu ON pu.project_id = c.project_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.deleted_at IS NULL
      AND pu.deleted_at IS NULL
  )
);

-- Allow users to view photos from checklists in their assigned projects
CREATE POLICY "Users can view photos from their project checklists"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'checklist-photos'
  AND auth.uid() IN (
    SELECT pu.user_id
    FROM checklist_responses cr
    JOIN checklists c ON c.id = cr.checklist_id
    JOIN project_users pu ON pu.project_id = c.project_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.deleted_at IS NULL
      AND pu.deleted_at IS NULL
  )
);

-- Allow users to delete photos from checklists in their assigned projects
CREATE POLICY "Users can delete photos from their project checklists"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'checklist-photos'
  AND auth.uid() IN (
    SELECT pu.user_id
    FROM checklist_responses cr
    JOIN checklists c ON c.id = cr.checklist_id
    JOIN project_users pu ON pu.project_id = c.project_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.deleted_at IS NULL
      AND pu.deleted_at IS NULL
  )
);

-- ============================================================================
-- RLS POLICIES FOR CHECKLIST-SIGNATURES BUCKET
-- ============================================================================

-- Allow users to upload signatures to checklists in their assigned projects
CREATE POLICY "Users can upload signatures to their project checklists"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'checklist-signatures'
  AND auth.uid() IN (
    SELECT pu.user_id
    FROM checklist_responses cr
    JOIN checklists c ON c.id = cr.checklist_id
    JOIN project_users pu ON pu.project_id = c.project_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.deleted_at IS NULL
      AND pu.deleted_at IS NULL
  )
);

-- Allow users to view signatures from checklists in their assigned projects
CREATE POLICY "Users can view signatures from their project checklists"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'checklist-signatures'
  AND auth.uid() IN (
    SELECT pu.user_id
    FROM checklist_responses cr
    JOIN checklists c ON c.id = cr.checklist_id
    JOIN project_users pu ON pu.project_id = c.project_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.deleted_at IS NULL
      AND pu.deleted_at IS NULL
  )
);

-- Allow users to update/replace signatures in their assigned projects
CREATE POLICY "Users can update signatures in their project checklists"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'checklist-signatures'
  AND auth.uid() IN (
    SELECT pu.user_id
    FROM checklist_responses cr
    JOIN checklists c ON c.id = cr.checklist_id
    JOIN project_users pu ON pu.project_id = c.project_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.deleted_at IS NULL
      AND pu.deleted_at IS NULL
  )
);

-- Allow users to delete signatures from checklists in their assigned projects
CREATE POLICY "Users can delete signatures from their project checklists"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'checklist-signatures'
  AND auth.uid() IN (
    SELECT pu.user_id
    FROM checklist_responses cr
    JOIN checklists c ON c.id = cr.checklist_id
    JOIN project_users pu ON pu.project_id = c.project_id
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.deleted_at IS NULL
      AND pu.deleted_at IS NULL
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can upload photos to their project checklists" ON storage.objects IS
'Allows project members to upload photos to checklist responses';

COMMENT ON POLICY "Users can view photos from their project checklists" ON storage.objects IS
'Allows project members to view photos from checklist responses';

COMMENT ON POLICY "Users can delete photos from their project checklists" ON storage.objects IS
'Allows project members to delete photos from checklist responses';

COMMENT ON POLICY "Users can upload signatures to their project checklists" ON storage.objects IS
'Allows project members to upload signatures to checklist responses';

COMMENT ON POLICY "Users can view signatures from their project checklists" ON storage.objects IS
'Allows project members to view signatures from checklist responses';

COMMENT ON POLICY "Users can update signatures in their project checklists" ON storage.objects IS
'Allows project members to replace signatures in checklist responses';

COMMENT ON POLICY "Users can delete signatures from their project checklists" ON storage.objects IS
'Allows project members to delete signatures from checklist responses';
