-- Check current RLS policies
SELECT
  '=== CURRENT INSERT POLICIES ===' as info,
  policyname,
  cmd,
  permissive,
  with_check::text as policy_rule
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'INSERT'
ORDER BY policyname;

-- This should show:
-- "Authenticated users can create projects in their company"
-- WITH CHECK: (auth.uid() IS NOT NULL) AND (company_id = ...)
