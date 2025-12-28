-- =============================================
-- Migration: 154_punch_list_back_charges.sql
-- Description: Back-charge capability for punch list items
-- Date: 2025-12-26
-- Purpose: Track costs for deficient work requiring back-charges to subcontractors
-- =============================================

-- =============================================
-- TABLE: punch_item_back_charges
-- Back-charges associated with punch list items
-- =============================================

CREATE TABLE IF NOT EXISTS punch_item_back_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punch_item_id UUID NOT NULL REFERENCES punch_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identification
  back_charge_number INTEGER NOT NULL,

  -- Responsible Party
  subcontractor_id UUID REFERENCES subcontractors(id),
  subcontractor_name VARCHAR(255), -- Denormalized for display

  -- Reason for Back-Charge
  reason VARCHAR(50) NOT NULL, -- 'substandard_work', 'rework_required', 'damage', 'cleanup', 'safety_violation', 'schedule_delay', 'other'
  reason_other TEXT, -- If reason is 'other'
  description TEXT,

  -- Cost Code Reference
  cost_code_id UUID REFERENCES cost_codes(id),
  cost_code VARCHAR(20),

  -- Cost Breakdown (mirrors change_order_items)
  labor_hours DECIMAL(10, 2) DEFAULT 0,
  labor_rate DECIMAL(10, 2) DEFAULT 0,
  labor_amount DECIMAL(12, 2) DEFAULT 0,
  material_amount DECIMAL(12, 2) DEFAULT 0,
  equipment_amount DECIMAL(12, 2) DEFAULT 0,
  subcontract_amount DECIMAL(12, 2) DEFAULT 0,
  other_amount DECIMAL(12, 2) DEFAULT 0,

  -- Markup
  markup_percent DECIMAL(5, 2) DEFAULT 0,
  markup_amount DECIMAL(12, 2) DEFAULT 0,

  -- Totals
  subtotal DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Status & Workflow
  status VARCHAR(50) DEFAULT 'initiated',
  -- Status values:
  -- initiated: Back-charge created
  -- estimated: Cost estimate complete
  -- pending_approval: Awaiting internal approval
  -- approved: Internally approved, ready to send to sub
  -- sent_to_sub: Notified subcontractor
  -- disputed: Subcontractor disputed the charge
  -- resolved: Dispute resolved
  -- applied: Applied to payment/invoice
  -- voided: Voided/cancelled

  -- Approval Workflow
  approval_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  -- Dispute Handling
  dispute_reason TEXT,
  dispute_response TEXT,
  dispute_resolved_by UUID REFERENCES users(id),
  dispute_resolved_at TIMESTAMPTZ,

  -- Application to Payment
  applied_to_invoice_id UUID, -- Reference to invoice when applied
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES users(id),

  -- Tracking
  initiated_by UUID REFERENCES users(id),
  date_initiated TIMESTAMPTZ DEFAULT NOW(),
  date_sent_to_sub TIMESTAMPTZ,

  -- Attachments (photo evidence, repair receipts, etc.)
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_back_charge_number UNIQUE (project_id, back_charge_number),
  CONSTRAINT valid_reason CHECK (reason IN ('substandard_work', 'rework_required', 'damage', 'cleanup', 'safety_violation', 'schedule_delay', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('initiated', 'estimated', 'pending_approval', 'approved', 'sent_to_sub', 'disputed', 'resolved', 'applied', 'voided'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_punch_item_back_charges_punch_item
  ON punch_item_back_charges(punch_item_id);

CREATE INDEX IF NOT EXISTS idx_punch_item_back_charges_project
  ON punch_item_back_charges(project_id);

CREATE INDEX IF NOT EXISTS idx_punch_item_back_charges_company
  ON punch_item_back_charges(company_id);

CREATE INDEX IF NOT EXISTS idx_punch_item_back_charges_subcontractor
  ON punch_item_back_charges(subcontractor_id)
  WHERE subcontractor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_punch_item_back_charges_status
  ON punch_item_back_charges(status);

CREATE INDEX IF NOT EXISTS idx_punch_item_back_charges_reason
  ON punch_item_back_charges(reason);

CREATE INDEX IF NOT EXISTS idx_punch_item_back_charges_deleted
  ON punch_item_back_charges(deleted_at)
  WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_punch_item_back_charges_updated_at
  BEFORE UPDATE ON punch_item_back_charges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABLE: punch_item_back_charge_history
-- Audit trail for back-charge status changes
-- =============================================

CREATE TABLE IF NOT EXISTS punch_item_back_charge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  back_charge_id UUID NOT NULL REFERENCES punch_item_back_charges(id) ON DELETE CASCADE,

  -- Change Info
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  action VARCHAR(100) NOT NULL, -- 'created', 'estimated', 'submitted_for_approval', 'approved', 'sent_to_sub', 'disputed', 'dispute_resolved', 'applied', 'voided', 'amount_updated'

  -- Details
  notes TEXT,
  amount_before DECIMAL(12, 2),
  amount_after DECIMAL(12, 2),

  -- Who & When
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for history
CREATE INDEX IF NOT EXISTS idx_punch_item_back_charge_history_back_charge
  ON punch_item_back_charge_history(back_charge_id);

CREATE INDEX IF NOT EXISTS idx_punch_item_back_charge_history_changed_at
  ON punch_item_back_charge_history(changed_at);

-- =============================================
-- FUNCTION: Get next back charge number
-- =============================================

CREATE OR REPLACE FUNCTION get_next_back_charge_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(back_charge_number), 0) + 1
  INTO next_number
  FROM punch_item_back_charges
  WHERE project_id = p_project_id;

  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Calculate back charge totals
-- =============================================

CREATE OR REPLACE FUNCTION calculate_back_charge_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate subtotal
  NEW.subtotal := COALESCE(NEW.labor_amount, 0) +
                  COALESCE(NEW.material_amount, 0) +
                  COALESCE(NEW.equipment_amount, 0) +
                  COALESCE(NEW.subcontract_amount, 0) +
                  COALESCE(NEW.other_amount, 0);

  -- Calculate labor amount from hours and rate if not directly set
  IF NEW.labor_hours IS NOT NULL AND NEW.labor_hours > 0 AND NEW.labor_rate IS NOT NULL THEN
    NEW.labor_amount := NEW.labor_hours * NEW.labor_rate;
    NEW.subtotal := NEW.subtotal + COALESCE(NEW.labor_amount, 0);
  END IF;

  -- Calculate markup
  NEW.markup_amount := ROUND(NEW.subtotal * COALESCE(NEW.markup_percent, 0) / 100, 2);

  -- Calculate total
  NEW.total_amount := NEW.subtotal + COALESCE(NEW.markup_amount, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_back_charge_totals
  BEFORE INSERT OR UPDATE ON punch_item_back_charges
  FOR EACH ROW
  EXECUTE FUNCTION calculate_back_charge_totals();

-- =============================================
-- FUNCTION: Record back charge history
-- =============================================

CREATE OR REPLACE FUNCTION record_back_charge_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record if status or amount changed
  IF TG_OP = 'INSERT' THEN
    INSERT INTO punch_item_back_charge_history (
      back_charge_id, previous_status, new_status, action,
      amount_after, changed_by, notes
    ) VALUES (
      NEW.id, NULL, NEW.status, 'created',
      NEW.total_amount, NEW.created_by, 'Back charge created'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Record status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO punch_item_back_charge_history (
        back_charge_id, previous_status, new_status, action,
        amount_before, amount_after, changed_by, notes
      ) VALUES (
        NEW.id, OLD.status, NEW.status,
        CASE NEW.status
          WHEN 'estimated' THEN 'estimated'
          WHEN 'pending_approval' THEN 'submitted_for_approval'
          WHEN 'approved' THEN 'approved'
          WHEN 'sent_to_sub' THEN 'sent_to_sub'
          WHEN 'disputed' THEN 'disputed'
          WHEN 'resolved' THEN 'dispute_resolved'
          WHEN 'applied' THEN 'applied'
          WHEN 'voided' THEN 'voided'
          ELSE 'status_changed'
        END,
        OLD.total_amount, NEW.total_amount,
        COALESCE(NEW.approved_by, NEW.applied_by, NEW.dispute_resolved_by),
        COALESCE(NEW.approval_notes, NEW.dispute_response)
      );
    -- Record amount change
    ELSIF OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
      INSERT INTO punch_item_back_charge_history (
        back_charge_id, previous_status, new_status, action,
        amount_before, amount_after, changed_by, notes
      ) VALUES (
        NEW.id, OLD.status, NEW.status, 'amount_updated',
        OLD.total_amount, NEW.total_amount, NULL, NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_record_back_charge_history
  AFTER INSERT OR UPDATE ON punch_item_back_charges
  FOR EACH ROW
  EXECUTE FUNCTION record_back_charge_history();

-- =============================================
-- VIEW: Back charges with punch item details
-- =============================================

CREATE OR REPLACE VIEW punch_item_back_charges_detailed AS
SELECT
  bc.*,
  pi.number AS punch_number,
  pi.title AS punch_title,
  pi.trade AS punch_trade,
  pi.building,
  pi.floor,
  pi.room,
  pi.status AS punch_status,
  s.name AS subcontractor_display_name,
  cc.name AS cost_code_name,
  cc.division AS cost_code_division,
  u.full_name AS initiated_by_name,
  approver.full_name AS approved_by_name
FROM punch_item_back_charges bc
JOIN punch_items pi ON bc.punch_item_id = pi.id
LEFT JOIN subcontractors s ON bc.subcontractor_id = s.id
LEFT JOIN cost_codes cc ON bc.cost_code_id = cc.id
LEFT JOIN users u ON bc.initiated_by = u.id
LEFT JOIN users approver ON bc.approved_by = approver.id
WHERE bc.deleted_at IS NULL;

COMMENT ON VIEW punch_item_back_charges_detailed IS 'Back charges with punch item and related entity details';

-- =============================================
-- VIEW: Back charge summary by subcontractor
-- =============================================

CREATE OR REPLACE VIEW back_charges_by_subcontractor AS
SELECT
  bc.project_id,
  bc.subcontractor_id,
  COALESCE(s.name, bc.subcontractor_name, 'Unknown') AS subcontractor_name,
  COUNT(DISTINCT bc.id) AS total_back_charges,
  COUNT(DISTINCT CASE WHEN bc.status = 'initiated' THEN bc.id END) AS initiated_count,
  COUNT(DISTINCT CASE WHEN bc.status = 'estimated' THEN bc.id END) AS estimated_count,
  COUNT(DISTINCT CASE WHEN bc.status = 'pending_approval' THEN bc.id END) AS pending_approval_count,
  COUNT(DISTINCT CASE WHEN bc.status = 'approved' THEN bc.id END) AS approved_count,
  COUNT(DISTINCT CASE WHEN bc.status = 'sent_to_sub' THEN bc.id END) AS sent_count,
  COUNT(DISTINCT CASE WHEN bc.status = 'disputed' THEN bc.id END) AS disputed_count,
  COUNT(DISTINCT CASE WHEN bc.status = 'applied' THEN bc.id END) AS applied_count,
  SUM(CASE WHEN bc.status NOT IN ('voided') THEN bc.total_amount ELSE 0 END) AS total_amount,
  SUM(CASE WHEN bc.status = 'applied' THEN bc.total_amount ELSE 0 END) AS applied_amount,
  SUM(CASE WHEN bc.status IN ('approved', 'sent_to_sub') THEN bc.total_amount ELSE 0 END) AS pending_amount,
  SUM(CASE WHEN bc.status = 'disputed' THEN bc.total_amount ELSE 0 END) AS disputed_amount
FROM punch_item_back_charges bc
LEFT JOIN subcontractors s ON bc.subcontractor_id = s.id
WHERE bc.deleted_at IS NULL
GROUP BY bc.project_id, bc.subcontractor_id, s.name, bc.subcontractor_name;

COMMENT ON VIEW back_charges_by_subcontractor IS 'Summary of back charges grouped by subcontractor';

-- =============================================
-- VIEW: Back charge summary by project
-- =============================================

CREATE OR REPLACE VIEW back_charges_by_project AS
SELECT
  bc.project_id,
  COUNT(DISTINCT bc.id) AS total_back_charges,
  COUNT(DISTINCT bc.punch_item_id) AS punch_items_with_back_charges,
  COUNT(DISTINCT bc.subcontractor_id) AS subcontractors_with_back_charges,
  SUM(CASE WHEN bc.status NOT IN ('voided') THEN bc.total_amount ELSE 0 END) AS total_amount,
  SUM(CASE WHEN bc.status = 'applied' THEN bc.total_amount ELSE 0 END) AS applied_amount,
  SUM(CASE WHEN bc.status IN ('approved', 'sent_to_sub', 'resolved') THEN bc.total_amount ELSE 0 END) AS pending_collection_amount,
  SUM(CASE WHEN bc.status = 'disputed' THEN bc.total_amount ELSE 0 END) AS disputed_amount,
  COUNT(DISTINCT CASE WHEN bc.status = 'disputed' THEN bc.id END) AS disputed_count
FROM punch_item_back_charges bc
WHERE bc.deleted_at IS NULL
GROUP BY bc.project_id;

COMMENT ON VIEW back_charges_by_project IS 'Summary of back charges by project';

-- =============================================
-- FUNCTION: Get back charges for a punch item
-- =============================================

CREATE OR REPLACE FUNCTION get_punch_item_back_charges(p_punch_item_id UUID)
RETURNS TABLE (
  id UUID,
  back_charge_number INTEGER,
  reason VARCHAR,
  description TEXT,
  subcontractor_name VARCHAR,
  total_amount DECIMAL,
  status VARCHAR,
  date_initiated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id,
    bc.back_charge_number,
    bc.reason,
    bc.description,
    COALESCE(s.name, bc.subcontractor_name)::VARCHAR AS subcontractor_name,
    bc.total_amount,
    bc.status,
    bc.date_initiated
  FROM punch_item_back_charges bc
  LEFT JOIN subcontractors s ON bc.subcontractor_id = s.id
  WHERE bc.punch_item_id = p_punch_item_id
    AND bc.deleted_at IS NULL
  ORDER BY bc.back_charge_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Get back charge statistics for project
-- =============================================

CREATE OR REPLACE FUNCTION get_project_back_charge_stats(p_project_id UUID)
RETURNS TABLE (
  total_back_charges BIGINT,
  total_amount DECIMAL,
  applied_amount DECIMAL,
  pending_amount DECIMAL,
  disputed_amount DECIMAL,
  avg_back_charge_amount DECIMAL,
  top_reason VARCHAR,
  top_subcontractor_name VARCHAR,
  top_subcontractor_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(DISTINCT bc.id) AS total_back_charges,
      SUM(CASE WHEN bc.status NOT IN ('voided') THEN bc.total_amount ELSE 0 END) AS total_amount,
      SUM(CASE WHEN bc.status = 'applied' THEN bc.total_amount ELSE 0 END) AS applied_amount,
      SUM(CASE WHEN bc.status IN ('approved', 'sent_to_sub', 'resolved') THEN bc.total_amount ELSE 0 END) AS pending_amount,
      SUM(CASE WHEN bc.status = 'disputed' THEN bc.total_amount ELSE 0 END) AS disputed_amount,
      AVG(CASE WHEN bc.status NOT IN ('voided') THEN bc.total_amount END) AS avg_back_charge_amount
    FROM punch_item_back_charges bc
    WHERE bc.project_id = p_project_id
      AND bc.deleted_at IS NULL
  ),
  top_reason AS (
    SELECT bc.reason
    FROM punch_item_back_charges bc
    WHERE bc.project_id = p_project_id
      AND bc.deleted_at IS NULL
    GROUP BY bc.reason
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  top_sub AS (
    SELECT
      COALESCE(s.name, bc.subcontractor_name) AS sub_name,
      SUM(bc.total_amount) AS sub_amount
    FROM punch_item_back_charges bc
    LEFT JOIN subcontractors s ON bc.subcontractor_id = s.id
    WHERE bc.project_id = p_project_id
      AND bc.deleted_at IS NULL
      AND bc.status NOT IN ('voided')
    GROUP BY COALESCE(s.name, bc.subcontractor_name)
    ORDER BY SUM(bc.total_amount) DESC
    LIMIT 1
  )
  SELECT
    stats.total_back_charges,
    COALESCE(stats.total_amount, 0),
    COALESCE(stats.applied_amount, 0),
    COALESCE(stats.pending_amount, 0),
    COALESCE(stats.disputed_amount, 0),
    COALESCE(ROUND(stats.avg_back_charge_amount, 2), 0),
    top_reason.reason::VARCHAR,
    top_sub.sub_name::VARCHAR,
    COALESCE(top_sub.sub_amount, 0)
  FROM stats
  LEFT JOIN top_reason ON true
  LEFT JOIN top_sub ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE punch_item_back_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_item_back_charge_history ENABLE ROW LEVEL SECURITY;

-- Back Charges: Users can view for their company projects
CREATE POLICY punch_item_back_charges_select ON punch_item_back_charges
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Back Charges: Users can insert for their company projects
CREATE POLICY punch_item_back_charges_insert ON punch_item_back_charges
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Back Charges: Users can update for their company projects
CREATE POLICY punch_item_back_charges_update ON punch_item_back_charges
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Back Charge History: Users can view for their company projects
CREATE POLICY punch_item_back_charge_history_select ON punch_item_back_charge_history
  FOR SELECT USING (
    back_charge_id IN (
      SELECT id FROM punch_item_back_charges WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- Grant Permissions
-- =============================================

GRANT SELECT ON punch_item_back_charges_detailed TO authenticated;
GRANT SELECT ON back_charges_by_subcontractor TO authenticated;
GRANT SELECT ON back_charges_by_project TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_back_charge_number TO authenticated;
GRANT EXECUTE ON FUNCTION get_punch_item_back_charges TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_back_charge_stats TO authenticated;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE punch_item_back_charges IS 'Back-charges for deficient punch list work to be charged to subcontractors';
COMMENT ON TABLE punch_item_back_charge_history IS 'Audit trail for back-charge status and amount changes';
COMMENT ON COLUMN punch_item_back_charges.reason IS 'Reason for back-charge: substandard_work, rework_required, damage, cleanup, safety_violation, schedule_delay, other';
COMMENT ON COLUMN punch_item_back_charges.status IS 'Workflow status: initiated, estimated, pending_approval, approved, sent_to_sub, disputed, resolved, applied, voided';
