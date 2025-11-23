-- Check user profile
SELECT
  id,
  email,
  company_id,
  role,
  first_name,
  last_name,
  created_at
FROM public.users
WHERE email = 'kubiknyc@gmail.com';

-- Check company exists
SELECT
  id,
  name,
  email,
  subscription_tier,
  subscription_status
FROM public.companies
WHERE id = '3c146527-62a9-4f4d-97db-c7546da9dfed';

-- Check RLS policies on projects table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projects';
