/**
 * Message Attachments Storage Bucket
 *
 * Migration: 037
 * Created: 2025-11-29
 * Purpose: Create Supabase Storage bucket for message file attachments
 *          with RLS policies for secure access control
 */

-- =====================================================
-- CREATE STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,  -- Private bucket, access controlled by RLS
  52428800,  -- 50MB file size limit
  ARRAY[
    -- Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
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
    'text/csv',
    'text/markdown',
    -- Archives
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS POLICIES FOR MESSAGE ATTACHMENTS
-- =====================================================

-- Policy 1: Users can upload attachments to conversations they're in
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[2]  -- User ID is second folder in path
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id::text = (storage.foldername(name))[1]  -- Conversation ID is first folder
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  )
);

-- Policy 2: Users can view attachments in conversations they're participants in
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id::text = (storage.foldername(name))[1]
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  )
);

-- Policy 3: Users can delete their own uploaded attachments
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[2]  -- Must be uploader
);

-- Policy 4: Users can update their own attachments metadata
CREATE POLICY "Users can update their own message attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- =====================================================
-- COMMENTS
-- =====================================================

-- Note: Cannot comment on storage.buckets table (requires ownership)
-- COMMENT ON TABLE storage.buckets IS 'Supabase Storage buckets for file storage';

-- Note: File path structure is {conversationId}/{userId}/{timestamp}-{random}.{ext}
-- This allows RLS policies to verify both conversation membership and file ownership
