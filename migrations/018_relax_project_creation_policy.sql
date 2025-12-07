-- Migration: 018_relax_project_creation_policy.sql
-- Description: Allow any authenticated user to create projects (company_id isolation only)
-- Date: 2025-12-04
-- Reason: The restrictive role-based policy was too limiting. Company isolation
--         is the primary security boundary for multi-tenant architecture.

-- =============================================
-- Drop old restrictive policy
-- =============================================
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;

-- =============================================
-- Create new permissive policy
-- =============================================
-- Only requirements:
-- 1. User must be authenticated (auth.uid() IS NOT NULL)
-- 2. Project must belong to user's company (company_id match)
-- 3. User must have a valid user record (subquery succeeds)
--
-- This allows all authenticated company users to create projects,
-- regardless of their role. Company isolation is maintained.
-- =============================================
CREATE POLICY "Authenticated users can create projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- Project's company_id must match user's company_id
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- Verification
-- =============================================
DO $$
BEGIN
  -- Verify policy was created
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND policyname = 'Authenticated users can create projects in their company'
  ) THEN
    RAISE NOTICE '✓ New policy created successfully';
  ELSE
    RAISE EXCEPTION 'Policy creation failed';
  END IF;

  -- Verify old policy was dropped
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND policyname = 'Authorized users can create projects'
  ) THEN
    RAISE NOTICE '✓ Old policy removed successfully';
  ELSE
    RAISE WARNING 'Old policy still exists - may need manual cleanup';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Migration 018 completed successfully';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Removed role restriction for project creation';
  RAISE NOTICE '  - Any authenticated user can now create projects';
  RAISE NOTICE '  - Company isolation is still enforced';
  RAISE NOTICE '';
  RAISE NOTICE 'Security Notes:';
  RAISE NOTICE '  - Multi-tenant isolation maintained via company_id';
  RAISE NOTICE '  - Users can only create projects in their own company';
  RAISE NOTICE '  - Project access still controlled by project_users table';
  RAISE NOTICE '===========================================';
END $$;
