-- Migration: 010_additional_features.sql
-- Description: Create site instructions, materials, meetings, notices, site conditions, closeout
-- Date: 2025-01-19

-- =============================================
-- TABLE: site_instructions
-- =============================================
CREATE TABLE site_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Instruction Info
  instruction_number VARCHAR(100),
  reference_number VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Issued To
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  issued_to_user_id UUID REFERENCES users(id),

  -- Acknowledgment
  requires_acknowledgment BOOLEAN DEFAULT true,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_signature TEXT,

  -- Completion Tracking
  requires_completion_tracking BOOLEAN DEFAULT true,
  completion_status VARCHAR(50) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  verified_by UUID REFERENCES users(id),

  -- Related Items
  related_to_type VARCHAR(50),
  related_to_id UUID,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_site_instructions_project_id ON site_instructions(project_id);
CREATE INDEX idx_site_instructions_subcontractor_id ON site_instructions(subcontractor_id);
CREATE INDEX idx_site_instructions_completion_status ON site_instructions(completion_status);
CREATE INDEX idx_site_instructions_deleted_at ON site_instructions(deleted_at);

-- Trigger
CREATE TRIGGER update_site_instructions_updated_at BEFORE UPDATE ON site_instructions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE site_instructions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: material_received
-- =============================================
CREATE TABLE material_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Delivery Info
  delivery_date DATE NOT NULL,
  delivery_time TIME,
  delivery_ticket_number VARCHAR(100),

  -- Material Info
  material_description TEXT NOT NULL,
  quantity VARCHAR(100),

  -- Vendor
  vendor VARCHAR(255),
  vendor_contact VARCHAR(255),

  -- Links
  submittal_procurement_id UUID REFERENCES submittal_procurement(id),
  daily_report_delivery_id UUID REFERENCES daily_report_deliveries(id),

  -- Storage
  storage_location VARCHAR(255),

  -- Receiver
  received_by UUID REFERENCES users(id),

  -- Condition
  condition VARCHAR(50) DEFAULT 'good',
  condition_notes TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'received',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_material_received_project_id ON material_received(project_id);
CREATE INDEX idx_material_received_delivery_date ON material_received(delivery_date);
CREATE INDEX idx_material_received_storage_location ON material_received(storage_location);
CREATE INDEX idx_material_received_deleted_at ON material_received(deleted_at);

-- Trigger
CREATE TRIGGER update_material_received_updated_at BEFORE UPDATE ON material_received
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE material_received ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: meetings
-- =============================================
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Meeting Info
  meeting_type VARCHAR(100) NOT NULL,
  meeting_name VARCHAR(255),

  -- When & Where
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  location VARCHAR(255),
  duration_minutes INTEGER,

  -- Attendees
  attendees JSONB DEFAULT '[]'::jsonb,

  -- Agenda & Notes
  agenda TEXT,
  discussion_notes TEXT,
  decisions TEXT,

  -- Action Items
  action_items JSONB DEFAULT '[]'::jsonb,

  -- Minutes
  minutes_pdf_url TEXT,

  -- Distribution
  distributed_to UUID[] DEFAULT ARRAY[]::UUID[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_meetings_project_id ON meetings(project_id);
CREATE INDEX idx_meetings_meeting_type ON meetings(meeting_type);
CREATE INDEX idx_meetings_meeting_date ON meetings(meeting_date);
CREATE INDEX idx_meetings_deleted_at ON meetings(deleted_at);

-- Trigger
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: notices
-- =============================================
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Notice Info
  notice_type VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT,

  -- Direction
  direction VARCHAR(20) NOT NULL,

  -- Parties
  from_party VARCHAR(255),
  to_party VARCHAR(255),

  -- Dates
  notice_date DATE NOT NULL,
  received_date DATE,

  -- Reference
  reference_number VARCHAR(100),

  -- Document
  document_url TEXT,

  -- Response Required
  response_required BOOLEAN DEFAULT false,
  response_due_date DATE,
  response_status VARCHAR(50),
  response_document_url TEXT,
  response_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'active',

  -- Importance
  is_critical BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_notices_project_id ON notices(project_id);
CREATE INDEX idx_notices_notice_type ON notices(notice_type);
CREATE INDEX idx_notices_status ON notices(status);
CREATE INDEX idx_notices_notice_date ON notices(notice_date);
CREATE INDEX idx_notices_deleted_at ON notices(deleted_at);

-- Trigger
CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: site_conditions
-- =============================================
CREATE TABLE site_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Condition Info
  condition_type VARCHAR(50) NOT NULL,
  category VARCHAR(100),

  -- Discovery
  discovered_date DATE NOT NULL,
  location VARCHAR(255),

  -- Description
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Impact
  impact_description TEXT,
  cost_impact DECIMAL(15, 2),
  schedule_impact INTEGER,

  -- Related Items
  related_rfi_id UUID REFERENCES workflow_items(id),
  related_change_order_id UUID REFERENCES workflow_items(id),
  related_site_instruction_id UUID REFERENCES site_instructions(id),

  -- Documentation
  before_photos JSONB DEFAULT '[]'::jsonb,
  after_photos JSONB DEFAULT '[]'::jsonb,

  -- Status
  status VARCHAR(50) DEFAULT 'documented',

  -- Resolution
  resolution TEXT,
  resolved_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_site_conditions_project_id ON site_conditions(project_id);
CREATE INDEX idx_site_conditions_condition_type ON site_conditions(condition_type);
CREATE INDEX idx_site_conditions_category ON site_conditions(category);
CREATE INDEX idx_site_conditions_status ON site_conditions(status);
CREATE INDEX idx_site_conditions_deleted_at ON site_conditions(deleted_at);

-- Trigger
CREATE TRIGGER update_site_conditions_updated_at BEFORE UPDATE ON site_conditions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE site_conditions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: closeout_items
-- =============================================
CREATE TABLE closeout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Item Info
  item_type VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- System/Equipment
  system_category VARCHAR(100),
  equipment_name VARCHAR(255),
  manufacturer VARCHAR(255),
  model_number VARCHAR(100),
  serial_number VARCHAR(100),

  -- Warranty Info
  warranty_start_date DATE,
  warranty_end_date DATE,
  warranty_duration_years INTEGER,
  warranty_contact_name VARCHAR(255),
  warranty_contact_phone VARCHAR(50),
  warranty_contact_email VARCHAR(255),

  -- Documents
  document_urls JSONB DEFAULT '[]'::jsonb,

  -- Related Items
  related_submittal_id UUID REFERENCES workflow_items(id),
  related_drawing_id UUID REFERENCES documents(id),

  -- Completion Status
  is_collected BOOLEAN DEFAULT false,
  collected_date DATE,
  is_delivered_to_owner BOOLEAN DEFAULT false,
  delivered_date DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_closeout_items_project_id ON closeout_items(project_id);
CREATE INDEX idx_closeout_items_item_type ON closeout_items(item_type);
CREATE INDEX idx_closeout_items_system_category ON closeout_items(system_category);
CREATE INDEX idx_closeout_items_is_collected ON closeout_items(is_collected);
CREATE INDEX idx_closeout_items_deleted_at ON closeout_items(deleted_at);

-- Trigger
CREATE TRIGGER update_closeout_items_updated_at BEFORE UPDATE ON closeout_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE closeout_items ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 010_additional_features completed successfully';
END $$;