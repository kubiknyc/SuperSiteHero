-- Fix the projects INSERT policy to use helper function
-- This eliminates the recursion

-- Drop the current policy
DROP POLICY IF EXISTS "Authenticated users can insert projects in their company" ON projects;

-- Create the CORRECT policy using helper function (no recursion!)
CREATE POLICY "Authenticated users can insert projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id IS NOT NULL
    AND company_id = public.get_user_company_id()  -- Uses helper function!
  );

-- Verify it was created correctly
SELECT
  policyname,
  cmd,
  with_check::text as policy_check
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT'
  AND policyname = 'Authenticated users can insert projects in their company';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Projects INSERT policy fixed!';
  RAISE NOTICE '   Now uses public.get_user_company_id() instead of recursive subquery';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Try creating a project in your app';
  RAISE NOTICE '2. Should work without 403 error!';
  RAISE NOTICE '';
END $$;
