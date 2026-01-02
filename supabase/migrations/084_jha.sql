-- Migration: 084_jha.sql
-- Description: Job Hazard Analysis (JHA) templates and records
-- Created: 2026-01-02

-- ============================================================================
-- JHA TEMPLATES
-- ============================================================================

-- JHA template library by activity
CREATE TABLE IF NOT EXISTS jha_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template identification
  name VARCHAR(200) NOT NULL,
  description TEXT,
  activity_type VARCHAR(100) NOT NULL, -- e.g., 'concrete_pour', 'steel_erection', 'excavation'

  -- Template metadata
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,

  -- Risk level summary
  overall_risk_level VARCHAR(20), -- low, medium, high, critical

  -- Required PPE for this activity
  required_ppe TEXT[] DEFAULT '{}',

  -- Required training/certifications
  required_certifications TEXT[] DEFAULT '{}',

  -- Categorization
  category VARCHAR(100), -- general_construction, electrical, mechanical, etc.
  tags TEXT[] DEFAULT '{}',

  -- Created/updated
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- JHA template steps (hazards and controls matrix)
CREATE TABLE IF NOT EXISTS jha_template_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES jha_templates(id) ON DELETE CASCADE,

  -- Step details
  step_number INTEGER NOT NULL,
  step_description TEXT NOT NULL,

  -- Hazards for this step
  hazards JSONB NOT NULL DEFAULT '[]', -- Array of { description, type }
  -- Hazard types: struck_by, caught_between, fall, electrical, chemical, ergonomic, etc.

  -- Controls for hazards
  controls JSONB NOT NULL DEFAULT '[]', -- Array of { description, type, hazard_index }
  -- Control types: elimination, substitution, engineering, administrative, ppe

  -- Risk assessment
  severity INTEGER NOT NULL DEFAULT 1, -- 1-5
  probability INTEGER NOT NULL DEFAULT 1, -- 1-5
  risk_score INTEGER GENERATED ALWAYS AS (severity * probability) STORED,
  risk_level VARCHAR(20) GENERATED ALWAYS AS (
    CASE
      WHEN severity * probability <= 4 THEN 'low'
      WHEN severity * probability <= 9 THEN 'medium'
      WHEN severity * probability <= 16 THEN 'high'
      ELSE 'critical'
    END
  ) STORED,

  -- Residual risk (after controls)
  residual_severity INTEGER DEFAULT 1,
  residual_probability INTEGER DEFAULT 1,
  residual_risk_score INTEGER GENERATED ALWAYS AS (COALESCE(residual_severity, 1) * COALESCE(residual_probability, 1)) STORED,

  -- Step-specific PPE
  step_ppe TEXT[] DEFAULT '{}',

  -- Responsible party
  responsible_party VARCHAR(200),

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- COMPLETED JHAs
-- ============================================================================

-- JHA records (completed for specific work)
CREATE TABLE IF NOT EXISTS jha_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES jha_templates(id),

  -- JHA identification
  jha_number VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  activity_type VARCHAR(100),

  -- Work details
  work_location VARCHAR(200),
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  estimated_duration VARCHAR(100),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, pending_review, approved, in_progress, completed
  overall_risk_level VARCHAR(20),

  -- Preparation
  prepared_by UUID REFERENCES profiles(id),
  prepared_at TIMESTAMPTZ,

  -- Review/Approval
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,

  -- Required PPE for this JHA
  required_ppe TEXT[] DEFAULT '{}',

  -- Required certifications
  required_certifications TEXT[] DEFAULT '{}',

  -- Weather and conditions
  weather_conditions VARCHAR(200),
  special_conditions TEXT,

  -- Emergency contacts
  emergency_contacts JSONB DEFAULT '[]', -- Array of { name, role, phone }

  -- Completion
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- JHA record steps (hazard analysis for specific work)
CREATE TABLE IF NOT EXISTS jha_record_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jha_record_id UUID NOT NULL REFERENCES jha_records(id) ON DELETE CASCADE,
  template_step_id UUID REFERENCES jha_template_steps(id),

  -- Step details
  step_number INTEGER NOT NULL,
  step_description TEXT NOT NULL,

  -- Hazards identified
  hazards JSONB NOT NULL DEFAULT '[]',

  -- Controls implemented
  controls JSONB NOT NULL DEFAULT '[]',

  -- Risk assessment
  severity INTEGER NOT NULL DEFAULT 1,
  probability INTEGER NOT NULL DEFAULT 1,
  risk_score INTEGER GENERATED ALWAYS AS (severity * probability) STORED,
  risk_level VARCHAR(20) GENERATED ALWAYS AS (
    CASE
      WHEN severity * probability <= 4 THEN 'low'
      WHEN severity * probability <= 9 THEN 'medium'
      WHEN severity * probability <= 16 THEN 'high'
      ELSE 'critical'
    END
  ) STORED,

  -- Residual risk
  residual_severity INTEGER DEFAULT 1,
  residual_probability INTEGER DEFAULT 1,

  -- Step-specific PPE
  step_ppe TEXT[] DEFAULT '{}',

  -- Responsible party
  responsible_party VARCHAR(200),

  -- Additional notes
  notes TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Worker acknowledgments for JHA
CREATE TABLE IF NOT EXISTS jha_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jha_record_id UUID NOT NULL REFERENCES jha_records(id) ON DELETE CASCADE,

  -- Worker info
  user_id UUID REFERENCES profiles(id),
  worker_name VARCHAR(200) NOT NULL,
  worker_company VARCHAR(200),
  worker_trade VARCHAR(100),

  -- Acknowledgment
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Signature (base64 or URL)
  signature_data TEXT,
  signature_type VARCHAR(20) DEFAULT 'text', -- text, image, digital

  -- Device/location info
  device_info VARCHAR(200),
  location_coordinates JSONB,

  -- Certification verification
  certifications_verified BOOLEAN NOT NULL DEFAULT false,
  certification_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PPE TYPES REFERENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ppe_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- PPE details
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- head, eye, hearing, respiratory, hand, foot, body, fall_protection

  -- Icon/image
  icon_name VARCHAR(50),
  image_url TEXT,

  -- Is this a system default or company custom
  is_system_default BOOLEAN NOT NULL DEFAULT false,

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_jha_templates_company ON jha_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_jha_templates_activity ON jha_templates(activity_type);
CREATE INDEX IF NOT EXISTS idx_jha_templates_active ON jha_templates(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_jha_template_steps_template ON jha_template_steps(template_id);
CREATE INDEX IF NOT EXISTS idx_jha_template_steps_order ON jha_template_steps(template_id, step_number);
CREATE INDEX IF NOT EXISTS idx_jha_template_steps_risk ON jha_template_steps(risk_level);

CREATE INDEX IF NOT EXISTS idx_jha_records_project ON jha_records(project_id);
CREATE INDEX IF NOT EXISTS idx_jha_records_company ON jha_records(company_id);
CREATE INDEX IF NOT EXISTS idx_jha_records_template ON jha_records(template_id);
CREATE INDEX IF NOT EXISTS idx_jha_records_date ON jha_records(work_date);
CREATE INDEX IF NOT EXISTS idx_jha_records_status ON jha_records(status);

CREATE INDEX IF NOT EXISTS idx_jha_record_steps_record ON jha_record_steps(jha_record_id);

CREATE INDEX IF NOT EXISTS idx_jha_acknowledgments_record ON jha_acknowledgments(jha_record_id);
CREATE INDEX IF NOT EXISTS idx_jha_acknowledgments_user ON jha_acknowledgments(user_id);

CREATE INDEX IF NOT EXISTS idx_ppe_types_company ON ppe_types(company_id);
CREATE INDEX IF NOT EXISTS idx_ppe_types_category ON ppe_types(category);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE jha_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_record_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE jha_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_types ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Users can view JHA templates from their company"
  ON jha_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage JHA templates"
  ON jha_templates FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Template steps policies
CREATE POLICY "Users can view JHA template steps"
  ON jha_template_steps FOR SELECT
  USING (template_id IN (
    SELECT id FROM jha_templates
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Admins can manage JHA template steps"
  ON jha_template_steps FOR ALL
  USING (template_id IN (
    SELECT id FROM jha_templates
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

-- JHA records policies
CREATE POLICY "Users can view JHA records from their projects"
  ON jha_records FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create JHA records"
  ON jha_records FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update JHA records they prepared or are admins"
  ON jha_records FOR UPDATE
  USING (
    prepared_by = auth.uid()
    OR project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Record steps policies
CREATE POLICY "Users can view JHA record steps"
  ON jha_record_steps FOR SELECT
  USING (jha_record_id IN (
    SELECT id FROM jha_records
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage JHA record steps"
  ON jha_record_steps FOR ALL
  USING (jha_record_id IN (
    SELECT id FROM jha_records
    WHERE prepared_by = auth.uid()
    OR project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  ));

-- Acknowledgments policies
CREATE POLICY "Users can view acknowledgments from accessible JHAs"
  ON jha_acknowledgments FOR SELECT
  USING (jha_record_id IN (
    SELECT id FROM jha_records
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can add acknowledgments"
  ON jha_acknowledgments FOR INSERT
  WITH CHECK (jha_record_id IN (
    SELECT id FROM jha_records
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

-- PPE types policies
CREATE POLICY "Users can view PPE types"
  ON ppe_types FOR SELECT
  USING (
    is_system_default = true
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage company PPE types"
  ON ppe_types FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate JHA number
CREATE OR REPLACE FUNCTION generate_jha_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  next_num INTEGER;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CASE
      WHEN jha_number ~ ('^JHA-' || year_prefix || '-[0-9]+$')
      THEN CAST(SUBSTRING(jha_number FROM '[0-9]+$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM jha_records
  WHERE company_id = NEW.company_id
    AND jha_number LIKE 'JHA-' || year_prefix || '-%';

  NEW.jha_number := 'JHA-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_jha_number
  BEFORE INSERT ON jha_records
  FOR EACH ROW
  WHEN (NEW.jha_number IS NULL)
  EXECUTE FUNCTION generate_jha_number();

-- Calculate overall risk level for JHA
CREATE OR REPLACE FUNCTION update_jha_overall_risk()
RETURNS TRIGGER AS $$
DECLARE
  max_risk_score INTEGER;
  new_risk_level VARCHAR(20);
BEGIN
  SELECT MAX(risk_score)
  INTO max_risk_score
  FROM jha_record_steps
  WHERE jha_record_id = COALESCE(NEW.jha_record_id, OLD.jha_record_id);

  new_risk_level := CASE
    WHEN max_risk_score <= 4 THEN 'low'
    WHEN max_risk_score <= 9 THEN 'medium'
    WHEN max_risk_score <= 16 THEN 'high'
    ELSE 'critical'
  END;

  UPDATE jha_records
  SET overall_risk_level = new_risk_level,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.jha_record_id, OLD.jha_record_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jha_risk
  AFTER INSERT OR UPDATE OR DELETE ON jha_record_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_jha_overall_risk();

-- Update timestamps
CREATE TRIGGER update_jha_templates_timestamp
  BEFORE UPDATE ON jha_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jha_template_steps_timestamp
  BEFORE UPDATE ON jha_template_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jha_records_timestamp
  BEFORE UPDATE ON jha_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jha_record_steps_timestamp
  BEFORE UPDATE ON jha_record_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT PPE TYPES
-- ============================================================================

INSERT INTO ppe_types (code, name, description, category, icon_name, is_system_default, sort_order) VALUES
  ('hard_hat', 'Hard Hat', 'Head protection', 'head', 'hard-hat', true, 1),
  ('safety_glasses', 'Safety Glasses', 'Eye protection - impact resistant', 'eye', 'glasses', true, 2),
  ('safety_goggles', 'Safety Goggles', 'Eye protection - splash resistant', 'eye', 'goggles', true, 3),
  ('face_shield', 'Face Shield', 'Full face protection', 'eye', 'face-shield', true, 4),
  ('ear_plugs', 'Ear Plugs', 'Hearing protection - disposable', 'hearing', 'ear-plugs', true, 5),
  ('ear_muffs', 'Ear Muffs', 'Hearing protection - reusable', 'hearing', 'ear-muffs', true, 6),
  ('n95_respirator', 'N95 Respirator', 'Dust/particulate protection', 'respiratory', 'mask', true, 7),
  ('half_face_respirator', 'Half-Face Respirator', 'Chemical/vapor protection', 'respiratory', 'respirator', true, 8),
  ('full_face_respirator', 'Full-Face Respirator', 'Complete respiratory protection', 'respiratory', 'respirator-full', true, 9),
  ('scba', 'SCBA', 'Self-Contained Breathing Apparatus', 'respiratory', 'scba', true, 10),
  ('leather_gloves', 'Leather Gloves', 'General hand protection', 'hand', 'gloves', true, 11),
  ('cut_resistant_gloves', 'Cut-Resistant Gloves', 'Cut hazard protection', 'hand', 'gloves-cut', true, 12),
  ('chemical_gloves', 'Chemical Gloves', 'Chemical protection', 'hand', 'gloves-chemical', true, 13),
  ('electrical_gloves', 'Electrical Gloves', 'Electrical hazard protection', 'hand', 'gloves-electrical', true, 14),
  ('steel_toe_boots', 'Steel Toe Boots', 'Foot protection - impact', 'foot', 'boots', true, 15),
  ('metatarsal_boots', 'Metatarsal Boots', 'Foot protection - metatarsal', 'foot', 'boots-meta', true, 16),
  ('rubber_boots', 'Rubber Boots', 'Foot protection - chemical/water', 'foot', 'boots-rubber', true, 17),
  ('hi_vis_vest', 'Hi-Vis Vest', 'High visibility vest', 'body', 'vest', true, 18),
  ('coveralls', 'Coveralls', 'Full body protection', 'body', 'coveralls', true, 19),
  ('fr_clothing', 'FR Clothing', 'Fire resistant clothing', 'body', 'fr-suit', true, 20),
  ('fall_harness', 'Fall Harness', 'Fall protection harness', 'fall_protection', 'harness', true, 21),
  ('lanyard', 'Lanyard', 'Fall protection lanyard', 'fall_protection', 'lanyard', true, 22),
  ('srl', 'Self-Retracting Lifeline', 'Self-retracting lifeline', 'fall_protection', 'srl', true, 23),
  ('welding_helmet', 'Welding Helmet', 'Welding eye/face protection', 'eye', 'welding-helmet', true, 24),
  ('welding_jacket', 'Welding Jacket', 'Welding body protection', 'body', 'welding-jacket', true, 25)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE jha_templates IS 'Job Hazard Analysis templates by activity type';
COMMENT ON TABLE jha_template_steps IS 'Individual steps within JHA templates with hazards and controls';
COMMENT ON TABLE jha_records IS 'Completed JHA records for specific work activities';
COMMENT ON TABLE jha_record_steps IS 'Hazard analysis steps for specific JHA records';
COMMENT ON TABLE jha_acknowledgments IS 'Worker acknowledgments confirming JHA review';
COMMENT ON TABLE ppe_types IS 'Reference table of PPE types';
