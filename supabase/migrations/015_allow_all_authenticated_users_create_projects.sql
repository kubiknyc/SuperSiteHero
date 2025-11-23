-- Migration: 015_allow_all_authenticated_users_create_projects.sql
-- Description: Allow all authenticated users to create projects (more permissive policy)
-- Date: 2025-01-22

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;

-- Create a new policy that allows all authenticated users to create projects in their company
CREATE POLICY "Authenticated users can create projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

COMMENT ON POLICY "Authenticated users can create projects in their company" ON projects IS
  'Allows any authenticated user to create projects for their company.
   More permissive than role-based restriction.';

DO $$
BEGIN
  RAISE NOTICE 'Migration 015_allow_all_authenticated_users_create_projects completed successfully';
END $$;
