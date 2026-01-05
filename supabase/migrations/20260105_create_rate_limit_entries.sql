-- Migration: Create rate_limit_entries table
-- Description: Table for storing rate limit entries for authentication endpoints
-- Date: 2026-01-05

-- Create the rate_limit_entries table
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  action TEXT NOT NULL,
  identifier TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_key ON rate_limit_entries (key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_created_at ON rate_limit_entries (created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_key_created ON rate_limit_entries (key, created_at);

-- Add comment
COMMENT ON TABLE rate_limit_entries IS 'Stores rate limit entries for authentication endpoints (login, signup, password_reset, mfa_verify)';

-- Create a function to clean up old entries (can be called by pg_cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries(max_age_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_entries
  WHERE created_at < NOW() - (max_age_hours || ' hours')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access this table
CREATE POLICY "Service role only" ON rate_limit_entries
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON rate_limit_entries TO service_role;

-- Create security_events table if it doesn't exist (for session hijacking detection)
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for security_events
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events (user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events (created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events (event_type);

-- Enable RLS on security_events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Users can only read their own security events
CREATE POLICY "Users can read own security events" ON security_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert security events
CREATE POLICY "Service role can insert security events" ON security_events
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE security_events IS 'Stores security-related events like session warnings and suspicious activity';
