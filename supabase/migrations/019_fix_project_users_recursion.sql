-- ============================================
-- FIX INFINITE RECURSION IN project_users TABLE
-- Run this in Supabase SQL Editor IMMEDIATELY
-- ============================================

-- Problem: Infinite recursion in project_users RLS policies
-- This blocks SELECT operations on projects table

-- Solution: Simplify all project_users policies to avoid recursion

-- 1. Drop all existing policies on project_users
DROP POLICY IF EXISTS "Users can view project assignments" ON project_users;
DROP POLICY IF EXISTS "Users can view same company project assignments" ON project_users;
DROP POLICY IF EXISTS "Company users can view project assignments" ON project_users;
DROP POLICY IF EXISTS "Users can manage project assignments" ON project_users;
DROP POLICY IF EXISTS "Authorized users can view project assignments" ON project_users;

-- Drop the new policies in case they exist
DROP POLICY IF EXISTS "Authenticated users can view project_users" ON project_users;
DROP POLICY IF EXISTS "Authenticated users can insert project_users" ON project_users;
DROP POLICY IF EXISTS "Authenticated users can update project_users" ON project_users;
DROP POLICY IF EXISTS "Authenticated users can delete project_users" ON project_users;

-- 2. Create simple, non-recursive policies

-- SELECT policy - allow authenticated users to see project assignments
CREATE POLICY "Authenticated users can view project_users"
  ON project_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT policy - allow authenticated users to create assignments
CREATE POLICY "Authenticated users can insert project_users"
  ON project_users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE policy - allow authenticated users to update assignments
CREATE POLICY "Authenticated users can update project_users"
  ON project_users FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE policy - allow authenticated users to delete assignments
CREATE POLICY "Authenticated users can delete project_users"
  ON project_users FOR DELETE
  USING (auth.uid() IS NOT NULL);
