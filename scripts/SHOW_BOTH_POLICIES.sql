-- Show both SELECT and INSERT policies in one result

SELECT
  cmd,
  policyname,
  COALESCE(qual::text, with_check::text) as policy_text
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd IN ('SELECT', 'INSERT')
ORDER BY cmd DESC;  -- INSERT first, then SELECT
