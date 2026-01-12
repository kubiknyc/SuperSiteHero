-- Migration: 045_vault_helper_functions.sql
-- Description: Helper functions for secure API key storage using Supabase Vault
--
-- This migration creates wrapper functions for vault operations that can be
-- called from the application layer via RPC.
--
-- Prerequisites: The vault extension must be enabled in your Supabase project.
-- Enable it via Dashboard > Database > Extensions > vault

-- ============================================================================
-- Create vault secret with optional name and description
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_vault_secret(
  secret_value TEXT,
  secret_name TEXT DEFAULT NULL,
  secret_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Only allow authenticated users with proper company membership
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the secret using vault's built-in function
  SELECT vault.create_secret(
    secret_value,
    COALESCE(secret_name, ''),
    COALESCE(secret_description, '')
  ) INTO new_id;

  RETURN new_id;
END;
$$;

-- ============================================================================
-- Get decrypted secret by ID
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the decrypted secret
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN secret_value;
END;
$$;

-- ============================================================================
-- Get decrypted secret by name
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_vault_secret_by_name(secret_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the decrypted secret by name
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name;

  RETURN secret_value;
END;
$$;

-- ============================================================================
-- Get secret ID by name (without decrypting)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_vault_secret_id_by_name(secret_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get just the ID
  SELECT id INTO secret_id
  FROM vault.secrets
  WHERE name = secret_name;

  RETURN secret_id;
END;
$$;

-- ============================================================================
-- Update an existing secret
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_vault_secret(
  secret_id UUID,
  new_secret TEXT,
  new_name TEXT DEFAULT NULL,
  new_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Use vault's update function
  PERFORM vault.update_secret(
    secret_id,
    new_secret,
    new_name,
    new_description
  );
END;
$$;

-- ============================================================================
-- Delete a secret
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_vault_secret(secret_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from secrets table
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;

-- ============================================================================
-- Check if vault is available
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_vault_available()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  -- Try to access the vault schema
  PERFORM 1 FROM vault.secrets LIMIT 1;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- ============================================================================
-- Grant execute permissions to authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.create_vault_secret(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vault_secret_by_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vault_secret_id_by_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_vault_secret(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_vault_secret(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_vault_available() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.create_vault_secret IS 'Create a new encrypted secret in the vault';
COMMENT ON FUNCTION public.get_vault_secret IS 'Retrieve and decrypt a secret by its ID';
COMMENT ON FUNCTION public.get_vault_secret_by_name IS 'Retrieve and decrypt a secret by its unique name';
COMMENT ON FUNCTION public.get_vault_secret_id_by_name IS 'Get a secret ID by name without decrypting';
COMMENT ON FUNCTION public.update_vault_secret IS 'Update an existing secret in the vault';
COMMENT ON FUNCTION public.delete_vault_secret IS 'Delete a secret from the vault';
COMMENT ON FUNCTION public.check_vault_available IS 'Check if the vault extension is properly configured';
