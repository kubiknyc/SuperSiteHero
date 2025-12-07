-- Fix SELECT policies to use correct helper functions

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "Authenticated users can select projects" ON projects;
DROP POLICY IF EXISTS "Clients can view assigned projects" ON projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;

-- Create simple SELECT policy that works
CREATE POLICY "Users can view company projects"
  ON projects FOR SELECT
  USING (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- User can see projects in their company
    AND company_id = public.get_user_company_id()
  );

COMMENT ON POLICY "Users can view company projects" ON projects IS
  'Allows authenticated users to view projects in their company.
   Uses public.get_user_company_id() helper function.';

-- Verify it was created
SELECT
  policyname,
  cmd,
  permissive,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'SELECT';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ SELECT policies fixed!';
  RAISE NOTICE '   Now uses public.get_user_company_id()';
  RAISE NOTICE '';
  RAISE NOTICE 'Try creating a project now - should work!';
  RAISE NOTICE '';
END $$;
