-- =============================================
-- SIMPLE FIX: 403 Project Creation Error
-- Correct order: Drop policies, then functions
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'FIXING 403 PROJECT CREATION ERROR';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
END $$;

-- =============================================
-- Step 1: Drop Policies First (they depend on functions)
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Step 1: Dropping old policies...';
END $$;

-- Drop projects policies
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects in their company" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;

-- Drop users policies
DROP POLICY IF EXISTS "Users can view company users" ON users;
DROP POLICY IF EXISTS "Users can select company users" ON users;
DROP POLICY IF EXISTS "authenticated_select_users" ON users;

DO $$
BEGIN
  RAISE NOTICE '  ✅ Old policies dropped';
  RAISE NOTICE '';
END $$;

-- =============================================
-- Step 2: Drop and Recreate Functions
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Step 2: Creating helper functions...';
END $$;

DROP FUNCTION IF EXISTS public.get_user_company_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE '  ✅ Helper functions created';
  RAISE NOTICE '';
END $$;

-- =============================================
-- Step 3: Assign Company to Users
-- =============================================

DO $$
DECLARE
  v_company_id UUID;
  v_users_fixed INTEGER := 0;
BEGIN
  RAISE NOTICE 'Step 3: Assigning company_id to users...';

  -- Get the first company (any company)
  SELECT id INTO v_company_id FROM companies LIMIT 1;

  IF v_company_id IS NULL THEN
    -- No company exists, create a default one
    INSERT INTO companies (name, slug)
    VALUES ('Default Company', 'default-company')
    RETURNING id INTO v_company_id;

    RAISE NOTICE '  ✅ Created default company: %', v_company_id;
  ELSE
    RAISE NOTICE '  ✅ Found existing company: %', v_company_id;
  END IF;

  -- Update all users with NULL company_id
  UPDATE users
  SET
    company_id = v_company_id,
    role = COALESCE(role, 'project_manager')
  WHERE company_id IS NULL;

  GET DIAGNOSTICS v_users_fixed = ROW_COUNT;

  IF v_users_fixed > 0 THEN
    RAISE NOTICE '  ✅ Fixed % user(s) with NULL company_id', v_users_fixed;
    RAISE NOTICE '     Assigned to company: %', v_company_id;
  ELSE
    RAISE NOTICE '  ✅ All users already have company_id';
  END IF;

  RAISE NOTICE '';
END $$;

-- =============================================
-- Step 4: Create New Policies
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Step 4: Creating new policies...';
END $$;

-- Projects INSERT policy
CREATE POLICY "Authenticated users can insert projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users SELECT policy (non-recursive)
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (
    company_id = public.get_user_company_id()
    OR id = auth.uid()
  );

DO $$
BEGIN
  RAISE NOTICE '  ✅ New policies created';
  RAISE NOTICE '';
END $$;

-- =============================================
-- Step 5: Enable RLS
-- =============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE 'Step 5: RLS enabled';
  RAISE NOTICE '';
END $$;

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
DECLARE
  null_count INTEGER;
  total_count INTEGER;
  func_count INTEGER;
  proj_policy INTEGER;
  user_policy INTEGER;
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';

  -- Check users
  SELECT COUNT(*) INTO null_count FROM users WHERE company_id IS NULL;
  SELECT COUNT(*) INTO total_count FROM users;

  IF null_count = 0 THEN
    RAISE NOTICE '✅ All % users have company_id', total_count;
  ELSE
    RAISE NOTICE '⚠️  WARNING: % / % users still have NULL company_id', null_count, total_count;
  END IF;

  -- Check functions
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_company_id', 'get_user_role')
    AND security_type = 'DEFINER';

  IF func_count = 2 THEN
    RAISE NOTICE '✅ Both helper functions exist';
  ELSE
    RAISE NOTICE '⚠️  WARNING: Only % / 2 helper functions found', func_count;
  END IF;

  -- Check policies
  SELECT COUNT(*) INTO proj_policy
  FROM pg_policies
  WHERE tablename = 'projects' AND cmd = 'INSERT'
    AND policyname = 'Authenticated users can insert projects in their company';

  IF proj_policy = 1 THEN
    RAISE NOTICE '✅ Projects INSERT policy correct';
  ELSE
    RAISE NOTICE '⚠️  WARNING: Projects INSERT policy issue';
  END IF;

  SELECT COUNT(*) INTO user_policy
  FROM pg_policies
  WHERE tablename = 'users' AND cmd = 'SELECT'
    AND policyname = 'Users can view company users';

  IF user_policy = 1 THEN
    RAISE NOTICE '✅ Users SELECT policy correct';
  ELSE
    RAISE NOTICE '⚠️  WARNING: Users SELECT policy issue';
  END IF;

  RAISE NOTICE '';

  IF null_count = 0 AND func_count = 2 AND proj_policy = 1 AND user_policy = 1 THEN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🎉 ALL CHECKS PASSED!';
    RAISE NOTICE '==========================================';
  ELSE
    RAISE NOTICE '==========================================';
    RAISE NOTICE '⚠️  SOME CHECKS FAILED - SEE ABOVE';
    RAISE NOTICE '==========================================';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Log out of your application';
  RAISE NOTICE '2. In browser DevTools (F12):';
  RAISE NOTICE '   - Console: localStorage.clear()';
  RAISE NOTICE '   - Press Enter';
  RAISE NOTICE '3. Hard refresh: Ctrl+Shift+R';
  RAISE NOTICE '4. Log back in';
  RAISE NOTICE '5. Try creating a project - should work!';
  RAISE NOTICE '';
END $$;

-- Show users status
SELECT
  id,
  email,
  role,
  company_id,
  CASE
    WHEN company_id IS NULL THEN '❌ NO COMPANY'
    WHEN role IS NULL THEN '⚠️  NO ROLE'
    ELSE '✅ OK'
  END as status
FROM users
ORDER BY created_at DESC
LIMIT 10;
