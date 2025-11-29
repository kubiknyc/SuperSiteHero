-- Migration: 033_email_logs
-- Description: Create email_logs table for tracking email delivery
-- Created: 2025-11-29

-- ============================================================================
-- EMAIL LOGS TABLE
-- ============================================================================
-- Tracks all emails sent through the system for debugging and support

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient information
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Email details
  template_name TEXT NOT NULL DEFAULT 'custom',
  subject TEXT NOT NULL,

  -- Delivery status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed', 'complained')),
  resend_id TEXT, -- Resend message ID for tracking
  error_message TEXT,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for looking up emails by recipient
CREATE INDEX idx_email_logs_recipient_email ON email_logs(recipient_email);

-- Index for looking up emails by user
CREATE INDEX idx_email_logs_recipient_user_id ON email_logs(recipient_user_id) WHERE recipient_user_id IS NOT NULL;

-- Index for filtering by status
CREATE INDEX idx_email_logs_status ON email_logs(status);

-- Index for recent emails (dashboard/debugging)
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);

-- Index for Resend message ID lookups (webhook processing)
CREATE INDEX idx_email_logs_resend_id ON email_logs(resend_id) WHERE resend_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_email_logs_user_created ON email_logs(recipient_user_id, created_at DESC) WHERE recipient_user_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own email logs
CREATE POLICY "Users can view own email logs"
  ON email_logs FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role has full access to email logs"
  ON email_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Company admins can view all email logs for their company's users
-- This requires joining with users table, implemented as a function below

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get email delivery stats for a user
CREATE OR REPLACE FUNCTION get_user_email_stats(p_user_id UUID)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_bounced BIGINT,
  total_failed BIGINT,
  delivery_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT as total_delivered,
    COUNT(*) FILTER (WHERE status = 'bounced')::BIGINT as total_bounced,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as total_failed,
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE status IN ('sent', 'delivered'))::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as delivery_rate
  FROM email_logs
  WHERE recipient_user_id = p_user_id
    AND deleted_at IS NULL;
END;
$$;

-- Function to get recent emails for a user (for notification center)
CREATE OR REPLACE FUNCTION get_recent_emails(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  template_name TEXT,
  subject TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.id,
    el.template_name,
    el.subject,
    el.status,
    el.created_at
  FROM email_logs el
  WHERE el.recipient_user_id = p_user_id
    AND el.deleted_at IS NULL
  ORDER BY el.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE email_logs IS 'Tracks all emails sent through the system for debugging, analytics, and compliance';
COMMENT ON COLUMN email_logs.resend_id IS 'Message ID from Resend API for tracking delivery status via webhooks';
COMMENT ON COLUMN email_logs.metadata IS 'Additional data like recipient count, attachment info, tags, etc.';
COMMENT ON COLUMN email_logs.status IS 'Email delivery status: pending, sent, delivered, bounced, failed, complained';
