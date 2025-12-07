-- ============================================================================
-- QUICK FIX: Project INSERT Policy (Missing from comprehensive fix)
-- ============================================================================
-- The comprehensive RLS fix didn't include the projects INSERT policy
-- This adds the simple policy that allows authenticated users to create projects
-- ============================================================================

-- Check current INSERT policy on projects
SELECT
  policyname,
  cmd,
  pg_get_expr(with_check, polrelid) as with_check_expr
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname = 'projects' AND cmd = 'INSERT';

-- Drop any existing INSERT policies
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;

-- Create the simple INSERT policy (this was missing!)
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify it was created
SELECT
  policyname,
  cmd,
  pg_get_expr(with_check, polrelid) as with_check_expr
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname = 'projects' AND cmd = 'INSERT';

-- Check current user's info
SELECT
  id,
  email,
  role,
  company_id,
  is_active
FROM users
WHERE id = auth.uid();

-- Check if user has any projects
SELECT COUNT(*) as project_count
FROM project_users
WHERE user_id = auth.uid();

-- ============================================================================
-- EXPECTED RESULTS:
-- 1. INSERT policy should be: (auth.uid() IS NOT NULL)
-- 2. User should have company_id (not NULL)
-- 3. User should be active (is_active = true)
-- ============================================================================
