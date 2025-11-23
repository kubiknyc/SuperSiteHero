-- Migration: 008_punch_and_safety.sql
-- Description: Create punch lists and safety management tables
-- Date: 2025-01-19

-- =============================================
-- TABLE: punch_items
-- =============================================
CREATE TABLE punch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Punch Item Info
  number INTEGER,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Location
  building VARCHAR(100),
  floor VARCHAR(100),
  room VARCHAR(100),
  area VARCHAR(100),
  location_notes TEXT,

  -- Trade
  trade VARCHAR(100) NOT NULL,
  subcontractor_id UUID REFERENCES subcontractors(id),

  -- Assignment
  assigned_to UUID REFERENCES users(id),

  -- Status & Priority
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'normal',

  -- Dates
  due_date DATE,
  completed_date DATE,
  verified_date DATE,

  -- Approval Workflow
  marked_complete_by UUID REFERENCES users(id),
  marked_complete_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  rejection_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_punch_items_project_id ON punch_items(project_id);
CREATE INDEX idx_punch_items_subcontractor_id ON punch_items(subcontractor_id);
CREATE INDEX idx_punch_items_trade ON punch_items(trade);
CREATE INDEX idx_punch_items_status ON punch_items(status);
CREATE INDEX idx_punch_items_building_floor ON punch_items(building, floor);
CREATE INDEX idx_punch_items_deleted_at ON punch_items(deleted_at);

-- Trigger
CREATE TRIGGER update_punch_items_updated_at BEFORE UPDATE ON punch_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE punch_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: safety_incidents
-- =============================================
CREATE TABLE safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Incident Info
  incident_number VARCHAR(100),
  incident_type VARCHAR(50) NOT NULL,
  severity VARCHAR(50),

  -- When & Where
  incident_date DATE NOT NULL,
  incident_time TIME,
  location VARCHAR(255),

  -- Who
  person_involved VARCHAR(255),
  company VARCHAR(255),
  subcontractor_id UUID REFERENCES subcontractors(id),
  witness_names TEXT,

  -- What Happened
  description TEXT NOT NULL,
  root_cause TEXT,
  contributing_factors TEXT,

  -- Injury Details
  injury_type VARCHAR(100),
  body_part VARCHAR(100),
  treatment VARCHAR(100),

  -- Reporting
  reported_to_osha BOOLEAN DEFAULT false,
  osha_report_number VARCHAR(100),
  reported_to_owner BOOLEAN DEFAULT false,

  -- Corrective Actions
  immediate_actions TEXT,
  corrective_actions TEXT,

  -- Follow-up
  requires_followup BOOLEAN DEFAULT false,
  followup_notes TEXT,

  -- Notifications
  serious_incident BOOLEAN DEFAULT false,
  notified_users UUID[] DEFAULT ARRAY[]::UUID[],

  -- Status
  status VARCHAR(50) DEFAULT 'open',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_safety_incidents_project_id ON safety_incidents(project_id);
CREATE INDEX idx_safety_incidents_incident_type ON safety_incidents(incident_type);
CREATE INDEX idx_safety_incidents_severity ON safety_incidents(severity);
CREATE INDEX idx_safety_incidents_status ON safety_incidents(status);
CREATE INDEX idx_safety_incidents_deleted_at ON safety_incidents(deleted_at);

-- Trigger
CREATE TRIGGER update_safety_incidents_updated_at BEFORE UPDATE ON safety_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: daily_report_safety_incidents
-- =============================================
CREATE TABLE daily_report_safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  safety_incident_id UUID NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_report_safety_incidents_daily_report_id ON daily_report_safety_incidents(daily_report_id);
CREATE INDEX idx_daily_report_safety_incidents_safety_incident_id ON daily_report_safety_incidents(safety_incident_id);

-- Enable RLS
ALTER TABLE daily_report_safety_incidents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: toolbox_talks
-- =============================================
CREATE TABLE toolbox_talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Talk Info
  talk_date DATE NOT NULL,
  topic VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER,

  -- Trainer
  trainer_name VARCHAR(255),
  trainer_id UUID REFERENCES users(id),

  -- Attendance
  attendees JSONB DEFAULT '[]'::jsonb,
  attendance_count INTEGER DEFAULT 0,

  -- Materials
  handout_url TEXT,

  -- Compliance
  osha_compliant BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_toolbox_talks_project_id ON toolbox_talks(project_id);
CREATE INDEX idx_toolbox_talks_talk_date ON toolbox_talks(talk_date);
CREATE INDEX idx_toolbox_talks_deleted_at ON toolbox_talks(deleted_at);

-- Trigger
CREATE TRIGGER update_toolbox_talks_updated_at BEFORE UPDATE ON toolbox_talks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE toolbox_talks ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 008_punch_and_safety completed successfully';
END $$;