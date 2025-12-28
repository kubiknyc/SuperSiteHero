-- =============================================
-- Migration: 155_quality_control_module.sql
-- Description: Quality Control Module with NCR tracking and QC checklists
-- Date: 2025-12-26
-- Purpose: Dedicated QC checklists, Non-Conformance Reports (NCR), and quality inspections
-- =============================================

-- =============================================
-- TABLE 1: Non-Conformance Reports (NCR)
-- Tracks deficiencies and corrective actions
-- =============================================

CREATE TABLE IF NOT EXISTS non_conformance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identification
  ncr_number INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Classification
  category VARCHAR(100), -- workmanship, material, design, documentation, process
  severity VARCHAR(50) DEFAULT 'minor', -- minor, major, critical
  ncr_type VARCHAR(50) DEFAULT 'internal', -- internal, external, supplier

  -- Location & Reference
  location VARCHAR(500),
  spec_section VARCHAR(50),
  drawing_reference VARCHAR(100),
  cost_code_id UUID REFERENCES cost_codes(id),

  -- Responsible Parties
  responsible_party_type VARCHAR(50), -- subcontractor, supplier, designer, owner, gc
  responsible_subcontractor_id UUID REFERENCES subcontractors(id),
  responsible_user_id UUID REFERENCES users(id),

  -- Status Workflow
  status VARCHAR(50) DEFAULT 'open', -- open, under_review, corrective_action, verification, resolved, closed, voided
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

  -- Root Cause Analysis
  root_cause_category VARCHAR(100), -- training, process, equipment, material, environment, human_error
  root_cause_description TEXT,
  five_whys_analysis JSONB, -- Structured 5 Whys

  -- Corrective Action
  corrective_action TEXT,
  corrective_action_due_date DATE,
  corrective_action_completed_date DATE,
  corrective_action_by UUID REFERENCES users(id),

  -- Preventive Action
  preventive_action TEXT,
  preventive_action_implemented BOOLEAN DEFAULT FALSE,

  -- Verification
  verification_required BOOLEAN DEFAULT TRUE,
  verification_method TEXT,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,

  -- Impact Assessment
  cost_impact BOOLEAN DEFAULT FALSE,
  cost_impact_amount DECIMAL(12,2),
  schedule_impact BOOLEAN DEFAULT FALSE,
  schedule_impact_days INTEGER,
  safety_impact BOOLEAN DEFAULT FALSE,

  -- Disposition
  disposition VARCHAR(50), -- rework, repair, use_as_is, scrap, return_to_supplier
  disposition_notes TEXT,
  disposition_approved_by UUID REFERENCES users(id),
  disposition_approved_at TIMESTAMPTZ,

  -- Attachments & Evidence
  photo_urls JSONB DEFAULT '[]'::JSONB,
  document_urls JSONB DEFAULT '[]'::JSONB,

  -- Dates
  date_identified DATE NOT NULL DEFAULT CURRENT_DATE,
  date_closed DATE,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_ncr_number_per_project UNIQUE (project_id, ncr_number)
);

-- =============================================
-- TABLE 2: NCR History / Audit Trail
-- =============================================

CREATE TABLE IF NOT EXISTS ncr_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_id UUID NOT NULL REFERENCES non_conformance_reports(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  previous_values JSONB,
  new_values JSONB,
  notes TEXT,
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE 3: QC Inspections
-- Formal quality inspections tied to work
-- =============================================

CREATE TABLE IF NOT EXISTS qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identification
  inspection_number INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Classification
  inspection_type VARCHAR(100) NOT NULL, -- pre_work, in_process, final, mock_up, first_article, receiving
  category VARCHAR(100), -- structural, mechanical, electrical, plumbing, architectural, civil

  -- Location & Reference
  location VARCHAR(500),
  spec_section VARCHAR(50),
  drawing_reference VARCHAR(100),
  cost_code_id UUID REFERENCES cost_codes(id),

  -- Work Reference
  daily_report_id UUID REFERENCES daily_reports(id),
  work_order_id UUID,

  -- Inspection Details
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_id UUID REFERENCES users(id),
  witness_required BOOLEAN DEFAULT FALSE,
  witness_id UUID REFERENCES users(id),

  -- Checklist (can link to existing checklist system)
  checklist_template_id UUID REFERENCES checklist_templates(id),
  checklist_response_id UUID REFERENCES checklist_responses(id),

  -- Results
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, passed, failed, conditional
  pass_fail_items JSONB, -- Array of {item, result, notes}
  overall_result VARCHAR(20), -- pass, fail, conditional

  -- Follow-up
  ncr_required BOOLEAN DEFAULT FALSE,
  ncr_id UUID REFERENCES non_conformance_reports(id),
  reinspection_required BOOLEAN DEFAULT FALSE,
  reinspection_date DATE,
  reinspection_id UUID REFERENCES qc_inspections(id),

  -- Sign-off
  inspector_signature TEXT,
  inspector_signed_at TIMESTAMPTZ,
  witness_signature TEXT,
  witness_signed_at TIMESTAMPTZ,

  -- Notes & Attachments
  notes TEXT,
  photo_urls JSONB DEFAULT '[]'::JSONB,
  document_urls JSONB DEFAULT '[]'::JSONB,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_inspection_number_per_project UNIQUE (project_id, inspection_number)
);

-- =============================================
-- TABLE 4: QC Checklist Items (for structured inspection checklists)
-- =============================================

CREATE TABLE IF NOT EXISTS qc_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES qc_inspections(id) ON DELETE CASCADE,

  -- Item Details
  item_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  spec_reference VARCHAR(100),
  acceptance_criteria TEXT,

  -- Result
  result VARCHAR(20), -- pass, fail, na, pending
  deviation_noted BOOLEAN DEFAULT FALSE,
  deviation_description TEXT,

  -- Measurements (if applicable)
  required_value VARCHAR(100),
  actual_value VARCHAR(100),
  tolerance VARCHAR(50),
  within_tolerance BOOLEAN,

  -- Notes & Photos
  notes TEXT,
  photo_urls JSONB DEFAULT '[]'::JSONB,

  -- Order
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FUNCTIONS: Auto-increment numbers
-- =============================================

CREATE OR REPLACE FUNCTION get_next_ncr_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(ncr_number), 0) + 1
  INTO next_num
  FROM non_conformance_reports
  WHERE project_id = p_project_id;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_inspection_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(inspection_number), 0) + 1
  INTO next_num
  FROM qc_inspections
  WHERE project_id = p_project_id;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS: Auto-assign numbers and history
-- =============================================

CREATE OR REPLACE FUNCTION assign_ncr_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ncr_number IS NULL OR NEW.ncr_number = 0 THEN
    NEW.ncr_number := get_next_ncr_number(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_ncr_number ON non_conformance_reports;
CREATE TRIGGER trg_assign_ncr_number
  BEFORE INSERT ON non_conformance_reports
  FOR EACH ROW
  EXECUTE FUNCTION assign_ncr_number();

CREATE OR REPLACE FUNCTION assign_inspection_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inspection_number IS NULL OR NEW.inspection_number = 0 THEN
    NEW.inspection_number := get_next_inspection_number(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_inspection_number ON qc_inspections;
CREATE TRIGGER trg_assign_inspection_number
  BEFORE INSERT ON qc_inspections
  FOR EACH ROW
  EXECUTE FUNCTION assign_inspection_number();

-- NCR History Trigger
CREATE OR REPLACE FUNCTION record_ncr_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ncr_history (
      ncr_id,
      action,
      previous_status,
      new_status,
      performed_by
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_record_ncr_history ON non_conformance_reports;
CREATE TRIGGER trg_record_ncr_history
  AFTER UPDATE ON non_conformance_reports
  FOR EACH ROW
  EXECUTE FUNCTION record_ncr_history();

-- Updated_at triggers
CREATE TRIGGER trg_ncr_updated_at
  BEFORE UPDATE ON non_conformance_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_qc_inspection_updated_at
  BEFORE UPDATE ON qc_inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_qc_checklist_item_updated_at
  BEFORE UPDATE ON qc_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VIEWS: QC Summary and Statistics
-- =============================================

CREATE OR REPLACE VIEW ncr_summary_by_project AS
SELECT
  project_id,
  COUNT(*) as total_ncrs,
  COUNT(*) FILTER (WHERE status = 'open') as open_ncrs,
  COUNT(*) FILTER (WHERE status = 'under_review') as under_review_ncrs,
  COUNT(*) FILTER (WHERE status = 'corrective_action') as corrective_action_ncrs,
  COUNT(*) FILTER (WHERE status = 'verification') as verification_ncrs,
  COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as closed_ncrs,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_ncrs,
  COUNT(*) FILTER (WHERE severity = 'major') as major_ncrs,
  COUNT(*) FILTER (WHERE severity = 'minor') as minor_ncrs,
  COUNT(*) FILTER (WHERE cost_impact = TRUE) as ncrs_with_cost_impact,
  COALESCE(SUM(cost_impact_amount), 0) as total_cost_impact,
  COUNT(*) FILTER (WHERE schedule_impact = TRUE) as ncrs_with_schedule_impact,
  COALESCE(SUM(schedule_impact_days), 0) as total_schedule_impact_days
FROM non_conformance_reports
WHERE deleted_at IS NULL
GROUP BY project_id;

CREATE OR REPLACE VIEW inspection_summary_by_project AS
SELECT
  project_id,
  COUNT(*) as total_inspections,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_inspections,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_inspections,
  COUNT(*) FILTER (WHERE status = 'passed') as passed_inspections,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_inspections,
  COUNT(*) FILTER (WHERE status = 'conditional') as conditional_inspections,
  COUNT(*) FILTER (WHERE ncr_required = TRUE) as inspections_with_ncr,
  COUNT(*) FILTER (WHERE reinspection_required = TRUE) as reinspections_required,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'passed')::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('passed', 'failed')), 0) * 100,
    2
  ) as pass_rate_percent
FROM qc_inspections
WHERE deleted_at IS NULL
GROUP BY project_id;

CREATE OR REPLACE VIEW ncr_by_responsible_party AS
SELECT
  project_id,
  responsible_party_type,
  responsible_subcontractor_id,
  COUNT(*) as total_ncrs,
  COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'voided')) as open_ncrs,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_ncrs,
  COALESCE(SUM(cost_impact_amount), 0) as total_cost_impact
FROM non_conformance_reports
WHERE deleted_at IS NULL
GROUP BY project_id, responsible_party_type, responsible_subcontractor_id;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ncr_project_id ON non_conformance_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_ncr_status ON non_conformance_reports(status);
CREATE INDEX IF NOT EXISTS idx_ncr_severity ON non_conformance_reports(severity);
CREATE INDEX IF NOT EXISTS idx_ncr_responsible_sub ON non_conformance_reports(responsible_subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_ncr_date_identified ON non_conformance_reports(date_identified);
CREATE INDEX IF NOT EXISTS idx_ncr_deleted_at ON non_conformance_reports(deleted_at);

CREATE INDEX IF NOT EXISTS idx_qc_inspection_project_id ON qc_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_qc_inspection_status ON qc_inspections(status);
CREATE INDEX IF NOT EXISTS idx_qc_inspection_type ON qc_inspections(inspection_type);
CREATE INDEX IF NOT EXISTS idx_qc_inspection_date ON qc_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_qc_inspection_deleted_at ON qc_inspections(deleted_at);

CREATE INDEX IF NOT EXISTS idx_ncr_history_ncr_id ON ncr_history(ncr_id);
CREATE INDEX IF NOT EXISTS idx_qc_checklist_items_inspection ON qc_checklist_items(inspection_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE non_conformance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncr_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_checklist_items ENABLE ROW LEVEL SECURITY;

-- NCR Policies
CREATE POLICY ncr_select ON non_conformance_reports
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ncr_insert ON non_conformance_reports
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ncr_update ON non_conformance_reports
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ncr_delete ON non_conformance_reports
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

-- NCR History Policies
CREATE POLICY ncr_history_select ON ncr_history
  FOR SELECT USING (
    ncr_id IN (
      SELECT id FROM non_conformance_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY ncr_history_insert ON ncr_history
  FOR INSERT WITH CHECK (
    ncr_id IN (
      SELECT id FROM non_conformance_reports
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- QC Inspection Policies
CREATE POLICY qc_inspection_select ON qc_inspections
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY qc_inspection_insert ON qc_inspections
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY qc_inspection_update ON qc_inspections
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY qc_inspection_delete ON qc_inspections
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

-- QC Checklist Items Policies
CREATE POLICY qc_checklist_items_select ON qc_checklist_items
  FOR SELECT USING (
    inspection_id IN (
      SELECT id FROM qc_inspections
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY qc_checklist_items_insert ON qc_checklist_items
  FOR INSERT WITH CHECK (
    inspection_id IN (
      SELECT id FROM qc_inspections
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY qc_checklist_items_update ON qc_checklist_items
  FOR UPDATE USING (
    inspection_id IN (
      SELECT id FROM qc_inspections
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY qc_checklist_items_delete ON qc_checklist_items
  FOR DELETE USING (
    inspection_id IN (
      SELECT id FROM qc_inspections
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON non_conformance_reports TO authenticated;
GRANT SELECT, INSERT ON ncr_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON qc_inspections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON qc_checklist_items TO authenticated;
GRANT SELECT ON ncr_summary_by_project TO authenticated;
GRANT SELECT ON inspection_summary_by_project TO authenticated;
GRANT SELECT ON ncr_by_responsible_party TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_ncr_number TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_inspection_number TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE non_conformance_reports IS 'Tracks quality deficiencies and corrective actions';
COMMENT ON TABLE ncr_history IS 'Audit trail for NCR status changes';
COMMENT ON TABLE qc_inspections IS 'Formal quality control inspections';
COMMENT ON TABLE qc_checklist_items IS 'Individual items within a QC inspection checklist';
COMMENT ON VIEW ncr_summary_by_project IS 'Summary statistics for NCRs by project';
COMMENT ON VIEW inspection_summary_by_project IS 'Summary statistics for QC inspections by project';
