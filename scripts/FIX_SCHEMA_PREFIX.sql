-- Fix policies to use explicit public.get_user_company_id()

-- Drop and recreate INSERT policy with explicit schema
DROP POLICY IF EXISTS "Authenticated users can insert projects in their company" ON projects;

CREATE POLICY "Authenticated users can insert projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id IS NOT NULL
    AND company_id = public.get_user_company_id()  -- Explicit public schema!
  );

-- Drop and recreate SELECT policy with explicit schema
DROP POLICY IF EXISTS "Users can view company projects" ON projects;

CREATE POLICY "Users can view company projects"
  ON projects FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND company_id = public.get_user_company_id()  -- Explicit public schema!
  );

-- Verify
SELECT
  cmd,
  policyname,
  COALESCE(qual::text, with_check::text) as policy_text
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd IN ('SELECT', 'INSERT')
ORDER BY cmd DESC;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Policies updated with explicit public. prefix';
  RAISE NOTICE '   Try creating a project now!';
  RAISE NOTICE '';
END $$;
