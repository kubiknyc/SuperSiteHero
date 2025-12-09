-- =============================================
-- Migration: Job Safety Analysis (JSA)
-- Description: Pre-task job hazard analysis with hazard/control identification
-- =============================================

-- JSA Templates (reusable hazard analysis templates)
CREATE TABLE IF NOT EXISTS jsa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template identification
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- excavation, electrical, confined_space, hot_work, etc.

  -- Work type
  work_type VARCHAR(100), -- general, specialized, high_risk

  -- Default hazards and controls (JSONB for flexibility)
  default_hazards JSONB DEFAULT '[]'::jsonb, -- Array of {hazard, risk_level, controls[], ppe[]}

  -- Associated training requirements
  required_training TEXT[],

  -- Regulatory references
  osha_standards TEXT[],
  other_references TEXT,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Job Safety Analyses table
CREATE TABLE IF NOT EXISTS job_safety_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- JSA identification
  jsa_number VARCHAR(50) NOT NULL, -- JSA-YYYY-NNNN format
  revision_number INTEGER DEFAULT 0,

  -- Based on template (optional)
  template_id UUID REFERENCES jsa_templates(id),

  -- Task information
  task_description TEXT NOT NULL,
  work_location VARCHAR(500),
  equipment_used TEXT[],

  -- Scheduling
  scheduled_date DATE NOT NULL,
  start_time TIME,
  estimated_duration VARCHAR(50), -- e.g., "2 hours", "1 day"

  -- Related permits/documents
  work_permit_id UUID, -- FK to work_permits if exists
  related_incident_id UUID, -- FK to safety_incidents if related to prior incident

  -- Responsible parties
  supervisor_id UUID REFERENCES users(id),
  supervisor_name VARCHAR(200),
  foreman_name VARCHAR(200),
  contractor_company VARCHAR(200),

  -- Review/approval
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft', -- draft, pending_review, approved, in_progress, completed, cancelled
  completed_date DATE,
  completion_notes TEXT,

  -- Weather conditions (for outdoor work)
  weather_conditions VARCHAR(100),
  temperature VARCHAR(20),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_jsa_number UNIQUE (company_id, project_id, jsa_number)
);

-- JSA Hazards table
CREATE TABLE IF NOT EXISTS jsa_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jsa_id UUID NOT NULL REFERENCES job_safety_analyses(id) ON DELETE CASCADE,

  -- Step/sequence
  step_number INTEGER NOT NULL,
  step_description TEXT NOT NULL, -- The task step being analyzed

  -- Hazard identification
  hazard_description TEXT NOT NULL,
  hazard_type VARCHAR(100), -- physical, chemical, biological, ergonomic, environmental

  -- Risk assessment
  risk_level VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
  probability VARCHAR(50), -- unlikely, possible, likely, certain
  severity VARCHAR(50), -- minor, moderate, serious, catastrophic

  -- Controls (hierarchy of controls)
  elimination_controls TEXT, -- Can the hazard be eliminated?
  substitution_controls TEXT, -- Can something less hazardous be used?
  engineering_controls TEXT, -- Physical changes to workplace
  administrative_controls TEXT, -- Policies, training, procedures
  ppe_required TEXT[], -- Required PPE items

  -- Responsible party
  responsible_party VARCHAR(200),
  responsible_party_id UUID REFERENCES users(id),

  -- Verification
  controls_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  -- Constraints
  CONSTRAINT unique_step_per_jsa UNIQUE (jsa_id, step_number)
);

-- JSA Acknowledgments table (worker sign-offs)
CREATE TABLE IF NOT EXISTS jsa_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jsa_id UUID NOT NULL REFERENCES job_safety_analyses(id) ON DELETE CASCADE,

  -- Worker identification
  user_id UUID REFERENCES users(id), -- Internal user (if applicable)
  worker_name VARCHAR(200) NOT NULL,
  worker_company VARCHAR(200),
  worker_trade VARCHAR(100),
  worker_badge_number VARCHAR(50),

  -- Acknowledgment
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_data TEXT, -- base64 encoded signature

  -- Understanding confirmation
  understands_hazards BOOLEAN DEFAULT TRUE,
  has_questions BOOLEAN DEFAULT FALSE,
  questions_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_worker_per_jsa UNIQUE (jsa_id, worker_name, worker_company)
);

-- JSA Attachments table
CREATE TABLE IF NOT EXISTS jsa_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jsa_id UUID NOT NULL REFERENCES job_safety_analyses(id) ON DELETE CASCADE,

  -- File information
  file_name VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  attachment_type VARCHAR(50), -- photo, document, diagram, sds

  -- Metadata
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),
  description TEXT
);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_jsa_templates_company
  ON jsa_templates(company_id);

CREATE INDEX IF NOT EXISTS idx_jsa_templates_category
  ON jsa_templates(category);

CREATE INDEX IF NOT EXISTS idx_jsa_company
  ON job_safety_analyses(company_id);

CREATE INDEX IF NOT EXISTS idx_jsa_project
  ON job_safety_analyses(project_id);

CREATE INDEX IF NOT EXISTS idx_jsa_number
  ON job_safety_analyses(jsa_number);

CREATE INDEX IF NOT EXISTS idx_jsa_status
  ON job_safety_analyses(status);

CREATE INDEX IF NOT EXISTS idx_jsa_scheduled_date
  ON job_safety_analyses(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_jsa_supervisor
  ON job_safety_analyses(supervisor_id);

CREATE INDEX IF NOT EXISTS idx_jsa_hazards_jsa
  ON jsa_hazards(jsa_id);

CREATE INDEX IF NOT EXISTS idx_jsa_hazards_risk
  ON jsa_hazards(risk_level);

CREATE INDEX IF NOT EXISTS idx_jsa_acknowledgments_jsa
  ON jsa_acknowledgments(jsa_id);

CREATE INDEX IF NOT EXISTS idx_jsa_acknowledgments_worker
  ON jsa_acknowledgments(worker_name);

CREATE INDEX IF NOT EXISTS idx_jsa_attachments_jsa
  ON jsa_attachments(jsa_id);

-- =============================================
-- Triggers
-- =============================================

-- Auto-update updated_at for JSA
CREATE OR REPLACE FUNCTION update_jsa_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jsa_updated ON job_safety_analyses;
CREATE TRIGGER trg_jsa_updated
  BEFORE UPDATE ON job_safety_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_jsa_timestamp();

DROP TRIGGER IF EXISTS trg_jsa_templates_updated ON jsa_templates;
CREATE TRIGGER trg_jsa_templates_updated
  BEFORE UPDATE ON jsa_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_jsa_timestamp();

-- Auto-generate JSA number
CREATE OR REPLACE FUNCTION generate_jsa_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix VARCHAR(4);
  next_number INTEGER;
BEGIN
  IF NEW.jsa_number IS NULL OR NEW.jsa_number = '' THEN
    year_prefix := to_char(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
      CAST(NULLIF(regexp_replace(jsa_number, '^JSA-' || year_prefix || '-', ''), '') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM job_safety_analyses
    WHERE company_id = NEW.company_id
      AND project_id = NEW.project_id
      AND jsa_number LIKE 'JSA-' || year_prefix || '-%';

    NEW.jsa_number := 'JSA-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jsa_number ON job_safety_analyses;
CREATE TRIGGER trg_jsa_number
  BEFORE INSERT ON job_safety_analyses
  FOR EACH ROW
  EXECUTE FUNCTION generate_jsa_number();

-- Auto-number JSA hazard steps
CREATE OR REPLACE FUNCTION set_jsa_hazard_step_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.step_number IS NULL OR NEW.step_number = 0 THEN
    SELECT COALESCE(MAX(step_number), 0) + 1
    INTO NEW.step_number
    FROM jsa_hazards
    WHERE jsa_id = NEW.jsa_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jsa_hazard_step ON jsa_hazards;
CREATE TRIGGER trg_jsa_hazard_step
  BEFORE INSERT ON jsa_hazards
  FOR EACH ROW
  EXECUTE FUNCTION set_jsa_hazard_step_number();

-- Increment template usage count
CREATE OR REPLACE FUNCTION increment_jsa_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE jsa_templates
    SET usage_count = usage_count + 1
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jsa_template_usage ON job_safety_analyses;
CREATE TRIGGER trg_jsa_template_usage
  AFTER INSERT ON job_safety_analyses
  FOR EACH ROW
  EXECUTE FUNCTION increment_jsa_template_usage();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE jsa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_safety_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE jsa_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE jsa_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jsa_attachments ENABLE ROW LEVEL SECURITY;

-- JSA Templates: Users can see company templates
CREATE POLICY jsa_templates_select ON jsa_templates
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- JSA Templates: Users can create templates for their company
CREATE POLICY jsa_templates_insert ON jsa_templates
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- JSA Templates: Admins can update templates
CREATE POLICY jsa_templates_update ON jsa_templates
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

-- JSA Templates: Admins can delete templates
CREATE POLICY jsa_templates_delete ON jsa_templates
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- JSA: Users can see JSAs for their projects
CREATE POLICY jsa_select ON job_safety_analyses
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- JSA: Users can create JSAs for their projects
CREATE POLICY jsa_insert ON job_safety_analyses
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- JSA: Users can update JSAs for their projects
CREATE POLICY jsa_update ON job_safety_analyses
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- JSA: Only creators/admins can delete draft JSAs
CREATE POLICY jsa_delete ON job_safety_analyses
  FOR DELETE USING (
    created_by = auth.uid()
    AND status = 'draft'
  );

-- JSA Hazards: Users can manage hazards for JSAs they can see
CREATE POLICY jsa_hazards_select ON jsa_hazards
  FOR SELECT USING (
    jsa_id IN (
      SELECT id FROM job_safety_analyses
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY jsa_hazards_insert ON jsa_hazards
  FOR INSERT WITH CHECK (
    jsa_id IN (
      SELECT id FROM job_safety_analyses
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY jsa_hazards_update ON jsa_hazards
  FOR UPDATE USING (
    jsa_id IN (
      SELECT id FROM job_safety_analyses
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY jsa_hazards_delete ON jsa_hazards
  FOR DELETE USING (
    jsa_id IN (
      SELECT id FROM job_safety_analyses
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
      AND status IN ('draft', 'pending_review')
    )
  );

-- JSA Acknowledgments: Same pattern
CREATE POLICY jsa_acknowledgments_select ON jsa_acknowledgments
  FOR SELECT USING (
    jsa_id IN (
      SELECT id FROM job_safety_analyses
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY jsa_acknowledgments_insert ON jsa_acknowledgments
  FOR INSERT WITH CHECK (
    jsa_id IN (
      SELECT id FROM job_safety_analyses
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY jsa_acknowledgments_delete ON jsa_acknowledgments
  FOR DELETE USING (
    jsa_id IN (
      SELECT id FROM job_safety_analyses
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
      AND status IN ('draft', 'pending_review', 'approved')
    )
  );

-- JSA Attachments: Same pattern
CREATE POLICY jsa_attachments_select ON jsa_attachments
  FOR SELECT USING (
    jsa_id IN (
      SELECT id FROM job_safety_analyses
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY jsa_attachments_insert ON jsa_attachments
  FOR INSERT WITH CHECK (
    jsa_id IN (
      SELECT id FROM job_safety_analyses
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY jsa_attachments_delete ON jsa_attachments
  FOR DELETE USING (
    jsa_id IN (
      SELECT id FROM job_safety_analyses
      WHERE project_id IN (
        SELECT project_id FROM project_users WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- Helper Functions
-- =============================================

-- Get next JSA number preview
CREATE OR REPLACE FUNCTION get_next_jsa_number(
  p_company_id UUID,
  p_project_id UUID
)
RETURNS VARCHAR(50) AS $$
DECLARE
  year_prefix VARCHAR(4);
  next_number INTEGER;
BEGIN
  year_prefix := to_char(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(jsa_number, '^JSA-' || year_prefix || '-', ''), '') AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM job_safety_analyses
  WHERE company_id = p_company_id
    AND project_id = p_project_id
    AND jsa_number LIKE 'JSA-' || year_prefix || '-%';

  RETURN 'JSA-' || year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get JSA statistics for a project
CREATE OR REPLACE FUNCTION get_jsa_statistics(p_project_id UUID)
RETURNS TABLE (
  total_jsas INTEGER,
  pending_review INTEGER,
  approved INTEGER,
  completed INTEGER,
  high_risk_count INTEGER,
  avg_hazards_per_jsa NUMERIC,
  total_acknowledgments INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(j.id)::INTEGER AS total_jsas,
    COUNT(j.id) FILTER (WHERE j.status = 'pending_review')::INTEGER AS pending_review,
    COUNT(j.id) FILTER (WHERE j.status = 'approved')::INTEGER AS approved,
    COUNT(j.id) FILTER (WHERE j.status = 'completed')::INTEGER AS completed,
    (SELECT COUNT(*) FROM jsa_hazards h
     WHERE h.jsa_id IN (SELECT id FROM job_safety_analyses WHERE project_id = p_project_id)
     AND h.risk_level IN ('high', 'critical'))::INTEGER AS high_risk_count,
    (SELECT AVG(hazard_count)::NUMERIC(10,2) FROM (
      SELECT COUNT(*) AS hazard_count FROM jsa_hazards h
      WHERE h.jsa_id IN (SELECT id FROM job_safety_analyses WHERE project_id = p_project_id)
      GROUP BY h.jsa_id
    ) counts) AS avg_hazards_per_jsa,
    (SELECT COUNT(*) FROM jsa_acknowledgments a
     WHERE a.jsa_id IN (SELECT id FROM job_safety_analyses WHERE project_id = p_project_id))::INTEGER AS total_acknowledgments
  FROM job_safety_analyses j
  WHERE j.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Seed Common JSA Templates
-- =============================================

-- Note: Run this only for initial setup, not in production migrations
-- INSERT INTO jsa_templates (company_id, name, category, work_type, default_hazards, required_training, osha_standards)
-- VALUES (...);

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE jsa_templates IS 'Reusable JSA templates with predefined hazards and controls';
COMMENT ON TABLE job_safety_analyses IS 'Job Safety Analysis documents for pre-task hazard identification';
COMMENT ON TABLE jsa_hazards IS 'Individual hazards and control measures for each JSA step';
COMMENT ON TABLE jsa_acknowledgments IS 'Worker acknowledgments/signatures for JSA understanding';
COMMENT ON TABLE jsa_attachments IS 'Supporting documents, photos, and diagrams for JSAs';
COMMENT ON COLUMN jsa_hazards.risk_level IS 'Risk level: low, medium, high, critical';
COMMENT ON COLUMN jsa_hazards.ppe_required IS 'Array of required PPE items for this hazard';
