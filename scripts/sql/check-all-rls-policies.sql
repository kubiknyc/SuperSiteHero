-- Check ALL RLS policies on projects table
-- This will help us identify if there are other blocking policies

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as using_condition,
  with_check::text as with_check_condition
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY cmd, policyname;

-- We should see policies for:
-- - INSERT (what we just fixed)
-- - SELECT (to read projects)
-- - UPDATE (to edit projects)
-- - DELETE (to remove projects)
