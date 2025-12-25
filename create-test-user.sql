-- Create Test User Account
-- Email: kubiknyc@gmail.com
-- Password: Alfa1346!

-- Step 1: Create auth user (this will trigger the signup flow)
-- Note: Run this in Supabase SQL Editor

-- First, let's create a test company if it doesn't exist
INSERT INTO companies (id, name, created_at, updated_at)
VALUES (
  'test-company-001',
  'Test Company',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Create the auth user and profile
-- Note: In production, use the signup form. This is for testing only.
-- You'll need to set the password in Supabase Dashboard > Authentication > Users

-- Check if user already exists
DO $$
BEGIN
  -- This will show if user exists
  RAISE NOTICE 'Checking for existing user with email: kubiknyc@gmail.com';
END $$;

SELECT
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'kubiknyc@gmail.com';

-- If no results above, the user doesn't exist yet.
-- You'll need to create it via the signup form or Supabase Dashboard.
