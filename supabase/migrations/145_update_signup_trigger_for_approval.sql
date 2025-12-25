-- Migration 145: Update Signup Trigger for Approval Flow
-- Description: Modifies handle_new_user() trigger to implement company-based approval workflow
-- - New company users get immediate approval (approval_status='approved', is_active=true, role='owner')
-- - Existing company users require approval (approval_status='pending', is_active=false, role='field_employee')

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with approval workflow logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_company_id UUID;
  new_company_name TEXT;
  company_exists BOOLEAN := FALSE;
  is_first_user BOOLEAN := FALSE;
  new_approval_status approval_status;
  new_is_active BOOLEAN;
  new_role VARCHAR(50);
BEGIN
  -- Extract company name from metadata or use email domain
  new_company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 2)
  );

  -- Trim whitespace for consistent matching
  new_company_name := TRIM(new_company_name);

  -- Check if company exists (case-insensitive, trimmed)
  SELECT id INTO default_company_id
  FROM companies
  WHERE LOWER(TRIM(name)) = LOWER(new_company_name)
  LIMIT 1;

  IF default_company_id IS NULL THEN
    -- Company doesn't exist - create it
    company_exists := FALSE;
    INSERT INTO companies (name, slug, subscription_tier)
    VALUES (
      new_company_name,
      LOWER(REGEXP_REPLACE(new_company_name, '[^a-zA-Z0-9]', '-', 'g')),
      'free'
    )
    RETURNING id INTO default_company_id;

    is_first_user := TRUE;
    RAISE NOTICE 'Created new company: % (id: %)', new_company_name, default_company_id;
  ELSE
    -- Company exists
    company_exists := TRUE;
    is_first_user := FALSE;
    RAISE NOTICE 'User joining existing company: % (id: %)', new_company_name, default_company_id;
  END IF;

  -- Determine approval status, is_active, and role based on whether company is new
  IF company_exists THEN
    -- Existing company - requires admin approval
    new_approval_status := 'pending';
    new_is_active := FALSE;
    new_role := 'field_employee'; -- Default role for pending users
    RAISE NOTICE 'User % requires approval (existing company)', NEW.email;
  ELSE
    -- New company - immediate access as owner/admin
    new_approval_status := 'approved';
    new_is_active := TRUE;
    new_role := 'owner'; -- First user becomes owner
    RAISE NOTICE 'User % approved automatically (new company owner)', NEW.email;
  END IF;

  -- Insert user profile with approval workflow fields
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
    approved_by
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    default_company_id,
    new_role,
    new_is_active,
    new_approval_status,
    -- Set approved_at for auto-approved users (new company owners)
    CASE WHEN new_approval_status = 'approved' THEN NOW() ELSE NULL END,
    -- Set approved_by to self for auto-approved users
    CASE WHEN new_approval_status = 'approved' THEN NEW.id ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
    company_id = COALESCE(EXCLUDED.company_id, users.company_id),
    approval_status = EXCLUDED.approval_status,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  RAISE NOTICE 'Created user profile for: % (company: %, status: %, active: %)',
    NEW.email, default_company_id, new_approval_status, new_is_active;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block auth signup
    RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, anon;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 145 completed successfully';
  RAISE NOTICE 'Updated trigger: on_auth_user_created';
  RAISE NOTICE 'Updated function: public.handle_new_user()';
  RAISE NOTICE 'Approval workflow: ENABLED';
  RAISE NOTICE '  - New companies: immediate approval';
  RAISE NOTICE '  - Existing companies: pending approval';
  RAISE NOTICE '========================================';
END $$;
