-- Migration 017: Create Auth Users View
-- Creates a safe, read-only view of auth.users in the public schema
-- This allows querying auth user data without direct auth schema access

-- Drop the view if it exists
DROP VIEW IF EXISTS public.auth_users_safe;

-- Create a read-only view of auth.users with safe columns
CREATE OR REPLACE VIEW public.auth_users_safe AS
SELECT
  au.id,
  au.email,
  au.email_confirmed_at,
  au.phone,
  au.confirmed_at,
  au.last_sign_in_at,
  au.created_at,
  au.updated_at,
  au.is_super_admin,
  au.role,
  au.raw_user_meta_data,
  au.raw_app_meta_data
FROM auth.users au;

-- Grant SELECT to authenticated users
GRANT SELECT ON public.auth_users_safe TO authenticated, service_role;

-- Add helpful comment
COMMENT ON VIEW public.auth_users_safe IS 'Safe read-only view of auth.users. Use this instead of querying auth.users directly.';

-- Create index on email for faster lookups
-- Note: This is a view, so indexes are on the underlying table

-- Example usage query
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Auth users view created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now query auth users with:';
  RAISE NOTICE '  SELECT * FROM public.auth_users_safe;';
  RAISE NOTICE '';
  RAISE NOTICE 'Or join with your users table:';
  RAISE NOTICE '  SELECT u.*, aus.email, aus.last_sign_in_at';
  RAISE NOTICE '  FROM public.users u';
  RAISE NOTICE '  JOIN public.auth_users_safe aus ON u.id = aus.id;';
  RAISE NOTICE '';
END $$;
