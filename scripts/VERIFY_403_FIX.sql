-- =============================================
-- VERIFICATION SCRIPT: 403 Fix
-- =============================================
-- Run this AFTER applying COMPLETE_FIX_403_ERROR.sql
-- This confirms the fix worked correctly
-- =============================================

\echo ''
\echo '=========================================='
\echo 'VERIFICATION: 403 FIX'
\echo '=========================================='
\echo ''

-- =============================================
-- CHECK 1: All Users Have Company ID
-- =============================================

\echo 'CHECK 1: Users with company_id'
\echo ''

SELECT
  COUNT(*) FILTER (WHERE company_id IS NOT NULL) as users_with_company,
  COUNT(*) FILTER (WHERE company_id IS NULL) as users_without_company,
  COUNT(*) as total_users
FROM users;

\echo ''

DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM users WHERE company_id IS NULL;

  IF null_count = 0 THEN
    RAISE NOTICE '✅ PASS: All users have company_id assigned';
  ELSE
    RAISE NOTICE '❌ FAIL: % users still have NULL company_id', null_count;
  END IF;
END $$;

\echo ''

-- =============================================
-- CHECK 2: Helper Functions Exist
-- =============================================

\echo 'CHECK 2: Helper Functions'
\echo ''

SELECT
  routine_name,
  security_type,
  routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_company_id', 'get_user_role')
ORDER BY routine_name;

\echo ''

DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_company_id', 'get_user_role')
    AND security_type = 'DEFINER';

  IF function_count = 2 THEN
    RAISE NOTICE '✅ PASS: Both helper functions exist with SECURITY DEFINER';
  ELSE
    RAISE NOTICE '❌ FAIL: Expected 2 helper functions, found %', function_count;
  END IF;
END $$;

\echo ''

-- =============================================
-- CHECK 3: Projects INSERT Policy
-- =============================================

\echo 'CHECK 3: Projects INSERT Policy'
\echo ''

SELECT
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT';

\echo ''

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'projects'
    AND cmd = 'INSERT'
    AND policyname = 'Authenticated users can insert projects in their company';

  IF policy_count = 1 THEN
    RAISE NOTICE '✅ PASS: Correct INSERT policy exists';
  ELSIF policy_count = 0 THEN
    RAISE NOTICE '❌ FAIL: INSERT policy not found';
  ELSE
    RAISE NOTICE '⚠️  WARNING: Multiple INSERT policies found (%)! Should only be 1', policy_count;
  END IF;
END $$;

\echo ''

-- =============================================
-- CHECK 4: Users SELECT Policy
-- =============================================

\echo 'CHECK 4: Users SELECT Policy'
\echo ''

SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'users'
  AND cmd = 'SELECT';

\echo ''

DO $$
DECLARE
  policy_count INTEGER;
  uses_helper BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'users'
    AND cmd = 'SELECT'
    AND policyname = 'Users can view company users';

  -- Check if policy uses helper function (to avoid recursion)
  SELECT COUNT(*) > 0 INTO uses_helper
  FROM pg_policies
  WHERE tablename = 'users'
    AND cmd = 'SELECT'
    AND qual ILIKE '%get_user_company_id%';

  IF policy_count = 1 AND uses_helper THEN
    RAISE NOTICE '✅ PASS: Correct SELECT policy exists and uses helper function';
  ELSIF policy_count = 0 THEN
    RAISE NOTICE '❌ FAIL: SELECT policy not found';
  ELSIF NOT uses_helper THEN
    RAISE NOTICE '⚠️  WARNING: SELECT policy exists but does not use helper function (may cause recursion)';
  ELSE
    RAISE NOTICE '⚠️  WARNING: Multiple SELECT policies found (%)! Should only be 1', policy_count;
  END IF;
END $$;

\echo ''

-- =============================================
-- CHECK 5: RLS Enabled
-- =============================================

\echo 'CHECK 5: RLS Enabled'
\echo ''

SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'users');

\echo ''

DO $$
DECLARE
  projects_rls BOOLEAN;
  users_rls BOOLEAN;
BEGIN
  SELECT rowsecurity INTO projects_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'projects';

  SELECT rowsecurity INTO users_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'users';

  IF projects_rls AND users_rls THEN
    RAISE NOTICE '✅ PASS: RLS enabled on both projects and users tables';
  ELSE
    IF NOT projects_rls THEN
      RAISE NOTICE '❌ FAIL: RLS not enabled on projects table';
    END IF;
    IF NOT users_rls THEN
      RAISE NOTICE '❌ FAIL: RLS not enabled on users table';
    END IF;
  END IF;
END $$;

\echo ''

-- =============================================
-- CHECK 6: Simulate Project Insert
-- =============================================

\echo 'CHECK 6: Simulate Project Insert Logic'
\echo ''

DO $$
DECLARE
  user_record RECORD;
  test_company_id UUID;
  will_pass BOOLEAN;
  total_users INTEGER;
  passing_users INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO total_users FROM users;

  RAISE NOTICE 'Testing INSERT policy logic for all users:';
  RAISE NOTICE '';

  FOR user_record IN
    SELECT id, email, company_id, role, is_active
    FROM users
    ORDER BY created_at DESC
  LOOP
    test_company_id := user_record.company_id;

    -- Simulate policy: auth.uid() IS NOT NULL AND company_id IS NOT NULL AND company_id = user.company_id
    will_pass := (
      user_record.id IS NOT NULL AND
      test_company_id IS NOT NULL AND
      test_company_id = user_record.company_id
    );

    IF will_pass THEN
      passing_users := passing_users + 1;
      RAISE NOTICE '✅ % - CAN insert projects', user_record.email;
    ELSE
      RAISE NOTICE '❌ % - CANNOT insert projects (company_id: %)', user_record.email, test_company_id;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Summary: % / % users can insert projects', passing_users, total_users;

  IF passing_users = total_users THEN
    RAISE NOTICE '✅ PASS: All users can insert projects';
  ELSE
    RAISE NOTICE '❌ FAIL: % users cannot insert projects', (total_users - passing_users);
  END IF;
END $$;

\echo ''

-- =============================================
-- OVERALL RESULT
-- =============================================

\echo '=========================================='
\echo 'OVERALL VERIFICATION RESULT'
\echo '=========================================='
\echo ''

DO $$
DECLARE
  null_company_count INTEGER;
  function_count INTEGER;
  insert_policy_count INTEGER;
  select_policy_count INTEGER;
  projects_rls BOOLEAN;
  users_rls BOOLEAN;
  all_checks_passed BOOLEAN := true;
BEGIN
  -- Gather all check results
  SELECT COUNT(*) INTO null_company_count FROM users WHERE company_id IS NULL;

  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_company_id', 'get_user_role')
    AND security_type = 'DEFINER';

  SELECT COUNT(*) INTO insert_policy_count
  FROM pg_policies
  WHERE tablename = 'projects'
    AND cmd = 'INSERT'
    AND policyname = 'Authenticated users can insert projects in their company';

  SELECT COUNT(*) INTO select_policy_count
  FROM pg_policies
  WHERE tablename = 'users'
    AND cmd = 'SELECT'
    AND policyname = 'Users can view company users';

  SELECT rowsecurity INTO projects_rls
  FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects';

  SELECT rowsecurity INTO users_rls
  FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users';

  -- Evaluate overall result
  IF null_company_count > 0 THEN all_checks_passed := false; END IF;
  IF function_count <> 2 THEN all_checks_passed := false; END IF;
  IF insert_policy_count <> 1 THEN all_checks_passed := false; END IF;
  IF select_policy_count <> 1 THEN all_checks_passed := false; END IF;
  IF NOT projects_rls THEN all_checks_passed := false; END IF;
  IF NOT users_rls THEN all_checks_passed := false; END IF;

  RAISE NOTICE 'Check Results:';
  RAISE NOTICE '  - Users with NULL company_id: % (expected 0)', null_company_count;
  RAISE NOTICE '  - Helper functions: % (expected 2)', function_count;
  RAISE NOTICE '  - Projects INSERT policy: % (expected 1)', insert_policy_count;
  RAISE NOTICE '  - Users SELECT policy: % (expected 1)', select_policy_count;
  RAISE NOTICE '  - Projects RLS enabled: % (expected true)', projects_rls;
  RAISE NOTICE '  - Users RLS enabled: % (expected true)', users_rls;
  RAISE NOTICE '';

  IF all_checks_passed THEN
    RAISE NOTICE '✅✅✅ ALL CHECKS PASSED ✅✅✅';
    RAISE NOTICE '';
    RAISE NOTICE 'Database configuration is correct!';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Users must LOG OUT of the application';
    RAISE NOTICE '2. Clear browser cache (DevTools > Application > Local Storage)';
    RAISE NOTICE '3. LOG BACK IN';
    RAISE NOTICE '4. Try creating a project - should work now!';
  ELSE
    RAISE NOTICE '❌❌❌ SOME CHECKS FAILED ❌❌❌';
    RAISE NOTICE '';
    RAISE NOTICE 'Review the check results above.';
    RAISE NOTICE 'You may need to re-run COMPLETE_FIX_403_ERROR.sql';
  END IF;
END $$;

\echo ''
\echo '=========================================='
\echo 'END OF VERIFICATION'
\echo '=========================================='
\echo ''
