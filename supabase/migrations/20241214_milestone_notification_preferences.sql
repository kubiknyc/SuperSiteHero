-- Migration: Create milestone_notification_preferences table
-- Date: 2024-12-14
-- Description: Client milestone notification preferences for customizable alerts

-- ============================================================================
-- Table Creation
-- ============================================================================

CREATE TABLE IF NOT EXISTS milestone_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique preference per user/project/event combination
  CONSTRAINT unique_user_project_event UNIQUE(user_id, project_id, event_type),

  -- Ensure event_type is one of the valid types
  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      -- Project Milestones
      'project.started',
      'project.milestone_completed',
      'project.phase_transition',
      'project.completed',
      -- Schedule Events
      'schedule.update',
      'schedule.delay',
      'schedule.critical_path_change',
      -- Financial Events
      'financial.payment_application_submitted',
      'financial.payment_application_approved',
      'financial.invoice_ready',
      'financial.budget_change',
      -- Quality Events
      'quality.inspection_scheduled',
      'quality.inspection_completed',
      'quality.punch_list_created',
      'quality.punch_list_completed',
      -- Documents
      'document.uploaded',
      'document.approval_required',
      'document.submittal_status_change',
      -- Communication
      'communication.rfi_response',
      'communication.change_order_submitted',
      'communication.meeting_scheduled'
    )
  )
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for fast lookups by user
CREATE INDEX idx_milestone_prefs_user ON milestone_notification_preferences(user_id);

-- Index for fast lookups by project
CREATE INDEX idx_milestone_prefs_project ON milestone_notification_preferences(project_id);

-- Index for fast lookups by event type
CREATE INDEX idx_milestone_prefs_event ON milestone_notification_preferences(event_type);

-- Composite index for the most common query pattern
CREATE INDEX idx_milestone_prefs_user_project ON milestone_notification_preferences(user_id, project_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE milestone_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON milestone_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON milestone_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON milestone_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
  ON milestone_notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_milestone_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before updates
CREATE TRIGGER milestone_prefs_updated_at_trigger
  BEFORE UPDATE ON milestone_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_milestone_prefs_updated_at();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE milestone_notification_preferences IS
  'Client milestone notification preferences for customizing which events trigger notifications';

COMMENT ON COLUMN milestone_notification_preferences.user_id IS
  'User who owns these preferences';

COMMENT ON COLUMN milestone_notification_preferences.project_id IS
  'Project-specific preferences (NULL = global preferences for all projects)';

COMMENT ON COLUMN milestone_notification_preferences.event_type IS
  'Type of milestone event (e.g., project.started, schedule.delay, etc.)';

COMMENT ON COLUMN milestone_notification_preferences.email_enabled IS
  'Whether to send email notifications for this event';

COMMENT ON COLUMN milestone_notification_preferences.in_app_enabled IS
  'Whether to show in-app notifications for this event';

COMMENT ON COLUMN milestone_notification_preferences.sms_enabled IS
  'Whether to send SMS notifications for this event (future feature)';

COMMENT ON COLUMN milestone_notification_preferences.push_enabled IS
  'Whether to send push notifications for this event (future feature)';
