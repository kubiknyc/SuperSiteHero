-- Migration: 028_safety_incidents.sql
-- Description: Safety Incident Reporting System
-- Created: 2025-11-28
--
-- This migration creates the safety incident reporting infrastructure:
-- - safety_incidents: Main incident records
-- - safety_incident_people: People involved (injured/witnesses)
-- - safety_incident_photos: Photo documentation
-- - safety_incident_corrective_actions: Corrective action tracking

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Incident severity levels (OSHA-aligned)
CREATE TYPE incident_severity AS ENUM (
  'near_miss',        -- No injury, but could have resulted in one
  'first_aid',        -- Minor injury requiring first aid only
  'medical_treatment', -- Required medical treatment beyond first aid
  'lost_time',        -- Resulted in lost work time
  'fatality'          -- Fatal incident
);

-- Types of incidents
CREATE TYPE incident_type AS ENUM (
  'injury',           -- Personal injury
  'illness',          -- Occupational illness
  'property_damage',  -- Damage to property/equipment
  'environmental',    -- Environmental incident (spill, etc.)
  'near_miss',        -- Near miss event
  'other'             -- Other incident type
);

-- Incident status workflow
CREATE TYPE incident_status AS ENUM (
  'reported',           -- Initially reported
  'under_investigation', -- Being investigated
  'corrective_actions', -- Corrective actions in progress
  'closed'              -- Incident closed
);

-- Person involvement type
CREATE TYPE incident_person_type AS ENUM (
  'injured_party',    -- Person who was injured
  'witness',          -- Witness to the incident
  'first_responder',  -- First responder on scene
  'supervisor'        -- Supervisor notified
);

-- Corrective action status
CREATE TYPE corrective_action_status AS ENUM (
  'pending',      -- Not yet started
  'in_progress',  -- Work in progress
  'completed',    -- Completed
  'overdue'       -- Past due date and not completed
);

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- Safety Incidents - Main incident records
CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identification
  incident_number TEXT NOT NULL,

  -- When and where
  incident_date DATE NOT NULL,
  incident_time TIME,
  location TEXT, -- Specific location on site

  -- Who reported
  reported_by UUID REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),

  -- What happened
  description TEXT NOT NULL,

  -- Classification
  severity incident_severity NOT NULL DEFAULT 'near_miss',
  incident_type incident_type NOT NULL DEFAULT 'near_miss',
  status incident_status NOT NULL DEFAULT 'reported',

  -- Investigation details
  root_cause TEXT,
  immediate_actions TEXT, -- Actions taken immediately after incident
  preventive_measures TEXT, -- How to prevent recurrence

  -- OSHA tracking
  osha_recordable BOOLEAN DEFAULT FALSE,
  osha_report_number TEXT,
  days_away_from_work INTEGER DEFAULT 0,
  days_restricted_duty INTEGER DEFAULT 0,

  -- Environmental conditions
  weather_conditions TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_days_away CHECK (days_away_from_work >= 0),
  CONSTRAINT valid_days_restricted CHECK (days_restricted_duty >= 0)
);

-- Safety Incident People - People involved in the incident
CREATE TABLE IF NOT EXISTS safety_incident_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,

  -- Person type
  person_type incident_person_type NOT NULL,

  -- Person details
  name TEXT NOT NULL,
  company_name TEXT, -- Their employer (may be different from project company)
  job_title TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- Statement/details
  statement TEXT, -- Witness statement or description

  -- Injury details (for injured_party type)
  injury_description TEXT,
  body_part_affected TEXT,
  treatment_provided TEXT,
  hospitalized BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety Incident Photos - Photo documentation
CREATE TABLE IF NOT EXISTS safety_incident_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,

  -- Photo details
  photo_url TEXT NOT NULL,
  caption TEXT,
  taken_at TIMESTAMPTZ,

  -- Who uploaded
  uploaded_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety Incident Corrective Actions - Track corrective actions
CREATE TABLE IF NOT EXISTS safety_incident_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,

  -- Action details
  description TEXT NOT NULL,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_to_name TEXT, -- For external assignees not in system

  -- Dates
  due_date DATE,
  completed_date DATE,

  -- Status
  status corrective_action_status NOT NULL DEFAULT 'pending',

  -- Notes
  notes TEXT,

  -- Link to task system (optional)
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate incident number (INC-YYYY-NNNN)
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(NEW.incident_date, 'YYYY');

  -- Get the next sequence number for this year and company
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(incident_number FROM 10 FOR 4) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM safety_incidents
  WHERE company_id = NEW.company_id
    AND incident_number LIKE 'INC-' || year_part || '-%';

  new_number := 'INC-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.incident_number := new_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generating incident number
CREATE TRIGGER trigger_generate_incident_number
  BEFORE INSERT ON safety_incidents
  FOR EACH ROW
  WHEN (NEW.incident_number IS NULL OR NEW.incident_number = '')
  EXECUTE FUNCTION generate_incident_number();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_safety_incident_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_safety_incident_timestamp
  BEFORE UPDATE ON safety_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_safety_incident_timestamp();

CREATE TRIGGER trigger_update_corrective_action_timestamp
  BEFORE UPDATE ON safety_incident_corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_safety_incident_timestamp();

-- Auto-update corrective action status to overdue
CREATE OR REPLACE FUNCTION check_overdue_corrective_actions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' OR NEW.status = 'in_progress' THEN
    IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.completed_date IS NULL THEN
      NEW.status := 'overdue';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_overdue_corrective_actions
  BEFORE INSERT OR UPDATE ON safety_incident_corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION check_overdue_corrective_actions();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup indexes (using IF NOT EXISTS to handle pre-existing tables)
CREATE INDEX IF NOT EXISTS idx_safety_incidents_project ON safety_incidents(project_id);
-- Note: company_id index skipped if column doesn't exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_incidents' AND column_name = 'company_id') THEN
    CREATE INDEX IF NOT EXISTS idx_safety_incidents_company ON safety_incidents(company_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_safety_incidents_date ON safety_incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity ON safety_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_type ON safety_incidents(incident_type);
-- Conditional indexes for columns that may not exist in pre-existing table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_incidents' AND column_name = 'osha_recordable') THEN
    CREATE INDEX IF NOT EXISTS idx_safety_incidents_osha ON safety_incidents(osha_recordable) WHERE osha_recordable = TRUE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_incidents' AND column_name = 'deleted_at') THEN
    CREATE INDEX IF NOT EXISTS idx_safety_incidents_deleted ON safety_incidents(deleted_at) WHERE deleted_at IS NULL;
  END IF;
END $$;

-- People indexes
CREATE INDEX IF NOT EXISTS idx_safety_incident_people_incident ON safety_incident_people(incident_id);
CREATE INDEX IF NOT EXISTS idx_safety_incident_people_type ON safety_incident_people(person_type);

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_safety_incident_photos_incident ON safety_incident_photos(incident_id);

-- Corrective actions indexes
CREATE INDEX IF NOT EXISTS idx_safety_corrective_actions_incident ON safety_incident_corrective_actions(incident_id);
CREATE INDEX IF NOT EXISTS idx_safety_corrective_actions_status ON safety_incident_corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_safety_corrective_actions_due ON safety_incident_corrective_actions(due_date) WHERE completed_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_safety_corrective_actions_assigned ON safety_incident_corrective_actions(assigned_to);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incident_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incident_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incident_corrective_actions ENABLE ROW LEVEL SECURITY;

-- Safety Incidents policies
CREATE POLICY "Users can view incidents in their company's projects"
  ON safety_incidents FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create incidents in their projects"
  ON safety_incidents FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update incidents in their projects"
  ON safety_incidents FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- Note: reported_by column may not exist in pre-existing table
-- Using project-based access control instead
CREATE POLICY "Users can delete incidents in their projects"
  ON safety_incidents FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- Safety Incident People policies
CREATE POLICY "Users can view people for incidents they can see"
  ON safety_incident_people FOR SELECT
  USING (
    incident_id IN (
      SELECT id FROM safety_incidents
      WHERE project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage people for incidents in their projects"
  ON safety_incident_people FOR ALL
  USING (
    incident_id IN (
      SELECT id FROM safety_incidents
      WHERE project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
      )
    )
  );

-- Safety Incident Photos policies
CREATE POLICY "Users can view photos for incidents they can see"
  ON safety_incident_photos FOR SELECT
  USING (
    incident_id IN (
      SELECT id FROM safety_incidents
      WHERE project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage photos for incidents in their projects"
  ON safety_incident_photos FOR ALL
  USING (
    incident_id IN (
      SELECT id FROM safety_incidents
      WHERE project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
      )
    )
  );

-- Safety Incident Corrective Actions policies
CREATE POLICY "Users can view actions for incidents they can see"
  ON safety_incident_corrective_actions FOR SELECT
  USING (
    incident_id IN (
      SELECT id FROM safety_incidents
      WHERE project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage actions for incidents in their projects"
  ON safety_incident_corrective_actions FOR ALL
  USING (
    incident_id IN (
      SELECT id FROM safety_incidents
      WHERE project_id IN (
        SELECT p.id FROM projects p
        JOIN project_users pu ON p.id = pu.project_id
        WHERE pu.user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- VIEWS (Simplified - only create if expected columns exist)
-- ============================================================================

-- Incident statistics view (basic version without company_id)
CREATE OR REPLACE VIEW safety_incident_stats AS
SELECT
  project_id,
  COUNT(*) as total_incidents,
  COUNT(*) FILTER (WHERE severity = 'near_miss') as near_misses,
  COUNT(*) FILTER (WHERE severity = 'first_aid') as first_aid_incidents,
  COUNT(*) FILTER (WHERE severity = 'medical_treatment') as medical_treatment_incidents,
  COUNT(*) FILTER (WHERE severity = 'lost_time') as lost_time_incidents,
  COUNT(*) FILTER (WHERE severity = 'fatality') as fatalities,
  COUNT(*) FILTER (WHERE status = 'reported') as open_incidents,
  COUNT(*) FILTER (WHERE status = 'closed') as closed_incidents,
  MAX(incident_date) as last_incident_date
FROM safety_incidents
GROUP BY project_id;

-- Days since last incident view (basic version without company_id)
CREATE OR REPLACE VIEW days_since_last_incident AS
SELECT
  project_id,
  CURRENT_DATE - MAX(incident_date) as days_since_incident
FROM safety_incidents
WHERE severity != 'near_miss' -- Don't count near misses for "days since"
GROUP BY project_id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE safety_incidents IS 'Safety incident reports for construction projects';
COMMENT ON TABLE safety_incident_people IS 'People involved in safety incidents (injured parties, witnesses, etc.)';
COMMENT ON TABLE safety_incident_photos IS 'Photo documentation for safety incidents';
COMMENT ON TABLE safety_incident_corrective_actions IS 'Corrective actions to address safety incidents';

-- Column comments (skipped if columns don't exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_incidents' AND column_name = 'incident_number') THEN
    COMMENT ON COLUMN safety_incidents.incident_number IS 'Auto-generated incident number (INC-YYYY-NNNN)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_incidents' AND column_name = 'osha_recordable') THEN
    COMMENT ON COLUMN safety_incidents.osha_recordable IS 'Whether this incident must be recorded on OSHA 300 log';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_incidents' AND column_name = 'days_away_from_work') THEN
    COMMENT ON COLUMN safety_incidents.days_away_from_work IS 'OSHA metric: days employee was away from work';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_incidents' AND column_name = 'days_restricted_duty') THEN
    COMMENT ON COLUMN safety_incidents.days_restricted_duty IS 'OSHA metric: days employee was on restricted duty';
  END IF;
END $$;

-- ============================================================================
-- ADDITIONAL TABLES FOR P0 COMPLETION
-- ============================================================================

-- Root cause category enum
DO $$ BEGIN
  CREATE TYPE root_cause_category AS ENUM (
    'human_error',
    'equipment_failure',
    'process_failure',
    'environmental',
    'training',
    'communication',
    'ppe',
    'supervision',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add root_cause_category column to safety_incidents if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'safety_incidents' AND column_name = 'root_cause_category'
  ) THEN
    ALTER TABLE safety_incidents ADD COLUMN root_cause_category root_cause_category;
  END IF;
END $$;

-- Add contributing_factors JSONB column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'safety_incidents' AND column_name = 'contributing_factors'
  ) THEN
    ALTER TABLE safety_incidents ADD COLUMN contributing_factors JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Incident Notifications - Track notifications for serious incidents
CREATE TABLE IF NOT EXISTS incident_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'in_app', 'sms')),
  subject TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE incident_notifications IS 'Tracks notifications sent for serious safety incidents';

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_incident_notifications_incident ON incident_notifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_notifications_user ON incident_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_notifications_unread ON incident_notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incident_notifications_status ON incident_notifications(delivery_status);

-- Enable RLS for notifications
ALTER TABLE incident_notifications ENABLE ROW LEVEL SECURITY;

-- Notification policies
CREATE POLICY "Users can view their own incident notifications"
  ON incident_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert incident notifications"
  ON incident_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own incident notifications"
  ON incident_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Function to check if an incident is serious (requires notification)
CREATE OR REPLACE FUNCTION is_serious_incident(p_severity incident_severity)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_severity IN ('medical_treatment', 'lost_time', 'fatality');
END;
$$ LANGUAGE plpgsql;

-- Function to get project users for notification
CREATE OR REPLACE FUNCTION get_project_users_for_notification(p_project_id UUID)
RETURNS TABLE (user_id UUID, email TEXT, full_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name
  FROM auth.users u
  JOIN project_users pu ON u.id = pu.user_id
  WHERE pu.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_incident_people TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_incident_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_incident_corrective_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON incident_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION is_serious_incident TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_users_for_notification TO authenticated;

-- Create bucket for incident photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-photos', 'incident-photos', false)
ON CONFLICT (id) DO NOTHING;
