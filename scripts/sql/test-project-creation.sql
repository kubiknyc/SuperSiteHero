-- Verify the RLS policy was updated correctly
-- Run this in Supabase SQL Editor to test

-- 1. Check current RLS policies on projects table
SELECT
  policyname,
  cmd,
  with_check::text as with_check_condition
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT';

-- Expected: Should show policy "Authenticated users can insert projects"
-- with with_check: (auth.uid() IS NOT NULL)

-- 2. Verify user exists and has company_id
SELECT
  id,
  email,
  company_id,
  role
FROM public.users
WHERE email = 'kubiknyc@gmail.com';

-- Expected: Should return user with company_id

-- 3. Verify company exists
SELECT
  id,
  name,
  email
FROM public.companies
WHERE id = '3c146527-62a9-4f4d-97db-c7546da9dfed';

-- Expected: Should return "My Construction Company"

-- 4. Test project insertion (simulating what the app does)
-- This simulates an authenticated user creating a project
INSERT INTO public.projects (
  name,
  description,
  company_id,
  status
) VALUES (
  'CLI Test Project',
  'Testing project creation via SQL',
  '3c146527-62a9-4f4d-97db-c7546da9dfed',
  'active'
)
RETURNING id, name, company_id, status, created_at;

-- Expected: Should successfully insert and return the project details

-- 5. Verify the project was created
SELECT
  id,
  name,
  description,
  company_id,
  status,
  created_at
FROM public.projects
WHERE name = 'CLI Test Project';

-- Expected: Should show the newly created project
