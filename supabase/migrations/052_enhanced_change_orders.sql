-- Migration: 052_enhanced_change_orders.sql
-- Description: Enhanced Change Orders with PCO/CO distinction, multi-level approval, line items
-- Date: 2025-12-05

-- =============================================
-- TABLE: change_orders
-- Enhanced change order tracking with PCO/CO workflow
-- =============================================
CREATE TABLE IF NOT EXISTS change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Change Order Identification
  co_number INTEGER,  -- Approved CO number (null until approved)
  pco_number INTEGER NOT NULL,  -- Potential Change Order number (always assigned)

  -- Core Fields
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Change Type
  change_type VARCHAR(50) NOT NULL,  -- scope_change, design_clarification, unforeseen_condition, owner_request, value_engineering, error_omission

  -- PCO vs CO Status
  is_pco BOOLEAN DEFAULT true,  -- True = PCO, False = Approved CO

  -- Approval Status (Multi-level)
  status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, pending_estimate, estimate_complete, pending_internal_approval, internally_approved, pending_owner_review, approved, rejected, void
  internal_approval_status VARCHAR(30) DEFAULT 'pending',  -- pending, approved, rejected
  owner_approval_status VARCHAR(30) DEFAULT 'pending',  -- pending, approved, rejected

  -- Dates
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_submitted TIMESTAMPTZ,
  date_estimated TIMESTAMPTZ,
  date_internal_approved TIMESTAMPTZ,
  date_owner_submitted TIMESTAMPTZ,
  date_owner_approved TIMESTAMPTZ,
  date_executed TIMESTAMPTZ,

  -- Pricing Method
  pricing_method VARCHAR(30) DEFAULT 'lump_sum',  -- lump_sum, time_materials, unit_price

  -- Cost Summary
  proposed_amount DECIMAL(15, 2) DEFAULT 0,
  approved_amount DECIMAL(15, 2),

  -- Time Impact
  proposed_days INTEGER DEFAULT 0,
  approved_days INTEGER,

  -- Contract Tracking
  original_contract_amount DECIMAL(15, 2),
  previous_changes_amount DECIMAL(15, 2) DEFAULT 0,
  revised_contract_amount DECIMAL(15, 2),

  -- Assignment
  initiated_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  estimator_id UUID REFERENCES users(id),

  -- Ball-in-Court
  ball_in_court UUID REFERENCES users(id),
  ball_in_court_role VARCHAR(50),  -- estimating, pm, owner, architect

  -- Related Items
  related_rfi_id UUID REFERENCES rfis(id),
  related_submittal_id UUID REFERENCES submittals(id),
  related_site_condition_id UUID,  -- Will reference site_conditions if exists

  -- Subcontractor (if initiated by sub)
  subcontractor_id UUID REFERENCES subcontractors(id),

  -- Reason/Justification
  justification TEXT,
  owner_comments TEXT,

  -- Signatures
  internal_approver_id UUID REFERENCES users(id),
  internal_approver_name VARCHAR(255),
  owner_approver_name VARCHAR(255),
  owner_signature_url TEXT,

  -- Legacy reference
  legacy_workflow_item_id UUID REFERENCES workflow_items(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(project_id, pco_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id ON change_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_company_id ON change_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status ON change_orders(status);
CREATE INDEX IF NOT EXISTS idx_change_orders_is_pco ON change_orders(is_pco);
CREATE INDEX IF NOT EXISTS idx_change_orders_change_type ON change_orders(change_type);
CREATE INDEX IF NOT EXISTS idx_change_orders_ball_in_court ON change_orders(ball_in_court);
CREATE INDEX IF NOT EXISTS idx_change_orders_assigned_to ON change_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_change_orders_deleted_at ON change_orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_change_orders_related_rfi_id ON change_orders(related_rfi_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_related_submittal_id ON change_orders(related_submittal_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_change_orders_updated_at ON change_orders;
CREATE TRIGGER update_change_orders_updated_at BEFORE UPDATE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view change orders for their company projects" ON change_orders;
CREATE POLICY "Users can view change orders for their company projects" ON change_orders
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert change orders for their company projects" ON change_orders;
CREATE POLICY "Users can insert change orders for their company projects" ON change_orders
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update change orders for their company projects" ON change_orders;
CREATE POLICY "Users can update change orders for their company projects" ON change_orders
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: change_order_items
-- Line items within a change order
-- =============================================
CREATE TABLE IF NOT EXISTS change_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- Item Identification
  item_number INTEGER NOT NULL,
  description TEXT NOT NULL,

  -- Cost Code Reference
  cost_code_id UUID REFERENCES cost_codes(id),
  cost_code VARCHAR(20),

  -- Quantity and Unit
  quantity DECIMAL(12, 4),
  unit VARCHAR(20),
  unit_cost DECIMAL(12, 4),

  -- Labor
  labor_hours DECIMAL(8, 2),
  labor_rate DECIMAL(10, 2),
  labor_amount DECIMAL(15, 2),

  -- Material
  material_amount DECIMAL(15, 2),

  -- Equipment
  equipment_amount DECIMAL(15, 2),

  -- Subcontract
  subcontract_amount DECIMAL(15, 2),

  -- Other/Misc
  other_amount DECIMAL(15, 2),

  -- Markup
  markup_percent DECIMAL(5, 2),
  markup_amount DECIMAL(15, 2),

  -- Total
  total_amount DECIMAL(15, 2),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_order_items_change_order_id ON change_order_items(change_order_id);
CREATE INDEX IF NOT EXISTS idx_change_order_items_cost_code_id ON change_order_items(cost_code_id);

-- Trigger
DROP TRIGGER IF EXISTS update_change_order_items_updated_at ON change_order_items;
CREATE TRIGGER update_change_order_items_updated_at BEFORE UPDATE ON change_order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE change_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view change order items" ON change_order_items;
CREATE POLICY "Users can view change order items" ON change_order_items
  FOR SELECT
  USING (
    change_order_id IN (
      SELECT id FROM change_orders WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert change order items" ON change_order_items;
CREATE POLICY "Users can insert change order items" ON change_order_items
  FOR INSERT
  WITH CHECK (
    change_order_id IN (
      SELECT id FROM change_orders WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update change order items" ON change_order_items;
CREATE POLICY "Users can update change order items" ON change_order_items
  FOR UPDATE
  USING (
    change_order_id IN (
      SELECT id FROM change_orders WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete change order items" ON change_order_items;
CREATE POLICY "Users can delete change order items" ON change_order_items
  FOR DELETE
  USING (
    change_order_id IN (
      SELECT id FROM change_orders WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- TABLE: change_order_attachments
-- Files attached to change orders
-- =============================================
CREATE TABLE IF NOT EXISTS change_order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- Document or file
  document_id UUID REFERENCES documents(id),
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(50),  -- backup, proposal, approval, general
  file_size INTEGER,

  -- Metadata
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_order_attachments_change_order_id ON change_order_attachments(change_order_id);
CREATE INDEX IF NOT EXISTS idx_change_order_attachments_document_id ON change_order_attachments(document_id);

-- Enable RLS
ALTER TABLE change_order_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view change order attachments" ON change_order_attachments;
CREATE POLICY "Users can view change order attachments" ON change_order_attachments
  FOR SELECT
  USING (
    change_order_id IN (
      SELECT id FROM change_orders WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert change order attachments" ON change_order_attachments;
CREATE POLICY "Users can insert change order attachments" ON change_order_attachments
  FOR INSERT
  WITH CHECK (
    change_order_id IN (
      SELECT id FROM change_orders WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete change order attachments" ON change_order_attachments;
CREATE POLICY "Users can delete change order attachments" ON change_order_attachments
  FOR DELETE
  USING (
    change_order_id IN (
      SELECT id FROM change_orders WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- TABLE: change_order_history
-- Track all changes to change orders
-- =============================================
CREATE TABLE IF NOT EXISTS change_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- Change Info
  action VARCHAR(50) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,

  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_order_history_change_order_id ON change_order_history(change_order_id);
CREATE INDEX IF NOT EXISTS idx_change_order_history_changed_at ON change_order_history(changed_at);

-- Enable RLS
ALTER TABLE change_order_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view change order history" ON change_order_history;
CREATE POLICY "Users can view change order history" ON change_order_history
  FOR SELECT
  USING (
    change_order_id IN (
      SELECT id FROM change_orders WHERE project_id IN (
        SELECT id FROM projects WHERE company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- FUNCTION: get_next_pco_number
-- Get next PCO number for a project
-- =============================================
CREATE OR REPLACE FUNCTION get_next_pco_number(p_project_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(pco_number), 0) + 1
  FROM change_orders
  WHERE project_id = p_project_id AND deleted_at IS NULL;
$$ LANGUAGE SQL;

-- =============================================
-- FUNCTION: get_next_co_number
-- Get next approved CO number for a project
-- =============================================
CREATE OR REPLACE FUNCTION get_next_co_number(p_project_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(co_number), 0) + 1
  FROM change_orders
  WHERE project_id = p_project_id AND co_number IS NOT NULL AND deleted_at IS NULL;
$$ LANGUAGE SQL;

-- =============================================
-- FUNCTION: track_change_order_changes
-- Automatically track changes to change orders
-- =============================================
CREATE OR REPLACE FUNCTION track_change_order_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO change_order_history (change_order_id, action, changed_by)
    VALUES (NEW.id, 'created', v_user_id);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO change_order_history (change_order_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'status_changed', 'status', OLD.status, NEW.status, v_user_id);
    END IF;

    -- Track internal approval
    IF OLD.internal_approval_status IS DISTINCT FROM NEW.internal_approval_status THEN
      INSERT INTO change_order_history (change_order_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'internal_approval_changed', 'internal_approval_status', OLD.internal_approval_status, NEW.internal_approval_status, v_user_id);
    END IF;

    -- Track owner approval
    IF OLD.owner_approval_status IS DISTINCT FROM NEW.owner_approval_status THEN
      INSERT INTO change_order_history (change_order_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'owner_approval_changed', 'owner_approval_status', OLD.owner_approval_status, NEW.owner_approval_status, v_user_id);
    END IF;

    -- Track PCO to CO conversion
    IF OLD.is_pco = true AND NEW.is_pco = false THEN
      INSERT INTO change_order_history (change_order_id, action, changed_by)
      VALUES (NEW.id, 'converted_to_co', v_user_id);
    END IF;

    -- Track amount changes
    IF OLD.approved_amount IS DISTINCT FROM NEW.approved_amount THEN
      INSERT INTO change_order_history (change_order_id, action, field_changed, old_value, new_value, changed_by)
      VALUES (NEW.id, 'amount_changed', 'approved_amount', OLD.approved_amount::text, NEW.approved_amount::text, v_user_id);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_track_change_order_changes ON change_orders;
CREATE TRIGGER trigger_track_change_order_changes
  AFTER INSERT OR UPDATE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION track_change_order_changes();

-- =============================================
-- FUNCTION: recalculate_change_order_total
-- Recalculate change order total from items
-- =============================================
CREATE OR REPLACE FUNCTION recalculate_change_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE change_orders
  SET proposed_amount = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM change_order_items
    WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id)
  )
  WHERE id = COALESCE(NEW.change_order_id, OLD.change_order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_recalculate_change_order_total ON change_order_items;
CREATE TRIGGER trigger_recalculate_change_order_total
  AFTER INSERT OR UPDATE OR DELETE ON change_order_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_change_order_total();

-- =============================================
-- VIEW: change_order_summary
-- Change order with computed fields
-- =============================================
CREATE OR REPLACE VIEW change_order_summary AS
SELECT
  co.*,
  -- PCO/CO display number
  CASE
    WHEN co.is_pco = true THEN 'PCO-' || LPAD(co.pco_number::text, 3, '0')
    ELSE 'CO-' || LPAD(COALESCE(co.co_number, co.pco_number)::text, 3, '0')
  END as display_number,
  -- Item count
  (SELECT COUNT(*) FROM change_order_items coi WHERE coi.change_order_id = co.id) as item_count,
  -- Attachment count
  (SELECT COUNT(*) FROM change_order_attachments coa WHERE coa.change_order_id = co.id) as attachment_count,
  -- Days in current status
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - co.updated_at))::INTEGER as days_in_status,
  -- Is awaiting action
  CASE
    WHEN co.status IN ('pending_estimate', 'pending_internal_approval', 'pending_owner_review')
    THEN true
    ELSE false
  END as is_awaiting_action
FROM change_orders co
WHERE co.deleted_at IS NULL;

-- =============================================
-- Add FK from change_orders to cost_transactions
-- Link approved COs to cost transactions
-- =============================================
ALTER TABLE cost_transactions
  ADD COLUMN IF NOT EXISTS change_order_id UUID REFERENCES change_orders(id);

CREATE INDEX IF NOT EXISTS idx_cost_transactions_change_order_id ON cost_transactions(change_order_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 052_enhanced_change_orders completed successfully';
END $$;
