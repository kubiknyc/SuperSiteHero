-- Migration: Takeoff Templates
-- Description: Add support for saving and reusing takeoff measurement templates
-- Features: Project-specific or company-wide templates with tagging and search

-- Takeoff Templates Table
CREATE TABLE public.takeoff_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- NULL = company-wide template
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Template data
  measurement_type TEXT NOT NULL CHECK (measurement_type IN (
    'linear', 'area', 'count', 'linear_with_drop',
    'pitched_area', 'pitched_linear', 'surface_area',
    'volume_2d', 'volume_3d'
  )),
  template_data JSONB NOT NULL DEFAULT '{}', -- Contains default values: color, defaultName, dropHeight, pitch, height, depth, notes

  -- Metadata
  tags TEXT[] DEFAULT '{}', -- For categorization/search
  is_public BOOLEAN DEFAULT false, -- Share with other companies (future feature)
  usage_count INTEGER DEFAULT 0, -- Track popularity

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_takeoff_templates_company ON public.takeoff_templates(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_takeoff_templates_project ON public.takeoff_templates(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_takeoff_templates_type ON public.takeoff_templates(measurement_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_takeoff_templates_tags ON public.takeoff_templates USING gin(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_takeoff_templates_created_by ON public.takeoff_templates(created_by) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.takeoff_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view templates from their company (both project-specific and company-wide)
CREATE POLICY "Users can view company templates"
  ON public.takeoff_templates FOR SELECT
  USING (
    deleted_at IS NULL AND
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Users can create templates in their company
CREATE POLICY "Users can create templates"
  ON public.takeoff_templates FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()) AND
    created_by = auth.uid()
  );

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.takeoff_templates FOR UPDATE
  USING (
    deleted_at IS NULL AND
    created_by = auth.uid()
  );

-- Users can delete (soft delete) their own templates
CREATE POLICY "Users can delete own templates"
  ON public.takeoff_templates FOR DELETE
  USING (
    created_by = auth.uid()
  );

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.takeoff_templates
  SET usage_count = usage_count + 1
  WHERE id = template_id;
END;
$$;

-- Trigger for updated_at timestamp
CREATE TRIGGER update_takeoff_templates_updated_at
  BEFORE UPDATE ON public.takeoff_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE public.takeoff_templates IS 'Reusable templates for takeoff measurements - can be project-specific or company-wide';
COMMENT ON COLUMN public.takeoff_templates.project_id IS 'NULL indicates company-wide template, otherwise project-specific';
COMMENT ON COLUMN public.takeoff_templates.template_data IS 'JSON data containing default values: color, defaultName, dropHeight, pitch, height, depth, notes';
COMMENT ON COLUMN public.takeoff_templates.tags IS 'Array of tags for categorization and searching';
