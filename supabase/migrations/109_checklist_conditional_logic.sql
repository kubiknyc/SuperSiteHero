-- Migration: 109_checklist_conditional_logic.sql
-- Description: Add conditional visibility logic to checklist template items
-- This enables if/then question logic where items can show/hide based on other item responses

-- =============================================
-- ADD CONDITIONS COLUMN TO checklist_template_items
-- =============================================

-- Add the conditions column for storing conditional visibility rules
ALTER TABLE checklist_template_items
  ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT NULL;

-- Add comment explaining the column structure
COMMENT ON COLUMN checklist_template_items.conditions IS
'Conditional visibility rules for this item. Structure:
{
  "logic": "AND" | "OR",     -- How to combine multiple rules
  "action": "show" | "hide", -- Whether to show or hide when conditions match
  "rules": [
    {
      "target_item_id": "uuid",           -- ID of the item this condition depends on
      "operator": "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty",
      "value": "pass" | "fail" | "na" | string | number | boolean  -- Value to compare against
    }
  ]
}
Examples:
- Show follow-up question if previous answer is "fail": {"logic":"AND","action":"show","rules":[{"target_item_id":"abc","operator":"equals","value":"fail"}]}
- Hide item unless temperature > 100: {"logic":"AND","action":"hide","rules":[{"target_item_id":"xyz","operator":"greater_than","value":100}]}';

-- =============================================
-- CREATE INDEX FOR CONDITIONS QUERIES
-- =============================================

-- Index to help find items that have conditions
CREATE INDEX IF NOT EXISTS idx_checklist_template_items_has_conditions
  ON checklist_template_items ((conditions IS NOT NULL))
  WHERE deleted_at IS NULL;

-- =============================================
-- HELPER FUNCTION: Validate conditions structure
-- =============================================

CREATE OR REPLACE FUNCTION validate_checklist_item_conditions(conditions JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- NULL is valid (no conditions)
  IF conditions IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Must have required fields
  IF NOT (
    conditions ? 'logic' AND
    conditions ? 'action' AND
    conditions ? 'rules'
  ) THEN
    RETURN FALSE;
  END IF;

  -- logic must be AND or OR
  IF NOT (conditions->>'logic' IN ('AND', 'OR')) THEN
    RETURN FALSE;
  END IF;

  -- action must be show or hide
  IF NOT (conditions->>'action' IN ('show', 'hide')) THEN
    RETURN FALSE;
  END IF;

  -- rules must be an array
  IF jsonb_typeof(conditions->'rules') != 'array' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Add check constraint for conditions validity
ALTER TABLE checklist_template_items
  DROP CONSTRAINT IF EXISTS valid_conditions_structure;

ALTER TABLE checklist_template_items
  ADD CONSTRAINT valid_conditions_structure
  CHECK (validate_checklist_item_conditions(conditions));

-- =============================================
-- UPDATE FUNCTION: Get items with resolved conditions
-- =============================================

CREATE OR REPLACE FUNCTION get_checklist_template_items_with_conditions(
  p_template_id UUID
)
RETURNS TABLE (
  id UUID,
  checklist_template_id UUID,
  item_type VARCHAR(50),
  label VARCHAR(500),
  description TEXT,
  sort_order INTEGER,
  section VARCHAR(255),
  is_required BOOLEAN,
  config JSONB,
  conditions JSONB,
  scoring_enabled BOOLEAN,
  pass_fail_na_scoring BOOLEAN,
  requires_photo BOOLEAN,
  min_photos INTEGER,
  max_photos INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  has_conditions BOOLEAN,
  depends_on_items UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cti.id,
    cti.checklist_template_id,
    cti.item_type,
    cti.label,
    cti.description,
    cti.sort_order,
    cti.section,
    cti.is_required,
    cti.config,
    cti.conditions,
    cti.scoring_enabled,
    cti.pass_fail_na_scoring,
    cti.requires_photo,
    cti.min_photos,
    cti.max_photos,
    cti.created_at,
    cti.updated_at,
    (cti.conditions IS NOT NULL) as has_conditions,
    COALESCE(
      ARRAY(
        SELECT DISTINCT (rule->>'target_item_id')::UUID
        FROM jsonb_array_elements(cti.conditions->'rules') AS rule
        WHERE rule->>'target_item_id' IS NOT NULL
      ),
      '{}'::UUID[]
    ) as depends_on_items
  FROM checklist_template_items cti
  WHERE cti.checklist_template_id = p_template_id
    AND cti.deleted_at IS NULL
  ORDER BY cti.sort_order ASC;
END;
$$;

-- =============================================
-- SAMPLE CONDITIONAL TEMPLATES (for testing)
-- =============================================

-- Note: These are examples of how conditions work. System templates
-- with conditionals can be added using this pattern:
--
-- INSERT INTO checklist_template_items (checklist_template_id, item_type, label, sort_order, ...)
-- VALUES (
--   'template-uuid',
--   'checkbox',
--   'Is equipment functioning properly?',
--   1,
--   ...
-- );
--
-- INSERT INTO checklist_template_items (checklist_template_id, item_type, label, sort_order, conditions, ...)
-- VALUES (
--   'template-uuid',
--   'text',
--   'Describe the equipment issue',
--   2,
--   '{"logic": "AND", "action": "show", "rules": [{"target_item_id": "first-item-uuid", "operator": "equals", "value": "fail"}]}'::jsonb,
--   ...
-- );

-- =============================================
-- COMPLETION NOTICE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 109: Checklist Conditional Logic';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Added conditions JSONB column to checklist_template_items';
  RAISE NOTICE 'Created validation function for conditions structure';
  RAISE NOTICE 'Added helper function get_checklist_template_items_with_conditions';
  RAISE NOTICE '';
  RAISE NOTICE 'Conditional logic supports:';
  RAISE NOTICE '  - Show/hide items based on other item responses';
  RAISE NOTICE '  - AND/OR logic for multiple conditions';
  RAISE NOTICE '  - Operators: equals, not_equals, contains, greater_than, less_than, is_empty, is_not_empty';
  RAISE NOTICE '==============================================';
END $$;
