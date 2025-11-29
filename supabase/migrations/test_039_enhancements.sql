-- Test Queries for Migration 039: Enhanced Messaging System
-- Run these queries to verify the enhancements were applied successfully

-- =====================================================
-- TEST 1: Verify New Columns Added
-- =====================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversations'
  AND column_name IN ('metadata', 'company_id')
ORDER BY column_name;

-- Expected: 2 rows
-- metadata (jsonb)
-- company_id (uuid)

-- =====================================================
-- TEST 2: Verify New Tables Created
-- =====================================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('typing_indicators', 'message_read_receipts')
ORDER BY table_name;

-- Expected: 2 tables
-- message_read_receipts (4 columns)
-- typing_indicators (3 columns)

-- =====================================================
-- TEST 3: Verify Enum Value Added
-- =====================================================

SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'conversation_type'::regtype
ORDER BY enumlabel;

-- Expected: direct, general, group, project

-- =====================================================
-- TEST 4: Verify Indexes Created
-- =====================================================

SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%typing_indicators%' OR
    indexname LIKE '%message_read_receipts%' OR
    indexname LIKE 'idx_conversations_company_id' OR
    indexname LIKE 'idx_messages_content_search'
  )
ORDER BY tablename, indexname;

-- Expected: 6 indexes
-- idx_conversations_company_id
-- idx_message_read_receipts_message
-- idx_message_read_receipts_user
-- idx_messages_content_search
-- idx_typing_indicators_cleanup
-- idx_typing_indicators_conversation

-- =====================================================
-- TEST 5: Verify Functions Created
-- =====================================================

SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_company_general_conversation',
    'create_project_conversation',
    'sync_project_user_to_conversation',
    'add_user_to_general_conversation',
    'get_or_create_dm_conversation',
    'search_messages'
  )
ORDER BY routine_name;

-- Expected: 6 functions

-- =====================================================
-- TEST 6: Verify Triggers Created
-- =====================================================

SELECT
  trigger_name,
  event_manipulation as event,
  event_object_table as table_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_create_general_conversation',
    'trigger_create_project_conversation',
    'trigger_sync_project_users',
    'trigger_add_to_general_conversation'
  )
ORDER BY event_object_table, trigger_name;

-- Expected: 4 triggers
-- trigger_create_general_conversation (companies, INSERT)
-- trigger_create_project_conversation (projects, INSERT)
-- trigger_sync_project_users (project_users, INSERT/DELETE)
-- trigger_add_to_general_conversation (users, INSERT)

-- =====================================================
-- TEST 7: Verify RLS Policies
-- =====================================================

SELECT
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('typing_indicators', 'message_read_receipts')
ORDER BY tablename, policyname;

-- Expected: 4 policies
-- typing_indicators: 2 policies
-- message_read_receipts: 2 policies

-- =====================================================
-- TEST 8: Verify RLS Enabled
-- =====================================================

SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('typing_indicators', 'message_read_receipts')
ORDER BY tablename;

-- Expected: Both tables should have rls_enabled = true

-- =====================================================
-- TEST 9: Test Search Function
-- (Only run if you have messages)
-- =====================================================

-- Uncomment to test:
/*
-- Replace <user_id> with a real user ID
SELECT
  id,
  content,
  rank
FROM search_messages('test', '<user_id>'::uuid)
LIMIT 5;
*/

-- =====================================================
-- TEST 10: Test DM Helper Function
-- =====================================================

-- Uncomment to test:
/*
-- Replace <user1_id>, <user2_id>, <company_id> with real UUIDs
SELECT get_or_create_dm_conversation(
  '<user1_id>'::uuid,
  '<user2_id>'::uuid,
  '<company_id>'::uuid
) as dm_conversation_id;

-- Verify DM conversation was created/found
SELECT
  id,
  type,
  company_id,
  created_at,
  (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) as participant_count
FROM conversations c
WHERE type = 'direct'
  AND company_id = '<company_id>'::uuid
ORDER BY created_at DESC
LIMIT 1;
*/

-- =====================================================
-- TEST 11: Test Auto-Create #general
-- (DESTRUCTIVE - Only run in development)
-- =====================================================

-- Uncomment to test:
/*
BEGIN;

-- Create test company
INSERT INTO companies (name, slug)
VALUES ('Test Messaging Company', 'test-msg-co-' || gen_random_uuid())
RETURNING id;

-- Create a test user in that company
INSERT INTO users (id, company_id, email, role)
VALUES (
  gen_random_uuid(),
  '<company_id_from_above>',
  'test@example.com',
  'admin'
);

-- Verify #general conversation was created
SELECT
  c.id as company_id,
  c.name as company_name,
  conv.id as conversation_id,
  conv.name as conversation_name,
  conv.type,
  conv.metadata
FROM companies c
LEFT JOIN conversations conv ON conv.company_id = c.id AND conv.type = 'general'
WHERE c.slug LIKE 'test-msg-co-%'
ORDER BY c.created_at DESC
LIMIT 1;

ROLLBACK; -- Don't actually create test data
*/

-- =====================================================
-- TEST 12: Test Auto-Create Project Conversation
-- (DESTRUCTIVE - Only run in development)
-- =====================================================

-- Uncomment to test:
/*
BEGIN;

-- Replace <company_id> and <user_id> with real values
INSERT INTO projects (company_id, name, created_by)
VALUES ('<company_id>', 'Test Messaging Project', '<user_id>')
RETURNING id;

-- Verify project conversation was created
SELECT
  p.id as project_id,
  p.name as project_name,
  c.id as conversation_id,
  c.name as conversation_name,
  c.type,
  c.metadata
FROM projects p
LEFT JOIN conversations c ON c.project_id = p.id AND c.type = 'project'
WHERE p.name = 'Test Messaging Project'
ORDER BY p.created_at DESC
LIMIT 1;

ROLLBACK;
*/

-- =====================================================
-- SUMMARY QUERY
-- =====================================================

SELECT
  'New Columns' as enhancement,
  COUNT(*)::text as count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversations'
  AND column_name IN ('metadata', 'company_id')

UNION ALL

SELECT
  'New Tables',
  COUNT(*)::text
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('typing_indicators', 'message_read_receipts')

UNION ALL

SELECT
  'New Indexes',
  COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%typing_indicators%' OR
    indexname LIKE '%message_read_receipts%' OR
    indexname = 'idx_conversations_company_id' OR
    indexname = 'idx_messages_content_search'
  )

UNION ALL

SELECT
  'New Functions',
  COUNT(*)::text
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_company_general_conversation',
    'create_project_conversation',
    'sync_project_user_to_conversation',
    'add_user_to_general_conversation',
    'get_or_create_dm_conversation',
    'search_messages'
  )

UNION ALL

SELECT
  'New Triggers',
  COUNT(*)::text
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_create_general_conversation',
    'trigger_create_project_conversation',
    'trigger_sync_project_users',
    'trigger_add_to_general_conversation'
  )

UNION ALL

SELECT
  'New RLS Policies',
  COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('typing_indicators', 'message_read_receipts');

-- Expected Summary:
-- New Columns: 2
-- New Tables: 2
-- New Indexes: 6
-- New Functions: 6
-- New Triggers: 4
-- New RLS Policies: 4
