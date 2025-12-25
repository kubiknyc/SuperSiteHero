-- Debug version of the trigger to see actual errors
-- Remove exception handler to see what's failing

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create or replace the function WITHOUT exception handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_company_id UUID;
BEGIN
  -- Get the most recent company as default
  SELECT id INTO default_company_id
  FROM public.companies
  ORDER BY created_at DESC
  LIMIT 1;

  -- Log for debugging
  RAISE NOTICE 'Creating user profile for: %, company: %', NEW.email, default_company_id;

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
    default_company_id,
    'field_employee',
    true
  );

  RAISE NOTICE 'Successfully created profile for: %', NEW.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
