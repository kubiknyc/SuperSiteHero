-- Migration: 006_workflows.sql
-- Description: Create workflow system tables (RFIs, COs, Submittals, etc.)
-- Date: 2025-01-19

-- =============================================
-- TABLE: workflow_types
-- =============================================
CREATE TABLE workflow_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Workflow Info
  name_singular VARCHAR(100) NOT NULL,
  name_plural VARCHAR(100) NOT NULL,
  prefix VARCHAR(10),

  -- Type
  is_default BOOLEAN DEFAULT false,
  is_custom BOOLEAN DEFAULT false,

  -- Configuration
  has_cost_impact BOOLEAN DEFAULT false,
  has_schedule_impact BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,

  -- Status Configuration
  statuses JSONB DEFAULT '[]'::jsonb,

  -- Priority Configuration
  priorities JSONB DEFAULT '[
    {"name": "Low", "color": "#green"},
    {"name": "Normal", "color": "#yellow"},
    {"name": "High", "color": "#red"}
  ]'::jsonb,

  -- Visibility
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_workflow_types_company_id ON workflow_types(company_id);
CREATE INDEX idx_workflow_types_is_default ON workflow_types(is_default);
CREATE INDEX idx_workflow_types_deleted_at ON workflow_types(deleted_at);

-- Trigger
CREATE TRIGGER update_workflow_types_updated_at BEFORE UPDATE ON workflow_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE workflow_types ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: workflow_items
-- =============================================
CREATE TABLE workflow_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workflow_type_id UUID NOT NULL REFERENCES workflow_types(id) ON DELETE CASCADE,

  -- Item Info
  number INTEGER,
  reference_number VARCHAR(100),
  title VARCHAR(255),

  -- Description Fields
  description TEXT,
  more_information TEXT,
  resolution TEXT,

  -- Assignment
  assignees UUID[] DEFAULT ARRAY[]::UUID[],
  raised_by UUID REFERENCES users(id),

  -- Dates
  due_date DATE,
  opened_date TIMESTAMPTZ,
  closed_date TIMESTAMPTZ,

  -- Status & Priority
  status VARCHAR(100) NOT NULL DEFAULT 'draft',
  priority VARCHAR(50) DEFAULT 'normal',

  -- Impacts
  cost_impact DECIMAL(15, 2),
  schedule_impact INTEGER,

  -- Discipline
  discipline VARCHAR(100),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_workflow_items_project_id ON workflow_items(project_id);
CREATE INDEX idx_workflow_items_workflow_type_id ON workflow_items(workflow_type_id);
CREATE INDEX idx_workflow_items_status ON workflow_items(status);
CREATE INDEX idx_workflow_items_assignees ON workflow_items USING GIN(assignees);
CREATE INDEX idx_workflow_items_deleted_at ON workflow_items(deleted_at);

-- Trigger
CREATE TRIGGER update_workflow_items_updated_at BEFORE UPDATE ON workflow_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE workflow_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: workflow_item_comments
-- =============================================
CREATE TABLE workflow_item_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_item_id UUID NOT NULL REFERENCES workflow_items(id) ON DELETE CASCADE,

  -- Comment
  comment TEXT NOT NULL,

  -- Mentions
  mentioned_users UUID[] DEFAULT ARRAY[]::UUID[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_workflow_item_comments_workflow_item_id ON workflow_item_comments(workflow_item_id);
CREATE INDEX idx_workflow_item_comments_deleted_at ON workflow_item_comments(deleted_at);

-- Trigger
CREATE TRIGGER update_workflow_item_comments_updated_at BEFORE UPDATE ON workflow_item_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE workflow_item_comments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: workflow_item_history
-- =============================================
CREATE TABLE workflow_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_item_id UUID NOT NULL REFERENCES workflow_items(id) ON DELETE CASCADE,

  -- Change Info
  action VARCHAR(50) NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,

  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_workflow_item_history_workflow_item_id ON workflow_item_history(workflow_item_id);
CREATE INDEX idx_workflow_item_history_changed_at ON workflow_item_history(changed_at);

-- Enable RLS
ALTER TABLE workflow_item_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: change_order_bids
-- =============================================
CREATE TABLE change_order_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_item_id UUID NOT NULL REFERENCES workflow_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,

  -- Bid Info
  bid_status VARCHAR(50) DEFAULT 'requested',

  -- Pricing
  lump_sum_cost DECIMAL(15, 2),
  duration_days INTEGER,
  exclusions TEXT,

  -- Supporting Info
  notes TEXT,
  supporting_documents JSONB DEFAULT '[]'::jsonb,

  -- Award
  is_awarded BOOLEAN DEFAULT false,
  awarded_at TIMESTAMPTZ,
  awarded_by UUID REFERENCES users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_change_order_bids_workflow_item_id ON change_order_bids(workflow_item_id);
CREATE INDEX idx_change_order_bids_subcontractor_id ON change_order_bids(subcontractor_id);
CREATE INDEX idx_change_order_bids_bid_status ON change_order_bids(bid_status);
CREATE INDEX idx_change_order_bids_deleted_at ON change_order_bids(deleted_at);

-- Trigger
CREATE TRIGGER update_change_order_bids_updated_at BEFORE UPDATE ON change_order_bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE change_order_bids ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: submittal_procurement
-- =============================================
CREATE TABLE submittal_procurement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_item_id UUID NOT NULL REFERENCES workflow_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Procurement Status
  procurement_status VARCHAR(50) DEFAULT 'pending_approval',

  -- Dates
  approval_date DATE,
  order_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,

  -- Lead Time
  lead_time_days INTEGER,

  -- Vendor
  vendor VARCHAR(255),
  order_number VARCHAR(100),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_submittal_procurement_workflow_item_id ON submittal_procurement(workflow_item_id);
CREATE INDEX idx_submittal_procurement_procurement_status ON submittal_procurement(procurement_status);
CREATE INDEX idx_submittal_procurement_deleted_at ON submittal_procurement(deleted_at);

-- Trigger
CREATE TRIGGER update_submittal_procurement_updated_at BEFORE UPDATE ON submittal_procurement
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE submittal_procurement ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 006_workflows completed successfully';
END $$;
