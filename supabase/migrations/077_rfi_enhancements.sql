-- Migration: 077_rfi_enhancements.sql
-- Description: Enhanced RFI features including drawing links, response history, email notifications, cost rollup
-- Date: 2025-01-02

-- =============================================
-- TABLE: rfi_drawing_links
-- Multiple drawing references per RFI with pin locations
-- =============================================
CREATE TABLE IF NOT EXISTS rfi_drawing_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES rfis(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Drawing reference info
  drawing_number VARCHAR(100),
  sheet_number VARCHAR(50),

  -- Pin location on drawing (normalized 0-1 coordinates)
  pin_x DECIMAL(5, 4),  -- X position as percentage (0-1)
  pin_y DECIMAL(5, 4),  -- Y position as percentage (0-1)

  -- Pin metadata
  pin_label VARCHAR(100),
  pin_color VARCHAR(20) DEFAULT '#EF4444',  -- Red default

  -- Notes specific to this drawing reference
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfi_drawing_links_rfi_id ON rfi_drawing_links(rfi_id);
CREATE INDEX IF NOT EXISTS idx_rfi_drawing_links_document_id ON rfi_drawing_links(document_id);

-- Enable RLS
ALTER TABLE rfi_drawing_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view RFI drawing links" ON rfi_drawing_links;
CREATE POLICY "Users can view RFI drawing links" ON rfi_drawing_links
  FOR SELECT
  USING (
    rfi_id IN (
      SELECT id FROM rfis WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert RFI drawing links" ON rfi_drawing_links;
CREATE POLICY "Users can insert RFI drawing links" ON rfi_drawing_links
  FOR INSERT
  WITH CHECK (
    rfi_id IN (
      SELECT id FROM rfis WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete RFI drawing links" ON rfi_drawing_links;
CREATE POLICY "Users can delete RFI drawing links" ON rfi_drawing_links
  FOR DELETE
  USING (
    rfi_id IN (
      SELECT id FROM rfis WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- TABLE: rfi_responses
-- Track all responses with revision history
-- =============================================
CREATE TABLE IF NOT EXISTS rfi_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES rfis(id) ON DELETE CASCADE,

  -- Response content
  response_text TEXT NOT NULL,

  -- Response type: 'official' = formal response, 'discussion' = informal
  response_type VARCHAR(20) NOT NULL DEFAULT 'discussion',

  -- Response action type
  action_type VARCHAR(50), -- 'answered', 'see_drawings', 'deferred', 'request_clarification', etc.

  -- Version tracking
  version_number INTEGER NOT NULL DEFAULT 1,
  is_current_version BOOLEAN NOT NULL DEFAULT true,
  supersedes_id UUID REFERENCES rfi_responses(id), -- Previous version it supersedes
  superseded_by_id UUID REFERENCES rfi_responses(id), -- Version that superseded this one

  -- Response metadata
  responder_company VARCHAR(255),
  responder_title VARCHAR(100),

  -- Associated attachments (stored as array of attachment IDs)
  attachment_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Metadata
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  responded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfi_responses_rfi_id ON rfi_responses(rfi_id);
CREATE INDEX IF NOT EXISTS idx_rfi_responses_is_current ON rfi_responses(is_current_version);
CREATE INDEX IF NOT EXISTS idx_rfi_responses_response_type ON rfi_responses(response_type);
CREATE INDEX IF NOT EXISTS idx_rfi_responses_responded_at ON rfi_responses(responded_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_rfi_responses_updated_at ON rfi_responses;
CREATE TRIGGER update_rfi_responses_updated_at BEFORE UPDATE ON rfi_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE rfi_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view RFI responses" ON rfi_responses;
CREATE POLICY "Users can view RFI responses" ON rfi_responses
  FOR SELECT
  USING (
    rfi_id IN (
      SELECT id FROM rfis WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert RFI responses" ON rfi_responses;
CREATE POLICY "Users can insert RFI responses" ON rfi_responses
  FOR INSERT
  WITH CHECK (
    rfi_id IN (
      SELECT id FROM rfis WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update RFI responses" ON rfi_responses;
CREATE POLICY "Users can update RFI responses" ON rfi_responses
  FOR UPDATE
  USING (
    rfi_id IN (
      SELECT id FROM rfis WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- TABLE: rfi_email_notifications
-- Track email notifications sent for RFIs
-- =============================================
CREATE TABLE IF NOT EXISTS rfi_email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES rfis(id) ON DELETE CASCADE,

  -- Notification type
  notification_type VARCHAR(50) NOT NULL, -- 'created', 'response', 'status_change', 'reminder', 'escalation'

  -- Recipients
  sent_to_email VARCHAR(255) NOT NULL,
  sent_to_user_id UUID REFERENCES users(id),
  cc_emails TEXT[], -- CC recipients

  -- Email content
  subject VARCHAR(500),
  body_preview TEXT, -- First 500 chars of email body for reference

  -- Delivery status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
  error_message TEXT,

  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,

  -- Reference to triggering action
  triggered_by_action VARCHAR(50), -- What action triggered this notification
  triggered_by_user_id UUID REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfi_email_notifications_rfi_id ON rfi_email_notifications(rfi_id);
CREATE INDEX IF NOT EXISTS idx_rfi_email_notifications_status ON rfi_email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_rfi_email_notifications_type ON rfi_email_notifications(notification_type);

-- Enable RLS
ALTER TABLE rfi_email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin/project members only)
DROP POLICY IF EXISTS "Users can view RFI email notifications" ON rfi_email_notifications;
CREATE POLICY "Users can view RFI email notifications" ON rfi_email_notifications
  FOR SELECT
  USING (
    rfi_id IN (
      SELECT id FROM rfis WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert RFI email notifications" ON rfi_email_notifications;
CREATE POLICY "Users can insert RFI email notifications" ON rfi_email_notifications
  FOR INSERT
  WITH CHECK (
    rfi_id IN (
      SELECT id FROM rfis WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- TABLE: rfi_notification_preferences
-- User preferences for RFI notifications
-- =============================================
CREATE TABLE IF NOT EXISTS rfi_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL = default for all projects

  -- Email notification preferences
  notify_on_assigned BOOLEAN DEFAULT true,
  notify_on_response BOOLEAN DEFAULT true,
  notify_on_status_change BOOLEAN DEFAULT true,
  notify_on_mention BOOLEAN DEFAULT true,
  notify_on_due_date_reminder BOOLEAN DEFAULT true,
  notify_on_overdue BOOLEAN DEFAULT true,

  -- Digest preferences
  digest_frequency VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly', 'none'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique per user per project (NULL project = default)
  UNIQUE(user_id, project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfi_notification_preferences_user ON rfi_notification_preferences(user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_rfi_notification_preferences_updated_at ON rfi_notification_preferences;
CREATE TRIGGER update_rfi_notification_preferences_updated_at BEFORE UPDATE ON rfi_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE rfi_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON rfi_notification_preferences;
CREATE POLICY "Users can manage their own notification preferences" ON rfi_notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- MODIFY: rfis table - Add change order linkage
-- =============================================

-- Add column for linked change order (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rfis' AND column_name = 'linked_change_order_id'
  ) THEN
    ALTER TABLE rfis ADD COLUMN linked_change_order_id UUID REFERENCES change_orders(id);
  END IF;
END $$;

-- Add column for official response reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rfis' AND column_name = 'official_response_id'
  ) THEN
    ALTER TABLE rfis ADD COLUMN official_response_id UUID REFERENCES rfi_responses(id);
  END IF;
END $$;

-- Add column for cost impact status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rfis' AND column_name = 'cost_impact_status'
  ) THEN
    ALTER TABLE rfis ADD COLUMN cost_impact_status VARCHAR(20) DEFAULT 'estimated';
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_rfis_linked_change_order ON rfis(linked_change_order_id);
CREATE INDEX IF NOT EXISTS idx_rfis_cost_impact_status ON rfis(cost_impact_status);

-- =============================================
-- VIEW: rfi_cost_summary
-- Aggregated cost impact view for dashboard
-- =============================================
CREATE OR REPLACE VIEW rfi_cost_summary AS
SELECT
  r.project_id,
  p.name as project_name,
  COUNT(r.id) as total_rfis,
  COUNT(r.id) FILTER (WHERE r.cost_impact IS NOT NULL AND r.cost_impact > 0) as rfis_with_cost_impact,

  -- By status
  COALESCE(SUM(r.cost_impact) FILTER (WHERE r.cost_impact_status = 'estimated'), 0) as estimated_cost_impact,
  COALESCE(SUM(r.cost_impact) FILTER (WHERE r.cost_impact_status = 'approved'), 0) as approved_cost_impact,
  COALESCE(SUM(r.cost_impact) FILTER (WHERE r.cost_impact_status = 'rejected'), 0) as rejected_cost_impact,

  -- Total
  COALESCE(SUM(r.cost_impact), 0) as total_cost_impact,

  -- Schedule impact
  COALESCE(SUM(r.schedule_impact_days), 0) as total_schedule_impact_days,

  -- Linked to COs
  COUNT(r.id) FILTER (WHERE r.linked_change_order_id IS NOT NULL) as rfis_linked_to_co,

  -- Pending response
  COUNT(r.id) FILTER (WHERE r.status IN ('open', 'pending_response')) as pending_response_count

FROM rfis r
JOIN projects p ON r.project_id = p.id
WHERE r.deleted_at IS NULL
GROUP BY r.project_id, p.name;

-- =============================================
-- FUNCTION: create_response_revision
-- Create a new revision of a response (supersedes previous)
-- =============================================
CREATE OR REPLACE FUNCTION create_response_revision(
  p_original_response_id UUID,
  p_new_response_text TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_rfi_id UUID;
  v_current_version INTEGER;
  v_new_response_id UUID;
BEGIN
  -- Get RFI ID and current version from original response
  SELECT rfi_id, version_number INTO v_rfi_id, v_current_version
  FROM rfi_responses
  WHERE id = p_original_response_id AND is_current_version = true;

  IF v_rfi_id IS NULL THEN
    RAISE EXCEPTION 'Original response not found or is not current version';
  END IF;

  -- Mark old response as superseded
  UPDATE rfi_responses
  SET is_current_version = false,
      updated_at = NOW()
  WHERE id = p_original_response_id;

  -- Create new response version
  INSERT INTO rfi_responses (
    rfi_id,
    response_text,
    response_type,
    action_type,
    version_number,
    is_current_version,
    supersedes_id,
    responded_by
  )
  SELECT
    v_rfi_id,
    p_new_response_text,
    response_type,
    action_type,
    v_current_version + 1,
    true,
    p_original_response_id,
    p_user_id
  FROM rfi_responses
  WHERE id = p_original_response_id
  RETURNING id INTO v_new_response_id;

  -- Update the superseded_by reference on old response
  UPDATE rfi_responses
  SET superseded_by_id = v_new_response_id
  WHERE id = p_original_response_id;

  RETURN v_new_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: get_rfi_cost_rollup
-- Get cost impact rollup for a project
-- =============================================
CREATE OR REPLACE FUNCTION get_rfi_cost_rollup(p_project_id UUID)
RETURNS TABLE (
  total_estimated DECIMAL(15, 2),
  total_approved DECIMAL(15, 2),
  total_rejected DECIMAL(15, 2),
  total_pending DECIMAL(15, 2),
  rfi_count INTEGER,
  rfis_with_cost_impact INTEGER,
  rfis_linked_to_co INTEGER,
  total_schedule_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(r.cost_impact) FILTER (WHERE r.cost_impact_status = 'estimated'), 0)::DECIMAL(15, 2),
    COALESCE(SUM(r.cost_impact) FILTER (WHERE r.cost_impact_status = 'approved'), 0)::DECIMAL(15, 2),
    COALESCE(SUM(r.cost_impact) FILTER (WHERE r.cost_impact_status = 'rejected'), 0)::DECIMAL(15, 2),
    COALESCE(SUM(r.cost_impact) FILTER (WHERE r.cost_impact_status IS NULL OR r.cost_impact_status = 'pending'), 0)::DECIMAL(15, 2),
    COUNT(r.id)::INTEGER,
    COUNT(r.id) FILTER (WHERE r.cost_impact IS NOT NULL AND r.cost_impact > 0)::INTEGER,
    COUNT(r.id) FILTER (WHERE r.linked_change_order_id IS NOT NULL)::INTEGER,
    COALESCE(SUM(r.schedule_impact_days), 0)::INTEGER
  FROM rfis r
  WHERE r.project_id = p_project_id
    AND r.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: link_rfi_to_change_order
-- Link an RFI to a change order and update status
-- =============================================
CREATE OR REPLACE FUNCTION link_rfi_to_change_order(
  p_rfi_id UUID,
  p_change_order_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE rfis
  SET
    linked_change_order_id = p_change_order_id,
    cost_impact_status = 'approved',
    updated_at = NOW()
  WHERE id = p_rfi_id;

  -- Also update the change order to reference this RFI
  UPDATE change_orders
  SET
    related_rfi_id = p_rfi_id,
    updated_at = NOW()
  WHERE id = p_change_order_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 077_rfi_enhancements completed successfully';
END $$;
