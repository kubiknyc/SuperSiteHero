# Tier 1 Construction Features - Implementation Plan

## Overview

This plan covers the 5 critical Tier 1 improvements identified by the construction domain expert:

1. **RFI System Overhaul** - Dedicated table with industry-standard fields
2. **Submittal System Overhaul** - Spec-based numbering, proper approval workflow
3. **Equipment Tracking** - New feature for equipment logs and management
4. **Cost Code System** - Budget tracking with CSI divisions
5. **Change Order Enhancement** - PCO vs CO distinction, multi-level approval

**Estimated Total Effort**: 4-6 weeks

---

## Architecture Patterns (Based on Codebase Analysis)

Each feature will follow the established patterns:

```
supabase/migrations/0XX_{feature}.sql    # Database schema + RLS
src/types/{feature}.ts                   # TypeScript types & enums
src/lib/api/services/{feature}.ts        # Supabase API service
src/features/{feature}/hooks/            # React Query hooks
src/features/{feature}/components/       # UI components
src/pages/{feature}/                     # Page components
```

---

## 1. RFI System Overhaul

### 1.1 Database Migration (`048_dedicated_rfis.sql`)

```sql
-- New dedicated RFIs table
CREATE TABLE rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- RFI Identification (auto-increment per project)
  rfi_number INTEGER NOT NULL,

  -- Core Fields
  subject VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  response TEXT,

  -- References
  spec_section VARCHAR(50),
  drawing_id UUID REFERENCES documents(id),
  drawing_reference VARCHAR(100),  -- e.g., "A-101, Detail 3"
  location VARCHAR(255),

  -- Dates
  date_submitted TIMESTAMPTZ,
  date_required TIMESTAMPTZ,
  date_responded TIMESTAMPTZ,
  date_closed TIMESTAMPTZ,

  -- Status & Priority
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  priority VARCHAR(20) DEFAULT 'normal',

  -- Ball-in-Court Tracking
  ball_in_court UUID REFERENCES users(id),
  ball_in_court_role VARCHAR(50),  -- 'gc', 'architect', 'subcontractor', 'owner'

  -- Assignment
  submitted_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  responded_by UUID REFERENCES users(id),

  -- Impact Assessment
  cost_impact DECIMAL(15, 2),
  schedule_impact_days INTEGER,

  -- Related Items
  related_submittal_id UUID,  -- Will reference submittals table
  related_change_order_id UUID,  -- Will reference change_orders table

  -- Distribution
  distribution_list UUID[] DEFAULT ARRAY[]::UUID[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Ensure unique RFI numbers per project
  UNIQUE(project_id, rfi_number)
);

-- RFI Attachments
CREATE TABLE rfi_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_id UUID NOT NULL REFERENCES rfis(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-increment RFI number per project
CREATE OR REPLACE FUNCTION get_next_rfi_number(p_project_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(rfi_number), 0) + 1
  FROM rfis
  WHERE project_id = p_project_id AND deleted_at IS NULL;
$$ LANGUAGE SQL;
```

### 1.2 RFI Status Workflow

```
draft -> submitted -> under_review -> responded -> approved/rejected -> closed
```

States:
- `draft` - Created but not submitted
- `submitted` - Sent to architect/engineer
- `under_review` - Being reviewed
- `responded` - Answer provided
- `approved` - Response accepted
- `rejected` - Response rejected, needs revision
- `closed` - RFI complete

### 1.3 Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/048_dedicated_rfis.sql` | Create | Database schema |
| `src/types/rfi.ts` | Create | TypeScript types |
| `src/lib/api/services/rfis-v2.ts` | Create | New API service |
| `src/features/rfis/hooks/useRFIsV2.ts` | Create | New React Query hooks |
| `src/features/rfis/components/RFIForm.tsx` | Modify | Update for new fields |
| `src/features/rfis/components/RFIResponsePanel.tsx` | Create | Response workflow |
| `src/pages/rfis/RFIDetailPage.tsx` | Modify | Update for new structure |

### 1.4 Migration Strategy

1. Create new `rfis` table alongside existing `workflow_items`
2. Create migration script to copy existing RFI data
3. Update UI to use new table
4. Keep workflow_items for other workflow types

---

## 2. Submittal System Overhaul

### 2.1 Database Migration (`049_dedicated_submittals.sql`)

```sql
-- New dedicated Submittals table
CREATE TABLE submittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Submittal Identification (spec-section based: 03 30 00-1)
  submittal_number VARCHAR(50) NOT NULL,
  revision_number INTEGER DEFAULT 0,

  -- Core Fields
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Specification Reference
  spec_section VARCHAR(20) NOT NULL,  -- e.g., "03 30 00"
  spec_section_title VARCHAR(255),

  -- Submittal Type
  submittal_type VARCHAR(50) NOT NULL,  -- product_data, shop_drawing, sample, mix_design, etc.

  -- Dates
  date_required DATE,
  date_submitted TIMESTAMPTZ,
  date_received TIMESTAMPTZ,
  date_returned TIMESTAMPTZ,

  -- Review Status
  review_status VARCHAR(50) NOT NULL DEFAULT 'not_submitted',
  review_comments TEXT,

  -- Ball-in-Court
  ball_in_court UUID REFERENCES users(id),
  ball_in_court_entity VARCHAR(50),  -- 'subcontractor', 'gc', 'architect', 'owner'

  -- Assignment
  submitted_by_company UUID REFERENCES companies(id),
  submitted_by_user UUID REFERENCES users(id),
  reviewer_id UUID REFERENCES users(id),

  -- Review Tracking
  days_for_review INTEGER,
  review_due_date DATE,

  -- Related Items
  related_rfi_id UUID,  -- Will reference rfis table
  subcontractor_id UUID REFERENCES subcontractors(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(project_id, submittal_number, revision_number)
);

-- Submittal Packages (multiple items per submittal)
CREATE TABLE submittal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  description VARCHAR(255),
  manufacturer VARCHAR(255),
  model_number VARCHAR(100),
  quantity INTEGER,
  unit VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submittal Attachments
CREATE TABLE submittal_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id UUID NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(50),  -- 'product_data', 'shop_drawing', 'sample_photo', etc.
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Submittal Review Status Workflow

```
not_submitted -> submitted -> under_review -> approved/approved_as_noted/revise_resubmit/rejected
```

Review Statuses:
- `not_submitted` - Not yet submitted
- `submitted` - Submitted to GC
- `under_gc_review` - GC reviewing
- `submitted_to_architect` - Sent to architect
- `under_architect_review` - Architect reviewing
- `approved` - Approved as submitted
- `approved_as_noted` - Approved with comments
- `revise_resubmit` - Rejected, needs revision
- `rejected` - Not approved

### 2.3 Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/049_dedicated_submittals.sql` | Create | Database schema |
| `src/types/submittal.ts` | Create | TypeScript types |
| `src/lib/api/services/submittals-v2.ts` | Create | New API service |
| `src/features/submittals/hooks/useSubmittalsV2.ts` | Create | New React Query hooks |
| `src/features/submittals/components/SubmittalForm.tsx` | Modify | Update for new fields |
| `src/features/submittals/components/SubmittalReviewPanel.tsx` | Create | Review workflow |
| `src/features/submittals/components/SubmittalRegister.tsx` | Create | Register view |
| `src/pages/submittals/SubmittalDetailPage.tsx` | Modify | Update structure |

---

## 3. Equipment Tracking (New Feature)

### 3.1 Database Migration (`050_equipment_tracking.sql`)

```sql
-- Equipment Master Table
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Equipment Identification
  equipment_number VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Classification
  equipment_type VARCHAR(50) NOT NULL,  -- crane, excavator, loader, truck, etc.
  category VARCHAR(50),  -- heavy, light, tools, vehicles

  -- Ownership
  ownership_type VARCHAR(20) DEFAULT 'owned',  -- owned, rented, leased
  rental_company VARCHAR(255),
  rental_rate DECIMAL(10, 2),
  rental_rate_unit VARCHAR(20),  -- hourly, daily, weekly, monthly

  -- Specs
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  serial_number VARCHAR(100),
  license_plate VARCHAR(50),

  -- Capacity
  capacity VARCHAR(100),
  capacity_unit VARCHAR(20),

  -- Status
  status VARCHAR(20) DEFAULT 'available',  -- available, in_use, maintenance, out_of_service
  current_project_id UUID REFERENCES projects(id),
  current_location VARCHAR(255),

  -- Maintenance
  last_service_date DATE,
  next_service_date DATE,
  service_interval_hours INTEGER,
  current_hours DECIMAL(10, 1),

  -- Costs
  hourly_cost DECIMAL(10, 2),
  daily_cost DECIMAL(10, 2),
  fuel_cost_per_hour DECIMAL(10, 2),

  -- Insurance
  insurance_policy VARCHAR(100),
  insurance_expiry DATE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(company_id, equipment_number)
);

-- Equipment Assignments to Projects
CREATE TABLE equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Assignment Period
  start_date DATE NOT NULL,
  end_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'active',  -- active, completed, cancelled

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Daily Equipment Logs
CREATE TABLE equipment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  daily_report_id UUID REFERENCES daily_reports(id),

  -- Log Date
  log_date DATE NOT NULL,

  -- Hours
  hours_worked DECIMAL(5, 1) NOT NULL DEFAULT 0,
  hours_idle DECIMAL(5, 1) DEFAULT 0,
  meter_start DECIMAL(10, 1),
  meter_end DECIMAL(10, 1),

  -- Fuel
  fuel_used DECIMAL(10, 2),
  fuel_unit VARCHAR(20) DEFAULT 'gallons',
  fuel_cost DECIMAL(10, 2),

  -- Operator
  operator_id UUID REFERENCES users(id),
  operator_name VARCHAR(255),

  -- Work Performed
  work_description TEXT,
  location_on_site VARCHAR(255),

  -- Condition
  condition_notes TEXT,
  maintenance_needed BOOLEAN DEFAULT false,
  maintenance_notes TEXT,

  -- Costs
  calculated_cost DECIMAL(10, 2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(equipment_id, log_date)
);

-- Equipment Maintenance Records
CREATE TABLE equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,

  -- Maintenance Info
  maintenance_type VARCHAR(50) NOT NULL,  -- preventive, repair, inspection
  description TEXT NOT NULL,

  -- Dates
  scheduled_date DATE,
  completed_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, in_progress, completed, cancelled

  -- Costs
  labor_cost DECIMAL(10, 2),
  parts_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),

  -- Vendor
  vendor VARCHAR(255),
  invoice_number VARCHAR(100),

  -- Parts Used
  parts_used JSONB DEFAULT '[]'::jsonb,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
```

### 3.2 Equipment Types

```typescript
export type EquipmentType =
  | 'excavator' | 'loader' | 'backhoe' | 'bulldozer' | 'grader'
  | 'crane' | 'forklift' | 'telehandler' | 'scissor_lift' | 'boom_lift'
  | 'truck' | 'dump_truck' | 'concrete_truck' | 'water_truck'
  | 'compactor' | 'roller' | 'paver'
  | 'generator' | 'compressor' | 'welder'
  | 'pump' | 'heater' | 'light_tower'
  | 'trailer' | 'container'
  | 'other';
```

### 3.3 Files to Create

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/050_equipment_tracking.sql` | Create | Database schema |
| `src/types/equipment.ts` | Create | TypeScript types |
| `src/lib/api/services/equipment.ts` | Create | API service |
| `src/features/equipment/hooks/useEquipment.ts` | Create | React Query hooks |
| `src/features/equipment/components/EquipmentList.tsx` | Create | Equipment list |
| `src/features/equipment/components/EquipmentForm.tsx` | Create | Equipment form |
| `src/features/equipment/components/EquipmentLogForm.tsx` | Create | Daily log form |
| `src/pages/equipment/EquipmentPage.tsx` | Create | Main equipment page |
| `src/pages/equipment/EquipmentDetailPage.tsx` | Create | Equipment detail |

---

## 4. Cost Code System

### 4.1 Database Migration (`051_cost_codes.sql`)

```sql
-- Cost Code Definitions (CSI MasterFormat based)
CREATE TABLE cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Code Identification
  code VARCHAR(20) NOT NULL,  -- e.g., "03 30 00"
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Hierarchy
  parent_code_id UUID REFERENCES cost_codes(id),
  level INTEGER DEFAULT 1,  -- 1=Division, 2=Section, 3=Subsection

  -- Classification
  division VARCHAR(2),  -- CSI Division: 01-49
  section VARCHAR(10),

  -- Cost Type
  cost_type VARCHAR(20) DEFAULT 'direct',  -- direct, indirect, overhead

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(company_id, code)
);

-- Project Budgets by Cost Code
CREATE TABLE project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES cost_codes(id),

  -- Budget Amounts
  original_budget DECIMAL(15, 2) NOT NULL DEFAULT 0,
  approved_changes DECIMAL(15, 2) DEFAULT 0,
  revised_budget DECIMAL(15, 2) GENERATED ALWAYS AS (original_budget + approved_changes) STORED,

  -- Committed Costs (contracts, POs)
  committed_cost DECIMAL(15, 2) DEFAULT 0,

  -- Actual Costs
  actual_cost DECIMAL(15, 2) DEFAULT 0,

  -- Projections
  estimated_cost_at_completion DECIMAL(15, 2),
  variance DECIMAL(15, 2) GENERATED ALWAYS AS (revised_budget - actual_cost) STORED,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, cost_code_id)
);

-- Cost Transactions
CREATE TABLE cost_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES cost_codes(id),

  -- Transaction Info
  transaction_date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,

  -- Transaction Type
  transaction_type VARCHAR(30) NOT NULL,  -- commitment, actual, adjustment
  source_type VARCHAR(30),  -- change_order, invoice, timesheet, material, equipment
  source_id UUID,  -- Reference to source record

  -- Amounts
  amount DECIMAL(15, 2) NOT NULL,

  -- Vendor/Subcontractor
  vendor_name VARCHAR(255),
  subcontractor_id UUID REFERENCES subcontractors(id),

  -- Reference Numbers
  invoice_number VARCHAR(100),
  po_number VARCHAR(100),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Seed CSI Division codes
INSERT INTO cost_codes (company_id, code, name, division, level) VALUES
-- Note: company_id will need to be set per company
-- Division 01 - General Requirements
('{{company_id}}', '01 00 00', 'General Requirements', '01', 1),
-- Division 02 - Existing Conditions
('{{company_id}}', '02 00 00', 'Existing Conditions', '02', 1),
-- Division 03 - Concrete
('{{company_id}}', '03 00 00', 'Concrete', '03', 1),
-- ... etc for all 49 divisions
```

### 4.2 Files to Create

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/051_cost_codes.sql` | Create | Database schema |
| `src/types/cost-tracking.ts` | Create | TypeScript types |
| `src/lib/api/services/cost-tracking.ts` | Create | API service |
| `src/features/cost-tracking/hooks/useCostTracking.ts` | Create | React Query hooks |
| `src/features/cost-tracking/components/BudgetSummary.tsx` | Create | Budget dashboard |
| `src/features/cost-tracking/components/CostCodeSelector.tsx` | Create | Reusable selector |
| `src/pages/budget/BudgetPage.tsx` | Create | Budget management |

---

## 5. Change Order Enhancement

### 5.1 Database Migration (`052_enhanced_change_orders.sql`)

```sql
-- Enhanced Change Orders Table (replaces workflow_items for COs)
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- CO Identification
  co_number INTEGER NOT NULL,
  pco_number INTEGER,  -- Potential Change Order number (before approval)

  -- Core Fields
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Change Type
  change_type VARCHAR(50) NOT NULL,  -- scope_change, design_clarification, unforeseen_condition, owner_request, time_extension, value_engineering
  change_reason TEXT,

  -- Status (PCO -> CO workflow)
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  is_pco BOOLEAN DEFAULT true,  -- true = PCO, false = approved CO

  -- Dates
  date_identified DATE,
  date_submitted TIMESTAMPTZ,
  date_approved TIMESTAMPTZ,
  date_executed TIMESTAMPTZ,

  -- Cost Impact
  cost_impact DECIMAL(15, 2) DEFAULT 0,
  markup_percentage DECIMAL(5, 2),
  total_with_markup DECIMAL(15, 2),

  -- Contract Amounts (for tracking)
  original_contract_amount DECIMAL(15, 2),
  previous_changes_amount DECIMAL(15, 2),
  revised_contract_amount DECIMAL(15, 2),

  -- Pricing Method
  pricing_method VARCHAR(20),  -- lump_sum, time_materials, unit_price

  -- Schedule Impact
  schedule_impact_days INTEGER DEFAULT 0,
  new_completion_date DATE,

  -- Approval Workflow
  internal_approval_status VARCHAR(30) DEFAULT 'pending',
  internal_approved_by UUID REFERENCES users(id),
  internal_approved_at TIMESTAMPTZ,

  owner_approval_status VARCHAR(30) DEFAULT 'pending',
  owner_approved_by VARCHAR(255),
  owner_approved_at TIMESTAMPTZ,

  -- Related Items
  related_rfi_id UUID,  -- References rfis table
  related_submittal_id UUID,  -- References submittals table
  site_condition_id UUID REFERENCES site_conditions(id),

  -- Cost Code
  cost_code_id UUID REFERENCES cost_codes(id),

  -- Attachments tracking
  supporting_documents JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(project_id, co_number)
);

-- Change Order Line Items (detailed cost breakdown)
CREATE TABLE change_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- Item Details
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(15, 2),
  unit VARCHAR(20),
  unit_cost DECIMAL(15, 2),
  total_cost DECIMAL(15, 2),

  -- Cost Code
  cost_code_id UUID REFERENCES cost_codes(id),

  -- Labor breakdown
  labor_hours DECIMAL(10, 2),
  labor_rate DECIMAL(10, 2),
  labor_cost DECIMAL(15, 2),

  -- Material breakdown
  material_cost DECIMAL(15, 2),

  -- Equipment breakdown
  equipment_cost DECIMAL(15, 2),

  -- Subcontractor
  subcontractor_id UUID REFERENCES subcontractors(id),
  subcontractor_quote DECIMAL(15, 2),

  -- Order
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CO Status values:
-- draft, pending_estimate, estimate_complete, pending_internal_approval,
-- internally_approved, pending_owner_review, owner_reviewing,
-- approved, rejected, executed, void
```

### 5.2 Change Order Workflow

```
Draft -> Pending Estimate -> Estimate Complete ->
Pending Internal Approval -> Internally Approved ->
Pending Owner Review -> Owner Reviewing ->
Approved (becomes CO) -> Executed

Alternative paths:
- Rejected at any approval stage
- Void if cancelled
```

### 5.3 Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/052_enhanced_change_orders.sql` | Create | Database schema |
| `src/types/change-order.ts` | Create | TypeScript types |
| `src/lib/api/services/change-orders-v2.ts` | Create | New API service |
| `src/features/change-orders/hooks/useChangeOrdersV2.ts` | Create | New hooks |
| `src/features/change-orders/components/COForm.tsx` | Create | Enhanced form |
| `src/features/change-orders/components/COItemsTable.tsx` | Create | Line items |
| `src/features/change-orders/components/COApprovalPanel.tsx` | Create | Approval workflow |
| `src/pages/change-orders/ChangeOrderDetailPage.tsx` | Modify | Update structure |

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Cost Code System - Needed by other features for cost tracking
2. Database migrations for cost codes
3. Seed CSI MasterFormat codes

### Phase 2: Core Workflows (Weeks 2-3)
4. RFI System Overhaul
5. Submittal System Overhaul
6. Data migration from workflow_items

### Phase 3: Enhancements (Weeks 3-4)
7. Change Order Enhancement
8. Link COs to RFIs/Submittals
9. Budget impact tracking

### Phase 4: Equipment (Weeks 4-5)
10. Equipment Tracking
11. Daily report integration
12. Cost tracking integration

### Phase 5: Integration & Polish (Week 5-6)
13. Cross-feature linking (RFIs -> COs, Submittals -> Materials)
14. Dashboard updates
15. Testing and bug fixes

---

## Navigation Updates

Add to AppLayout sidebar:
```tsx
// Under existing sections
{ name: 'Equipment', href: '/equipment', icon: Truck }
{ name: 'Budget', href: '/budget', icon: DollarSign }
```

---

## Data Migration Notes

### RFIs Migration
```sql
-- Migrate existing RFIs from workflow_items to new rfis table
INSERT INTO rfis (project_id, company_id, rfi_number, subject, question, ...)
SELECT
  wi.project_id,
  p.company_id,
  wi.number,
  wi.title,
  wi.description,
  ...
FROM workflow_items wi
JOIN projects p ON wi.project_id = p.id
JOIN workflow_types wt ON wi.workflow_type_id = wt.id
WHERE wt.prefix = 'RFI';
```

Similar migrations for Submittals and Change Orders.

---

## Testing Strategy

1. **Unit Tests**: Types, utility functions
2. **Integration Tests**: API services with Supabase
3. **E2E Tests**: Full workflows (create RFI -> respond -> close)
4. **Migration Tests**: Verify data integrity after migration

---

## Rollback Plan

Each migration includes:
1. Backup commands for existing data
2. Rollback SQL scripts
3. Feature flags to switch between old/new implementations
