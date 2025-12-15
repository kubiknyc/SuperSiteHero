-- Migration: 120_biometric_credentials.sql
-- Description: Add biometric authentication support using WebAuthn
-- Created: 2024-12-14

-- Create biometric_credentials table
CREATE TABLE IF NOT EXISTS biometric_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    device_name TEXT NOT NULL DEFAULT 'Unknown Device',
    transports TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used TIMESTAMPTZ,

    -- Indexes
    CONSTRAINT biometric_credentials_credential_id_unique UNIQUE (credential_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user_id
    ON biometric_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_credential_id
    ON biometric_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_last_used
    ON biometric_credentials(last_used DESC NULLS LAST);

-- Add biometric settings to user_preferences table if it exists
-- If user_preferences doesn't exist, create it
DO $$
BEGIN
    -- Check if user_preferences table exists
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'user_preferences'
    ) THEN
        CREATE TABLE user_preferences (
            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            biometric_enabled BOOLEAN DEFAULT FALSE,
            biometric_reauth_interval TEXT DEFAULT '1hour',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    ELSE
        -- Add biometric columns if they don't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'user_preferences'
            AND column_name = 'biometric_enabled'
        ) THEN
            ALTER TABLE user_preferences
            ADD COLUMN biometric_enabled BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'user_preferences'
            AND column_name = 'biometric_reauth_interval'
        ) THEN
            ALTER TABLE user_preferences
            ADD COLUMN biometric_reauth_interval TEXT DEFAULT '1hour';
        END IF;
    END IF;
END $$;

-- Enable RLS on biometric_credentials
ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own credentials
CREATE POLICY biometric_credentials_select_own
    ON biometric_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own credentials
CREATE POLICY biometric_credentials_insert_own
    ON biometric_credentials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own credentials
CREATE POLICY biometric_credentials_update_own
    ON biometric_credentials
    FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own credentials
CREATE POLICY biometric_credentials_delete_own
    ON biometric_credentials
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS for user_preferences (if not already set)
DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'user_preferences'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Create policies if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_preferences'
        AND policyname = 'user_preferences_select_own'
    ) THEN
        CREATE POLICY user_preferences_select_own
            ON user_preferences
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_preferences'
        AND policyname = 'user_preferences_insert_own'
    ) THEN
        CREATE POLICY user_preferences_insert_own
            ON user_preferences
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_preferences'
        AND policyname = 'user_preferences_update_own'
    ) THEN
        CREATE POLICY user_preferences_update_own
            ON user_preferences
            FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create a function to clean up old unused credentials (optional scheduled job)
CREATE OR REPLACE FUNCTION cleanup_unused_biometric_credentials()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete credentials not used in the last 365 days
    DELETE FROM biometric_credentials
    WHERE last_used < NOW() - INTERVAL '365 days'
    OR (last_used IS NULL AND created_at < NOW() - INTERVAL '30 days');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for edge function)
GRANT EXECUTE ON FUNCTION cleanup_unused_biometric_credentials() TO authenticated;

-- Create audit log table for biometric events (optional but recommended for security)
CREATE TABLE IF NOT EXISTS biometric_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT,
    event_type TEXT NOT NULL, -- 'registration', 'authentication', 'deletion', 'failure'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_biometric_audit_log_user_id
    ON biometric_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_audit_log_created_at
    ON biometric_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biometric_audit_log_event_type
    ON biometric_audit_log(event_type);

-- Enable RLS on audit log
ALTER TABLE biometric_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own audit logs
CREATE POLICY biometric_audit_log_select_own
    ON biometric_audit_log
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can insert audit logs
CREATE POLICY biometric_audit_log_insert_service
    ON biometric_audit_log
    FOR INSERT
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE biometric_credentials IS 'Stores WebAuthn credentials for biometric authentication';
COMMENT ON COLUMN biometric_credentials.credential_id IS 'Base64URL-encoded credential ID from WebAuthn';
COMMENT ON COLUMN biometric_credentials.public_key IS 'Base64URL-encoded public key for verification';
COMMENT ON COLUMN biometric_credentials.transports IS 'Array of authenticator transports (usb, nfc, ble, internal)';
COMMENT ON TABLE biometric_audit_log IS 'Audit log for biometric authentication events';
