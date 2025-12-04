-- Migration: 999_setup_test_user.sql
-- Description: Helper script to set up test users with proper permissions
-- Instructions: Update the variables below with your actual user and company IDs
-- Date: 2025-12-03

-- =============================================
-- STEP 1: Find your auth user ID
-- =============================================
-- Run this query to find your authenticated user ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- =============================================
-- STEP 2: Find or create a company
-- =============================================
-- Check if you have a company:
-- SELECT id, name FROM companies;

-- If no company exists, create one:
/*
INSERT INTO companies (name, slug, email)
VALUES ('My Construction Company', 'my-construction-co', 'admin@mycompany.com')
RETURNING id, name;
*/

-- =============================================
-- STEP 3: Create or update user record
-- =============================================
-- Replace these values with your actual IDs from steps 1 and 2

DO $$
DECLARE
  v_user_id UUID := 'REPLACE_WITH_YOUR_AUTH_USER_ID';  -- From auth.users
  v_company_id UUID := 'REPLACE_WITH_YOUR_COMPANY_ID'; -- From companies table
  v_email TEXT := 'REPLACE_WITH_YOUR_EMAIL';
  v_role TEXT := 'superintendent'; -- Options: superintendent, project_manager, owner, admin
BEGIN
  -- Insert or update user record
  INSERT INTO users (
    id,
    email,
    company_id,
    role,
    first_name,
    last_name,
    is_active
  ) VALUES (
    v_user_id,
    v_email,
    v_company_id,
    v_role,
    'Test',
    'User',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  RAISE NOTICE 'User record created/updated successfully';
END $$;

-- =============================================
-- STEP 4: Verify setup
-- =============================================
-- Run this to verify everything is set up correctly:
SELECT
  u.id,
  u.email,
  u.company_id,
  u.role,
  u.is_active,
  c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();

-- Expected result:
-- - id: matches your auth user ID
-- - email: your email address
-- - company_id: valid UUID (not null)
-- - role: one of: superintendent, project_manager, owner, admin
-- - is_active: true
-- - company_name: your company name (not null)

-- =============================================
-- ALTERNATIVE: Auto-create users on signup
-- =============================================
-- If you want to automatically create user records for all new signups,
-- uncomment and run this trigger:

/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    'field_employee',  -- Default role, update manually for admins/superintendents
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block auth signup
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/

-- =============================================
-- TROUBLESHOOTING
-- =============================================

-- Problem: "No company ID found" error
-- Solution: Ensure user has company_id:
/*
UPDATE users
SET company_id = 'YOUR_COMPANY_ID'
WHERE id = 'YOUR_USER_ID';
*/

-- Problem: "Your role does not have permission" error
-- Solution: Update user role to allowed value:
/*
UPDATE users
SET role = 'superintendent'  -- or project_manager, owner, admin
WHERE id = 'YOUR_USER_ID';
*/

-- Problem: "User profile not found" error
-- Solution: Create user record (use Step 3 above)

-- Problem: RLS policy blocking access
-- Solution: Check if RLS policies are enabled:
/*
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'projects';
*/
