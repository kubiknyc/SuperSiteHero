-- Check SELECT policies on projects

SELECT
  policyname,
  cmd,
  permissive,
  roles::text as applies_to_roles,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'SELECT'
ORDER BY policyname;
