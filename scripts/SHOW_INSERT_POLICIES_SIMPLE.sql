-- Simple query to show INSERT policies

SELECT
  policyname,
  cmd,
  permissive,  -- This is KEY: PERMISSIVE or RESTRICTIVE?
  roles::text as applies_to_roles,
  with_check::text as policy_check
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT'
ORDER BY policyname;
