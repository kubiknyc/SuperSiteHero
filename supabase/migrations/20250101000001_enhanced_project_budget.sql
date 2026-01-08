-- Migration: 060_enhanced_project_budget.sql
-- Description: Enhanced project budget tracking with spent-to-date, health score, and progress
-- Date: 2025-01-01

-- =============================================
-- ENHANCED PROJECT BUDGET FIELDS
-- =============================================

-- Add spent_to_date tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS spent_to_date DECIMAL(15, 2) DEFAULT 0;

-- Add original budget (for variance tracking)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS original_budget DECIMAL(15, 2);

-- Add contingency tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contingency_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contingency_used DECIMAL(15, 2) DEFAULT 0;

-- Add progress tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS percent_complete DECIMAL(5, 2) DEFAULT 0;

-- Add health score (0-100, calculated or manual)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS health_score DECIMAL(5, 2);

-- Add schedule variance fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS baseline_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS baseline_end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS schedule_variance_days INTEGER DEFAULT 0;

-- Add hero image for project cards
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Add project type categorization
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(50); -- commercial, residential, industrial, infrastructure, etc.

-- =============================================
-- PROJECT BUDGET SUMMARY VIEW
-- =============================================
DROP VIEW IF EXISTS project_budget_summary;
CREATE OR REPLACE VIEW project_budget_summary AS
SELECT
  p.id,
  p.name,
  p.project_number,
  p.status,
  p.contract_value,
  p.budget,
  p.original_budget,
  p.spent_to_date,
  p.contingency_amount,
  p.contingency_used,
  p.percent_complete,
  p.health_score,
  -- Calculated fields
  COALESCE(p.budget, 0) - COALESCE(p.spent_to_date, 0) AS budget_remaining,
  CASE
    WHEN COALESCE(p.budget, 0) > 0 THEN
      ROUND((COALESCE(p.spent_to_date, 0) / p.budget) * 100, 2)
    ELSE 0
  END AS budget_percent_used,
  COALESCE(p.contingency_amount, 0) - COALESCE(p.contingency_used, 0) AS contingency_remaining,
  CASE
    WHEN COALESCE(p.original_budget, p.budget, 0) > 0 THEN
      COALESCE(p.budget, 0) - COALESCE(p.original_budget, p.budget, 0)
    ELSE 0
  END AS budget_variance,
  -- Schedule fields
  p.start_date,
  p.end_date,
  p.baseline_start_date,
  p.baseline_end_date,
  p.schedule_variance_days,
  -- Days remaining
  CASE
    WHEN p.end_date IS NOT NULL THEN
      GREATEST(0, EXTRACT(DAY FROM (p.end_date::timestamp - CURRENT_DATE::timestamp))::INTEGER)
    ELSE NULL
  END AS days_remaining,
  -- Is behind schedule
  CASE
    WHEN p.schedule_variance_days < 0 THEN true
    ELSE false
  END AS is_behind_schedule,
  -- Is over budget
  CASE
    WHEN COALESCE(p.spent_to_date, 0) > COALESCE(p.budget, 0) THEN true
    ELSE false
  END AS is_over_budget
FROM projects p
WHERE p.deleted_at IS NULL;

-- =============================================
-- FUNCTION: calculate_project_health
-- Calculate project health score based on multiple factors
-- =============================================
CREATE OR REPLACE FUNCTION calculate_project_health(p_project_id UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
  v_budget_score DECIMAL(5, 2);
  v_schedule_score DECIMAL(5, 2);
  v_safety_score DECIMAL(5, 2);
  v_quality_score DECIMAL(5, 2);
  v_health DECIMAL(5, 2);
  v_project projects%ROWTYPE;
  v_incident_count INTEGER;
  v_days_since_incident INTEGER;
BEGIN
  -- Get project data
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Budget Score (40% weight)
  -- 100 = under budget, 0 = 20%+ over budget
  IF COALESCE(v_project.budget, 0) > 0 THEN
    v_budget_score := GREATEST(0, LEAST(100,
      100 - ((COALESCE(v_project.spent_to_date, 0) / v_project.budget) - 0.8) * 500
    ));
  ELSE
    v_budget_score := 100; -- No budget set = assume OK
  END IF;

  -- Schedule Score (40% weight)
  -- 100 = on or ahead of schedule, 0 = 30+ days behind
  IF v_project.schedule_variance_days IS NOT NULL THEN
    v_schedule_score := GREATEST(0, LEAST(100,
      100 + (v_project.schedule_variance_days * 3.33)
    ));
  ELSE
    v_schedule_score := 100; -- No variance tracked = assume OK
  END IF;

  -- Safety Score (10% weight)
  SELECT COUNT(*),
         COALESCE(EXTRACT(DAY FROM (CURRENT_DATE - MAX(incident_date))), 365)
  INTO v_incident_count, v_days_since_incident
  FROM safety_incidents
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND incident_date > CURRENT_DATE - INTERVAL '365 days';

  IF v_incident_count = 0 THEN
    v_safety_score := 100;
  ELSE
    -- Deduct for recent incidents, recover with days since
    v_safety_score := GREATEST(0, LEAST(100,
      80 + (v_days_since_incident * 0.2) - (v_incident_count * 10)
    ));
  END IF;

  -- Quality Score (10% weight)
  -- Based on punch list completion rate
  SELECT
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE status IN ('verified', 'completed'))::DECIMAL / COUNT(*)) * 100
      ELSE 100
    END
  INTO v_quality_score
  FROM punch_items
  WHERE project_id = p_project_id AND deleted_at IS NULL;

  -- Calculate weighted health score
  v_health := (v_budget_score * 0.4) +
              (v_schedule_score * 0.4) +
              (v_safety_score * 0.1) +
              (v_quality_score * 0.1);

  -- Update the project with calculated health
  UPDATE projects SET health_score = v_health WHERE id = p_project_id;

  RETURN v_health;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: update_project_spent_from_transactions
-- Update spent_to_date from cost_transactions
-- =============================================
CREATE OR REPLACE FUNCTION update_project_spent_from_transactions(p_project_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  v_total DECIMAL(15, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM cost_transactions
  WHERE project_id = p_project_id
    AND transaction_type = 'actual'
    AND deleted_at IS NULL;

  UPDATE projects
  SET spent_to_date = v_total
  WHERE id = p_project_id;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: update_project_contingency_used
-- Calculate contingency used from approved change orders
-- =============================================
CREATE OR REPLACE FUNCTION update_project_contingency_used(p_project_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  v_total DECIMAL(15, 2);
BEGIN
  SELECT COALESCE(SUM(approved_amount), 0)
  INTO v_total
  FROM change_orders
  WHERE project_id = p_project_id
    AND status = 'approved'
    AND deleted_at IS NULL;

  UPDATE projects
  SET contingency_used = v_total
  WHERE id = p_project_id;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGER: Auto-update contingency on CO approval
-- =============================================
CREATE OR REPLACE FUNCTION trigger_update_project_contingency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    PERFORM update_project_contingency_used(NEW.project_id);
  ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    -- CO was un-approved (voided)
    PERFORM update_project_contingency_used(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_co_update_contingency ON change_orders;
CREATE TRIGGER trigger_co_update_contingency
  AFTER UPDATE OF status ON change_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_project_contingency();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 060_enhanced_project_budget completed successfully';
END $$;
