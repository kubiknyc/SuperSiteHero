-- =============================================
-- VERIFICATION QUERIES FOR MIGRATIONS 046 & 047
-- Run this in Supabase SQL Editor to verify the migration worked
-- =============================================

-- 1. Check helper functions in PUBLIC schema
-- Expected: 2 rows (get_user_company_id, get_user_role) with security_type = DEFINER
SELECT
  routine_name,
  routine_schema,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_company_id', 'get_user_role')
ORDER BY routine_name;

-- 2. Check projects INSERT policy
-- Expected: 1 row with policyname = "Authenticated users can insert projects in their company"
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check::text as with_check
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 3. Check users SELECT policy
-- Expected: 1 row with policyname = "Users can view company users"
-- The qual should reference public.get_user_company_id()
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'users'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 4. Test the helper functions work
-- Expected: Should return your current user_id, company_id, and role
SELECT
  auth.uid() as current_user_id,
  public.get_user_company_id() as user_company_id,
  public.get_user_role() as user_role;

-- =============================================
-- EXPECTED RESULTS SUMMARY
-- =============================================
-- Query 1: 2 functions (get_user_company_id, get_user_role) in public schema
-- Query 2: Policy "Authenticated users can insert projects in their company"
-- Query 3: Policy "Users can view company users" using public.get_user_company_id()
-- Query 4: Your user ID, company ID, and role
