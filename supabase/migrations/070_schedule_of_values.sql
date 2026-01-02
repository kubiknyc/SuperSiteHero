-- Migration: 070_schedule_of_values.sql
-- Description: Schedule of Values (SOV) and AIA billing forms for construction financial management
-- Date: 2025-01-02

-- =============================================
-- SCHEDULE OF VALUES (SOV) TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS schedule_of_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Contract Info
  original_contract_sum DECIMAL(15, 2) NOT NULL DEFAULT 0,
  change_orders_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_contract_sum DECIMAL(15, 2) GENERATED ALWAYS AS (original_contract_sum + change_orders_total) STORED,

  -- Retainage
  retainage_percent DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  total_retainage_held DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_retainage_released DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'locked', 'archived')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sov_project_id ON schedule_of_values(project_id);
CREATE INDEX IF NOT EXISTS idx_sov_company_id ON schedule_of_values(company_id);
CREATE INDEX IF NOT EXISTS idx_sov_status ON schedule_of_values(status);

-- Enable RLS
ALTER TABLE schedule_of_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view SOV in their company" ON schedule_of_values;
CREATE POLICY "Users can view SOV in their company" ON schedule_of_values
  FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert SOV in their company" ON schedule_of_values;
CREATE POLICY "Users can insert SOV in their company" ON schedule_of_values
  FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update SOV in their company" ON schedule_of_values;
CREATE POLICY "Users can update SOV in their company" ON schedule_of_values
  FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- SOV LINE ITEMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS sov_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sov_id UUID NOT NULL REFERENCES schedule_of_values(id) ON DELETE CASCADE,

  -- Item Info
  item_number VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  scheduled_value DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Work Completed (accumulated)
  work_completed_previous DECIMAL(15, 2) NOT NULL DEFAULT 0,
  work_completed_this_period DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Materials Stored (accumulated)
  materials_stored_previous DECIMAL(15, 2) NOT NULL DEFAULT 0,
  materials_stored_this_period DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Retainage
  retainage_percent DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  retainage_released DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Cost Code Assignment
  cost_code_id UUID,
  cost_code VARCHAR(50),

  -- Spec Section
  spec_section VARCHAR(20),

  -- Subcontractor
  subcontractor_id UUID REFERENCES subcontractors(id),

  -- Display order
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sov_line_items_sov_id ON sov_line_items(sov_id);
CREATE INDEX IF NOT EXISTS idx_sov_line_items_cost_code ON sov_line_items(cost_code);
CREATE INDEX IF NOT EXISTS idx_sov_line_items_subcontractor ON sov_line_items(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_sov_line_items_sort ON sov_line_items(sov_id, sort_order);

-- Enable RLS
ALTER TABLE sov_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view SOV line items in their company" ON sov_line_items;
CREATE POLICY "Users can view SOV line items in their company" ON sov_line_items
  FOR SELECT
  USING (
    sov_id IN (
      SELECT id FROM schedule_of_values WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage SOV line items in their company" ON sov_line_items;
CREATE POLICY "Users can manage SOV line items in their company" ON sov_line_items
  FOR ALL
  USING (
    sov_id IN (
      SELECT id FROM schedule_of_values WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- AIA G702 - APPLICATION FOR PAYMENT TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS aia_g702_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sov_id UUID NOT NULL REFERENCES schedule_of_values(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Application Info
  application_number INTEGER NOT NULL,
  period_to DATE NOT NULL,

  -- Contract Data (snapshot at time of application)
  original_contract_sum DECIMAL(15, 2) NOT NULL,
  net_change_by_change_orders DECIMAL(15, 2) NOT NULL DEFAULT 0,
  contract_sum_to_date DECIMAL(15, 2) GENERATED ALWAYS AS (original_contract_sum + net_change_by_change_orders) STORED,

  -- Completed and Stored
  total_completed_and_stored_to_date DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Retainage (Line 5)
  retainage_from_work_completed DECIMAL(15, 2) NOT NULL DEFAULT 0,
  retainage_from_stored_materials DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_retainage DECIMAL(15, 2) GENERATED ALWAYS AS (retainage_from_work_completed + retainage_from_stored_materials) STORED,

  -- Current Payment Due
  total_earned_less_retainage DECIMAL(15, 2) NOT NULL DEFAULT 0,
  less_previous_certificates DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_payment_due DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Balance to Finish
  balance_to_finish_including_retainage DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Contractor Signature
  contractor_signature_url TEXT,
  contractor_signature_date DATE,
  contractor_name VARCHAR(255),

  -- Architect Certification (AIA G702 specific)
  architect_signature_url TEXT,
  architect_signature_date DATE,
  architect_name VARCHAR(255),
  architect_certification_amount DECIMAL(15, 2),

  -- Owner Signature
  owner_signature_url TEXT,
  owner_signature_date DATE,
  owner_name VARCHAR(255),

  -- Notarization
  notarized BOOLEAN DEFAULT false,
  notary_signature_url TEXT,
  notary_date DATE,
  notary_county VARCHAR(100),
  notary_state VARCHAR(50),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid', 'rejected')),
  rejection_reason TEXT,

  -- Payment Info
  date_submitted TIMESTAMPTZ,
  date_approved TIMESTAMPTZ,
  date_paid TIMESTAMPTZ,
  check_number VARCHAR(50),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Unique constraint per project
  UNIQUE(project_id, application_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_g702_project_id ON aia_g702_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_g702_sov_id ON aia_g702_applications(sov_id);
CREATE INDEX IF NOT EXISTS idx_g702_status ON aia_g702_applications(status);
CREATE INDEX IF NOT EXISTS idx_g702_period ON aia_g702_applications(period_to);

-- Enable RLS
ALTER TABLE aia_g702_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view G702 in their company" ON aia_g702_applications;
CREATE POLICY "Users can view G702 in their company" ON aia_g702_applications
  FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage G702 in their company" ON aia_g702_applications;
CREATE POLICY "Users can manage G702 in their company" ON aia_g702_applications
  FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- AIA G703 - CONTINUATION SHEET LINE ITEMS
-- =============================================

CREATE TABLE IF NOT EXISTS aia_g703_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  g702_id UUID NOT NULL REFERENCES aia_g702_applications(id) ON DELETE CASCADE,
  sov_line_item_id UUID NOT NULL REFERENCES sov_line_items(id),

  -- Item Info (snapshot at time of billing)
  item_number VARCHAR(20) NOT NULL,
  description_of_work TEXT NOT NULL,
  scheduled_value DECIMAL(15, 2) NOT NULL,

  -- Column C: Work completed from previous applications
  from_previous_application DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Column D: Work completed this period
  this_period DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Column E: Materials presently stored
  materials_presently_stored DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Column F: Total Completed and Stored (C + D + E)
  total_completed_and_stored DECIMAL(15, 2) GENERATED ALWAYS AS (from_previous_application + this_period + materials_presently_stored) STORED,

  -- Column G: % Complete (F / B * 100)
  -- Stored for accuracy since generated columns can't reference other tables
  percent_complete DECIMAL(5, 2) NOT NULL DEFAULT 0,

  -- Column H: Balance to Finish (B - F)
  balance_to_finish DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Column I: Retainage
  retainage DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Cost Code (for reference)
  cost_code VARCHAR(50),

  -- Sort order
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_g703_g702_id ON aia_g703_line_items(g702_id);
CREATE INDEX IF NOT EXISTS idx_g703_sov_line_item ON aia_g703_line_items(sov_line_item_id);

-- Enable RLS
ALTER TABLE aia_g703_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view G703 line items in their company" ON aia_g703_line_items;
CREATE POLICY "Users can view G703 line items in their company" ON aia_g703_line_items
  FOR SELECT
  USING (
    g702_id IN (
      SELECT id FROM aia_g702_applications WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage G703 line items in their company" ON aia_g703_line_items;
CREATE POLICY "Users can manage G703 line items in their company" ON aia_g703_line_items
  FOR ALL
  USING (
    g702_id IN (
      SELECT id FROM aia_g702_applications WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- COST CODES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Code Structure
  code VARCHAR(50) NOT NULL,
  parent_id UUID REFERENCES cost_codes(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Budget
  original_budget DECIMAL(15, 2) NOT NULL DEFAULT 0,
  revised_budget DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Cost Type
  cost_type VARCHAR(20) NOT NULL DEFAULT 'other' CHECK (cost_type IN ('labor', 'material', 'equipment', 'subcontract', 'other')),

  -- SOV Link
  sov_line_item_id UUID REFERENCES sov_line_items(id),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Unique code per project
  UNIQUE(project_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cost_codes_project_id ON cost_codes(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_codes_parent ON cost_codes(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_codes_type ON cost_codes(cost_type);
CREATE INDEX IF NOT EXISTS idx_cost_codes_code ON cost_codes(code);

-- Enable RLS
ALTER TABLE cost_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view cost codes in their company" ON cost_codes;
CREATE POLICY "Users can view cost codes in their company" ON cost_codes
  FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage cost codes in their company" ON cost_codes;
CREATE POLICY "Users can manage cost codes in their company" ON cost_codes
  FOR ALL
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- COST TRANSACTIONS TABLE
-- (For tracking actual costs against cost codes)
-- =============================================

-- Check if table exists before creating
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_transactions') THEN
    CREATE TABLE cost_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      cost_code_id UUID REFERENCES cost_codes(id),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

      -- Transaction Info
      transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('budget', 'committed', 'actual', 'forecast')),
      amount DECIMAL(15, 2) NOT NULL,
      description TEXT,

      -- Reference
      reference_type VARCHAR(50), -- 'purchase_order', 'subcontract', 'invoice', 'journal_entry'
      reference_id UUID,
      reference_number VARCHAR(100),

      -- Dates
      transaction_date DATE NOT NULL,
      posting_date TIMESTAMPTZ DEFAULT NOW(),

      -- Vendor/Subcontractor
      vendor_id UUID,
      vendor_name VARCHAR(255),

      -- Metadata
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES users(id),
      deleted_at TIMESTAMPTZ
    );

    CREATE INDEX idx_cost_trans_project ON cost_transactions(project_id);
    CREATE INDEX idx_cost_trans_cost_code ON cost_transactions(cost_code_id);
    CREATE INDEX idx_cost_trans_type ON cost_transactions(transaction_type);
    CREATE INDEX idx_cost_trans_date ON cost_transactions(transaction_date);
    CREATE INDEX idx_cost_trans_reference ON cost_transactions(reference_type, reference_id);

    ALTER TABLE cost_transactions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view cost transactions in their company" ON cost_transactions
      FOR SELECT
      USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

    CREATE POLICY "Users can manage cost transactions in their company" ON cost_transactions
      FOR ALL
      USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- =============================================
-- BILLING HISTORY TABLE
-- (Track changes to SOV line items for audit)
-- =============================================

CREATE TABLE IF NOT EXISTS sov_billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sov_id UUID NOT NULL REFERENCES schedule_of_values(id) ON DELETE CASCADE,
  sov_line_item_id UUID NOT NULL REFERENCES sov_line_items(id) ON DELETE CASCADE,
  g702_id UUID REFERENCES aia_g702_applications(id),

  -- Billing Period
  billing_period DATE NOT NULL,
  application_number INTEGER NOT NULL,

  -- Amounts for this period
  work_completed_this_period DECIMAL(15, 2) NOT NULL DEFAULT 0,
  materials_stored_this_period DECIMAL(15, 2) NOT NULL DEFAULT 0,
  retainage_released_this_period DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Cumulative at end of period
  work_completed_cumulative DECIMAL(15, 2) NOT NULL DEFAULT 0,
  materials_stored_cumulative DECIMAL(15, 2) NOT NULL DEFAULT 0,
  retainage_held_cumulative DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_history_sov ON sov_billing_history(sov_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_line_item ON sov_billing_history(sov_line_item_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_period ON sov_billing_history(billing_period);
CREATE INDEX IF NOT EXISTS idx_billing_history_g702 ON sov_billing_history(g702_id);

-- Enable RLS
ALTER TABLE sov_billing_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view billing history in their company" ON sov_billing_history;
CREATE POLICY "Users can view billing history in their company" ON sov_billing_history
  FOR SELECT
  USING (
    sov_id IN (
      SELECT id FROM schedule_of_values WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- VIEW: SOV Line Item Calculated Fields
-- =============================================

CREATE OR REPLACE VIEW sov_line_items_calculated AS
SELECT
  li.*,
  -- Work Completed Total
  (li.work_completed_previous + li.work_completed_this_period) AS work_completed_total,
  -- Materials Stored Total
  (li.materials_stored_previous + li.materials_stored_this_period) AS materials_stored_total,
  -- Total Completed and Stored
  (li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period) AS total_completed_and_stored,
  -- Percent Complete
  CASE
    WHEN li.scheduled_value > 0 THEN
      ROUND(((li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period) / li.scheduled_value) * 100, 2)
    ELSE 0
  END AS percent_complete,
  -- Balance to Finish
  li.scheduled_value - (li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period) AS balance_to_finish,
  -- Retainage Amount (held)
  ROUND((li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period) * (li.retainage_percent / 100), 2) AS retainage_amount,
  -- Net Retainage (held - released)
  ROUND((li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period) * (li.retainage_percent / 100), 2) - li.retainage_released AS net_retainage
FROM sov_line_items li;

-- =============================================
-- VIEW: SOV Summary
-- =============================================

CREATE OR REPLACE VIEW sov_summary AS
SELECT
  s.id,
  s.project_id,
  s.company_id,
  s.original_contract_sum,
  s.change_orders_total,
  s.current_contract_sum,
  s.retainage_percent,
  s.status,
  -- Aggregated from line items
  COALESCE(SUM(li.scheduled_value), 0) AS total_scheduled_value,
  COALESCE(SUM(li.work_completed_previous + li.work_completed_this_period), 0) AS total_work_completed,
  COALESCE(SUM(li.materials_stored_previous + li.materials_stored_this_period), 0) AS total_materials_stored,
  COALESCE(SUM(li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period), 0) AS total_completed_and_stored,
  CASE
    WHEN COALESCE(SUM(li.scheduled_value), 0) > 0 THEN
      ROUND((COALESCE(SUM(li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period), 0) / SUM(li.scheduled_value)) * 100, 2)
    ELSE 0
  END AS overall_percent_complete,
  COALESCE(SUM(li.scheduled_value), 0) - COALESCE(SUM(li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period), 0) AS total_balance_to_finish,
  -- Retainage
  COALESCE(SUM(ROUND((li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period) * (li.retainage_percent / 100), 2)), 0) AS total_retainage_calculated,
  COALESCE(SUM(li.retainage_released), 0) AS total_retainage_released,
  -- Line item count
  COUNT(li.id) AS line_item_count,
  -- Project info
  p.name AS project_name,
  p.project_number
FROM schedule_of_values s
LEFT JOIN sov_line_items li ON li.sov_id = s.id
LEFT JOIN projects p ON p.id = s.project_id
WHERE s.deleted_at IS NULL
GROUP BY s.id, p.name, p.project_number;

-- =============================================
-- FUNCTION: Generate next application number
-- =============================================

CREATE OR REPLACE FUNCTION get_next_application_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(application_number), 0) + 1
  INTO v_next_number
  FROM aia_g702_applications
  WHERE project_id = p_project_id
    AND deleted_at IS NULL;

  RETURN v_next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Create G702 Application with G703 line items
-- =============================================

CREATE OR REPLACE FUNCTION create_g702_application(
  p_project_id UUID,
  p_sov_id UUID,
  p_period_to DATE,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_g702_id UUID;
  v_application_number INTEGER;
  v_company_id UUID;
  v_sov_record RECORD;
  v_previous_total DECIMAL(15, 2);
BEGIN
  -- Get company_id
  SELECT company_id INTO v_company_id FROM schedule_of_values WHERE id = p_sov_id;

  -- Get next application number
  v_application_number := get_next_application_number(p_project_id);

  -- Get SOV totals
  SELECT
    original_contract_sum,
    change_orders_total,
    current_contract_sum
  INTO v_sov_record
  FROM schedule_of_values
  WHERE id = p_sov_id;

  -- Get previous certificates total
  SELECT COALESCE(SUM(current_payment_due), 0)
  INTO v_previous_total
  FROM aia_g702_applications
  WHERE project_id = p_project_id
    AND sov_id = p_sov_id
    AND status = 'paid'
    AND deleted_at IS NULL;

  -- Create G702
  INSERT INTO aia_g702_applications (
    project_id,
    sov_id,
    company_id,
    application_number,
    period_to,
    original_contract_sum,
    net_change_by_change_orders,
    less_previous_certificates,
    created_by
  )
  VALUES (
    p_project_id,
    p_sov_id,
    v_company_id,
    v_application_number,
    p_period_to,
    v_sov_record.original_contract_sum,
    v_sov_record.change_orders_total,
    v_previous_total,
    p_created_by
  )
  RETURNING id INTO v_g702_id;

  -- Create G703 line items from SOV
  INSERT INTO aia_g703_line_items (
    g702_id,
    sov_line_item_id,
    item_number,
    description_of_work,
    scheduled_value,
    from_previous_application,
    this_period,
    materials_presently_stored,
    percent_complete,
    balance_to_finish,
    retainage,
    cost_code,
    sort_order
  )
  SELECT
    v_g702_id,
    li.id,
    li.item_number,
    li.description,
    li.scheduled_value,
    li.work_completed_previous,
    li.work_completed_this_period,
    li.materials_stored_previous + li.materials_stored_this_period,
    CASE
      WHEN li.scheduled_value > 0 THEN
        ROUND(((li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period) / li.scheduled_value) * 100, 2)
      ELSE 0
    END,
    li.scheduled_value - (li.work_completed_previous + li.work_completed_this_period + li.materials_stored_previous + li.materials_stored_this_period),
    ROUND((li.work_completed_previous + li.work_completed_this_period) * (li.retainage_percent / 100), 2),
    li.cost_code,
    li.sort_order
  FROM sov_line_items li
  WHERE li.sov_id = p_sov_id
  ORDER BY li.sort_order;

  -- Update G702 totals
  UPDATE aia_g702_applications
  SET
    total_completed_and_stored_to_date = (
      SELECT COALESCE(SUM(total_completed_and_stored), 0)
      FROM aia_g703_line_items
      WHERE g702_id = v_g702_id
    ),
    retainage_from_work_completed = (
      SELECT COALESCE(SUM(retainage), 0)
      FROM aia_g703_line_items
      WHERE g702_id = v_g702_id
    ),
    balance_to_finish_including_retainage = (
      SELECT COALESCE(SUM(balance_to_finish), 0) + COALESCE(SUM(retainage), 0)
      FROM aia_g703_line_items
      WHERE g702_id = v_g702_id
    )
  WHERE id = v_g702_id;

  -- Calculate current payment due
  UPDATE aia_g702_applications
  SET
    total_earned_less_retainage = total_completed_and_stored_to_date - retainage_from_work_completed - retainage_from_stored_materials,
    current_payment_due = (total_completed_and_stored_to_date - retainage_from_work_completed - retainage_from_stored_materials) - less_previous_certificates
  WHERE id = v_g702_id;

  RETURN v_g702_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGER: Update SOV when CO is approved
-- =============================================

CREATE OR REPLACE FUNCTION trigger_update_sov_on_co_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When a change order is approved, update the SOV change_orders_total
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE schedule_of_values
    SET
      change_orders_total = (
        SELECT COALESCE(SUM(approved_amount), 0)
        FROM change_orders
        WHERE project_id = NEW.project_id
          AND status = 'approved'
          AND deleted_at IS NULL
      ),
      updated_at = NOW()
    WHERE project_id = NEW.project_id
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if change_orders table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'change_orders') THEN
    DROP TRIGGER IF EXISTS trigger_sov_co_approval ON change_orders;
    CREATE TRIGGER trigger_sov_co_approval
      AFTER UPDATE OF status ON change_orders
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_sov_on_co_approval();
  END IF;
END $$;

-- =============================================
-- TRIGGER: Update timestamp on modifications
-- =============================================

CREATE OR REPLACE FUNCTION trigger_update_sov_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sov_updated ON schedule_of_values;
CREATE TRIGGER trigger_sov_updated
  BEFORE UPDATE ON schedule_of_values
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sov_timestamp();

DROP TRIGGER IF EXISTS trigger_sov_line_items_updated ON sov_line_items;
CREATE TRIGGER trigger_sov_line_items_updated
  BEFORE UPDATE ON sov_line_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sov_timestamp();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 070_schedule_of_values completed successfully';
END $$;
