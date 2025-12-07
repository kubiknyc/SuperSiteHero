-- =============================================
-- VERIFICATION SCRIPT: 403 Project Creation Error
-- =============================================
-- Run this script in Supabase SQL Editor to diagnose the issue
-- Replace 'your-email@example.com' with your actual email
-- =============================================

-- =============================================
-- STEP 1: Check User Record
-- =============================================
\echo '===== STEP 1: User Record Check ====='

SELECT
  u.id,
  u.email,
  u.role,
  u.company_id,
  u.is_active,
  u.first_name,
  u.last_name,
  c.name as company_name,
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'your-email@example.com';  -- CHANGE THIS

-- Expected:
-- - role: should be 'superintendent', 'project_manager', 'owner', or 'admin'
-- - company_id: should be a valid UUID (not NULL)
-- - is_active: should be true
-- - company_name: should show actual company name (not NULL)
-- - updated_at: should be recent if you ran QUICK_FIX_SQL.sql

-- =============================================
-- STEP 2: Check Auth User
-- =============================================
\echo '===== STEP 2: Auth User Check ====='

SELECT
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at,
  au.last_sign_in_at,
  au.raw_user_meta_data
FROM auth.users au
WHERE au.email = 'your-email@example.com';  -- CHANGE THIS

-- Expected:
-- - email_confirmed_at: should not be NULL
-- - last_sign_in_at: should be recent

-- =============================================
-- STEP 3: Check if User ID Matches
-- =============================================
\echo '===== STEP 3: User ID Match Check ====='

SELECT
  au.id as auth_user_id,
  u.id as users_table_id,
  au.email,
  CASE
    WHEN au.id = u.id THEN 'MATCH - Good'
    ELSE 'MISMATCH - ERROR!'
  END as id_match_status
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'your-email@example.com';  -- CHANGE THIS

-- Expected:
-- - id_match_status: should be 'MATCH - Good'
-- - If MISMATCH, the users record doesn't exist or has wrong ID

-- =============================================
-- STEP 4: Check Company Exists
-- =============================================
\echo '===== STEP 4: Company Record Check ====='

SELECT
  c.id,
  c.name,
  c.slug,
  c.email,
  c.is_active,
  c.created_at,
  COUNT(u.id) as user_count
FROM companies c
LEFT JOIN users u ON u.company_id = c.id
GROUP BY c.id, c.name, c.slug, c.email, c.is_active, c.created_at;

-- Expected:
-- - At least one company should exist
-- - user_count should be >= 1
-- - is_active should be true

-- =============================================
-- STEP 5: Check RLS Policies on Projects
-- =============================================
\echo '===== STEP 5: RLS Policies Check ====='

SELECT
  policyname,
  cmd as command,
  permissive,
  with_check,
  CASE
    WHEN cmd = 'INSERT' AND policyname ILIKE '%insert%' THEN 'This is the INSERT policy'
    WHEN cmd = 'SELECT' THEN 'This is the SELECT policy'
    WHEN cmd = 'UPDATE' THEN 'This is the UPDATE policy'
    WHEN cmd = 'DELETE' THEN 'This is the DELETE policy'
    ELSE 'Other policy'
  END as policy_description
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY cmd, policyname;

-- Expected for INSERT:
-- Policy name should be one of:
--   - "Authenticated users can insert projects" (migration 018 - too permissive)
--   - "Authenticated users can insert projects in their company" (migration 046 - correct)

-- =============================================
-- STEP 6: Test INSERT Permission (AS CURRENT USER)
-- =============================================
\echo '===== STEP 6: INSERT Permission Test ====='

-- First, check what auth.uid() returns
SELECT
  auth.uid() as current_user_id,
  auth.email() as current_user_email;

-- Expected:
-- - Should return your user ID and email if you're logged in
-- - If NULL, you're not authenticated (need to use Service Role in Supabase)

-- Now check your user record via RLS
SELECT
  id,
  email,
  role,
  company_id,
  is_active
FROM users
WHERE id = auth.uid();

-- Expected:
-- - Should return your user record
-- - If empty, the SELECT policy is blocking you (RLS issue)

-- =============================================
-- STEP 7: Test Project INSERT (WILL CREATE REAL PROJECT)
-- =============================================
\echo '===== STEP 7: Test Project INSERT ====='
\echo 'WARNING: This will create a real project in your database!'
\echo 'Comment out this section if you do not want to create a test project.'

-- Uncomment to test:
/*
INSERT INTO projects (
  company_id,
  name,
  project_number,
  status,
  created_by
) VALUES (
  (SELECT company_id FROM users WHERE id = auth.uid()),
  'TEST PROJECT - DELETE ME',
  'TEST-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
  'planning',
  auth.uid()
) RETURNING
  id,
  name,
  project_number,
  company_id,
  created_by,
  created_at;
*/

-- If this succeeds:
-- - Database permissions are correct
-- - Issue is in frontend (cached userProfile)
-- - MUST log out and back in to fix

-- If this fails:
-- - Check the error message
-- - Most common errors:
--   - "new row violates row-level security policy" = RLS blocking you
--   - "null value in column 'company_id'" = company_id is NULL
--   - "violates foreign key constraint" = company_id doesn't exist

-- Clean up test project:
/*
DELETE FROM projects WHERE name = 'TEST PROJECT - DELETE ME';
*/

-- =============================================
-- STEP 8: Check Recent Projects
-- =============================================
\echo '===== STEP 8: Recent Projects Check ====='

SELECT
  p.id,
  p.name,
  p.project_number,
  p.status,
  p.company_id,
  c.name as company_name,
  p.created_by,
  u.email as creator_email,
  p.created_at
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
LEFT JOIN users u ON p.created_by = u.id
ORDER BY p.created_at DESC
LIMIT 10;

-- Expected:
-- - Shows recent projects (if any)
-- - Check if your test projects appear here

-- =============================================
-- STEP 9: Check Project User Assignments
-- =============================================
\echo '===== STEP 9: Project Assignments Check ====='

SELECT
  pu.id,
  pu.project_id,
  p.name as project_name,
  pu.user_id,
  u.email as user_email,
  pu.can_edit,
  pu.created_at
FROM project_users pu
JOIN projects p ON pu.project_id = p.id
JOIN users u ON pu.user_id = u.id
WHERE u.email = 'your-email@example.com'  -- CHANGE THIS
ORDER BY pu.created_at DESC
LIMIT 10;

-- Expected:
-- - Shows projects you're assigned to
-- - If empty, you might not be assigned to any projects yet

-- =============================================
-- STEP 10: Check for Migration 046 and 047
-- =============================================
\echo '===== STEP 10: Migration Status Check ====='

-- Check if the helper functions exist
SELECT
  routine_name,
  routine_type,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'auth'
  AND routine_name IN ('user_company_id', 'user_role');

-- Expected if migration 047 applied:
-- - Two rows showing user_company_id and user_role functions
-- - security_type should be 'DEFINER'

-- Expected if migration 047 NOT applied:
-- - Zero rows (functions don't exist)

-- Test the functions (if they exist)
SELECT
  auth.uid() as user_id,
  auth.user_company_id() as company_id,
  auth.user_role() as role;

-- Expected:
-- - Should return your user_id, company_id, and role
-- - If functions don't exist, you'll get "function does not exist" error

-- =============================================
-- DIAGNOSTIC SUMMARY
-- =============================================
\echo '===== DIAGNOSTIC SUMMARY ====='
\echo ''
\echo 'Review the results above and check:'
\echo ''
\echo '1. User Record (Step 1):'
\echo '   - role should be superintendent/project_manager/owner/admin'
\echo '   - company_id should be a valid UUID (not NULL)'
\echo '   - is_active should be true'
\echo ''
\echo '2. Auth User (Step 2):'
\echo '   - email_confirmed_at should not be NULL'
\echo '   - last_sign_in_at should be recent'
\echo ''
\echo '3. ID Match (Step 3):'
\echo '   - Should show "MATCH - Good"'
\echo ''
\echo '4. RLS Policies (Step 5):'
\echo '   - INSERT policy should exist'
\echo '   - Check policy name to see which migration is active'
\echo ''
\echo '5. INSERT Test (Step 7):'
\echo '   - If successful: Frontend issue, MUST log out and back in'
\echo '   - If failed: Check error message'
\echo ''
\echo '6. Migration Status (Step 10):'
\echo '   - If functions exist: Migration 047 is applied'
\echo '   - If functions do not exist: Need to apply migration 047'
\echo ''
\echo '===== NEXT STEPS ====='
\echo ''
\echo 'IF STEP 7 (INSERT TEST) SUCCEEDED:'
\echo '  -> The database is configured correctly'
\echo '  -> The issue is frontend cached data'
\echo '  -> YOU MUST LOG OUT AND BACK IN'
\echo '  -> See IMMEDIATE_FIX_INSTRUCTIONS.md'
\echo ''
\echo 'IF STEP 7 (INSERT TEST) FAILED:'
\echo '  -> Check the error message'
\echo '  -> If "RLS policy" error: Apply migrations 046 and 047'
\echo '  -> If "NULL company_id": Re-run QUICK_FIX_SQL.sql correctly'
\echo '  -> If "foreign key" error: Company record does not exist'
\echo ''
\echo '===== END OF DIAGNOSTIC ====='
