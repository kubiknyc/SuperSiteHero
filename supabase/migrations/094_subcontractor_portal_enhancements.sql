-- Migration: 094_subcontractor_portal_enhancements.sql
-- Description: Enhanced subcontractor portal with contract management, lien waivers
-- Date: 2025-01-02

-- =============================================
-- TABLE: subcontracts
-- Core subcontract agreement tracking
-- =============================================

CREATE TABLE IF NOT EXISTS subcontracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,

  -- Contract identification
  contract_number VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  scope_of_work TEXT,

  -- Contract values
  original_contract_value DECIMAL(15, 2) NOT NULL,
  current_contract_value DECIMAL(15, 2) NOT NULL,
  billed_to_date DECIMAL(15, 2) DEFAULT 0,
  paid_to_date DECIMAL(15, 2) DEFAULT 0,

  -- Retention
  retention_percent DECIMAL(5, 2) DEFAULT 10.00,
  retention_held DECIMAL(15, 2) DEFAULT 0,
  retention_released DECIMAL(15, 2) DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  -- draft, pending_signature, executed, in_progress, complete, closed, terminated, suspended

  -- Dates
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_completion_date DATE,

  -- Terms
  payment_terms VARCHAR(100),
  special_conditions TEXT,

  -- Documents
  contract_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Bid reference
  bid_submission_id UUID REFERENCES bid_submissions(id) ON DELETE SET NULL,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (company_id, contract_number)
);

-- Indexes
CREATE INDEX idx_subcontracts_company ON subcontracts(company_id);
CREATE INDEX idx_subcontracts_project ON subcontracts(project_id);
CREATE INDEX idx_subcontracts_subcontractor ON subcontracts(subcontractor_id);
CREATE INDEX idx_subcontracts_status ON subcontracts(status);
CREATE INDEX idx_subcontracts_dates ON subcontracts(start_date, end_date);

-- Trigger
CREATE TRIGGER update_subcontracts_updated_at
  BEFORE UPDATE ON subcontracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE subcontracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subcontracts from their company"
  ON subcontracts FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create subcontracts for their company"
  ON subcontracts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update subcontracts from their company"
  ON subcontracts FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete subcontracts from their company"
  ON subcontracts FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- TABLE: subcontract_amendments
-- Contract amendments/change orders
-- =============================================

CREATE TABLE IF NOT EXISTS subcontract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontract_id UUID NOT NULL REFERENCES subcontracts(id) ON DELETE CASCADE,

  -- Amendment details
  amendment_number VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  reason TEXT,

  -- Financial impact
  change_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  previous_contract_value DECIMAL(15, 2) NOT NULL,
  new_contract_value DECIMAL(15, 2) NOT NULL,

  -- Type
  change_type VARCHAR(50) DEFAULT 'addition',
  -- addition, deduction, time_extension, scope_change, unit_price_adjustment

  -- Schedule impact
  days_added INTEGER DEFAULT 0,
  new_completion_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  -- pending, approved, executed, rejected, void

  -- Approvals
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ,

  -- Reference
  change_order_id UUID REFERENCES change_orders(id) ON DELETE SET NULL,

  -- Documents
  amendment_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Metadata
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subcontract_amendments_subcontract ON subcontract_amendments(subcontract_id);
CREATE INDEX idx_subcontract_amendments_status ON subcontract_amendments(status);
CREATE INDEX idx_subcontract_amendments_change_order ON subcontract_amendments(change_order_id);

-- Trigger
CREATE TRIGGER update_subcontract_amendments_updated_at
  BEFORE UPDATE ON subcontract_amendments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE subcontract_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage amendments for their subcontracts"
  ON subcontract_amendments FOR ALL
  USING (
    subcontract_id IN (
      SELECT id FROM subcontracts
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- TABLE: subcontract_payments
-- Payment applications and tracking
-- =============================================

CREATE TABLE IF NOT EXISTS subcontract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontract_id UUID NOT NULL REFERENCES subcontracts(id) ON DELETE CASCADE,

  -- Payment application details
  pay_app_number INTEGER NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,

  -- Amounts
  scheduled_value DECIMAL(15, 2) NOT NULL,
  work_completed_previous DECIMAL(15, 2) DEFAULT 0,
  work_completed_current DECIMAL(15, 2) DEFAULT 0,
  work_completed_total DECIMAL(15, 2) GENERATED ALWAYS AS (work_completed_previous + work_completed_current) STORED,
  percent_complete DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN scheduled_value > 0
    THEN ROUND(((work_completed_previous + work_completed_current) / scheduled_value * 100)::numeric, 2)
    ELSE 0 END
  ) STORED,

  -- Retention
  retention_this_period DECIMAL(15, 2) DEFAULT 0,
  retention_total DECIMAL(15, 2) DEFAULT 0,

  -- Net amounts
  amount_requested DECIMAL(15, 2) NOT NULL,
  amount_approved DECIMAL(15, 2),
  amount_paid DECIMAL(15, 2),

  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  -- draft, submitted, under_review, approved, partial_payment, paid, rejected

  -- Dates
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Approvals
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (subcontract_id, pay_app_number)
);

-- Indexes
CREATE INDEX idx_subcontract_payments_subcontract ON subcontract_payments(subcontract_id);
CREATE INDEX idx_subcontract_payments_status ON subcontract_payments(status);
CREATE INDEX idx_subcontract_payments_period ON subcontract_payments(period_end_date);

-- Trigger
CREATE TRIGGER update_subcontract_payments_updated_at
  BEFORE UPDATE ON subcontract_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE subcontract_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage payments for their subcontracts"
  ON subcontract_payments FOR ALL
  USING (
    subcontract_id IN (
      SELECT id FROM subcontracts
      WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- =============================================
-- TABLE: lien_waivers
-- Lien waiver tracking
-- =============================================

CREATE TABLE IF NOT EXISTS lien_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subcontract_id UUID NOT NULL REFERENCES subcontracts(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES subcontract_payments(id) ON DELETE SET NULL,

  -- Waiver type
  waiver_type VARCHAR(50) NOT NULL,
  -- conditional_partial, unconditional_partial, conditional_final, unconditional_final

  -- Coverage
  through_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  -- pending, received, verified, rejected

  -- Flags
  is_conditional BOOLEAN DEFAULT true,
  is_final BOOLEAN DEFAULT false,

  -- Tracking
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Document
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_lien_waivers_company ON lien_waivers(company_id);
CREATE INDEX idx_lien_waivers_subcontract ON lien_waivers(subcontract_id);
CREATE INDEX idx_lien_waivers_payment ON lien_waivers(payment_id);
CREATE INDEX idx_lien_waivers_status ON lien_waivers(status);

-- Trigger
CREATE TRIGGER update_lien_waivers_updated_at
  BEFORE UPDATE ON lien_waivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE lien_waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage lien waivers for their company"
  ON lien_waivers FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- TABLE: insurance_reminder_settings
-- Company-wide insurance reminder configuration
-- =============================================

CREATE TABLE IF NOT EXISTS insurance_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,

  -- Enable/disable
  enabled BOOLEAN DEFAULT true,

  -- Reminder schedule (days before expiration)
  reminder_days INTEGER[] DEFAULT ARRAY[90, 60, 30, 14, 7],

  -- Email settings
  cc_emails TEXT[],

  -- Auto-hold
  auto_hold_on_expired BOOLEAN DEFAULT true,
  hold_after_days INTEGER DEFAULT 0, -- 0 = immediately on expiration

  -- Notification preferences
  notify_project_managers BOOLEAN DEFAULT true,
  notify_accounting BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger
CREATE TRIGGER update_insurance_reminder_settings_updated_at
  BEFORE UPDATE ON insurance_reminder_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE insurance_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage reminder settings for their company"
  ON insurance_reminder_settings FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- TABLE: insurance_reminder_log
-- Track sent reminders
-- =============================================

CREATE TABLE IF NOT EXISTS insurance_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  certificate_id UUID REFERENCES insurance_certificates(id) ON DELETE SET NULL,

  -- Reminder details
  reminder_type VARCHAR(50) NOT NULL, -- expiring, expired, missing
  days_until_expiry INTEGER,

  -- Sending
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to TEXT[] NOT NULL,
  cc_to TEXT[],

  -- Response tracking
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, opened, bounced

  -- Notes
  notes TEXT
);

-- Indexes
CREATE INDEX idx_insurance_reminder_log_company ON insurance_reminder_log(company_id);
CREATE INDEX idx_insurance_reminder_log_subcontractor ON insurance_reminder_log(subcontractor_id);
CREATE INDEX idx_insurance_reminder_log_sent ON insurance_reminder_log(sent_at);

-- Enable RLS
ALTER TABLE insurance_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reminder logs for their company"
  ON insurance_reminder_log FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create reminder logs for their company"
  ON insurance_reminder_log FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- FUNCTION: get_subcontract_summary
-- Get summary statistics for subcontracts
-- =============================================

CREATE OR REPLACE FUNCTION get_subcontract_summary(p_project_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM users WHERE id = auth.uid();

  RETURN (
    SELECT jsonb_build_object(
      'totalSubcontracts', COUNT(*),
      'originalContractValue', COALESCE(SUM(original_contract_value), 0),
      'currentContractValue', COALESCE(SUM(current_contract_value), 0),
      'billedToDate', COALESCE(SUM(billed_to_date), 0),
      'paidToDate', COALESCE(SUM(paid_to_date), 0),
      'retentionHeld', COALESCE(SUM(retention_held), 0),
      'remainingValue', COALESCE(SUM(current_contract_value - billed_to_date), 0),
      'byStatus', (
        SELECT jsonb_object_agg(status, cnt)
        FROM (
          SELECT status, COUNT(*) as cnt
          FROM subcontracts
          WHERE company_id = v_company_id
          AND (p_project_id IS NULL OR project_id = p_project_id)
          GROUP BY status
        ) s
      )
    )
    FROM subcontracts
    WHERE company_id = v_company_id
    AND (p_project_id IS NULL OR project_id = p_project_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_subcontract_summary(UUID) TO authenticated;

-- =============================================
-- FUNCTION: execute_subcontract_amendment
-- Execute an amendment and update contract value
-- =============================================

CREATE OR REPLACE FUNCTION execute_subcontract_amendment(p_amendment_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_amendment RECORD;
  v_subcontract RECORD;
BEGIN
  -- Get amendment
  SELECT * INTO v_amendment
  FROM subcontract_amendments
  WHERE id = p_amendment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amendment not found');
  END IF;

  IF v_amendment.status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amendment must be approved before execution');
  END IF;

  -- Get subcontract
  SELECT * INTO v_subcontract
  FROM subcontracts
  WHERE id = v_amendment.subcontract_id;

  -- Update subcontract
  UPDATE subcontracts
  SET
    current_contract_value = v_amendment.new_contract_value,
    end_date = COALESCE(v_amendment.new_completion_date, end_date),
    updated_at = NOW()
  WHERE id = v_amendment.subcontract_id;

  -- Update amendment status
  UPDATE subcontract_amendments
  SET
    status = 'executed',
    executed_by = auth.uid(),
    executed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_amendment_id;

  RETURN jsonb_build_object(
    'success', true,
    'previousValue', v_subcontract.current_contract_value,
    'newValue', v_amendment.new_contract_value,
    'changeAmount', v_amendment.change_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION execute_subcontract_amendment(UUID) TO authenticated;

-- =============================================
-- FUNCTION: get_insurance_compliance_dashboard
-- Get insurance compliance statistics
-- =============================================

CREATE OR REPLACE FUNCTION get_insurance_compliance_dashboard(p_project_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM users WHERE id = auth.uid();

  RETURN (
    SELECT jsonb_build_object(
      'totalSubcontractors', (
        SELECT COUNT(DISTINCT s.id)
        FROM subcontractors s
        WHERE s.company_id = v_company_id
        AND (p_project_id IS NULL OR EXISTS (
          SELECT 1 FROM subcontracts sc WHERE sc.subcontractor_id = s.id AND sc.project_id = p_project_id
        ))
      ),
      'totalCertificates', (
        SELECT COUNT(*)
        FROM insurance_certificates ic
        JOIN subcontractors s ON ic.subcontractor_id = s.id
        WHERE s.company_id = v_company_id
      ),
      'activeCertificates', (
        SELECT COUNT(*)
        FROM insurance_certificates ic
        JOIN subcontractors s ON ic.subcontractor_id = s.id
        WHERE s.company_id = v_company_id
        AND ic.status = 'active'
        AND ic.expiration_date > CURRENT_DATE
      ),
      'expiredCertificates', (
        SELECT COUNT(*)
        FROM insurance_certificates ic
        JOIN subcontractors s ON ic.subcontractor_id = s.id
        WHERE s.company_id = v_company_id
        AND (ic.status = 'expired' OR ic.expiration_date <= CURRENT_DATE)
      ),
      'expiringIn30Days', (
        SELECT COUNT(*)
        FROM insurance_certificates ic
        JOIN subcontractors s ON ic.subcontractor_id = s.id
        WHERE s.company_id = v_company_id
        AND ic.status = 'active'
        AND ic.expiration_date > CURRENT_DATE
        AND ic.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
      ),
      'compliantSubcontractors', (
        SELECT COUNT(DISTINCT s.id)
        FROM subcontractors s
        WHERE s.company_id = v_company_id
        AND s.insurance_status = 'compliant'
      ),
      'nonCompliantSubcontractors', (
        SELECT COUNT(DISTINCT s.id)
        FROM subcontractors s
        WHERE s.company_id = v_company_id
        AND s.insurance_status IN ('non_compliant', 'expired')
      ),
      'onPaymentHold', (
        SELECT COUNT(DISTINCT s.id)
        FROM subcontractors s
        WHERE s.company_id = v_company_id
        AND s.payment_hold = true
      ),
      'complianceRate', (
        SELECT COALESCE(
          ROUND(
            COUNT(*) FILTER (WHERE s.insurance_status = 'compliant')::DECIMAL /
            NULLIF(COUNT(*)::DECIMAL, 0) * 100,
            1
          ),
          0
        )
        FROM subcontractors s
        WHERE s.company_id = v_company_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_insurance_compliance_dashboard(UUID) TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE subcontracts IS 'Subcontract agreement tracking';
COMMENT ON TABLE subcontract_amendments IS 'Contract amendments and change orders';
COMMENT ON TABLE subcontract_payments IS 'Payment applications and billing';
COMMENT ON TABLE lien_waivers IS 'Lien waiver tracking and management';
COMMENT ON TABLE insurance_reminder_settings IS 'Company-wide insurance reminder configuration';
COMMENT ON TABLE insurance_reminder_log IS 'Log of sent insurance reminders';
COMMENT ON FUNCTION get_subcontract_summary IS 'Get summary statistics for subcontracts';
COMMENT ON FUNCTION execute_subcontract_amendment IS 'Execute an approved amendment';
COMMENT ON FUNCTION get_insurance_compliance_dashboard IS 'Get insurance compliance statistics';
