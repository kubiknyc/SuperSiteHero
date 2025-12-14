-- Migration: 110_checklist_auto_escalation.sql
-- Description: Add auto-escalation configuration to checklist template items
-- When a checklist item fails, automatically create a punch item or task

-- =============================================
-- ADD ESCALATION FIELDS TO checklist_template_items
-- =============================================

-- Add escalation configuration column
ALTER TABLE checklist_template_items
  ADD COLUMN IF NOT EXISTS escalate_on_fail VARCHAR(20) DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN checklist_template_items.escalate_on_fail IS
'Action to take when this item fails. Options:
- NULL or "none": No automatic escalation
- "punch_item": Auto-create a punch item
- "task": Auto-create a task
The created item inherits title from item label, location from checklist, etc.';

-- Add escalation config column for additional options
ALTER TABLE checklist_template_items
  ADD COLUMN IF NOT EXISTS escalation_config JSONB DEFAULT NULL;

COMMENT ON COLUMN checklist_template_items.escalation_config IS
'Additional configuration for auto-escalation. Structure:
{
  "priority": "normal" | "high" | "critical",
  "default_trade": "string",
  "auto_assign_to_inspector": boolean,
  "include_photos": boolean,
  "include_notes": boolean,
  "title_prefix": "string",
  "due_days": number
}';

-- =============================================
-- CREATE TABLE: checklist_escalated_items
-- =============================================
-- Track auto-created punch items and tasks from checklist failures

CREATE TABLE IF NOT EXISTS checklist_escalated_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source checklist info
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  checklist_response_id UUID NOT NULL REFERENCES checklist_responses(id) ON DELETE CASCADE,
  checklist_template_item_id UUID REFERENCES checklist_template_items(id) ON DELETE SET NULL,

  -- Escalation target
  escalated_to_type VARCHAR(20) NOT NULL, -- 'punch_item' or 'task'
  escalated_to_id UUID NOT NULL, -- ID of the created punch item or task

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checklist_escalated_items_checklist
  ON checklist_escalated_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_escalated_items_response
  ON checklist_escalated_items(checklist_response_id);
CREATE INDEX IF NOT EXISTS idx_checklist_escalated_items_target
  ON checklist_escalated_items(escalated_to_type, escalated_to_id);

-- RLS
ALTER TABLE checklist_escalated_items ENABLE ROW LEVEL SECURITY;

-- View policy
CREATE POLICY "Users can view escalated items for their projects"
  ON checklist_escalated_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM checklists c
      INNER JOIN project_users pu ON pu.project_id = c.project_id
      WHERE c.id = checklist_escalated_items.checklist_id
      AND pu.user_id = auth.uid()
    )
  );

-- Insert policy
CREATE POLICY "Users can create escalated items for their projects"
  ON checklist_escalated_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists c
      INNER JOIN project_users pu ON pu.project_id = c.project_id
      WHERE c.id = checklist_escalated_items.checklist_id
      AND pu.user_id = auth.uid()
    )
  );

-- =============================================
-- HELPER FUNCTION: Auto-escalate failed item
-- =============================================

CREATE OR REPLACE FUNCTION escalate_failed_checklist_item(
  p_checklist_id UUID,
  p_response_id UUID,
  p_template_item_id UUID,
  p_escalate_to VARCHAR(20),
  p_title TEXT,
  p_description TEXT,
  p_project_id UUID,
  p_location TEXT DEFAULT NULL,
  p_trade TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_assigned_to UUID DEFAULT NULL,
  p_photo_urls TEXT[] DEFAULT '{}',
  p_due_date DATE DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  IF p_escalate_to = 'punch_item' THEN
    -- Create punch item
    INSERT INTO punch_items (
      project_id,
      title,
      description,
      location_notes,
      trade,
      priority,
      assigned_to,
      due_date,
      status,
      created_by
    ) VALUES (
      p_project_id,
      p_title,
      p_description,
      p_location,
      COALESCE(p_trade, 'General'),
      COALESCE(p_priority, 'normal'),
      p_assigned_to,
      p_due_date,
      'open',
      p_created_by
    )
    RETURNING id INTO v_new_id;

  ELSIF p_escalate_to = 'task' THEN
    -- Create task
    INSERT INTO tasks (
      project_id,
      title,
      description,
      location,
      priority,
      assigned_to_user_id,
      assigned_to_type,
      due_date,
      status,
      related_to_type,
      related_to_id,
      created_by
    ) VALUES (
      p_project_id,
      p_title,
      p_description,
      p_location,
      COALESCE(p_priority, 'normal'),
      p_assigned_to,
      CASE WHEN p_assigned_to IS NOT NULL THEN 'user' ELSE NULL END,
      p_due_date,
      'pending',
      'checklist',
      p_checklist_id,
      p_created_by
    )
    RETURNING id INTO v_new_id;

  ELSE
    RAISE EXCEPTION 'Invalid escalation type: %', p_escalate_to;
  END IF;

  -- Record the escalation
  INSERT INTO checklist_escalated_items (
    checklist_id,
    checklist_response_id,
    checklist_template_item_id,
    escalated_to_type,
    escalated_to_id,
    created_by
  ) VALUES (
    p_checklist_id,
    p_response_id,
    p_template_item_id,
    p_escalate_to,
    v_new_id,
    p_created_by
  );

  RETURN v_new_id;
END;
$$;

-- =============================================
-- FUNCTION: Get escalation status for a checklist
-- =============================================

CREATE OR REPLACE FUNCTION get_checklist_escalation_summary(p_checklist_id UUID)
RETURNS TABLE (
  total_escalated INTEGER,
  punch_items_created INTEGER,
  tasks_created INTEGER,
  escalations JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_escalated,
    COUNT(*) FILTER (WHERE escalated_to_type = 'punch_item')::INTEGER as punch_items_created,
    COUNT(*) FILTER (WHERE escalated_to_type = 'task')::INTEGER as tasks_created,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', cei.id,
          'type', cei.escalated_to_type,
          'target_id', cei.escalated_to_id,
          'created_at', cei.created_at
        )
      ),
      '[]'::jsonb
    ) as escalations
  FROM checklist_escalated_items cei
  WHERE cei.checklist_id = p_checklist_id;
END;
$$;

-- =============================================
-- COMPLETION NOTICE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 110: Checklist Auto-Escalation';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Added escalate_on_fail column to checklist_template_items';
  RAISE NOTICE 'Added escalation_config JSONB for additional options';
  RAISE NOTICE 'Created checklist_escalated_items tracking table';
  RAISE NOTICE 'Created escalate_failed_checklist_item function';
  RAISE NOTICE '';
  RAISE NOTICE 'Template items can now be configured to auto-create:';
  RAISE NOTICE '  - Punch items when item fails';
  RAISE NOTICE '  - Tasks when item fails';
  RAISE NOTICE '==============================================';
END $$;
