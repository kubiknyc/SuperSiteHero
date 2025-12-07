-- =============================================
-- COMPLETE FIX: 403 Project Creation Error
-- =============================================
-- This script fixes ALL possible root causes:
--   1. NULL company_id in users table
--   2. Missing or incorrect RLS policies
--   3. Missing helper functions
-- =============================================
-- Run this in Supabase SQL Editor with Service Role
-- =============================================

\echo ''
\echo '=========================================='
\echo 'COMPLETE FIX: 403 PROJECT CREATION ERROR'
\echo '=========================================='
\echo ''

-- =============================================
-- FIX 1: Assign Company ID to Users with NULL
-- =============================================

\echo 'FIX 1: Assigning company_id to users...'

DO $$
DECLARE
  v_company_id UUID;
  v_users_fixed INTEGER := 0;
BEGIN
  -- Get the first active company (or create one if none exists)
  SELECT id INTO v_company_id FROM companies WHERE is_active = true LIMIT 1;

  IF v_company_id IS NULL THEN
    -- No company exists, create a default one
    INSERT INTO companies (name, slug, is_active)
    VALUES ('Default Company', 'default-company', true)
    RETURNING id INTO v_company_id;

    RAISE NOTICE '  ✅ Created default company: %', v_company_id;
  END IF;

  -- Update all users with NULL company_id
  UPDATE users
  SET
    company_id = v_company_id,
    role = COALESCE(role, 'project_manager'),  -- Set default role if NULL
    is_active = COALESCE(is_active, true)       -- Set active if NULL
  WHERE company_id IS NULL;

  GET DIAGNOSTICS v_users_fixed = ROW_COUNT;

  IF v_users_fixed > 0 THEN
    RAISE NOTICE '  ✅ Fixed % user(s) with NULL company_id', v_users_fixed;
    RAISE NOTICE '     Assigned to company: %', v_company_id;
  ELSE
    RAISE NOTICE '  ✅ All users already have company_id assigned';
  END IF;
END $$;

\echo ''

-- =============================================
-- FIX 2: Create Helper Functions (if missing)
-- =============================================

\echo 'FIX 2: Creating helper functions...'

-- Drop existing functions if they exist (idempotent)
DROP FUNCTION IF EXISTS public.get_user_company_id();
DROP FUNCTION IF EXISTS public.get_user_role();

-- Create get_user_company_id function
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_company_id() IS
  'Returns the company_id for the currently authenticated user.
   Uses SECURITY DEFINER to bypass RLS and prevent recursion.
   Located in public schema due to auth schema permissions.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated, anon;

-- Create get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_role() IS
  'Returns the role for the currently authenticated user.
   Uses SECURITY DEFINER to bypass RLS and prevent recursion.
   Located in public schema due to auth schema permissions.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;

\echo '  ✅ Helper functions created successfully'
\echo ''

-- =============================================
-- FIX 3: Fix Projects INSERT Policy
-- =============================================

\echo 'FIX 3: Fixing projects INSERT policy...'

-- Drop ALL known INSERT policies on projects (clean slate)
DO $$
BEGIN
  -- Drop all INSERT policies
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON projects;', ' ')
    FROM pg_policies
    WHERE tablename = 'projects'
      AND cmd = 'INSERT'
  );

  RAISE NOTICE '  ✅ Dropped existing INSERT policies';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '  ℹ️  No existing INSERT policies to drop';
END $$;

-- Create the CORRECT policy with proper company_id validation
CREATE POLICY "Authenticated users can insert projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- company_id must not be NULL
    AND company_id IS NOT NULL
    -- company_id must match the user's company
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

COMMENT ON POLICY "Authenticated users can insert projects in their company" ON projects IS
  'Allows authenticated users to create projects for their company.
   Validates company_id matches user company for multi-tenant isolation.
   Fixed in migration 046 to prevent 403 errors.';

\echo '  ✅ Created correct INSERT policy with company_id validation'
\echo ''

-- =============================================
-- FIX 4: Fix Users SELECT Policy (prevent recursion)
-- =============================================

\echo 'FIX 4: Fixing users SELECT policy...'

-- Drop known SELECT policies on users
DO $$
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON users;', ' ')
    FROM pg_policies
    WHERE tablename = 'users'
      AND cmd = 'SELECT'
  );

  RAISE NOTICE '  ✅ Dropped existing SELECT policies';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '  ℹ️  No existing SELECT policies to drop';
END $$;

-- Create the non-recursive policy using helper function
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (
    -- Allow users to see other users in their company
    company_id = public.get_user_company_id()
    -- Also allow users to always see themselves (even if company_id is NULL)
    OR id = auth.uid()
  );

COMMENT ON POLICY "Users can view company users" ON users IS
  'Allows users to view other users in their company.
   Uses public.get_user_company_id() function to avoid RLS recursion.
   Fixed in migration 047.';

\echo '  ✅ Created non-recursive SELECT policy'
\echo ''

-- =============================================
-- FIX 5: Ensure RLS is Enabled
-- =============================================

\echo 'FIX 5: Ensuring RLS is enabled...'

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

\echo '  ✅ RLS enabled on projects and users tables'
\echo ''

-- =============================================
-- VERIFICATION
-- =============================================

\echo '=========================================='
\echo 'VERIFICATION'
\echo '=========================================='
\echo ''

-- Verify users have company_id
DO $$
DECLARE
  null_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM users WHERE company_id IS NULL;
  SELECT COUNT(*) INTO total_count FROM users;

  RAISE NOTICE 'Users with NULL company_id: % / %', null_count, total_count;

  IF null_count = 0 THEN
    RAISE NOTICE '  ✅ All users have company_id assigned';
  ELSE
    RAISE NOTICE '  ⚠️  WARNING: % users still have NULL company_id!', null_count;
  END IF;
END $$;

-- Verify helper functions
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_company_id', 'get_user_role')
    AND security_type = 'DEFINER';

  RAISE NOTICE 'Helper functions found: % / 2', function_count;

  IF function_count = 2 THEN
    RAISE NOTICE '  ✅ Both helper functions exist';
  ELSE
    RAISE NOTICE '  ⚠️  WARNING: Only % helper functions found!', function_count;
  END IF;
END $$;

-- Verify projects INSERT policy
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'projects'
    AND cmd = 'INSERT'
    AND policyname = 'Authenticated users can insert projects in their company';

  RAISE NOTICE 'Correct INSERT policy found: %', policy_count;

  IF policy_count = 1 THEN
    RAISE NOTICE '  ✅ Projects INSERT policy is correct';
  ELSE
    RAISE NOTICE '  ⚠️  WARNING: INSERT policy not found or multiple exist!';
  END IF;
END $$;

-- Verify users SELECT policy
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'users'
    AND cmd = 'SELECT'
    AND policyname = 'Users can view company users';

  RAISE NOTICE 'Correct SELECT policy found: %', policy_count;

  IF policy_count = 1 THEN
    RAISE NOTICE '  ✅ Users SELECT policy is correct';
  ELSE
    RAISE NOTICE '  ⚠️  WARNING: SELECT policy not found or multiple exist!';
  END IF;
END $$;

\echo ''
\echo '=========================================='
\echo 'FIX COMPLETED'
\echo '=========================================='
\echo ''

-- Show current state
\echo 'Current Users State:'
SELECT
  id,
  email,
  role,
  company_id,
  is_active,
  CASE
    WHEN company_id IS NULL THEN '❌ NO COMPANY'
    WHEN role IS NULL THEN '⚠️  NO ROLE'
    WHEN is_active = false THEN '⚠️  INACTIVE'
    ELSE '✅ OK'
  END as status
FROM users
ORDER BY created_at DESC;

\echo ''
\echo '=========================================='
\echo 'NEXT STEPS'
\echo '=========================================='
\echo ''
\echo '1. ✅ Database fixes have been applied'
\echo ''
\echo '2. 🔄 USERS MUST LOG OUT AND BACK IN:'
\echo '   - Frontend has cached userProfile data'
\echo '   - Logging out clears the cache'
\echo '   - Logging back in fetches fresh data with company_id'
\echo ''
\echo '3. 🧹 OPTIONAL: Clear browser cache:'
\echo '   - Open DevTools (F12)'
\echo '   - Go to Application > Local Storage'
\echo '   - Clear all Supabase auth data'
\echo '   - Hard refresh (Ctrl+Shift+R)'
\echo ''
\echo '4. 🧪 TEST: Try creating a project'
\echo '   - Should now work without 403 error'
\echo ''
\echo '=========================================='
\echo ''
