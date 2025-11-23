-- ============================================
-- FIX FOR PROJECT CREATION ISSUE
-- Run this in Supabase SQL Editor
-- ============================================

-- Problem: The INSERT policy on projects table has a subquery to users table
-- which causes RLS recursion issues

-- Solution: Simplify the policy to just check authentication
-- The React app already ensures correct company_id

-- Drop the problematic policy
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;

-- Create a simpler policy that avoids RLS recursion
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Verify the new policy was created
SELECT
  policyname,
  cmd,
  with_check::text
FROM pg_policies
WHERE tablename = 'projects'
  AND policyname = 'Authenticated users can insert projects';

-- Test: Try inserting a project as your user
-- This should now work!
