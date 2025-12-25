-- Migration 146: Update RLS Policies for Pending Users
-- Description: Updates Row Level Security policies to handle pending users appropriately
-- - Pending users can view their own profile and company info
-- - Pending users cannot create/modify projects, reports, or other resources
-- - Admins can view and update pending users in their company

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Allow all authenticated users to view their own profile (including pending users)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admin/owner users to view all users in their company (including pending)
DROP POLICY IF EXISTS "Admins can view company users" ON users;
CREATE POLICY "Admins can view company users" ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
        AND deleted_at IS NULL
    )
  );

-- Allow admin/owner users to update approval status of users in their company
DROP POLICY IF EXISTS "Admins can update user approval" ON users;
CREATE POLICY "Admins can update user approval" ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only update users in your own company
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    -- Can only update users in your own company
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = TRUE
        AND deleted_at IS NULL
    )
  );

-- ============================================================================
-- COMPANIES TABLE POLICIES
-- ============================================================================

-- Allow pending users to view their company info
DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND deleted_at IS NULL
      -- Explicitly allow both pending and active users
    )
  );

-- Keep existing policy for service role
-- (This was added in migration 141 for the trigger)

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

-- Update projects view policy to require active users
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
CREATE POLICY "Users can view assigned projects" ON projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_active = TRUE  -- Only active users can view projects
        AND deleted_at IS NULL
    )
    AND (
      -- User is assigned to the project
      id IN (
        SELECT project_id FROM project_users
        WHERE user_id = auth.uid()
      )
      OR
      -- User is owner/admin of the project's company
      company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

-- Update projects insert policy to require active users
DROP POLICY IF EXISTS "Users can create projects" ON projects;
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_active = TRUE  -- Only active users can create projects
        AND deleted_at IS NULL
        AND company_id = projects.company_id
    )
  );

-- ============================================================================
-- DAILY REPORTS TABLE POLICIES
-- ============================================================================

-- Update daily reports insert policy to require active users
DROP POLICY IF EXISTS "Users can create daily reports" ON daily_reports;
CREATE POLICY "Users can create daily reports" ON daily_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_active = TRUE  -- Only active users can create daily reports
        AND deleted_at IS NULL
    )
    AND
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- TASKS TABLE POLICIES
-- ============================================================================

-- Update tasks insert policy to require active users
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_active = TRUE  -- Only active users can create tasks
        AND deleted_at IS NULL
    )
  );

-- ============================================================================
-- DOCUMENTS TABLE POLICIES
-- ============================================================================

-- Update documents insert policy to require active users
DROP POLICY IF EXISTS "Users can create documents" ON documents;
CREATE POLICY "Users can create documents" ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_active = TRUE  -- Only active users can create documents
        AND deleted_at IS NULL
    )
    AND
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- CREATE HELPER FUNCTION FOR ACTIVE USER CHECK
-- ============================================================================

-- Create a reusable function to check if current user is active
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND is_active = TRUE
      AND deleted_at IS NULL
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.is_active_user() IS 'Returns true if the current authenticated user is active (approved and not deleted)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INT;
BEGIN
  -- Count updated policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('users', 'companies', 'projects', 'daily_reports', 'tasks', 'documents');

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 146 completed successfully';
  RAISE NOTICE 'Updated RLS policies: %', policy_count;
  RAISE NOTICE 'Pending user restrictions: ENABLED';
  RAISE NOTICE '  - Pending users can view profile & company';
  RAISE NOTICE '  - Pending users CANNOT create resources';
  RAISE NOTICE '  - Admins can manage pending users';
  RAISE NOTICE 'Helper function: is_active_user()';
  RAISE NOTICE '========================================';
END $$;
