-- Migration: 005_daily_reports.sql
-- Description: Create daily reports tables
-- Date: 2025-01-19

-- =============================================
-- TABLE: daily_reports
-- =============================================
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Report Info
  report_date DATE NOT NULL,
  report_number VARCHAR(50),

  -- People
  reporter_id UUID NOT NULL REFERENCES users(id),
  reviewer_id UUID REFERENCES users(id),

  -- Weather
  weather_condition VARCHAR(100),
  temperature_high DECIMAL(5, 2),
  temperature_low DECIMAL(5, 2),
  precipitation DECIMAL(5, 2),
  wind_speed DECIMAL(5, 2),
  weather_source VARCHAR(50) DEFAULT 'manual',
  weather_delays BOOLEAN DEFAULT false,
  weather_delay_notes TEXT,

  -- Work Performed
  work_completed TEXT,
  production_data JSONB,

  -- Issues/Problems
  issues TEXT,

  -- Observations
  observations TEXT,

  -- General Comments
  comments TEXT,

  -- Status & Workflow
  status VARCHAR(50) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),

  -- PDF Generation
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Unique constraint
  UNIQUE(project_id, report_date)
);

-- Indexes
CREATE INDEX idx_daily_reports_project_id ON daily_reports(project_id);
CREATE INDEX idx_daily_reports_report_date ON daily_reports(report_date);
CREATE INDEX idx_daily_reports_status ON daily_reports(status);
CREATE INDEX idx_daily_reports_deleted_at ON daily_reports(deleted_at);

-- Trigger
CREATE TRIGGER update_daily_reports_updated_at BEFORE UPDATE ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: daily_report_workforce
-- =============================================
CREATE TABLE daily_report_workforce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Workforce Info
  subcontractor_id UUID REFERENCES subcontractors(id),
  trade VARCHAR(100),

  -- Type
  entry_type VARCHAR(20) DEFAULT 'team',

  -- Team Entry
  team_name VARCHAR(255),
  worker_count INTEGER,

  -- Individual Entry
  worker_name VARCHAR(255),

  -- Activity
  activity TEXT,
  hours_worked DECIMAL(5, 2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_report_workforce_daily_report_id ON daily_report_workforce(daily_report_id);
CREATE INDEX idx_daily_report_workforce_subcontractor_id ON daily_report_workforce(subcontractor_id);

-- Enable RLS
ALTER TABLE daily_report_workforce ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: daily_report_equipment
-- =============================================
CREATE TABLE daily_report_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Equipment Info
  equipment_type VARCHAR(100) NOT NULL,
  equipment_description TEXT,
  quantity INTEGER DEFAULT 1,
  owner VARCHAR(100),

  -- Usage
  hours_used DECIMAL(5, 2),
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_report_equipment_daily_report_id ON daily_report_equipment(daily_report_id);

-- Enable RLS
ALTER TABLE daily_report_equipment ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: daily_report_deliveries
-- =============================================
CREATE TABLE daily_report_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Delivery Info
  material_description TEXT NOT NULL,
  quantity VARCHAR(100),
  vendor VARCHAR(255),
  delivery_ticket_number VARCHAR(100),

  -- Time
  delivery_time TIME,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_report_deliveries_daily_report_id ON daily_report_deliveries(daily_report_id);

-- Enable RLS
ALTER TABLE daily_report_deliveries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: daily_report_visitors
-- =============================================
CREATE TABLE daily_report_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Visitor Info
  visitor_name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  purpose TEXT,

  -- Time
  arrival_time TIME,
  departure_time TIME,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_report_visitors_daily_report_id ON daily_report_visitors(daily_report_id);

-- Enable RLS
ALTER TABLE daily_report_visitors ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 005_daily_reports completed successfully';
END $$;
