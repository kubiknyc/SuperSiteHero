-- Migration: 150_insurance_compliance_enhancement.sql
-- Description: Enhanced Insurance Compliance Portal with subcontractor compliance status and AI extraction
-- Date: 2025-12-26

-- =============================================
-- TABLE: subcontractor_compliance_status
-- Track real-time compliance status per subcontractor/project
-- =============================================
CREATE TABLE IF NOT EXISTS subcontractor_compliance_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Compliance Status
  is_compliant BOOLEAN DEFAULT false,
  compliance_score DECIMAL(5, 2) DEFAULT 0, -- 0-100 percentage

  -- Gap Analysis
  missing_insurance_types TEXT[],
  insufficient_coverage_types TEXT[],
  missing_endorsements TEXT[],
  expiring_soon_count INTEGER DEFAULT 0,
  expired_count INTEGER DEFAULT 0,

  -- Payment Integration
  payment_hold BOOLEAN DEFAULT false,
  hold_reason TEXT,
  hold_applied_at TIMESTAMPTZ,
  hold_applied_by UUID REFERENCES users(id),
  hold_override_by UUID REFERENCES users(id),
  hold_override_at TIMESTAMPTZ,
  hold_override_reason TEXT,

  -- Tracking
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  next_expiration_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per sub/project combination
  UNIQUE(subcontractor_id, project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_status_company ON subcontractor_compliance_status(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status_sub ON subcontractor_compliance_status(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status_project ON subcontractor_compliance_status(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status_compliant ON subcontractor_compliance_status(is_compliant);
CREATE INDEX IF NOT EXISTS idx_compliance_status_hold ON subcontractor_compliance_status(payment_hold);
CREATE INDEX IF NOT EXISTS idx_compliance_status_next_exp ON subcontractor_compliance_status(next_expiration_date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_compliance_status_updated_at ON subcontractor_compliance_status;
CREATE TRIGGER update_compliance_status_updated_at BEFORE UPDATE ON subcontractor_compliance_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE subcontractor_compliance_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view compliance status for their company" ON subcontractor_compliance_status;
CREATE POLICY "Users can view compliance status for their company" ON subcontractor_compliance_status
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage compliance status for their company" ON subcontractor_compliance_status;
CREATE POLICY "Users can manage compliance status for their company" ON subcontractor_compliance_status
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- TABLE: insurance_ai_extractions
-- Store AI/OCR extraction results from uploaded certificates
-- =============================================
CREATE TABLE IF NOT EXISTS insurance_ai_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES insurance_certificates(id) ON DELETE CASCADE,
  document_id UUID, -- Reference to uploaded document if stored separately
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Raw Extraction
  raw_text TEXT,
  extracted_data JSONB NOT NULL DEFAULT '{}',

  -- Parsed Fields
  parsed_carrier_name VARCHAR(255),
  parsed_policy_number VARCHAR(100),
  parsed_effective_date DATE,
  parsed_expiration_date DATE,
  parsed_insurance_type VARCHAR(50),

  -- Parsed Limits (all as numeric for comparison)
  parsed_each_occurrence DECIMAL(15, 2),
  parsed_general_aggregate DECIMAL(15, 2),
  parsed_products_completed_ops DECIMAL(15, 2),
  parsed_personal_adv_injury DECIMAL(15, 2),
  parsed_damage_to_rented DECIMAL(15, 2),
  parsed_medical_expense DECIMAL(15, 2),
  parsed_combined_single_limit DECIMAL(15, 2),
  parsed_umbrella_occurrence DECIMAL(15, 2),
  parsed_umbrella_aggregate DECIMAL(15, 2),

  -- Parsed Endorsements
  parsed_additional_insured BOOLEAN,
  parsed_waiver_subrogation BOOLEAN,
  parsed_primary_noncontrib BOOLEAN,

  -- Confidence & Review
  overall_confidence DECIMAL(5, 4) DEFAULT 0, -- 0.0000 to 1.0000
  field_confidences JSONB DEFAULT '{}', -- per-field confidence scores
  needs_review BOOLEAN DEFAULT true,
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,

  -- Processing Status
  processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Validation
  validation_errors JSONB DEFAULT '[]',
  is_valid BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_extractions_cert ON insurance_ai_extractions(certificate_id);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_company ON insurance_ai_extractions(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_status ON insurance_ai_extractions(processing_status);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_review ON insurance_ai_extractions(needs_review);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_created ON insurance_ai_extractions(created_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ai_extractions_updated_at ON insurance_ai_extractions;
CREATE TRIGGER update_ai_extractions_updated_at BEFORE UPDATE ON insurance_ai_extractions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE insurance_ai_extractions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view AI extractions for their company" ON insurance_ai_extractions;
CREATE POLICY "Users can view AI extractions for their company" ON insurance_ai_extractions
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage AI extractions for their company" ON insurance_ai_extractions;
CREATE POLICY "Users can manage AI extractions for their company" ON insurance_ai_extractions
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- TABLE: project_insurance_requirements
-- Quick reference for project-level insurance requirements
-- (Complements insurance_requirements table with simpler structure)
-- =============================================
CREATE TABLE IF NOT EXISTS project_insurance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Requirement
  insurance_type insurance_type NOT NULL,
  is_required BOOLEAN DEFAULT true,

  -- Minimum Coverage
  min_each_occurrence DECIMAL(15, 2),
  min_aggregate DECIMAL(15, 2),
  min_umbrella DECIMAL(15, 2),

  -- Endorsements
  additional_insured_required BOOLEAN DEFAULT true,
  waiver_of_subrogation_required BOOLEAN DEFAULT false,
  primary_noncontributory_required BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Unique constraint
  UNIQUE(project_id, insurance_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proj_ins_reqs_company ON project_insurance_requirements(company_id);
CREATE INDEX IF NOT EXISTS idx_proj_ins_reqs_project ON project_insurance_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_ins_reqs_type ON project_insurance_requirements(insurance_type);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_proj_ins_reqs_updated_at ON project_insurance_requirements;
CREATE TRIGGER update_proj_ins_reqs_updated_at BEFORE UPDATE ON project_insurance_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE project_insurance_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view project insurance requirements" ON project_insurance_requirements;
CREATE POLICY "Users can view project insurance requirements" ON project_insurance_requirements
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage project insurance requirements" ON project_insurance_requirements;
CREATE POLICY "Users can manage project insurance requirements" ON project_insurance_requirements
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- FUNCTION: recalculate_compliance_status
-- Recalculate compliance status for a subcontractor
-- =============================================
CREATE OR REPLACE FUNCTION recalculate_compliance_status(
  p_subcontractor_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_company_id UUID;
  v_is_compliant BOOLEAN := true;
  v_compliance_score DECIMAL(5, 2) := 100.0;
  v_missing_types TEXT[] := '{}';
  v_insufficient_types TEXT[] := '{}';
  v_missing_endorsements TEXT[] := '{}';
  v_expiring_soon INTEGER := 0;
  v_expired INTEGER := 0;
  v_next_expiration DATE;
  v_total_requirements INTEGER := 0;
  v_met_requirements INTEGER := 0;
  r RECORD;
BEGIN
  -- Get company_id
  v_company_id := p_company_id;
  IF v_company_id IS NULL AND p_project_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id FROM projects WHERE id = p_project_id;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Company ID is required';
  END IF;

  -- Check each requirement
  FOR r IN (
    SELECT * FROM check_insurance_compliance(p_subcontractor_id, p_project_id, v_company_id)
  ) LOOP
    v_total_requirements := v_total_requirements + 1;

    IF r.is_compliant THEN
      v_met_requirements := v_met_requirements + 1;
    ELSE
      v_is_compliant := false;

      IF r.gap_description LIKE 'No valid%' THEN
        v_missing_types := array_append(v_missing_types, r.insurance_type::TEXT);
      ELSIF r.gap_description LIKE '%insufficient%' THEN
        v_insufficient_types := array_append(v_insufficient_types, r.insurance_type::TEXT);
      ELSIF r.gap_description LIKE '%endorsement%' OR r.gap_description LIKE '%verified%' THEN
        v_missing_endorsements := array_append(v_missing_endorsements, r.gap_description);
      END IF;
    END IF;
  END LOOP;

  -- Calculate compliance score
  IF v_total_requirements > 0 THEN
    v_compliance_score := (v_met_requirements::DECIMAL / v_total_requirements::DECIMAL) * 100;
  END IF;

  -- Count expiring and expired certificates
  SELECT
    COUNT(*) FILTER (WHERE status = 'expiring_soon'),
    COUNT(*) FILTER (WHERE status = 'expired'),
    MIN(expiration_date) FILTER (WHERE status IN ('active', 'expiring_soon'))
  INTO v_expiring_soon, v_expired, v_next_expiration
  FROM insurance_certificates
  WHERE subcontractor_id = p_subcontractor_id
    AND (project_id IS NULL OR project_id = p_project_id)
    AND deleted_at IS NULL;

  -- Upsert compliance status
  INSERT INTO subcontractor_compliance_status (
    company_id, subcontractor_id, project_id,
    is_compliant, compliance_score,
    missing_insurance_types, insufficient_coverage_types, missing_endorsements,
    expiring_soon_count, expired_count, next_expiration_date,
    last_checked_at
  ) VALUES (
    v_company_id, p_subcontractor_id, p_project_id,
    v_is_compliant, v_compliance_score,
    v_missing_types, v_insufficient_types, v_missing_endorsements,
    v_expiring_soon, v_expired, v_next_expiration,
    NOW()
  )
  ON CONFLICT (subcontractor_id, project_id)
  DO UPDATE SET
    is_compliant = EXCLUDED.is_compliant,
    compliance_score = EXCLUDED.compliance_score,
    missing_insurance_types = EXCLUDED.missing_insurance_types,
    insufficient_coverage_types = EXCLUDED.insufficient_coverage_types,
    missing_endorsements = EXCLUDED.missing_endorsements,
    expiring_soon_count = EXCLUDED.expiring_soon_count,
    expired_count = EXCLUDED.expired_count,
    next_expiration_date = EXCLUDED.next_expiration_date,
    last_checked_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: apply_payment_hold
-- Apply payment hold for non-compliant subcontractor
-- =============================================
CREATE OR REPLACE FUNCTION apply_payment_hold(
  p_subcontractor_id UUID,
  p_project_id UUID,
  p_reason TEXT DEFAULT 'Insurance compliance violation'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  UPDATE subcontractor_compliance_status
  SET
    payment_hold = true,
    hold_reason = p_reason,
    hold_applied_at = NOW(),
    hold_applied_by = v_user_id,
    updated_at = NOW()
  WHERE subcontractor_id = p_subcontractor_id
    AND (project_id = p_project_id OR (project_id IS NULL AND p_project_id IS NULL));

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: release_payment_hold
-- Release payment hold (with optional override)
-- =============================================
CREATE OR REPLACE FUNCTION release_payment_hold(
  p_subcontractor_id UUID,
  p_project_id UUID,
  p_override_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  UPDATE subcontractor_compliance_status
  SET
    payment_hold = false,
    hold_override_by = CASE WHEN p_override_reason IS NOT NULL THEN v_user_id ELSE NULL END,
    hold_override_at = CASE WHEN p_override_reason IS NOT NULL THEN NOW() ELSE NULL END,
    hold_override_reason = p_override_reason,
    updated_at = NOW()
  WHERE subcontractor_id = p_subcontractor_id
    AND (project_id = p_project_id OR (project_id IS NULL AND p_project_id IS NULL));

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEW: insurance_compliance_dashboard
-- Dashboard view for insurance compliance overview
-- =============================================
CREATE OR REPLACE VIEW insurance_compliance_dashboard AS
SELECT
  scs.company_id,
  scs.project_id,
  p.name as project_name,
  COUNT(DISTINCT scs.subcontractor_id) as total_subcontractors,
  COUNT(DISTINCT scs.subcontractor_id) FILTER (WHERE scs.is_compliant) as compliant_count,
  COUNT(DISTINCT scs.subcontractor_id) FILTER (WHERE NOT scs.is_compliant) as non_compliant_count,
  COUNT(DISTINCT scs.subcontractor_id) FILTER (WHERE scs.payment_hold) as on_hold_count,
  AVG(scs.compliance_score) as avg_compliance_score,
  SUM(scs.expiring_soon_count) as total_expiring_soon,
  SUM(scs.expired_count) as total_expired,
  MIN(scs.next_expiration_date) as next_expiration
FROM subcontractor_compliance_status scs
LEFT JOIN projects p ON scs.project_id = p.id
GROUP BY scs.company_id, scs.project_id, p.name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 150_insurance_compliance_enhancement completed successfully';
END $$;
