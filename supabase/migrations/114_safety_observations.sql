-- ============================================================================
-- Migration: Safety Observation Cards
-- Description: Positive safety reporting system for safe behaviors, unsafe
--              conditions, near-misses, and best practices. Includes gamification
--              points and recognition system.
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Observation type enum
DO $$ BEGIN
  CREATE TYPE safety_observation_type AS ENUM (
    'safe_behavior',      -- Positive reinforcement for safe actions
    'unsafe_condition',   -- Proactive hazard identification
    'near_miss',          -- Close calls that didn't result in incident
    'best_practice'       -- Recognition of excellence
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Observation category enum
DO $$ BEGIN
  CREATE TYPE safety_observation_category AS ENUM (
    'ppe',                -- Personal Protective Equipment
    'housekeeping',       -- Site cleanliness and organization
    'equipment',          -- Tools and equipment usage
    'procedures',         -- Following proper procedures
    'ergonomics',         -- Proper lifting, posture
    'fall_protection',    -- Fall hazards and prevention
    'electrical',         -- Electrical safety
    'excavation',         -- Trenching and excavation
    'confined_space',     -- Confined space entry
    'fire_prevention',    -- Fire hazards and prevention
    'traffic_control',    -- Vehicle and pedestrian safety
    'chemical_handling',  -- Hazardous materials
    'communication',      -- Safety communication
    'training',           -- Training and competency
    'leadership',         -- Safety leadership
    'other'               -- Other categories
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Observation status enum
DO $$ BEGIN
  CREATE TYPE safety_observation_status AS ENUM (
    'submitted',          -- Initially submitted
    'acknowledged',       -- Reviewed and acknowledged
    'action_required',    -- Requires corrective action
    'in_progress',        -- Action being taken
    'resolved',           -- Corrective action completed
    'closed'              -- Observation closed
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Severity rating enum
DO $$ BEGIN
  CREATE TYPE observation_severity AS ENUM (
    'low',                -- Minor observation
    'medium',             -- Moderate concern
    'high',               -- Significant hazard
    'critical'            -- Immediate danger
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Main safety observations table
CREATE TABLE IF NOT EXISTS safety_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  observer_id UUID NOT NULL REFERENCES auth.users(id),

  -- Observation details
  observation_number TEXT NOT NULL,
  observation_type safety_observation_type NOT NULL,
  category safety_observation_category NOT NULL,
  severity observation_severity NOT NULL DEFAULT 'low',

  -- Description and location
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  location_coordinates JSONB, -- {lat, lng} for GPS tracking

  -- Photo attachments
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Status and workflow
  status safety_observation_status NOT NULL DEFAULT 'submitted',

  -- Corrective action (for unsafe conditions)
  corrective_action TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Recognition (for positive observations)
  recognized_person TEXT,         -- Name of person being recognized
  recognized_company TEXT,        -- Company of person being recognized
  recognition_message TEXT,       -- Message of recognition

  -- Gamification
  points_awarded INTEGER NOT NULL DEFAULT 0,
  points_calculation_details JSONB,

  -- Metadata
  weather_conditions TEXT,
  shift TEXT,
  work_area TEXT,

  -- Timestamps
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Observer points/leaderboard table
CREATE TABLE IF NOT EXISTS safety_observer_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL for company-wide
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Points
  total_points INTEGER NOT NULL DEFAULT 0,
  monthly_points INTEGER NOT NULL DEFAULT 0,
  yearly_points INTEGER NOT NULL DEFAULT 0,

  -- Observation counts
  total_observations INTEGER NOT NULL DEFAULT 0,
  safe_behavior_count INTEGER NOT NULL DEFAULT 0,
  unsafe_condition_count INTEGER NOT NULL DEFAULT 0,
  near_miss_count INTEGER NOT NULL DEFAULT 0,
  best_practice_count INTEGER NOT NULL DEFAULT 0,

  -- Streak tracking
  current_streak INTEGER NOT NULL DEFAULT 0, -- Consecutive days with observations
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_observation_date DATE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, project_id, company_id)
);

-- Observation photos table (normalized for additional metadata)
CREATE TABLE IF NOT EXISTS safety_observation_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES safety_observations(id) ON DELETE CASCADE,

  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  taken_at TIMESTAMPTZ,

  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Observation comments/activity log
CREATE TABLE IF NOT EXISTS safety_observation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES safety_observations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  comment TEXT NOT NULL,
  is_system_message BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Observation notifications
CREATE TABLE IF NOT EXISTS safety_observation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES safety_observations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  notification_type TEXT NOT NULL, -- 'email', 'in_app', 'sms'
  subject TEXT,
  message TEXT,

  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,

  delivery_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  error_message TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_safety_observations_project ON safety_observations(project_id);
CREATE INDEX IF NOT EXISTS idx_safety_observations_company ON safety_observations(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_observations_observer ON safety_observations(observer_id);
CREATE INDEX IF NOT EXISTS idx_safety_observations_type ON safety_observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_safety_observations_category ON safety_observations(category);
CREATE INDEX IF NOT EXISTS idx_safety_observations_status ON safety_observations(status);
CREATE INDEX IF NOT EXISTS idx_safety_observations_severity ON safety_observations(severity);
CREATE INDEX IF NOT EXISTS idx_safety_observations_assigned ON safety_observations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_safety_observations_observed_at ON safety_observations(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_observations_created_at ON safety_observations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_observations_deleted ON safety_observations(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_observer_points_user ON safety_observer_points(user_id);
CREATE INDEX IF NOT EXISTS idx_observer_points_project ON safety_observer_points(project_id);
CREATE INDEX IF NOT EXISTS idx_observer_points_company ON safety_observer_points(company_id);
CREATE INDEX IF NOT EXISTS idx_observer_points_total ON safety_observer_points(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_observer_points_monthly ON safety_observer_points(monthly_points DESC);

CREATE INDEX IF NOT EXISTS idx_observation_photos_observation ON safety_observation_photos(observation_id);
CREATE INDEX IF NOT EXISTS idx_observation_comments_observation ON safety_observation_comments(observation_id);
CREATE INDEX IF NOT EXISTS idx_observation_notifications_observation ON safety_observation_notifications(observation_id);
CREATE INDEX IF NOT EXISTS idx_observation_notifications_user ON safety_observation_notifications(user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate observation number
CREATE OR REPLACE FUNCTION generate_observation_number(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT COUNT(*) + 1 INTO v_count
  FROM safety_observations
  WHERE project_id = p_project_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'OBS-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Calculate points for an observation
CREATE OR REPLACE FUNCTION calculate_observation_points(
  p_observation_type safety_observation_type,
  p_severity observation_severity,
  p_has_photos BOOLEAN,
  p_has_corrective_action BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
  v_points INTEGER := 0;
BEGIN
  -- Base points by observation type
  CASE p_observation_type
    WHEN 'safe_behavior' THEN v_points := 10;
    WHEN 'unsafe_condition' THEN v_points := 15;
    WHEN 'near_miss' THEN v_points := 20;
    WHEN 'best_practice' THEN v_points := 25;
  END CASE;

  -- Severity bonus
  CASE p_severity
    WHEN 'medium' THEN v_points := v_points + 5;
    WHEN 'high' THEN v_points := v_points + 10;
    WHEN 'critical' THEN v_points := v_points + 15;
    ELSE NULL;
  END CASE;

  -- Photo bonus
  IF p_has_photos THEN
    v_points := v_points + 5;
  END IF;

  -- Corrective action bonus (for unsafe conditions)
  IF p_has_corrective_action THEN
    v_points := v_points + 10;
  END IF;

  RETURN v_points;
END;
$$ LANGUAGE plpgsql;

-- Update observer points
CREATE OR REPLACE FUNCTION update_observer_points()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
  v_has_photos BOOLEAN;
  v_has_action BOOLEAN;
BEGIN
  -- Only process new observations
  IF TG_OP = 'INSERT' THEN
    -- Check if observation has photos
    v_has_photos := COALESCE(array_length(NEW.photo_urls, 1), 0) > 0;

    -- Check if observation has corrective action
    v_has_action := NEW.corrective_action IS NOT NULL AND NEW.corrective_action != '';

    -- Calculate points
    v_points := calculate_observation_points(
      NEW.observation_type,
      NEW.severity,
      v_has_photos,
      v_has_action
    );

    -- Update the observation with points
    UPDATE safety_observations
    SET
      points_awarded = v_points,
      points_calculation_details = jsonb_build_object(
        'base_type_points', CASE NEW.observation_type
          WHEN 'safe_behavior' THEN 10
          WHEN 'unsafe_condition' THEN 15
          WHEN 'near_miss' THEN 20
          WHEN 'best_practice' THEN 25
        END,
        'severity_bonus', CASE NEW.severity
          WHEN 'medium' THEN 5
          WHEN 'high' THEN 10
          WHEN 'critical' THEN 15
          ELSE 0
        END,
        'photo_bonus', CASE WHEN v_has_photos THEN 5 ELSE 0 END,
        'corrective_action_bonus', CASE WHEN v_has_action THEN 10 ELSE 0 END
      )
    WHERE id = NEW.id;

    -- Update or insert observer points record
    INSERT INTO safety_observer_points (
      user_id,
      project_id,
      company_id,
      total_points,
      monthly_points,
      yearly_points,
      total_observations,
      safe_behavior_count,
      unsafe_condition_count,
      near_miss_count,
      best_practice_count,
      current_streak,
      longest_streak,
      last_observation_date
    )
    VALUES (
      NEW.observer_id,
      NEW.project_id,
      NEW.company_id,
      v_points,
      v_points,
      v_points,
      1,
      CASE WHEN NEW.observation_type = 'safe_behavior' THEN 1 ELSE 0 END,
      CASE WHEN NEW.observation_type = 'unsafe_condition' THEN 1 ELSE 0 END,
      CASE WHEN NEW.observation_type = 'near_miss' THEN 1 ELSE 0 END,
      CASE WHEN NEW.observation_type = 'best_practice' THEN 1 ELSE 0 END,
      1,
      1,
      CURRENT_DATE
    )
    ON CONFLICT (user_id, project_id, company_id) DO UPDATE SET
      total_points = safety_observer_points.total_points + v_points,
      monthly_points = CASE
        WHEN EXTRACT(MONTH FROM safety_observer_points.updated_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM safety_observer_points.updated_at) = EXTRACT(YEAR FROM NOW())
        THEN safety_observer_points.monthly_points + v_points
        ELSE v_points
      END,
      yearly_points = CASE
        WHEN EXTRACT(YEAR FROM safety_observer_points.updated_at) = EXTRACT(YEAR FROM NOW())
        THEN safety_observer_points.yearly_points + v_points
        ELSE v_points
      END,
      total_observations = safety_observer_points.total_observations + 1,
      safe_behavior_count = safety_observer_points.safe_behavior_count +
        CASE WHEN NEW.observation_type = 'safe_behavior' THEN 1 ELSE 0 END,
      unsafe_condition_count = safety_observer_points.unsafe_condition_count +
        CASE WHEN NEW.observation_type = 'unsafe_condition' THEN 1 ELSE 0 END,
      near_miss_count = safety_observer_points.near_miss_count +
        CASE WHEN NEW.observation_type = 'near_miss' THEN 1 ELSE 0 END,
      best_practice_count = safety_observer_points.best_practice_count +
        CASE WHEN NEW.observation_type = 'best_practice' THEN 1 ELSE 0 END,
      current_streak = CASE
        WHEN safety_observer_points.last_observation_date = CURRENT_DATE - 1
        THEN safety_observer_points.current_streak + 1
        WHEN safety_observer_points.last_observation_date = CURRENT_DATE
        THEN safety_observer_points.current_streak
        ELSE 1
      END,
      longest_streak = GREATEST(
        safety_observer_points.longest_streak,
        CASE
          WHEN safety_observer_points.last_observation_date = CURRENT_DATE - 1
          THEN safety_observer_points.current_streak + 1
          ELSE 1
        END
      ),
      last_observation_date = CURRENT_DATE,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating points
DROP TRIGGER IF EXISTS trigger_update_observer_points ON safety_observations;
CREATE TRIGGER trigger_update_observer_points
  AFTER INSERT ON safety_observations
  FOR EACH ROW
  EXECUTE FUNCTION update_observer_points();

-- Auto-generate observation number
CREATE OR REPLACE FUNCTION set_observation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.observation_number IS NULL OR NEW.observation_number = '' THEN
    NEW.observation_number := generate_observation_number(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_observation_number ON safety_observations;
CREATE TRIGGER trigger_set_observation_number
  BEFORE INSERT ON safety_observations
  FOR EACH ROW
  EXECUTE FUNCTION set_observation_number();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_observation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_observation_timestamp ON safety_observations;
CREATE TRIGGER trigger_update_observation_timestamp
  BEFORE UPDATE ON safety_observations
  FOR EACH ROW
  EXECUTE FUNCTION update_observation_timestamp();

-- Reset monthly points (to be called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_observation_points()
RETURNS void AS $$
BEGIN
  UPDATE safety_observer_points
  SET monthly_points = 0
  WHERE EXTRACT(MONTH FROM updated_at) != EXTRACT(MONTH FROM NOW())
     OR EXTRACT(YEAR FROM updated_at) != EXTRACT(YEAR FROM NOW());
END;
$$ LANGUAGE plpgsql;

-- Reset yearly points (to be called by cron job)
CREATE OR REPLACE FUNCTION reset_yearly_observation_points()
RETURNS void AS $$
BEGIN
  UPDATE safety_observer_points
  SET yearly_points = 0
  WHERE EXTRACT(YEAR FROM updated_at) != EXTRACT(YEAR FROM NOW());
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Observation statistics view
CREATE OR REPLACE VIEW safety_observation_stats AS
SELECT
  project_id,
  company_id,
  COUNT(*) as total_observations,
  COUNT(*) FILTER (WHERE observation_type = 'safe_behavior') as safe_behavior_count,
  COUNT(*) FILTER (WHERE observation_type = 'unsafe_condition') as unsafe_condition_count,
  COUNT(*) FILTER (WHERE observation_type = 'near_miss') as near_miss_count,
  COUNT(*) FILTER (WHERE observation_type = 'best_practice') as best_practice_count,
  COUNT(*) FILTER (WHERE status = 'submitted') as pending_count,
  COUNT(*) FILTER (WHERE status = 'action_required') as action_required_count,
  COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_count,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'high') as high_severity_count,
  COUNT(*) FILTER (WHERE observed_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days,
  COUNT(*) FILTER (WHERE observed_at >= CURRENT_DATE - INTERVAL '30 days') as last_30_days,
  SUM(points_awarded) as total_points_awarded
FROM safety_observations
WHERE deleted_at IS NULL
GROUP BY project_id, company_id;

-- Leaderboard view (top observers)
CREATE OR REPLACE VIEW safety_observer_leaderboard AS
SELECT
  sop.id,
  sop.user_id,
  sop.project_id,
  sop.company_id,
  u.raw_user_meta_data->>'full_name' as observer_name,
  u.email as observer_email,
  p.name as project_name,
  sop.total_points,
  sop.monthly_points,
  sop.yearly_points,
  sop.total_observations,
  sop.safe_behavior_count,
  sop.unsafe_condition_count,
  sop.near_miss_count,
  sop.best_practice_count,
  sop.current_streak,
  sop.longest_streak,
  sop.last_observation_date,
  ROW_NUMBER() OVER (PARTITION BY sop.company_id ORDER BY sop.total_points DESC) as company_rank,
  ROW_NUMBER() OVER (PARTITION BY sop.project_id ORDER BY sop.total_points DESC) as project_rank,
  ROW_NUMBER() OVER (PARTITION BY sop.company_id ORDER BY sop.monthly_points DESC) as monthly_company_rank,
  ROW_NUMBER() OVER (PARTITION BY sop.project_id ORDER BY sop.monthly_points DESC) as monthly_project_rank
FROM safety_observer_points sop
JOIN auth.users u ON sop.user_id = u.id
LEFT JOIN projects p ON sop.project_id = p.id;

-- Observation trends by category
CREATE OR REPLACE VIEW safety_observation_trends AS
SELECT
  project_id,
  company_id,
  category,
  observation_type,
  DATE_TRUNC('week', observed_at) as week,
  DATE_TRUNC('month', observed_at) as month,
  COUNT(*) as observation_count,
  AVG(CASE
    WHEN severity = 'low' THEN 1
    WHEN severity = 'medium' THEN 2
    WHEN severity = 'high' THEN 3
    WHEN severity = 'critical' THEN 4
  END) as avg_severity
FROM safety_observations
WHERE deleted_at IS NULL
GROUP BY project_id, company_id, category, observation_type,
         DATE_TRUNC('week', observed_at), DATE_TRUNC('month', observed_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE safety_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_observer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_observation_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_observation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_observation_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for safety_observations
CREATE POLICY "Users can view observations in their projects"
  ON safety_observations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = safety_observations.project_id
        AND pu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users cu
      WHERE cu.company_id = safety_observations.company_id
        AND cu.id = auth.uid()
    )
  );

CREATE POLICY "Users can create observations in their projects"
  ON safety_observations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = safety_observations.project_id
        AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own observations or if assigned"
  ON safety_observations FOR UPDATE
  USING (
    observer_id = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = safety_observations.project_id
        AND pu.user_id = auth.uid()
        AND pu.project_role IN ('admin', 'project_manager', 'safety_manager')
    )
  );

CREATE POLICY "Only admins can delete observations"
  ON safety_observations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = safety_observations.project_id
        AND pu.user_id = auth.uid()
        AND pu.project_role IN ('admin', 'project_manager')
    )
  );

-- Policies for observer points
CREATE POLICY "Users can view leaderboards in their company"
  ON safety_observer_points FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users cu
      WHERE cu.company_id = safety_observer_points.company_id
        AND cu.id = auth.uid()
    )
  );

-- System updates points via trigger
CREATE POLICY "System can update observer points"
  ON safety_observer_points FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for photos
CREATE POLICY "Users can view photos in their projects"
  ON safety_observation_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM safety_observations so
      JOIN project_users pu ON pu.project_id = so.project_id
      WHERE so.id = safety_observation_photos.observation_id
        AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add photos to observations"
  ON safety_observation_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM safety_observations so
      JOIN project_users pu ON pu.project_id = so.project_id
      WHERE so.id = safety_observation_photos.observation_id
        AND pu.user_id = auth.uid()
    )
  );

-- Policies for comments
CREATE POLICY "Users can view comments on observations they can see"
  ON safety_observation_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM safety_observations so
      JOIN project_users pu ON pu.project_id = so.project_id
      WHERE so.id = safety_observation_comments.observation_id
        AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add comments to observations"
  ON safety_observation_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM safety_observations so
      JOIN project_users pu ON pu.project_id = so.project_id
      WHERE so.id = safety_observation_comments.observation_id
        AND pu.user_id = auth.uid()
    )
  );

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON safety_observation_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON safety_observation_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can mark their notifications as read"
  ON safety_observation_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

-- Create storage bucket for observation photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('observation-photos', 'observation-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can read observation photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'observation-photos');

CREATE POLICY "Authenticated users can upload observation photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'observation-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own observation photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'observation-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE safety_observations IS 'Safety observation cards for positive safety reporting';
COMMENT ON TABLE safety_observer_points IS 'Gamification points and statistics for safety observers';
COMMENT ON TABLE safety_observation_photos IS 'Photo attachments for safety observations';
COMMENT ON TABLE safety_observation_comments IS 'Comments and activity log for observations';
COMMENT ON TABLE safety_observation_notifications IS 'Notification records for observation alerts';
COMMENT ON VIEW safety_observation_stats IS 'Aggregated statistics for safety observations by project/company';
COMMENT ON VIEW safety_observer_leaderboard IS 'Ranked leaderboard of top safety observers';
COMMENT ON VIEW safety_observation_trends IS 'Observation trends by category and time period';
