/**
 * Message Templates
 *
 * Migration: 140
 * Created: 2025-12-16
 * Purpose: Add reusable message templates for common communications
 *
 * Features:
 * - Company-wide and personal message templates
 * - Template categories for organization
 * - Variable substitution support
 * - Usage tracking
 * - Full-text search on template content
 */

-- =====================================================
-- SECTION 1: CREATE MESSAGE TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Template content
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,

  -- Template settings
  is_shared BOOLEAN NOT NULL DEFAULT false,
  variables JSONB DEFAULT '[]'::jsonb,

  -- Usage tracking
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT template_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT template_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT template_variables_is_array CHECK (
    variables IS NULL OR jsonb_typeof(variables) = 'array'
  ),
  CONSTRAINT template_usage_count_positive CHECK (usage_count >= 0)
);

-- =====================================================
-- SECTION 2: CREATE INDEXES
-- =====================================================

-- Index for company-wide lookups
CREATE INDEX IF NOT EXISTS idx_message_templates_company
  ON message_templates(company_id, is_shared, category)
  WHERE is_shared = true;

-- Index for user's personal templates
CREATE INDEX IF NOT EXISTS idx_message_templates_user
  ON message_templates(created_by, category)
  WHERE is_shared = false;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_message_templates_category
  ON message_templates(company_id, category)
  WHERE category IS NOT NULL;

-- Index for most used templates
CREATE INDEX IF NOT EXISTS idx_message_templates_usage
  ON message_templates(company_id, usage_count DESC, last_used_at DESC)
  WHERE is_shared = true;

-- Full-text search index for template names and content
CREATE INDEX IF NOT EXISTS idx_message_templates_search
  ON message_templates
  USING GIN(to_tsvector('english', name || ' ' || content));

-- =====================================================
-- SECTION 3: CREATE FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_message_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_message_template_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_message_template_updated_at();

-- Function to increment template usage
-- Drop old version if exists (to handle parameter name changes)
DROP FUNCTION IF EXISTS increment_template_usage(UUID);

CREATE OR REPLACE FUNCTION increment_template_usage(
  p_template_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE message_templates
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_template_usage IS
  'Increment usage count and update last_used_at for a message template';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_template_usage TO authenticated;

-- Function to search templates
CREATE OR REPLACE FUNCTION search_message_templates(
  p_user_id UUID,
  p_company_id UUID,
  p_search_query TEXT,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  content TEXT,
  category TEXT,
  is_shared BOOLEAN,
  usage_count INTEGER,
  last_used_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ,
  relevance_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mt.id,
    mt.name,
    mt.content,
    mt.category,
    mt.is_shared,
    mt.usage_count,
    mt.last_used_at,
    mt.created_by,
    mt.created_at,
    -- Relevance score based on text search
    ts_rank(
      to_tsvector('english', mt.name || ' ' || mt.content),
      plainto_tsquery('english', p_search_query)
    ) AS relevance_score
  FROM message_templates mt
  WHERE
    mt.company_id = p_company_id
    AND (
      -- User can see shared templates or their own templates
      mt.is_shared = true
      OR mt.created_by = p_user_id
    )
    -- Filter by category if specified
    AND (p_category IS NULL OR mt.category = p_category)
    -- Text search
    AND (
      p_search_query IS NULL
      OR to_tsvector('english', mt.name || ' ' || mt.content) @@ plainto_tsquery('english', p_search_query)
    )
  ORDER BY relevance_score DESC, mt.usage_count DESC, mt.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION search_message_templates IS
  'Search message templates with relevance scoring and access control';

GRANT EXECUTE ON FUNCTION search_message_templates TO authenticated;

-- =====================================================
-- SECTION 4: ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shared templates in their company
CREATE POLICY "Users can view shared templates in their company"
  ON message_templates FOR SELECT
  USING (
    is_shared = true
    AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can view their own templates
CREATE POLICY "Users can view their own templates"
  ON message_templates FOR SELECT
  USING (created_by = auth.uid());

-- Policy: Users can create templates in their company
CREATE POLICY "Users can create templates"
  ON message_templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update their own templates
CREATE POLICY "Users can update their own templates"
  ON message_templates FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
  ON message_templates FOR DELETE
  USING (created_by = auth.uid());

-- =====================================================
-- SECTION 5: SEED DEFAULT TEMPLATES
-- =====================================================

-- Function to seed default message templates for a company
CREATE OR REPLACE FUNCTION seed_default_message_templates(
  p_company_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Only insert if no templates exist for this company yet
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE company_id = p_company_id) THEN

    -- Safety templates
    INSERT INTO message_templates (company_id, created_by, name, content, category, is_shared, variables) VALUES
    (p_company_id, p_user_id, 'Daily Safety Briefing',
     'Good morning team! Today''s safety focus: {topic}. Remember: {reminder}. Let''s have a safe and productive day!',
     'Safety', true, '["topic", "reminder"]'::jsonb),

    (p_company_id, p_user_id, 'Safety Concern Report',
     'Safety concern identified: {concern}. Location: {location}. Immediate action required: {action}.',
     'Safety', true, '["concern", "location", "action"]'::jsonb),

    -- Progress updates
    (p_company_id, p_user_id, 'Daily Progress Update',
     'Today''s progress on {project_name}: {summary}. Current status: {status}. Next steps: {next_steps}.',
     'Progress', true, '["project_name", "summary", "status", "next_steps"]'::jsonb),

    (p_company_id, p_user_id, 'Milestone Achieved',
     'Great news! We''ve completed {milestone} on {project_name}. This puts us {status} schedule. Next milestone: {next_milestone}.',
     'Progress', true, '["milestone", "project_name", "status", "next_milestone"]'::jsonb),

    -- Issues and delays
    (p_company_id, p_user_id, 'Schedule Delay Notice',
     'Delay notification for {task}: Expected completion now {new_date} (was {old_date}). Reason: {reason}. Impact: {impact}.',
     'Issues', true, '["task", "new_date", "old_date", "reason", "impact"]'::jsonb),

    (p_company_id, p_user_id, 'Issue Escalation',
     'Issue requiring attention: {issue}. Impact: {impact}. Recommendation: {recommendation}. Please advise.',
     'Issues', true, '["issue", "impact", "recommendation"]'::jsonb),

    -- Coordination
    (p_company_id, p_user_id, 'Trade Coordination',
     '{trade_1} and {trade_2} need to coordinate on {area}. Timeline: {timeline}. Contact: {contact}.',
     'Coordination', true, '["trade_1", "trade_2", "area", "timeline", "contact"]'::jsonb),

    (p_company_id, p_user_id, 'Material Delivery Notice',
     '{material} delivery scheduled for {date} at {time}. Delivery location: {location}. Please ensure access is clear.',
     'Coordination', true, '["material", "date", "time", "location"]'::jsonb),

    -- Quality
    (p_company_id, p_user_id, 'Inspection Request',
     'Requesting inspection for {scope} in {location}. Completion date: {date}. Inspector: {inspector}.',
     'Quality', true, '["scope", "location", "date", "inspector"]'::jsonb),

    (p_company_id, p_user_id, 'Punch List Item',
     'Punch list item: {description}. Location: {location}. Responsible: {responsible}. Due: {due_date}.',
     'Quality', true, '["description", "location", "responsible", "due_date"]'::jsonb);

  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION seed_default_message_templates IS
  'Seed default message templates for a new company';

GRANT EXECUTE ON FUNCTION seed_default_message_templates TO authenticated;

-- =====================================================
-- SECTION 6: COMMENTS
-- =====================================================

COMMENT ON TABLE message_templates IS
  'Reusable message templates with variable substitution support. Templates can be shared company-wide or kept private. Includes usage tracking and full-text search.';

COMMENT ON COLUMN message_templates.name IS 'Template name for identification';
COMMENT ON COLUMN message_templates.content IS 'Template message content with optional {variable} placeholders';
COMMENT ON COLUMN message_templates.category IS 'Template category (Safety, Progress, Issues, Coordination, Quality, etc.)';
COMMENT ON COLUMN message_templates.is_shared IS 'Whether template is shared across company (true) or private to user (false)';
COMMENT ON COLUMN message_templates.variables IS 'Array of variable names used in template content';
COMMENT ON COLUMN message_templates.usage_count IS 'Number of times template has been used';
COMMENT ON COLUMN message_templates.last_used_at IS 'Timestamp of last template usage';

-- =====================================================
-- SECTION 7: SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 140_message_templates completed successfully';
  RAISE NOTICE 'Message templates feature is now available';
  RAISE NOTICE 'Users can create, share, and reuse message templates with variable substitution';
END $$;
