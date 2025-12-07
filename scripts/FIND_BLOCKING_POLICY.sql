-- Find what's blocking the insert

-- 1. Show ALL INSERT policies (should be only 1)
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,  -- IMPORTANT: PERMISSIVE or RESTRICTIVE
  roles,
  with_check::text as policy_logic
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- 2. Check if there are RESTRICTIVE policies blocking
SELECT
  COUNT(*) FILTER (WHERE permissive = 'PERMISSIVE') as permissive_count,
  COUNT(*) FILTER (WHERE permissive = 'RESTRICTIVE') as restrictive_count,
  COUNT(*) as total_insert_policies
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT';

-- 3. Test if the helper function works
-- (This will fail in SQL Editor but shows the function exists)
DO $$
BEGIN
  RAISE NOTICE 'Testing helper function...';
  RAISE NOTICE 'Function exists: %', (
    SELECT COUNT(*)
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_user_company_id'
  );
END $$;

-- 4. Check if authenticated role has EXECUTE permission
SELECT
  routine_name,
  routine_schema,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_company_id';
