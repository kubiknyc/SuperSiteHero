-- Migration 123: Inspection to Punch Item Auto-Link
-- Phase 2.3: Cross-Feature Integration - Auto-generate punch items from failed inspections
-- Creates remediation tracking and auto-linking system

-- =============================================================================
-- ADD SOURCE TRACKING COLUMNS TO PUNCH ITEMS
-- =============================================================================

-- Add columns to track the source of auto-generated punch items
ALTER TABLE punch_items ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE punch_items ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE punch_items ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;

-- Add index for source lookups
CREATE INDEX IF NOT EXISTS idx_punch_items_source ON punch_items(source_type, source_id)
  WHERE source_type IS NOT NULL;

-- =============================================================================
-- REMEDIATION TRACKING TABLE
-- =============================================================================

-- Track the remediation status of issues from inspections/checklists
CREATE TABLE IF NOT EXISTS remediation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Source of the issue
  source_type TEXT NOT NULL CHECK (source_type IN (
    'inspection',
    'checklist',
    'safety_observation',
    'equipment_inspection'
  )),
  source_id UUID NOT NULL,

  -- The punch item created for remediation
  punch_item_id UUID REFERENCES punch_items(id) ON DELETE SET NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Punch item created, waiting for work
    'in_progress',  -- Work started
    'resolved',     -- Work completed, pending verification
    'verified',     -- Verified by inspector/supervisor
    'failed'        -- Verification failed, needs more work
  )),

  -- Verification
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,

  -- Auto-generated details
  auto_generated BOOLEAN DEFAULT true,
  generated_from_item_id TEXT, -- For checklist items, stores the template item ID

  -- Photos carried over from source
  source_photo_ids UUID[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint - one remediation record per source item
  CONSTRAINT unique_remediation_source UNIQUE(source_type, source_id, generated_from_item_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_remediation_project ON remediation_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_remediation_source ON remediation_tracking(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_remediation_punch ON remediation_tracking(punch_item_id);
CREATE INDEX IF NOT EXISTS idx_remediation_status ON remediation_tracking(status) WHERE status NOT IN ('verified');
CREATE INDEX IF NOT EXISTS idx_remediation_company ON remediation_tracking(company_id);

-- =============================================================================
-- AUTO-LINK CONFIGURATION TABLE
-- =============================================================================

-- Store configuration for auto-generation behavior
CREATE TABLE IF NOT EXISTS auto_link_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Configuration type
  source_type TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_auto_link_config UNIQUE(company_id, source_type, config_key)
);

-- Insert default configurations
INSERT INTO auto_link_configurations (company_id, source_type, config_key, config_value)
SELECT
  c.id,
  'inspection',
  'default_settings',
  '{
    "auto_create_punch": true,
    "copy_photos": true,
    "default_priority": "high",
    "default_trade": "General",
    "notify_assignee": true,
    "due_days_offset": 3
  }'::jsonb
FROM companies c
ON CONFLICT (company_id, source_type, config_key) DO NOTHING;

INSERT INTO auto_link_configurations (company_id, source_type, config_key, config_value)
SELECT
  c.id,
  'checklist',
  'default_settings',
  '{
    "auto_create_punch": true,
    "copy_photos": true,
    "default_priority": "normal",
    "default_trade": "General",
    "notify_assignee": true,
    "due_days_offset": 5
  }'::jsonb
FROM companies c
ON CONFLICT (company_id, source_type, config_key) DO NOTHING;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to create punch item from failed inspection
CREATE OR REPLACE FUNCTION create_punch_from_inspection(
  p_inspection_id UUID,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inspection RECORD;
  v_punch_id UUID;
  v_config JSONB;
  v_due_date DATE;
  v_company_id UUID;
BEGIN
  -- Get inspection details
  SELECT
    i.*,
    p.name as project_name,
    p.company_id
  INTO v_inspection
  FROM inspections i
  INNER JOIN projects p ON i.project_id = p.id
  WHERE i.id = p_inspection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inspection not found: %', p_inspection_id;
  END IF;

  v_company_id := v_inspection.company_id;

  -- Get auto-link configuration
  SELECT config_value INTO v_config
  FROM auto_link_configurations
  WHERE company_id = v_company_id
    AND source_type = 'inspection'
    AND config_key = 'default_settings'
    AND is_active = true;

  -- Use defaults if no config
  IF v_config IS NULL THEN
    v_config := '{
      "auto_create_punch": true,
      "copy_photos": true,
      "default_priority": "high",
      "default_trade": "General",
      "due_days_offset": 3
    }'::jsonb;
  END IF;

  -- Calculate due date
  v_due_date := COALESCE(
    v_inspection.reinspection_scheduled_date,
    CURRENT_DATE + ((v_config->>'due_days_offset')::INTEGER)
  );

  -- Create punch item
  INSERT INTO punch_items (
    project_id,
    title,
    description,
    trade,
    location_notes,
    status,
    priority,
    due_date,
    source_type,
    source_id,
    auto_generated,
    created_by
  )
  VALUES (
    v_inspection.project_id,
    'Inspection Failed: ' || COALESCE(v_inspection.inspection_type, 'General Inspection'),
    'Failed inspection requires remediation.' || E'\n\n' ||
    'Inspector: ' || COALESCE(v_inspection.inspector_name, 'Unknown') || E'\n' ||
    'Scheduled: ' || COALESCE(v_inspection.scheduled_date::TEXT, 'N/A') || E'\n' ||
    'Location: ' || COALESCE(v_inspection.location, 'Not specified') || E'\n\n' ||
    'Failure Reasons: ' || E'\n' || COALESCE(v_inspection.failure_reasons, 'See inspection for details') || E'\n\n' ||
    'Required Actions: ' || E'\n' || COALESCE(v_inspection.corrective_actions_required, 'Address inspection failures'),
    COALESCE(v_config->>'default_trade', 'General'),
    v_inspection.location,
    'open',
    COALESCE(v_config->>'default_priority', 'high'),
    v_due_date,
    'inspection',
    p_inspection_id,
    true,
    p_created_by
  )
  RETURNING id INTO v_punch_id;

  -- Create remediation tracking record
  INSERT INTO remediation_tracking (
    company_id,
    project_id,
    source_type,
    source_id,
    punch_item_id,
    status,
    auto_generated
  )
  VALUES (
    v_company_id,
    v_inspection.project_id,
    'inspection',
    p_inspection_id,
    v_punch_id,
    'pending',
    true
  );

  -- Copy photos if configured
  IF (v_config->>'copy_photos')::BOOLEAN = true THEN
    INSERT INTO photo_entity_links (photo_id, entity_type, entity_id, company_id, context_note)
    SELECT
      p.id,
      'punch_item',
      v_punch_id,
      v_company_id,
      'Copied from failed inspection'
    FROM photos p
    WHERE p.inspection_id = p_inspection_id
      AND p.deleted_at IS NULL;
  END IF;

  RETURN v_punch_id;
END;
$$;

-- Function to create punch item from failed checklist item
CREATE OR REPLACE FUNCTION create_punch_from_checklist_item(
  p_execution_id UUID,
  p_response_id UUID,
  p_template_item_id UUID,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_execution RECORD;
  v_response RECORD;
  v_template_item RECORD;
  v_punch_id UUID;
  v_config JSONB;
  v_escalation_config JSONB;
  v_due_date DATE;
  v_company_id UUID;
BEGIN
  -- Get execution details
  SELECT
    ce.*,
    p.company_id
  INTO v_execution
  FROM checklist_executions ce
  INNER JOIN projects p ON ce.project_id = p.id
  WHERE ce.id = p_execution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checklist execution not found: %', p_execution_id;
  END IF;

  v_company_id := v_execution.company_id;

  -- Get response details
  SELECT * INTO v_response
  FROM checklist_responses
  WHERE id = p_response_id;

  -- Get template item details
  SELECT * INTO v_template_item
  FROM checklist_template_items
  WHERE id = p_template_item_id;

  -- Get auto-link configuration
  SELECT config_value INTO v_config
  FROM auto_link_configurations
  WHERE company_id = v_company_id
    AND source_type = 'checklist'
    AND config_key = 'default_settings'
    AND is_active = true;

  -- Use defaults if no config
  IF v_config IS NULL THEN
    v_config := '{
      "auto_create_punch": true,
      "copy_photos": true,
      "default_priority": "normal",
      "default_trade": "General",
      "due_days_offset": 5
    }'::jsonb;
  END IF;

  -- Get item-specific escalation config if exists
  v_escalation_config := v_template_item.escalation_config;

  -- Calculate due date
  v_due_date := CURRENT_DATE + COALESCE(
    (v_escalation_config->>'due_days')::INTEGER,
    (v_config->>'due_days_offset')::INTEGER,
    5
  );

  -- Create punch item
  INSERT INTO punch_items (
    project_id,
    title,
    description,
    trade,
    location_notes,
    status,
    priority,
    due_date,
    source_type,
    source_id,
    auto_generated,
    created_by
  )
  VALUES (
    v_execution.project_id,
    COALESCE(v_escalation_config->>'title_prefix', 'Checklist Failed: ') || v_response.item_label,
    'Checklist item failed and requires remediation.' || E'\n\n' ||
    'Checklist: ' || v_execution.name || E'\n' ||
    'Location: ' || COALESCE(v_execution.location, 'Not specified') || E'\n' ||
    'Inspector: ' || COALESCE(v_execution.inspector_name, 'Unknown') || E'\n\n' ||
    CASE WHEN v_response.notes IS NOT NULL
      THEN 'Notes: ' || v_response.notes
      ELSE ''
    END,
    COALESCE(v_escalation_config->>'default_trade', v_config->>'default_trade', 'General'),
    v_execution.location,
    'open',
    COALESCE(v_escalation_config->>'priority', v_config->>'default_priority', 'normal'),
    v_due_date,
    'checklist',
    p_execution_id,
    true,
    p_created_by
  )
  RETURNING id INTO v_punch_id;

  -- Create remediation tracking record
  INSERT INTO remediation_tracking (
    company_id,
    project_id,
    source_type,
    source_id,
    punch_item_id,
    status,
    auto_generated,
    generated_from_item_id
  )
  VALUES (
    v_company_id,
    v_execution.project_id,
    'checklist',
    p_execution_id,
    v_punch_id,
    'pending',
    true,
    p_template_item_id::TEXT
  );

  -- Copy photos if configured and response has photos
  IF (v_config->>'copy_photos')::BOOLEAN = true AND v_response.photo_ids IS NOT NULL THEN
    INSERT INTO photo_entity_links (photo_id, entity_type, entity_id, company_id, context_note)
    SELECT
      unnest(v_response.photo_ids),
      'punch_item',
      v_punch_id,
      v_company_id,
      'Copied from failed checklist item';
  END IF;

  RETURN v_punch_id;
END;
$$;

-- Function to update remediation status when punch item status changes
CREATE OR REPLACE FUNCTION sync_remediation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update remediation tracking when punch item status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE remediation_tracking
    SET
      status = CASE NEW.status
        WHEN 'open' THEN 'pending'
        WHEN 'in_progress' THEN 'in_progress'
        WHEN 'completed' THEN 'resolved'
        WHEN 'verified' THEN 'verified'
        ELSE status
      END,
      updated_at = NOW()
    WHERE punch_item_id = NEW.id;
  END IF;

  -- Update verification info
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    UPDATE remediation_tracking
    SET
      verified_by = NEW.verified_by,
      verified_at = NOW()
    WHERE punch_item_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for remediation status sync
DROP TRIGGER IF EXISTS sync_remediation_on_punch_update ON punch_items;
CREATE TRIGGER sync_remediation_on_punch_update
  AFTER UPDATE ON punch_items
  FOR EACH ROW
  WHEN (NEW.source_type IS NOT NULL)
  EXECUTE FUNCTION sync_remediation_status();

-- Function to get remediation status for an entity
CREATE OR REPLACE FUNCTION get_remediation_status(
  p_source_type TEXT,
  p_source_id UUID
)
RETURNS TABLE (
  remediation_id UUID,
  punch_item_id UUID,
  punch_item_title TEXT,
  punch_item_status TEXT,
  remediation_status TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id as remediation_id,
    rt.punch_item_id,
    pi.title as punch_item_title,
    pi.status as punch_item_status,
    rt.status as remediation_status,
    rt.verified_by,
    rt.verified_at,
    rt.created_at
  FROM remediation_tracking rt
  LEFT JOIN punch_items pi ON rt.punch_item_id = pi.id
  WHERE rt.source_type = p_source_type
    AND rt.source_id = p_source_id
  ORDER BY rt.created_at DESC;
END;
$$;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE remediation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_link_configurations ENABLE ROW LEVEL SECURITY;

-- Remediation tracking policies
CREATE POLICY "remediation_tracking_select" ON remediation_tracking
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "remediation_tracking_insert" ON remediation_tracking
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "remediation_tracking_update" ON remediation_tracking
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Auto-link configurations policies
CREATE POLICY "auto_link_configurations_select" ON auto_link_configurations
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "auto_link_configurations_insert" ON auto_link_configurations
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "auto_link_configurations_update" ON auto_link_configurations
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN punch_items.source_type IS 'Type of entity that auto-generated this punch item (inspection, checklist, etc.)';
COMMENT ON COLUMN punch_items.source_id IS 'ID of the source entity that auto-generated this punch item';
COMMENT ON COLUMN punch_items.auto_generated IS 'Whether this punch item was auto-generated from another feature';
COMMENT ON TABLE remediation_tracking IS 'Track remediation status of issues from inspections and checklists';
COMMENT ON TABLE auto_link_configurations IS 'Configuration for auto-generation behavior by company';
COMMENT ON FUNCTION create_punch_from_inspection IS 'Auto-create a punch item from a failed inspection';
COMMENT ON FUNCTION create_punch_from_checklist_item IS 'Auto-create a punch item from a failed checklist item';
COMMENT ON FUNCTION get_remediation_status IS 'Get remediation status for an inspection or checklist';
