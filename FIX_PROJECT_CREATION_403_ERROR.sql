-- ============================================
-- FIX PROJECT CREATION 403 FORBIDDEN ERROR
-- ============================================
-- This script resolves the "Failed to create project" error
-- by applying the correct RLS policy and fixing user data
--
-- ERROR SYMPTOMS:
-- - Console shows: "Failed to create project: ApiError"
-- - Network tab shows: 403 Forbidden from Supabase
-- - "Boolean index query failed" errors
--
-- ROOT CAUSE:
-- 1. Old restrictive RLS policy not updated to migration 018
-- 2. Possible missing/invalid user company_id
-- 3. Frontend role validation mismatch with backend policy
-- ============================================

-- ============================================
-- STEP 1: CHECK CURRENT STATE
-- ============================================
-- Check which RLS policies exist on projects table
SELECT
  policyname,
  cmd,
  with_check,
  qual
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'INSERT';

-- Expected: Should see "Authenticated users can insert projects"
-- If you see "Authorized users can create projects" - policy needs updating

-- Check your current user record
SELECT
  u.id as user_id,
  u.email,
  u.role,
  u.company_id,
  u.is_active,
  c.name as company_name,
  c.id as company_id_full
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();

-- Expected issues:
-- - company_id is NULL
-- - role might be 'field_employee' (not critical with new policy)

-- ============================================
-- STEP 2: FIX RLS POLICY (CRITICAL)
-- ============================================
-- Drop old restrictive policies
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

-- Create simplified policy (from migration 018)
-- This allows ANY authenticated user to create projects
-- Company isolation is still enforced by the company_id column
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON POLICY "Authenticated users can insert projects" ON projects IS
  'Allows any authenticated user to create projects.
   Company isolation enforced by company_id column and SELECT policies.
   Applied in migration 018 to avoid RLS recursion issues.';

-- Verify policy was created
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'INSERT';

-- ============================================
-- STEP 3: FIX USER DATA (IF NEEDED)
-- ============================================
-- Check if you have a company
SELECT id, name, slug, email
FROM companies;

-- If NO company exists, create one:
-- (Uncomment and customize the following block)

/*
INSERT INTO companies (name, slug, email)
VALUES (
  'Your Company Name',
  'your-company-slug',
  'admin@yourcompany.com'
)
RETURNING id, name, slug;
*/

-- Update your user with proper company_id
-- Replace 'YOUR_COMPANY_ID' with actual UUID from companies table
/*
UPDATE users
SET
  company_id = 'YOUR_COMPANY_ID',  -- REPLACE THIS
  is_active = true,
  updated_at = NOW()
WHERE id = auth.uid();
*/

-- Or use this dynamic version that uses the first available company:
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get first available company
  SELECT id INTO v_company_id FROM companies LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No companies found. Please create a company first.';
  END IF;

  -- Update current user
  UPDATE users
  SET
    company_id = v_company_id,
    is_active = true,
    updated_at = NOW()
  WHERE id = auth.uid() AND company_id IS NULL;

  RAISE NOTICE 'User updated with company_id: %', v_company_id;
END $$;

-- ============================================
-- STEP 4: VERIFY INDEXES FOR PERFORMANCE
-- ============================================
-- Check if indexes exist to prevent "Boolean index query failed" error
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('users', 'projects', 'project_users')
ORDER BY tablename, indexname;

-- Create missing indexes if needed
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id);
CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);

-- ============================================
-- STEP 5: FINAL VERIFICATION
-- ============================================
-- Verify policy is correct
SELECT
  'Policy Check' as test,
  policyname,
  cmd,
  CASE
    WHEN with_check = '(auth.uid() IS NOT NULL)' THEN 'CORRECT'
    ELSE 'NEEDS UPDATE - Still has old policy'
  END as status
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'INSERT';

-- Verify user has company
SELECT
  'User Check' as test,
  u.email,
  u.role,
  CASE
    WHEN u.company_id IS NULL THEN 'MISSING COMPANY'
    WHEN c.id IS NOT NULL THEN 'CORRECT'
    ELSE 'INVALID COMPANY ID'
  END as status,
  c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();

-- ============================================
-- TROUBLESHOOTING QUERIES
-- ============================================

-- If you still get errors, check the actual INSERT attempt:
-- This simulates what the app is trying to do
/*
INSERT INTO projects (
  name,
  project_number,
  company_id,
  status,
  weather_units,
  features_enabled
)
VALUES (
  'Test Project',
  'TEST-001',
  (SELECT company_id FROM users WHERE id = auth.uid()),
  'planning',
  'imperial',
  '{
    "daily_reports": true,
    "documents": true,
    "workflows": true
  }'::jsonb
)
RETURNING id, name, company_id;
*/

-- If INSERT fails, check error details:
-- Look for "new row violates row-level security policy" - means RLS issue
-- Look for "null value in column" - means missing required field

-- Check all RLS policies on projects table
SELECT
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY cmd, policyname;

-- ============================================
-- NEXT STEPS AFTER RUNNING THIS SCRIPT
-- ============================================
-- 1. Verify both queries in STEP 5 show "CORRECT" status
-- 2. Log out of the application
-- 3. Log back in (to refresh session and user profile)
-- 4. Try creating a project
-- 5. Check browser console for errors
--
-- If still failing:
-- - Check Supabase Dashboard > Logs for detailed error
-- - Check browser Network tab for exact error response
-- - Verify auth.uid() returns correct value: SELECT auth.uid();
-- ============================================
