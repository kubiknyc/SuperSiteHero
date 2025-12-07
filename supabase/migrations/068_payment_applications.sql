-- Migration: 068_payment_applications.sql
-- Description: Payment Applications (AIA G702/G703) with Schedule of Values
-- Date: 2025-12-07

-- =============================================
-- TABLE: payment_applications
-- AIA G702 - Application and Certificate for Payment
-- =============================================
CREATE TABLE IF NOT EXISTS payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Application Identification
  application_number INTEGER NOT NULL,
  period_to DATE NOT NULL,  -- Application period ending date

  -- Contract Information (G702 Header)
  original_contract_sum DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_change_orders DECIMAL(15, 2) NOT NULL DEFAULT 0,
  contract_sum_to_date DECIMAL(15, 2) GENERATED ALWAYS AS (original_contract_sum + net_change_orders) STORED,

  -- Work Completed (from SOV totals)
  total_completed_previous DECIMAL(15, 2) NOT NULL DEFAULT 0,  -- Work completed in previous periods
  total_completed_this_period DECIMAL(15, 2) NOT NULL DEFAULT 0,  -- Work completed this period
  total_materials_stored DECIMAL(15, 2) NOT NULL DEFAULT 0,  -- Materials presently stored
  total_completed_and_stored DECIMAL(15, 2) GENERATED ALWAYS AS (
    total_completed_previous + total_completed_this_period + total_materials_stored
  ) STORED,

  -- Retainage
  retainage_percent DECIMAL(5, 2) NOT NULL DEFAULT 10.00,  -- Default 10%
  retainage_from_completed DECIMAL(15, 2) NOT NULL DEFAULT 0,
  retainage_from_stored DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_retainage DECIMAL(15, 2) GENERATED ALWAYS AS (
    retainage_from_completed + retainage_from_stored
  ) STORED,

  -- Less Retainage Releases (if any)
  retainage_release DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Payment Calculation
  total_earned_less_retainage DECIMAL(15, 2) GENERATED ALWAYS AS (
    total_completed_previous + total_completed_this_period + total_materials_stored
    - retainage_from_completed - retainage_from_stored + retainage_release
  ) STORED,
  less_previous_certificates DECIMAL(15, 2) NOT NULL DEFAULT 0,  -- Previous payments received
  current_payment_due DECIMAL(15, 2) GENERATED ALWAYS AS (
    total_completed_previous + total_completed_this_period + total_materials_stored
    - retainage_from_completed - retainage_from_stored + retainage_release
    - less_previous_certificates
  ) STORED,

  -- Balance to Finish
  balance_to_finish DECIMAL(15, 2) GENERATED ALWAYS AS (
    original_contract_sum + net_change_orders
    - (total_completed_previous + total_completed_this_period + total_materials_stored)
  ) STORED,

  -- Percent Complete
  percent_complete DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN (original_contract_sum + net_change_orders) > 0
      THEN ROUND(((total_completed_previous + total_completed_this_period + total_materials_stored)
            / (original_contract_sum + net_change_orders)) * 100, 2)
      ELSE 0
    END
  ) STORED,

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  -- draft, submitted, under_review, approved, rejected, paid, void

  -- Submission/Approval Info
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  paid_at TIMESTAMPTZ,
  payment_received_amount DECIMAL(15, 2),
  payment_reference VARCHAR(100),  -- Check number, wire reference, etc.

  -- Signatures (for PDF generation)
  contractor_signature_url TEXT,
  contractor_signature_date DATE,
  architect_signature_url TEXT,
  architect_signature_date DATE,
  owner_signature_url TEXT,
  owner_signature_date DATE,

  -- Notes
  notes TEXT,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(project_id, application_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_applications_project_id ON payment_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_company_id ON payment_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_status ON payment_applications(status);
CREATE INDEX IF NOT EXISTS idx_payment_applications_period_to ON payment_applications(period_to);
CREATE INDEX IF NOT EXISTS idx_payment_applications_deleted_at ON payment_applications(deleted_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_payment_applications_updated_at ON payment_applications;
CREATE TRIGGER update_payment_applications_updated_at BEFORE UPDATE ON payment_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE payment_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view payment applications for their company" ON payment_applications;
CREATE POLICY "Users can view payment applications for their company" ON payment_applications
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert payment applications for their company" ON payment_applications;
CREATE POLICY "Users can insert payment applications for their company" ON payment_applications
  FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update payment applications for their company" ON payment_applications;
CREATE POLICY "Users can update payment applications for their company" ON payment_applications
  FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================
-- TABLE: schedule_of_values
-- AIA G703 - Continuation Sheet (Schedule of Values)
-- =============================================
CREATE TABLE IF NOT EXISTS schedule_of_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_application_id UUID NOT NULL REFERENCES payment_applications(id) ON DELETE CASCADE,

  -- Item Identification
  item_number VARCHAR(20) NOT NULL,  -- e.g., "1", "1.1", "A", "001"
  description TEXT NOT NULL,

  -- Cost Code Reference
  cost_code_id UUID REFERENCES cost_codes(id),
  cost_code VARCHAR(20),  -- e.g., "03 30 00"

  -- Scheduled Value (original contract amount for this line item)
  scheduled_value DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Change Order Adjustments (if any approved COs affect this line)
  change_order_adjustments DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Total Scheduled Value (scheduled + CO adjustments)
  total_scheduled_value DECIMAL(15, 2) GENERATED ALWAYS AS (
    scheduled_value + change_order_adjustments
  ) STORED,

  -- Work Completed - From Previous Applications
  work_completed_previous DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Work Completed - This Period
  work_completed_this_period DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Materials Presently Stored (not installed)
  materials_stored DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Total Completed and Stored to Date
  total_completed_stored DECIMAL(15, 2) GENERATED ALWAYS AS (
    work_completed_previous + work_completed_this_period + materials_stored
  ) STORED,

  -- Percent Complete (G/C ratio)
  percent_complete DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN (scheduled_value + change_order_adjustments) > 0
      THEN ROUND(((work_completed_previous + work_completed_this_period + materials_stored)
            / (scheduled_value + change_order_adjustments)) * 100, 2)
      ELSE 0
    END
  ) STORED,

  -- Balance to Finish (C - G)
  balance_to_finish DECIMAL(15, 2) GENERATED ALWAYS AS (
    (scheduled_value + change_order_adjustments)
    - (work_completed_previous + work_completed_this_period + materials_stored)
  ) STORED,

  -- Retainage (calculated per line if variable retainage)
  retainage_percent DECIMAL(5, 2),  -- NULL = use application default
  retainage_amount DECIMAL(15, 2),

  -- Sort Order
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sov_payment_application_id ON schedule_of_values(payment_application_id);
CREATE INDEX IF NOT EXISTS idx_sov_cost_code_id ON schedule_of_values(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_sov_sort_order ON schedule_of_values(sort_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_schedule_of_values_updated_at ON schedule_of_values;
CREATE TRIGGER update_schedule_of_values_updated_at BEFORE UPDATE ON schedule_of_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE schedule_of_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view SOV items" ON schedule_of_values;
CREATE POLICY "Users can view SOV items" ON schedule_of_values
  FOR SELECT
  USING (
    payment_application_id IN (
      SELECT id FROM payment_applications WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert SOV items" ON schedule_of_values;
CREATE POLICY "Users can insert SOV items" ON schedule_of_values
  FOR INSERT
  WITH CHECK (
    payment_application_id IN (
      SELECT id FROM payment_applications WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update SOV items" ON schedule_of_values;
CREATE POLICY "Users can update SOV items" ON schedule_of_values
  FOR UPDATE
  USING (
    payment_application_id IN (
      SELECT id FROM payment_applications WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete SOV items" ON schedule_of_values;
CREATE POLICY "Users can delete SOV items" ON schedule_of_values
  FOR DELETE
  USING (
    payment_application_id IN (
      SELECT id FROM payment_applications WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: payment_application_history
-- Track changes to payment applications
-- =============================================
CREATE TABLE IF NOT EXISTS payment_application_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_application_id UUID NOT NULL REFERENCES payment_applications(id) ON DELETE CASCADE,

  -- Change Info
  action VARCHAR(50) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  notes TEXT,

  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pa_history_payment_application_id ON payment_application_history(payment_application_id);
CREATE INDEX IF NOT EXISTS idx_pa_history_changed_at ON payment_application_history(changed_at);

-- Enable RLS
ALTER TABLE payment_application_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view payment application history" ON payment_application_history;
CREATE POLICY "Users can view payment application history" ON payment_application_history
  FOR SELECT
  USING (
    payment_application_id IN (
      SELECT id FROM payment_applications WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- FUNCTION: get_next_application_number
-- Get next payment application number for a project
-- =============================================
CREATE OR REPLACE FUNCTION get_next_application_number(p_project_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(application_number), 0) + 1
  FROM payment_applications
  WHERE project_id = p_project_id AND deleted_at IS NULL;
$$ LANGUAGE SQL;

-- =============================================
-- FUNCTION: recalculate_payment_application_totals
-- Recalculate payment application totals from SOV items
-- =============================================
CREATE OR REPLACE FUNCTION recalculate_payment_application_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_app_id UUID;
  v_totals RECORD;
BEGIN
  -- Get the payment application ID
  v_app_id := COALESCE(NEW.payment_application_id, OLD.payment_application_id);

  -- Calculate totals from SOV items
  SELECT
    COALESCE(SUM(work_completed_previous), 0) as prev,
    COALESCE(SUM(work_completed_this_period), 0) as current,
    COALESCE(SUM(materials_stored), 0) as stored
  INTO v_totals
  FROM schedule_of_values
  WHERE payment_application_id = v_app_id;

  -- Update payment application
  UPDATE payment_applications
  SET
    total_completed_previous = v_totals.prev,
    total_completed_this_period = v_totals.current,
    total_materials_stored = v_totals.stored,
    -- Recalculate retainage
    retainage_from_completed = ROUND((v_totals.prev + v_totals.current) * (retainage_percent / 100), 2),
    retainage_from_stored = ROUND(v_totals.stored * (retainage_percent / 100), 2)
  WHERE id = v_app_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_recalculate_pa_totals ON schedule_of_values;
CREATE TRIGGER trigger_recalculate_pa_totals
  AFTER INSERT OR UPDATE OR DELETE ON schedule_of_values
  FOR EACH ROW EXECUTE FUNCTION recalculate_payment_application_totals();

-- =============================================
-- FUNCTION: track_payment_application_changes
-- Automatically track changes to payment applications
-- =============================================
CREATE OR REPLACE FUNCTION track_payment_application_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO payment_application_history (payment_application_id, action, changed_by)
    VALUES (NEW.id, 'created', v_user_id);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO payment_application_history (payment_application_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'status_changed', 'status', OLD.status, NEW.status, v_user_id);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_track_pa_changes ON payment_applications;
CREATE TRIGGER trigger_track_pa_changes
  AFTER INSERT OR UPDATE ON payment_applications
  FOR EACH ROW EXECUTE FUNCTION track_payment_application_changes();

-- =============================================
-- FUNCTION: copy_sov_from_previous_application
-- Copy SOV items from previous application to new one
-- =============================================
CREATE OR REPLACE FUNCTION copy_sov_from_previous_application(
  p_new_application_id UUID,
  p_previous_application_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO schedule_of_values (
    payment_application_id,
    item_number,
    description,
    cost_code_id,
    cost_code,
    scheduled_value,
    change_order_adjustments,
    work_completed_previous,  -- This becomes total from previous
    work_completed_this_period,  -- Reset to 0 for new period
    materials_stored,  -- May reset or carry forward based on business logic
    retainage_percent,
    sort_order,
    notes
  )
  SELECT
    p_new_application_id,
    item_number,
    description,
    cost_code_id,
    cost_code,
    scheduled_value,
    change_order_adjustments,
    -- Previous work becomes the new "from previous" baseline
    work_completed_previous + work_completed_this_period + materials_stored,
    0,  -- Start fresh for this period
    0,  -- Materials stored - typically reset (installed or removed)
    retainage_percent,
    sort_order,
    notes
  FROM schedule_of_values
  WHERE payment_application_id = p_previous_application_id
  ORDER BY sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEW: payment_application_summary
-- Payment application with computed summaries
-- =============================================
CREATE OR REPLACE VIEW payment_application_summary AS
SELECT
  pa.*,
  -- Display number (App #1, #2, etc.)
  'App #' || pa.application_number as display_number,
  -- SOV item count
  (SELECT COUNT(*) FROM schedule_of_values sov WHERE sov.payment_application_id = pa.id) as sov_item_count,
  -- Project name
  p.name as project_name,
  p.project_number
FROM payment_applications pa
JOIN projects p ON pa.project_id = p.id
WHERE pa.deleted_at IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 068_payment_applications completed successfully';
END $$;
