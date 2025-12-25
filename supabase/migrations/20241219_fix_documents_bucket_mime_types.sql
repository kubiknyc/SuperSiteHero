-- Migration: Fix documents bucket MIME type restrictions
-- Created: 2025-12-19
-- Purpose: Remove MIME type restrictions that cause 406 errors on public bucket
--
-- Root Cause:
-- When a storage bucket is public AND has allowed_mime_types restrictions,
-- Supabase Storage validates the Content-Type header against the allowed list.
-- If there's any mismatch (e.g., missing header, wrong type, etc.), it returns 406.
--
-- Solution:
-- For public buckets, remove MIME type restrictions entirely to allow unrestricted access.
-- MIME type validation should be done at upload time in the application layer (fileUtils.ts),
-- not at the storage access layer.
--
-- Note: The upload validation in fileUtils.ts (lines 37-58) still ensures only
-- allowed file types can be uploaded, providing security at the appropriate layer.

-- Remove MIME type restrictions from the documents bucket
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'documents';

-- Add comment for documentation
COMMENT ON COLUMN storage.buckets.allowed_mime_types IS
  'MIME type restrictions. NULL means no restrictions. For public buckets, ' ||
  'set to NULL to avoid 406 errors. Validate MIME types at upload time instead.';
