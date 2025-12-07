-- =============================================
-- VERIFY DATABASE STATE AND TEST INSERT
-- =============================================
-- Run this to check if the SQL fix was applied correctly
-- =============================================

-- STEP 1: Check current RLS policies
SELECT
  '=== CURRENT RLS POLICIES ===' as section,
  policyname,
  cmd,
  with_check::text as policy_check
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'INSERT';

-- STEP 2: Check your user record
SELECT
  '=== YOUR USER RECORD ===' as section,
  id,
  email,
  role,
  company_id,
  is_active
FROM users
WHERE id = auth.uid();

-- STEP 3: Check if you have a company
SELECT
  '=== YOUR COMPANY ===' as section,
  c.id,
  c.name,
  c.slug,
  c.is_active
FROM companies c
WHERE c.id = (SELECT company_id FROM users WHERE id = auth.uid());

-- STEP 4: Try to INSERT a test project
-- This will tell us if the RLS policy is working
INSERT INTO projects (
  company_id,
  name,
  project_number,
  status,
  weather_units,
  features_enabled,
  created_by
) VALUES (
  (SELECT company_id FROM users WHERE id = auth.uid()),
  'TEST PROJECT - DELETE ME',
  'TEST-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
  'planning',
  'imperial',
  '{"daily_reports": true}'::jsonb,
  auth.uid()
) RETURNING
  id,
  name,
  project_number,
  company_id,
  created_by,
  created_at;

-- If the INSERT succeeds, the database is configured correctly
-- and the issue is in the frontend

-- Clean up the test project
DELETE FROM projects WHERE name = 'TEST PROJECT - DELETE ME';

SELECT '=== TEST COMPLETE ===' as result;
