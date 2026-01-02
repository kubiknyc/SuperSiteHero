-- Migration: 086_asi_tracking.sql
-- Description: ASI (Architect's Supplemental Instruction) tracking with full lifecycle management
-- Date: 2025-01-02

-- =============================================
-- TABLE: architect_supplemental_instructions
-- Full ASI tracking with cost/schedule impact
-- =============================================
CREATE TABLE IF NOT EXISTS architect_supplemental_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- ASI identification
  asi_number VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_date DATE,
  response_due_date DATE,
  implementation_date DATE,

  -- Source and responsibility
  issued_by VARCHAR(255), -- Architect name/firm
  issued_by_contact_id UUID REFERENCES contacts(id),
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_date TIMESTAMPTZ,

  -- Status tracking
  status VARCHAR(30) DEFAULT 'pending', -- pending, acknowledged, reviewing, implemented, rejected
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, critical

  -- Cost impact
  has_cost_impact BOOLEAN DEFAULT false,
  estimated_cost_impact DECIMAL(15, 2),
  actual_cost_impact DECIMAL(15, 2),
  cost_impact_notes TEXT,

  -- Schedule impact
  has_schedule_impact BOOLEAN DEFAULT false,
  schedule_impact_days INTEGER,
  schedule_impact_notes TEXT,

  -- Related items
  related_rfi_id UUID REFERENCES rfis(id),
  related_change_order_id UUID REFERENCES change_orders(id),
  related_submittal_id UUID REFERENCES submittals(id),

  -- Attachments and notes
  attachment_urls TEXT[],
  internal_notes TEXT,
  contractor_response TEXT,
  contractor_response_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Unique constraint for ASI number per project
  UNIQUE (project_id, asi_number)
);

CREATE INDEX IF NOT EXISTS idx_asi_project_id ON architect_supplemental_instructions(project_id);
CREATE INDEX IF NOT EXISTS idx_asi_status ON architect_supplemental_instructions(status);
CREATE INDEX IF NOT EXISTS idx_asi_issue_date ON architect_supplemental_instructions(issue_date);
CREATE INDEX IF NOT EXISTS idx_asi_number ON architect_supplemental_instructions(asi_number);
CREATE INDEX IF NOT EXISTS idx_asi_has_cost_impact ON architect_supplemental_instructions(has_cost_impact);

-- Enable RLS
ALTER TABLE architect_supplemental_instructions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view ASIs" ON architect_supplemental_instructions;
CREATE POLICY "Users can view ASIs" ON architect_supplemental_instructions
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert ASIs" ON architect_supplemental_instructions;
CREATE POLICY "Users can insert ASIs" ON architect_supplemental_instructions
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update ASIs" ON architect_supplemental_instructions;
CREATE POLICY "Users can update ASIs" ON architect_supplemental_instructions
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: asi_affected_drawings
-- Link ASIs to affected drawings
-- =============================================
CREATE TABLE IF NOT EXISTS asi_affected_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asi_id UUID NOT NULL REFERENCES architect_supplemental_instructions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Specific changes
  affected_area TEXT, -- Area description within the drawing
  change_description TEXT,
  requires_revision BOOLEAN DEFAULT true,
  revision_completed BOOLEAN DEFAULT false,
  revision_completed_date DATE,

  -- Sort order
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (asi_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_asi_affected_drawings_asi_id ON asi_affected_drawings(asi_id);
CREATE INDEX IF NOT EXISTS idx_asi_affected_drawings_document_id ON asi_affected_drawings(document_id);

-- Enable RLS
ALTER TABLE asi_affected_drawings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ASI affected drawings" ON asi_affected_drawings;
CREATE POLICY "Users can view ASI affected drawings" ON asi_affected_drawings
  FOR SELECT
  USING (
    asi_id IN (
      SELECT id FROM architect_supplemental_instructions WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage ASI affected drawings" ON asi_affected_drawings;
CREATE POLICY "Users can manage ASI affected drawings" ON asi_affected_drawings
  FOR ALL
  USING (
    asi_id IN (
      SELECT id FROM architect_supplemental_instructions WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- TABLE: asi_activity_log
-- Track all activities on ASIs
-- =============================================
CREATE TABLE IF NOT EXISTS asi_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asi_id UUID NOT NULL REFERENCES architect_supplemental_instructions(id) ON DELETE CASCADE,

  action VARCHAR(50) NOT NULL, -- created, status_changed, acknowledged, responded, drawing_added, drawing_revised, etc.
  old_value TEXT,
  new_value TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_asi_activity_log_asi_id ON asi_activity_log(asi_id);
CREATE INDEX IF NOT EXISTS idx_asi_activity_log_created_at ON asi_activity_log(created_at);

-- Enable RLS
ALTER TABLE asi_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ASI activity" ON asi_activity_log;
CREATE POLICY "Users can view ASI activity" ON asi_activity_log
  FOR SELECT
  USING (
    asi_id IN (
      SELECT id FROM architect_supplemental_instructions WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert ASI activity" ON asi_activity_log;
CREATE POLICY "Users can insert ASI activity" ON asi_activity_log
  FOR INSERT
  WITH CHECK (
    asi_id IN (
      SELECT id FROM architect_supplemental_instructions WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- FUNCTION: get_next_asi_number
-- Generate next ASI number for a project
-- =============================================
CREATE OR REPLACE FUNCTION get_next_asi_number(p_project_id UUID)
RETURNS VARCHAR(30) AS $$
DECLARE
  v_project_number VARCHAR(100);
  v_next_number INTEGER;
BEGIN
  -- Get project number
  SELECT project_number INTO v_project_number FROM projects WHERE id = p_project_id;

  -- Get next sequence
  SELECT COALESCE(MAX(
    CAST(REGEXP_REPLACE(asi_number, '[^0-9]', '', 'g') AS INTEGER)
  ), 0) + 1
  INTO v_next_number
  FROM architect_supplemental_instructions
  WHERE project_id = p_project_id;

  -- Format: ASI-001 or PROJECT#-ASI-001
  RETURN 'ASI-' || LPAD(v_next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: log_asi_activity
-- Helper to log ASI activities
-- =============================================
CREATE OR REPLACE FUNCTION log_asi_activity(
  p_asi_id UUID,
  p_action VARCHAR(50),
  p_old_value TEXT DEFAULT NULL,
  p_new_value TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO asi_activity_log (asi_id, action, old_value, new_value, notes, created_by)
  VALUES (p_asi_id, p_action, p_old_value, p_new_value, p_notes, auth.uid())
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGER: Update ASI timestamp on change
-- =============================================
CREATE OR REPLACE FUNCTION update_asi_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_asi_timestamp_trigger ON architect_supplemental_instructions;
CREATE TRIGGER update_asi_timestamp_trigger
  BEFORE UPDATE ON architect_supplemental_instructions
  FOR EACH ROW
  EXECUTE FUNCTION update_asi_timestamp();

-- =============================================
-- TRIGGER: Log ASI status changes
-- =============================================
CREATE OR REPLACE FUNCTION log_asi_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_asi_activity(
      NEW.id,
      'status_changed',
      OLD.status,
      NEW.status,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS asi_status_change_trigger ON architect_supplemental_instructions;
CREATE TRIGGER asi_status_change_trigger
  AFTER UPDATE ON architect_supplemental_instructions
  FOR EACH ROW
  EXECUTE FUNCTION log_asi_status_change();

-- =============================================
-- VIEW: asi_summary
-- Summary view with affected drawing counts
-- =============================================
CREATE OR REPLACE VIEW asi_summary AS
SELECT
  a.id,
  a.project_id,
  a.asi_number,
  a.title,
  a.description,
  a.issue_date,
  a.status,
  a.priority,
  a.has_cost_impact,
  a.estimated_cost_impact,
  a.has_schedule_impact,
  a.schedule_impact_days,
  a.related_rfi_id,
  a.related_change_order_id,
  -- Counts
  (SELECT COUNT(*) FROM asi_affected_drawings ad WHERE ad.asi_id = a.id) AS affected_drawing_count,
  (SELECT COUNT(*) FROM asi_affected_drawings ad WHERE ad.asi_id = a.id AND ad.revision_completed = true) AS completed_revision_count,
  -- Project info
  p.name AS project_name,
  p.project_number
FROM architect_supplemental_instructions a
LEFT JOIN projects p ON a.project_id = p.id
WHERE a.deleted_at IS NULL
ORDER BY a.issue_date DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 086_asi_tracking completed successfully';
END $$;
