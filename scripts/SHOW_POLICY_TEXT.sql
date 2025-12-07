-- Show the exact policy text

-- SELECT policy text
SELECT
  'SELECT Policy:' as policy_type,
  policyname,
  qual::text as policy_text
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'SELECT';

-- INSERT policy text
SELECT
  'INSERT Policy:' as policy_type,
  policyname,
  with_check::text as policy_text
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT';
