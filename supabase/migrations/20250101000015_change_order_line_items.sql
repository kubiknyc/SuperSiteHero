-- Migration: 094_change_order_line_items.sql
-- Description: Enhanced line items with category-based breakdown for change orders
-- Date: 2025-01-02

-- =============================================
-- TABLE: change_order_line_items
-- Category-based line item breakdown with quantity/unit pricing
-- =============================================
CREATE TABLE IF NOT EXISTS change_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- Item Identification
  item_number INTEGER NOT NULL DEFAULT 1,

  -- Category (labor, material, equipment, subcontractor, other)
  category VARCHAR(30) NOT NULL DEFAULT 'other',

  -- Description
  description TEXT NOT NULL,

  -- Cost Code Reference
  cost_code_id UUID REFERENCES cost_codes(id),
  cost_code VARCHAR(20),

  -- Quantity-based Pricing
  quantity DECIMAL(12, 4) NOT NULL DEFAULT 1,
  unit VARCHAR(20) NOT NULL DEFAULT 'LS',
  unit_price DECIMAL(15, 4) NOT NULL DEFAULT 0,
  extended_price DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Markup
  markup_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  markup_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Total
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_co_line_items_change_order_id ON change_order_line_items(change_order_id);
CREATE INDEX IF NOT EXISTS idx_co_line_items_category ON change_order_line_items(category);
CREATE INDEX IF NOT EXISTS idx_co_line_items_cost_code_id ON change_order_line_items(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_co_line_items_deleted_at ON change_order_line_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_co_line_items_item_number ON change_order_line_items(change_order_id, item_number);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_co_line_items_updated_at ON change_order_line_items;
CREATE TRIGGER update_co_line_items_updated_at
  BEFORE UPDATE ON change_order_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE change_order_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view change order line items" ON change_order_line_items;
CREATE POLICY "Users can view change order line items" ON change_order_line_items
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

DROP POLICY IF EXISTS "Users can insert change order line items" ON change_order_line_items;
CREATE POLICY "Users can insert change order line items" ON change_order_line_items
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

DROP POLICY IF EXISTS "Users can update change order line items" ON change_order_line_items;
CREATE POLICY "Users can update change order line items" ON change_order_line_items
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

DROP POLICY IF EXISTS "Users can delete change order line items" ON change_order_line_items;
CREATE POLICY "Users can delete change order line items" ON change_order_line_items
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
-- FUNCTION: calculate_line_item_totals
-- Calculate extended price, markup, and total for a line item
-- =============================================
CREATE OR REPLACE FUNCTION calculate_line_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate extended price (quantity * unit_price)
  NEW.extended_price := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0);

  -- Calculate markup amount
  NEW.markup_amount := NEW.extended_price * (COALESCE(NEW.markup_percent, 0) / 100);

  -- Calculate total
  NEW.total_amount := NEW.extended_price + NEW.markup_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_line_item_totals ON change_order_line_items;
CREATE TRIGGER trigger_calculate_line_item_totals
  BEFORE INSERT OR UPDATE ON change_order_line_items
  FOR EACH ROW EXECUTE FUNCTION calculate_line_item_totals();

-- =============================================
-- FUNCTION: recalculate_co_total_from_line_items
-- Update change order proposed_amount when line items change
-- =============================================
CREATE OR REPLACE FUNCTION recalculate_co_total_from_line_items()
RETURNS TRIGGER AS $$
DECLARE
  v_change_order_id UUID;
BEGIN
  -- Get the change order ID
  v_change_order_id := COALESCE(NEW.change_order_id, OLD.change_order_id);

  -- Update the change order's proposed amount
  UPDATE change_orders
  SET proposed_amount = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM change_order_line_items
    WHERE change_order_id = v_change_order_id
      AND deleted_at IS NULL
  ),
  updated_at = NOW()
  WHERE id = v_change_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_recalculate_co_total_from_line_items ON change_order_line_items;
CREATE TRIGGER trigger_recalculate_co_total_from_line_items
  AFTER INSERT OR UPDATE OR DELETE ON change_order_line_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_co_total_from_line_items();

-- =============================================
-- VIEW: change_order_line_items_summary
-- Summary view for line items by category
-- =============================================
CREATE OR REPLACE VIEW change_order_line_items_summary AS
SELECT
  change_order_id,
  category,
  COUNT(*) as item_count,
  SUM(extended_price) as category_subtotal,
  SUM(markup_amount) as category_markup,
  SUM(total_amount) as category_total
FROM change_order_line_items
WHERE deleted_at IS NULL
GROUP BY change_order_id, category;

-- =============================================
-- Add metadata column to change_orders if not exists
-- For storing escalation history, approval history, etc.
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_orders' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE change_orders ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- =============================================
-- Update existing change_order_items table
-- Add deleted_at for soft delete support
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_order_items' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE change_order_items ADD COLUMN deleted_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_change_order_items_deleted_at ON change_order_items(deleted_at);
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 094_change_order_line_items completed successfully';
END $$;
