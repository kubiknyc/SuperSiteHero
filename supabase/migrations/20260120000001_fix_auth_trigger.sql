-- Migration: Fix authentication trigger for user profile creation
-- This migration ensures the handle_new_user() trigger works correctly:
-- 1. Creates approval_status enum if it doesn't exist
-- 2. Creates company from signup metadata if it doesn't exist
-- 3. Sets first company user as owner with approved status
-- 4. Sets subsequent users as pending approval
-- 5. Backfills any orphaned auth.users

-- ============================================
-- Step 1: Ensure approval_status enum exists
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
    RAISE NOTICE 'Created approval_status enum type';
  ELSE
    RAISE NOTICE 'approval_status enum already exists';
  END IF;
END $$;

-- ============================================
-- Step 2: Ensure users table has approval columns
-- ============================================
DO $$
BEGIN
  -- Add approval_status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN approval_status approval_status DEFAULT 'pending';
    RAISE NOTICE 'Added approval_status column';
  END IF;

  -- Add approved_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN approved_at TIMESTAMPTZ;
    RAISE NOTICE 'Added approved_at column';
  END IF;

  -- Add approved_by column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.users ADD COLUMN approved_by UUID REFERENCES public.users(id);
    RAISE NOTICE 'Added approved_by column';
  END IF;
END $$;

-- ============================================
-- Step 3: Drop existing trigger and function
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================
-- Step 4: Create improved handle_new_user function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id UUID;
  v_company_name TEXT;
  v_is_new_company BOOLEAN := FALSE;
  v_approval_status TEXT;
  v_is_active BOOLEAN;
  v_role TEXT;
BEGIN
  -- Extract company name from metadata (from signup form) or fallback to email domain
  v_company_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'company_name'), ''),
    split_part(NEW.email, '@', 2)
  );

  -- Try to find existing company (case-insensitive)
  SELECT id INTO v_company_id
  FROM companies
  WHERE LOWER(TRIM(name)) = LOWER(v_company_name)
  LIMIT 1;

  IF v_company_id IS NULL THEN
    -- Company doesn't exist - create it
    v_is_new_company := TRUE;

    INSERT INTO companies (
      name,
      slug,
      subscription_tier,
      subscription_status,
      created_at,
      updated_at
    )
    VALUES (
      v_company_name,
      LOWER(REGEXP_REPLACE(v_company_name, '[^a-zA-Z0-9]+', '-', 'g')),
      'free',
      'active',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_company_id;

    RAISE NOTICE 'Created new company: % (id: %)', v_company_name, v_company_id;
  ELSE
    RAISE NOTICE 'Found existing company: % (id: %)', v_company_name, v_company_id;
  END IF;

  -- Determine user status based on whether they're creating a new company
  IF v_is_new_company THEN
    -- First user of new company: auto-approved as owner
    v_approval_status := 'approved';
    v_is_active := TRUE;
    v_role := 'owner';
    RAISE NOTICE 'User % is first user of new company - auto-approved as owner', NEW.email;
  ELSE
    -- Joining existing company: requires approval
    v_approval_status := 'pending';
    v_is_active := FALSE;
    v_role := 'field_employee';
    RAISE NOTICE 'User % joining existing company - pending approval', NEW.email;
  END IF;

  -- Insert user profile
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    company_id,
    role,
    is_active,
    approval_status,
    approved_at,
    approved_by,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), ''),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), ''),
    v_company_id,
    v_role,
    v_is_active,
    v_approval_status::approval_status,
    CASE WHEN v_approval_status = 'approved' THEN NOW() ELSE NULL END,
    CASE WHEN v_approval_status = 'approved' THEN NEW.id ELSE NULL END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
    company_id = COALESCE(EXCLUDED.company_id, users.company_id),
    updated_at = NOW();

  RAISE NOTICE 'Created/updated user profile: % (company: %, status: %, role: %)',
    NEW.email, v_company_id, v_approval_status, v_role;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block auth signup
    RAISE WARNING 'Failed to create user profile for %: % (SQLSTATE: %)',
      NEW.email, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, anon, service_role;

-- ============================================
-- Step 5: Create trigger
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Step 6: Backfill orphaned auth users
-- ============================================
DO $$
DECLARE
  v_auth_user RECORD;
  v_company_id UUID;
  v_company_name TEXT;
  v_is_new_company BOOLEAN;
  v_count INTEGER := 0;
BEGIN
  FOR v_auth_user IN
    SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE pu.id IS NULL
  LOOP
    -- Extract company name
    v_company_name := COALESCE(
      NULLIF(TRIM(v_auth_user.raw_user_meta_data->>'company_name'), ''),
      split_part(v_auth_user.email, '@', 2)
    );

    -- Find or create company
    SELECT id INTO v_company_id
    FROM companies
    WHERE LOWER(TRIM(name)) = LOWER(v_company_name)
    LIMIT 1;

    IF v_company_id IS NULL THEN
      v_is_new_company := TRUE;
      INSERT INTO companies (name, slug, subscription_tier, subscription_status, created_at, updated_at)
      VALUES (
        v_company_name,
        LOWER(REGEXP_REPLACE(v_company_name, '[^a-zA-Z0-9]+', '-', 'g')),
        'free',
        'active',
        NOW(),
        NOW()
      )
      RETURNING id INTO v_company_id;
    ELSE
      v_is_new_company := FALSE;
    END IF;

    -- Create user profile (backfilled users get approved status to avoid lockout)
    INSERT INTO public.users (
      id, email, first_name, last_name, company_id, role,
      is_active, approval_status, approved_at, created_at, updated_at
    )
    VALUES (
      v_auth_user.id,
      v_auth_user.email,
      COALESCE(NULLIF(TRIM(v_auth_user.raw_user_meta_data->>'first_name'), ''), ''),
      COALESCE(NULLIF(TRIM(v_auth_user.raw_user_meta_data->>'last_name'), ''), ''),
      v_company_id,
      CASE WHEN v_is_new_company THEN 'owner' ELSE 'field_employee' END,
      TRUE, -- Backfilled users are active
      'approved', -- Backfilled users are approved to avoid lockout
      NOW(),
      COALESCE(v_auth_user.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    v_count := v_count + 1;
    RAISE NOTICE 'Backfilled user: % (company: %)', v_auth_user.email, v_company_name;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE 'Backfilled % orphaned user(s)', v_count;
  ELSE
    RAISE NOTICE 'No orphaned users found';
  END IF;
END $$;

-- ============================================
-- Step 7: Verification
-- ============================================
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_orphan_count INTEGER;
BEGIN
  -- Check trigger exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth'
  ) INTO v_trigger_exists;

  -- Count orphaned users
  SELECT COUNT(*) INTO v_orphan_count
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 20260120000001 completed';
  RAISE NOTICE 'Trigger exists: %', v_trigger_exists;
  RAISE NOTICE 'Orphaned users remaining: %', v_orphan_count;
  RAISE NOTICE '========================================';
END $$;
