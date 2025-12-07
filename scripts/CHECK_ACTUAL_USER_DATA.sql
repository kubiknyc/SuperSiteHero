-- Direct check of user data (no auth.uid() needed)
-- This works in SQL Editor

-- 1. Show ALL users and their company_id status
SELECT
  id,
  email,
  company_id,
  role,
  is_active,
  created_at,
  CASE
    WHEN company_id IS NULL THEN '❌ NULL - NEEDS FIX'
    ELSE '✅ OK'
  END as company_status
FROM users
ORDER BY created_at DESC;

-- 2. Show all companies
SELECT
  id,
  name,
  slug,
  created_at
FROM companies
ORDER BY created_at;

-- 3. Count users with NULL company_id
SELECT
  COUNT(*) FILTER (WHERE company_id IS NULL) as users_with_null_company,
  COUNT(*) FILTER (WHERE company_id IS NOT NULL) as users_with_company,
  COUNT(*) as total_users
FROM users;

-- 4. Show current INSERT policies on projects
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check::text as policy_check
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 5. Check if helper functions exist
SELECT
  routine_name,
  routine_schema,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_company_id', 'get_user_role')
ORDER BY routine_name;
