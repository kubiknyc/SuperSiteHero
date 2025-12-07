-- Check current user state and diagnose 403 error

-- 1. Check your user's company_id
SELECT
  id,
  email,
  company_id,
  role,
  CASE
    WHEN company_id IS NULL THEN '❌ NULL COMPANY_ID - THIS IS THE PROBLEM!'
    ELSE '✅ Has company_id'
  END as status
FROM users
WHERE email LIKE '%@%'  -- All users with email
ORDER BY created_at DESC;

-- 2. Check if companies exist
SELECT
  id,
  name,
  slug,
  created_at
FROM companies
ORDER BY created_at
LIMIT 5;

-- 3. Check current RLS policies on projects
SELECT
  policyname,
  cmd,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 4. Test the helper function
SELECT
  auth.uid() as my_user_id,
  public.get_user_company_id() as my_company_id,
  public.get_user_role() as my_role;

-- 5. Test if you can manually insert a project
-- (This will show the exact error message)
DO $$
DECLARE
  test_project_id UUID;
  user_company UUID;
BEGIN
  -- Get your company_id
  SELECT public.get_user_company_id() INTO user_company;

  RAISE NOTICE 'Your company_id: %', user_company;

  IF user_company IS NULL THEN
    RAISE NOTICE '❌ ERROR: Your company_id is NULL! This is why 403 happens.';
    RAISE NOTICE 'Fix: Run the FIX_403_CORRECT_ORDER.sql script again.';
  ELSE
    -- Try to insert a test project
    INSERT INTO projects (
      company_id,
      name,
      status,
      created_by,
      weather_units,
      features_enabled
    ) VALUES (
      user_company,
      'TEST - DELETE ME',
      'planning',
      auth.uid(),
      'imperial',
      '{}'::jsonb
    )
    RETURNING id INTO test_project_id;

    RAISE NOTICE '✅ SUCCESS! Test project created: %', test_project_id;
    RAISE NOTICE 'Cleaning up...';

    -- Delete the test project
    DELETE FROM projects WHERE id = test_project_id;

    RAISE NOTICE '✅ Test project deleted. Your database is working!';
    RAISE NOTICE 'The problem must be in the frontend cache.';
  END IF;
END $$;
