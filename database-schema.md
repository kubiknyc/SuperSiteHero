# Database Schema Design

## Overview

This database schema is designed for PostgreSQL (via Supabase) and implements a multi-tenant architecture where each construction company is isolated using Row-Level Security (RLS) policies.

**Key Design Principles:**
- Multi-tenant isolation (company data is completely separated)
- Audit trails (created_at, updated_at, created_by on all tables)
- Soft deletes (deleted_at for most entities, allows recovery)
- Foreign key constraints (data integrity)
- Indexes on frequently queried columns (performance)
- JSONB fields for flexible metadata (when needed)
- Row-Level Security policies (security)

---

## Core Tables

### 1. companies

The top-level tenant entity. Each construction company is a separate tenant.

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier

  -- Contact Information
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',

  -- Branding
  logo_url TEXT, -- Supabase Storage URL
  primary_color VARCHAR(7), -- Hex color for branding

  -- Subscription & Billing
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, small, medium, large, enterprise
  subscription_status VARCHAR(50) DEFAULT 'active', -- active, suspended, cancelled
  max_projects INTEGER DEFAULT 1,

  -- Settings (JSONB for flexibility)
  settings JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_deleted_at ON companies(deleted_at);

-- Trigger for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. users

Users belong to a company and have roles. Integrates with Supabase Auth.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Profile
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  avatar_url TEXT,

  -- Role & Permissions
  role VARCHAR(50) NOT NULL, -- superintendent, project_manager, office_admin, field_employee, subcontractor, architect

  -- Settings
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "push": true,
    "in_app": true
  }'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- Trigger
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 3. projects

Projects belong to a company. Users are assigned to projects.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  project_number VARCHAR(100), -- Company's internal project number
  description TEXT,

  -- Location
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  latitude DECIMAL(10, 8), -- For GPS, weather API
  longitude DECIMAL(11, 8),

  -- Dates
  start_date DATE,
  end_date DATE,
  substantial_completion_date DATE,
  final_completion_date DATE,

  -- Budget (optional tracking)
  contract_value DECIMAL(15, 2),
  budget DECIMAL(15, 2),

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, on_hold, completed, archived

  -- Settings
  weather_units VARCHAR(10) DEFAULT 'imperial', -- imperial or metric
  features_enabled JSONB DEFAULT '{
    "workflows": true,
    "takeoff": true,
    "daily_reports": true
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);

-- Trigger
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 4. project_users

Junction table: Maps users to projects (many-to-many).

```sql
CREATE TABLE project_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Role on this specific project (can differ from user's general role)
  project_role VARCHAR(50), -- superintendent, pm, field, etc.

  -- Permissions
  can_edit BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,

  -- Metadata
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),

  -- Unique constraint: user can only be assigned to project once
  UNIQUE(project_id, user_id)
);

-- Indexes
CREATE INDEX idx_project_users_project_id ON project_users(project_id);
CREATE INDEX idx_project_users_user_id ON project_users(user_id);
```

---

### 5. contacts

Project contacts directory (team, subs, architects, vendors, etc.).

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Basic Info
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  title VARCHAR(100),

  -- Contact Type
  contact_type VARCHAR(50) NOT NULL, -- gc_team, subcontractor, architect, engineer, owner, inspector, vendor, utility, other
  trade VARCHAR(100), -- For subcontractors

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
  is_primary BOOLEAN DEFAULT false, -- Primary contact for this type/trade
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
```

---

### 6. subcontractors

Detailed subcontractor management (extends contacts).

```sql
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
  scope_document_url TEXT, -- Supabase Storage URL

  -- Insurance & Licensing
  license_number VARCHAR(100),
  license_expiration DATE,
  insurance_certificate_url TEXT,
  insurance_expiration DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, on_hold, completed, terminated

  -- Performance (optional tracking)
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
```

---

## Document Management

### 7. folders

Hierarchical folder structure for organizing documents.

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,

  -- Folder Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_folders_project_id ON folders(project_id);
CREATE INDEX idx_folders_parent_folder_id ON folders(parent_folder_id);
CREATE INDEX idx_folders_deleted_at ON folders(deleted_at);

-- Trigger
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 8. documents

All documents (drawings, specs, submittals, etc.).

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,

  -- Document Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(50) NOT NULL, -- drawing, specification, submittal, shop_drawing, scope, general, photo, other
  discipline VARCHAR(100), -- architectural, structural, mechanical, electrical, plumbing, civil, etc.

  -- File Info
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT, -- bytes
  file_type VARCHAR(100), -- MIME type: application/pdf, image/jpeg, etc.

  -- Version Control
  version VARCHAR(50) DEFAULT '1.0',
  revision VARCHAR(50), -- Rev A, Rev B, etc.
  is_latest_version BOOLEAN DEFAULT true,
  supersedes_document_id UUID REFERENCES documents(id), -- Previous version

  -- Additional Metadata
  drawing_number VARCHAR(100), -- For drawings
  specification_section VARCHAR(50), -- For specs (CSI code)
  issue_date DATE,
  received_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'current', -- current, superseded, archived, void

  -- Flags
  is_pinned BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,

  -- Full-text search (PostgreSQL tsvector)
  search_vector TSVECTOR,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_discipline ON documents(discipline);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX idx_documents_search_vector ON documents USING GIN(search_vector);

-- Full-text search trigger
CREATE TRIGGER documents_search_vector_update BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description, drawing_number);

-- Trigger
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 9. document_markups

Drawing markups and annotations.

```sql
CREATE TABLE document_markups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Markup Data
  markup_type VARCHAR(50) NOT NULL, -- annotation, arrow, circle, rectangle, line, text, freehand, measurement
  markup_data JSONB NOT NULL, -- Stores coordinates, color, text, etc. (flexible structure)

  -- Page (for multi-page PDFs)
  page_number INTEGER DEFAULT 1,

  -- Context (what is this markup related to?)
  related_to_type VARCHAR(50), -- rfi, change_order, punch_item, task, daily_report, general
  related_to_id UUID, -- ID of the related entity

  -- Visibility
  is_shared BOOLEAN DEFAULT true, -- Shared with team
  shared_with_roles VARCHAR[] DEFAULT ARRAY['superintendent', 'project_manager'], -- Which roles can see

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_document_markups_document_id ON document_markups(document_id);
CREATE INDEX idx_document_markups_project_id ON document_markups(project_id);
CREATE INDEX idx_document_markups_related_to ON document_markups(related_to_type, related_to_id);
CREATE INDEX idx_document_markups_deleted_at ON document_markups(deleted_at);

-- Trigger
CREATE TRIGGER update_document_markups_updated_at BEFORE UPDATE ON document_markups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Daily Reports

### 10. daily_reports

Comprehensive daily field reports.

```sql
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Report Info
  report_date DATE NOT NULL,
  report_number VARCHAR(50), -- Auto-generated or manual

  -- People
  reporter_id UUID NOT NULL REFERENCES users(id), -- Who filled it out
  reviewer_id UUID REFERENCES users(id), -- Who reviews/approves

  -- Weather
  weather_condition VARCHAR(100), -- Auto-pulled from API or manual
  temperature_high DECIMAL(5, 2),
  temperature_low DECIMAL(5, 2),
  precipitation DECIMAL(5, 2), -- inches or mm
  wind_speed DECIMAL(5, 2),
  weather_source VARCHAR(50) DEFAULT 'manual', -- manual or api
  weather_delays BOOLEAN DEFAULT false,
  weather_delay_notes TEXT,

  -- Work Performed
  work_completed TEXT,
  production_data JSONB, -- Quantified work (e.g., {"concrete_poured_cy": 15, "pipe_installed_lf": 200})

  -- Issues/Problems
  issues TEXT,

  -- Observations
  observations TEXT,

  -- General Comments
  comments TEXT,

  -- Status & Workflow
  status VARCHAR(50) DEFAULT 'draft', -- draft, in_review, approved, submitted
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),

  -- PDF Generation
  pdf_url TEXT, -- Generated PDF stored in Supabase Storage
  pdf_generated_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Unique constraint: one report per project per date
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
```

---

### 11. daily_report_workforce

Crews/workers on site for a given day.

```sql
CREATE TABLE daily_report_workforce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Workforce Info
  subcontractor_id UUID REFERENCES subcontractors(id),
  trade VARCHAR(100),

  -- Can be team or individuals
  entry_type VARCHAR(20) DEFAULT 'team', -- team or individual

  -- Team Entry
  team_name VARCHAR(255), -- e.g., "Framing Crew A"
  worker_count INTEGER, -- Number of people

  -- Individual Entry
  worker_name VARCHAR(255), -- Individual worker name

  -- Activity
  activity TEXT, -- What they worked on
  hours_worked DECIMAL(5, 2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_report_workforce_daily_report_id ON daily_report_workforce(daily_report_id);
CREATE INDEX idx_daily_report_workforce_subcontractor_id ON daily_report_workforce(subcontractor_id);
```

---

### 12. daily_report_equipment

Equipment on site for a given day.

```sql
CREATE TABLE daily_report_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Equipment Info
  equipment_type VARCHAR(100) NOT NULL, -- Crane, excavator, forklift, etc.
  equipment_description TEXT,
  quantity INTEGER DEFAULT 1,
  owner VARCHAR(100), -- Company or rental company

  -- Usage
  hours_used DECIMAL(5, 2),
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_report_equipment_daily_report_id ON daily_report_equipment(daily_report_id);
```

---

### 13. daily_report_deliveries

Material deliveries for a given day.

```sql
CREATE TABLE daily_report_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,

  -- Delivery Info
  material_description TEXT NOT NULL,
  quantity VARCHAR(100), -- "10 pallets", "500 LF", etc.
  vendor VARCHAR(255),
  delivery_ticket_number VARCHAR(100),

  -- Link to material receiving (if tracked separately)
  material_received_id UUID REFERENCES material_received(id),

  -- Time
  delivery_time TIME,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_report_deliveries_daily_report_id ON daily_report_deliveries(daily_report_id);
```

---

### 14. daily_report_visitors

Site visitors for a given day.

```sql
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
```

---

### 15. daily_report_safety_incidents

Safety incidents and near-misses for a given day (links to full safety_incidents table).

```sql
CREATE TABLE daily_report_safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  safety_incident_id UUID NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,

  -- Simple reference - full details in safety_incidents table

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_report_safety_incidents_daily_report_id ON daily_report_safety_incidents(daily_report_id);
CREATE INDEX idx_daily_report_safety_incidents_safety_incident_id ON daily_report_safety_incidents(safety_incident_id);
```

---

## Workflows (RFIs, Change Orders, Submittals, etc.)

### 16. workflow_types

Define workflow types (default and custom).

```sql
CREATE TABLE workflow_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Workflow Info
  name_singular VARCHAR(100) NOT NULL, -- "RFI", "Change Order"
  name_plural VARCHAR(100) NOT NULL, -- "RFIs", "Change Orders"
  prefix VARCHAR(10), -- "RFI-", "CO-" for auto-numbering

  -- Type
  is_default BOOLEAN DEFAULT false, -- Default workflows (RFI, CO, PCO, Submittal, Shop Drawing, Task)
  is_custom BOOLEAN DEFAULT false, -- Custom workflows created by company

  -- Configuration
  has_cost_impact BOOLEAN DEFAULT false,
  has_schedule_impact BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,

  -- Status Configuration (JSONB array of status definitions)
  statuses JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"name": "Draft", "type": "draft", "color": "#gray"},
  --   {"name": "Submitted", "type": "open", "color": "#blue"},
  --   {"name": "Answered", "type": "closed", "color": "#green"},
  --   {"name": "Void", "type": "void", "color": "#red"}
  -- ]

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
```

---

### 17. workflow_items

Generic workflow items (RFIs, COs, Submittals, etc.).

```sql
CREATE TABLE workflow_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workflow_type_id UUID NOT NULL REFERENCES workflow_types(id) ON DELETE CASCADE,

  -- Item Info
  number INTEGER, -- Auto-incrementing per workflow type per project
  reference_number VARCHAR(100), -- Optional custom reference
  title VARCHAR(255),

  -- Description Fields (flexible based on workflow type)
  description TEXT, -- Main description/question
  more_information TEXT, -- Additional details/pricing/scope
  resolution TEXT, -- Answer/response/outcome

  -- Assignment
  assignees UUID[] DEFAULT ARRAY[]::UUID[], -- Array of user IDs
  raised_by UUID REFERENCES users(id), -- Who initiated this item

  -- Dates
  due_date DATE,
  opened_date TIMESTAMPTZ, -- When first moved to "open" status
  closed_date TIMESTAMPTZ, -- When moved to "closed" status (most recent)

  -- Status & Priority
  status VARCHAR(100) NOT NULL DEFAULT 'draft', -- Matches workflow_type.statuses
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high

  -- Impacts
  cost_impact DECIMAL(15, 2), -- Can be negative
  schedule_impact INTEGER, -- Days, can be negative

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
```

---

### 18. workflow_item_comments

Comments/discussion on workflow items.

```sql
CREATE TABLE workflow_item_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_item_id UUID NOT NULL REFERENCES workflow_items(id) ON DELETE CASCADE,

  -- Comment
  comment TEXT NOT NULL,

  -- Mentions
  mentioned_users UUID[] DEFAULT ARRAY[]::UUID[], -- @mentioned users

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
```

---

### 19. workflow_item_history

Complete audit trail for workflow items.

```sql
CREATE TABLE workflow_item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_item_id UUID NOT NULL REFERENCES workflow_items(id) ON DELETE CASCADE,

  -- Change Info
  action VARCHAR(50) NOT NULL, -- created, updated, status_changed, assigned, commented, etc.
  field_changed VARCHAR(100), -- Which field changed (status, assignees, title, etc.)
  old_value TEXT, -- Previous value (JSON string if complex)
  new_value TEXT, -- New value (JSON string if complex)

  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_workflow_item_history_workflow_item_id ON workflow_item_history(workflow_item_id);
CREATE INDEX idx_workflow_item_history_changed_at ON workflow_item_history(changed_at);
```

---

### 20. change_order_bids

Subcontractor bids for change order work (unique to your platform).

```sql
CREATE TABLE change_order_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_item_id UUID NOT NULL REFERENCES workflow_items(id) ON DELETE CASCADE,
  -- workflow_item must be a Change Order type

  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,

  -- Bid Info
  bid_status VARCHAR(50) DEFAULT 'requested', -- requested, submitted, awarded, declined, rejected

  -- Pricing
  lump_sum_cost DECIMAL(15, 2), -- Cost impact
  duration_days INTEGER, -- Schedule impact / timeline
  exclusions TEXT,

  -- Supporting Info
  notes TEXT,
  supporting_documents JSONB DEFAULT '[]'::jsonb, -- Array of document URLs

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
```

---

### 21. submittal_procurement

Procurement tracking for submittals (submittal → approval → order → delivery).

```sql
CREATE TABLE submittal_procurement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_item_id UUID NOT NULL REFERENCES workflow_items(id) ON DELETE CASCADE,
  -- workflow_item must be Submittal or Shop Drawing type

  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Procurement Status
  procurement_status VARCHAR(50) DEFAULT 'pending_approval', -- pending_approval, approved, ordered, in_transit, delivered

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

  -- Link to delivery
  material_received_id UUID REFERENCES material_received(id),

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
```

---

## Tasks & Schedule

### 22. tasks

Day-to-day task management (separate from project schedule).

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Task Info
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Assignment
  assigned_to_type VARCHAR(50), -- user, subcontractor, team
  assigned_to_user_id UUID REFERENCES users(id),
  assigned_to_subcontractor_id UUID REFERENCES subcontractors(id),

  -- Dates
  due_date DATE,
  start_date DATE,
  completed_date DATE,

  -- Status & Priority
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high

  -- Parent Task (for sub-tasks)
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

  -- Related Items
  related_to_type VARCHAR(50), -- daily_report, rfi, change_order, punch_item, meeting, inspection, etc.
  related_to_id UUID,

  -- Location
  location VARCHAR(255), -- Building/Floor/Area

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to_user_id ON tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_assigned_to_subcontractor_id ON tasks(assigned_to_subcontractor_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);

-- Trigger
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 23. schedule_items

Imported MS Project schedule (high-level tracking).

```sql
CREATE TABLE schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Schedule Item Info
  task_id VARCHAR(100), -- MS Project task ID
  task_name VARCHAR(255) NOT NULL,
  wbs VARCHAR(100), -- Work Breakdown Structure code

  -- Dates
  start_date DATE,
  finish_date DATE,
  baseline_start_date DATE,
  baseline_finish_date DATE,

  -- Duration
  duration_days INTEGER,
  percent_complete DECIMAL(5, 2) DEFAULT 0.00,

  -- Dependencies
  predecessors VARCHAR(255), -- Task IDs of predecessors
  successors VARCHAR(255), -- Task IDs of successors

  -- Critical Path
  is_critical BOOLEAN DEFAULT false,

  -- Assignment
  assigned_to VARCHAR(255), -- Resource name from MS Project

  -- Metadata
  imported_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_schedule_items_project_id ON schedule_items(project_id);
CREATE INDEX idx_schedule_items_task_id ON schedule_items(task_id);
CREATE INDEX idx_schedule_items_is_critical ON schedule_items(is_critical);
```

---

## Checklists

### 24. checklist_templates

Three-level template system (system, company, project).

```sql
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  -- NULL company_id = system default template

  -- Template Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- mobilization, demolition, framing, mechanical, electrical, plumbing, closeout, safety, etc.

  -- Template Level
  template_level VARCHAR(50) NOT NULL, -- system, company, project

  -- Template Items (JSONB array)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"text": "Verify all permits are posted", "required": true, "order": 1},
  --   {"text": "Check temporary power setup", "required": true, "order": 2},
  --   {"text": "Inspect fall protection", "required": true, "order": 3}
  -- ]

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_checklist_templates_company_id ON checklist_templates(company_id);
CREATE INDEX idx_checklist_templates_category ON checklist_templates(category);
CREATE INDEX idx_checklist_templates_template_level ON checklist_templates(template_level);
CREATE INDEX idx_checklist_templates_deleted_at ON checklist_templates(deleted_at);

-- Trigger
CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 25. checklists

Checklist instances for a specific project.

```sql
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checklist_template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,

  -- Checklist Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),

  -- Items (JSONB array, copied from template but can be customized)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"text": "Verify all permits are posted", "checked": true, "notes": "All good", "photo_ids": [], "order": 1},
  --   {"text": "Check temporary power setup", "checked": false, "notes": "", "photo_ids": [], "order": 2}
  -- ]

  -- Completion
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),

  -- Link to daily report (if attached)
  daily_report_id UUID REFERENCES daily_reports(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_checklists_project_id ON checklists(project_id);
CREATE INDEX idx_checklists_checklist_template_id ON checklists(checklist_template_id);
CREATE INDEX idx_checklists_is_completed ON checklists(is_completed);
CREATE INDEX idx_checklists_daily_report_id ON checklists(daily_report_id);
CREATE INDEX idx_checklists_deleted_at ON checklists(deleted_at);

-- Trigger
CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Punch Lists

### 26. punch_items

Deficiency tracking organized by area and trade.

```sql
CREATE TABLE punch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Punch Item Info
  number INTEGER, -- Auto-increment per project
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Location (Area)
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
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, ready_for_review, completed, verified, rejected
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high

  -- Dates
  due_date DATE,
  completed_date DATE,
  verified_date DATE,

  -- Approval Workflow
  marked_complete_by UUID REFERENCES users(id), -- Field employee who marked complete
  marked_complete_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id), -- Superintendent who verified
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
```

---

## Safety Management

### 27. safety_incidents

OSHA-compliant incident and near-miss tracking.

```sql
CREATE TABLE safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Incident Info
  incident_number VARCHAR(100), -- Auto-generated
  incident_type VARCHAR(50) NOT NULL, -- injury, near_miss, property_damage, environmental
  severity VARCHAR(50), -- minor, moderate, serious, fatal

  -- When & Where
  incident_date DATE NOT NULL,
  incident_time TIME,
  location VARCHAR(255),

  -- Who
  person_involved VARCHAR(255),
  company VARCHAR(255), -- GC or subcontractor
  subcontractor_id UUID REFERENCES subcontractors(id),
  witness_names TEXT,

  -- What Happened
  description TEXT NOT NULL,
  root_cause TEXT,
  contributing_factors TEXT,

  -- Injury Details (if applicable)
  injury_type VARCHAR(100), -- cut, bruise, fracture, sprain, etc.
  body_part VARCHAR(100),
  treatment VARCHAR(100), -- first_aid, medical_treatment, hospital, none

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
  serious_incident BOOLEAN DEFAULT false, -- Triggers automatic notifications
  notified_users UUID[] DEFAULT ARRAY[]::UUID[],

  -- Status
  status VARCHAR(50) DEFAULT 'open', -- open, under_investigation, corrective_actions_pending, closed

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
```

---

### 28. toolbox_talks

Safety training log with attendance.

```sql
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

  -- Attendance (JSONB array of attendees)
  attendees JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"name": "John Smith", "company": "ABC Framing", "signature": "data:image/png;base64,..."},
  --   {"name": "Jane Doe", "company": "XYZ Plumbing", "signature": "data:image/png;base64,..."}
  -- ]

  attendance_count INTEGER DEFAULT 0,

  -- Materials
  handout_url TEXT, -- Supabase Storage URL

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
```

---

## Inspections & Permits

### 29. inspections

Third-party inspection scheduling and tracking.

```sql
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Inspection Info
  inspection_type VARCHAR(100) NOT NULL, -- building_dept, fire_marshal, structural, special, other
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
  result VARCHAR(50), -- pass, fail, conditional, pending
  result_date DATE,
  inspector_notes TEXT,

  -- Failed Inspection Workflow
  failure_reasons TEXT,
  corrective_actions_required TEXT,
  reinspection_scheduled_date DATE,

  -- Related Items
  related_checklist_id UUID REFERENCES checklists(id),
  related_permit_id UUID REFERENCES permits(id),

  -- Notifications
  notify_subcontractors UUID[] DEFAULT ARRAY[]::UUID[], -- Subcontractor IDs to notify

  -- Status
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, failed, cancelled

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
```

---

### 30. permits

Permit and approval tracking.

```sql
CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Permit Info
  permit_type VARCHAR(100) NOT NULL, -- building, electrical, plumbing, mechanical, grading, road_closure, noise, environmental, special
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
  status VARCHAR(50) DEFAULT 'applied', -- applied, pending, approved, expired, renewed

  -- Documents
  permit_document_url TEXT, -- Supabase Storage URL

  -- Required Inspections
  requires_inspections BOOLEAN DEFAULT false,

  -- Renewal Reminder
  renewal_reminder_sent BOOLEAN DEFAULT false,
  renewal_reminder_days_before INTEGER DEFAULT 30,

  -- Critical Flag
  work_cannot_proceed_without BOOLEAN DEFAULT false, -- Critical permits

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
```

---

## Additional Features

### 31. site_instructions

Formal written instructions to subcontractors.

```sql
CREATE TABLE site_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Instruction Info
  instruction_number VARCHAR(100), -- Auto-generated
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
  acknowledgment_signature TEXT, -- Base64 signature data

  -- Completion Tracking
  requires_completion_tracking BOOLEAN DEFAULT true,
  completion_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, verified
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  verified_by UUID REFERENCES users(id),

  -- Related Items
  related_to_type VARCHAR(50), -- task, punch_item, rfi, change_order, safety_incident
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
```

---

### 32. material_received

Material receiving and storage tracking.

```sql
CREATE TABLE material_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Delivery Info
  delivery_date DATE NOT NULL,
  delivery_time TIME,
  delivery_ticket_number VARCHAR(100),

  -- Material Info
  material_description TEXT NOT NULL,
  quantity VARCHAR(100), -- "10 pallets", "500 LF", flexible format

  -- Vendor
  vendor VARCHAR(255),
  vendor_contact VARCHAR(255),

  -- Links
  submittal_procurement_id UUID REFERENCES submittal_procurement(id), -- If linked to submittal
  daily_report_delivery_id UUID REFERENCES daily_report_deliveries(id), -- If logged in daily report

  -- Storage
  storage_location VARCHAR(255), -- Where on site

  -- Receiver
  received_by UUID REFERENCES users(id),

  -- Condition
  condition VARCHAR(50) DEFAULT 'good', -- good, damaged, incomplete
  condition_notes TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'received', -- received, in_storage, installed, returned

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
```

---

### 33. meetings

Meeting notes and minutes.

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Meeting Info
  meeting_type VARCHAR(100) NOT NULL, -- weekly_site, safety, coordination, toolbox_talk, owner, preconstruction, other
  meeting_name VARCHAR(255),

  -- When & Where
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  location VARCHAR(255),
  duration_minutes INTEGER,

  -- Attendees (JSONB array)
  attendees JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"name": "John Doe", "company": "GC Corp", "role": "Superintendent"},
  --   {"name": "Jane Smith", "company": "ABC Sub", "role": "Foreman"}
  -- ]

  -- Agenda & Notes
  agenda TEXT,
  discussion_notes TEXT,
  decisions TEXT,

  -- Action Items (extracted and converted to tasks)
  action_items JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"description": "Order materials by Friday", "assigned_to": "user_id", "due_date": "2024-01-15", "task_id": "uuid"},
  --   {"description": "Submit RFI on foundation", "assigned_to": "user_id", "due_date": "2024-01-10", "task_id": "uuid"}
  -- ]

  -- Minutes
  minutes_pdf_url TEXT, -- Generated meeting minutes

  -- Distribution
  distributed_to UUID[] DEFAULT ARRAY[]::UUID[], -- User IDs who received minutes

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
```

---

### 34. notices

Formal notice and correspondence tracking.

```sql
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Notice Info
  notice_type VARCHAR(100) NOT NULL, -- stop_work, default, cure, delay, owner_letter, architect_letter, building_dept, outgoing, other
  subject VARCHAR(255) NOT NULL,
  description TEXT,

  -- Direction
  direction VARCHAR(20) NOT NULL, -- incoming, outgoing

  -- Parties
  from_party VARCHAR(255),
  to_party VARCHAR(255),

  -- Dates
  notice_date DATE NOT NULL,
  received_date DATE,

  -- Reference
  reference_number VARCHAR(100),

  -- Document
  document_url TEXT, -- PDF or image of notice

  -- Response Required
  response_required BOOLEAN DEFAULT false,
  response_due_date DATE,
  response_status VARCHAR(50), -- pending, responded, closed
  response_document_url TEXT,
  response_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, responded, closed

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
```

---

### 35. site_conditions

Existing and differing site conditions documentation.

```sql
CREATE TABLE site_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Condition Info
  condition_type VARCHAR(50) NOT NULL, -- existing, differing
  category VARCHAR(100), -- utilities, soil, structure, hazmat, groundwater, access, other

  -- Discovery
  discovered_date DATE NOT NULL,
  location VARCHAR(255),

  -- Description
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Impact
  impact_description TEXT,
  cost_impact DECIMAL(15, 2),
  schedule_impact INTEGER, -- days

  -- Related Items
  related_rfi_id UUID REFERENCES workflow_items(id),
  related_change_order_id UUID REFERENCES workflow_items(id),
  related_site_instruction_id UUID REFERENCES site_instructions(id),

  -- Documentation
  before_photos JSONB DEFAULT '[]'::jsonb, -- Array of photo IDs
  after_photos JSONB DEFAULT '[]'::jsonb,

  -- Status
  status VARCHAR(50) DEFAULT 'documented', -- documented, under_review, resolved

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
```

---

### 36. tests

Testing and commissioning log.

```sql
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Test Info
  test_type VARCHAR(100) NOT NULL, -- concrete_break, soil_compaction, air_infiltration, water_test, fire_alarm, hvac_balance, electrical, commissioning, environmental, other
  test_name VARCHAR(255) NOT NULL,
  specification_reference VARCHAR(100), -- Spec section requiring test

  -- Scheduling
  scheduled_date DATE,
  actual_test_date DATE,

  -- Testing Agency
  testing_agency VARCHAR(255),
  technician_name VARCHAR(255),
  technician_contact VARCHAR(100),

  -- Frequency
  required_frequency VARCHAR(100), -- "Every 100 CY", "Daily", "Per floor", etc.
  test_number INTEGER, -- Test #1, #2, etc.

  -- Results
  result VARCHAR(50), -- pass, fail, pending, conditional
  result_value VARCHAR(100), -- Numeric or text result
  acceptance_criteria VARCHAR(255), -- What is required to pass

  -- Documents
  test_report_url TEXT, -- PDF report
  certificate_url TEXT, -- Certification document

  -- Failed Test Handling
  failure_notes TEXT,
  corrective_actions TEXT,
  retest_required BOOLEAN DEFAULT false,
  retest_scheduled_date DATE,
  retest_id UUID REFERENCES tests(id), -- Link to retest

  -- Related Items
  related_inspection_id UUID REFERENCES inspections(id),
  related_submittal_id UUID REFERENCES workflow_items(id),

  -- Closeout
  required_for_closeout BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, failed, pending_retest

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
```

---

### 37. closeout_items

Warranty and closeout documentation.

```sql
CREATE TABLE closeout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Item Info
  item_type VARCHAR(100) NOT NULL, -- warranty, asbuilt, om_manual, training, key, certification, other
  item_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- System/Equipment (for warranties and O&M manuals)
  system_category VARCHAR(100), -- hvac, plumbing, electrical, roofing, envelope, specialty
  equipment_name VARCHAR(255),
  manufacturer VARCHAR(255),
  model_number VARCHAR(100),
  serial_number VARCHAR(100),

  -- Warranty Info (if applicable)
  warranty_start_date DATE,
  warranty_end_date DATE,
  warranty_duration_years INTEGER,
  warranty_contact_name VARCHAR(255),
  warranty_contact_phone VARCHAR(50),
  warranty_contact_email VARCHAR(255),

  -- Documents
  document_urls JSONB DEFAULT '[]'::jsonb, -- Array of URLs

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
```

---

## Photos

### 38. photos

All photos with rich metadata and organization.

```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File Info
  file_url TEXT NOT NULL, -- Supabase Storage URL
  thumbnail_url TEXT, -- Optimized thumbnail
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT, -- bytes

  -- Image Metadata
  width INTEGER,
  height INTEGER,
  is_360 BOOLEAN DEFAULT false, -- 360° photo

  -- Automatic Metadata (captured at time of photo)
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- User-Added Metadata
  caption TEXT,
  description TEXT,

  -- Location Tagging
  building VARCHAR(100),
  floor VARCHAR(100),
  area VARCHAR(100),
  grid VARCHAR(100), -- Grid line reference
  location_notes TEXT,

  -- Categorization
  photo_category VARCHAR(100), -- progress, safety, issue, condition, delivery, inspection, closeout, general
  tags VARCHAR[] DEFAULT ARRAY[]::VARCHAR[], -- Custom tags

  -- Project Phase
  project_phase VARCHAR(100), -- mobilization, demolition, rough_in, closeout, etc.

  -- Linked Items (what is this photo attached to?)
  linked_items JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"type": "daily_report", "id": "uuid"},
  --   {"type": "punch_item", "id": "uuid"},
  --   {"type": "rfi", "id": "uuid"}
  -- ]

  -- Before/After Pairing
  is_before_photo BOOLEAN DEFAULT false,
  is_after_photo BOOLEAN DEFAULT false,
  paired_photo_id UUID REFERENCES photos(id), -- Link to before or after

  -- Visibility
  is_pinned BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_photos_project_id ON photos(project_id);
CREATE INDEX idx_photos_captured_at ON photos(captured_at);
CREATE INDEX idx_photos_location ON photos(building, floor, area, grid);
CREATE INDEX idx_photos_photo_category ON photos(photo_category);
CREATE INDEX idx_photos_tags ON photos USING GIN(tags);
CREATE INDEX idx_photos_deleted_at ON photos(deleted_at);

-- Trigger
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Takeoff (Phase 1D - Advanced Feature)

### 39. takeoff_items

Individual takeoff measurements on drawings.

```sql
CREATE TABLE takeoff_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE, -- Drawing being measured

  -- Takeoff Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Measurement Type
  measurement_type VARCHAR(50) NOT NULL, -- linear, area, count, linear_with_drop, pitched_area, pitched_linear, surface_area, volume_2d, volume_3d

  -- Measurement Data (JSONB - flexible structure for different measurement types)
  measurement_data JSONB NOT NULL,
  -- Example for Linear: {"points": [[x1,y1], [x2,y2], ...], "length_ft": 150.5}
  -- Example for Area: {"polygon": [[x1,y1], ...], "area_sf": 500.25, "perimeter_lf": 90.0}
  -- Example for Count: {"points": [[x,y], [x,y], ...], "count": 12}

  -- Page (for multi-page drawings)
  page_number INTEGER DEFAULT 1,

  -- Quantities
  quantity DECIMAL(15, 4), -- Primary quantity (LF, SF, CY, EA, etc.)
  unit VARCHAR(20), -- ft, sf, cy, ea, etc.
  multiplier DECIMAL(10, 2) DEFAULT 1.00, -- For "typical floor x5"
  waste_factor DECIMAL(5, 2) DEFAULT 0.00, -- Percentage waste (e.g., 10.00 for 10%)
  final_quantity DECIMAL(15, 4), -- quantity * multiplier * (1 + waste_factor)

  -- Visual Styling
  color VARCHAR(7) DEFAULT '#0000FF', -- Hex color
  line_width INTEGER DEFAULT 2,

  -- Organization
  takeoff_tags JSONB DEFAULT '[]'::jsonb, -- Custom tags (floor, phase, trade, etc.)
  layer VARCHAR(100), -- Layer name for organization
  is_visible BOOLEAN DEFAULT true,

  -- Assembly Link
  assembly_id UUID REFERENCES assemblies(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_takeoff_items_project_id ON takeoff_items(project_id);
CREATE INDEX idx_takeoff_items_document_id ON takeoff_items(document_id);
CREATE INDEX idx_takeoff_items_measurement_type ON takeoff_items(measurement_type);
CREATE INDEX idx_takeoff_items_assembly_id ON takeoff_items(assembly_id);
CREATE INDEX idx_takeoff_items_deleted_at ON takeoff_items(deleted_at);

-- Trigger
CREATE TRIGGER update_takeoff_items_updated_at BEFORE UPDATE ON takeoff_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 40. assemblies

Pre-built and custom assemblies for takeoff.

```sql
CREATE TABLE assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  -- NULL company_id = system default assembly (100+ pre-built)

  -- Assembly Info
  name VARCHAR(255) NOT NULL,
  assembly_number VARCHAR(100),
  description TEXT,
  category VARCHAR(100), -- csi_division_03, csi_division_04, etc. or custom
  trade VARCHAR(100),

  -- Assembly Level
  assembly_level VARCHAR(50) NOT NULL, -- system, company, project

  -- Unit of Measure
  unit_of_measure VARCHAR(20) NOT NULL, -- sf, lf, ea, etc. (what you measure)

  -- Items in Assembly (JSONB array)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example: [
  --   {
  --     "type": "required",
  --     "name": "Drywall 5/8\"",
  --     "quantity_per_unit": 2.0,
  --     "unit": "sheets",
  --     "formula": "measured_area / 32", // SF to sheets (4x8 = 32 SF)
  --     "waste_factor": 10.0
  --   },
  --   {
  --     "type": "required",
  --     "name": "Metal Studs 6\"",
  --     "quantity_per_unit": 1.0,
  --     "unit": "lf",
  --     "formula": "measured_linear * wall_height / 16", // Studs 16\" OC
  --     "waste_factor": 5.0
  --   },
  --   {
  --     "type": "item_group",
  --     "group_name": "Insulation Type",
  --     "options": [
  --       {"name": "Fiberglass Batt R-19", "quantity_per_unit": 1.0, "unit": "sf"},
  --       {"name": "Spray Foam R-21", "quantity_per_unit": 1.0, "unit": "sf"}
  --     ]
  --   }
  -- ]

  -- Variables (inputs when applying assembly)
  variables JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"name": "wall_height", "label": "Wall Height (ft)", "type": "number", "default": 10},
  --   {"name": "door_count", "label": "Number of Doors", "type": "number", "default": 0}
  -- ]

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_assemblies_company_id ON assemblies(company_id);
CREATE INDEX idx_assemblies_category ON assemblies(category);
CREATE INDEX idx_assemblies_assembly_level ON assemblies(assembly_level);
CREATE INDEX idx_assemblies_deleted_at ON assemblies(deleted_at);

-- Trigger
CREATE TRIGGER update_assemblies_updated_at BEFORE UPDATE ON assemblies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Notifications & Communication

### 41. notifications

In-app notification system.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification Info
  notification_type VARCHAR(100) NOT NULL, -- assignment, status_change, comment, mention, due_date, overdue, approval_request, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Related Item
  related_to_type VARCHAR(50), -- task, rfi, change_order, daily_report, punch_item, etc.
  related_to_id UUID,
  related_to_url TEXT, -- Deep link to item

  -- Priority
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Action Taken
  action_taken BOOLEAN DEFAULT false,
  action_taken_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_related_to ON notifications(related_to_type, related_to_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

---

### 42. messages

Direct messaging between users (optional - can use comments instead).

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Message Info
  message_type VARCHAR(50) DEFAULT 'direct', -- direct, group, project_announcement
  subject VARCHAR(255),
  body TEXT NOT NULL,

  -- Participants
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Recipients

  -- Thread
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE, -- For replies
  thread_id UUID, -- Group messages in thread

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_messages_project_id ON messages(project_id);
CREATE INDEX idx_messages_from_user_id ON messages(from_user_id);
CREATE INDEX idx_messages_to_user_ids ON messages USING GIN(to_user_ids);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_deleted_at ON messages(deleted_at);
```

---

## Utility Functions & Triggers

### update_updated_at_column()

Function to automatically update `updated_at` timestamp.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Row-Level Security (RLS) Policies

Supabase uses PostgreSQL Row-Level Security to enforce multi-tenant isolation. Below are example policies for key tables.

### Enable RLS on All Tables

```sql
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)
```

### Example Policies

#### companies

```sql
-- Users can only see their own company
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Only company owners can update
CREATE POLICY "Owners can update their company"
  ON companies FOR UPDATE
  USING (id = (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'owner'));
```

#### users

```sql
-- Users can view users in their company
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());
```

#### projects

```sql
-- Users can view projects they're assigned to
CREATE POLICY "Users can view assigned projects"
  ON projects FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Superintendents and PMs can create projects
CREATE POLICY "Supers and PMs can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superintendent', 'project_manager', 'owner')
  );
```

#### documents

```sql
-- Users can view documents for their assigned projects
CREATE POLICY "Users can view project documents"
  ON documents FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );

-- Users can upload documents to their projects
CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_users WHERE user_id = auth.uid()
    )
  );
```

#### Subcontractors (External Users)

```sql
-- Subcontractors can only see their own data
CREATE POLICY "Subcontractors view own data"
  ON subcontractors FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND contact_id IN (
      SELECT id FROM contacts WHERE email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- Subs can only see their punch items
CREATE POLICY "Subs view own punch items"
  ON punch_items FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'subcontractor'
    AND subcontractor_id IN (
      SELECT id FROM subcontractors WHERE contact_id IN (
        SELECT id FROM contacts WHERE email = (SELECT email FROM users WHERE id = auth.uid())
      )
    )
  );
```

**Note:** RLS policies need to be defined for ALL tables. The above are examples. Full policy implementation should be done carefully to ensure security and performance.

---

## Indexes Summary

All important columns have indexes for query performance:
- Foreign keys (company_id, project_id, user_id, etc.)
- Status columns (for filtering)
- Date columns (for date-range queries)
- deleted_at (for soft-delete filtering)
- Full-text search (tsvector on documents)
- JSONB columns (GIN indexes where needed)
- Array columns (GIN indexes for containment queries)

---

## Database Size Estimates

For a **medium-sized project** (1 year duration):
- ~365 daily reports
- ~100 RFIs, ~50 Change Orders, ~200 Submittals
- ~500 tasks
- ~1,000 punch items
- ~5,000 photos (@ 3 MB avg = 15 GB storage)
- ~200 documents (drawings, specs) (@ 5 MB avg = 1 GB)
- Total database size (structured data): ~500 MB
- Total file storage: ~20 GB

**Supabase Free Tier:** 500 MB database, 1 GB file storage (insufficient for production)
**Supabase Pro ($25/month):** 8 GB database, 100 GB file storage (sufficient for ~5 projects)

---

## Next Steps

1. **Review this schema** - Does it capture all your needs?
2. **Set up Supabase project** - Create account, new project
3. **Run migrations** - Create tables in Supabase
4. **Define RLS policies** - Secure multi-tenant data
5. **Seed default data** - System checklist templates, workflow types, assembly library
6. **Build API layer** - Supabase auto-generates REST API, but you may want custom functions
7. **Start frontend development** - Connect React app to Supabase

**Would you like me to:**
- Generate the actual SQL migration files to run in Supabase?
- Create seed data (default checklists, assemblies, workflow types)?
- Start setting up the React project structure?
- Something else?