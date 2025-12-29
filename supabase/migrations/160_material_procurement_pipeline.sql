-- Migration: 160_material_procurement_pipeline.sql
-- Description: Complete material procurement pipeline with purchase orders, line items, and tracking
-- Date: 2025-12-29

-- =============================================
-- TABLE: vendors
-- Vendor/supplier management
-- =============================================

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50), -- Short vendor code (e.g., "ACE-001")
  vendor_type VARCHAR(50) DEFAULT 'supplier', -- supplier, manufacturer, distributor

  -- Contact Info
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',

  -- Business Info
  tax_id VARCHAR(50),
  payment_terms VARCHAR(100), -- NET30, NET60, COD, etc.
  account_number VARCHAR(100), -- Our account with them

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT true, -- Passed vendor qualification
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_vendors_company_id ON vendors(company_id);
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_code ON vendors(code);
CREATE INDEX idx_vendors_is_active ON vendors(is_active) WHERE is_active = true;
CREATE INDEX idx_vendors_deleted_at ON vendors(deleted_at);

-- Trigger
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
CREATE POLICY "Users can view vendors from their company"
  ON vendors FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create vendors for their company"
  ON vendors FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update vendors from their company"
  ON vendors FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete vendors from their company"
  ON vendors FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================
-- TABLE: purchase_orders
-- Main purchase order tracking
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

  -- PO Number (auto-generated per project)
  po_number VARCHAR(50) NOT NULL,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft',
  -- draft, pending_approval, approved, ordered, partially_received, received, closed, cancelled

  -- Dates
  order_date DATE,
  required_date DATE,
  expected_delivery_date DATE,

  -- Amounts (calculated from line items)
  subtotal DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  shipping_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,

  -- Tax settings
  tax_rate DECIMAL(5, 4) DEFAULT 0, -- e.g., 0.0825 for 8.25%

  -- Shipping info
  ship_to_project BOOLEAN DEFAULT true,
  ship_to_address TEXT,
  shipping_method VARCHAR(100),
  tracking_number VARCHAR(255),

  -- References
  cost_code_id UUID REFERENCES cost_codes(id) ON DELETE SET NULL,
  submittal_id UUID, -- Link to submittal if material from submittal

  -- Notes & Terms
  notes TEXT,
  terms_conditions TEXT,
  special_instructions TEXT,

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT false,
  approval_threshold DECIMAL(15, 2), -- Requires approval if total exceeds
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE (project_id, po_number)
);

-- Indexes
CREATE INDEX idx_purchase_orders_company_id ON purchase_orders(company_id);
CREATE INDEX idx_purchase_orders_project_id ON purchase_orders(project_id);
CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_orders_deleted_at ON purchase_orders(deleted_at);

-- Trigger
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
CREATE POLICY "Users can view POs from their projects"
  ON purchase_orders FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create POs for their projects"
  ON purchase_orders FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update POs for their projects"
  ON purchase_orders FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete POs for their projects"
  ON purchase_orders FOR DELETE
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  );

-- =============================================
-- TABLE: purchase_order_line_items
-- Individual items on a purchase order
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,

  -- Line item details
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  sku VARCHAR(100),
  part_number VARCHAR(100),

  -- Quantities
  quantity DECIMAL(15, 4) NOT NULL,
  unit VARCHAR(50) DEFAULT 'EA', -- EA, LF, SF, CY, TON, etc.
  unit_price DECIMAL(15, 4) NOT NULL,
  total_price DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- Receiving tracking
  quantity_received DECIMAL(15, 4) DEFAULT 0,
  quantity_remaining DECIMAL(15, 4) GENERATED ALWAYS AS (quantity - quantity_received) STORED,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  -- pending, ordered, partially_received, received, cancelled

  -- References
  cost_code_id UUID REFERENCES cost_codes(id) ON DELETE SET NULL,
  material_received_id UUID REFERENCES material_received(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_po_line_items_po_id ON purchase_order_line_items(purchase_order_id);
CREATE INDEX idx_po_line_items_status ON purchase_order_line_items(status);

-- Trigger
CREATE TRIGGER update_po_line_items_updated_at BEFORE UPDATE ON purchase_order_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE purchase_order_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_order_line_items
CREATE POLICY "Users can view line items from their POs"
  ON purchase_order_line_items FOR SELECT
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create line items for their POs"
  ON purchase_order_line_items FOR INSERT
  WITH CHECK (
    purchase_order_id IN (
      SELECT id FROM purchase_orders
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update line items for their POs"
  ON purchase_order_line_items FOR UPDATE
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete line items for their POs"
  ON purchase_order_line_items FOR DELETE
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders
      WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- TABLE: purchase_order_receipts
-- Track receiving against PO line items
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_order_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id UUID NOT NULL REFERENCES purchase_order_line_items(id) ON DELETE CASCADE,
  material_received_id UUID REFERENCES material_received(id) ON DELETE SET NULL,

  -- Receipt details
  quantity_received DECIMAL(15, 4) NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Condition on receipt
  condition VARCHAR(50) DEFAULT 'good', -- good, damaged, partial, rejected

  -- Notes
  notes TEXT,

  -- Who received
  received_by UUID REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_po_receipts_line_item_id ON purchase_order_receipts(line_item_id);
CREATE INDEX idx_po_receipts_receipt_date ON purchase_order_receipts(receipt_date);

-- Enable RLS
ALTER TABLE purchase_order_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_order_receipts
CREATE POLICY "Users can view receipts from their POs"
  ON purchase_order_receipts FOR SELECT
  USING (
    line_item_id IN (
      SELECT poli.id FROM purchase_order_line_items poli
      JOIN purchase_orders po ON poli.purchase_order_id = po.id
      WHERE po.project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create receipts for their POs"
  ON purchase_order_receipts FOR INSERT
  WITH CHECK (
    line_item_id IN (
      SELECT poli.id FROM purchase_order_line_items poli
      JOIN purchase_orders po ON poli.purchase_order_id = po.id
      WHERE po.project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- FUNCTION: generate_po_number
-- Auto-generate PO numbers per project
-- =============================================

CREATE OR REPLACE FUNCTION generate_po_number(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_project_number TEXT;
  v_next_num INTEGER;
  v_po_number TEXT;
BEGIN
  -- Get project number or use first 4 chars of ID
  SELECT COALESCE(number, LEFT(id::text, 4))
  INTO v_project_number
  FROM projects WHERE id = p_project_id;

  -- Get next PO number for this project
  SELECT COALESCE(MAX(
    CASE
      WHEN po_number ~ '-PO-[0-9]+$'
      THEN CAST(SUBSTRING(po_number FROM '-PO-([0-9]+)$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO v_next_num
  FROM purchase_orders
  WHERE project_id = p_project_id;

  -- Format: PROJECT-PO-001
  v_po_number := v_project_number || '-PO-' || LPAD(v_next_num::text, 3, '0');

  RETURN v_po_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER: auto_generate_po_number
-- Automatically set PO number on insert
-- =============================================

CREATE OR REPLACE FUNCTION auto_set_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := generate_po_number(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_po_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_po_number();

-- =============================================
-- FUNCTION: recalculate_po_totals
-- Update PO totals when line items change
-- =============================================

CREATE OR REPLACE FUNCTION recalculate_po_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_po_id UUID;
  v_subtotal DECIMAL(15, 2);
BEGIN
  -- Determine which PO to update
  IF TG_OP = 'DELETE' THEN
    v_po_id := OLD.purchase_order_id;
  ELSE
    v_po_id := NEW.purchase_order_id;
  END IF;

  -- Calculate subtotal from all line items
  SELECT COALESCE(SUM(total_price), 0)
  INTO v_subtotal
  FROM purchase_order_line_items
  WHERE purchase_order_id = v_po_id;

  -- Update PO with new totals
  UPDATE purchase_orders
  SET
    subtotal = v_subtotal,
    tax_amount = v_subtotal * COALESCE(tax_rate, 0),
    total_amount = v_subtotal + (v_subtotal * COALESCE(tax_rate, 0)) + COALESCE(shipping_amount, 0)
  WHERE id = v_po_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_po_totals
  AFTER INSERT OR UPDATE OR DELETE ON purchase_order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_po_totals();

-- =============================================
-- FUNCTION: update_line_item_received
-- Update line item quantities when receipt is added
-- =============================================

CREATE OR REPLACE FUNCTION update_line_item_received()
RETURNS TRIGGER AS $$
BEGIN
  -- Update line item received quantity
  UPDATE purchase_order_line_items
  SET quantity_received = (
    SELECT COALESCE(SUM(quantity_received), 0)
    FROM purchase_order_receipts
    WHERE line_item_id = NEW.line_item_id
  )
  WHERE id = NEW.line_item_id;

  -- Update line item status based on received quantity
  UPDATE purchase_order_line_items
  SET status = CASE
    WHEN quantity_received >= quantity THEN 'received'
    WHEN quantity_received > 0 THEN 'partially_received'
    ELSE 'ordered'
  END
  WHERE id = NEW.line_item_id;

  -- Check if all items received to update PO status
  PERFORM update_po_status_on_receipt(NEW.line_item_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_line_item_received
  AFTER INSERT ON purchase_order_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_line_item_received();

-- =============================================
-- FUNCTION: update_po_status_on_receipt
-- Update PO status based on line item statuses
-- =============================================

CREATE OR REPLACE FUNCTION update_po_status_on_receipt(p_line_item_id UUID)
RETURNS VOID AS $$
DECLARE
  v_po_id UUID;
  v_all_received BOOLEAN;
  v_any_received BOOLEAN;
BEGIN
  -- Get PO ID
  SELECT purchase_order_id INTO v_po_id
  FROM purchase_order_line_items
  WHERE id = p_line_item_id;

  -- Check if all items are received
  SELECT
    bool_and(status = 'received'),
    bool_or(status IN ('received', 'partially_received'))
  INTO v_all_received, v_any_received
  FROM purchase_order_line_items
  WHERE purchase_order_id = v_po_id
  AND status != 'cancelled';

  -- Update PO status
  UPDATE purchase_orders
  SET status = CASE
    WHEN v_all_received THEN 'received'
    WHEN v_any_received THEN 'partially_received'
    ELSE status
  END
  WHERE id = v_po_id
  AND status NOT IN ('closed', 'cancelled');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEW: purchase_orders_with_details
-- Enriched PO view with vendor and project info
-- =============================================

CREATE OR REPLACE VIEW purchase_orders_with_details AS
SELECT
  po.*,
  v.name AS vendor_name,
  v.email AS vendor_email,
  v.phone AS vendor_phone,
  v.contact_name AS vendor_contact,
  p.name AS project_name,
  p.project_number AS project_number,
  cc.code AS cost_code,
  cc.name AS cost_code_name,
  u_created.full_name AS created_by_name,
  u_approved.full_name AS approved_by_name,
  (
    SELECT COUNT(*) FROM purchase_order_line_items poli
    WHERE poli.purchase_order_id = po.id
  ) AS line_item_count,
  (
    SELECT COUNT(*) FROM purchase_order_line_items poli
    WHERE poli.purchase_order_id = po.id AND poli.status = 'received'
  ) AS received_line_count
FROM purchase_orders po
LEFT JOIN vendors v ON po.vendor_id = v.id
LEFT JOIN projects p ON po.project_id = p.id
LEFT JOIN cost_codes cc ON po.cost_code_id = cc.id
LEFT JOIN users u_created ON po.created_by = u_created.id
LEFT JOIN users u_approved ON po.approved_by = u_approved.id
WHERE po.deleted_at IS NULL;

-- =============================================
-- FUNCTION: get_procurement_stats
-- Get procurement statistics for a project
-- =============================================

CREATE OR REPLACE FUNCTION get_procurement_stats(p_project_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_pos', COUNT(*),
    'total_value', COALESCE(SUM(total_amount), 0),
    'this_month_value', COALESCE(SUM(total_amount) FILTER (WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)), 0),
    'by_status', json_build_object(
      'draft', COUNT(*) FILTER (WHERE status = 'draft'),
      'pending_approval', COUNT(*) FILTER (WHERE status = 'pending_approval'),
      'approved', COUNT(*) FILTER (WHERE status = 'approved'),
      'ordered', COUNT(*) FILTER (WHERE status = 'ordered'),
      'partially_received', COUNT(*) FILTER (WHERE status = 'partially_received'),
      'received', COUNT(*) FILTER (WHERE status = 'received'),
      'closed', COUNT(*) FILTER (WHERE status = 'closed'),
      'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')
    ),
    'pending_delivery', COUNT(*) FILTER (WHERE status IN ('ordered', 'partially_received')),
    'awaiting_approval', COUNT(*) FILTER (WHERE status = 'pending_approval'),
    'unique_vendors', COUNT(DISTINCT vendor_id)
  ) INTO result
  FROM purchase_orders
  WHERE project_id = p_project_id
  AND deleted_at IS NULL;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_procurement_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_po_number(UUID) TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE vendors IS 'Vendor/supplier directory for material procurement';
COMMENT ON TABLE purchase_orders IS 'Purchase orders for material procurement';
COMMENT ON TABLE purchase_order_line_items IS 'Individual line items on a purchase order';
COMMENT ON TABLE purchase_order_receipts IS 'Material receipts against PO line items';
COMMENT ON COLUMN purchase_orders.status IS 'PO lifecycle: draft -> pending_approval -> approved -> ordered -> partially_received -> received -> closed';
