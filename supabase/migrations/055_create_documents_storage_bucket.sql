-- Migration: Create documents storage bucket
-- Created: 2025-12-06
-- Purpose: Create Supabase Storage bucket for document file uploads
--          This bucket was missing and causing upload errors in DocumentUpload component

-- =====================================================
-- CREATE STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket, access controlled by RLS
  52428800,  -- 50MB file size limit
  ARRAY[
    -- Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  -- .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  -- .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',  -- .pptx
    -- Text files
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS POLICIES FOR DOCUMENTS BUCKET
-- =====================================================

-- Policy 1: Users can upload documents to their projects
CREATE POLICY "Users can upload documents to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id::text = (storage.foldername(name))[1]  -- Project ID is first folder in path
      AND pu.user_id = auth.uid()
  )
);

-- Policy 2: Users can view documents from their projects
CREATE POLICY "Users can view documents from their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id::text = (storage.foldername(name))[1]
      AND pu.user_id = auth.uid()
  )
);

-- Policy 3: Users can delete documents from their projects
CREATE POLICY "Users can delete documents from their projects"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id::text = (storage.foldername(name))[1]
      AND pu.user_id = auth.uid()
  )
);

-- Policy 4: Users can update documents in their projects
CREATE POLICY "Users can update documents in their projects"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id::text = (storage.foldername(name))[1]
      AND pu.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id::text = (storage.foldername(name))[1]
      AND pu.user_id = auth.uid()
  )
);

-- =====================================================
-- COMMENTS
-- =====================================================

-- Note: File path structure expected by fileUtils.ts is {projectId}/{timestamp}-{filename}.{ext}
-- This allows RLS policies to verify user has access to the project before allowing upload/download
