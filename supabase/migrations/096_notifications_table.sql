-- Migration: 096_notifications_table.sql
-- Description: Add notifications table for in-app and email notifications
-- Date: 2024-12-10
-- Features: Multi-channel notifications, read status tracking, soft delete

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification content
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Related entity (polymorphic)
  related_to_type VARCHAR(50),
  related_to_id UUID,

  -- Action URL for navigation
  action_url TEXT,

  -- Additional data
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES
-- =============================================

-- Primary query: get user's notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Get unread notifications count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE deleted_at IS NULL AND is_read = false;

-- Filter by type
CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications(type);

-- Related entity lookup
CREATE INDEX IF NOT EXISTS idx_notifications_related
  ON notifications(related_to_type, related_to_id)
  WHERE related_to_id IS NOT NULL;

-- Cleanup query for old notifications
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can only insert notifications for themselves (or via Edge Function)
CREATE POLICY "Users can insert their own notifications" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Users can soft-delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- SERVICE ROLE POLICY (for Edge Functions)
-- =============================================

-- Allow service role to insert notifications for any user
CREATE POLICY "Service role can insert any notification" ON notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select any notification" ON notifications
  FOR SELECT
  TO service_role
  USING (true);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO count_result
  FROM notifications
  WHERE user_id = auth.uid()
    AND is_read = false
    AND deleted_at IS NULL;
  RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete old notifications (for cleanup jobs)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE notifications
  SET deleted_at = NOW()
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL
    AND deleted_at IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 096_notifications_table completed successfully';
  RAISE NOTICE 'Created table: notifications';
  RAISE NOTICE 'Created functions: mark_notification_read, mark_all_notifications_read, get_unread_notification_count, cleanup_old_notifications';
END $$;
