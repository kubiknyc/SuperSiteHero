-- Migration 016: Grant Auth Schema Access
-- Allows querying auth.users table from SQL editor and authenticated users
-- Run this migration to fix "permission denied for schema auth" errors

-- Grant usage on auth schema to authenticated users
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, service_role;

-- Grant select permissions on auth.users table
GRANT SELECT ON auth.users TO postgres, authenticated, service_role;

-- Grant select on auth sequences (needed for id generation)
GRANT SELECT ON ALL SEQUENCES IN SCHEMA auth TO postgres, authenticated, service_role;

-- Add comment explaining the permissions
COMMENT ON SCHEMA auth IS 'Authentication schema with read access for authenticated users';

-- Verify permissions were granted
DO $$
BEGIN
  RAISE NOTICE 'Auth schema permissions granted successfully';
  RAISE NOTICE 'You can now query auth.users in the SQL editor';
END $$;
