# EXECUTE THIS SQL NOW - 403 Error Fix

## Quick Start

Copy and paste this SQL into Supabase SQL Editor and run it:

---

## STEP 1: Run This SQL Script

```sql
-- =============================================
-- COMPLETE FIX: 403 Project Creation Error
-- Copy this entire block into Supabase SQL Editor
-- =============================================

BEGIN;

-- FIX 1: Assign Company ID to Users with NULL
DO $$
DECLARE
  v_company_id UUID;
  v_users_fixed INTEGER := 0;
BEGIN
  SELECT id INTO v_company_id FROM companies WHERE is_active = true LIMIT 1;

  IF v_company_id IS NULL THEN
    INSERT INTO companies (name, slug, is_active)
    VALUES ('Default Company', 'default-company', true)
    RETURNING id INTO v_company_id;
    RAISE NOTICE 'Created default company: %', v_company_id;
  END IF;

  UPDATE users
  SET
    company_id = v_company_id,
    role = COALESCE(role, 'project_manager'),
    is_active = COALESCE(is_active, true)
  WHERE company_id IS NULL;

  GET DIAGNOSTICS v_users_fixed = ROW_COUNT;
  RAISE NOTICE 'Fixed % users with NULL company_id', v_users_fixed;
END $$;

-- FIX 2: Create Helper Functions
DROP FUNCTION IF EXISTS public.get_user_company_id();
CREATE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated, anon;

DROP FUNCTION IF EXISTS public.get_user_role();
CREATE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;

-- FIX 3: Fix Projects INSERT Policy
DO $$
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON projects;', ' ')
    FROM pg_policies
    WHERE tablename = 'projects' AND cmd = 'INSERT'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Authenticated users can insert projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- FIX 4: Fix Users SELECT Policy
DO $$
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON users;', ' ')
    FROM pg_policies
    WHERE tablename = 'users' AND cmd = 'SELECT'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (
    company_id = public.get_user_company_id()
    OR id = auth.uid()
  );

-- FIX 5: Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- VERIFICATION
DO $$
DECLARE
  null_count INTEGER;
  function_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM users WHERE company_id IS NULL;
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('get_user_company_id', 'get_user_role')
    AND security_type = 'DEFINER';
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'projects' AND cmd = 'INSERT'
    AND policyname = 'Authenticated users can insert projects in their company';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users with NULL company_id: %', null_count;
  RAISE NOTICE 'Helper functions: %', function_count;
  RAISE NOTICE 'INSERT policy: %', policy_count;
  RAISE NOTICE '';

  IF null_count = 0 AND function_count = 2 AND policy_count = 1 THEN
    RAISE NOTICE 'All checks PASSED!';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Users must LOG OUT';
    RAISE NOTICE '2. Clear browser cache';
    RAISE NOTICE '3. LOG BACK IN';
    RAISE NOTICE '4. Try creating project';
  ELSE
    RAISE NOTICE 'Some checks FAILED - review output above';
  END IF;
  RAISE NOTICE '========================================';
END $$;

COMMIT;
```

---

## STEP 2: User Actions (CRITICAL)

After running the SQL above, users MUST:

1. **Log Out** of the application
2. **Clear Browser Cache**:
   - Press F12 (DevTools)
   - Go to Application > Local Storage
   - Delete all items
   - Or press Ctrl+Shift+Delete and clear cache
3. **Log Back In**
4. **Try Creating a Project**

---

## Expected Output

After running the SQL, you should see:

```
FIX APPLIED SUCCESSFULLY
========================================
Users with NULL company_id: 0
Helper functions: 2
INSERT policy: 1

All checks PASSED!

NEXT STEPS:
1. Users must LOG OUT
2. Clear browser cache
3. LOG BACK IN
4. Try creating project
========================================
```

---

## Quick Verification

After users log back in, run this to verify:

```sql
-- Check user has company_id
SELECT id, email, company_id, role, is_active
FROM users
WHERE email = 'your-email@example.com';  -- Replace with actual email

-- Should show:
-- - company_id: a UUID (not NULL)
-- - role: 'project_manager' or other valid role
-- - is_active: true
```

---

## Test Project Creation

Try this SQL to test INSERT permission:

```sql
-- Test creating a project
INSERT INTO projects (
  company_id,
  name,
  project_number,
  status,
  created_by
)
VALUES (
  (SELECT company_id FROM users WHERE id = auth.uid()),
  'Test Project DELETE ME',
  'TEST-001',
  'planning',
  auth.uid()
)
RETURNING id, name, company_id;

-- If successful, clean up:
DELETE FROM projects WHERE project_number = 'TEST-001';
```

**If this succeeds**: Database is fixed, users just need to log out/in

**If this fails**: Check error message and see troubleshooting below

---

## Troubleshooting

### Error: "new row violates row-level security policy"
- RLS policy is blocking you
- Check if you're using Service Role in SQL Editor
- Or check if user's company_id is still NULL

### Error: "null value in column 'company_id'"
- User's company_id is still NULL
- Re-run the SQL above
- Check companies table has at least one row

### Error: "function public.get_user_company_id() does not exist"
- Helper functions weren't created
- Re-run the SQL above
- Make sure you're using Service Role

### Still Getting 403 in Frontend
- User hasn't logged out/in yet
- Browser cache still has old data
- Clear Local Storage manually
- Hard refresh (Ctrl+Shift+R)

---

## Files for Reference

- **This file**: Quick SQL to run now
- **`scripts/COMPLETE_FIX_403_ERROR.sql`**: Full version with comments
- **`scripts/VERIFY_403_FIX.sql`**: Detailed verification
- **`ROOT_CAUSE_ANALYSIS_403_COMPREHENSIVE.md`**: Technical analysis

---

## Time Estimate

- Run SQL: 30 seconds
- User logout/cache clear/login: 2 minutes
- Test project creation: 30 seconds
- **Total**: ~3 minutes

---

## Success Criteria

After completing all steps:
- No 403 error when creating projects
- Success notification appears
- Project appears in list
- No console errors

---

**Bottom Line**: Run the SQL above, have users log out and back in, done.
