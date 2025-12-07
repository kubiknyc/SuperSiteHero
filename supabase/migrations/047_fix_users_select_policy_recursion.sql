-- Migration: 047_fix_users_select_policy_recursion.sql
-- Description: Fix recursive SELECT policy on users table
-- Date: 2025-12-04
-- Related Issue: 403 Forbidden error due to recursive RLS policy evaluation
-- Depends on: Migration 012 (original RLS policies)

-- =============================================
-- Problem Statement:
-- =============================================
-- The current SELECT policy on users table causes recursion:
--
--   CREATE POLICY "Users can view company users"
--   ON users FOR SELECT
--   USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
--
-- The subquery "(SELECT company_id FROM users ...)" requires
-- SELECT permission on the users table, creating infinite recursion.
--
-- Postgres eventually stops the recursion, but it causes:
-- - Performance issues
-- - Unpredictable behavior
-- - Potential query failures
-- - 403 errors when the recursion limit is hit
-- =============================================

-- =============================================
-- Solution: Use a SECURITY DEFINER function
-- =============================================
-- This function bypasses RLS and returns the user's company_id.
-- It's safe because it only returns data for auth.uid() (current user).
-- =============================================

-- Create a security definer function to get user's company_id
-- Using public schema instead of auth schema for compatibility
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

-- Add helpful comment
COMMENT ON FUNCTION public.get_user_company_id() IS
  'Returns the company_id for the currently authenticated user.
   Uses SECURITY DEFINER to bypass RLS and prevent recursion.
   Safe because it only accesses data for auth.uid() (current user).';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;

-- =============================================
-- Update the SELECT policy to use the function
-- =============================================

-- Drop the existing recursive policy
DROP POLICY IF EXISTS "Users can view company users" ON users;

-- Create a new non-recursive policy using the function
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (
    -- Allow users to see other users in their company
    company_id = public.get_user_company_id()
    -- Also allow users to always see themselves (even if company_id is NULL)
    OR id = auth.uid()
  );

-- Add helpful comment
COMMENT ON POLICY "Users can view company users" ON users IS
  'Allows users to view other users in their company.
   Uses public.get_user_company_id() function to avoid RLS recursion.
   Also allows users to always see their own record (for profile loading).';

-- =============================================
-- Additional Safety: Create function for role check
-- =============================================
-- This can be used in other policies to avoid recursion

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
   Can be used in RLS policies that need role-based checks.';

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- =============================================
-- Verification Queries
-- =============================================
-- Run these to verify the migration worked:
/*
-- 1. Check the function exists
SELECT
  routine_name,
  routine_type,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_company_id', 'get_user_role');

-- Expected: Two rows, both with security_type = 'DEFINER'

-- 2. Test the functions (run as authenticated user)
SELECT
  auth.uid() as user_id,
  public.get_user_company_id() as company_id,
  public.get_user_role() as role;

-- Expected: Should return your user_id, company_id, and role

-- 3. Test the SELECT policy (run as authenticated user)
SELECT id, email, role, company_id
FROM users
WHERE company_id = public.get_user_company_id();

-- Expected: Should return all users in your company (including yourself)

-- 4. Test self-access even with NULL company_id
-- (This would fail with the old recursive policy)
SELECT id, email, role, company_id
FROM users
WHERE id = auth.uid();

-- Expected: Should always return your own record
*/

-- =============================================
-- Performance Note
-- =============================================
-- The SECURITY DEFINER functions are marked STABLE, which means:
-- - They can be cached within a single query
-- - Postgres won't re-execute them unnecessarily
-- - Much faster than recursive policy evaluation
--
-- The SET search_path = public ensures the function only
-- accesses the public schema, preventing schema-based attacks.
-- =============================================

-- =============================================
-- Migration Complete
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Migration 047: Users SELECT policy recursion fixed';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  1. Created public.get_user_company_id() function';
  RAISE NOTICE '  2. Created public.get_user_role() function';
  RAISE NOTICE '  3. Updated SELECT policy to use non-recursive function';
  RAISE NOTICE '';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '  - No more RLS recursion issues';
  RAISE NOTICE '  - Better performance (function is cached)';
  RAISE NOTICE '  - Users can always see their own profile';
  RAISE NOTICE '';
  RAISE NOTICE 'Users must log out and back in for changes to take effect!';
  RAISE NOTICE '=============================================';
END $$;
