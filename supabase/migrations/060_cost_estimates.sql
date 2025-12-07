-- Migration: Cost Estimation for Takeoffs
-- Description: Add support for calculating and managing cost estimates based on takeoff measurements
-- Features: Unit costs, labor rates, markup, line items

-- Cost Estimates Table
CREATE TABLE public.cost_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Cost configuration
  unit_costs JSONB NOT NULL DEFAULT '{}', -- Map of measurement_type -> cost_per_unit
  labor_rate DECIMAL(10,2) DEFAULT 0, -- Labor cost per hour (optional)
  markup_percentage DECIMAL(5,2) DEFAULT 0 CHECK (markup_percentage >= 0 AND markup_percentage <= 100), -- Profit margin percentage

  -- Calculated totals (denormalized for performance)
  total_material_cost DECIMAL(12,2) DEFAULT 0,
  total_labor_cost DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) DEFAULT 0,
  markup_amount DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'invoiced', 'archived')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Cost Estimate Line Items (links to takeoff items)
CREATE TABLE public.cost_estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.cost_estimates(id) ON DELETE CASCADE,
  takeoff_item_id UUID NOT NULL REFERENCES public.takeoff_items(id) ON DELETE CASCADE,

  -- Item details (cached from takeoff for performance)
  name TEXT NOT NULL,
  measurement_type TEXT NOT NULL,

  -- Cost breakdown
  quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  labor_hours DECIMAL(8,2) DEFAULT 0,
  labor_rate DECIMAL(10,2) DEFAULT 0,

  -- Calculated costs
  material_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_cost_estimates_project ON public.cost_estimates(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cost_estimates_created_by ON public.cost_estimates(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_cost_estimates_status ON public.cost_estimates(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_cost_estimate_items_estimate ON public.cost_estimate_items(estimate_id);
CREATE INDEX idx_cost_estimate_items_takeoff ON public.cost_estimate_items(takeoff_item_id);

-- Enable RLS
ALTER TABLE public.cost_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimate_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cost_estimates

-- Users can view estimates for projects they have access to
CREATE POLICY "Users can view project cost estimates"
  ON public.cost_estimates FOR SELECT
  USING (
    deleted_at IS NULL AND
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.company_id = p.company_id
      WHERE u.id = auth.uid()
    )
  );

-- Users can create estimates for projects in their company
CREATE POLICY "Users can create cost estimates"
  ON public.cost_estimates FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.company_id = p.company_id
      WHERE u.id = auth.uid()
    ) AND
    created_by = auth.uid()
  );

-- Users can update their own estimates or if they have proper role
CREATE POLICY "Users can update cost estimates"
  ON public.cost_estimates FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'project_manager', 'estimator')
      )
    )
  );

-- Users can delete their own estimates
CREATE POLICY "Users can delete cost estimates"
  ON public.cost_estimates FOR DELETE
  USING (
    created_by = auth.uid()
  );

-- RLS Policies for cost_estimate_items

-- Users can view line items for estimates they can view
CREATE POLICY "Users can view cost estimate items"
  ON public.cost_estimate_items FOR SELECT
  USING (
    estimate_id IN (
      SELECT id FROM public.cost_estimates
      WHERE deleted_at IS NULL
    )
  );

-- Users can manage line items for estimates they can update
CREATE POLICY "Users can manage cost estimate items"
  ON public.cost_estimate_items FOR ALL
  USING (
    estimate_id IN (
      SELECT id FROM public.cost_estimates
      WHERE deleted_at IS NULL
    )
  );

-- Function to recalculate estimate totals
CREATE OR REPLACE FUNCTION recalculate_estimate_totals(estimate_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_material DECIMAL(12,2);
  v_total_labor DECIMAL(12,2);
  v_subtotal DECIMAL(12,2);
  v_markup_pct DECIMAL(5,2);
  v_markup_amt DECIMAL(12,2);
  v_total DECIMAL(12,2);
BEGIN
  -- Calculate totals from line items
  SELECT
    COALESCE(SUM(material_cost), 0),
    COALESCE(SUM(labor_cost), 0)
  INTO v_total_material, v_total_labor
  FROM public.cost_estimate_items
  WHERE estimate_id = estimate_id_param;

  v_subtotal := v_total_material + v_total_labor;

  -- Get markup percentage
  SELECT markup_percentage INTO v_markup_pct
  FROM public.cost_estimates
  WHERE id = estimate_id_param;

  v_markup_amt := v_subtotal * (v_markup_pct / 100);
  v_total := v_subtotal + v_markup_amt;

  -- Update estimate
  UPDATE public.cost_estimates
  SET
    total_material_cost = v_total_material,
    total_labor_cost = v_total_labor,
    subtotal = v_subtotal,
    markup_amount = v_markup_amt,
    total_cost = v_total,
    updated_at = now()
  WHERE id = estimate_id_param;
END;
$$;

-- Trigger to recalculate totals when line items change
CREATE OR REPLACE FUNCTION trigger_recalculate_estimate_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_estimate_totals(OLD.estimate_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_estimate_totals(NEW.estimate_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER recalculate_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.cost_estimate_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_estimate_totals();

-- Trigger for updated_at timestamp
CREATE TRIGGER update_cost_estimates_updated_at
  BEFORE UPDATE ON public.cost_estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_estimate_items_updated_at
  BEFORE UPDATE ON public.cost_estimate_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.cost_estimates IS 'Cost estimates based on takeoff measurements with configurable unit costs and markup';
COMMENT ON TABLE public.cost_estimate_items IS 'Individual line items linking takeoff measurements to cost estimates';
COMMENT ON COLUMN public.cost_estimates.unit_costs IS 'JSON object mapping measurement types to their cost per unit';
COMMENT ON COLUMN public.cost_estimates.markup_percentage IS 'Profit margin as percentage (0-100)';
COMMENT ON FUNCTION recalculate_estimate_totals IS 'Recalculates all totals for a cost estimate based on its line items';
