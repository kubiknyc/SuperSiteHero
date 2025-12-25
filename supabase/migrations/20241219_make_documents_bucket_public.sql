-- Migration: Make documents bucket public
-- Created: 2025-12-18
-- Purpose: Fix PDF viewing errors by making documents bucket public
--          Previously the bucket was private but code was generating public URLs
--          This caused 400 errors when trying to view PDFs

-- Update the documents bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'documents';

-- Note: With a public bucket, the RLS policies on storage.objects are no longer enforced
-- for reading files. However, they still control upload/update/delete operations.
-- Anyone with the URL can view documents, but only authorized users can upload/modify/delete.
