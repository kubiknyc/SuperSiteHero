-- Test Queries for Migration 022: Chat System
-- Run these queries to verify the migration was successful

-- =============================================
-- TEST 1: Verify Tables Created
-- =============================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name LIKE 'chat_%'
ORDER BY table_name;

-- Expected: 7 tables
-- chat_channel_members
-- chat_channels
-- chat_direct_message_channels
-- chat_message_reactions
-- chat_messages
-- chat_read_receipts
-- chat_typing_indicators

-- =============================================
-- TEST 2: Verify Indexes Created
-- =============================================

SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_chat_%'
ORDER BY tablename, indexname;

-- Expected: 15 indexes

-- =============================================
-- TEST 3: Verify RLS Enabled
-- =============================================

SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'chat_%'
ORDER BY tablename;

-- Expected: All tables should have rls_enabled = true

-- =============================================
-- TEST 4: Verify RLS Policies
-- =============================================

SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'chat_%'
ORDER BY tablename, policyname;

-- Expected: 14 policies across chat tables

-- =============================================
-- TEST 5: Verify Functions Created
-- =============================================

SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%chat%' OR routine_name LIKE '%channel%' OR routine_name LIKE '%message%'
ORDER BY routine_name;

-- Expected functions:
-- - create_company_general_channel
-- - create_project_channel
-- - sync_project_user_to_channel
-- - add_user_to_general_channel
-- - get_or_create_dm_channel
-- - search_messages
-- - get_message_reply_count

-- =============================================
-- TEST 6: Verify Triggers Created
-- =============================================

SELECT
  trigger_name,
  event_manipulation as event,
  event_object_table as table_name,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (trigger_name LIKE '%chat%' OR trigger_name LIKE '%channel%' OR trigger_name LIKE '%general%')
ORDER BY event_object_table, trigger_name;

-- Expected triggers:
-- - trigger_create_general_channel (on companies)
-- - trigger_create_project_channel (on projects)
-- - trigger_sync_project_users (on project_users)
-- - trigger_add_to_general (on users)
-- - update_chat_channels_updated_at (on chat_channels)

-- =============================================
-- TEST 7: Test Auto-Create #general Channel
-- (DESTRUCTIVE - Only run in development)
-- =============================================

-- Uncomment to test:
/*
BEGIN;

-- Create test company
INSERT INTO companies (name, slug)
VALUES ('Test Chat Company', 'test-chat-co-' || gen_random_uuid())
RETURNING id;

-- Verify #general channel was created
SELECT
  c.id as company_id,
  c.name as company_name,
  ch.id as channel_id,
  ch.name as channel_name,
  ch.channel_type,
  ch.metadata
FROM companies c
LEFT JOIN chat_channels ch ON ch.company_id = c.id AND ch.channel_type = 'general'
WHERE c.slug LIKE 'test-chat-co-%'
ORDER BY c.created_at DESC
LIMIT 1;

ROLLBACK; -- Don't actually create test data
*/

-- =============================================
-- TEST 8: Test Auto-Create Project Channel
-- (DESTRUCTIVE - Only run in development)
-- =============================================

-- Uncomment to test:
/*
BEGIN;

-- You need an existing company_id for this test
-- Replace <company_id> and <user_id> with real values

INSERT INTO projects (company_id, name, created_by)
VALUES ('<company_id>', 'Test Chat Project', '<user_id>')
RETURNING id;

-- Verify project channel was created
SELECT
  p.id as project_id,
  p.name as project_name,
  ch.id as channel_id,
  ch.name as channel_name,
  ch.channel_type,
  ch.metadata
FROM projects p
LEFT JOIN chat_channels ch ON ch.project_id = p.id AND ch.channel_type = 'project'
WHERE p.name = 'Test Chat Project'
ORDER BY p.created_at DESC
LIMIT 1;

ROLLBACK;
*/

-- =============================================
-- TEST 9: Test DM Channel Creation Function
-- =============================================

-- Uncomment to test:
/*
-- Replace <user1_id>, <user2_id>, and <company_id> with real UUIDs
SELECT get_or_create_dm_channel(
  '<user1_id>'::uuid,
  '<user2_id>'::uuid,
  '<company_id>'::uuid
) as dm_channel_id;

-- Verify DM channel exists
SELECT
  ch.*,
  dm.user1_id,
  dm.user2_id
FROM chat_channels ch
JOIN chat_direct_message_channels dm ON dm.channel_id = ch.id
WHERE ch.channel_type = 'direct'
ORDER BY ch.created_at DESC
LIMIT 1;
*/

-- =============================================
-- TEST 10: Test Message Search Function
-- =============================================

-- Uncomment to test (after you have some messages):
/*
-- Replace <company_id> with real UUID
SELECT
  id,
  content,
  created_at,
  rank
FROM search_messages('test query', '<company_id>'::uuid)
LIMIT 10;
*/

-- =============================================
-- TEST 11: Verify Foreign Key Constraints
-- =============================================

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE 'chat_%'
ORDER BY tc.table_name, kcu.column_name;

-- =============================================
-- TEST 12: Verify Unique Constraints
-- =============================================

SELECT
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE 'chat_%'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- =============================================
-- TEST 13: Check Column Types
-- =============================================

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'chat_%'
ORDER BY table_name, ordinal_position;

-- =============================================
-- SUMMARY QUERY
-- =============================================

SELECT
  'Tables' as object_type,
  COUNT(*)::text as count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'chat_%'

UNION ALL

SELECT
  'Indexes',
  COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_chat_%'

UNION ALL

SELECT
  'RLS Policies',
  COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'chat_%'

UNION ALL

SELECT
  'Functions',
  COUNT(*)::text
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%channel%' OR routine_name LIKE '%message%' OR routine_name = 'get_or_create_dm_channel')

UNION ALL

SELECT
  'Triggers',
  COUNT(*)::text
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (trigger_name LIKE '%chat%' OR trigger_name LIKE '%channel%' OR trigger_name LIKE '%general%');

-- Expected Summary:
-- Tables: 7
-- Indexes: 15
-- RLS Policies: 14
-- Functions: 7
-- Triggers: 5
