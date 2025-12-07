-- Migration: 070_fix_cost_estimates_security.sql
-- Purpose: Fix all security vulnerabilities in cost estimates feature
-- Date: 2025-12-07
-- Critical security fixes for multi-tenant isolation, privilege escalation, and data integrity

-- ============================================================================
-- CRITICAL FIX #1: Multi-tenant RLS policies with project_assignments
-- ============================================================================

-- Drop existing vulnerable policies
DROP POLICY IF EXISTS "Users can view project cost estimates" ON public.cost_estimates;
DROP POLICY IF EXISTS "Users can create project cost estimates" ON public.cost_estimates;
DROP POLICY IF EXISTS "Users can update project cost estimates" ON public.cost_estimates;
DROP POLICY IF EXISTS "Users can delete project cost estimates" ON public.cost_estimates;

-- Recreate with proper project_assignments check
CREATE POLICY "Users can view assigned project cost estimates"
  ON public.cost_estimates FOR SELECT
  USING (
    deleted_at IS NULL AND
    project_id IN (
      SELECT project_id FROM public.project_assignments
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cost estimates for assigned projects"
  ON public.cost_estimates FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_assignments
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cost estimates for assigned projects"
  ON public.cost_estimates FOR UPDATE
  USING (
    deleted_at IS NULL AND
    project_id IN (
      SELECT project_id FROM public.project_assignments
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cost estimates for assigned projects"
  ON public.cost_estimates FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM public.project_assignments
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- CRITICAL FIX #2: Fix cost_estimate_items RLS policies
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can manage cost estimate items" ON public.cost_estimate_items;

-- Create granular policies
CREATE POLICY "Users can view cost estimate items for assigned projects"
  ON public.cost_estimate_items FOR SELECT
  USING (
    estimate_id IN (
      SELECT ce.id FROM public.cost_estimates ce
      WHERE ce.project_id IN (
        SELECT project_id FROM public.project_assignments
        WHERE user_id = auth.uid()
      )
      AND ce.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can create cost estimate items for assigned projects"
  ON public.cost_estimate_items FOR INSERT
  WITH CHECK (
    estimate_id IN (
      SELECT ce.id FROM public.cost_estimates ce
      WHERE ce.project_id IN (
        SELECT project_id FROM public.project_assignments
        WHERE user_id = auth.uid()
      )
      AND ce.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can update cost estimate items for assigned projects"
  ON public.cost_estimate_items FOR UPDATE
  USING (
    estimate_id IN (
      SELECT ce.id FROM public.cost_estimates ce
      WHERE ce.project_id IN (
        SELECT project_id FROM public.project_assignments
        WHERE user_id = auth.uid()
      )
      AND ce.deleted_at IS NULL
    )
  );

CREATE POLICY "Users can delete cost estimate items for assigned projects"
  ON public.cost_estimate_items FOR DELETE
  USING (
    estimate_id IN (
      SELECT ce.id FROM public.cost_estimates ce
      WHERE ce.project_id IN (
        SELECT project_id FROM public.project_assignments
        WHERE user_id = auth.uid()
      )
      AND ce.deleted_at IS NULL
    )
  );

-- ============================================================================
-- CRITICAL FIX #3: Make takeoff_item_id nullable
-- ============================================================================

-- Allow manual line items without takeoff references
ALTER TABLE public.cost_estimate_items
  ALTER COLUMN takeoff_item_id DROP NOT NULL;

-- ============================================================================
-- CRITICAL FIX #4: Add SECURITY DEFINER authorization
-- ============================================================================

-- Recreate function with proper authorization check
CREATE OR REPLACE FUNCTION public.recalculate_estimate_totals(estimate_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_material_cost NUMERIC(12,2);
  v_total_labor_cost NUMERIC(12,2);
  v_subtotal NUMERIC(12,2);
  v_markup_percentage NUMERIC(5,2);
  v_markup_amount NUMERIC(12,2);
  v_total_cost NUMERIC(12,2);
BEGIN
  -- SECURITY: Verify user has access to this estimate
  IF NOT EXISTS (
    SELECT 1 FROM public.cost_estimates ce
    WHERE ce.id = estimate_id_param
    AND ce.project_id IN (
      SELECT project_id FROM public.project_assignments
      WHERE user_id = auth.uid()
    )
    AND ce.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have access to this estimate';
  END IF;

  -- Calculate totals from line items
  SELECT
    COALESCE(SUM(material_cost), 0),
    COALESCE(SUM(labor_cost), 0)
  INTO
    v_total_material_cost,
    v_total_labor_cost
  FROM public.cost_estimate_items
  WHERE estimate_id = estimate_id_param;

  -- Calculate subtotal
  v_subtotal := v_total_material_cost + v_total_labor_cost;

  -- Get markup percentage
  SELECT markup_percentage INTO v_markup_percentage
  FROM public.cost_estimates
  WHERE id = estimate_id_param;

  -- Calculate markup amount and total
  v_markup_amount := v_subtotal * (COALESCE(v_markup_percentage, 0) / 100);
  v_total_cost := v_subtotal + v_markup_amount;

  -- Update the estimate with calculated values
  UPDATE public.cost_estimates
  SET
    total_material_cost = v_total_material_cost,
    total_labor_cost = v_total_labor_cost,
    subtotal = v_subtotal,
    markup_amount = v_markup_amount,
    total_cost = v_total_cost,
    updated_at = NOW()
  WHERE id = estimate_id_param;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.recalculate_estimate_totals(UUID) TO authenticated;

-- ============================================================================
-- CRITICAL FIX #5: Enforce created_by from auth.uid()
-- ============================================================================

-- Trigger to automatically set created_by from auth context
CREATE OR REPLACE FUNCTION public.set_cost_estimate_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always override created_by with authenticated user
  NEW.created_by := auth.uid();

  -- Verify user is authenticated
  IF NEW.created_by IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create cost estimates';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_cost_estimate_created_by ON public.cost_estimates;
CREATE TRIGGER ensure_cost_estimate_created_by
  BEFORE INSERT ON public.cost_estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_cost_estimate_created_by();

-- ============================================================================
-- CRITICAL FIX #6: Enforce calculated field integrity
-- ============================================================================

-- Trigger to prevent tampering with calculated fields
CREATE OR REPLACE FUNCTION public.protect_cost_estimate_calculated_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calculated_material NUMERIC(12,2);
  v_calculated_labor NUMERIC(12,2);
  v_calculated_subtotal NUMERIC(12,2);
  v_calculated_markup NUMERIC(12,2);
  v_calculated_total NUMERIC(12,2);
BEGIN
  -- Recalculate from line items
  SELECT
    COALESCE(SUM(material_cost), 0),
    COALESCE(SUM(labor_cost), 0)
  INTO
    v_calculated_material,
    v_calculated_labor
  FROM public.cost_estimate_items
  WHERE estimate_id = NEW.id;

  v_calculated_subtotal := v_calculated_material + v_calculated_labor;
  v_calculated_markup := v_calculated_subtotal * (COALESCE(NEW.markup_percentage, 0) / 100);
  v_calculated_total := v_calculated_subtotal + v_calculated_markup;

  -- Override with calculated values
  NEW.total_material_cost := v_calculated_material;
  NEW.total_labor_cost := v_calculated_labor;
  NEW.subtotal := v_calculated_subtotal;
  NEW.markup_amount := v_calculated_markup;
  NEW.total_cost := v_calculated_total;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalculate_cost_estimate_totals ON public.cost_estimates;
CREATE TRIGGER recalculate_cost_estimate_totals
  BEFORE INSERT OR UPDATE ON public.cost_estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_cost_estimate_calculated_fields();

-- ============================================================================
-- CRITICAL FIX #7: Add JSONB validation for unit_costs
-- ============================================================================

-- Add CHECK constraint to validate unit_costs structure
ALTER TABLE public.cost_estimates
  DROP CONSTRAINT IF EXISTS valid_unit_costs_jsonb;

ALTER TABLE public.cost_estimates
  ADD CONSTRAINT valid_unit_costs_jsonb CHECK (
    unit_costs IS NULL OR (
      jsonb_typeof(unit_costs) = 'object' AND
      -- Ensure all keys are valid measurement types
      NOT EXISTS (
        SELECT 1 FROM jsonb_object_keys(unit_costs) k
        WHERE k !~ '^[a-z_]+$'  -- Only lowercase letters and underscores
      ) AND
      -- Ensure all values are valid numbers
      NOT EXISTS (
        SELECT 1 FROM jsonb_each(unit_costs) v
        WHERE jsonb_typeof(v.value) != 'number'
        OR (v.value::text)::numeric < 0  -- No negative costs
        OR (v.value::text)::numeric > 999999  -- Reasonable upper limit
      )
    )
  );

-- ============================================================================
-- HIGH FIX #8: Replace row-level trigger with statement-level
-- ============================================================================

-- Drop the row-level trigger on cost_estimate_items
DROP TRIGGER IF EXISTS recalculate_estimate_on_item_change ON public.cost_estimate_items;

-- Create statement-level trigger to avoid race conditions
CREATE OR REPLACE FUNCTION public.recalculate_estimates_after_items_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For INSERT/UPDATE, recalculate affected estimates from NEW rows
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.recalculate_estimate_totals(estimate_id)
    FROM (SELECT DISTINCT estimate_id FROM NEW) AS distinct_estimates;
  END IF;

  -- For DELETE/UPDATE, recalculate affected estimates from OLD rows
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    PERFORM public.recalculate_estimate_totals(estimate_id)
    FROM (SELECT DISTINCT estimate_id FROM OLD) AS distinct_estimates;
  END IF;

  RETURN NULL;  -- Statement-level trigger return value is ignored
END;
$$;

-- Note: PostgreSQL 10+ supports AFTER INSERT OR UPDATE OR DELETE ... FOR EACH STATEMENT
-- with transition tables (NEW TABLE, OLD TABLE)
CREATE TRIGGER recalculate_estimates_statement_level
  AFTER INSERT OR UPDATE OR DELETE ON public.cost_estimate_items
  REFERENCING NEW TABLE AS NEW OLD TABLE AS OLD
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.recalculate_estimates_after_items_change();

-- ============================================================================
-- ADDITIONAL SECURITY: Add indexes for RLS policy performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cost_estimates_project_id_deleted
  ON public.cost_estimates(project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cost_estimate_items_estimate_id
  ON public.cost_estimate_items(estimate_id);

-- ============================================================================
-- AUDIT: Add comment documenting security fixes
-- ============================================================================

COMMENT ON TABLE public.cost_estimates IS
  'Cost estimates for construction projects. Security fixes applied in migration 070: '
  'Multi-tenant RLS with project_assignments, created_by enforcement, calculated field protection, '
  'JSONB validation, and SECURITY DEFINER authorization.';

COMMENT ON TABLE public.cost_estimate_items IS
  'Line items for cost estimates. Security fixes applied in migration 070: '
  'Granular RLS policies, nullable takeoff_item_id, statement-level trigger for race condition prevention.';
