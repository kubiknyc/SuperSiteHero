-- Migration: Enable automatic user profile creation
-- This trigger creates a user profile in public.users table when someone signs up via Supabase Auth
-- Fixes the login issue where users can't login because their profile doesn't exist

-- =============================================
-- FUNCTION: Auto-create user profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_company_id UUID;
BEGIN
  -- Try to find an existing company to assign the user to
  -- In production, you might want different logic here (e.g., from signup form data)
  SELECT id INTO default_company_id
  FROM companies
  ORDER BY created_at DESC
  LIMIT 1;

  -- Insert user profile
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
    default_company_id,  -- Assign to a company (may be NULL if no companies exist)
    'field_employee',     -- Default role, can be updated later
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block auth signup
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGER: Execute function on auth.users INSERT
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- BACKFILL: Create profiles for existing auth users
-- =============================================
-- This handles users who signed up before the trigger was enabled
DO $$
DECLARE
  auth_user RECORD;
  default_company_id UUID;
BEGIN
  -- Get default company
  SELECT id INTO default_company_id
  FROM companies
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create profiles for auth users that don't have a profile yet
  FOR auth_user IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE pu.id IS NULL
  LOOP
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
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'first_name', ''),
      COALESCE(auth_user.raw_user_meta_data->>'last_name', ''),
      default_company_id,
      'field_employee',
      true
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Created profile for user: %', auth_user.email;
  END LOOP;
END $$;

-- =============================================
-- VERIFICATION
-- =============================================
-- Check if trigger was created successfully
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check user counts
SELECT
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM public.users) AS profile_users_count,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) AS missing_profiles_count;
