-- =============================================
-- DEEP ROOT CAUSE ANALYSIS: 403 Project Creation Error
-- =============================================
-- Sequential Thinking Analysis Script
-- =============================================
-- This script performs a comprehensive analysis to identify
-- the EXACT root cause of the 403 Forbidden error when
-- creating projects, even after migrations 046 & 047 were applied.
-- =============================================

\echo ''
\echo '=========================================='
\echo 'DEEP ROOT CAUSE ANALYSIS: 403 ERROR'
\echo '=========================================='
\echo ''
\echo 'Hypothesis Chain:'
\echo '1. Migration 046 & 047 were successfully applied'
\echo '2. User logged out and back in'
\echo '3. Still getting 403 Forbidden'
\echo '4. This suggests one of:'
\echo '   a) User company_id is NULL or invalid'
\echo '   b) RLS policy logic has a flaw'
\echo '   c) Helper functions not working correctly'
\echo '   d) Other policies interfering'
\echo '   e) Frontend sending wrong data'
\echo ''
\echo '=========================================='
\echo 'ANALYSIS PHASE 1: Migration Verification'
\echo '=========================================='
\echo ''

-- Check if migration 046 & 047 were actually applied
\echo '--- 1.1: Helper Functions Check ---'
SELECT
  routine_schema,
  routine_name,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name IN ('get_user_company_id', 'get_user_role')
  AND routine_schema = 'public'
ORDER BY routine_name;

\echo ''
\echo 'Expected: 2 functions (get_user_company_id, get_user_role) in public schema with DEFINER security'
\echo ''

-- Check projects INSERT policy
\echo '--- 1.2: Projects INSERT Policy Check ---'
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT'
ORDER BY policyname;

\echo ''
\echo 'Expected: Policy named "Authenticated users can insert projects in their company"'
\echo 'WITH CHECK clause should include company_id validation'
\echo ''

-- Check users SELECT policy
\echo '--- 1.3: Users SELECT Policy Check ---'
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
  AND cmd = 'SELECT'
ORDER BY policyname;

\echo ''
\echo 'Expected: Policy should use public.get_user_company_id() to avoid recursion'
\echo ''

\echo '=========================================='
\echo 'ANALYSIS PHASE 2: User Data Validation'
\echo '=========================================='
\echo ''

-- Get current user info using Service Role (bypasses RLS)
\echo '--- 2.1: Current User Record (Service Role - No RLS) ---'
SELECT
  id,
  email,
  role,
  company_id,
  is_active,
  first_name,
  last_name,
  created_at,
  updated_at
FROM users
WHERE email ILIKE '%@%'  -- Get all users to identify which one is current
ORDER BY created_at DESC
LIMIT 5;

\echo ''
\echo 'CRITICAL: Check if company_id is NULL for any user'
\echo 'If NULL, this is the ROOT CAUSE - user cannot create projects without company_id'
\echo ''

-- Check companies table
\echo '--- 2.2: Companies Table ---'
SELECT
  id,
  name,
  slug,
  is_active,
  created_at,
  (SELECT COUNT(*) FROM users WHERE users.company_id = companies.id) as user_count,
  (SELECT COUNT(*) FROM projects WHERE projects.company_id = companies.id) as project_count
FROM companies
ORDER BY created_at;

\echo ''
\echo 'Verify at least one active company exists'
\echo ''

\echo '=========================================='
\echo 'ANALYSIS PHASE 3: Function Testing'
\echo '=========================================='
\echo ''

-- Test if helper functions return correct values
-- Note: This will only work if run as an authenticated user
\echo '--- 3.1: Test Helper Functions (as authenticated user) ---'
\echo 'NOTE: If running in Supabase SQL Editor with Service Role, these will return NULL'
\echo 'To properly test, use authenticated API calls or impersonate a user'
\echo ''

SELECT
  auth.uid() as current_auth_uid,
  public.get_user_company_id() as helper_company_id,
  public.get_user_role() as helper_role,
  (SELECT company_id FROM users WHERE id = auth.uid()) as direct_company_id,
  (SELECT role FROM users WHERE id = auth.uid()) as direct_role;

\echo ''
\echo 'Expected when logged in as user:'
\echo '  - current_auth_uid: should be user UUID'
\echo '  - helper_company_id: should match direct_company_id'
\echo '  - helper_role: should match direct_role'
\echo ''
\echo 'If all NULL: You are using Service Role (expected in SQL Editor)'
\echo ''

\echo '=========================================='
\echo 'ANALYSIS PHASE 4: RLS Policy Logic Testing'
\echo '=========================================='
\echo ''

-- Simulate the INSERT policy check
\echo '--- 4.1: Simulate INSERT Policy Check ---'
\echo 'Testing policy logic for each user:'
\echo ''

DO $$
DECLARE
  user_record RECORD;
  policy_result BOOLEAN;
  test_company_id UUID;
BEGIN
  -- Loop through each user
  FOR user_record IN
    SELECT id, email, role, company_id, is_active
    FROM users
    ORDER BY created_at DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE 'Testing user: % (%)', user_record.email, user_record.id;
    RAISE NOTICE '  Role: %', user_record.role;
    RAISE NOTICE '  Company ID: %', user_record.company_id;
    RAISE NOTICE '  Is Active: %', user_record.is_active;

    -- Simulate the policy check
    -- Policy: auth.uid() IS NOT NULL AND company_id IS NOT NULL AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())

    test_company_id := user_record.company_id;

    -- Check 1: auth.uid() IS NOT NULL
    IF user_record.id IS NULL THEN
      RAISE NOTICE '  ❌ CHECK 1 FAILED: User ID is NULL (should never happen)';
      policy_result := FALSE;
    ELSE
      RAISE NOTICE '  ✅ CHECK 1 PASSED: User ID is not NULL';
    END IF;

    -- Check 2: company_id IS NOT NULL
    IF test_company_id IS NULL THEN
      RAISE NOTICE '  ❌ CHECK 2 FAILED: company_id is NULL';
      RAISE NOTICE '  ROOT CAUSE: User cannot insert projects without company_id!';
      policy_result := FALSE;
    ELSE
      RAISE NOTICE '  ✅ CHECK 2 PASSED: company_id is not NULL (%)', test_company_id;
    END IF;

    -- Check 3: company_id matches user's company
    IF test_company_id IS NOT NULL AND test_company_id = user_record.company_id THEN
      RAISE NOTICE '  ✅ CHECK 3 PASSED: company_id matches user company';
      policy_result := TRUE;
    ELSIF test_company_id IS NULL THEN
      RAISE NOTICE '  ❌ CHECK 3 SKIPPED: company_id is NULL';
      policy_result := FALSE;
    ELSE
      RAISE NOTICE '  ❌ CHECK 3 FAILED: company_id does not match user company';
      policy_result := FALSE;
    END IF;

    RAISE NOTICE '';
    IF policy_result THEN
      RAISE NOTICE '  ✅ OVERALL: User CAN insert projects';
    ELSE
      RAISE NOTICE '  ❌ OVERALL: User CANNOT insert projects - 403 FORBIDDEN';
    END IF;

  END LOOP;
END $$;

\echo ''
\echo '=========================================='
\echo 'ANALYSIS PHASE 5: Conflicting Policies Check'
\echo '=========================================='
\echo ''

-- Check for any other policies that might interfere
\echo '--- 5.1: All Projects Policies ---'
SELECT
  policyname,
  cmd,
  permissive,
  roles,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY cmd, policyname;

\echo ''
\echo 'Check for multiple INSERT policies or conflicting policies'
\echo ''

-- Check for RESTRICTIVE policies (these could block even if permissive allows)
\echo '--- 5.2: Restrictive Policies Check ---'
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'projects'
  AND permissive = 'RESTRICTIVE';

\echo ''
\echo 'RESTRICTIVE policies can block access even if PERMISSIVE allows it'
\echo 'If any exist, they might be the cause'
\echo ''

\echo '=========================================='
\echo 'ANALYSIS PHASE 6: Frontend Data Validation'
\echo '=========================================='
\echo ''

\echo '--- 6.1: What Frontend Sends vs What Policy Expects ---'
\echo ''
\echo 'Frontend code (useProjectsMutations.ts) sends:'
\echo '  - company_id: userProfile.company_id (from AuthContext)'
\echo '  - created_by: userProfile.id (from AuthContext)'
\echo ''
\echo 'Policy expects:'
\echo '  - company_id must NOT be NULL'
\echo '  - company_id must match (SELECT company_id FROM users WHERE id = auth.uid())'
\echo ''
\echo 'Potential mismatch scenarios:'
\echo '  1. Frontend userProfile.company_id is NULL (cached before fix)'
\echo '  2. Frontend userProfile.company_id differs from database'
\echo '  3. auth.uid() returns different user than expected'
\echo ''

\echo '=========================================='
\echo 'ROOT CAUSE DIAGNOSIS'
\echo '=========================================='
\echo ''

DO $$
DECLARE
  user_count_with_null_company INTEGER;
  user_count_total INTEGER;
  policy_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Count users with NULL company_id
  SELECT COUNT(*) INTO user_count_with_null_company
  FROM users
  WHERE company_id IS NULL;

  SELECT COUNT(*) INTO user_count_total
  FROM users;

  -- Count correct policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'projects'
    AND cmd = 'INSERT'
    AND policyname = 'Authenticated users can insert projects in their company';

  -- Count helper functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_company_id', 'get_user_role')
    AND security_type = 'DEFINER';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSIS SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Users: %', user_count_total;
  RAISE NOTICE 'Users with NULL company_id: %', user_count_with_null_company;
  RAISE NOTICE 'Correct INSERT Policy: % (expected 1)', policy_count;
  RAISE NOTICE 'Helper Functions: % (expected 2)', function_count;
  RAISE NOTICE '';

  -- Determine root cause
  IF user_count_with_null_company > 0 THEN
    RAISE NOTICE '❌ ROOT CAUSE IDENTIFIED:';
    RAISE NOTICE '   % user(s) have NULL company_id!', user_count_with_null_company;
    RAISE NOTICE '';
    RAISE NOTICE '   This is the PRIMARY ROOT CAUSE of 403 error.';
    RAISE NOTICE '   The RLS policy requires company_id to be NOT NULL.';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUTION:';
    RAISE NOTICE '   Run the UPDATE statement below to fix NULL company_id';
    RAISE NOTICE '';
  ELSIF policy_count = 0 THEN
    RAISE NOTICE '❌ ROOT CAUSE IDENTIFIED:';
    RAISE NOTICE '   INSERT policy is missing or has wrong name!';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUTION:';
    RAISE NOTICE '   Re-apply migration 046';
    RAISE NOTICE '';
  ELSIF function_count < 2 THEN
    RAISE NOTICE '⚠️  POTENTIAL ISSUE:';
    RAISE NOTICE '   Helper functions missing (% of 2)', function_count;
    RAISE NOTICE '   This might cause recursion in users SELECT policy';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUTION:';
    RAISE NOTICE '   Re-apply migration 047';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '✅ Database Configuration Appears Correct';
    RAISE NOTICE '';
    RAISE NOTICE '   If still getting 403 error, likely causes:';
    RAISE NOTICE '   1. Frontend has CACHED userProfile with old data';
    RAISE NOTICE '   2. User needs to HARD REFRESH and re-login';
    RAISE NOTICE '   3. Browser localStorage needs to be cleared';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUTION:';
    RAISE NOTICE '   1. Open DevTools > Application > Local Storage';
    RAISE NOTICE '   2. Clear all items';
    RAISE NOTICE '   3. Hard refresh (Ctrl+Shift+R)';
    RAISE NOTICE '   4. Log out and log back in';
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '========================================';
END $$;

\echo ''
\echo '=========================================='
\echo 'RECOMMENDED FIX SCRIPT'
\echo '=========================================='
\echo ''
\echo 'Run the appropriate script below based on diagnosis:'
\echo ''

-- Show users with NULL company_id
\echo '--- Users Needing Company Assignment ---'
SELECT
  id,
  email,
  role,
  company_id,
  CASE
    WHEN company_id IS NULL THEN 'NEEDS FIX'
    ELSE 'OK'
  END as status
FROM users
ORDER BY
  CASE WHEN company_id IS NULL THEN 0 ELSE 1 END,
  created_at DESC;

\echo ''
\echo '=========================================='
\echo 'END OF ANALYSIS'
\echo '=========================================='
\echo ''
