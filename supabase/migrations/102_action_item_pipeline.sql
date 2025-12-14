-- Migration: Action Item Pipeline Enhancement
-- Adds cross-feature linking, improved tracking, and pipeline automation

-- ============================================================================
-- Enhance meeting_action_items table
-- ============================================================================

-- Add category column if not exists
ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
    'design', 'schedule', 'cost', 'safety', 'quality',
    'procurement', 'coordination', 'documentation', 'other'
  ));

-- Add constraint link
ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS constraint_id UUID REFERENCES look_ahead_constraints(id);

-- Add task link for bidirectional sync
ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id);

-- Add escalation tracking
ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;

ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS escalated_to UUID REFERENCES auth.users(id);

-- Add carryover count (how many meetings carried over)
ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS carryover_count INTEGER DEFAULT 0;

-- Add resolution tracking
ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS resolution_type TEXT CHECK (resolution_type IN (
    'completed', 'converted_to_task', 'converted_to_rfi',
    'resolved_by_change_order', 'deferred', 'cancelled', 'delegated'
  ));

ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE meeting_action_items
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- Add action_item_id to tasks for reverse linking
-- ============================================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_action_item_id UUID REFERENCES meeting_action_items(id);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_meeting_id UUID REFERENCES meetings(id);

-- ============================================================================
-- Indexes for efficient querying
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_action_items_status
  ON meeting_action_items(status) WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_action_items_due_date
  ON meeting_action_items(due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_action_items_assigned
  ON meeting_action_items(assigned_to);

CREATE INDEX IF NOT EXISTS idx_action_items_category
  ON meeting_action_items(category) WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_action_items_escalation
  ON meeting_action_items(escalation_level) WHERE escalation_level > 0;

CREATE INDEX IF NOT EXISTS idx_tasks_source_action_item
  ON tasks(source_action_item_id) WHERE source_action_item_id IS NOT NULL;

-- ============================================================================
-- Views for cross-meeting action item queries
-- ============================================================================

-- View: All action items with meeting context
CREATE OR REPLACE VIEW action_items_with_context AS
SELECT
  ai.id,
  ai.meeting_id,
  ai.project_id,
  ai.title,
  ai.description,
  ai.assigned_to,
  ai.assigned_company,
  ai.due_date,
  ai.status,
  ai.priority,
  ai.category,
  ai.escalation_level,
  ai.carryover_count,
  ai.resolution_type,
  ai.resolved_at,
  ai.created_at,
  ai.updated_at,
  -- Meeting context
  m.meeting_type,
  m.meeting_date,
  m.meeting_number,
  m.title as meeting_title,
  -- Related entities
  ai.task_id,
  ai.related_rfi_id,
  ai.constraint_id,
  ai.related_change_order_id,
  -- Computed fields
  CASE
    WHEN ai.status = 'completed' THEN 'completed'
    WHEN ai.due_date IS NULL THEN 'no_date'
    WHEN ai.due_date < CURRENT_DATE THEN 'overdue'
    WHEN ai.due_date = CURRENT_DATE THEN 'due_today'
    WHEN ai.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
    ELSE 'on_track'
  END as urgency_status,
  CASE
    WHEN ai.due_date IS NOT NULL THEN ai.due_date - CURRENT_DATE
    ELSE NULL
  END as days_until_due
FROM meeting_action_items ai
JOIN meetings m ON m.id = ai.meeting_id;

-- Grant access
GRANT SELECT ON action_items_with_context TO authenticated;

-- View: Action item summary by project
CREATE OR REPLACE VIEW action_item_summary_by_project AS
SELECT
  project_id,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE status = 'open') as open_items,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_items,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_items,
  COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue_items,
  COUNT(*) FILTER (WHERE escalation_level > 0 AND status != 'completed') as escalated_items,
  COUNT(*) FILTER (WHERE carryover_count > 2 AND status != 'completed') as chronic_items,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0),
    1
  ) as completion_rate
FROM meeting_action_items
GROUP BY project_id;

-- Grant access
GRANT SELECT ON action_item_summary_by_project TO authenticated;

-- View: Action items by assignee
CREATE OR REPLACE VIEW action_items_by_assignee AS
SELECT
  project_id,
  COALESCE(assigned_to, 'Unassigned') as assignee,
  assigned_company,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE status != 'completed') as open_items,
  COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue_items,
  MIN(due_date) FILTER (WHERE status != 'completed') as nearest_due_date
FROM meeting_action_items
GROUP BY project_id, assigned_to, assigned_company;

-- Grant access
GRANT SELECT ON action_items_by_assignee TO authenticated;

-- ============================================================================
-- Functions for action item pipeline
-- ============================================================================

-- Function: Convert action item to task
CREATE OR REPLACE FUNCTION convert_action_item_to_task(
  p_action_item_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_action_item meeting_action_items%ROWTYPE;
  v_task_id UUID;
BEGIN
  -- Get action item
  SELECT * INTO v_action_item
  FROM meeting_action_items
  WHERE id = p_action_item_id;

  IF v_action_item IS NULL THEN
    RAISE EXCEPTION 'Action item not found';
  END IF;

  -- Check if already converted
  IF v_action_item.task_id IS NOT NULL THEN
    RETURN v_action_item.task_id;
  END IF;

  -- Create task
  INSERT INTO tasks (
    project_id,
    title,
    description,
    due_date,
    status,
    priority,
    source_action_item_id,
    source_meeting_id,
    created_by
  ) VALUES (
    v_action_item.project_id,
    v_action_item.title,
    v_action_item.description,
    v_action_item.due_date,
    'pending',
    COALESCE(v_action_item.priority, 'normal'),
    p_action_item_id,
    v_action_item.meeting_id,
    p_created_by
  )
  RETURNING id INTO v_task_id;

  -- Update action item with task reference
  UPDATE meeting_action_items
  SET
    task_id = v_task_id,
    resolution_type = 'converted_to_task',
    updated_at = now()
  WHERE id = p_action_item_id;

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Carry over action items to new meeting
CREATE OR REPLACE FUNCTION carryover_action_items(
  p_source_meeting_id UUID,
  p_target_meeting_id UUID,
  p_action_item_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_carried_count INTEGER := 0;
  v_item RECORD;
BEGIN
  -- Get items to carry over (either specified or all open items)
  FOR v_item IN
    SELECT *
    FROM meeting_action_items
    WHERE meeting_id = p_source_meeting_id
      AND status IN ('open', 'in_progress')
      AND (p_action_item_ids IS NULL OR id = ANY(p_action_item_ids))
  LOOP
    -- Create copy in target meeting
    INSERT INTO meeting_action_items (
      meeting_id,
      project_id,
      title,
      description,
      assigned_to,
      assigned_company,
      due_date,
      status,
      priority,
      category,
      carried_from_meeting_id,
      carryover_count,
      task_id,
      related_rfi_id,
      constraint_id,
      related_change_order_id
    ) VALUES (
      p_target_meeting_id,
      v_item.project_id,
      v_item.title,
      v_item.description,
      v_item.assigned_to,
      v_item.assigned_company,
      v_item.due_date,
      v_item.status,
      v_item.priority,
      v_item.category,
      p_source_meeting_id,
      v_item.carryover_count + 1,
      v_item.task_id,
      v_item.related_rfi_id,
      v_item.constraint_id,
      v_item.related_change_order_id
    );

    -- Mark original as carried forward
    UPDATE meeting_action_items
    SET
      carried_to_meeting_id = p_target_meeting_id,
      status = 'deferred',
      updated_at = now()
    WHERE id = v_item.id;

    v_carried_count := v_carried_count + 1;
  END LOOP;

  RETURN v_carried_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Sync task status back to action item
CREATE OR REPLACE FUNCTION sync_task_status_to_action_item()
RETURNS TRIGGER AS $$
BEGIN
  -- When task status changes, update linked action item
  IF NEW.source_action_item_id IS NOT NULL THEN
    IF NEW.status = 'completed' THEN
      UPDATE meeting_action_items
      SET
        status = 'completed',
        resolution_type = COALESCE(resolution_type, 'completed'),
        resolved_at = COALESCE(resolved_at, now()),
        updated_at = now()
      WHERE id = NEW.source_action_item_id
        AND status != 'completed';
    ELSIF NEW.status = 'in_progress' THEN
      UPDATE meeting_action_items
      SET
        status = 'in_progress',
        updated_at = now()
      WHERE id = NEW.source_action_item_id
        AND status = 'open';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task -> action item sync
DROP TRIGGER IF EXISTS sync_task_to_action_item ON tasks;
CREATE TRIGGER sync_task_to_action_item
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_status_to_action_item();

-- Function: Auto-escalate overdue action items
CREATE OR REPLACE FUNCTION escalate_overdue_action_items(p_project_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_escalated_count INTEGER := 0;
BEGIN
  -- Escalate items that are overdue by more than threshold days
  UPDATE meeting_action_items
  SET
    escalation_level = escalation_level + 1,
    escalated_at = now(),
    updated_at = now()
  WHERE status IN ('open', 'in_progress')
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE
    AND (p_project_id IS NULL OR project_id = p_project_id)
    AND (
      (escalation_level = 0 AND due_date < CURRENT_DATE - INTERVAL '3 days')
      OR (escalation_level = 1 AND due_date < CURRENT_DATE - INTERVAL '7 days')
      OR (escalation_level = 2 AND due_date < CURRENT_DATE - INTERVAL '14 days')
    );

  GET DIAGNOSTICS v_escalated_count = ROW_COUNT;
  RETURN v_escalated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN meeting_action_items.category IS 'Category for filtering and reporting';
COMMENT ON COLUMN meeting_action_items.escalation_level IS 'Auto-escalation level (0-3) based on overdue duration';
COMMENT ON COLUMN meeting_action_items.carryover_count IS 'Number of times this item has been carried to next meeting';
COMMENT ON COLUMN meeting_action_items.resolution_type IS 'How the action item was resolved';
COMMENT ON COLUMN tasks.source_action_item_id IS 'Action item this task was created from';
COMMENT ON VIEW action_items_with_context IS 'Action items joined with meeting context and urgency calculations';
