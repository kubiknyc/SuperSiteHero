-- Migration: 083_safety_checklists.sql
-- Description: Pre-task safety checklists with templates and conditional logic
-- Created: 2026-01-02

-- ============================================================================
-- SAFETY CHECKLIST TEMPLATES
-- ============================================================================

-- Checklist template library
CREATE TABLE IF NOT EXISTS safety_checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template identification
  name VARCHAR(200) NOT NULL,
  description TEXT,
  work_type VARCHAR(100) NOT NULL, -- e.g., 'excavation', 'roofing', 'electrical', 'confined_space'
  version INTEGER NOT NULL DEFAULT 1,

  -- Template metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  required_frequency VARCHAR(50) DEFAULT 'daily', -- daily, shift, task, one_time

  -- Categorization
  category VARCHAR(100), -- general, task_specific, equipment, environment
  tags TEXT[] DEFAULT '{}',

  -- Created/updated
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Template items/questions
CREATE TABLE IF NOT EXISTS safety_checklist_template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES safety_checklist_templates(id) ON DELETE CASCADE,

  -- Item content
  question TEXT NOT NULL,
  description TEXT, -- Help text or instructions
  item_type VARCHAR(50) NOT NULL DEFAULT 'yes_no', -- yes_no, pass_fail_na, text, number, photo, signature

  -- Ordering and grouping
  section_name VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Conditional logic
  is_conditional BOOLEAN NOT NULL DEFAULT false,
  condition_parent_id UUID REFERENCES safety_checklist_template_items(id),
  condition_trigger_value VARCHAR(100), -- e.g., 'no', 'fail', specific text

  -- Response requirements
  is_required BOOLEAN NOT NULL DEFAULT true,
  requires_photo_on_fail BOOLEAN NOT NULL DEFAULT false,
  requires_corrective_action_on_fail BOOLEAN NOT NULL DEFAULT false,

  -- Expected values
  expected_value VARCHAR(100), -- For pass/fail items
  critical_item BOOLEAN NOT NULL DEFAULT false, -- Stops work if failed

  -- PPE association
  required_ppe TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- COMPLETED CHECKLISTS
-- ============================================================================

-- Completed checklist instances
CREATE TABLE IF NOT EXISTS safety_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES safety_checklist_templates(id),

  -- Checklist identification
  checklist_number VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  work_type VARCHAR(100),

  -- Location and timing
  location VARCHAR(200),
  location_coordinates JSONB, -- { lat, lng }
  shift VARCHAR(50),
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Completion status
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, failed, requires_action
  overall_result VARCHAR(20), -- pass, fail, partial

  -- Completion details
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,

  -- Summary counts
  total_items INTEGER NOT NULL DEFAULT 0,
  passed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  na_items INTEGER NOT NULL DEFAULT 0,

  -- Supervisor review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Weather and conditions
  weather_conditions VARCHAR(200),
  temperature VARCHAR(50),

  -- Crew information
  crew_size INTEGER,
  crew_members JSONB DEFAULT '[]', -- Array of { name, role, company }

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Checklist item responses
CREATE TABLE IF NOT EXISTS safety_checklist_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES safety_checklists(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES safety_checklist_template_items(id),

  -- Question (copied from template or custom)
  question TEXT NOT NULL,
  section_name VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Response
  response_type VARCHAR(50) NOT NULL DEFAULT 'yes_no',
  response_value VARCHAR(500), -- 'yes', 'no', 'pass', 'fail', 'na', or text
  response_notes TEXT,

  -- Result classification
  result VARCHAR(20), -- pass, fail, na
  is_critical BOOLEAN NOT NULL DEFAULT false,

  -- Photo documentation
  photo_urls TEXT[] DEFAULT '{}',

  -- Corrective action (if required)
  corrective_action_required BOOLEAN NOT NULL DEFAULT false,
  corrective_action_description TEXT,
  corrective_action_assigned_to UUID REFERENCES profiles(id),
  corrective_action_due_date DATE,
  corrective_action_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
  corrective_action_completed_at TIMESTAMPTZ,

  -- Metadata
  responded_by UUID REFERENCES profiles(id),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_safety_checklist_templates_company ON safety_checklist_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_checklist_templates_work_type ON safety_checklist_templates(work_type);
CREATE INDEX IF NOT EXISTS idx_safety_checklist_templates_active ON safety_checklist_templates(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_safety_checklist_template_items_template ON safety_checklist_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_safety_checklist_template_items_order ON safety_checklist_template_items(template_id, section_name, sort_order);

CREATE INDEX IF NOT EXISTS idx_safety_checklists_project ON safety_checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_safety_checklists_company ON safety_checklists(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_checklists_template ON safety_checklists(template_id);
CREATE INDEX IF NOT EXISTS idx_safety_checklists_date ON safety_checklists(work_date);
CREATE INDEX IF NOT EXISTS idx_safety_checklists_status ON safety_checklists(status);
CREATE INDEX IF NOT EXISTS idx_safety_checklists_completed_by ON safety_checklists(completed_by);

CREATE INDEX IF NOT EXISTS idx_safety_checklist_responses_checklist ON safety_checklist_responses(checklist_id);
CREATE INDEX IF NOT EXISTS idx_safety_checklist_responses_result ON safety_checklist_responses(result);
CREATE INDEX IF NOT EXISTS idx_safety_checklist_responses_corrective ON safety_checklist_responses(corrective_action_required)
  WHERE corrective_action_required = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE safety_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checklist_responses ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Users can view templates from their company"
  ON safety_checklist_templates FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage templates"
  ON safety_checklist_templates FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Template items policies
CREATE POLICY "Users can view template items from their company templates"
  ON safety_checklist_template_items FOR SELECT
  USING (template_id IN (
    SELECT id FROM safety_checklist_templates
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Admins can manage template items"
  ON safety_checklist_template_items FOR ALL
  USING (template_id IN (
    SELECT id FROM safety_checklist_templates
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

-- Checklists policies
CREATE POLICY "Users can view checklists from their projects"
  ON safety_checklists FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create checklists on their projects"
  ON safety_checklists FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update checklists they created"
  ON safety_checklists FOR UPDATE
  USING (
    completed_by = auth.uid()
    OR project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Responses policies
CREATE POLICY "Users can view responses from accessible checklists"
  ON safety_checklist_responses FOR SELECT
  USING (checklist_id IN (
    SELECT id FROM safety_checklists
    WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage responses on their checklists"
  ON safety_checklist_responses FOR ALL
  USING (checklist_id IN (
    SELECT id FROM safety_checklists
    WHERE completed_by = auth.uid()
    OR project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  ));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate checklist number
CREATE OR REPLACE FUNCTION generate_checklist_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  next_num INTEGER;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CASE
      WHEN checklist_number ~ ('^SC-' || year_prefix || '-[0-9]+$')
      THEN CAST(SUBSTRING(checklist_number FROM '[0-9]+$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM safety_checklists
  WHERE company_id = NEW.company_id
    AND checklist_number LIKE 'SC-' || year_prefix || '-%';

  NEW.checklist_number := 'SC-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_checklist_number
  BEFORE INSERT ON safety_checklists
  FOR EACH ROW
  WHEN (NEW.checklist_number IS NULL)
  EXECUTE FUNCTION generate_checklist_number();

-- Update checklist summary counts
CREATE OR REPLACE FUNCTION update_checklist_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE safety_checklists
  SET
    total_items = (SELECT COUNT(*) FROM safety_checklist_responses WHERE checklist_id = COALESCE(NEW.checklist_id, OLD.checklist_id)),
    passed_items = (SELECT COUNT(*) FROM safety_checklist_responses WHERE checklist_id = COALESCE(NEW.checklist_id, OLD.checklist_id) AND result = 'pass'),
    failed_items = (SELECT COUNT(*) FROM safety_checklist_responses WHERE checklist_id = COALESCE(NEW.checklist_id, OLD.checklist_id) AND result = 'fail'),
    na_items = (SELECT COUNT(*) FROM safety_checklist_responses WHERE checklist_id = COALESCE(NEW.checklist_id, OLD.checklist_id) AND result = 'na'),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.checklist_id, OLD.checklist_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_checklist_counts
  AFTER INSERT OR UPDATE OR DELETE ON safety_checklist_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_checklist_summary();

-- Update timestamps
CREATE TRIGGER update_safety_checklist_templates_timestamp
  BEFORE UPDATE ON safety_checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_checklist_template_items_timestamp
  BEFORE UPDATE ON safety_checklist_template_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_checklists_timestamp
  BEFORE UPDATE ON safety_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_checklist_responses_timestamp
  BEFORE UPDATE ON safety_checklist_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT TEMPLATES
-- ============================================================================

-- Note: Default templates should be inserted per company when they sign up
-- Here's a sample template structure that can be copied

COMMENT ON TABLE safety_checklist_templates IS 'Pre-task safety checklist templates by work type';
COMMENT ON TABLE safety_checklist_template_items IS 'Individual items/questions within checklist templates with conditional logic support';
COMMENT ON TABLE safety_checklists IS 'Completed pre-task safety checklists';
COMMENT ON TABLE safety_checklist_responses IS 'Individual responses to checklist items with corrective action tracking';
