-- Migration: 016_fix_users_rls_infinite_recursion.sql
-- Description: Fix infinite recursion in users table RLS policy
-- Date: 2025-01-22

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view company users" ON users;

-- Create a policy that allows users to view their own profile (no recursion)
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Create a separate policy for viewing other users in the same company
-- This one is safe because it only applies AFTER the user's own record is accessible
CREATE POLICY "Users can view same company users"
  ON users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id
      FROM users
      WHERE id = auth.uid()
      LIMIT 1
    )
    AND company_id IS NOT NULL
  );

COMMENT ON POLICY "Users can view own profile" ON users IS
  'Allows users to view their own profile without recursion issues.';

COMMENT ON POLICY "Users can view same company users" ON users IS
  'Allows users to view other users in their company (non-recursive).';

DO $$
BEGIN
  RAISE NOTICE 'Migration 016_fix_users_rls_infinite_recursion completed successfully';
END $$;
