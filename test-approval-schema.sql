-- Test script to verify approval system schema

-- Check if approval_status type exists
SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'approval_status'
ORDER BY e.enumsortorder;

-- Check if approval columns exist in users table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND (
    column_name LIKE '%approval%'
    OR column_name LIKE '%approved%'
    OR column_name LIKE '%rejected%'
  )
ORDER BY ordinal_position;

-- Check if is_active_user function exists
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_active_user';

-- Test: Check if trigger is updated correctly
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
