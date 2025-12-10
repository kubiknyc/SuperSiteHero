-- ============================================================================
-- Migration: 094_ai_agents_foundation.sql
-- Description: Foundation tables for AI-powered features
-- Features: RFI Auto-Routing, Smart Summaries, Risk Prediction, Schedule Optimization
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- AI Provider types (provider-agnostic)
DO $$ BEGIN
  CREATE TYPE ai_provider_type AS ENUM (
    'openai',           -- OpenAI GPT models
    'anthropic',        -- Anthropic Claude models
    'local',            -- Local models (Ollama, etc.)
    'azure_openai'      -- Azure OpenAI Service
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Suggestion feedback status
DO $$ BEGIN
  CREATE TYPE suggestion_feedback_status AS ENUM (
    'pending',          -- Not yet reviewed
    'accepted',         -- User accepted suggestion
    'rejected',         -- User rejected suggestion
    'modified'          -- User modified before accepting
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Summary type
DO $$ BEGIN
  CREATE TYPE ai_summary_type AS ENUM (
    'daily_report',           -- Daily report executive summary
    'meeting_action_items',   -- Meeting minutes action item extraction
    'change_order_impact',    -- CO impact analysis
    'weekly_status',          -- Weekly project status aggregation
    'rfi_summary',            -- RFI question/response summary
    'submittal_summary'       -- Submittal package summary
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Risk alert type
DO $$ BEGIN
  CREATE TYPE risk_alert_type AS ENUM (
    'activity_high_risk',        -- Activity slip probability > 70%
    'critical_path_threat',      -- At-risk activity on critical path
    'constraint_overdue',        -- Constraint past expected resolution
    'weather_impact_forecast',   -- Adverse weather predicted
    'resource_conflict',         -- Resource over-allocation detected
    'ppc_declining',             -- PPC trending down
    'cost_overrun_likely',       -- Budget overrun probability > threshold
    'schedule_delay_likely'      -- Schedule delay probability > threshold
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Schedule optimization recommendation type
DO $$ BEGIN
  CREATE TYPE schedule_recommendation_type AS ENUM (
    'resequence_task',      -- Suggest moving a task
    'add_float',            -- Identify float opportunity
    'resource_level',       -- Resource leveling suggestion
    'constraint_priority',  -- Prioritize constraint resolution
    'critical_path_reduce', -- Reduce critical path
    'parallel_execution'    -- Execute tasks in parallel
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- AI CONFIGURATION
-- ============================================================================

-- AI Configuration per company
CREATE TABLE IF NOT EXISTS ai_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Provider Settings
  default_provider ai_provider_type DEFAULT 'openai',
  openai_model VARCHAR(50) DEFAULT 'gpt-4o-mini',
  anthropic_model VARCHAR(50) DEFAULT 'claude-3-haiku-20240307',

  -- API Keys (encrypted at rest via Supabase Vault)
  openai_api_key_id UUID,  -- Reference to vault secret
  anthropic_api_key_id UUID,  -- Reference to vault secret

  -- Feature Toggles
  enable_rfi_routing BOOLEAN DEFAULT TRUE,
  enable_smart_summaries BOOLEAN DEFAULT TRUE,
  enable_action_item_extraction BOOLEAN DEFAULT TRUE,
  enable_risk_prediction BOOLEAN DEFAULT TRUE,
  enable_schedule_optimization BOOLEAN DEFAULT TRUE,
  enable_document_enhancement BOOLEAN DEFAULT TRUE,

  -- Cost Controls
  monthly_budget_cents INTEGER DEFAULT 10000, -- $100 default
  current_month_usage_cents INTEGER DEFAULT 0,
  last_usage_reset TIMESTAMPTZ DEFAULT NOW(),
  alert_threshold_percent INTEGER DEFAULT 80, -- Alert when 80% of budget used

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id)
);

-- ============================================================================
-- AI USAGE TRACKING
-- ============================================================================

-- AI Usage Tracking (for cost management)
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Request info
  feature VARCHAR(50) NOT NULL,  -- 'rfi_routing', 'summary', 'risk', etc.
  ai_provider ai_provider_type NOT NULL,
  ai_model VARCHAR(100) NOT NULL,

  -- Tokens
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,

  -- Cost (in cents, calculated based on model)
  estimated_cost_cents DECIMAL(10,4),

  -- Context
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_type VARCHAR(50),  -- 'rfi', 'daily_report', 'meeting', etc.
  source_id UUID,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RFI AUTO-ROUTING
-- ============================================================================

-- RFI Routing Suggestions
CREATE TABLE IF NOT EXISTS rfi_routing_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES rfis(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Suggested Ball-in-Court
  suggested_role VARCHAR(50),  -- 'architect', 'engineer', etc.
  suggested_role_confidence DECIMAL(5,2),  -- 0-100
  role_reasoning TEXT,

  -- Suggested Assignee (specific user)
  suggested_assignee_id UUID REFERENCES auth.users(id),
  suggested_assignee_confidence DECIMAL(5,2),
  assignee_reasoning TEXT,

  -- CSI Division Classification
  suggested_csi_division VARCHAR(10),  -- e.g., "03", "09"
  suggested_csi_section VARCHAR(20),   -- e.g., "03 30 00"
  csi_confidence DECIMAL(5,2),

  -- Discipline Classification
  suggested_discipline VARCHAR(100),
  discipline_confidence DECIMAL(5,2),

  -- Related Items
  related_rfi_ids UUID[],
  related_submittal_ids UUID[],
  related_document_ids UUID[],

  -- Keywords extracted
  extracted_keywords TEXT[],

  -- AI Processing Info
  ai_provider ai_provider_type,
  ai_model VARCHAR(100),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  processing_time_ms INTEGER,

  -- User Feedback
  feedback suggestion_feedback_status DEFAULT 'pending',
  feedback_at TIMESTAMPTZ,
  feedback_by UUID REFERENCES auth.users(id),
  feedback_notes TEXT,

  -- What was actually selected (for learning)
  actual_role VARCHAR(50),
  actual_assignee_id UUID REFERENCES auth.users(id),
  actual_csi_section VARCHAR(20),
  actual_discipline VARCHAR(100),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(rfi_id)
);

-- RFI Routing Learning Data (aggregated patterns)
CREATE TABLE IF NOT EXISTS rfi_routing_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,  -- NULL = company-wide

  -- Pattern matching
  keyword_pattern TEXT NOT NULL,
  csi_section_pattern VARCHAR(20),
  discipline_pattern VARCHAR(100),

  -- Learned outcome
  learned_role VARCHAR(50),
  learned_assignee_id UUID REFERENCES auth.users(id),

  -- Statistics
  occurrence_count INTEGER DEFAULT 1,
  success_rate DECIMAL(5,2),  -- How often accepted
  last_occurrence TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SMART SUMMARIES
-- ============================================================================

-- Smart Summaries Storage
CREATE TABLE IF NOT EXISTS ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Source reference (polymorphic)
  summary_type ai_summary_type NOT NULL,
  source_id UUID NOT NULL,  -- ID of source record
  source_ids UUID[],  -- For aggregated summaries (weekly)

  -- Date range (for aggregated summaries)
  date_from DATE,
  date_to DATE,

  -- Generated Content
  summary_text TEXT NOT NULL,
  key_points JSONB,  -- Array of key points
  action_items JSONB,  -- Extracted action items
  metrics JSONB,  -- Extracted metrics/numbers

  -- AI Processing Info
  ai_provider ai_provider_type,
  ai_model VARCHAR(100),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  processing_time_ms INTEGER,

  -- Caching
  cache_key VARCHAR(255),  -- For deduplication
  expires_at TIMESTAMPTZ,

  -- Version control
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Action Items extracted from meetings (linked to meeting_action_items)
CREATE TABLE IF NOT EXISTS ai_extracted_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Extracted content
  description TEXT NOT NULL,
  suggested_assignee_name VARCHAR(255),
  suggested_assignee_id UUID REFERENCES auth.users(id),
  suggested_due_date DATE,
  suggested_priority VARCHAR(20),

  -- Source text reference
  source_text TEXT,
  source_position INTEGER,  -- Position in notes

  -- Confidence
  confidence_score DECIMAL(5,2),

  -- Linking to actual action item (if created)
  linked_action_item_id UUID REFERENCES meeting_action_items(id) ON DELETE SET NULL,

  -- User feedback
  feedback suggestion_feedback_status DEFAULT 'pending',
  feedback_at TIMESTAMPTZ,
  feedback_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RISK PREDICTION
-- ============================================================================

-- Activity-level risk predictions (extends look-ahead activities)
CREATE TABLE IF NOT EXISTS activity_risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES look_ahead_activities(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version VARCHAR(50) NOT NULL DEFAULT 'heuristic-v1',

  -- Risk Scores (0-100)
  slip_probability DECIMAL(5,4) CHECK (slip_probability BETWEEN 0 AND 1),
  slip_risk_score INTEGER CHECK (slip_risk_score BETWEEN 0 AND 100),

  -- Estimated Impact
  projected_delay_days_low INTEGER,
  projected_delay_days_mid INTEGER,
  projected_delay_days_high INTEGER,

  -- Contributing Factors (JSON array)
  risk_factors JSONB DEFAULT '[]',
  -- Example: [{"factor": "open_rfi", "impact": 35, "entity_id": "...", "description": "..."}]

  -- Component Scores
  constraint_score INTEGER,  -- Score based on open constraints
  historical_ppc_score INTEGER,  -- Score based on trade/activity type PPC history
  weather_impact_score INTEGER,  -- Score based on weather forecast
  resource_availability_score INTEGER,  -- Score based on crew allocation

  -- Confidence
  confidence_score DECIMAL(5,4),

  -- Flags
  is_at_risk BOOLEAN DEFAULT FALSE,
  requires_attention BOOLEAN DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_latest BOOLEAN DEFAULT TRUE
);

-- Risk Alerts
CREATE TABLE IF NOT EXISTS risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Alert Details
  alert_type risk_alert_type NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'critical')),

  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,

  -- Related entities
  related_entity_type VARCHAR(50),  -- 'activity', 'constraint', 'task', 'resource'
  related_entity_id UUID,

  -- Thresholds
  threshold_value DECIMAL(10,2),
  actual_value DECIMAL(10,2),

  -- Actions
  suggested_actions JSONB,
  action_url TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================================================
-- SCHEDULE OPTIMIZATION
-- ============================================================================

-- Schedule optimization recommendations
CREATE TABLE IF NOT EXISTS schedule_optimization_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Recommendation Type
  recommendation_type schedule_recommendation_type NOT NULL,

  -- Affected Entities
  primary_task_id UUID REFERENCES schedule_items(id) ON DELETE SET NULL,
  secondary_task_id UUID REFERENCES schedule_items(id) ON DELETE SET NULL,
  affected_activity_ids UUID[],

  -- Impact Analysis
  schedule_impact_days INTEGER,  -- Positive = saves days, Negative = adds days
  cost_impact DECIMAL(15,2),
  risk_reduction INTEGER,  -- Risk score reduction (0-100)

  -- Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  implementation_steps JSONB,  -- Array of step objects
  prerequisites JSONB,  -- What needs to happen first

  -- Constraints involved
  affected_constraints JSONB,  -- IDs of constraints that would be impacted

  -- Priority and Status
  priority VARCHAR(20) CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'rejected', 'implemented', 'expired'
  )),

  -- Implementation tracking
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  implemented_at TIMESTAMPTZ,
  implemented_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Critical path analysis cache
CREATE TABLE IF NOT EXISTS critical_path_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Summary
  total_critical_path_days INTEGER,
  total_float_days INTEGER,
  float_utilization_percent DECIMAL(5,2),

  -- Critical Path Details (JSON)
  critical_path_items JSONB NOT NULL,  -- Array of task IDs in order
  near_critical_items JSONB,  -- Tasks with < 5 days float

  -- Float Opportunities
  float_opportunities JSONB,  -- [{task_id, available_float, suggested_use}]

  -- Bottleneck Analysis
  bottleneck_tasks JSONB,  -- Tasks with most successors on critical path

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Stored date for unique constraint (UTC date portion)
  analysis_date_day DATE GENERATED ALWAYS AS ((analysis_date AT TIME ZONE 'UTC')::DATE) STORED
);

-- Create unique index for one analysis per project per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_critical_path_unique_day
  ON critical_path_analysis(project_id, analysis_date_day);

-- Constraint resolution impact tracking
CREATE TABLE IF NOT EXISTS constraint_schedule_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_id UUID NOT NULL REFERENCES look_ahead_constraints(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Impact Analysis
  direct_impact_days INTEGER,  -- Days delayed if not resolved
  cascade_impact_days INTEGER,  -- Additional days from successor delays
  total_impact_days INTEGER GENERATED ALWAYS AS (
    COALESCE(direct_impact_days, 0) + COALESCE(cascade_impact_days, 0)
  ) STORED,

  -- Affected Tasks
  directly_blocked_tasks UUID[],
  cascade_affected_tasks UUID[],

  -- Critical Path Impact
  affects_critical_path BOOLEAN DEFAULT FALSE,
  critical_path_impact_days INTEGER,

  -- Resolution Priority Score (calculated)
  priority_score INTEGER,  -- Higher = more urgent to resolve

  -- Suggested Resolution Date
  required_resolution_date DATE,

  -- Audit
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(constraint_id)
);

-- ============================================================================
-- DOCUMENT AI ENHANCEMENT
-- ============================================================================

-- LLM Processing Results (enhanced document classification)
CREATE TABLE IF NOT EXISTS document_llm_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- LLM Classification
  llm_category VARCHAR(50),
  llm_sub_category VARCHAR(100),
  llm_confidence DECIMAL(5,2),
  llm_reasoning TEXT,

  -- CSI Section Detection
  detected_csi_section VARCHAR(20),
  csi_confidence DECIMAL(5,2),
  csi_title VARCHAR(255),

  -- Content Understanding
  document_summary TEXT,
  key_decisions JSONB,
  action_items JSONB,

  -- Processing Info
  ai_provider ai_provider_type,
  ai_model VARCHAR(50),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  processing_time_ms INTEGER,
  processing_cost_cents DECIMAL(10,4),
  processed_at TIMESTAMPTZ,

  -- Error Handling
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id)
);

-- Document Entity Links (auto-linking)
CREATE TABLE IF NOT EXISTS document_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Linked Entity
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
    'rfi', 'submittal', 'change_order', 'drawing', 'specification',
    'meeting_minutes', 'daily_report', 'safety_incident'
  )),
  entity_id UUID NOT NULL,

  -- Link Details
  link_type VARCHAR(50) NOT NULL CHECK (link_type IN (
    'response_to', 'attachment_for', 'references', 'supersedes',
    'related_to', 'generated_from', 'source_document'
  )),

  -- Confidence & Source
  confidence_score DECIMAL(5,2),
  is_auto_linked BOOLEAN DEFAULT TRUE,
  linking_method VARCHAR(50),  -- 'llm', 'csi_match', 'keyword', 'reference_extraction', 'manual'

  -- Verification
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id, entity_type, entity_id)
);

-- AI Feedback for continuous improvement
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Feedback Target
  feature VARCHAR(50) NOT NULL,  -- 'rfi_routing', 'document_category', 'summary', etc.
  source_type VARCHAR(50),
  source_id UUID,

  -- Feedback Type
  feedback_type VARCHAR(50) CHECK (feedback_type IN (
    'category_correction', 'metadata_correction', 'link_correction',
    'summary_feedback', 'routing_correction', 'action_item_correction'
  )),

  -- Original vs Corrected
  original_value JSONB,
  corrected_value JSONB,

  -- Context
  reason TEXT,

  -- User
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Processing Status
  processed_for_training BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- AI Configuration
CREATE INDEX IF NOT EXISTS idx_ai_config_company ON ai_configuration(company_id);

-- AI Usage Log
CREATE INDEX IF NOT EXISTS idx_usage_log_company ON ai_usage_log(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_created ON ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_feature ON ai_usage_log(feature);
-- Composite index for monthly queries (queries will filter on date range instead of date_trunc)
CREATE INDEX IF NOT EXISTS idx_usage_log_company_date ON ai_usage_log(company_id, created_at);

-- RFI Routing
CREATE INDEX IF NOT EXISTS idx_rfi_suggestions_rfi_id ON rfi_routing_suggestions(rfi_id);
CREATE INDEX IF NOT EXISTS idx_rfi_suggestions_project ON rfi_routing_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_rfi_suggestions_feedback ON rfi_routing_suggestions(feedback);
CREATE INDEX IF NOT EXISTS idx_routing_patterns_company ON rfi_routing_patterns(company_id);
CREATE INDEX IF NOT EXISTS idx_routing_patterns_keywords ON rfi_routing_patterns USING GIN(to_tsvector('english', keyword_pattern));

-- Smart Summaries
CREATE INDEX IF NOT EXISTS idx_summaries_project ON ai_summaries(project_id);
CREATE INDEX IF NOT EXISTS idx_summaries_type_source ON ai_summaries(summary_type, source_id);
CREATE INDEX IF NOT EXISTS idx_summaries_cache ON ai_summaries(cache_key);
CREATE INDEX IF NOT EXISTS idx_summaries_latest ON ai_summaries(summary_type, source_id) WHERE is_latest = TRUE;
CREATE INDEX IF NOT EXISTS idx_extracted_actions_meeting ON ai_extracted_action_items(meeting_id);

-- Risk Prediction
CREATE INDEX IF NOT EXISTS idx_activity_risk_activity ON activity_risk_predictions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_risk_project ON activity_risk_predictions(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_risk_at_risk ON activity_risk_predictions(project_id, is_at_risk) WHERE is_at_risk = TRUE;
CREATE INDEX IF NOT EXISTS idx_activity_risk_latest ON activity_risk_predictions(activity_id, is_latest) WHERE is_latest = TRUE;
CREATE INDEX IF NOT EXISTS idx_risk_alerts_project ON risk_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_status ON risk_alerts(status) WHERE status = 'active';

-- Schedule Optimization
CREATE INDEX IF NOT EXISTS idx_schedule_opt_project ON schedule_optimization_recommendations(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_opt_pending ON schedule_optimization_recommendations(project_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_critical_path_project ON critical_path_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_constraint_impact_priority ON constraint_schedule_impacts(project_id, priority_score DESC);

-- Document AI
CREATE INDEX IF NOT EXISTS idx_doc_llm_document ON document_llm_results(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_entity_links_document ON document_entity_links(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_entity_links_entity ON document_entity_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_company ON ai_feedback(company_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE ai_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfi_routing_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfi_routing_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_extracted_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_optimization_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_path_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraint_schedule_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_llm_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- AI Configuration Policies
CREATE POLICY "Users can view AI config for their company" ON ai_configuration
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage AI config" ON ai_configuration
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner')));

-- Usage Log Policies
CREATE POLICY "Users can view usage for their company" ON ai_usage_log
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- RFI Routing Policies
CREATE POLICY "Users can view RFI suggestions for their projects" ON rfi_routing_suggestions
  FOR SELECT USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage RFI suggestions" ON rfi_routing_suggestions
  FOR ALL USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view routing patterns for their company" ON rfi_routing_patterns
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Summaries Policies
CREATE POLICY "Users can view summaries for their projects" ON ai_summaries
  FOR SELECT USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage summaries" ON ai_summaries
  FOR ALL USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

-- Extracted Action Items Policies
CREATE POLICY "Users can view extracted actions for their projects" ON ai_extracted_action_items
  FOR SELECT USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage extracted actions" ON ai_extracted_action_items
  FOR ALL USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

-- Risk Prediction Policies
CREATE POLICY "Users can view risk predictions for their projects" ON activity_risk_predictions
  FOR SELECT USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view risk alerts for their projects" ON risk_alerts
  FOR SELECT USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage risk alerts" ON risk_alerts
  FOR ALL USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

-- Schedule Optimization Policies
CREATE POLICY "Users can view schedule recommendations for their projects" ON schedule_optimization_recommendations
  FOR SELECT USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage schedule recommendations" ON schedule_optimization_recommendations
  FOR ALL USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view critical path analysis" ON critical_path_analysis
  FOR SELECT USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view constraint impacts" ON constraint_schedule_impacts
  FOR SELECT USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

-- Document AI Policies
CREATE POLICY "Users can view document LLM results" ON document_llm_results
  FOR SELECT USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view document entity links" ON document_entity_links
  FOR SELECT USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage document entity links" ON document_entity_links
  FOR ALL USING (project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid()));

-- Feedback Policies
CREATE POLICY "Users can submit feedback for their company" ON ai_feedback
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view feedback for their company" ON ai_feedback
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate monthly AI usage
CREATE OR REPLACE FUNCTION get_monthly_ai_usage(p_company_id UUID, p_month DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_tokens BIGINT,
  total_cost_cents DECIMAL(10,2),
  by_feature JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(aul.total_tokens)::BIGINT,
    SUM(aul.estimated_cost_cents)::DECIMAL(10,2),
    jsonb_object_agg(
      aul.feature,
      jsonb_build_object('tokens', SUM(aul.total_tokens), 'cost_cents', SUM(aul.estimated_cost_cents))
    )
  FROM ai_usage_log aul
  WHERE aul.company_id = p_company_id
    AND date_trunc('month', aul.created_at) = date_trunc('month', p_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get at-risk activities for a project
CREATE OR REPLACE FUNCTION get_at_risk_activities(p_project_id UUID, p_min_risk_score INTEGER DEFAULT 50)
RETURNS TABLE (
  activity_id UUID,
  activity_name VARCHAR,
  trade VARCHAR,
  planned_start_date DATE,
  slip_risk_score INTEGER,
  risk_factors JSONB,
  open_constraint_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.activity_name,
    a.trade,
    a.planned_start_date,
    arp.slip_risk_score,
    arp.risk_factors,
    (SELECT COUNT(*) FROM look_ahead_constraints c WHERE c.activity_id = a.id AND c.status = 'open')
  FROM look_ahead_activities a
  JOIN activity_risk_predictions arp ON a.id = arp.activity_id AND arp.is_latest = TRUE
  WHERE a.project_id = p_project_id
    AND a.deleted_at IS NULL
    AND arp.slip_risk_score >= p_min_risk_score
  ORDER BY arp.slip_risk_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly usage counter
CREATE OR REPLACE FUNCTION reset_monthly_ai_usage()
RETURNS void AS $$
BEGIN
  UPDATE ai_configuration
  SET current_month_usage_cents = 0,
      last_usage_reset = NOW()
  WHERE date_trunc('month', last_usage_reset) < date_trunc('month', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update current month usage
CREATE OR REPLACE FUNCTION update_ai_usage_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_configuration
  SET current_month_usage_cents = current_month_usage_cents + COALESCE(NEW.estimated_cost_cents, 0),
      updated_at = NOW()
  WHERE company_id = NEW.company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_usage_log_insert_trigger
  AFTER INSERT ON ai_usage_log
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_usage_trigger();

-- Trigger to set updated_at
CREATE OR REPLACE FUNCTION set_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_configuration_updated_at
  BEFORE UPDATE ON ai_configuration
  FOR EACH ROW
  EXECUTE FUNCTION set_ai_updated_at();

CREATE TRIGGER rfi_routing_suggestions_updated_at
  BEFORE UPDATE ON rfi_routing_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION set_ai_updated_at();

CREATE TRIGGER schedule_optimization_updated_at
  BEFORE UPDATE ON schedule_optimization_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION set_ai_updated_at();

CREATE TRIGGER document_llm_results_updated_at
  BEFORE UPDATE ON document_llm_results
  FOR EACH ROW
  EXECUTE FUNCTION set_ai_updated_at();
