-- Migration: 077_agent_system.sql
-- Description: Create tables for the Construction AI Agent system
-- Date: 2025-01-08

-- =============================================
-- TABLE: agent_configuration
-- Per-company agent settings
-- =============================================
CREATE TABLE agent_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

  -- Enable/Disable
  is_enabled BOOLEAN DEFAULT TRUE,

  -- Autonomy level: how much the agent can do without asking
  autonomy_level TEXT DEFAULT 'autonomous'
    CHECK (autonomy_level IN ('disabled', 'suggest_only', 'confirm_actions', 'autonomous')),

  -- Feature toggles
  features_enabled JSONB DEFAULT '{
    "document_processing": true,
    "daily_report_summaries": true,
    "rfi_routing": true,
    "rfi_drafting": true,
    "submittal_classification": true,
    "weekly_rollups": true,
    "chat_interface": true,
    "background_tasks": true,
    "semantic_search": true
  }'::jsonb,

  -- Notification preferences
  notification_channels JSONB DEFAULT '{
    "in_app": true,
    "email": false
  }'::jsonb,

  -- Budget limits (null = unlimited)
  monthly_task_limit INTEGER,
  daily_task_limit INTEGER DEFAULT 100,

  -- Working hours (for scheduling background tasks)
  working_hours_start TIME DEFAULT '06:00',
  working_hours_end TIME DEFAULT '20:00',
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6], -- Monday=1, Sunday=7
  timezone TEXT DEFAULT 'America/New_York',

  -- Default model preference for this company
  preferred_model TEXT DEFAULT 'gpt-4o-mini',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_agent_configuration_updated_at
  BEFORE UPDATE ON agent_configuration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_configuration ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company agent config"
  ON agent_configuration FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can update their company agent config"
  ON agent_configuration FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can insert their company agent config"
  ON agent_configuration FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================
-- TABLE: agent_sessions
-- Chat conversation sessions
-- =============================================
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Session info
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended', 'archived')),
  title TEXT,

  -- Context for the conversation
  system_context JSONB DEFAULT '{}'::jsonb,
  user_preferences JSONB DEFAULT '{}'::jsonb,

  -- Current context entities (what the user is looking at)
  context_entity_type TEXT, -- 'project', 'rfi', 'document', etc.
  context_entity_id UUID,

  -- Metrics
  message_count INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_sessions_user ON agent_sessions(user_id, status);
CREATE INDEX idx_agent_sessions_project ON agent_sessions(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_agent_sessions_company ON agent_sessions(company_id);
CREATE INDEX idx_agent_sessions_last_message ON agent_sessions(last_message_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions"
  ON agent_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions"
  ON agent_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
  ON agent_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
  ON agent_sessions FOR DELETE
  USING (user_id = auth.uid());

-- =============================================
-- TABLE: agent_messages
-- Individual messages within chat sessions
-- =============================================
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,

  -- For tool calls (when role = 'assistant' with tool use)
  tool_calls JSONB, -- Array of {id, name, arguments}

  -- For tool results (when role = 'tool')
  tool_call_id TEXT,
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  tool_error TEXT,

  -- Metadata
  tokens_used INTEGER,
  latency_ms INTEGER,
  model_used TEXT,

  -- For streaming state
  is_streaming BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_messages_session ON agent_messages(session_id, created_at);
CREATE INDEX idx_agent_messages_tool ON agent_messages(tool_name) WHERE tool_name IS NOT NULL;

-- Enable RLS
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (through session ownership)
CREATE POLICY "Users can view messages in their sessions"
  ON agent_messages FOR SELECT
  USING (session_id IN (
    SELECT id FROM agent_sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in their sessions"
  ON agent_messages FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM agent_sessions WHERE user_id = auth.uid()
  ));

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE agent_messages;

-- =============================================
-- TABLE: agent_tasks
-- Background autonomous tasks
-- =============================================
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,

  -- Task definition
  task_type TEXT NOT NULL, -- 'document_process', 'rfi_route', 'report_summarize', etc.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'running', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 100, -- Lower = higher priority

  -- Task configuration
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_data JSONB,
  error_message TEXT,
  error_details JSONB,

  -- Target entity (what this task operates on)
  target_entity_type TEXT,
  target_entity_id UUID,

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Retry handling
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Metrics
  tokens_used INTEGER,
  cost_cents INTEGER,
  execution_time_ms INTEGER,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status, scheduled_for)
  WHERE status IN ('pending', 'scheduled');
CREATE INDEX idx_agent_tasks_company ON agent_tasks(company_id, created_at DESC);
CREATE INDEX idx_agent_tasks_project ON agent_tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_agent_tasks_target ON agent_tasks(target_entity_type, target_entity_id)
  WHERE target_entity_type IS NOT NULL;
CREATE INDEX idx_agent_tasks_retry ON agent_tasks(next_retry_at)
  WHERE status = 'pending' AND next_retry_at IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company tasks"
  ON agent_tasks FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create tasks for their company"
  ON agent_tasks FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their company tasks"
  ON agent_tasks FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Enable realtime for task status updates
ALTER PUBLICATION supabase_realtime ADD TABLE agent_tasks;

-- =============================================
-- TABLE: agent_actions
-- Audit trail of all agent actions
-- =============================================
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  message_id UUID REFERENCES agent_messages(id) ON DELETE SET NULL,

  -- Action details
  action_type TEXT NOT NULL, -- 'tool_call', 'entity_create', 'entity_update', etc.
  tool_name TEXT,

  -- What entity was affected
  target_entity_type TEXT,
  target_entity_id UUID,

  -- Action details
  input_summary TEXT,
  output_summary TEXT,
  changes_made JSONB, -- For updates: {field: {old, new}}

  -- Status
  status TEXT NOT NULL DEFAULT 'executed'
    CHECK (status IN ('pending', 'executed', 'failed', 'rolled_back')),
  error_message TEXT,

  -- For actions requiring user confirmation
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,

  -- Metrics
  tokens_used INTEGER,
  cost_cents INTEGER,
  execution_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_agent_actions_session ON agent_actions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_agent_actions_task ON agent_actions(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_agent_actions_target ON agent_actions(target_entity_type, target_entity_id);
CREATE INDEX idx_agent_actions_company_date ON agent_actions(company_id, created_at DESC);
CREATE INDEX idx_agent_actions_pending ON agent_actions(requires_approval, approved_at)
  WHERE requires_approval = TRUE AND approved_at IS NULL;

-- Enable RLS
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company actions"
  ON agent_actions FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "System can insert actions"
  ON agent_actions FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- =============================================
-- TABLE: agent_tool_definitions
-- Dynamic tool definitions (for custom tools)
-- =============================================
CREATE TABLE agent_tool_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = system tool

  -- Tool identity
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'document', 'report', 'rfi', 'search', 'action', etc.

  -- Tool schema (JSON Schema for parameters)
  parameters_schema JSONB NOT NULL,

  -- Execution
  handler_type TEXT NOT NULL DEFAULT 'builtin'
    CHECK (handler_type IN ('builtin', 'supabase_function', 'edge_function', 'webhook')),
  handler_config JSONB, -- Function name, URL, etc.

  -- Permissions
  requires_confirmation BOOLEAN DEFAULT FALSE,
  allowed_roles TEXT[], -- NULL = all roles

  -- Status
  is_enabled BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique tool name per company (or global)
  UNIQUE(company_id, name)
);

-- Index
CREATE INDEX idx_agent_tool_definitions_company ON agent_tool_definitions(company_id)
  WHERE company_id IS NOT NULL;
CREATE INDEX idx_agent_tool_definitions_category ON agent_tool_definitions(category);

-- Trigger for updated_at
CREATE TRIGGER update_agent_tool_definitions_updated_at
  BEFORE UPDATE ON agent_tool_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_tool_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view system and their company tools"
  ON agent_tool_definitions FOR SELECT
  USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage their company tools"
  ON agent_tool_definitions FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================
-- TABLE: agent_feedback
-- User feedback on agent responses/actions
-- =============================================
CREATE TABLE agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What is being rated
  message_id UUID REFERENCES agent_messages(id) ON DELETE SET NULL,
  action_id UUID REFERENCES agent_actions(id) ON DELETE SET NULL,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,

  -- Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_type TEXT CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'other')),
  feedback_text TEXT,

  -- For learning
  expected_output TEXT,
  tags TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_feedback_company ON agent_feedback(company_id);
CREATE INDEX idx_agent_feedback_message ON agent_feedback(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX idx_agent_feedback_rating ON agent_feedback(rating);

-- Enable RLS
ALTER TABLE agent_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create feedback"
  ON agent_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own feedback"
  ON agent_feedback FOR SELECT
  USING (user_id = auth.uid());

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update session message count and last_message_at
CREATE OR REPLACE FUNCTION update_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_sessions
  SET
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0)
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_session_on_message
  AFTER INSERT ON agent_messages
  FOR EACH ROW EXECUTE FUNCTION update_session_on_message();

-- Function to get pending tasks for processing
CREATE OR REPLACE FUNCTION get_pending_agent_tasks(
  p_company_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF agent_tasks AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM agent_tasks
  WHERE
    status IN ('pending', 'scheduled')
    AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    AND (p_company_id IS NULL OR company_id = p_company_id)
  ORDER BY priority ASC, created_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim a task for processing
CREATE OR REPLACE FUNCTION claim_agent_task(p_task_id UUID)
RETURNS agent_tasks AS $$
DECLARE
  v_task agent_tasks;
BEGIN
  UPDATE agent_tasks
  SET
    status = 'running',
    started_at = NOW(),
    updated_at = NOW()
  WHERE id = p_task_id AND status IN ('pending', 'scheduled')
  RETURNING * INTO v_task;

  RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a task
CREATE OR REPLACE FUNCTION complete_agent_task(
  p_task_id UUID,
  p_output_data JSONB DEFAULT NULL,
  p_tokens_used INTEGER DEFAULT NULL,
  p_cost_cents INTEGER DEFAULT NULL
)
RETURNS agent_tasks AS $$
DECLARE
  v_task agent_tasks;
BEGIN
  UPDATE agent_tasks
  SET
    status = 'completed',
    output_data = COALESCE(p_output_data, output_data),
    tokens_used = p_tokens_used,
    cost_cents = p_cost_cents,
    completed_at = NOW(),
    execution_time_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    updated_at = NOW()
  WHERE id = p_task_id
  RETURNING * INTO v_task;

  RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fail a task (with optional retry)
CREATE OR REPLACE FUNCTION fail_agent_task(
  p_task_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL,
  p_should_retry BOOLEAN DEFAULT TRUE
)
RETURNS agent_tasks AS $$
DECLARE
  v_task agent_tasks;
  v_new_status TEXT;
  v_next_retry TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_task FROM agent_tasks WHERE id = p_task_id;

  IF p_should_retry AND v_task.retry_count < v_task.max_retries THEN
    v_new_status := 'pending';
    -- Exponential backoff: 1min, 5min, 15min
    v_next_retry := NOW() + (POWER(5, v_task.retry_count) * INTERVAL '1 minute');
  ELSE
    v_new_status := 'failed';
    v_next_retry := NULL;
  END IF;

  UPDATE agent_tasks
  SET
    status = v_new_status,
    error_message = p_error_message,
    error_details = p_error_details,
    retry_count = retry_count + 1,
    next_retry_at = v_next_retry,
    completed_at = CASE WHEN v_new_status = 'failed' THEN NOW() ELSE NULL END,
    execution_time_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    updated_at = NOW()
  WHERE id = p_task_id
  RETURNING * INTO v_task;

  RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SEED: Default system tools
-- =============================================
INSERT INTO agent_tool_definitions (company_id, name, display_name, description, category, parameters_schema, handler_type, requires_confirmation)
VALUES
  -- Document Tools
  (NULL, 'classify_document', 'Classify Document', 'Automatically classify a document by type and extract category', 'document',
   '{"type": "object", "properties": {"document_id": {"type": "string", "description": "UUID of the document to classify"}}, "required": ["document_id"]}',
   'builtin', false),

  (NULL, 'extract_document_metadata', 'Extract Document Metadata', 'Extract structured metadata from a document', 'document',
   '{"type": "object", "properties": {"document_id": {"type": "string", "description": "UUID of the document"}, "metadata_types": {"type": "array", "items": {"type": "string"}, "description": "Types of metadata to extract"}}, "required": ["document_id"]}',
   'builtin', false),

  (NULL, 'link_document_entities', 'Link Document to Entities', 'Find and link related RFIs, submittals, and change orders', 'document',
   '{"type": "object", "properties": {"document_id": {"type": "string", "description": "UUID of the document"}}, "required": ["document_id"]}',
   'builtin', false),

  -- Report Tools
  (NULL, 'summarize_daily_report', 'Summarize Daily Report', 'Generate an AI summary of a daily report', 'report',
   '{"type": "object", "properties": {"report_id": {"type": "string", "description": "UUID of the daily report"}, "include_recommendations": {"type": "boolean", "default": true}}, "required": ["report_id"]}',
   'builtin', false),

  (NULL, 'extract_action_items', 'Extract Action Items', 'Extract action items from a report or meeting notes', 'report',
   '{"type": "object", "properties": {"source_type": {"type": "string", "enum": ["daily_report", "meeting"]}, "source_id": {"type": "string"}}, "required": ["source_type", "source_id"]}',
   'builtin', false),

  (NULL, 'generate_weekly_rollup', 'Generate Weekly Rollup', 'Generate a weekly status rollup for a project', 'report',
   '{"type": "object", "properties": {"project_id": {"type": "string"}, "week_start": {"type": "string", "format": "date"}}, "required": ["project_id"]}',
   'builtin', false),

  -- RFI/Submittal Tools
  (NULL, 'suggest_rfi_routing', 'Suggest RFI Routing', 'Get intelligent routing suggestion for an RFI', 'rfi',
   '{"type": "object", "properties": {"rfi_id": {"type": "string", "description": "UUID of the RFI"}}, "required": ["rfi_id"]}',
   'builtin', false),

  (NULL, 'draft_rfi_response', 'Draft RFI Response', 'Generate a draft response to an RFI', 'rfi',
   '{"type": "object", "properties": {"rfi_id": {"type": "string"}, "response_context": {"type": "string", "description": "Additional context for the response"}}, "required": ["rfi_id"]}',
   'builtin', true), -- Requires confirmation before sending

  (NULL, 'classify_submittal', 'Classify Submittal', 'Classify a submittal by CSI section', 'submittal',
   '{"type": "object", "properties": {"submittal_id": {"type": "string"}}, "required": ["submittal_id"]}',
   'builtin', false),

  -- Search Tools
  (NULL, 'semantic_search', 'Semantic Search', 'Search across all project data using natural language', 'search',
   '{"type": "object", "properties": {"query": {"type": "string", "description": "Natural language search query"}, "project_id": {"type": "string"}, "entity_types": {"type": "array", "items": {"type": "string"}, "description": "Types to search: rfi, submittal, document, daily_report, etc."}}, "required": ["query"]}',
   'builtin', false),

  (NULL, 'find_related_items', 'Find Related Items', 'Find items related to a specific entity', 'search',
   '{"type": "object", "properties": {"entity_type": {"type": "string"}, "entity_id": {"type": "string"}, "relationship_types": {"type": "array", "items": {"type": "string"}}}, "required": ["entity_type", "entity_id"]}',
   'builtin', false),

  -- Action Tools
  (NULL, 'create_task', 'Create Task', 'Create a new task in the project', 'action',
   '{"type": "object", "properties": {"project_id": {"type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}, "assignee_id": {"type": "string"}, "due_date": {"type": "string", "format": "date"}, "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"]}}, "required": ["project_id", "title"]}',
   'builtin', true),

  (NULL, 'send_notification', 'Send Notification', 'Send a notification to a user', 'action',
   '{"type": "object", "properties": {"user_id": {"type": "string"}, "title": {"type": "string"}, "message": {"type": "string"}, "link": {"type": "string"}}, "required": ["user_id", "title", "message"]}',
   'builtin', false);

-- =============================================
-- Add columns to existing tables for agent integration
-- =============================================

-- Add agent processing columns to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS agent_processed_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS agent_classification JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS agent_metadata JSONB;

-- Add agent columns to daily_reports
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS agent_summary TEXT;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS agent_summary_generated_at TIMESTAMPTZ;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS agent_action_items JSONB;

-- Add agent draft columns to RFIs
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS agent_draft_response TEXT;
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS agent_draft_generated_at TIMESTAMPTZ;
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS agent_routing_suggestion JSONB;

-- Add agent classification to submittals
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS agent_classification JSONB;
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS agent_processed_at TIMESTAMPTZ;

-- Add agent_generated flag to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_agent_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS agent_task_id UUID REFERENCES agent_tasks(id);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE agent_configuration IS 'Per-company configuration for the AI agent system';
COMMENT ON TABLE agent_sessions IS 'Chat conversation sessions between users and the AI agent';
COMMENT ON TABLE agent_messages IS 'Individual messages within agent chat sessions';
COMMENT ON TABLE agent_tasks IS 'Background autonomous tasks executed by the agent';
COMMENT ON TABLE agent_actions IS 'Audit trail of all actions performed by the agent';
COMMENT ON TABLE agent_tool_definitions IS 'Definitions of tools available to the agent';
COMMENT ON TABLE agent_feedback IS 'User feedback on agent responses and actions';
