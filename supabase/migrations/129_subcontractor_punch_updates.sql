-- Migration: 121_subcontractor_punch_updates.sql
-- Phase 4: Subcontractor Portal Enhancements
-- Milestone 4.2: Punch Item Updates with Photo Proof

-- ============================================================================
-- PUNCH ITEMS ENHANCEMENTS
-- ============================================================================

-- Add GC verification fields to punch_items
ALTER TABLE punch_items
  ADD COLUMN IF NOT EXISTS sub_status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gc_verification_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS gc_verified_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS gc_verified_at TIMESTAMPTZ;

-- Add index for efficient querying of items awaiting verification
CREATE INDEX IF NOT EXISTS idx_punch_items_gc_verification
  ON punch_items(gc_verification_required, gc_verified_at)
  WHERE gc_verification_required = true AND gc_verified_at IS NULL;

-- ============================================================================
-- SUBCONTRACTOR COMPLIANCE DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS subcontractor_compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Document information
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER,

  -- Expiration tracking
  issue_date DATE,
  expires_at DATE,

  -- Review status
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Reminders
  reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- Metadata
  uploaded_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Ensure expires_at and company_id columns exist (in case table already existed from migration 038)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subcontractor_compliance_documents'
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE subcontractor_compliance_documents ADD COLUMN expires_at DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subcontractor_compliance_documents'
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE subcontractor_compliance_documents ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for compliance documents
CREATE INDEX IF NOT EXISTS idx_compliance_docs_subcontractor
  ON subcontractor_compliance_documents(subcontractor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_docs_expiration
  ON subcontractor_compliance_documents(expires_at)
  WHERE deleted_at IS NULL AND status = 'approved';

CREATE INDEX IF NOT EXISTS idx_compliance_docs_status
  ON subcontractor_compliance_documents(status)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- NOTIFICATION PREFERENCES (for Phase 4.3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Notification types
  punch_item_assigned BOOLEAN DEFAULT true,
  punch_item_status_changed BOOLEAN DEFAULT true,
  rfi_response BOOLEAN DEFAULT true,
  rfi_assigned BOOLEAN DEFAULT true,
  document_approved BOOLEAN DEFAULT true,
  document_rejected BOOLEAN DEFAULT true,
  payment_updated BOOLEAN DEFAULT true,
  task_assigned BOOLEAN DEFAULT true,
  task_due_reminder BOOLEAN DEFAULT true,
  bid_invited BOOLEAN DEFAULT true,
  bid_status_changed BOOLEAN DEFAULT true,
  compliance_expiring BOOLEAN DEFAULT true,
  daily_report_submitted BOOLEAN DEFAULT true,

  -- Delivery settings
  push_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,

  -- Push tokens (stored encrypted in production)
  fcm_token TEXT,
  apns_token TEXT,
  web_push_endpoint TEXT,
  web_push_p256dh TEXT,
  web_push_auth TEXT,

  -- Preferences
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  digest_frequency TEXT CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly')) DEFAULT 'immediate',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user
  ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_push
  ON notification_preferences(user_id)
  WHERE push_enabled = true AND fcm_token IS NOT NULL;

-- ============================================================================
-- IN-APP NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,

  -- Related entity
  entity_type TEXT,
  entity_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Navigation
  link TEXT,

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Priority
  priority TEXT CHECK (priority IN ('low', 'normal', 'high')) DEFAULT 'normal',

  -- Delivery tracking
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Ensure all new columns exist (in case notifications table already existed)
DO $$
BEGIN
  -- Add read column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
  END IF;

  -- Add read_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
  END IF;

  -- Add entity_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN entity_type TEXT;
  END IF;

  -- Add entity_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN entity_id UUID;
  END IF;

  -- Add link column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'link'
  ) THEN
    ALTER TABLE notifications ADD COLUMN link TEXT;
  END IF;

  -- Add priority column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority TEXT CHECK (priority IN ('low', 'normal', 'high')) DEFAULT 'normal';
  END IF;

  -- Add push tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'push_sent'
  ) THEN
    ALTER TABLE notifications ADD COLUMN push_sent BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'push_sent_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN push_sent_at TIMESTAMPTZ;
  END IF;

  -- Add email tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'email_sent'
  ) THEN
    ALTER TABLE notifications ADD COLUMN email_sent BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'email_sent_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN email_sent_at TIMESTAMPTZ;
  END IF;

  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;

  -- Add expires_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
  END IF;

  -- Add company_id column (nullable for existing notifications)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN company_id UUID;
    -- Add foreign key constraint separately
    ALTER TABLE notifications
      ADD CONSTRAINT fk_notifications_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_entity
  ON notifications(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_notifications_expires
  ON notifications(expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE subcontractor_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Compliance documents policies
CREATE POLICY "Users can view own subcontractor compliance docs"
  ON subcontractor_compliance_documents FOR SELECT
  USING (
    -- Owner subcontractor
    subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR
    -- Company members can view
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR
    -- Project team members
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Subcontractors can insert own compliance docs"
  ON subcontractor_compliance_documents FOR INSERT
  WITH CHECK (
    subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Subcontractors can update own compliance docs"
  ON subcontractor_compliance_documents FOR UPDATE
  USING (
    subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Notification preferences policies
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- Notifications policies (drop existing if from migration 096)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- SUBCONTRACTOR PUNCH ITEM UPDATE POLICIES
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Subcontractors can update assigned punch items" ON punch_items;

-- Subcontractors can only update their assigned punch items
CREATE POLICY "Subcontractors can update assigned punch items"
  ON punch_items FOR UPDATE
  USING (
    -- Check if user is assigned via subcontractor relationship
    subcontractor_id IN (
      SELECT s.id FROM subcontractors s
      JOIN contacts c ON s.contact_id = c.id
      WHERE c.email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR
    -- Direct assignment
    assigned_to = auth.uid()
    OR
    -- Company member with project access
    project_id IN (
      SELECT project_id FROM project_users
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get items awaiting GC verification
CREATE OR REPLACE FUNCTION get_punch_items_awaiting_verification(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  subcontractor_id UUID,
  subcontractor_name TEXT,
  status_change_request JSONB,
  status_change_requested_at TIMESTAMPTZ,
  sub_status_updated_at TIMESTAMPTZ,
  has_proof_photos BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id,
    pi.title,
    pi.description,
    pi.status,
    pi.priority,
    pi.subcontractor_id,
    s.company_name AS subcontractor_name,
    pi.status_change_request,
    pi.status_change_requested_at,
    pi.sub_status_updated_at,
    EXISTS(
      SELECT 1 FROM photos p
      WHERE p.punch_item_id = pi.id
      AND p.is_proof_of_completion = true
    ) AS has_proof_photos
  FROM punch_items pi
  LEFT JOIN subcontractors s ON pi.subcontractor_id = s.id
  WHERE pi.project_id = p_project_id
    AND pi.gc_verification_required = true
    AND pi.gc_verified_at IS NULL
    AND pi.status_change_requested_at IS NOT NULL
    AND pi.deleted_at IS NULL
  ORDER BY pi.status_change_requested_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify subcontractor completion
CREATE OR REPLACE FUNCTION verify_subcontractor_completion(
  p_punch_item_id UUID,
  p_verified_by UUID,
  p_approve BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS punch_items AS $$
DECLARE
  v_punch_item punch_items;
  v_status_request JSONB;
BEGIN
  -- Get current punch item
  SELECT * INTO v_punch_item
  FROM punch_items
  WHERE id = p_punch_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Punch item not found';
  END IF;

  v_status_request := v_punch_item.status_change_request;

  IF v_status_request IS NULL THEN
    RAISE EXCEPTION 'No status change request found';
  END IF;

  IF p_approve THEN
    -- Approve: Update status to requested status
    UPDATE punch_items
    SET
      status = (v_status_request->>'requested_status'),
      status_change_request = NULL,
      status_change_requested_at = NULL,
      gc_verified_by = p_verified_by,
      gc_verified_at = NOW(),
      marked_complete_by = CASE
        WHEN (v_status_request->>'requested_status') = 'completed'
        THEN (v_status_request->>'requested_by')::UUID
        ELSE marked_complete_by
      END,
      marked_complete_at = CASE
        WHEN (v_status_request->>'requested_status') = 'completed'
        THEN NOW()
        ELSE marked_complete_at
      END,
      updated_at = NOW()
    WHERE id = p_punch_item_id
    RETURNING * INTO v_punch_item;
  ELSE
    -- Reject: Clear request and add rejection notes
    UPDATE punch_items
    SET
      status_change_request = NULL,
      status_change_requested_at = NULL,
      rejection_notes = COALESCE(p_rejection_reason, 'Status change request rejected'),
      updated_at = NOW()
    WHERE id = p_punch_item_id
    RETURNING * INTO v_punch_item;
  END IF;

  RETURN v_punch_item;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS notifications AS $$
DECLARE
  v_notification notifications;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    entity_type,
    entity_id,
    project_id,
    link,
    priority,
    metadata
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_entity_type,
    p_entity_id,
    p_project_id,
    p_link,
    p_priority,
    p_metadata
  )
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
      AND is_read = false
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update timestamp on notification preferences update
CREATE OR REPLACE FUNCTION update_notification_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notification_preferences_updated ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_timestamp();

-- Trigger to update sub_status_updated_at when subcontractor updates punch item
CREATE OR REPLACE FUNCTION update_sub_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_change_request IS DISTINCT FROM OLD.status_change_request
     OR NEW.subcontractor_notes IS DISTINCT FROM OLD.subcontractor_notes THEN
    NEW.sub_status_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_punch_item_sub_update ON punch_items;
CREATE TRIGGER trigger_punch_item_sub_update
  BEFORE UPDATE ON punch_items
  FOR EACH ROW
  EXECUTE FUNCTION update_sub_status_timestamp();

-- Trigger to auto-expire old notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM notifications
  WHERE expires_at < NOW() - INTERVAL '7 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled trigger (runs periodically via pg_cron if available)
-- For now, cleanup happens on each insert
DROP TRIGGER IF EXISTS trigger_cleanup_notifications ON notifications;
CREATE TRIGGER trigger_cleanup_notifications
  AFTER INSERT ON notifications
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_notifications();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON subcontractor_compliance_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_punch_items_awaiting_verification TO authenticated;
GRANT EXECUTE ON FUNCTION verify_subcontractor_completion TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE subcontractor_compliance_documents IS 'Stores compliance documents uploaded by subcontractors (insurance, licenses, certifications)';
COMMENT ON TABLE notification_preferences IS 'User notification preferences including push tokens and delivery settings';
COMMENT ON TABLE notifications IS 'In-app notifications for users with support for multiple entity types';
COMMENT ON COLUMN punch_items.gc_verification_required IS 'Whether GC must verify subcontractor completion before marking complete';
COMMENT ON COLUMN punch_items.sub_status_updated_at IS 'Timestamp of last subcontractor update to this punch item';
