-- Migration: 049_dedicated_rfis.sql
-- Description: Dedicated RFI (Request for Information) table with industry-standard fields
-- Date: 2025-12-05

-- =============================================
-- TABLE: rfis
-- Dedicated RFI tracking with construction-specific fields
-- =============================================
CREATE TABLE IF NOT EXISTS rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- RFI Identification (auto-increment per project)
  rfi_number INTEGER NOT NULL,

  -- Core Fields
  subject VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  response TEXT,

  -- References
  spec_section VARCHAR(50),
  drawing_id UUID REFERENCES documents(id),
  drawing_reference VARCHAR(100),  -- e.g., "A-101, Detail 3"
  location VARCHAR(255),

  -- Dates
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_submitted TIMESTAMPTZ,
  date_required TIMESTAMPTZ,
  date_responded TIMESTAMPTZ,
  date_closed TIMESTAMPTZ,

  -- Status & Priority
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  priority VARCHAR(20) DEFAULT 'normal',

  -- Ball-in-Court Tracking
  ball_in_court UUID REFERENCES users(id),
  ball_in_court_role VARCHAR(50),  -- 'gc', 'architect', 'subcontractor', 'owner', 'engineer'

  -- Assignment
  submitted_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  responded_by UUID REFERENCES users(id),

  -- Discipline
  discipline VARCHAR(100),

  -- Impact Assessment
  cost_impact DECIMAL(15, 2),
  schedule_impact_days INTEGER,

  -- Related Items
  related_submittal_id UUID,  -- Will be FK to submittals table when created
  related_change_order_id UUID,  -- Will be FK to change_orders table when created

  -- Distribution
  distribution_list UUID[] DEFAULT ARRAY[]::UUID[],

  -- Workflow tracking from legacy system
  legacy_workflow_item_id UUID REFERENCES workflow_items(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Ensure unique RFI numbers per project
  UNIQUE(project_id, rfi_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfis_project_id ON rfis(project_id);
CREATE INDEX IF NOT EXISTS idx_rfis_company_id ON rfis(company_id);
CREATE INDEX IF NOT EXISTS idx_rfis_status ON rfis(status);
CREATE INDEX IF NOT EXISTS idx_rfis_priority ON rfis(priority);
CREATE INDEX IF NOT EXISTS idx_rfis_ball_in_court ON rfis(ball_in_court);
CREATE INDEX IF NOT EXISTS idx_rfis_assigned_to ON rfis(assigned_to);
CREATE INDEX IF NOT EXISTS idx_rfis_date_required ON rfis(date_required);
CREATE INDEX IF NOT EXISTS idx_rfis_deleted_at ON rfis(deleted_at);
CREATE INDEX IF NOT EXISTS idx_rfis_drawing_id ON rfis(drawing_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_rfis_updated_at ON rfis;
CREATE TRIGGER update_rfis_updated_at BEFORE UPDATE ON rfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE rfis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view RFIs for their company projects" ON rfis;
CREATE POLICY "Users can view RFIs for their company projects" ON rfis
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert RFIs for their company projects" ON rfis;
CREATE POLICY "Users can insert RFIs for their company projects" ON rfis
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update RFIs for their company projects" ON rfis;
CREATE POLICY "Users can update RFIs for their company projects" ON rfis
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: rfi_attachments
-- Files and documents attached to RFIs
-- =============================================
CREATE TABLE IF NOT EXISTS rfi_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES rfis(id) ON DELETE CASCADE,

  -- Document reference or direct file
  document_id UUID REFERENCES documents(id),
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  file_size INTEGER,

  -- Attachment type
  attachment_type VARCHAR(50) DEFAULT 'general',  -- 'question', 'response', 'general', 'sketch', 'photo'

  -- Metadata
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfi_attachments_rfi_id ON rfi_attachments(rfi_id);
CREATE INDEX IF NOT EXISTS idx_rfi_attachments_document_id ON rfi_attachments(document_id);

-- Enable RLS
ALTER TABLE rfi_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view RFI attachments for their projects" ON rfi_attachments;
CREATE POLICY "Users can view RFI attachments for their projects" ON rfi_attachments
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

DROP POLICY IF EXISTS "Users can insert RFI attachments" ON rfi_attachments;
CREATE POLICY "Users can insert RFI attachments" ON rfi_attachments
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

DROP POLICY IF EXISTS "Users can delete RFI attachments" ON rfi_attachments;
CREATE POLICY "Users can delete RFI attachments" ON rfi_attachments
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
-- TABLE: rfi_comments
-- Comments/discussion thread on RFIs
-- =============================================
CREATE TABLE IF NOT EXISTS rfi_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES rfis(id) ON DELETE CASCADE,

  -- Comment content
  comment TEXT NOT NULL,

  -- Comment type
  comment_type VARCHAR(30) DEFAULT 'comment',  -- 'comment', 'response', 'internal_note', 'question_clarification'

  -- Mentions
  mentioned_users UUID[] DEFAULT ARRAY[]::UUID[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfi_comments_rfi_id ON rfi_comments(rfi_id);
CREATE INDEX IF NOT EXISTS idx_rfi_comments_deleted_at ON rfi_comments(deleted_at);

-- Trigger
DROP TRIGGER IF EXISTS update_rfi_comments_updated_at ON rfi_comments;
CREATE TRIGGER update_rfi_comments_updated_at BEFORE UPDATE ON rfi_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE rfi_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view RFI comments for their projects" ON rfi_comments;
CREATE POLICY "Users can view RFI comments for their projects" ON rfi_comments
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

DROP POLICY IF EXISTS "Users can insert RFI comments" ON rfi_comments;
CREATE POLICY "Users can insert RFI comments" ON rfi_comments
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

DROP POLICY IF EXISTS "Users can update their own RFI comments" ON rfi_comments;
CREATE POLICY "Users can update their own RFI comments" ON rfi_comments
  FOR UPDATE
  USING (created_by = auth.uid());

-- =============================================
-- TABLE: rfi_history
-- Track all changes to RFIs
-- =============================================
CREATE TABLE IF NOT EXISTS rfi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES rfis(id) ON DELETE CASCADE,

  -- Change Info
  action VARCHAR(50) NOT NULL,  -- 'created', 'updated', 'status_changed', 'responded', 'assigned', etc.
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,

  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfi_history_rfi_id ON rfi_history(rfi_id);
CREATE INDEX IF NOT EXISTS idx_rfi_history_changed_at ON rfi_history(changed_at);

-- Enable RLS
ALTER TABLE rfi_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view RFI history for their projects" ON rfi_history;
CREATE POLICY "Users can view RFI history for their projects" ON rfi_history
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

-- =============================================
-- FUNCTION: get_next_rfi_number
-- Get next sequential RFI number for a project
-- =============================================
CREATE OR REPLACE FUNCTION get_next_rfi_number(p_project_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(rfi_number), 0) + 1
  FROM rfis
  WHERE project_id = p_project_id AND deleted_at IS NULL;
$$ LANGUAGE SQL;

-- =============================================
-- FUNCTION: track_rfi_changes
-- Automatically track changes to RFIs
-- =============================================
CREATE OR REPLACE FUNCTION track_rfi_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO rfi_history (rfi_id, action, changed_by)
    VALUES (NEW.id, 'created', v_user_id);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO rfi_history (rfi_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'status_changed', 'status', OLD.status, NEW.status, v_user_id);
    END IF;

    -- Track assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO rfi_history (rfi_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'assigned', 'assigned_to', OLD.assigned_to::text, NEW.assigned_to::text, v_user_id);
    END IF;

    -- Track response
    IF OLD.response IS NULL AND NEW.response IS NOT NULL THEN
      INSERT INTO rfi_history (rfi_id, action, changed_by)
      VALUES (NEW.id, 'responded', v_user_id);
    END IF;

    -- Track ball-in-court changes
    IF OLD.ball_in_court IS DISTINCT FROM NEW.ball_in_court THEN
      INSERT INTO rfi_history (rfi_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'ball_in_court_changed', 'ball_in_court', OLD.ball_in_court::text, NEW.ball_in_court::text, v_user_id);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_track_rfi_changes ON rfis;
CREATE TRIGGER trigger_track_rfi_changes
  AFTER INSERT OR UPDATE ON rfis
  FOR EACH ROW EXECUTE FUNCTION track_rfi_changes();

-- =============================================
-- VIEW: rfi_summary
-- RFI with computed fields
-- =============================================
CREATE OR REPLACE VIEW rfi_summary AS
SELECT
  r.*,
  -- Days calculations
  CASE
    WHEN r.date_required IS NOT NULL AND r.status NOT IN ('closed', 'approved')
    THEN EXTRACT(DAY FROM (r.date_required - CURRENT_TIMESTAMP))::INTEGER
    ELSE NULL
  END as days_until_due,
  CASE
    WHEN r.date_required IS NOT NULL AND r.date_required < CURRENT_TIMESTAMP AND r.status NOT IN ('closed', 'approved')
    THEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - r.date_required))::INTEGER
    ELSE 0
  END as days_overdue,
  CASE
    WHEN r.date_submitted IS NOT NULL
    THEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - r.date_submitted))::INTEGER
    ELSE NULL
  END as days_open,
  -- Is overdue flag
  CASE
    WHEN r.date_required IS NOT NULL AND r.date_required < CURRENT_TIMESTAMP AND r.status NOT IN ('closed', 'approved')
    THEN true
    ELSE false
  END as is_overdue
FROM rfis r
WHERE r.deleted_at IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 049_dedicated_rfis completed successfully';
END $$;
