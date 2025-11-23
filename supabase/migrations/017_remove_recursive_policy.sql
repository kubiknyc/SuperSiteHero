-- Migration: 017_remove_recursive_policy.sql
-- Description: Remove the policy that still causes infinite recursion
-- Date: 2025-01-22

-- Drop the policy that STILL causes infinite recursion
DROP POLICY IF EXISTS "Users can view same company users" ON users;

-- Keep only the simple, non-recursive policy
-- This policy already exists from migration 016, so we don't recreate it
-- "Users can view own profile" USING (id = auth.uid());

COMMENT ON POLICY "Users can view own profile" ON users IS
  'Allows users to view ONLY their own profile. No recursion, no company lookup.';

DO $$
BEGIN
  RAISE NOTICE 'Migration 017_remove_recursive_policy completed successfully';
  RAISE NOTICE 'Users can now only view their own profile, not other company users';
END $$;
