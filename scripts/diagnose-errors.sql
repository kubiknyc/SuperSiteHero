-- Diagnostic Script for Console Errors
-- Purpose: Verify database state and identify issues causing console errors
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CHECK STORAGE BUCKETS
-- =====================================================
SELECT
  'STORAGE BUCKETS' as check_type,
  id,
  name,
  public,
  file_size_limit,
  array_length(allowed_mime_types, 1) as mime_type_count,
  created_at
FROM storage.buckets
ORDER BY created_at;

-- Check if 'documents' bucket exists
SELECT
  'DOCUMENTS BUCKET CHECK' as check_type,
  CASE
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents')
    THEN 'EXISTS'
    ELSE 'MISSING - THIS IS THE PROBLEM!'
  END as status;

-- =====================================================
-- 2. CHECK RPC FUNCTIONS
-- =====================================================

-- Check if get_total_unread_count exists
SELECT
  'RPC FUNCTION: get_total_unread_count' as check_type,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE
    WHEN p.proname IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_total_unread_count';

-- Check if get_unread_message_count exists (dependency)
SELECT
  'RPC FUNCTION: get_unread_message_count' as check_type,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE
    WHEN p.proname IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_unread_message_count';

-- Check function permissions
SELECT
  'RPC FUNCTION PERMISSIONS' as check_type,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN ('get_total_unread_count', 'get_unread_message_count')
ORDER BY routine_name, grantee;

-- =====================================================
-- 3. CHECK TABLES AND COLUMNS
-- =====================================================

-- Check if conversation_participants table exists
SELECT
  'TABLE: conversation_participants' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'conversation_participants'
    )
    THEN 'EXISTS'
    ELSE 'MISSING'
  END as status;

-- Check conversation_participants columns
SELECT
  'COLUMNS: conversation_participants' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversation_participants'
ORDER BY ordinal_position;

-- Check if approval_requests table exists
SELECT
  'TABLE: approval_requests' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'approval_requests'
    )
    THEN 'EXISTS'
    ELSE 'MISSING'
  END as status;

-- Check approval_requests columns
SELECT
  'COLUMNS: approval_requests' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'approval_requests'
ORDER BY ordinal_position;

-- Check if users.full_name exists
SELECT
  'COLUMN: users.full_name' as check_type,
  column_name,
  data_type,
  is_nullable,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'full_name';

-- =====================================================
-- 4. CHECK RLS POLICIES
-- =====================================================

-- Check conversation_participants RLS policies
SELECT
  'RLS POLICIES: conversation_participants' as check_type,
  policyname,
  permissive,
  cmd,
  LEFT(qual::text, 100) as qual_preview
FROM pg_policies
WHERE tablename = 'conversation_participants'
ORDER BY policyname;

-- Check for RLS enabled on conversation_participants
SELECT
  'RLS ENABLED: conversation_participants' as check_type,
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'conversation_participants';

-- Check approval_requests RLS policies
SELECT
  'RLS POLICIES: approval_requests' as check_type,
  policyname,
  permissive,
  cmd,
  LEFT(qual::text, 100) as qual_preview
FROM pg_policies
WHERE tablename = 'approval_requests'
ORDER BY policyname;

-- =====================================================
-- 5. CHECK FOR DATA INTEGRITY ISSUES
-- =====================================================

-- Check for conversation_participants with invalid user_id
SELECT
  'DATA INTEGRITY: conversation_participants invalid users' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN 'OK'
    ELSE 'ISSUE FOUND - invalid user_id references'
  END as status
FROM conversation_participants cp
LEFT JOIN users u ON u.id = cp.user_id
WHERE u.id IS NULL;

-- Check for conversation_participants with invalid conversation_id
SELECT
  'DATA INTEGRITY: conversation_participants invalid conversations' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 0 THEN 'OK'
    ELSE 'ISSUE FOUND - invalid conversation_id references'
  END as status
FROM conversation_participants cp
LEFT JOIN conversations c ON c.id = cp.conversation_id
WHERE c.id IS NULL;

-- =====================================================
-- 6. CHECK MIGRATIONS STATUS
-- =====================================================

-- Check if migration tracking table exists
SELECT
  'MIGRATION TRACKING' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'supabase_migrations'
      AND table_name = 'schema_migrations'
    )
    THEN 'EXISTS'
    ELSE 'NOT FOUND'
  END as status;

-- List recent migrations (if table exists)
-- Uncomment if your setup has migration tracking:
-- SELECT
--   'RECENT MIGRATIONS' as check_type,
--   version,
--   name,
--   executed_at
-- FROM supabase_migrations.schema_migrations
-- WHERE version >= '029'
-- ORDER BY version DESC
-- LIMIT 10;

-- =====================================================
-- 7. TEST RPC FUNCTION CALLS
-- =====================================================

-- Try calling get_total_unread_count (will fail if function doesn't exist)
-- Replace 'YOUR_USER_ID' with an actual user UUID from your database
-- SELECT
--   'TEST: get_total_unread_count' as check_type,
--   get_total_unread_count('YOUR_USER_ID'::uuid) as result;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT
  '========================================' as separator,
  'DIAGNOSTIC SUMMARY' as title,
  '========================================' as separator2;

SELECT
  'Next Steps:' as instruction,
  '1. Check if documents bucket exists - should show EXISTS above' as step_1,
  '2. Check if RPC functions exist - should show EXISTS above' as step_2,
  '3. Check if tables exist and have correct columns' as step_3,
  '4. Check for data integrity issues - should show OK above' as step_4,
  '5. If issues found, run migration 055 or create bucket manually' as step_5;
