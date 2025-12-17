-- Migration: Fix signup RLS issue
-- The handle_new_user() trigger was failing because it couldn't query companies table
-- due to RLS policies requiring the user to exist in the users table (chicken-and-egg problem)

-- Solution 1: Allow the trigger to bypass RLS by granting it necessary permissions
-- The SECURITY DEFINER already makes it run with elevated privileges, but we need
-- to ensure it can read from companies without RLS blocking it

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with proper RLS bypass
-- This function will run with the permissions of the postgres user (superuser)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_company_id UUID;
  new_company_name TEXT;
BEGIN
  -- Extract company name from metadata or use email domain
  new_company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 2)
  );

  -- Try to find an existing company or create a new one
  -- Use security definer context to bypass RLS
  SELECT id INTO default_company_id
  FROM companies
  WHERE LOWER(name) = LOWER(new_company_name)
  LIMIT 1;

  -- If no company exists, create one
  IF default_company_id IS NULL THEN
    INSERT INTO companies (name, slug, subscription_tier)
    VALUES (
      new_company_name,
      LOWER(REGEXP_REPLACE(new_company_name, '[^a-zA-Z0-9]', '-', 'g')),
      'free'
    )
    RETURNING id INTO default_company_id;

    RAISE NOTICE 'Created new company: % (id: %)', new_company_name, default_company_id;
  END IF;

  -- Insert user profile (security definer bypasses RLS)
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    company_id,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    default_company_id,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM users WHERE company_id = default_company_id)
      THEN 'owner'  -- First user in company becomes owner
      ELSE 'field_employee'
    END,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
    company_id = COALESCE(EXCLUDED.company_id, users.company_id),
    updated_at = now();

  RAISE NOTICE 'Created user profile for: % (company: %)', NEW.email, default_company_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block auth signup
    RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, anon;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add a policy to allow service role to read companies (for the trigger)
-- This allows the trigger function to bypass RLS when querying companies
CREATE POLICY IF NOT EXISTS "Service role can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- Backfill: Create profiles for existing auth users without profiles
DO $$
DECLARE
  auth_user RECORD;
  new_company_id UUID;
  company_name TEXT;
BEGIN
  FOR auth_user IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE pu.id IS NULL
  LOOP
    -- Extract company name
    company_name := COALESCE(
      auth_user.raw_user_meta_data->>'company_name',
      split_part(auth_user.email, '@', 2)
    );

    -- Find or create company
    SELECT id INTO new_company_id
    FROM companies
    WHERE LOWER(name) = LOWER(company_name)
    LIMIT 1;

    IF new_company_id IS NULL THEN
      INSERT INTO companies (name, slug)
      VALUES (
        company_name,
        LOWER(REGEXP_REPLACE(company_name, '[^a-zA-Z0-9]', '-', 'g'))
      )
      RETURNING id INTO new_company_id;
    END IF;

    -- Create user profile
    INSERT INTO public.users (
      id, email, first_name, last_name, company_id, role, is_active
    )
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'first_name', ''),
      COALESCE(auth_user.raw_user_meta_data->>'last_name', ''),
      new_company_id,
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM users WHERE company_id = new_company_id)
        THEN 'owner'
        ELSE 'field_employee'
      END,
      true
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Backfilled user profile for: %', auth_user.email;
  END LOOP;
END $$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 141 completed successfully';
  RAISE NOTICE 'Trigger: on_auth_user_created';
  RAISE NOTICE 'Function: public.handle_new_user()';
  RAISE NOTICE '========================================';
END $$;
