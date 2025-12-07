-- ============================================
-- QUICK FIX: PROJECT CREATION 403 ERROR
-- ============================================
-- Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================

-- STEP 1: Drop old restrictive policies
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

-- STEP 2: Create new simplified policy (from migration 018)
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- STEP 3: Fix user data (assign to first company if missing)
DO $$
DECLARE
  v_company_id UUID;
  v_user_count INT;
BEGIN
  -- Get first available company
  SELECT id INTO v_company_id FROM companies LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No companies found. Please create a company first.';
  END IF;

  -- Update users with missing company_id
  UPDATE users
  SET
    company_id = v_company_id,
    is_active = true,
    updated_at = NOW()
  WHERE company_id IS NULL;

  GET DIAGNOSTICS v_user_count = ROW_COUNT;

  RAISE NOTICE 'Updated % users with company_id: %', v_user_count, v_company_id;
END $$;

-- STEP 4: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id);
CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);

-- STEP 5: Verification queries
SELECT
  'Policy Check' as test,
  policyname,
  cmd,
  CASE
    WHEN with_check::text = '(auth.uid() IS NOT NULL)' THEN '✅ CORRECT'
    ELSE '❌ NEEDS UPDATE'
  END as status
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'INSERT';

-- Check user data
SELECT
  'User Check' as test,
  u.email,
  u.role,
  CASE
    WHEN u.company_id IS NULL THEN '❌ MISSING COMPANY'
    WHEN c.id IS NOT NULL THEN '✅ CORRECT'
    ELSE '❌ INVALID COMPANY ID'
  END as status,
  c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
LIMIT 5;
