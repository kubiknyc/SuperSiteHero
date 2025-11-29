-- Migration: 031_predictive_analytics.sql
-- Description: Predictive Analytics Engine (ML-powered predictions, risk scoring)
-- Created: 2025-11-29
--
-- This migration creates the predictive analytics infrastructure:
-- - analytics_project_snapshots: Daily metrics snapshots for ML training
-- - analytics_predictions: Stored predictions with confidence
-- - analytics_recommendations: Actionable insights from predictions
-- - analytics_model_metadata: Model versioning and performance tracking

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Model types
DO $$ BEGIN
  CREATE TYPE analytics_model_type AS ENUM (
    'budget_overrun',    -- Budget overrun prediction
    'schedule_delay',    -- Schedule delay prediction
    'risk_score',        -- Overall risk scoring
    'resource_forecast'  -- Resource/workforce forecasting
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recommendation categories
DO $$ BEGIN
  CREATE TYPE recommendation_category AS ENUM (
    'budget',        -- Budget-related recommendations
    'schedule',      -- Schedule-related recommendations
    'risk',          -- Risk mitigation recommendations
    'operational',   -- Operational improvements
    'resource'       -- Resource allocation
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recommendation priority
DO $$ BEGIN
  CREATE TYPE recommendation_priority AS ENUM (
    'critical',   -- Requires immediate attention
    'high',       -- Should be addressed soon
    'medium',     -- Important but not urgent
    'low'         -- Nice to have
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recommendation status
DO $$ BEGIN
  CREATE TYPE recommendation_status AS ENUM (
    'pending',       -- Not yet reviewed
    'acknowledged',  -- Reviewed but not acted on
    'implemented',   -- Action taken
    'dismissed'      -- Dismissed as not applicable
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- Analytics Project Snapshots - Historical data for ML training
CREATE TABLE IF NOT EXISTS analytics_project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  -- Budget Metrics
  contract_value DECIMAL(15, 2),
  budget DECIMAL(15, 2),
  approved_change_orders_cost DECIMAL(15, 2),
  pending_change_orders_cost DECIMAL(15, 2),
  cost_to_date DECIMAL(15, 2),

  -- Schedule Metrics
  planned_start_date DATE,
  planned_completion_date DATE,
  projected_completion_date DATE,
  baseline_variance_days INTEGER,
  critical_path_length_days INTEGER,
  tasks_on_critical_path INTEGER,

  -- Progress Metrics
  overall_percent_complete DECIMAL(5, 2),
  schedule_items_completed INTEGER,
  schedule_items_total INTEGER,
  milestones_completed INTEGER,
  milestones_total INTEGER,

  -- Workflow Metrics
  open_rfis INTEGER,
  open_change_orders INTEGER,
  open_submittals INTEGER,
  overdue_rfis INTEGER,
  overdue_change_orders INTEGER,
  overdue_submittals INTEGER,
  avg_rfi_response_days DECIMAL(5, 2),
  avg_co_approval_days DECIMAL(5, 2),
  avg_submittal_response_days DECIMAL(5, 2),

  -- Resource Metrics
  avg_daily_workforce INTEGER,
  total_labor_hours DECIMAL(10, 2),
  total_equipment_hours DECIMAL(10, 2),

  -- Weather Metrics
  weather_delay_days INTEGER,
  weather_delay_hours DECIMAL(10, 2),

  -- Punch List Metrics
  open_punch_items INTEGER,
  completed_punch_items INTEGER,
  total_punch_items INTEGER,

  -- Safety Metrics
  safety_incidents_mtd INTEGER,
  near_misses_mtd INTEGER,
  osha_recordable_mtd INTEGER,
  days_since_incident INTEGER,

  -- Document Metrics
  total_documents INTEGER,
  pending_approvals INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint (one snapshot per project per day)
  CONSTRAINT unique_project_snapshot UNIQUE (project_id, snapshot_date)
);

-- Analytics Predictions - Stored predictions
CREATE TABLE IF NOT EXISTS analytics_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version VARCHAR(50) NOT NULL,

  -- Budget Predictions
  budget_overrun_probability DECIMAL(5, 4), -- 0.0000 to 1.0000
  budget_overrun_amount_low DECIMAL(15, 2),
  budget_overrun_amount_mid DECIMAL(15, 2),
  budget_overrun_amount_high DECIMAL(15, 2),
  budget_confidence_score DECIMAL(5, 4),

  -- Schedule Predictions
  schedule_delay_probability DECIMAL(5, 4),
  schedule_delay_days_low INTEGER,
  schedule_delay_days_mid INTEGER,
  schedule_delay_days_high INTEGER,
  schedule_confidence_score DECIMAL(5, 4),
  projected_completion_date DATE,

  -- Risk Scores (0-100)
  overall_risk_score INTEGER,
  schedule_risk_score INTEGER,
  cost_risk_score INTEGER,
  operational_risk_score INTEGER,

  -- Feature Importance (for model explainability)
  budget_feature_importance JSONB,
  schedule_feature_importance JSONB,
  risk_feature_importance JSONB,

  -- Input Features (snapshot of data used for prediction)
  input_features JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_latest BOOLEAN DEFAULT TRUE,

  -- Constraints
  CONSTRAINT valid_budget_probability CHECK (budget_overrun_probability BETWEEN 0 AND 1),
  CONSTRAINT valid_schedule_probability CHECK (schedule_delay_probability BETWEEN 0 AND 1),
  CONSTRAINT valid_risk_scores CHECK (
    overall_risk_score BETWEEN 0 AND 100 AND
    schedule_risk_score BETWEEN 0 AND 100 AND
    cost_risk_score BETWEEN 0 AND 100 AND
    operational_risk_score BETWEEN 0 AND 100
  )
);

-- Analytics Recommendations - Actionable insights
CREATE TABLE IF NOT EXISTS analytics_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES analytics_predictions(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Recommendation Details
  category recommendation_category NOT NULL,
  priority recommendation_priority NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  suggested_action TEXT,
  potential_impact TEXT,

  -- Related Entities
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  related_entity_data JSONB,

  -- Status Tracking
  status recommendation_status NOT NULL DEFAULT 'pending',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  implemented_at TIMESTAMPTZ,
  implemented_by UUID REFERENCES auth.users(id),
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES auth.users(id),
  dismissal_reason TEXT,

  -- Tracking
  due_date DATE,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Model Metadata - Model versioning
CREATE TABLE IF NOT EXISTS analytics_model_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type analytics_model_type NOT NULL,
  model_version VARCHAR(50) NOT NULL,

  -- Model Files (stored in Supabase Storage)
  model_json_url TEXT,
  model_weights_url TEXT,
  config_json_url TEXT,

  -- Training Info
  training_started_at TIMESTAMPTZ,
  training_completed_at TIMESTAMPTZ,
  training_samples INTEGER,
  validation_samples INTEGER,
  training_duration_seconds INTEGER,

  -- Performance Metrics
  accuracy DECIMAL(5, 4),
  precision_score DECIMAL(5, 4),
  recall_score DECIMAL(5, 4),
  f1_score DECIMAL(5, 4),
  mae DECIMAL(10, 4), -- Mean Absolute Error
  rmse DECIMAL(10, 4), -- Root Mean Square Error
  r_squared DECIMAL(5, 4), -- R-squared for regression

  -- Configuration
  feature_config JSONB,
  hyperparameters JSONB,
  normalization_params JSONB,

  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  is_production BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,

  -- Unique constraint
  CONSTRAINT unique_model_version UNIQUE (model_type, model_version)
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Collect project snapshot (called daily via cron or Edge Function)
CREATE OR REPLACE FUNCTION collect_project_snapshot(p_project_id UUID)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_project RECORD;
  v_schedule_stats RECORD;
  v_workflow_stats RECORD;
  v_workforce_stats RECORD;
  v_punch_stats RECORD;
  v_safety_stats RECORD;
BEGIN
  -- Get project base data
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  -- Get schedule stats
  SELECT
    COUNT(*) FILTER (WHERE percent_complete = 100) as completed,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_critical = TRUE) as critical_count,
    SUM(CASE WHEN baseline_start_date IS NOT NULL THEN
      EXTRACT(DAY FROM (start_date - baseline_start_date))::INTEGER
    ELSE 0 END) / NULLIF(COUNT(*), 0) as avg_variance
  INTO v_schedule_stats
  FROM schedule_items
  WHERE project_id = p_project_id AND deleted_at IS NULL;

  -- Get workflow stats
  SELECT
    COUNT(*) FILTER (WHERE workflow_type_id = (SELECT id FROM workflow_types WHERE name = 'RFI' LIMIT 1) AND status NOT IN ('closed', 'resolved')) as open_rfis,
    COUNT(*) FILTER (WHERE workflow_type_id = (SELECT id FROM workflow_types WHERE name = 'Change Order' LIMIT 1) AND status NOT IN ('closed', 'awarded')) as open_cos,
    COUNT(*) FILTER (WHERE workflow_type_id = (SELECT id FROM workflow_types WHERE name = 'Submittal' LIMIT 1) AND status NOT IN ('closed', 'approved')) as open_submittals,
    COALESCE(SUM(cost_impact) FILTER (WHERE status = 'awarded'), 0) as approved_co_cost,
    COALESCE(SUM(cost_impact) FILTER (WHERE status NOT IN ('closed', 'awarded', 'rejected')), 0) as pending_co_cost
  INTO v_workflow_stats
  FROM workflow_items
  WHERE project_id = p_project_id AND deleted_at IS NULL;

  -- Get workforce stats (last 30 days)
  SELECT
    COALESCE(AVG(worker_count), 0)::INTEGER as avg_workforce,
    COALESCE(SUM(hours_worked), 0) as total_hours
  INTO v_workforce_stats
  FROM daily_report_workforce drw
  JOIN daily_reports dr ON dr.id = drw.daily_report_id
  WHERE dr.project_id = p_project_id
    AND dr.report_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Get punch list stats
  SELECT
    COUNT(*) FILTER (WHERE status NOT IN ('completed', 'verified')) as open_items,
    COUNT(*) FILTER (WHERE status IN ('completed', 'verified')) as completed_items,
    COUNT(*) as total_items
  INTO v_punch_stats
  FROM punch_items
  WHERE project_id = p_project_id AND deleted_at IS NULL;

  -- Get safety stats (month to date)
  SELECT
    COUNT(*) as incidents_mtd,
    COUNT(*) FILTER (WHERE severity = 'near_miss') as near_misses,
    COUNT(*) FILTER (WHERE osha_recordable = TRUE) as osha_recordable
  INTO v_safety_stats
  FROM safety_incidents
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND incident_date >= DATE_TRUNC('month', CURRENT_DATE);

  -- Insert snapshot
  INSERT INTO analytics_project_snapshots (
    project_id,
    snapshot_date,
    contract_value,
    budget,
    approved_change_orders_cost,
    pending_change_orders_cost,
    planned_start_date,
    planned_completion_date,
    overall_percent_complete,
    schedule_items_completed,
    schedule_items_total,
    tasks_on_critical_path,
    open_rfis,
    open_change_orders,
    open_submittals,
    avg_daily_workforce,
    total_labor_hours,
    open_punch_items,
    completed_punch_items,
    total_punch_items,
    safety_incidents_mtd,
    near_misses_mtd,
    osha_recordable_mtd
  ) VALUES (
    p_project_id,
    CURRENT_DATE,
    v_project.contract_value,
    v_project.budget,
    v_workflow_stats.approved_co_cost,
    v_workflow_stats.pending_co_cost,
    v_project.start_date,
    v_project.end_date,
    COALESCE((v_schedule_stats.completed::DECIMAL / NULLIF(v_schedule_stats.total, 0)) * 100, 0),
    COALESCE(v_schedule_stats.completed, 0),
    COALESCE(v_schedule_stats.total, 0),
    COALESCE(v_schedule_stats.critical_count, 0),
    COALESCE(v_workflow_stats.open_rfis, 0),
    COALESCE(v_workflow_stats.open_cos, 0),
    COALESCE(v_workflow_stats.open_submittals, 0),
    v_workforce_stats.avg_workforce,
    v_workforce_stats.total_hours,
    COALESCE(v_punch_stats.open_items, 0),
    COALESCE(v_punch_stats.completed_items, 0),
    COALESCE(v_punch_stats.total_items, 0),
    COALESCE(v_safety_stats.incidents_mtd, 0),
    COALESCE(v_safety_stats.near_misses, 0),
    COALESCE(v_safety_stats.osha_recordable, 0)
  )
  ON CONFLICT (project_id, snapshot_date)
  DO UPDATE SET
    contract_value = EXCLUDED.contract_value,
    budget = EXCLUDED.budget,
    approved_change_orders_cost = EXCLUDED.approved_change_orders_cost,
    pending_change_orders_cost = EXCLUDED.pending_change_orders_cost,
    overall_percent_complete = EXCLUDED.overall_percent_complete,
    schedule_items_completed = EXCLUDED.schedule_items_completed,
    schedule_items_total = EXCLUDED.schedule_items_total,
    open_rfis = EXCLUDED.open_rfis,
    open_change_orders = EXCLUDED.open_change_orders,
    open_submittals = EXCLUDED.open_submittals,
    open_punch_items = EXCLUDED.open_punch_items,
    safety_incidents_mtd = EXCLUDED.safety_incidents_mtd
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- Mark previous predictions as not latest when new one is inserted
CREATE OR REPLACE FUNCTION update_prediction_latest_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_latest = TRUE THEN
    UPDATE analytics_predictions
    SET is_latest = FALSE
    WHERE project_id = NEW.project_id
      AND id != NEW.id
      AND is_latest = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update recommendation timestamp
CREATE OR REPLACE FUNCTION update_recommendation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate simple risk score (rule-based fallback)
CREATE OR REPLACE FUNCTION calculate_risk_score(p_project_id UUID)
RETURNS TABLE (
  overall_risk INTEGER,
  schedule_risk INTEGER,
  cost_risk INTEGER,
  operational_risk INTEGER
) AS $$
DECLARE
  v_snapshot analytics_project_snapshots;
  v_schedule_risk INTEGER := 0;
  v_cost_risk INTEGER := 0;
  v_operational_risk INTEGER := 0;
BEGIN
  -- Get latest snapshot
  SELECT * INTO v_snapshot
  FROM analytics_project_snapshots
  WHERE project_id = p_project_id
  ORDER BY snapshot_date DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;

  -- Schedule Risk Calculation
  IF v_snapshot.baseline_variance_days IS NOT NULL THEN
    v_schedule_risk := v_schedule_risk + LEAST(ABS(v_snapshot.baseline_variance_days) * 2, 40);
  END IF;
  IF v_snapshot.overdue_rfis > 0 THEN
    v_schedule_risk := v_schedule_risk + LEAST(v_snapshot.overdue_rfis * 5, 20);
  END IF;
  IF v_snapshot.open_change_orders > 5 THEN
    v_schedule_risk := v_schedule_risk + 10;
  END IF;

  -- Cost Risk Calculation
  IF v_snapshot.budget > 0 AND v_snapshot.approved_change_orders_cost > 0 THEN
    v_cost_risk := v_cost_risk + LEAST(
      (v_snapshot.approved_change_orders_cost / v_snapshot.budget * 100)::INTEGER,
      50
    );
  END IF;
  IF v_snapshot.pending_change_orders_cost > 0 AND v_snapshot.budget > 0 THEN
    v_cost_risk := v_cost_risk + LEAST(
      (v_snapshot.pending_change_orders_cost / v_snapshot.budget * 50)::INTEGER,
      25
    );
  END IF;

  -- Operational Risk Calculation
  IF v_snapshot.open_punch_items > 50 THEN
    v_operational_risk := v_operational_risk + 15;
  END IF;
  IF v_snapshot.safety_incidents_mtd > 0 THEN
    v_operational_risk := v_operational_risk + LEAST(v_snapshot.safety_incidents_mtd * 10, 30);
  END IF;
  IF v_snapshot.avg_daily_workforce IS NULL OR v_snapshot.avg_daily_workforce = 0 THEN
    v_operational_risk := v_operational_risk + 20;
  END IF;

  -- Cap individual scores at 100
  v_schedule_risk := LEAST(v_schedule_risk, 100);
  v_cost_risk := LEAST(v_cost_risk, 100);
  v_operational_risk := LEAST(v_operational_risk, 100);

  -- Calculate overall (weighted average)
  RETURN QUERY SELECT
    ((v_schedule_risk * 40 + v_cost_risk * 40 + v_operational_risk * 20) / 100)::INTEGER,
    v_schedule_risk,
    v_cost_risk,
    v_operational_risk;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update latest flag on prediction insert
DROP TRIGGER IF EXISTS trigger_update_prediction_latest ON analytics_predictions;
CREATE TRIGGER trigger_update_prediction_latest
  AFTER INSERT ON analytics_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_prediction_latest_flag();

-- Update recommendation timestamp
DROP TRIGGER IF EXISTS trigger_update_recommendation_timestamp ON analytics_recommendations;
CREATE TRIGGER trigger_update_recommendation_timestamp
  BEFORE UPDATE ON analytics_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendation_timestamp();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Snapshots indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_project ON analytics_project_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON analytics_project_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_project_date ON analytics_project_snapshots(project_id, snapshot_date DESC);

-- Predictions indexes
CREATE INDEX IF NOT EXISTS idx_predictions_project ON analytics_predictions(project_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON analytics_predictions(prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_latest ON analytics_predictions(project_id, is_latest)
  WHERE is_latest = TRUE;
CREATE INDEX IF NOT EXISTS idx_predictions_model ON analytics_predictions(model_version);

-- Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_recommendations_project ON analytics_recommendations(project_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_prediction ON analytics_recommendations(prediction_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON analytics_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON analytics_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_recommendations_pending ON analytics_recommendations(project_id, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_recommendations_category ON analytics_recommendations(category);

-- Model metadata indexes
CREATE INDEX IF NOT EXISTS idx_model_type ON analytics_model_metadata(model_type);
CREATE INDEX IF NOT EXISTS idx_model_active ON analytics_model_metadata(model_type, is_active)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_model_production ON analytics_model_metadata(model_type, is_production)
  WHERE is_production = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE analytics_project_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_model_metadata ENABLE ROW LEVEL SECURITY;

-- Snapshots policies
CREATE POLICY "Users can view snapshots for their projects"
  ON analytics_project_snapshots FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert snapshots"
  ON analytics_project_snapshots FOR INSERT
  WITH CHECK (TRUE);

-- Predictions policies
CREATE POLICY "Users can view predictions for their projects"
  ON analytics_predictions FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert predictions"
  ON analytics_predictions FOR INSERT
  WITH CHECK (TRUE);

-- Recommendations policies
CREATE POLICY "Users can view recommendations for their projects"
  ON analytics_recommendations FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage recommendations in their projects"
  ON analytics_recommendations FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- Model metadata policies (read-only for users)
CREATE POLICY "Users can view active models"
  ON analytics_model_metadata FOR SELECT
  USING (is_active = TRUE OR is_production = TRUE);

CREATE POLICY "Admins can manage models"
  ON analytics_model_metadata FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Training data view (for ML model training)
CREATE OR REPLACE VIEW analytics_training_data_view AS
SELECT
  aps.*,
  p.status as project_status,
  p.start_date as project_start_date,
  p.end_date as project_end_date,
  (aps.snapshot_date::date - p.start_date::date)::INTEGER as days_since_start,
  CASE
    WHEN p.end_date IS NOT NULL
    THEN (p.end_date::date - aps.snapshot_date::date)::INTEGER
    ELSE NULL
  END as days_to_planned_completion,
  CASE
    WHEN aps.budget > 0
    THEN ((aps.approved_change_orders_cost / aps.budget) * 100)::DECIMAL(5,2)
    ELSE 0
  END as change_order_ratio,
  CASE
    WHEN aps.schedule_items_total > 0
    THEN ((aps.schedule_items_completed::DECIMAL / aps.schedule_items_total) * 100)
    ELSE 0
  END as completion_percentage
FROM analytics_project_snapshots aps
JOIN projects p ON p.id = aps.project_id
WHERE p.deleted_at IS NULL;

-- Latest predictions per project
CREATE OR REPLACE VIEW analytics_latest_predictions AS
SELECT
  ap.*,
  p.name as project_name,
  p.status as project_status
FROM analytics_predictions ap
JOIN projects p ON p.id = ap.project_id
WHERE ap.is_latest = TRUE
  AND p.deleted_at IS NULL;

-- Pending recommendations summary
CREATE OR REPLACE VIEW analytics_pending_recommendations AS
SELECT
  ar.*,
  p.name as project_name
FROM analytics_recommendations ar
JOIN projects p ON p.id = ar.project_id
WHERE ar.status = 'pending'
  AND p.deleted_at IS NULL
ORDER BY
  CASE ar.priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  ar.created_at DESC;

-- Model performance history
CREATE OR REPLACE VIEW analytics_model_performance AS
SELECT
  model_type,
  model_version,
  training_completed_at,
  training_samples,
  accuracy,
  mae,
  rmse,
  r_squared,
  is_production,
  is_active
FROM analytics_model_metadata
ORDER BY model_type, training_completed_at DESC;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON analytics_project_snapshots TO authenticated;
GRANT INSERT ON analytics_project_snapshots TO authenticated;
GRANT SELECT ON analytics_predictions TO authenticated;
GRANT INSERT ON analytics_predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON analytics_recommendations TO authenticated;
GRANT SELECT ON analytics_model_metadata TO authenticated;

GRANT SELECT ON analytics_training_data_view TO authenticated;
GRANT SELECT ON analytics_latest_predictions TO authenticated;
GRANT SELECT ON analytics_pending_recommendations TO authenticated;
GRANT SELECT ON analytics_model_performance TO authenticated;

GRANT EXECUTE ON FUNCTION collect_project_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_risk_score TO authenticated;

-- ============================================================================
-- STORAGE BUCKET FOR ML MODELS
-- ============================================================================

-- Create bucket for ML models if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ml-models', 'ml-models', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE analytics_project_snapshots IS 'Daily snapshots of project metrics for ML training and historical analysis';
COMMENT ON TABLE analytics_predictions IS 'Stored predictions with confidence scores and feature importance';
COMMENT ON TABLE analytics_recommendations IS 'Actionable insights generated from predictions';
COMMENT ON TABLE analytics_model_metadata IS 'ML model versioning and performance tracking';

COMMENT ON FUNCTION collect_project_snapshot IS 'Collects current project metrics into a daily snapshot';
COMMENT ON FUNCTION calculate_risk_score IS 'Calculates rule-based risk scores (fallback when ML unavailable)';

COMMENT ON COLUMN analytics_predictions.budget_feature_importance IS 'JSON showing which features influenced budget prediction';
COMMENT ON COLUMN analytics_predictions.input_features IS 'Snapshot of input data used for this prediction';
COMMENT ON COLUMN analytics_model_metadata.normalization_params IS 'Feature normalization parameters for inference';
