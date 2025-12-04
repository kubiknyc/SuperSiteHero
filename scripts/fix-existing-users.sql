-- Quick fix for existing users who can't login
-- This creates user profiles for any auth users that don't have one

-- Step 1: Check current situation
SELECT
  'Auth Users' AS category,
  COUNT(*) AS count
FROM auth.users
UNION ALL
SELECT
  'Profile Users' AS category,
  COUNT(*) AS count
FROM public.users
UNION ALL
SELECT
  'Missing Profiles' AS category,
  COUNT(*) AS count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Step 2: Show which users are missing profiles
SELECT
  au.id,
  au.email,
  au.created_at AS signup_date,
  au.raw_user_meta_data->>'first_name' AS first_name,
  au.raw_user_meta_data->>'last_name' AS last_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Step 3: Create profiles for missing users
-- IMPORTANT: Make sure you have at least one company in the database first!
-- If not, create one:
-- INSERT INTO companies (name, type) VALUES ('Default Company', 'general_contractor');

DO $$
DECLARE
  auth_user RECORD;
  default_company_id UUID;
  users_created INTEGER := 0;
BEGIN
  -- Get the most recent company (or you can specify a specific company_id)
  SELECT id INTO default_company_id
  FROM companies
  ORDER BY created_at DESC
  LIMIT 1;

  IF default_company_id IS NULL THEN
    RAISE NOTICE 'WARNING: No companies found in database. Users will be created without company_id.';
    RAISE NOTICE 'Create a company first with: INSERT INTO companies (name, type) VALUES (''Your Company'', ''general_contractor'');';
  END IF;

  -- Create profiles for each auth user without a profile
  FOR auth_user IN
    SELECT
      au.id,
      au.email,
      au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE pu.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        company_id,
        role,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        auth_user.id,
        auth_user.email,
        COALESCE(auth_user.raw_user_meta_data->>'first_name', ''),
        COALESCE(auth_user.raw_user_meta_data->>'last_name', ''),
        default_company_id,
        'field_employee',  -- Default role, you can update this manually later
        true,
        now(),
        now()
      );

      users_created := users_created + 1;
      RAISE NOTICE 'Created profile for: % (ID: %)', auth_user.email, auth_user.id;

    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for %: %', auth_user.email, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✓ Successfully created % user profile(s)', users_created;
END $$;

-- Step 4: Verify the fix
SELECT
  'After Fix: Auth Users' AS category,
  COUNT(*) AS count
FROM auth.users
UNION ALL
SELECT
  'After Fix: Profile Users' AS category,
  COUNT(*) AS count
FROM public.users
UNION ALL
SELECT
  'After Fix: Still Missing' AS category,
  COUNT(*) AS count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Step 5: Show all users now
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  c.name AS company_name,
  u.is_active,
  u.created_at
FROM public.users u
LEFT JOIN companies c ON c.id = u.company_id
ORDER BY u.created_at DESC;

-- Optional: Update specific user roles
-- UPDATE users SET role = 'superintendent' WHERE email = 'your-admin@example.com';
-- UPDATE users SET role = 'project_manager' WHERE email = 'manager@example.com';
