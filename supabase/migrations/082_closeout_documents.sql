-- Migration: 082_closeout_documents.sql
-- Description: Close-out document tracking for project completion
-- Features:
--   - Document types (O&M manuals, warranties, as-builts, training certs, etc.)
--   - Spec section tracking
--   - Subcontractor responsibility assignment
--   - Status tracking with review workflow
--   - Closeout checklist requirements

-- =============================================
-- ENUM TYPES
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'closeout_document_type') THEN
    CREATE TYPE closeout_document_type AS ENUM (
      'om_manual',               -- Operation & Maintenance Manual
      'warranty',                -- Warranty document
      'warranty_letter',         -- Warranty letter/certificate
      'as_built',                -- As-built drawings
      'as_built_markup',         -- As-built markups/redlines
      'training_cert',           -- Training certificate
      'training_video',          -- Training video
      'attic_stock',             -- Attic stock list/photos
      'spare_parts',             -- Spare parts list
      'final_lien_waiver',       -- Final lien waiver
      'consent_surety',          -- Consent of surety
      'certificate_occupancy',   -- Certificate of Occupancy
      'certificate_completion',  -- Certificate of Substantial Completion
      'final_inspection',        -- Final inspection certificate
      'punchlist_completion',    -- Punchlist completion certificate
      'test_report',             -- Test/inspection report
      'commissioning_report',    -- Commissioning report
      'air_balance_report',      -- Air balance report
      'keying_schedule',         -- Keying schedule
      'door_hardware_schedule',  -- Door hardware schedule
      'paint_schedule',          -- Paint schedule with colors
      'equipment_list',          -- Major equipment list
      'maintenance_agreement',   -- Maintenance agreement
      'permit_closeout',         -- Permit closeout documentation
      'utility_transfer',        -- Utility transfer documentation
      'software_license',        -- Software licenses
      'access_credentials',      -- Access codes/credentials
      'other'                    -- Other closeout document
    );
  END IF;
END $$;

COMMENT ON TYPE closeout_document_type IS 'Types of closeout documents required for project completion';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'closeout_status') THEN
    CREATE TYPE closeout_status AS ENUM (
      'not_required',    -- Document not required for this project
      'pending',         -- Awaiting document
      'submitted',       -- Document submitted, pending review
      'under_review',    -- Document under review
      'approved',        -- Document approved
      'rejected',        -- Document rejected, needs resubmission
      'waived',          -- Requirement waived
      'na'               -- Not applicable
    );
  END IF;
END $$;

-- =============================================
-- CLOSEOUT DOCUMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS closeout_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Document identification
  document_type closeout_document_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Spec section reference
  spec_section VARCHAR(20),
  spec_section_title TEXT,

  -- Responsibility
  subcontractor_id UUID REFERENCES subcontractors(id),
  responsible_party TEXT, -- If not a subcontractor

  -- Requirements
  required BOOLEAN DEFAULT TRUE,
  required_copies INTEGER DEFAULT 1,
  format_required TEXT, -- e.g., "PDF", "Hard copy", "Both"

  -- Dates
  required_date DATE,
  submitted_date DATE,
  approved_date DATE,

  -- Status
  status closeout_status DEFAULT 'pending',

  -- Document storage
  document_url TEXT,
  document_urls JSONB DEFAULT '[]'::jsonb, -- For multiple files

  -- Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- CLOSEOUT REQUIREMENTS TABLE
-- =============================================

-- Define what's required by spec section (template)
CREATE TABLE IF NOT EXISTS closeout_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Requirement definition
  spec_section VARCHAR(20),
  spec_section_title TEXT,
  document_type closeout_document_type NOT NULL,
  description TEXT,

  -- Requirements
  required BOOLEAN DEFAULT TRUE,
  required_copies INTEGER DEFAULT 1,
  format_required TEXT,
  days_before_completion INTEGER DEFAULT 30, -- Days before substantial completion

  -- Default assignment
  default_responsible_trade TEXT,

  -- Template flag (company-wide vs project-specific)
  is_template BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- CLOSEOUT CHECKLIST TABLE
-- =============================================

-- Project-specific checklist items
CREATE TABLE IF NOT EXISTS closeout_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Item details
  item_number INTEGER,
  category VARCHAR(50), -- e.g., "Documentation", "Training", "Inspection", "Administrative"
  description TEXT NOT NULL,

  -- Assignment
  assigned_to_user_id UUID REFERENCES users(id),
  assigned_to_name TEXT,
  subcontractor_id UUID REFERENCES subcontractors(id),

  -- Status
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),

  -- Dates
  due_date DATE,

  -- Notes
  notes TEXT,

  -- Sort order
  sort_order INTEGER DEFAULT 0,

  -- Link to closeout document
  closeout_document_id UUID REFERENCES closeout_documents(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- WARRANTY TRACKING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Warranty identification
  warranty_number VARCHAR(50),
  title TEXT NOT NULL,
  description TEXT,

  -- Spec section
  spec_section VARCHAR(20),

  -- Provider
  subcontractor_id UUID REFERENCES subcontractors(id),
  manufacturer_name TEXT,
  manufacturer_contact TEXT,
  manufacturer_phone TEXT,
  manufacturer_email TEXT,

  -- Coverage
  warranty_type VARCHAR(30), -- manufacturer, labor, parts_labor, extended
  coverage_description TEXT,

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_years DECIMAL(4,2),

  -- Document
  document_url TEXT,
  closeout_document_id UUID REFERENCES closeout_documents(id),

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, expired, claimed, voided

  -- Notification settings
  notification_days INTEGER[], -- Days before expiration to notify
  last_notification_sent TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_closeout_documents_company ON closeout_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_closeout_documents_project ON closeout_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_closeout_documents_type ON closeout_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_closeout_documents_status ON closeout_documents(status);
CREATE INDEX IF NOT EXISTS idx_closeout_documents_spec ON closeout_documents(spec_section);
CREATE INDEX IF NOT EXISTS idx_closeout_documents_subcontractor ON closeout_documents(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_closeout_documents_not_deleted ON closeout_documents(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_closeout_requirements_company ON closeout_requirements(company_id);
CREATE INDEX IF NOT EXISTS idx_closeout_requirements_project ON closeout_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_closeout_requirements_spec ON closeout_requirements(spec_section);
CREATE INDEX IF NOT EXISTS idx_closeout_requirements_template ON closeout_requirements(is_template) WHERE is_template = TRUE;

CREATE INDEX IF NOT EXISTS idx_closeout_checklist_project ON closeout_checklist(project_id);
CREATE INDEX IF NOT EXISTS idx_closeout_checklist_status ON closeout_checklist(completed);

CREATE INDEX IF NOT EXISTS idx_warranties_project ON warranties(project_id);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON warranties(status);
CREATE INDEX IF NOT EXISTS idx_warranties_end_date ON warranties(end_date);
CREATE INDEX IF NOT EXISTS idx_warranties_expiring ON warranties(end_date) WHERE status = 'active' AND end_date <= CURRENT_DATE + 90;

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_closeout_documents_updated_at
  BEFORE UPDATE ON closeout_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_closeout_requirements_updated_at
  BEFORE UPDATE ON closeout_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_closeout_checklist_updated_at
  BEFORE UPDATE ON closeout_checklist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON warranties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE closeout_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE closeout_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE closeout_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

-- Closeout documents policies
CREATE POLICY "Users can view closeout documents in their company"
  ON closeout_documents FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage closeout documents in their company"
  ON closeout_documents FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Requirements policies
CREATE POLICY "Users can view closeout requirements in their company"
  ON closeout_requirements FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()) OR company_id IS NULL);

CREATE POLICY "Users can manage closeout requirements in their company"
  ON closeout_requirements FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Checklist policies
CREATE POLICY "Users can view closeout checklist in their company"
  ON closeout_checklist FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage closeout checklist in their company"
  ON closeout_checklist FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Warranties policies
CREATE POLICY "Users can view warranties in their company"
  ON warranties FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage warranties in their company"
  ON warranties FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- VIEWS
-- =============================================

-- Closeout status by spec section
CREATE OR REPLACE VIEW closeout_status_by_spec AS
SELECT
  project_id,
  spec_section,
  MAX(spec_section_title) as spec_section_title,
  COUNT(*) as total_documents,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status IN ('pending', 'submitted', 'under_review')) as pending_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE status = 'waived') as waived_count,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'approved')::DECIMAL * 100 /
    NULLIF(COUNT(*) FILTER (WHERE required = TRUE AND status != 'not_required'), 0),
    1
  ) as completion_percentage,
  CASE
    WHEN COUNT(*) FILTER (WHERE status = 'rejected') > 0 THEN 'red'
    WHEN COUNT(*) FILTER (WHERE required = TRUE AND status = 'approved') = COUNT(*) FILTER (WHERE required = TRUE AND status != 'not_required') THEN 'green'
    WHEN COUNT(*) FILTER (WHERE status = 'approved') > 0 THEN 'yellow'
    ELSE 'gray'
  END as traffic_light
FROM closeout_documents
WHERE deleted_at IS NULL
GROUP BY project_id, spec_section
ORDER BY spec_section;

COMMENT ON VIEW closeout_status_by_spec IS 'Closeout document status summary by spec section';

-- Project closeout summary
CREATE OR REPLACE VIEW project_closeout_summary AS
SELECT
  cd.project_id,
  p.name as project_name,
  COUNT(*) as total_documents,
  COUNT(*) FILTER (WHERE cd.status = 'approved') as approved,
  COUNT(*) FILTER (WHERE cd.status IN ('pending', 'submitted', 'under_review')) as pending,
  COUNT(*) FILTER (WHERE cd.status = 'rejected') as rejected,
  ROUND(
    COUNT(*) FILTER (WHERE cd.status = 'approved')::DECIMAL * 100 /
    NULLIF(COUNT(*) FILTER (WHERE cd.required = TRUE AND cd.status != 'not_required'), 0),
    1
  ) as overall_completion_percentage,
  -- Checklist progress
  (SELECT COUNT(*) FROM closeout_checklist cc WHERE cc.project_id = cd.project_id AND cc.deleted_at IS NULL) as total_checklist_items,
  (SELECT COUNT(*) FROM closeout_checklist cc WHERE cc.project_id = cd.project_id AND cc.completed = TRUE AND cc.deleted_at IS NULL) as completed_checklist_items,
  -- Warranty summary
  (SELECT COUNT(*) FROM warranties w WHERE w.project_id = cd.project_id AND w.status = 'active' AND w.deleted_at IS NULL) as active_warranties,
  (SELECT COUNT(*) FROM warranties w WHERE w.project_id = cd.project_id AND w.status = 'active' AND w.end_date <= CURRENT_DATE + 90 AND w.deleted_at IS NULL) as expiring_warranties
FROM closeout_documents cd
JOIN projects p ON cd.project_id = p.id
WHERE cd.deleted_at IS NULL
GROUP BY cd.project_id, p.name;

COMMENT ON VIEW project_closeout_summary IS 'Overall closeout status summary for each project';

-- Expiring warranties view
CREATE OR REPLACE VIEW expiring_warranties AS
SELECT
  w.id,
  w.project_id,
  p.name as project_name,
  w.title,
  w.spec_section,
  w.manufacturer_name,
  w.start_date,
  w.end_date,
  w.end_date - CURRENT_DATE as days_until_expiration,
  sub.company_name as subcontractor_name,
  w.warranty_type,
  w.coverage_description
FROM warranties w
JOIN projects p ON w.project_id = p.id
LEFT JOIN subcontractors sub ON w.subcontractor_id = sub.id
WHERE w.deleted_at IS NULL
  AND w.status = 'active'
  AND w.end_date <= CURRENT_DATE + 90
ORDER BY w.end_date;

COMMENT ON VIEW expiring_warranties IS 'Warranties expiring within 90 days';

-- Comments
COMMENT ON TABLE closeout_documents IS 'Closeout documents required for project completion';
COMMENT ON TABLE closeout_requirements IS 'Template/requirements for closeout documents by spec section';
COMMENT ON TABLE closeout_checklist IS 'Project-specific closeout checklist items';
COMMENT ON TABLE warranties IS 'Warranty tracking with expiration notifications';

-- =============================================
-- SEED DEFAULT CLOSEOUT REQUIREMENTS
-- =============================================

-- Insert common closeout requirements as templates
INSERT INTO closeout_requirements (document_type, spec_section, description, required, required_copies, format_required, is_template)
VALUES
  ('om_manual', '01 00 00', 'General O&M Manual', TRUE, 2, 'PDF and hard copy', TRUE),
  ('as_built', '01 00 00', 'As-Built Drawings', TRUE, 1, 'PDF', TRUE),
  ('warranty', '01 00 00', 'General Warranty Letter', TRUE, 1, 'PDF', TRUE),
  ('final_lien_waiver', '01 00 00', 'Final Lien Waiver', TRUE, 1, 'PDF', TRUE),
  ('certificate_completion', '01 00 00', 'Certificate of Substantial Completion', TRUE, 1, 'PDF', TRUE),
  ('punchlist_completion', '01 00 00', 'Punchlist Completion Certificate', TRUE, 1, 'PDF', TRUE),
  ('om_manual', '23 00 00', 'HVAC O&M Manual', TRUE, 2, 'PDF and hard copy', TRUE),
  ('warranty', '23 00 00', 'HVAC Equipment Warranty', TRUE, 1, 'PDF', TRUE),
  ('commissioning_report', '23 00 00', 'HVAC Commissioning Report', TRUE, 1, 'PDF', TRUE),
  ('air_balance_report', '23 00 00', 'Air Balance Report', TRUE, 1, 'PDF', TRUE),
  ('training_cert', '23 00 00', 'HVAC Training Certificate', TRUE, 1, 'PDF', TRUE),
  ('om_manual', '26 00 00', 'Electrical O&M Manual', TRUE, 2, 'PDF and hard copy', TRUE),
  ('warranty', '26 00 00', 'Electrical Equipment Warranty', TRUE, 1, 'PDF', TRUE),
  ('test_report', '26 00 00', 'Electrical Test Reports', TRUE, 1, 'PDF', TRUE),
  ('om_manual', '22 00 00', 'Plumbing O&M Manual', TRUE, 2, 'PDF and hard copy', TRUE),
  ('warranty', '22 00 00', 'Plumbing Equipment Warranty', TRUE, 1, 'PDF', TRUE),
  ('om_manual', '21 00 00', 'Fire Suppression O&M Manual', TRUE, 2, 'PDF and hard copy', TRUE),
  ('warranty', '21 00 00', 'Fire Suppression Warranty', TRUE, 1, 'PDF', TRUE),
  ('test_report', '21 00 00', 'Fire Suppression Test Report', TRUE, 1, 'PDF', TRUE),
  ('keying_schedule', '08 71 00', 'Final Keying Schedule', TRUE, 1, 'PDF and Excel', TRUE),
  ('door_hardware_schedule', '08 71 00', 'Door Hardware Schedule', TRUE, 1, 'PDF', TRUE),
  ('paint_schedule', '09 91 00', 'Paint Schedule with Colors', TRUE, 1, 'PDF', TRUE),
  ('warranty', '07 00 00', 'Roofing Warranty', TRUE, 1, 'PDF', TRUE),
  ('attic_stock', '09 30 00', 'Attic Stock - Tile', TRUE, 1, 'Photos and location', TRUE),
  ('attic_stock', '09 65 00', 'Attic Stock - Flooring', TRUE, 1, 'Photos and location', TRUE)
ON CONFLICT DO NOTHING;
