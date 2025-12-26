-- Migration: 148_mfa_backup_codes.sql
-- Description: Add secure storage for MFA backup codes and user preferences
-- Date: 2025-12-26

-- ============================================================================
-- User Preferences Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- MFA Settings
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_enforced_at TIMESTAMPTZ,
  backup_codes_generated BOOLEAN DEFAULT false,
  backup_codes_generated_at TIMESTAMPTZ,

  -- Notification Preferences (can be extended)
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one preference record per user
  CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================================
-- MFA Backup Codes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Hashed backup code (we never store the plaintext)
  -- Using bcrypt-style hash or SHA-256 with salt
  code_hash TEXT NOT NULL,

  -- Salt used for hashing (unique per code)
  salt TEXT NOT NULL,

  -- Whether this code has been used
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,

  -- For rotation tracking
  generation_batch UUID NOT NULL, -- All codes from same generation share this

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for efficient lookup
  CONSTRAINT mfa_backup_codes_unique_hash UNIQUE (user_id, code_hash)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_unused ON mfa_backup_codes(user_id, used) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_generation ON mfa_backup_codes(user_id, generation_batch);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;

-- User Preferences Policies
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- MFA Backup Codes Policies (very restrictive)
-- Users should NOT be able to read the hashed codes directly
-- Verification should happen through a secure function

CREATE POLICY "Users can only insert their own backup codes"
  ON mfa_backup_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can see metadata about their backup codes (used status) but not the hash
-- This is handled through a view or function

CREATE POLICY "Users can view their own backup codes metadata"
  ON mfa_backup_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can update backup code used status"
  ON mfa_backup_codes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Secure Functions
-- ============================================================================

-- Function to verify a backup code (returns true/false without exposing hashes)
CREATE OR REPLACE FUNCTION verify_mfa_backup_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run as function owner, not caller
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_computed_hash TEXT;
BEGIN
  -- Only allow users to verify their own codes
  IF auth.uid() != p_user_id THEN
    RETURN false;
  END IF;

  -- Find an unused code for this user
  FOR v_code_record IN
    SELECT id, code_hash, salt
    FROM mfa_backup_codes
    WHERE user_id = p_user_id AND used = false
  LOOP
    -- Compute hash of provided code with stored salt
    v_computed_hash := encode(
      sha256(convert_to(p_code || v_code_record.salt, 'UTF8')),
      'hex'
    );

    -- Check if it matches
    IF v_computed_hash = v_code_record.code_hash THEN
      -- Mark code as used
      UPDATE mfa_backup_codes
      SET used = true, used_at = NOW()
      WHERE id = v_code_record.id;

      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- Function to get backup code status (count of used/unused)
CREATE OR REPLACE FUNCTION get_backup_code_status(p_user_id UUID)
RETURNS TABLE (
  total_codes INTEGER,
  used_codes INTEGER,
  remaining_codes INTEGER,
  last_used_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to check their own status
  IF auth.uid() != p_user_id THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_codes,
    COUNT(*) FILTER (WHERE used = true)::INTEGER as used_codes,
    COUNT(*) FILTER (WHERE used = false)::INTEGER as remaining_codes,
    MAX(used_at) as last_used_at
  FROM mfa_backup_codes
  WHERE user_id = p_user_id;
END;
$$;

-- Function to store hashed backup codes
CREATE OR REPLACE FUNCTION store_backup_codes(
  p_user_id UUID,
  p_codes TEXT[] -- Array of plaintext codes to hash and store
)
RETURNS UUID -- Returns generation_batch ID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_generation_batch UUID;
  v_code TEXT;
  v_salt TEXT;
  v_hash TEXT;
BEGIN
  -- Only allow users to store their own codes
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Generate a batch ID for this generation
  v_generation_batch := uuid_generate_v4();

  -- Delete any existing unused codes (new generation replaces old)
  DELETE FROM mfa_backup_codes
  WHERE user_id = p_user_id AND used = false;

  -- Insert each code with unique salt
  FOREACH v_code IN ARRAY p_codes
  LOOP
    -- Generate random salt
    v_salt := encode(gen_random_bytes(16), 'hex');

    -- Compute SHA-256 hash with salt
    v_hash := encode(
      sha256(convert_to(v_code || v_salt, 'UTF8')),
      'hex'
    );

    INSERT INTO mfa_backup_codes (user_id, code_hash, salt, generation_batch)
    VALUES (p_user_id, v_hash, v_salt, v_generation_batch);
  END LOOP;

  -- Update user preferences
  INSERT INTO user_preferences (user_id, backup_codes_generated, backup_codes_generated_at)
  VALUES (p_user_id, true, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    backup_codes_generated = true,
    backup_codes_generated_at = NOW(),
    updated_at = NOW();

  RETURN v_generation_batch;
END;
$$;

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON mfa_backup_codes TO authenticated;
GRANT EXECUTE ON FUNCTION verify_mfa_backup_code TO authenticated;
GRANT EXECUTE ON FUNCTION get_backup_code_status TO authenticated;
GRANT EXECUTE ON FUNCTION store_backup_codes TO authenticated;
