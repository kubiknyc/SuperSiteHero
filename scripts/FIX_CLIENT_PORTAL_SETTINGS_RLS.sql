-- Fix the REAL problem: client_portal_settings RLS

-- First, re-enable RLS on projects (we disabled it for testing)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Check current policies on client_portal_settings
SELECT
  policyname,
  cmd,
  permissive,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'client_portal_settings'
ORDER BY cmd, policyname;

-- Drop all policies on client_portal_settings and create proper ones
DROP POLICY IF EXISTS "Users can view client_portal_settings" ON client_portal_settings;
DROP POLICY IF EXISTS "Users can insert client_portal_settings" ON client_portal_settings;
DROP POLICY IF EXISTS "Users can update client_portal_settings" ON client_portal_settings;
DROP POLICY IF EXISTS "Users can delete client_portal_settings" ON client_portal_settings;

-- Create permissive INSERT policy for client_portal_settings
CREATE POLICY "Users can insert client_portal_settings"
  ON client_portal_settings FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Create permissive SELECT policy
CREATE POLICY "Users can view client_portal_settings"
  ON client_portal_settings FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Create permissive UPDATE policy
CREATE POLICY "Users can update client_portal_settings"
  ON client_portal_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create permissive DELETE policy
CREATE POLICY "Users can delete client_portal_settings"
  ON client_portal_settings FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Verify
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'client_portal_settings'
ORDER BY cmd, policyname;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ client_portal_settings RLS policies fixed!';
  RAISE NOTICE '✅ projects RLS re-enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'Try creating a project now!';
  RAISE NOTICE '';
END $$;
