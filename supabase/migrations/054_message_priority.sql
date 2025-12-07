-- Migration: 054_message_priority.sql
-- Description: Add priority/urgency indicators to messages for construction safety and urgent communications
-- Date: 2025-12-05

-- Add priority level to messages table
-- Supports 'normal' (default), 'high', and 'urgent' (for safety concerns)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'
CHECK (priority IN ('normal', 'high', 'urgent'));

-- Add comment explaining the priority levels
COMMENT ON COLUMN messages.priority IS 'Message priority level: normal (default), high (important), urgent (safety concerns, immediate action required)';

-- Create partial index for high-priority messages for faster queries
-- Only indexes non-normal priority messages that are not deleted
CREATE INDEX IF NOT EXISTS idx_messages_priority
ON messages(from_user_id, priority, created_at DESC)
WHERE priority != 'normal' AND deleted_at IS NULL;

-- Create index for filtering urgent messages
CREATE INDEX IF NOT EXISTS idx_messages_urgent
ON messages(created_at DESC)
WHERE priority = 'urgent' AND deleted_at IS NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
