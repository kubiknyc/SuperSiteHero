-- Migration: 046_fix_projects_insert_policy.sql
-- Description: Fix INSERT policy on projects table to properly validate company_id
-- Date: 2025-12-04
-- Related Issue: 403 Forbidden error on project creation
-- Depends on: Migration 018 (simplified policy)

-- =============================================
-- Problem Statement:
-- =============================================
-- Migration 018 created an overly permissive policy:
--   CREATE POLICY "Authenticated users can insert projects"
--   WITH CHECK (auth.uid() IS NOT NULL);
--
-- This allows any authenticated user to insert ANY company_id,
-- breaking multi-tenant isolation.
--
-- Additionally, the policy doesn't validate that the user
-- actually belongs to a company, leading to NULL constraint violations.
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

-- Create a proper policy that validates company_id
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

-- Add helpful comment
COMMENT ON POLICY "Authenticated users can insert projects in their company" ON projects IS
  'Allows authenticated users to create projects for their company.
   Validates:
   - User is authenticated (auth.uid() IS NOT NULL)
   - company_id is provided (NOT NULL)
   - company_id matches user company (multi-tenant isolation)

   This replaces the overly permissive policy from migration 018.
   All users can create projects, but only for their own company.';

-- =============================================
-- Verification Query
-- =============================================
-- Run this to verify the policy was created correctly:
/*
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT';

-- Expected: One row with policyname = 'Authenticated users can insert projects in their company'
*/

-- =============================================
-- Test Query (Run as authenticated user)
-- =============================================
-- This should succeed for users with a valid company_id:
/*
INSERT INTO projects (
  company_id,
  name,
  project_number,
  status,
  created_by
) VALUES (
  (SELECT company_id FROM users WHERE id = auth.uid()),
  'Test Project - Policy Validation',
  'TEST-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
  'planning',
  auth.uid()
) RETURNING id, name, company_id, created_by;

-- Clean up test:
DELETE FROM projects WHERE name = 'Test Project - Policy Validation';
*/

-- =============================================
-- Migration Complete
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Migration 046: Projects INSERT policy fixed';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'The INSERT policy now properly validates:';
  RAISE NOTICE '  1. User is authenticated';
  RAISE NOTICE '  2. company_id is not NULL';
  RAISE NOTICE '  3. company_id matches user company';
  RAISE NOTICE '';
  RAISE NOTICE 'Users must log out and back in for changes to take effect!';
  RAISE NOTICE '=============================================';
END $$;
