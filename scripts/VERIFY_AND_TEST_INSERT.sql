-- Verify policies and test insert directly

-- 1. Check current SELECT policy
SELECT
  policyname,
  cmd,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 2. Check current INSERT policy
SELECT
  policyname,
  cmd,
  with_check::text as check_clause
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 3. Show all policies on projects (ALL commands)
SELECT
  policyname,
  cmd,
  permissive,
  roles::text
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY cmd, policyname;

-- 4. Try to insert a test project as the service role
-- (This bypasses RLS entirely to test if the table itself works)
DO $$
DECLARE
  test_project_id UUID;
  company UUID := '3c146527-82a9-4f4d-97db-cf546da9dfed';
BEGIN
  INSERT INTO projects (
    company_id,
    name,
    status,
    weather_units,
    features_enabled
  ) VALUES (
    company,
    'TEST PROJECT - DELETE IMMEDIATELY',
    'planning',
    'imperial',
    '{}'::jsonb
  )
  RETURNING id INTO test_project_id;

  RAISE NOTICE '✅ Service role INSERT successful: %', test_project_id;
  RAISE NOTICE '   This proves the table and constraints work.';

  -- Clean up
  DELETE FROM projects WHERE id = test_project_id;

  RAISE NOTICE '✅ Test project cleaned up.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Service role INSERT failed: %', SQLERRM;
END $$;
