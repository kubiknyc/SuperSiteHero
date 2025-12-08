-- Migration: 071_insurance_tracking.sql
-- Description: Insurance Certificate Tracking and Compliance
-- Date: 2025-12-07

-- =============================================
-- ENUM: insurance_type
-- Types of insurance coverage
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insurance_type') THEN
    CREATE TYPE insurance_type AS ENUM (
      'general_liability',
      'auto_liability',
      'workers_compensation',
      'umbrella',
      'professional_liability',
      'builders_risk',
      'pollution',
      'cyber',
      'other'
    );
  END IF;
END$$;

-- =============================================
-- ENUM: certificate_status
-- Status of insurance certificates
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_status') THEN
    CREATE TYPE certificate_status AS ENUM (
      'active',
      'expiring_soon',
      'expired',
      'pending_renewal',
      'void'
    );
  END IF;
END$$;

-- =============================================
-- TABLE: insurance_certificates
-- Main insurance certificate tracking table
-- =============================================
CREATE TABLE IF NOT EXISTS insurance_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  subcontractor_id UUID, -- FK to subcontractors when that table exists

  -- Certificate Identification
  certificate_number VARCHAR(100) NOT NULL,
  insurance_type insurance_type NOT NULL,

  -- Carrier Information
  carrier_name VARCHAR(255) NOT NULL,
  carrier_naic_number VARCHAR(20),  -- National Association of Insurance Commissioners number
  policy_number VARCHAR(100) NOT NULL,

  -- Coverage Limits
  each_occurrence_limit DECIMAL(15, 2),
  general_aggregate_limit DECIMAL(15, 2),
  products_completed_ops_limit DECIMAL(15, 2),
  personal_adv_injury_limit DECIMAL(15, 2),
  damage_to_rented_premises DECIMAL(15, 2),
  medical_expense_limit DECIMAL(15, 2),
  combined_single_limit DECIMAL(15, 2),  -- For auto liability
  bodily_injury_per_person DECIMAL(15, 2),
  bodily_injury_per_accident DECIMAL(15, 2),
  property_damage_limit DECIMAL(15, 2),
  umbrella_each_occurrence DECIMAL(15, 2),
  umbrella_aggregate DECIMAL(15, 2),
  workers_comp_el_each_accident DECIMAL(15, 2),  -- Employer's liability
  workers_comp_el_disease_policy DECIMAL(15, 2),
  workers_comp_el_disease_employee DECIMAL(15, 2),

  -- Dates
  effective_date DATE NOT NULL,
  expiration_date DATE NOT NULL,

  -- Status (computed but can be overridden)
  status certificate_status DEFAULT 'active',

  -- Additional Insured Requirements
  additional_insured_required BOOLEAN DEFAULT true,
  additional_insured_verified BOOLEAN DEFAULT false,
  additional_insured_name TEXT,

  -- Waiver of Subrogation
  waiver_of_subrogation_required BOOLEAN DEFAULT false,
  waiver_of_subrogation_verified BOOLEAN DEFAULT false,

  -- Primary/Non-contributory
  primary_noncontributory_required BOOLEAN DEFAULT false,
  primary_noncontributory_verified BOOLEAN DEFAULT false,

  -- Document Storage
  certificate_url VARCHAR(500),
  certificate_storage_path VARCHAR(500),

  -- Certificate Holder (who issued the cert)
  issued_by_name VARCHAR(255),
  issued_by_email VARCHAR(255),
  issued_by_phone VARCHAR(50),

  -- Notes
  notes TEXT,
  description_of_operations TEXT,  -- From Certificate Field 15

  -- Alert Settings
  alert_days_before_expiry INTEGER DEFAULT 30,
  suppress_alerts BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_certs_company_id ON insurance_certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_certs_project_id ON insurance_certificates(project_id);
CREATE INDEX IF NOT EXISTS idx_insurance_certs_subcontractor_id ON insurance_certificates(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_insurance_certs_status ON insurance_certificates(status);
CREATE INDEX IF NOT EXISTS idx_insurance_certs_expiration_date ON insurance_certificates(expiration_date);
CREATE INDEX IF NOT EXISTS idx_insurance_certs_type ON insurance_certificates(insurance_type);
CREATE INDEX IF NOT EXISTS idx_insurance_certs_deleted_at ON insurance_certificates(deleted_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_insurance_certificates_updated_at ON insurance_certificates;
CREATE TRIGGER update_insurance_certificates_updated_at BEFORE UPDATE ON insurance_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE insurance_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view insurance certificates for their company" ON insurance_certificates;
CREATE POLICY "Users can view insurance certificates for their company" ON insurance_certificates
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert insurance certificates for their company" ON insurance_certificates;
CREATE POLICY "Users can insert insurance certificates for their company" ON insurance_certificates
  FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update insurance certificates for their company" ON insurance_certificates;
CREATE POLICY "Users can update insurance certificates for their company" ON insurance_certificates
  FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete insurance certificates for their company" ON insurance_certificates;
CREATE POLICY "Users can delete insurance certificates for their company" ON insurance_certificates
  FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- TABLE: insurance_requirements
-- Define required insurance for projects/subcontractors
-- =============================================
CREATE TABLE IF NOT EXISTS insurance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Requirement Details
  name VARCHAR(255) NOT NULL,
  insurance_type insurance_type NOT NULL,
  description TEXT,

  -- Minimum Coverage Amounts
  min_each_occurrence DECIMAL(15, 2),
  min_general_aggregate DECIMAL(15, 2),
  min_products_completed_ops DECIMAL(15, 2),
  min_combined_single_limit DECIMAL(15, 2),
  min_umbrella_each_occurrence DECIMAL(15, 2),
  min_umbrella_aggregate DECIMAL(15, 2),
  min_workers_comp_el_each_accident DECIMAL(15, 2),

  -- Required Endorsements
  additional_insured_required BOOLEAN DEFAULT true,
  waiver_of_subrogation_required BOOLEAN DEFAULT false,
  primary_noncontributory_required BOOLEAN DEFAULT false,

  -- Applies To
  applies_to_all_subcontractors BOOLEAN DEFAULT true,
  specific_subcontractor_ids UUID[],  -- If not all, specific ones

  -- Active Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_reqs_company_id ON insurance_requirements(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_reqs_project_id ON insurance_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_insurance_reqs_type ON insurance_requirements(insurance_type);
CREATE INDEX IF NOT EXISTS idx_insurance_reqs_active ON insurance_requirements(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_insurance_requirements_updated_at ON insurance_requirements;
CREATE TRIGGER update_insurance_requirements_updated_at BEFORE UPDATE ON insurance_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE insurance_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view insurance requirements for their company" ON insurance_requirements;
CREATE POLICY "Users can view insurance requirements for their company" ON insurance_requirements
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert insurance requirements for their company" ON insurance_requirements;
CREATE POLICY "Users can insert insurance requirements for their company" ON insurance_requirements
  FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update insurance requirements for their company" ON insurance_requirements;
CREATE POLICY "Users can update insurance requirements for their company" ON insurance_requirements
  FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete insurance requirements for their company" ON insurance_requirements;
CREATE POLICY "Users can delete insurance requirements for their company" ON insurance_requirements
  FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- TABLE: insurance_certificate_history
-- Audit trail for certificate changes
-- =============================================
CREATE TABLE IF NOT EXISTS insurance_certificate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES insurance_certificates(id) ON DELETE CASCADE,

  -- Change Info
  action VARCHAR(50) NOT NULL,  -- created, updated, status_changed, renewed, voided
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  notes TEXT,

  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_history_cert_id ON insurance_certificate_history(certificate_id);
CREATE INDEX IF NOT EXISTS idx_insurance_history_changed_at ON insurance_certificate_history(changed_at);

-- Enable RLS
ALTER TABLE insurance_certificate_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view insurance history for their company" ON insurance_certificate_history;
CREATE POLICY "Users can view insurance history for their company" ON insurance_certificate_history
  FOR SELECT
  USING (
    certificate_id IN (
      SELECT id FROM insurance_certificates WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: insurance_expiration_alerts
-- Track expiration alerts sent
-- =============================================
CREATE TABLE IF NOT EXISTS insurance_expiration_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES insurance_certificates(id) ON DELETE CASCADE,

  -- Alert Info
  alert_type VARCHAR(50) NOT NULL,  -- 30_day, 14_day, 7_day, expired
  days_until_expiry INTEGER,

  -- Delivery
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to_emails TEXT[],
  sent_to_user_ids UUID[],

  -- Response
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  renewal_received BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_alerts_cert_id ON insurance_expiration_alerts(certificate_id);
CREATE INDEX IF NOT EXISTS idx_insurance_alerts_sent_at ON insurance_expiration_alerts(sent_at);
CREATE INDEX IF NOT EXISTS idx_insurance_alerts_type ON insurance_expiration_alerts(alert_type);

-- Enable RLS
ALTER TABLE insurance_expiration_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view insurance alerts for their company" ON insurance_expiration_alerts;
CREATE POLICY "Users can view insurance alerts for their company" ON insurance_expiration_alerts
  FOR SELECT
  USING (
    certificate_id IN (
      SELECT id FROM insurance_certificates WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage insurance alerts for their company" ON insurance_expiration_alerts;
CREATE POLICY "Users can manage insurance alerts for their company" ON insurance_expiration_alerts
  FOR ALL
  USING (
    certificate_id IN (
      SELECT id FROM insurance_certificates WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- FUNCTION: update_certificate_status
-- Automatically update certificate status based on dates
-- =============================================
CREATE OR REPLACE FUNCTION update_certificate_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't auto-update if status is 'void' or 'pending_renewal'
  IF NEW.status = 'void' OR NEW.status = 'pending_renewal' THEN
    RETURN NEW;
  END IF;

  -- Calculate days until expiration
  IF NEW.expiration_date < CURRENT_DATE THEN
    NEW.status := 'expired';
  ELSIF NEW.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN
    NEW.status := 'expiring_soon';
  ELSE
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cert_status ON insurance_certificates;
CREATE TRIGGER trigger_update_cert_status
  BEFORE INSERT OR UPDATE ON insurance_certificates
  FOR EACH ROW EXECUTE FUNCTION update_certificate_status();

-- =============================================
-- FUNCTION: track_certificate_changes
-- Automatically track changes to certificates
-- =============================================
CREATE OR REPLACE FUNCTION track_certificate_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO insurance_certificate_history (certificate_id, action, changed_by)
    VALUES (NEW.id, 'created', v_user_id);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO insurance_certificate_history (certificate_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'status_changed', 'status', OLD.status::text, NEW.status::text, v_user_id);
    END IF;

    -- Track expiration date changes
    IF OLD.expiration_date IS DISTINCT FROM NEW.expiration_date THEN
      INSERT INTO insurance_certificate_history (certificate_id, action, field_changed, old_value, new_value, changed_by, notes)
      VALUES (NEW.id, 'renewed', 'expiration_date', OLD.expiration_date::text, NEW.expiration_date::text, v_user_id, 'Certificate renewed');
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_track_cert_changes ON insurance_certificates;
CREATE TRIGGER trigger_track_cert_changes
  AFTER INSERT OR UPDATE ON insurance_certificates
  FOR EACH ROW EXECUTE FUNCTION track_certificate_changes();

-- =============================================
-- FUNCTION: get_expiring_certificates
-- Get certificates expiring within N days
-- =============================================
CREATE OR REPLACE FUNCTION get_expiring_certificates(
  p_company_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  certificate_id UUID,
  subcontractor_id UUID,
  insurance_type insurance_type,
  carrier_name VARCHAR(255),
  expiration_date DATE,
  days_until_expiry INTEGER,
  project_id UUID,
  project_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ic.id as certificate_id,
    ic.subcontractor_id,
    ic.insurance_type,
    ic.carrier_name,
    ic.expiration_date,
    (ic.expiration_date - CURRENT_DATE)::INTEGER as days_until_expiry,
    ic.project_id,
    p.name as project_name
  FROM insurance_certificates ic
  LEFT JOIN projects p ON ic.project_id = p.id
  WHERE ic.company_id = p_company_id
    AND ic.deleted_at IS NULL
    AND ic.status != 'void'
    AND ic.expiration_date <= CURRENT_DATE + (p_days || ' days')::INTERVAL
    AND NOT ic.suppress_alerts
  ORDER BY ic.expiration_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: check_compliance
-- Check if subcontractor meets insurance requirements
-- NOTE: Requires p_company_id parameter since subcontractors table may not have company_id
-- =============================================
CREATE OR REPLACE FUNCTION check_insurance_compliance(
  p_subcontractor_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
  requirement_id UUID,
  requirement_name VARCHAR(255),
  insurance_type insurance_type,
  is_compliant BOOLEAN,
  certificate_id UUID,
  gap_description TEXT
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Use provided company_id or try to get from project
  v_company_id := p_company_id;
  IF v_company_id IS NULL AND p_project_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id FROM projects WHERE id = p_project_id;
  END IF;

  RETURN QUERY
  WITH requirements AS (
    SELECT ir.*
    FROM insurance_requirements ir
    WHERE ir.company_id = v_company_id
      AND ir.is_active = true
      AND (ir.project_id IS NULL OR ir.project_id = p_project_id)
      AND (
        ir.applies_to_all_subcontractors = true
        OR p_subcontractor_id = ANY(ir.specific_subcontractor_ids)
      )
  ),
  certificates AS (
    SELECT ic.*
    FROM insurance_certificates ic
    WHERE ic.subcontractor_id = p_subcontractor_id
      AND ic.deleted_at IS NULL
      AND ic.status NOT IN ('expired', 'void')
      AND (ic.project_id IS NULL OR ic.project_id = p_project_id)
  )
  SELECT
    r.id as requirement_id,
    r.name as requirement_name,
    r.insurance_type,
    CASE
      WHEN c.id IS NOT NULL
        AND (r.min_each_occurrence IS NULL OR c.each_occurrence_limit >= r.min_each_occurrence)
        AND (r.min_general_aggregate IS NULL OR c.general_aggregate_limit >= r.min_general_aggregate)
        AND (NOT r.additional_insured_required OR c.additional_insured_verified)
        AND (NOT r.waiver_of_subrogation_required OR c.waiver_of_subrogation_verified)
        AND (NOT r.primary_noncontributory_required OR c.primary_noncontributory_verified)
      THEN true
      ELSE false
    END as is_compliant,
    c.id as certificate_id,
    CASE
      WHEN c.id IS NULL THEN 'No valid certificate on file'
      WHEN r.min_each_occurrence IS NOT NULL AND (c.each_occurrence_limit IS NULL OR c.each_occurrence_limit < r.min_each_occurrence)
        THEN 'Each occurrence limit insufficient (required: $' || r.min_each_occurrence || ')'
      WHEN r.min_general_aggregate IS NOT NULL AND (c.general_aggregate_limit IS NULL OR c.general_aggregate_limit < r.min_general_aggregate)
        THEN 'General aggregate limit insufficient (required: $' || r.min_general_aggregate || ')'
      WHEN r.additional_insured_required AND NOT COALESCE(c.additional_insured_verified, false)
        THEN 'Additional insured endorsement not verified'
      WHEN r.waiver_of_subrogation_required AND NOT COALESCE(c.waiver_of_subrogation_verified, false)
        THEN 'Waiver of subrogation not verified'
      WHEN r.primary_noncontributory_required AND NOT COALESCE(c.primary_noncontributory_verified, false)
        THEN 'Primary/non-contributory not verified'
      ELSE NULL
    END as gap_description
  FROM requirements r
  LEFT JOIN certificates c ON c.insurance_type = r.insurance_type
  ORDER BY r.insurance_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEW: insurance_compliance_summary
-- Summary view of insurance compliance by subcontractor
-- NOTE: Commented out until subcontractors table is available with required columns
-- =============================================
-- CREATE OR REPLACE VIEW insurance_compliance_summary AS
-- SELECT
--   s.id as subcontractor_id,
--   s.company_name as subcontractor_name,
--   s.company_id,
--   s.project_id,
--   p.name as project_name,
--   COUNT(DISTINCT ic.id) FILTER (WHERE ic.status = 'active') as active_certificates,
--   COUNT(DISTINCT ic.id) FILTER (WHERE ic.status = 'expiring_soon') as expiring_certificates,
--   COUNT(DISTINCT ic.id) FILTER (WHERE ic.status = 'expired') as expired_certificates,
--   MIN(ic.expiration_date) FILTER (WHERE ic.status IN ('active', 'expiring_soon')) as next_expiration,
--   BOOL_AND(COALESCE(ic.additional_insured_verified, false)) as all_additional_insured_verified
-- FROM subcontractors s
-- LEFT JOIN projects p ON s.project_id = p.id
-- LEFT JOIN insurance_certificates ic ON ic.subcontractor_id = s.id AND ic.deleted_at IS NULL
-- WHERE s.deleted_at IS NULL
-- GROUP BY s.id, s.company_name, s.company_id, s.project_id, p.name;

-- =============================================
-- VIEW: expiring_certificates_view
-- Certificates expiring in next 60 days
-- =============================================
CREATE OR REPLACE VIEW expiring_certificates_view AS
SELECT
  ic.*,
  (ic.expiration_date - CURRENT_DATE)::INTEGER as days_until_expiry,
  p.name as project_name,
  c.name as company_name
FROM insurance_certificates ic
LEFT JOIN projects p ON ic.project_id = p.id
LEFT JOIN companies c ON ic.company_id = c.id
WHERE ic.deleted_at IS NULL
  AND ic.status NOT IN ('void')
  AND ic.expiration_date <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY ic.expiration_date ASC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 071_insurance_tracking completed successfully';
END $$;
