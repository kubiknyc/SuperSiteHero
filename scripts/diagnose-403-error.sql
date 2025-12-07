-- =============================================
-- Diagnostic Script: 403 Project Creation Error
-- =============================================
-- This script checks all possible causes of the 403 error
-- Run in Supabase SQL Editor and share the complete output
-- =============================================

-- IMPORTANT: Replace 'your-email@example.com' with your actual email
\set user_email 'your-email@example.com'

-- =============================================
-- SECTION 1: Auth User Check
-- =============================================
\echo '========================================='
\echo 'SECTION 1: Auth User Check'
\echo '========================================='

SELECT
  'Auth User' as check_type,
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  last_sign_in_at,
  created_at
FROM auth.users
WHERE email = :'user_email';

-- If this returns nothing, the user doesn't exist in Supabase Auth
-- Action: Sign up first

-- =============================================
-- SECTION 2: Users Table Check
-- =============================================
\echo ''
\echo '========================================='
\echo 'SECTION 2: Users Table Check'
\echo '========================================='

SELECT
  'User Profile' as check_type,
  u.id,
  u.email,
  u.role,
  u.company_id,
  u.is_active,
  u.first_name,
  u.last_name,
  u.created_at,
  u.updated_at,
  CASE
    WHEN u.role IN ('superintendent', 'project_manager', 'owner', 'admin')
    THEN '✓ Role allows project creation'
    ELSE '✗ Role does NOT allow project creation (with restrictive policy)'
  END as role_status,
  CASE
    WHEN u.company_id IS NOT NULL
    THEN '✓ Company assigned'
    ELSE '✗ No company assigned'
  END as company_status,
  CASE
    WHEN u.is_active
    THEN '✓ Account active'
    ELSE '✗ Account inactive'
  END as active_status
FROM users u
WHERE u.email = :'user_email';

-- If this returns nothing, user record doesn't exist in users table
-- Action: Run migration 044 or manually insert user record

-- =============================================
-- SECTION 3: Company Check
-- =============================================
\echo ''
\echo '========================================='
\echo 'SECTION 3: Company Check'
\echo '========================================='

SELECT
  'Company' as check_type,
  c.id,
  c.name,
  c.slug,
  c.email,
  c.subscription_tier,
  c.is_active,
  c.created_at
FROM companies c
WHERE c.id = (
  SELECT company_id FROM users WHERE email = :'user_email'
);

-- If this returns nothing, the company doesn't exist
-- Action: Create a company first

-- =============================================
-- SECTION 4: RLS Policy Check
-- =============================================
\echo ''
\echo '========================================='
\echo 'SECTION 4: RLS Policy Check (Projects INSERT)'
\echo '========================================='

SELECT
  'RLS Policy' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  CASE
    WHEN with_check::text LIKE '%superintendent%project_manager%owner%admin%'
    THEN 'RESTRICTIVE (requires specific roles)'
    WHEN with_check::text LIKE '%auth.uid() IS NOT NULL%'
    THEN 'PERMISSIVE (any authenticated user)'
    ELSE 'UNKNOWN'
  END as policy_type,
  with_check::text as policy_logic
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'projects'
AND cmd = 'INSERT';

-- Expected:
-- - If restrictive: policyname = "Authorized users can create projects"
-- - If permissive: policyname = "Authenticated users can create projects in their company"

-- =============================================
-- SECTION 5: Test Insert (Dry Run)
-- =============================================
\echo ''
\echo '========================================='
\echo 'SECTION 5: Test Insert Simulation'
\echo '========================================='

-- This simulates the INSERT without actually doing it
SELECT
  'Insert Test' as check_type,
  u.id as user_id,
  u.email,
  u.role,
  u.company_id,
  CASE
    WHEN u.id IS NULL
    THEN '✗ User not found'
    WHEN u.company_id IS NULL
    THEN '✗ No company assigned'
    WHEN u.role NOT IN ('superintendent', 'project_manager', 'owner', 'admin')
    THEN '✗ Role not authorized (if using restrictive policy)'
    ELSE '✓ Should be able to insert'
  END as can_insert,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND cmd = 'INSERT'
      AND with_check::text LIKE '%superintendent%project_manager%owner%admin%'
    )
    THEN 'RESTRICTIVE policy active'
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND cmd = 'INSERT'
      AND with_check::text LIKE '%auth.uid() IS NOT NULL%'
    )
    THEN 'PERMISSIVE policy active'
    ELSE 'NO INSERT policy found'
  END as policy_status
FROM users u
WHERE u.email = :'user_email';

-- =============================================
-- SECTION 6: All Companies (for reference)
-- =============================================
\echo ''
\echo '========================================='
\echo 'SECTION 6: All Companies (for reference)'
\echo '========================================='

SELECT
  'All Companies' as check_type,
  id,
  name,
  slug,
  is_active,
  (SELECT COUNT(*) FROM users WHERE company_id = companies.id) as user_count,
  (SELECT COUNT(*) FROM projects WHERE company_id = companies.id) as project_count
FROM companies
ORDER BY created_at DESC
LIMIT 5;

-- =============================================
-- SECTION 7: Recent Auth Activity
-- =============================================
\echo ''
\echo '========================================='
\echo 'SECTION 7: Recent Auth Activity'
\echo '========================================='

SELECT
  'Auth Activity' as check_type,
  email,
  last_sign_in_at,
  confirmation_sent_at,
  email_confirmed_at IS NOT NULL as email_confirmed,
  banned_until,
  CASE
    WHEN banned_until IS NOT NULL AND banned_until > NOW()
    THEN '✗ Account is banned'
    WHEN email_confirmed_at IS NULL
    THEN '✗ Email not confirmed'
    ELSE '✓ Auth status OK'
  END as auth_status
FROM auth.users
WHERE email = :'user_email';

-- =============================================
-- DIAGNOSTIC SUMMARY
-- =============================================
\echo ''
\echo '========================================='
\echo 'DIAGNOSTIC SUMMARY'
\echo '========================================='
\echo ''
\echo 'Check these results:'
\echo ''
\echo '1. Auth User: Must exist with confirmed email'
\echo '2. User Profile: Must have role + company_id + is_active=true'
\echo '3. Company: Must exist and be active'
\echo '4. RLS Policy: Check if RESTRICTIVE or PERMISSIVE'
\echo '5. Insert Test: Should show "Should be able to insert"'
\echo ''
\echo 'Common Issues:'
\echo '  - No user record: Run migration 044'
\echo '  - Wrong role: UPDATE users SET role=superintendent'
\echo '  - No company: INSERT INTO companies first'
\echo '  - Restrictive policy + wrong role: Apply migration 018'
\echo ''
\echo '========================================='
\echo 'RECOMMENDED FIX'
\echo '========================================='
\echo ''
\echo 'If policy is RESTRICTIVE and you have wrong role:'
\echo '  → Apply migration 018 (recommended)'
\echo '  → OR update your role to superintendent/admin'
\echo ''
\echo 'If policy is already PERMISSIVE:'
\echo '  → Check that company_id is not NULL'
\echo '  → Check that is_active = true'
\echo '  → Log out and log back in'
\echo ''
\echo '========================================='

-- =============================================
-- OPTIONAL: Actual Insert Test (COMMENTED OUT)
-- =============================================
-- Uncomment this to test if you can actually insert
-- WARNING: This will create a real project that you'll need to delete

/*
DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_project_id UUID;
BEGIN
  -- Get user info
  SELECT id, company_id INTO v_user_id, v_company_id
  FROM users
  WHERE email = :'user_email';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'User has no company_id';
  END IF;

  -- Attempt insert
  BEGIN
    INSERT INTO projects (
      name,
      company_id,
      status,
      features_enabled,
      weather_units
    ) VALUES (
      'TEST PROJECT - DELETE ME',
      v_company_id,
      'planning',
      '{"daily_reports": true}'::jsonb,
      'imperial'
    )
    RETURNING id INTO v_project_id;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUCCESS! Project created with ID: %', v_project_id;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'You can insert projects!';
    RAISE NOTICE 'The 403 error is likely a frontend/session issue.';
    RAISE NOTICE '';
    RAISE NOTICE 'Cleaning up test project...';

    -- Clean up
    DELETE FROM projects WHERE id = v_project_id;
    RAISE NOTICE 'Test project deleted.';
    RAISE NOTICE '========================================';

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FAILED! Cannot insert project.';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'This is the RLS policy blocking you.';
    RAISE NOTICE '';
    RAISE NOTICE 'Action Required:';
    RAISE NOTICE '  1. Check SECTION 4 for policy type';
    RAISE NOTICE '  2. If RESTRICTIVE: Apply migration 018';
    RAISE NOTICE '  3. If PERMISSIVE: Check user role and company';
    RAISE NOTICE '========================================';
  END;
END $$;
*/
