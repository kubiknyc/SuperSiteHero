-- =============================================
-- CORRECT FIX: Project Creation 403 Error
-- =============================================
-- This is the REAL fix that will resolve the 403 error
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

-- Create new policy with company_id validation
-- This allows ANY authenticated user to create projects in their company
-- Company isolation is still enforced
CREATE POLICY "Authenticated users can create projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Verify policy was created
SELECT
  'Policy Created' as status,
  policyname,
  with_check::text
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'INSERT';
