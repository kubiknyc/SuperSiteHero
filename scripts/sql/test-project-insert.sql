-- Test project insertion directly
-- Run this in Supabase SQL Editor

-- First, check what RLS policies exist
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;

-- Now try to insert as the authenticated user
-- Set the user context
SET LOCAL jwt.claims.sub TO 'ee8b7ed6-b1af-4b46-8ba1-4ea764dcdb45';

-- Check if we can select from users table first
SELECT id, email, company_id, role
FROM public.users
WHERE id = 'ee8b7ed6-b1af-4b46-8ba1-4ea764dcdb45';

-- Try to insert a test project
INSERT INTO public.projects (
  name,
  description,
  company_id,
  status
) VALUES (
  'SQL Test Project',
  'Testing direct SQL insert',
  '3c146527-62a9-4f4d-97db-c7546da9dfed',
  'active'
)
RETURNING *;
