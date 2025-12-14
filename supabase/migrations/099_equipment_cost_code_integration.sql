-- Migration: 099_equipment_cost_code_integration.sql
-- Description: Add cost code integration to equipment logs for job costing flow
-- Date: 2025-01-11

-- =============================================
-- ADD COST CODE TO EQUIPMENT LOGS
-- =============================================

-- Add cost_code_id to equipment_logs
ALTER TABLE equipment_logs
  ADD COLUMN IF NOT EXISTS cost_code_id UUID REFERENCES cost_codes(id);

-- Add index for cost code lookups
CREATE INDEX IF NOT EXISTS idx_equipment_logs_cost_code_id
  ON equipment_logs(cost_code_id);

-- =============================================
-- ADD CALCULATED COST FIELD
-- =============================================

-- Add calculated_cost field to store the total cost for the log entry
-- This combines hourly rate * hours_used + fuel_cost
ALTER TABLE equipment_logs
  ADD COLUMN IF NOT EXISTS calculated_cost DECIMAL(10, 2);

-- Add cost_posted flag to track if cost has been posted to cost tracking
ALTER TABLE equipment_logs
  ADD COLUMN IF NOT EXISTS cost_posted BOOLEAN DEFAULT FALSE;

-- Add cost_transaction_id to link back to the created transaction
ALTER TABLE equipment_logs
  ADD COLUMN IF NOT EXISTS cost_transaction_id UUID REFERENCES cost_transactions(id);

-- =============================================
-- FUNCTION: CALCULATE EQUIPMENT LOG COST
-- =============================================

CREATE OR REPLACE FUNCTION calculate_equipment_log_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_hourly_cost DECIMAL(10, 2);
  v_daily_rate DECIMAL(10, 2);
  v_calculated DECIMAL(10, 2) := 0;
BEGIN
  -- Get equipment hourly cost if available
  SELECT hourly_cost INTO v_hourly_cost
  FROM equipment
  WHERE id = NEW.equipment_id;

  -- Get assignment daily rate if equipment is assigned
  SELECT daily_rate INTO v_daily_rate
  FROM equipment_assignments
  WHERE equipment_id = NEW.equipment_id
    AND status = 'active'
  LIMIT 1;

  -- Calculate cost: (hourly_cost * hours_used) + fuel_cost
  IF v_hourly_cost IS NOT NULL AND NEW.hours_used > 0 THEN
    v_calculated := v_hourly_cost * NEW.hours_used;
  END IF;

  -- Add fuel cost if present
  IF NEW.fuel_cost IS NOT NULL THEN
    v_calculated := v_calculated + NEW.fuel_cost;
  END IF;

  NEW.calculated_cost := v_calculated;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-calculating cost
DROP TRIGGER IF EXISTS trigger_calculate_equipment_log_cost ON equipment_logs;
CREATE TRIGGER trigger_calculate_equipment_log_cost
  BEFORE INSERT OR UPDATE ON equipment_logs
  FOR EACH ROW EXECUTE FUNCTION calculate_equipment_log_cost();

-- =============================================
-- FUNCTION: POST EQUIPMENT COST TO TRANSACTIONS
-- =============================================

CREATE OR REPLACE FUNCTION post_equipment_cost_to_transaction(
  p_equipment_log_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_log RECORD;
  v_equipment RECORD;
  v_transaction_id UUID;
BEGIN
  -- Get the equipment log
  SELECT * INTO v_log
  FROM equipment_logs
  WHERE id = p_equipment_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipment log not found: %', p_equipment_log_id;
  END IF;

  -- Check if already posted
  IF v_log.cost_posted THEN
    RETURN v_log.cost_transaction_id;
  END IF;

  -- Require project_id and cost_code_id
  IF v_log.project_id IS NULL THEN
    RAISE EXCEPTION 'Cannot post cost: no project assigned';
  END IF;

  IF v_log.cost_code_id IS NULL THEN
    RAISE EXCEPTION 'Cannot post cost: no cost code assigned';
  END IF;

  -- Get equipment info
  SELECT * INTO v_equipment
  FROM equipment
  WHERE id = v_log.equipment_id;

  -- Create cost transaction
  INSERT INTO cost_transactions (
    project_id,
    cost_code_id,
    transaction_date,
    description,
    transaction_type,
    source_type,
    source_id,
    amount,
    vendor_name,
    notes,
    created_by
  ) VALUES (
    v_log.project_id,
    v_log.cost_code_id,
    v_log.log_date,
    format('Equipment: %s - %s (%s hrs)',
      v_equipment.equipment_number,
      v_equipment.name,
      v_log.hours_used::TEXT
    ),
    'actual',
    'equipment',
    p_equipment_log_id,
    COALESCE(v_log.calculated_cost, 0),
    v_equipment.owner_company,
    v_log.work_description,
    v_log.created_by
  )
  RETURNING id INTO v_transaction_id;

  -- Update equipment log with posted status
  UPDATE equipment_logs
  SET
    cost_posted = TRUE,
    cost_transaction_id = v_transaction_id
  WHERE id = p_equipment_log_id;

  -- Update project budget actual costs
  UPDATE project_budgets
  SET actual_cost = actual_cost + COALESCE(v_log.calculated_cost, 0)
  WHERE project_id = v_log.project_id
    AND cost_code_id = v_log.cost_code_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEW: EQUIPMENT LOGS WITH COST DETAILS
-- =============================================

CREATE OR REPLACE VIEW equipment_logs_with_costs AS
SELECT
  el.*,
  e.equipment_number,
  e.name as equipment_name,
  e.hourly_cost as equipment_hourly_cost,
  e.ownership_type,
  cc.code as cost_code,
  cc.name as cost_code_name,
  p.name as project_name,
  p.number as project_number,
  ct.id as linked_transaction_id,
  ct.amount as transaction_amount
FROM equipment_logs el
LEFT JOIN equipment e ON el.equipment_id = e.id
LEFT JOIN cost_codes cc ON el.cost_code_id = cc.id
LEFT JOIN projects p ON el.project_id = p.id
LEFT JOIN cost_transactions ct ON el.cost_transaction_id = ct.id;

-- Grant access to the view
GRANT SELECT ON equipment_logs_with_costs TO authenticated;

-- =============================================
-- UPDATE EXISTING LOGS WITH CALCULATED COSTS
-- =============================================

-- Recalculate costs for existing logs
UPDATE equipment_logs
SET calculated_cost = (
  SELECT
    COALESCE(e.hourly_cost * equipment_logs.hours_used, 0) + COALESCE(equipment_logs.fuel_cost, 0)
  FROM equipment e
  WHERE e.id = equipment_logs.equipment_id
)
WHERE calculated_cost IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 099_equipment_cost_code_integration completed successfully';
END $$;
