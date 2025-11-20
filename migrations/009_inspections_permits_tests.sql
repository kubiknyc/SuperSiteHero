-- Migration: 009_inspections_permits_tests.sql
-- Description: Create inspections, permits, and testing tables
-- Date: 2025-01-19

-- =============================================
-- TABLE: inspections
-- =============================================
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Inspection Info
  inspection_type VARCHAR(100) NOT NULL,
  inspection_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Scheduling
  scheduled_date DATE,
  scheduled_time TIME,
  inspector_name VARCHAR(255),
  inspector_company VARCHAR(255),
  inspector_phone VARCHAR(50),

  -- Reminder
  reminder_sent BOOLEAN DEFAULT false,
  reminder_days_before INTEGER DEFAULT 1,

  -- Results
  result VARCHAR(50),
  result_date DATE,
  inspector_notes TEXT,

  -- Failed Inspection Workflow
  failure_reasons TEXT,
  corrective_actions_required TEXT,
  reinspection_scheduled_date DATE,

  -- Related Items
  related_checklist_id UUID REFERENCES checklists(id),

  -- Notifications
  notify_subcontractors UUID[] DEFAULT ARRAY[]::UUID[],

  -- Status
  status VARCHAR(50) DEFAULT 'scheduled',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_inspections_project_id ON inspections(project_id);
CREATE INDEX idx_inspections_inspection_type ON inspections(inspection_type);
CREATE INDEX idx_inspections_scheduled_date ON inspections(scheduled_date);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_deleted_at ON inspections(deleted_at);

-- Trigger
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: permits
-- =============================================
CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Permit Info
  permit_type VARCHAR(100) NOT NULL,
  permit_name VARCHAR(255) NOT NULL,
  permit_number VARCHAR(100),

  -- Issuing Agency
  issuing_agency VARCHAR(255),
  agency_contact VARCHAR(255),
  agency_phone VARCHAR(50),

  -- Dates
  application_date DATE,
  issue_date DATE,
  expiration_date DATE,
  renewal_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'applied',

  -- Documents
  permit_document_url TEXT,

  -- Required Inspections
  requires_inspections BOOLEAN DEFAULT false,

  -- Renewal Reminder
  renewal_reminder_sent BOOLEAN DEFAULT false,
  renewal_reminder_days_before INTEGER DEFAULT 30,

  -- Critical Flag
  work_cannot_proceed_without BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_permits_project_id ON permits(project_id);
CREATE INDEX idx_permits_permit_type ON permits(permit_type);
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_expiration_date ON permits(expiration_date);
CREATE INDEX idx_permits_deleted_at ON permits(deleted_at);

-- Trigger
CREATE TRIGGER update_permits_updated_at BEFORE UPDATE ON permits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;

-- Add foreign key to inspections (permits table must exist first)
ALTER TABLE inspections ADD COLUMN related_permit_id UUID REFERENCES permits(id);

-- =============================================
-- TABLE: tests
-- =============================================
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Test Info
  test_type VARCHAR(100) NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  specification_reference VARCHAR(100),

  -- Scheduling
  scheduled_date DATE,
  actual_test_date DATE,

  -- Testing Agency
  testing_agency VARCHAR(255),
  technician_name VARCHAR(255),
  technician_contact VARCHAR(100),

  -- Frequency
  required_frequency VARCHAR(100),
  test_number INTEGER,

  -- Results
  result VARCHAR(50),
  result_value VARCHAR(100),
  acceptance_criteria VARCHAR(255),

  -- Documents
  test_report_url TEXT,
  certificate_url TEXT,

  -- Failed Test Handling
  failure_notes TEXT,
  corrective_actions TEXT,
  retest_required BOOLEAN DEFAULT false,
  retest_scheduled_date DATE,
  retest_id UUID REFERENCES tests(id),

  -- Related Items
  related_inspection_id UUID REFERENCES inspections(id),
  related_submittal_id UUID REFERENCES workflow_items(id),

  -- Closeout
  required_for_closeout BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(50) DEFAULT 'scheduled',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tests_project_id ON tests(project_id);
CREATE INDEX idx_tests_test_type ON tests(test_type);
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_result ON tests(result);
CREATE INDEX idx_tests_deleted_at ON tests(deleted_at);

-- Trigger
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 009_inspections_permits_tests completed successfully';
END $$;
