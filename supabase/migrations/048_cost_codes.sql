-- Migration: 048_cost_codes.sql
-- Description: Cost Code System with CSI MasterFormat, project budgets, and cost transactions
-- Date: 2025-12-05

-- =============================================
-- TABLE: cost_codes
-- CSI MasterFormat based cost code definitions
-- =============================================
CREATE TABLE IF NOT EXISTS cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Code Identification
  code VARCHAR(20) NOT NULL,  -- e.g., "03 30 00"
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Hierarchy
  parent_code_id UUID REFERENCES cost_codes(id),
  level INTEGER DEFAULT 1,  -- 1=Division, 2=Section, 3=Subsection

  -- Classification
  division VARCHAR(2),  -- CSI Division: 01-49
  section VARCHAR(10),

  -- Cost Type
  cost_type VARCHAR(20) DEFAULT 'direct',  -- direct, indirect, overhead

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(company_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cost_codes_company_id ON cost_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_codes_parent_code_id ON cost_codes(parent_code_id);
CREATE INDEX IF NOT EXISTS idx_cost_codes_division ON cost_codes(division);
CREATE INDEX IF NOT EXISTS idx_cost_codes_is_active ON cost_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_cost_codes_deleted_at ON cost_codes(deleted_at);

-- Trigger
DROP TRIGGER IF EXISTS update_cost_codes_updated_at ON cost_codes;
CREATE TRIGGER update_cost_codes_updated_at BEFORE UPDATE ON cost_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE cost_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view cost codes for their company" ON cost_codes;
CREATE POLICY "Users can view cost codes for their company" ON cost_codes
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert cost codes for their company" ON cost_codes;
CREATE POLICY "Users can insert cost codes for their company" ON cost_codes
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update cost codes for their company" ON cost_codes;
CREATE POLICY "Users can update cost codes for their company" ON cost_codes
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- =============================================
-- TABLE: project_budgets
-- Budget allocations by cost code per project
-- =============================================
CREATE TABLE IF NOT EXISTS project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES cost_codes(id) ON DELETE CASCADE,

  -- Budget Amounts
  original_budget DECIMAL(15, 2) NOT NULL DEFAULT 0,
  approved_changes DECIMAL(15, 2) DEFAULT 0,
  -- revised_budget computed as original_budget + approved_changes

  -- Committed Costs (contracts, POs)
  committed_cost DECIMAL(15, 2) DEFAULT 0,

  -- Actual Costs
  actual_cost DECIMAL(15, 2) DEFAULT 0,

  -- Projections
  estimated_cost_at_completion DECIMAL(15, 2),
  -- variance computed as (original_budget + approved_changes) - actual_cost

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(project_id, cost_code_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_cost_code_id ON project_budgets(cost_code_id);

-- Trigger
DROP TRIGGER IF EXISTS update_project_budgets_updated_at ON project_budgets;
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON project_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view budgets for their projects" ON project_budgets;
CREATE POLICY "Users can view budgets for their projects" ON project_budgets
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert budgets for their projects" ON project_budgets;
CREATE POLICY "Users can insert budgets for their projects" ON project_budgets
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update budgets for their projects" ON project_budgets;
CREATE POLICY "Users can update budgets for their projects" ON project_budgets
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: cost_transactions
-- Individual cost entries tracking
-- =============================================
CREATE TABLE IF NOT EXISTS cost_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES cost_codes(id) ON DELETE CASCADE,

  -- Transaction Info
  transaction_date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,

  -- Transaction Type
  transaction_type VARCHAR(30) NOT NULL,  -- commitment, actual, adjustment, forecast
  source_type VARCHAR(30),  -- change_order, invoice, timesheet, material, equipment, subcontract
  source_id UUID,  -- Reference to source record

  -- Amounts
  amount DECIMAL(15, 2) NOT NULL,

  -- Vendor/Subcontractor
  vendor_name VARCHAR(255),
  subcontractor_id UUID REFERENCES subcontractors(id),

  -- Reference Numbers
  invoice_number VARCHAR(100),
  po_number VARCHAR(100),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cost_transactions_project_id ON cost_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_transactions_cost_code_id ON cost_transactions(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_cost_transactions_transaction_date ON cost_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cost_transactions_transaction_type ON cost_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cost_transactions_source_type ON cost_transactions(source_type);
CREATE INDEX IF NOT EXISTS idx_cost_transactions_deleted_at ON cost_transactions(deleted_at);

-- Enable RLS
ALTER TABLE cost_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view transactions for their projects" ON cost_transactions;
CREATE POLICY "Users can view transactions for their projects" ON cost_transactions
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert transactions for their projects" ON cost_transactions;
CREATE POLICY "Users can insert transactions for their projects" ON cost_transactions
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update transactions for their projects" ON cost_transactions;
CREATE POLICY "Users can update transactions for their projects" ON cost_transactions
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- =============================================
-- TABLE: project_budget_summary (View)
-- Aggregated budget summary per project/cost code
-- =============================================
CREATE OR REPLACE VIEW project_budget_summary AS
SELECT
  pb.id,
  pb.project_id,
  pb.cost_code_id,
  cc.code as cost_code,
  cc.name as cost_code_name,
  cc.division,
  pb.original_budget,
  pb.approved_changes,
  (pb.original_budget + COALESCE(pb.approved_changes, 0)) as revised_budget,
  pb.committed_cost,
  pb.actual_cost,
  pb.estimated_cost_at_completion,
  ((pb.original_budget + COALESCE(pb.approved_changes, 0)) - COALESCE(pb.actual_cost, 0)) as variance,
  CASE
    WHEN (pb.original_budget + COALESCE(pb.approved_changes, 0)) > 0
    THEN ROUND((COALESCE(pb.actual_cost, 0) / (pb.original_budget + COALESCE(pb.approved_changes, 0))) * 100, 2)
    ELSE 0
  END as percent_spent,
  pb.notes,
  pb.created_at,
  pb.updated_at
FROM project_budgets pb
JOIN cost_codes cc ON pb.cost_code_id = cc.id
WHERE cc.deleted_at IS NULL;

-- =============================================
-- FUNCTION: get_project_budget_totals
-- Get aggregated budget totals for a project
-- =============================================
CREATE OR REPLACE FUNCTION get_project_budget_totals(p_project_id UUID)
RETURNS TABLE (
  total_original_budget DECIMAL(15, 2),
  total_approved_changes DECIMAL(15, 2),
  total_revised_budget DECIMAL(15, 2),
  total_committed_cost DECIMAL(15, 2),
  total_actual_cost DECIMAL(15, 2),
  total_variance DECIMAL(15, 2),
  budget_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(original_budget), 0)::DECIMAL(15, 2) as total_original_budget,
    COALESCE(SUM(approved_changes), 0)::DECIMAL(15, 2) as total_approved_changes,
    COALESCE(SUM(original_budget + COALESCE(approved_changes, 0)), 0)::DECIMAL(15, 2) as total_revised_budget,
    COALESCE(SUM(committed_cost), 0)::DECIMAL(15, 2) as total_committed_cost,
    COALESCE(SUM(actual_cost), 0)::DECIMAL(15, 2) as total_actual_cost,
    COALESCE(SUM((original_budget + COALESCE(approved_changes, 0)) - COALESCE(actual_cost, 0)), 0)::DECIMAL(15, 2) as total_variance,
    COUNT(*)::INTEGER as budget_count
  FROM project_budgets
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: update_budget_from_transaction
-- Automatically update budget actual/committed costs when transactions added
-- =============================================
CREATE OR REPLACE FUNCTION update_budget_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update the project_budget for this cost code
    IF NEW.transaction_type = 'actual' THEN
      UPDATE project_budgets
      SET actual_cost = (
        SELECT COALESCE(SUM(amount), 0)
        FROM cost_transactions
        WHERE project_id = NEW.project_id
          AND cost_code_id = NEW.cost_code_id
          AND transaction_type = 'actual'
          AND deleted_at IS NULL
      )
      WHERE project_id = NEW.project_id AND cost_code_id = NEW.cost_code_id;
    ELSIF NEW.transaction_type = 'commitment' THEN
      UPDATE project_budgets
      SET committed_cost = (
        SELECT COALESCE(SUM(amount), 0)
        FROM cost_transactions
        WHERE project_id = NEW.project_id
          AND cost_code_id = NEW.cost_code_id
          AND transaction_type = 'commitment'
          AND deleted_at IS NULL
      )
      WHERE project_id = NEW.project_id AND cost_code_id = NEW.cost_code_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Recalculate on delete
    UPDATE project_budgets
    SET
      actual_cost = (
        SELECT COALESCE(SUM(amount), 0)
        FROM cost_transactions
        WHERE project_id = OLD.project_id
          AND cost_code_id = OLD.cost_code_id
          AND transaction_type = 'actual'
          AND deleted_at IS NULL
      ),
      committed_cost = (
        SELECT COALESCE(SUM(amount), 0)
        FROM cost_transactions
        WHERE project_id = OLD.project_id
          AND cost_code_id = OLD.cost_code_id
          AND transaction_type = 'commitment'
          AND deleted_at IS NULL
      )
    WHERE project_id = OLD.project_id AND cost_code_id = OLD.cost_code_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_budget_from_transaction ON cost_transactions;
CREATE TRIGGER trigger_update_budget_from_transaction
  AFTER INSERT OR UPDATE OR DELETE ON cost_transactions
  FOR EACH ROW EXECUTE FUNCTION update_budget_from_transaction();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 048_cost_codes completed successfully';
END $$;
