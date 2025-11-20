-- Migration: 003_contacts_and_subcontractors.sql
-- Description: Create contacts and subcontractors tables
-- Date: 2025-01-19

-- =============================================
-- TABLE: contacts
-- =============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Basic Info
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  title VARCHAR(100),

  -- Contact Type
  contact_type VARCHAR(50) NOT NULL,
  trade VARCHAR(100),

  -- Contact Information
  email VARCHAR(255),
  phone_office VARCHAR(50),
  phone_mobile VARCHAR(50),
  phone_fax VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),

  -- Additional Info
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_emergency_contact BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_contacts_project_id ON contacts(project_id);
CREATE INDEX idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX idx_contacts_trade ON contacts(trade);
CREATE INDEX idx_contacts_deleted_at ON contacts(deleted_at);

-- Trigger
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLE: subcontractors
-- =============================================
CREATE TABLE subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Company Info
  company_name VARCHAR(255) NOT NULL,
  trade VARCHAR(100) NOT NULL,

  -- Contract Info
  contract_amount DECIMAL(15, 2),
  contract_start_date DATE,
  contract_end_date DATE,
  retainage_percentage DECIMAL(5, 2) DEFAULT 10.00,

  -- Scope
  scope_of_work TEXT,
  scope_document_url TEXT,

  -- Insurance & Licensing
  license_number VARCHAR(100),
  license_expiration DATE,
  insurance_certificate_url TEXT,
  insurance_expiration DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'active',

  -- Performance
  performance_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_subcontractors_project_id ON subcontractors(project_id);
CREATE INDEX idx_subcontractors_trade ON subcontractors(trade);
CREATE INDEX idx_subcontractors_status ON subcontractors(status);
CREATE INDEX idx_subcontractors_deleted_at ON subcontractors(deleted_at);

-- Trigger
CREATE TRIGGER update_subcontractors_updated_at BEFORE UPDATE ON subcontractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 003_contacts_and_subcontractors completed successfully';
END $$;
