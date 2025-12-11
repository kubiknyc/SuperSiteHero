-- Migration: 095_daily_reports_v2.sql
-- Description: Complete redesign of daily reports for 10/10 construction industry compliance
-- Date: 2024-12-09
-- Features: Delay tracking, safety incidents, inspections, T&M work, progress tracking, enhanced workflow

-- =============================================
-- CLEANUP: Drop new tables from partial runs (safe - these are new tables with no production data)
-- =============================================
DROP TABLE IF EXISTS daily_report_templates CASCADE;
DROP TABLE IF EXISTS daily_report_photos CASCADE;
DROP TABLE IF EXISTS daily_report_progress CASCADE;
DROP TABLE IF EXISTS daily_report_tm_work CASCADE;
DROP TABLE IF EXISTS daily_report_inspections CASCADE;
DROP TABLE IF EXISTS daily_report_safety_incidents CASCADE;
DROP TABLE IF EXISTS daily_report_delays CASCADE;

-- =============================================
-- PHASE 1: Enhance daily_reports table
-- =============================================

-- Shift/Time tracking (Critical for claims)
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS shift_start_time TIME;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS shift_end_time TIME;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20) DEFAULT 'regular';
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS total_hours DECIMAL(5,2);

-- Enhanced weather
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS weather_delay_hours DECIMAL(5,2);
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS humidity_percentage INTEGER;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS wind_direction VARCHAR(20);
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS weather_fetched_at TIMESTAMPTZ;

-- Work narrative
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS work_summary TEXT;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS work_planned_tomorrow TEXT;

-- Progress tracking
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS overall_progress_percentage INTEGER;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS schedule_status VARCHAR(20);
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS schedule_variance_days INTEGER;

-- Enhanced signatures
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS submitted_by_signature TEXT;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS submitted_by_name VARCHAR(255);
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS approved_by_signature TEXT;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255);
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS approval_comments TEXT;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Form mode
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'quick';

-- =============================================
-- PHASE 2: Enhance daily_report_workforce table
-- =============================================

-- Company/Subcontractor tracking (Critical for billing)
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS foreman_name VARCHAR(255);
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS apprentice_count INTEGER DEFAULT 0;
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS worker_id VARCHAR(100);

-- Location/Cost tracking (Critical for claims)
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS work_area VARCHAR(255);
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS cost_code VARCHAR(50);
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS phase_code VARCHAR(50);

-- Time tracking
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS hours_regular DECIMAL(5,2);
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS hours_overtime DECIMAL(5,2);
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS hours_double_time DECIMAL(5,2);
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER;

-- Progress
ALTER TABLE daily_report_workforce ADD COLUMN IF NOT EXISTS work_completed_percentage INTEGER;

-- =============================================
-- PHASE 3: Enhance daily_report_equipment table
-- =============================================

ALTER TABLE daily_report_equipment ADD COLUMN IF NOT EXISTS equipment_id VARCHAR(100);
ALTER TABLE daily_report_equipment ADD COLUMN IF NOT EXISTS owner_type VARCHAR(20) DEFAULT 'owned';
ALTER TABLE daily_report_equipment ADD COLUMN IF NOT EXISTS rental_company VARCHAR(255);
ALTER TABLE daily_report_equipment ADD COLUMN IF NOT EXISTS hours_idle DECIMAL(5,2);
ALTER TABLE daily_report_equipment ADD COLUMN IF NOT EXISTS hours_breakdown DECIMAL(5,2);
ALTER TABLE daily_report_equipment ADD COLUMN IF NOT EXISTS fuel_used DECIMAL(8,2);
ALTER TABLE daily_report_equipment ADD COLUMN IF NOT EXISTS work_area VARCHAR(255);
ALTER TABLE daily_report_equipment ADD COLUMN IF NOT EXISTS cost_code VARCHAR(50);
ALTER TABLE daily_report_equipment ADD COLUMN IF NOT EXISTS operator_name VARCHAR(255);

-- =============================================
-- PHASE 4: NEW TABLE - daily_report_delays (CRITICAL)
-- =============================================

CREATE TABLE IF NOT EXISTS daily_report_delays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Delay classification (Critical for claims defense)
  delay_type VARCHAR(50) NOT NULL,
  delay_category VARCHAR(50),

  -- Details
  description TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_hours DECIMAL(5,2),
  duration_days DECIMAL(5,2),

  -- Impact assessment
  affected_areas TEXT[],
  affected_trades TEXT[],
  affected_activities TEXT,
  schedule_impact_days INTEGER,
  cost_impact_estimate DECIMAL(12,2),

  -- Responsibility
  responsible_party VARCHAR(255),
  responsible_company VARCHAR(255),

  -- Notification tracking
  notified_parties TEXT[],
  notification_method VARCHAR(100),
  notification_date DATE,

  -- Links to other records
  rfi_id UUID,
  change_order_id UUID,
  supporting_photo_ids TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_report_delays_report ON daily_report_delays(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_daily_report_delays_type ON daily_report_delays(delay_type);
CREATE INDEX IF NOT EXISTS idx_daily_report_delays_date ON daily_report_delays(created_at);

-- Enable RLS
ALTER TABLE daily_report_delays ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 5: NEW TABLE - daily_report_safety_incidents
-- =============================================

CREATE TABLE IF NOT EXISTS daily_report_safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Incident classification
  incident_type VARCHAR(50) NOT NULL,
  incident_category VARCHAR(100),
  osha_reportable BOOLEAN DEFAULT false,
  osha_case_number VARCHAR(50),

  -- Incident details
  incident_time TIME,
  incident_location VARCHAR(255),
  description TEXT NOT NULL,
  immediate_cause TEXT,
  root_cause TEXT,

  -- Injured party (if applicable)
  injured_party_name VARCHAR(255),
  injured_party_company VARCHAR(255),
  injured_party_trade VARCHAR(100),
  injury_type VARCHAR(255),
  body_part_affected VARCHAR(255),
  treatment_provided TEXT,
  medical_facility VARCHAR(255),
  returned_to_work BOOLEAN,
  return_date DATE,

  -- Corrective actions
  immediate_actions TEXT,
  corrective_actions TEXT,
  preventive_measures TEXT,
  responsible_party VARCHAR(255),
  completion_due_date DATE,
  completion_status VARCHAR(50) DEFAULT 'pending',

  -- Notifications
  reported_to TEXT[],
  reported_by VARCHAR(255),
  reported_at TIMESTAMPTZ,
  client_notified BOOLEAN DEFAULT false,
  insurance_notified BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_incidents_report ON daily_report_safety_incidents(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_type ON daily_report_safety_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_osha ON daily_report_safety_incidents(osha_reportable) WHERE osha_reportable = true;

-- Enable RLS
ALTER TABLE daily_report_safety_incidents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 6: NEW TABLE - daily_report_inspections
-- =============================================

CREATE TABLE IF NOT EXISTS daily_report_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Inspection info
  inspection_type VARCHAR(255) NOT NULL,
  inspection_category VARCHAR(50),
  inspector_name VARCHAR(255),
  inspector_company VARCHAR(255),
  inspection_time TIME,

  -- Results
  result VARCHAR(50),
  pass_with_conditions TEXT,
  deficiencies_noted TEXT,
  corrective_actions_required TEXT,
  reinspection_required BOOLEAN DEFAULT false,
  reinspection_date DATE,

  -- Permit info
  permit_number VARCHAR(100),
  permit_type VARCHAR(100),

  -- Notes and photos
  notes TEXT,
  supporting_photo_ids TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_report ON daily_report_inspections(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_inspections_result ON daily_report_inspections(result);
CREATE INDEX IF NOT EXISTS idx_inspections_type ON daily_report_inspections(inspection_type);

-- Enable RLS
ALTER TABLE daily_report_inspections ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 7: NEW TABLE - daily_report_tm_work (Time & Materials)
-- =============================================

CREATE TABLE IF NOT EXISTS daily_report_tm_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Reference numbers
  work_order_number VARCHAR(100),
  change_order_id UUID,

  -- Description
  description TEXT NOT NULL,

  -- Labor (JSONB for flexibility)
  labor_entries JSONB DEFAULT '[]',
  total_labor_hours DECIMAL(8,2),
  total_labor_cost DECIMAL(12,2),

  -- Materials
  materials_used JSONB DEFAULT '[]',
  total_materials_cost DECIMAL(12,2),

  -- Equipment
  equipment_used JSONB DEFAULT '[]',
  total_equipment_cost DECIMAL(12,2),

  -- Total
  total_cost DECIMAL(12,2),

  -- Authorization
  authorized_by VARCHAR(255),
  authorization_signature TEXT,
  authorization_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tm_work_report ON daily_report_tm_work(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_tm_work_wo ON daily_report_tm_work(work_order_number);

-- Enable RLS
ALTER TABLE daily_report_tm_work ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 8: NEW TABLE - daily_report_progress
-- =============================================

CREATE TABLE IF NOT EXISTS daily_report_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Activity reference
  activity_id VARCHAR(100),
  activity_name VARCHAR(255) NOT NULL,
  cost_code VARCHAR(50),
  work_area VARCHAR(255),

  -- Schedule dates
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,

  -- Progress percentages
  planned_percentage_today DECIMAL(5,2),
  actual_percentage_today DECIMAL(5,2),
  cumulative_percentage DECIMAL(5,2),
  variance_percentage DECIMAL(5,2),

  -- Quantities
  unit_of_measure VARCHAR(20),
  planned_quantity_today DECIMAL(12,2),
  actual_quantity_today DECIMAL(12,2),
  cumulative_quantity DECIMAL(12,2),
  total_planned_quantity DECIMAL(12,2),

  -- Variance notes
  variance_reason TEXT,
  corrective_action TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_report ON daily_report_progress(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_progress_activity ON daily_report_progress(activity_id);
CREATE INDEX IF NOT EXISTS idx_progress_cost_code ON daily_report_progress(cost_code);

-- Enable RLS
ALTER TABLE daily_report_progress ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 9: Enhance daily_report_deliveries
-- =============================================

ALTER TABLE daily_report_deliveries ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);
ALTER TABLE daily_report_deliveries ADD COLUMN IF NOT EXISTS receiving_employee VARCHAR(255);
ALTER TABLE daily_report_deliveries ADD COLUMN IF NOT EXISTS inspection_status VARCHAR(50) DEFAULT 'pending_inspection';
ALTER TABLE daily_report_deliveries ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE daily_report_deliveries ADD COLUMN IF NOT EXISTS storage_location VARCHAR(255);
ALTER TABLE daily_report_deliveries ADD COLUMN IF NOT EXISTS cost_code VARCHAR(50);

-- =============================================
-- PHASE 10: Enhance daily_report_visitors
-- =============================================

ALTER TABLE daily_report_visitors ADD COLUMN IF NOT EXISTS badge_number VARCHAR(50);
ALTER TABLE daily_report_visitors ADD COLUMN IF NOT EXISTS safety_orientation_completed BOOLEAN DEFAULT false;
ALTER TABLE daily_report_visitors ADD COLUMN IF NOT EXISTS escort_required BOOLEAN DEFAULT false;
ALTER TABLE daily_report_visitors ADD COLUMN IF NOT EXISTS escort_name VARCHAR(255);
ALTER TABLE daily_report_visitors ADD COLUMN IF NOT EXISTS areas_accessed TEXT[];
ALTER TABLE daily_report_visitors ADD COLUMN IF NOT EXISTS photos_taken BOOLEAN DEFAULT false;
ALTER TABLE daily_report_visitors ADD COLUMN IF NOT EXISTS nda_signed BOOLEAN DEFAULT false;

-- =============================================
-- PHASE 11: NEW TABLE - daily_report_photos (Enhanced)
-- =============================================

CREATE TABLE IF NOT EXISTS daily_report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- File info
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER,

  -- Categorization
  caption TEXT,
  category VARCHAR(50) DEFAULT 'general',

  -- Location/Cost tracking
  work_area VARCHAR(255),
  cost_code VARCHAR(50),

  -- GPS metadata
  gps_latitude DECIMAL(10,8),
  gps_longitude DECIMAL(11,8),
  compass_heading DECIMAL(5,2),

  -- Timestamps
  taken_at TIMESTAMPTZ,
  taken_by VARCHAR(255),

  -- Linking to other entities
  linked_to_type VARCHAR(50),
  linked_to_id UUID,

  -- Upload status
  upload_status VARCHAR(20) DEFAULT 'pending',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_report ON daily_report_photos(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_photos_category ON daily_report_photos(category);
CREATE INDEX IF NOT EXISTS idx_photos_linked ON daily_report_photos(linked_to_type, linked_to_id);

-- Enable RLS
ALTER TABLE daily_report_photos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 12: NEW TABLE - daily_report_templates
-- =============================================

CREATE TABLE IF NOT EXISTS daily_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Template info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,

  -- Template data (snapshot of workforce/equipment)
  workforce_template JSONB DEFAULT '[]',
  equipment_template JSONB DEFAULT '[]',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_project ON daily_report_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_templates_user ON daily_report_templates(user_id);

-- Enable RLS
ALTER TABLE daily_report_templates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 13: RLS POLICIES
-- =============================================

-- daily_report_delays policies
CREATE POLICY "Users can view delays for their project reports" ON daily_report_delays
  FOR SELECT USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert delays for their project reports" ON daily_report_delays
  FOR INSERT WITH CHECK (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update delays for their project reports" ON daily_report_delays
  FOR UPDATE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete delays for their project reports" ON daily_report_delays
  FOR DELETE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- daily_report_safety_incidents policies
CREATE POLICY "Users can view safety incidents for their project reports" ON daily_report_safety_incidents
  FOR SELECT USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert safety incidents for their project reports" ON daily_report_safety_incidents
  FOR INSERT WITH CHECK (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update safety incidents for their project reports" ON daily_report_safety_incidents
  FOR UPDATE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete safety incidents for their project reports" ON daily_report_safety_incidents
  FOR DELETE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- daily_report_inspections policies
CREATE POLICY "Users can view inspections for their project reports" ON daily_report_inspections
  FOR SELECT USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert inspections for their project reports" ON daily_report_inspections
  FOR INSERT WITH CHECK (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update inspections for their project reports" ON daily_report_inspections
  FOR UPDATE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete inspections for their project reports" ON daily_report_inspections
  FOR DELETE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- daily_report_tm_work policies
CREATE POLICY "Users can view T&M work for their project reports" ON daily_report_tm_work
  FOR SELECT USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert T&M work for their project reports" ON daily_report_tm_work
  FOR INSERT WITH CHECK (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update T&M work for their project reports" ON daily_report_tm_work
  FOR UPDATE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete T&M work for their project reports" ON daily_report_tm_work
  FOR DELETE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- daily_report_progress policies
CREATE POLICY "Users can view progress for their project reports" ON daily_report_progress
  FOR SELECT USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert progress for their project reports" ON daily_report_progress
  FOR INSERT WITH CHECK (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update progress for their project reports" ON daily_report_progress
  FOR UPDATE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete progress for their project reports" ON daily_report_progress
  FOR DELETE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- daily_report_photos policies
CREATE POLICY "Users can view photos for their project reports" ON daily_report_photos
  FOR SELECT USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert photos for their project reports" ON daily_report_photos
  FOR INSERT WITH CHECK (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update photos for their project reports" ON daily_report_photos
  FOR UPDATE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos for their project reports" ON daily_report_photos
  FOR DELETE USING (
    daily_report_id IN (
      SELECT dr.id FROM daily_reports dr
      JOIN project_users pu ON dr.project_id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- daily_report_templates policies
CREATE POLICY "Users can view templates for their projects" ON daily_report_templates
  FOR SELECT USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own templates" ON daily_report_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates" ON daily_report_templates
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates" ON daily_report_templates
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- PHASE 14: Update triggers
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_report_delays_updated_at
  BEFORE UPDATE ON daily_report_delays
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_report_safety_incidents_updated_at
  BEFORE UPDATE ON daily_report_safety_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_report_inspections_updated_at
  BEFORE UPDATE ON daily_report_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_report_tm_work_updated_at
  BEFORE UPDATE ON daily_report_tm_work
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_report_progress_updated_at
  BEFORE UPDATE ON daily_report_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_report_templates_updated_at
  BEFORE UPDATE ON daily_report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Success message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 095_daily_reports_v2 completed successfully';
  RAISE NOTICE 'New tables created: daily_report_delays, daily_report_safety_incidents, daily_report_inspections, daily_report_tm_work, daily_report_progress, daily_report_photos, daily_report_templates';
  RAISE NOTICE 'Enhanced tables: daily_reports, daily_report_workforce, daily_report_equipment, daily_report_deliveries, daily_report_visitors';
END $$;
