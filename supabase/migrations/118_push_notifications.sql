-- Migration: 118_push_notifications.sql
-- Description: Add push notification subscriptions table and preferences
-- Date: 2024-12-14
-- Features: Web Push API subscriptions, push preferences, notification delivery tracking

-- =============================================
-- PUSH SUBSCRIPTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Web Push subscription data
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  expiration_time TIMESTAMPTZ,

  -- Device/browser info
  user_agent TEXT,
  device_name VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per user+endpoint combination
  CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint)
);

-- =============================================
-- PUSH NOTIFICATION LOG TABLE
-- =============================================

-- Track push notification delivery for debugging and analytics
CREATE TABLE IF NOT EXISTS push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification content
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,

  -- Related entity
  related_to_type VARCHAR(50),
  related_to_id UUID,

  -- Delivery status
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, clicked, dismissed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Metadata
  payload JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- Push subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON push_subscriptions(endpoint);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
  ON push_subscriptions(user_id, is_active)
  WHERE is_active = true;

-- Push notification logs indexes
CREATE INDEX IF NOT EXISTS idx_push_logs_user_created
  ON push_notification_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_logs_status
  ON push_notification_logs(status)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_push_logs_subscription
  ON push_notification_logs(subscription_id);

CREATE INDEX IF NOT EXISTS idx_push_logs_type
  ON push_notification_logs(notification_type);

-- =============================================
-- ADD PUSH PREFERENCES TO USERS TABLE
-- =============================================

-- Add push_notification_preferences column to users if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'push_notification_preferences'
  ) THEN
    ALTER TABLE users
    ADD COLUMN push_notification_preferences JSONB DEFAULT NULL;
  END IF;
END $$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;

-- Push subscriptions: users can manage their own subscriptions
CREATE POLICY "Users can view their own push subscriptions" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own push subscriptions" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Service role can manage all subscriptions (for push service)
CREATE POLICY "Service role can manage all push subscriptions" ON push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Push notification logs: users can view their own logs
CREATE POLICY "Users can view their own push logs" ON push_notification_logs
  FOR SELECT USING (user_id = auth.uid());

-- Service role can manage all logs
CREATE POLICY "Service role can manage all push logs" ON push_notification_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to get active subscriptions for a user
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  endpoint TEXT,
  p256dh_key TEXT,
  auth_key TEXT,
  user_agent TEXT,
  device_name VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key,
    ps.user_agent,
    ps.device_name
  FROM push_subscriptions ps
  WHERE ps.user_id = target_user_id
    AND ps.is_active = true
    AND (ps.expiration_time IS NULL OR ps.expiration_time > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark subscription as used
CREATE OR REPLACE FUNCTION mark_push_subscription_used(subscription_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE push_subscriptions
  SET last_used_at = NOW(), failure_count = 0
  WHERE id = subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment subscription failure count
CREATE OR REPLACE FUNCTION increment_push_failure(subscription_id UUID)
RETURNS void AS $$
DECLARE
  current_failures INTEGER;
BEGIN
  UPDATE push_subscriptions
  SET failure_count = failure_count + 1
  WHERE id = subscription_id
  RETURNING failure_count INTO current_failures;

  -- Deactivate subscription after 5 consecutive failures
  IF current_failures >= 5 THEN
    UPDATE push_subscriptions
    SET is_active = false
    WHERE id = subscription_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log push notification
CREATE OR REPLACE FUNCTION log_push_notification(
  p_subscription_id UUID,
  p_user_id UUID,
  p_notification_type VARCHAR(50),
  p_title VARCHAR(255),
  p_body TEXT,
  p_related_to_type VARCHAR(50) DEFAULT NULL,
  p_related_to_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO push_notification_logs (
    subscription_id,
    user_id,
    notification_type,
    title,
    body,
    related_to_type,
    related_to_id,
    payload,
    status
  ) VALUES (
    p_subscription_id,
    p_user_id,
    p_notification_type,
    p_title,
    p_body,
    p_related_to_type,
    p_related_to_id,
    p_payload,
    'pending'
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update push notification status
CREATE OR REPLACE FUNCTION update_push_notification_status(
  p_log_id UUID,
  p_status VARCHAR(20),
  p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE push_notification_logs
  SET
    status = p_status,
    error_message = COALESCE(p_error_message, error_message),
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    clicked_at = CASE WHEN p_status = 'clicked' THEN NOW() ELSE clicked_at END,
    dismissed_at = CASE WHEN p_status = 'dismissed' THEN NOW() ELSE dismissed_at END
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old push notification logs (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_push_logs(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM push_notification_logs
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired/inactive subscriptions
CREATE OR REPLACE FUNCTION cleanup_expired_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM push_subscriptions
  WHERE is_active = false
    OR (expiration_time IS NOT NULL AND expiration_time < NOW() - INTERVAL '7 days');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at on push_subscriptions
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_push_subscription_timestamp ON push_subscriptions;
CREATE TRIGGER trigger_update_push_subscription_timestamp
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_timestamp();

-- =============================================
-- ENABLE REALTIME FOR SUBSCRIPTIONS
-- =============================================

-- Note: Enable realtime if needed for live updates
-- ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 118_push_notifications completed successfully';
  RAISE NOTICE 'Created tables: push_subscriptions, push_notification_logs';
  RAISE NOTICE 'Added column: users.push_notification_preferences';
  RAISE NOTICE 'Created functions: get_user_push_subscriptions, mark_push_subscription_used, increment_push_failure, log_push_notification, update_push_notification_status, cleanup_old_push_logs, cleanup_expired_push_subscriptions';
END $$;
