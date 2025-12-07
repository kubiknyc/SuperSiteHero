-- Check ALL policies on projects table to find conflicts

-- 1. Show ALL policies on projects (not just INSERT)
SELECT
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause,
  permissive
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY cmd, policyname;

-- 2. Count INSERT policies (should be exactly 1)
SELECT
  COUNT(*) as insert_policy_count,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT';

-- 3. Show ALL policies on users table
SELECT
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
