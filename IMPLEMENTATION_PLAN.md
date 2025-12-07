# Full Implementation Plan: Top 5 Features + Quick Wins

**Created:** December 7, 2025
**Duration:** 12 weeks
**Target:** Tier 1 Competitor Parity for Small-Medium GCs

---

## Executive Summary

This plan implements 5 high-impact features plus Phase 1 quick wins, prioritized by:
1. Revenue/cash flow impact
2. Risk mitigation value
3. Implementation efficiency (leveraging existing foundations)

### Existing Foundations (Already Built)
- **Change Orders**: Complete PCO→CO lifecycle, cost breakdown by item, cost code integration (Migration 052)
- **Cost Tracking**: Cost codes, project budgets, cost transactions (Migration 048)
- **Dedicated RFIs**: Ball-in-court, drawing references, impact tracking (Migration 049)
- **Dedicated Submittals**: CSI spec sections, review workflow (Migration 050)

---

## Phase 0: Quick Wins (Week 1)

### 0.1 RFI Detail Page
**Files to create:**
- `src/pages/rfis/DedicatedRFIDetailPage.tsx`

**Implementation:**
```
- Header: RFI number, status badge, ball-in-court indicator
- Info section: Subject, question, drawing reference, spec section
- Response section: Answer, responded by, date
- Impact flags: Cost impact, schedule impact days
- Related items: Linked submittal, change order
- Attachments: Document uploads
- Comments: Threaded discussion
- History: Timeline of changes
- Actions: Edit, respond, close, create CO from RFI
```

**Route:** `/rfis-v2/:id`

### 0.2 Create RFI Dialog
**Files to create:**
- `src/features/rfis/components/CreateDedicatedRFIDialog.tsx`

**Fields:**
- Subject (required)
- Question/Description (required)
- Drawing reference (optional)
- Spec section (CSI picker)
- Date required
- Assigned to (ball-in-court)
- Priority
- Attachments

### 0.3 Submittal Detail Page
**Files to create:**
- `src/pages/submittals/DedicatedSubmittalDetailPage.tsx`

**Implementation:**
```
- Header: Submittal number, spec section, status badge
- Info: Title, type, description, lead time
- Workflow: Review status, ball-in-court, dates
- Items: Line items within submittal
- Attachments: Drawings, product data
- Reviews: History of reviews with stamps
- Actions: Submit, review (approve/reject/revise)
```

**Route:** `/submittals-v2/:id`

### 0.4 Excel Export Functions
**Files to create:**
- `src/features/rfis/utils/rfiExport.ts`
- `src/features/submittals/utils/submittalExport.ts`

**Export formats:**
- RFI Log: Number, Subject, Status, Ball-in-Court, Dates, Impact
- Submittal Log: Number, Spec Section, Title, Status, Dates, Subcontractor

**Dependencies:** `xlsx` package (already in project)

---

## Phase 1: Payment Applications (Weeks 2-3)

### 1.1 Database Schema
**Migration:** `068_payment_applications.sql`

```sql
-- Payment Applications (AIA G702)
CREATE TABLE payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Application Identification
  application_number INTEGER NOT NULL,
  period_to DATE NOT NULL,  -- Through date for this application

  -- Contract Summary (G702 fields)
  original_contract_sum DECIMAL(15,2) NOT NULL,
  change_orders_approved DECIMAL(15,2) DEFAULT 0,
  contract_sum_to_date DECIMAL(15,2) GENERATED ALWAYS AS (original_contract_sum + change_orders_approved) STORED,

  -- Work Completed
  work_completed_previous DECIMAL(15,2) DEFAULT 0,
  work_completed_this_period DECIMAL(15,2) DEFAULT 0,
  materials_stored_previous DECIMAL(15,2) DEFAULT 0,
  materials_stored_this_period DECIMAL(15,2) DEFAULT 0,
  total_completed_stored DECIMAL(15,2) GENERATED ALWAYS AS (
    work_completed_previous + work_completed_this_period +
    materials_stored_previous + materials_stored_this_period
  ) STORED,

  -- Retainage
  retainage_percent DECIMAL(5,2) DEFAULT 10.00,
  retainage_work_completed DECIMAL(15,2) DEFAULT 0,
  retainage_materials_stored DECIMAL(15,2) DEFAULT 0,
  total_retainage DECIMAL(15,2) GENERATED ALWAYS AS (
    retainage_work_completed + retainage_materials_stored
  ) STORED,

  -- Payment Calculation
  total_earned_less_retainage DECIMAL(15,2),
  less_previous_certificates DECIMAL(15,2) DEFAULT 0,
  current_payment_due DECIMAL(15,2),

  -- Balance
  balance_to_finish DECIMAL(15,2),

  -- Status
  status VARCHAR(30) DEFAULT 'draft',  -- draft, submitted, under_review, approved, paid, rejected

  -- Dates
  date_submitted TIMESTAMPTZ,
  date_approved TIMESTAMPTZ,
  date_paid TIMESTAMPTZ,

  -- Signatures
  contractor_signature TEXT,
  contractor_signed_date DATE,
  architect_signature TEXT,
  architect_signed_date DATE,
  owner_signature TEXT,
  owner_signed_date DATE,

  -- Notarization (some states require)
  notary_required BOOLEAN DEFAULT false,
  notary_signature TEXT,
  notary_date DATE,
  notary_commission_expires DATE,

  -- Reference Numbers
  invoice_number VARCHAR(50),
  check_number VARCHAR(50),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(project_id, application_number)
);

-- Schedule of Values (AIA G703)
CREATE TABLE schedule_of_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_application_id UUID NOT NULL REFERENCES payment_applications(id) ON DELETE CASCADE,

  -- Item Identification
  item_number VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,

  -- Cost Code Reference
  cost_code_id UUID REFERENCES cost_codes(id),
  cost_code VARCHAR(20),

  -- Scheduled Value (Original)
  scheduled_value DECIMAL(15,2) NOT NULL,

  -- Change Orders affecting this item
  change_order_amount DECIMAL(15,2) DEFAULT 0,

  -- Work Completed
  work_completed_previous DECIMAL(15,2) DEFAULT 0,
  work_completed_this_period DECIMAL(15,2) DEFAULT 0,

  -- Materials Stored
  materials_stored_previous DECIMAL(15,2) DEFAULT 0,
  materials_stored_this_period DECIMAL(15,2) DEFAULT 0,

  -- Computed Fields
  total_completed_stored DECIMAL(15,2) GENERATED ALWAYS AS (
    work_completed_previous + work_completed_this_period +
    materials_stored_previous + materials_stored_this_period
  ) STORED,

  percent_complete DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN (scheduled_value + change_order_amount) > 0
    THEN ((work_completed_previous + work_completed_this_period +
           materials_stored_previous + materials_stored_this_period) /
          (scheduled_value + change_order_amount)) * 100
    ELSE 0 END
  ) STORED,

  balance_to_finish DECIMAL(15,2) GENERATED ALWAYS AS (
    (scheduled_value + change_order_amount) -
    (work_completed_previous + work_completed_this_period +
     materials_stored_previous + materials_stored_this_period)
  ) STORED,

  -- Retainage for this item
  retainage_percent DECIMAL(5,2),  -- Can override application default
  retainage_amount DECIMAL(15,2),

  -- Sort order
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lien Waiver Requirements per Payment Application
CREATE TABLE payment_application_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_application_id UUID NOT NULL REFERENCES payment_applications(id) ON DELETE CASCADE,
  lien_waiver_id UUID REFERENCES lien_waivers(id),
  subcontractor_id UUID REFERENCES subcontractors(id),

  waiver_type VARCHAR(30) NOT NULL,  -- conditional_progress, unconditional_progress, conditional_final, unconditional_final
  required BOOLEAN DEFAULT true,
  received BOOLEAN DEFAULT false,
  received_date DATE,
  amount DECIMAL(15,2),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 TypeScript Types
**File:** `src/types/payment-application.ts`

```typescript
// Enums
export type PaymentApplicationStatus =
  | 'draft' | 'submitted' | 'under_review' | 'approved' | 'paid' | 'rejected';

export type WaiverType =
  | 'conditional_progress' | 'unconditional_progress'
  | 'conditional_final' | 'unconditional_final';

// Core interfaces
export interface PaymentApplication { ... }
export interface ScheduleOfValues { ... }
export interface PaymentApplicationWaiver { ... }

// DTOs
export interface CreatePaymentApplicationDTO { ... }
export interface UpdatePaymentApplicationDTO { ... }
export interface CreateScheduleOfValuesItemDTO { ... }

// Computed types
export interface PaymentApplicationWithDetails extends PaymentApplication {
  items: ScheduleOfValues[];
  waivers: PaymentApplicationWaiver[];
  project?: { name: string; number: string };
}

// Statistics
export interface PaymentApplicationStats {
  total_applications: number;
  total_billed: number;
  total_paid: number;
  outstanding: number;
  retainage_held: number;
}
```

### 1.3 React Query Hooks
**File:** `src/features/payment-applications/hooks/usePaymentApplications.ts`

```typescript
// Queries
export function useProjectPaymentApplications(projectId: string);
export function usePaymentApplication(id: string);
export function usePaymentApplicationStats(projectId: string);
export function useScheduleOfValues(applicationId: string);

// Mutations
export function useCreatePaymentApplication();
export function useUpdatePaymentApplication();
export function useSubmitPaymentApplication();
export function useApprovePaymentApplication();
export function useMarkPaymentApplicationPaid();

// SOV Mutations
export function useCreateSOVItem();
export function useUpdateSOVItem();
export function useBulkUpdateSOVItems();
export function useImportSOVFromPrevious();  // Copy from last application

// Utility hooks
export function useCalculateRetainage(applicationId: string);
export function useCheckWaiverRequirements(applicationId: string);
```

### 1.4 UI Components
**Files:**
- `src/pages/payment-applications/PaymentApplicationsPage.tsx` - List view
- `src/pages/payment-applications/PaymentApplicationDetailPage.tsx` - Detail/Edit
- `src/features/payment-applications/components/CreatePaymentApplicationDialog.tsx`
- `src/features/payment-applications/components/ScheduleOfValuesEditor.tsx` - Spreadsheet-like editor
- `src/features/payment-applications/components/G702Form.tsx` - AIA form layout
- `src/features/payment-applications/components/G703Form.tsx` - SOV form layout
- `src/features/payment-applications/components/WaiverChecklist.tsx`
- `src/features/payment-applications/components/PaymentApplicationPDF.tsx` - PDF generation

### 1.5 Routes
```typescript
'/payment-applications' - List all applications
'/payment-applications/new' - Create new application
'/payment-applications/:id' - View/Edit application
'/payment-applications/:id/g702' - Print G702 form
'/payment-applications/:id/g703' - Print G703 form
```

---

## Phase 2: Change Order UI (Week 4)

### 2.1 Change Order Pages
**Note:** Database schema and types already exist (Migration 052, src/types/change-order.ts)

**Files to create:**
- `src/pages/change-orders/ChangeOrdersPage.tsx` - List with filtering
- `src/pages/change-orders/ChangeOrderDetailPage.tsx` - Full detail view
- `src/features/change-orders/components/CreateChangeOrderDialog.tsx`
- `src/features/change-orders/components/ChangeOrderItemsEditor.tsx`
- `src/features/change-orders/components/ChangeOrderApprovalFlow.tsx`
- `src/features/change-orders/components/ChangeOrderStatusBadge.tsx`

### 2.2 React Query Hooks
**File:** `src/features/change-orders/hooks/useChangeOrdersV2.ts`

```typescript
// Already partially exists - enhance with:
export function useProjectChangeOrders(projectId: string);
export function useChangeOrder(id: string);
export function useChangeOrderStats(projectId: string);
export function useChangeOrdersByStatus(projectId: string, status: ChangeOrderStatus);
export function usePCOs(projectId: string);  // Only PCOs
export function useApprovedCOs(projectId: string);  // Only approved COs

// Workflow mutations
export function useCreateChangeOrder();
export function useSubmitEstimate();
export function useRequestInternalApproval();
export function useApproveInternally();
export function useSubmitToOwner();
export function useRecordOwnerApproval();
export function useConvertPCOtoCO();

// Item mutations
export function useAddChangeOrderItem();
export function useUpdateChangeOrderItem();
export function useDeleteChangeOrderItem();
export function useRecalculateTotal();
```

### 2.3 Features
- PCO vs CO distinction with visual indicators
- Multi-level approval workflow (Internal → Owner)
- Cost breakdown by category (Labor, Material, Equipment, Sub, Markup)
- Cost code integration
- Ball-in-court tracking
- Link to RFIs, Submittals, Site Conditions
- Contract value tracking (Original + Changes = Revised)
- PDF generation for owner approval

---

## Phase 3: Lien Waiver Management (Weeks 5-6)

### 3.1 Database Schema
**Migration:** `069_lien_waivers.sql`

```sql
-- Lien Waiver Templates (State-specific)
CREATE TABLE lien_waiver_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),  -- NULL = system template

  state_code CHAR(2) NOT NULL,  -- CA, TX, FL, etc.
  waiver_type VARCHAR(30) NOT NULL,  -- conditional_progress, unconditional_progress, conditional_final, unconditional_final

  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Template content (HTML or Markdown)
  template_content TEXT NOT NULL,

  -- Required fields for this template
  required_fields JSONB DEFAULT '[]',

  -- Statutory reference
  statute_reference VARCHAR(100),

  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lien Waivers
CREATE TABLE lien_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Template Reference
  template_id UUID REFERENCES lien_waiver_templates(id),

  -- Waiver Identification
  waiver_number VARCHAR(50),
  waiver_type VARCHAR(30) NOT NULL,

  -- Party Information
  claimant_type VARCHAR(30) NOT NULL,  -- subcontractor, supplier, gc
  subcontractor_id UUID REFERENCES subcontractors(id),
  claimant_name VARCHAR(255) NOT NULL,
  claimant_address TEXT,

  -- Project/Owner Info
  owner_name VARCHAR(255),
  property_description TEXT,

  -- Payment Information
  payment_amount DECIMAL(15,2) NOT NULL,
  through_date DATE NOT NULL,
  check_number VARCHAR(50),

  -- For conditional waivers
  condition_description TEXT,

  -- Exception amounts (disputed work, etc.)
  exception_amount DECIMAL(15,2) DEFAULT 0,
  exception_description TEXT,

  -- Status
  status VARCHAR(30) DEFAULT 'pending',  -- pending, requested, received, verified, rejected

  -- Dates
  date_requested DATE,
  date_received DATE,
  date_verified DATE,

  -- Signature
  signed_by VARCHAR(255),
  signature_url TEXT,
  signed_date DATE,

  -- Notarization
  notarized BOOLEAN DEFAULT false,
  notary_name VARCHAR(255),
  notary_date DATE,
  notary_commission_number VARCHAR(50),
  notary_commission_expires DATE,

  -- Document
  document_url TEXT,

  -- Link to payment application
  payment_application_id UUID REFERENCES payment_applications(id),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_lien_waivers_project ON lien_waivers(project_id);
CREATE INDEX idx_lien_waivers_subcontractor ON lien_waivers(subcontractor_id);
CREATE INDEX idx_lien_waivers_status ON lien_waivers(status);
CREATE INDEX idx_lien_waivers_through_date ON lien_waivers(through_date);
```

### 3.2 TypeScript Types
**File:** `src/types/lien-waiver.ts`

### 3.3 React Query Hooks
**File:** `src/features/lien-waivers/hooks/useLienWaivers.ts`

```typescript
export function useProjectLienWaivers(projectId: string);
export function useLienWaiver(id: string);
export function useLienWaiversBySubcontractor(projectId: string, subId: string);
export function usePendingLienWaivers(projectId: string);
export function useLienWaiverTemplates(stateCode: string);

// Mutations
export function useCreateLienWaiver();
export function useRequestLienWaiver();  // Send request to sub
export function useMarkWaiverReceived();
export function useVerifyLienWaiver();
export function useUploadSignedWaiver();

// Alerts
export function useMissingWaivers(projectId: string);  // Subs without current waiver
```

### 3.4 UI Components
**Files:**
- `src/pages/lien-waivers/LienWaiversPage.tsx`
- `src/pages/lien-waivers/LienWaiverDetailPage.tsx`
- `src/features/lien-waivers/components/CreateLienWaiverDialog.tsx`
- `src/features/lien-waivers/components/LienWaiverForm.tsx`
- `src/features/lien-waivers/components/WaiverStatusBadge.tsx`
- `src/features/lien-waivers/components/MissingWaiversAlert.tsx`
- `src/features/lien-waivers/components/LienWaiverPDF.tsx`

### 3.5 State Templates
Pre-populate templates for top 10 states:
- California (Civil Code 8132-8138)
- Texas (Property Code 53.281-53.284)
- Florida (Statute 713.20)
- New York (Lien Law 39)
- Illinois (770 ILCS 60)
- Pennsylvania (49 P.S. 1503)
- Ohio (ORC 1311.31)
- Georgia (OCGA 44-14-366)
- North Carolina (GS 44A-19)
- Michigan (MCL 570.1115)

---

## Phase 4: Subcontractor Insurance Tracking (Weeks 7-8)

### 4.1 Database Schema
**Migration:** `070_subcontractor_insurance.sql`

```sql
-- Insurance Coverage Types
CREATE TYPE insurance_coverage_type AS ENUM (
  'general_liability',
  'auto_liability',
  'workers_compensation',
  'umbrella_excess',
  'professional_liability',
  'pollution_liability',
  'builders_risk'
);

-- Subcontractor Insurance Certificates
CREATE TABLE subcontractor_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Certificate Info
  certificate_number VARCHAR(100),
  insurer_name VARCHAR(255) NOT NULL,
  insurer_naic VARCHAR(20),  -- NAIC number for verification

  -- Coverage Type
  coverage_type insurance_coverage_type NOT NULL,

  -- Policy Information
  policy_number VARCHAR(100) NOT NULL,
  policy_effective_date DATE NOT NULL,
  policy_expiration_date DATE NOT NULL,

  -- Coverage Limits
  each_occurrence_limit DECIMAL(15,2),
  general_aggregate_limit DECIMAL(15,2),
  products_completed_ops_limit DECIMAL(15,2),
  personal_advertising_limit DECIMAL(15,2),
  damage_rented_premises_limit DECIMAL(15,2),
  medical_expense_limit DECIMAL(15,2),

  -- Workers Comp specific
  wc_statutory_limits BOOLEAN DEFAULT false,
  wc_each_accident_limit DECIMAL(15,2),
  wc_disease_ea_employee_limit DECIMAL(15,2),
  wc_disease_policy_limit DECIMAL(15,2),

  -- Auto specific
  auto_combined_single_limit DECIMAL(15,2),
  auto_bodily_injury_person DECIMAL(15,2),
  auto_bodily_injury_accident DECIMAL(15,2),
  auto_property_damage DECIMAL(15,2),

  -- Umbrella specific
  umbrella_each_occurrence DECIMAL(15,2),
  umbrella_aggregate DECIMAL(15,2),

  -- Additional Insured Status
  additional_insured BOOLEAN DEFAULT false,
  additional_insured_endorsement VARCHAR(100),

  -- Waiver of Subrogation
  waiver_of_subrogation BOOLEAN DEFAULT false,

  -- Primary/Non-Contributory
  primary_noncontributory BOOLEAN DEFAULT false,

  -- Certificate Document
  certificate_url TEXT,
  certificate_holder TEXT,

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_date TIMESTAMPTZ,

  -- Status
  status VARCHAR(30) DEFAULT 'active',  -- active, expiring_soon, expired, cancelled

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Insurance Requirements per Project
CREATE TABLE project_insurance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),

  coverage_type insurance_coverage_type NOT NULL,

  -- Minimum limits required
  min_each_occurrence DECIMAL(15,2),
  min_general_aggregate DECIMAL(15,2),
  min_auto_combined_single DECIMAL(15,2),
  min_umbrella_each_occurrence DECIMAL(15,2),

  -- Requirements
  additional_insured_required BOOLEAN DEFAULT true,
  waiver_of_subrogation_required BOOLEAN DEFAULT false,
  primary_noncontributory_required BOOLEAN DEFAULT false,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View for compliance status
CREATE OR REPLACE VIEW subcontractor_compliance_status AS
SELECT
  s.id as subcontractor_id,
  s.company_name as subcontractor_name,
  s.company_id,

  -- GL Coverage
  (SELECT COUNT(*) > 0 FROM subcontractor_insurance si
   WHERE si.subcontractor_id = s.id
   AND si.coverage_type = 'general_liability'
   AND si.policy_expiration_date >= CURRENT_DATE
   AND si.status = 'active') as has_valid_gl,

  -- Auto Coverage
  (SELECT COUNT(*) > 0 FROM subcontractor_insurance si
   WHERE si.subcontractor_id = s.id
   AND si.coverage_type = 'auto_liability'
   AND si.policy_expiration_date >= CURRENT_DATE
   AND si.status = 'active') as has_valid_auto,

  -- Workers Comp
  (SELECT COUNT(*) > 0 FROM subcontractor_insurance si
   WHERE si.subcontractor_id = s.id
   AND si.coverage_type = 'workers_compensation'
   AND si.policy_expiration_date >= CURRENT_DATE
   AND si.status = 'active') as has_valid_wc,

  -- Umbrella
  (SELECT COUNT(*) > 0 FROM subcontractor_insurance si
   WHERE si.subcontractor_id = s.id
   AND si.coverage_type = 'umbrella_excess'
   AND si.policy_expiration_date >= CURRENT_DATE
   AND si.status = 'active') as has_valid_umbrella,

  -- Nearest expiration
  (SELECT MIN(policy_expiration_date) FROM subcontractor_insurance si
   WHERE si.subcontractor_id = s.id
   AND si.status = 'active') as nearest_expiration,

  -- Overall compliance
  CASE
    WHEN EXISTS (
      SELECT 1 FROM subcontractor_insurance si
      WHERE si.subcontractor_id = s.id
      AND si.coverage_type IN ('general_liability', 'workers_compensation')
      AND si.policy_expiration_date >= CURRENT_DATE
      AND si.status = 'active'
      GROUP BY si.subcontractor_id
      HAVING COUNT(DISTINCT si.coverage_type) >= 2
    ) THEN true
    ELSE false
  END as is_compliant

FROM subcontractors s;

-- Function to check and update expiring insurance
CREATE OR REPLACE FUNCTION update_insurance_expiration_status()
RETURNS void AS $$
BEGIN
  -- Mark as expiring_soon (30 days)
  UPDATE subcontractor_insurance
  SET status = 'expiring_soon'
  WHERE status = 'active'
  AND policy_expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';

  -- Mark as expired
  UPDATE subcontractor_insurance
  SET status = 'expired'
  WHERE status IN ('active', 'expiring_soon')
  AND policy_expiration_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 TypeScript Types
**File:** `src/types/insurance.ts`

### 4.3 React Query Hooks
**File:** `src/features/insurance/hooks/useSubcontractorInsurance.ts`

```typescript
export function useSubcontractorInsurance(subcontractorId: string);
export function useAllInsuranceCertificates(companyId: string);
export function useExpiringInsurance(daysAhead: number);
export function useExpiredInsurance();
export function useComplianceStatus(subcontractorId: string);
export function useProjectInsuranceRequirements(projectId: string);

// Mutations
export function useCreateInsuranceCertificate();
export function useUpdateInsuranceCertificate();
export function useVerifyInsuranceCertificate();
export function useUploadCertificate();

// Alerts
export function useInsuranceAlerts();  // 30/60/90 day warnings
```

### 4.4 UI Components
**Files:**
- `src/pages/insurance/InsuranceCompliancePage.tsx` - Dashboard
- `src/features/insurance/components/InsuranceCertificateForm.tsx`
- `src/features/insurance/components/ComplianceStatusBadge.tsx`
- `src/features/insurance/components/ExpirationAlerts.tsx`
- `src/features/insurance/components/CoverageCard.tsx`
- `src/features/insurance/components/InsuranceRequirementsEditor.tsx`

### 4.5 Features
- Certificate upload with OCR parsing (future)
- 30/60/90 day expiration alerts
- Compliance dashboard by subcontractor
- Block work authorization if non-compliant
- Email notifications for expiring coverage
- Coverage limit validation against project requirements

---

## Phase 5: Look-Ahead Planning (Weeks 9-12)

### 5.1 Database Schema
**Migration:** `071_look_ahead_planning.sql`

```sql
-- Look-Ahead Activities
CREATE TABLE look_ahead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Activity Identification
  activity_id VARCHAR(50),  -- Optional link to master schedule
  description TEXT NOT NULL,

  -- Assignment
  responsible_company VARCHAR(255),  -- Trade/Subcontractor name
  subcontractor_id UUID REFERENCES subcontractors(id),

  -- Schedule
  planned_start DATE NOT NULL,
  planned_finish DATE NOT NULL,
  duration_days INTEGER GENERATED ALWAYS AS (planned_finish - planned_start + 1) STORED,

  -- Actual Progress
  actual_start DATE,
  actual_finish DATE,
  percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),

  -- Location
  location VARCHAR(255),
  area VARCHAR(100),
  floor VARCHAR(50),

  -- Resources
  crew_size INTEGER,
  equipment_needed TEXT,

  -- Status
  status VARCHAR(30) DEFAULT 'scheduled',  -- scheduled, in_progress, complete, delayed, cancelled

  -- Constraints/Prerequisites
  is_ready BOOLEAN DEFAULT true,

  -- Priority/Sequence
  sequence_number INTEGER,
  is_critical BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  -- Recurrence (for weekly meetings, etc.)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50),  -- weekly, biweekly, monthly

  -- Link to master schedule (if exists)
  master_activity_id UUID,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

-- Activity Constraints
CREATE TABLE look_ahead_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES look_ahead_activities(id) ON DELETE CASCADE,

  constraint_type VARCHAR(50) NOT NULL,  -- material, labor, equipment, permit, rfi, submittal, predecessor, weather, inspection
  description TEXT NOT NULL,

  -- Status
  status VARCHAR(30) DEFAULT 'open',  -- open, in_progress, resolved

  -- Resolution
  responsible_party VARCHAR(255),
  target_resolution_date DATE,
  actual_resolution_date DATE,
  resolution_notes TEXT,

  -- Reference to blocking item
  blocking_rfi_id UUID REFERENCES rfis(id),
  blocking_submittal_id UUID REFERENCES submittals(id),
  blocking_activity_id UUID REFERENCES look_ahead_activities(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Look-Ahead Snapshots (for historical tracking)
CREATE TABLE look_ahead_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),

  snapshot_date DATE NOT NULL,
  snapshot_name VARCHAR(100),  -- e.g., "Week 23 Coordination Meeting"

  -- Store activities as JSON for historical record
  activities JSONB NOT NULL,

  -- Meeting reference
  meeting_id UUID REFERENCES meetings(id),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- View for 3-week look-ahead
CREATE OR REPLACE VIEW three_week_look_ahead AS
SELECT
  la.*,
  s.company_name as subcontractor_name,

  -- Constraint summary
  (SELECT COUNT(*) FROM look_ahead_constraints lc
   WHERE lc.activity_id = la.id AND lc.status = 'open') as open_constraints,

  -- Week number (1, 2, or 3)
  CASE
    WHEN la.planned_start BETWEEN CURRENT_DATE AND CURRENT_DATE + 6 THEN 1
    WHEN la.planned_start BETWEEN CURRENT_DATE + 7 AND CURRENT_DATE + 13 THEN 2
    WHEN la.planned_start BETWEEN CURRENT_DATE + 14 AND CURRENT_DATE + 20 THEN 3
    ELSE NULL
  END as look_ahead_week,

  -- Is overdue
  CASE
    WHEN la.planned_finish < CURRENT_DATE AND la.status NOT IN ('complete', 'cancelled') THEN true
    ELSE false
  END as is_overdue

FROM look_ahead_activities la
LEFT JOIN subcontractors s ON la.subcontractor_id = s.id
WHERE la.deleted_at IS NULL
AND la.planned_start <= CURRENT_DATE + 21
AND la.status NOT IN ('complete', 'cancelled')
ORDER BY la.planned_start, la.sequence_number;
```

### 5.2 TypeScript Types
**File:** `src/types/look-ahead.ts`

```typescript
export type ActivityStatus = 'scheduled' | 'in_progress' | 'complete' | 'delayed' | 'cancelled';
export type ConstraintType = 'material' | 'labor' | 'equipment' | 'permit' | 'rfi' | 'submittal' | 'predecessor' | 'weather' | 'inspection';
export type ConstraintStatus = 'open' | 'in_progress' | 'resolved';

export interface LookAheadActivity { ... }
export interface LookAheadConstraint { ... }
export interface LookAheadSnapshot { ... }

// Grouped view
export interface WeeklyLookAhead {
  week_number: 1 | 2 | 3;
  week_start: string;
  week_end: string;
  activities: LookAheadActivity[];
  total_activities: number;
  activities_with_constraints: number;
}
```

### 5.3 React Query Hooks
**File:** `src/features/look-ahead/hooks/useLookAhead.ts`

```typescript
export function useThreeWeekLookAhead(projectId: string);
export function useLookAheadByWeek(projectId: string, weekNumber: 1 | 2 | 3);
export function useLookAheadByTrade(projectId: string, subcontractorId?: string);
export function useActivityConstraints(activityId: string);
export function useOpenConstraints(projectId: string);
export function useLookAheadSnapshots(projectId: string);

// Mutations
export function useCreateLookAheadActivity();
export function useUpdateLookAheadActivity();
export function useBulkUpdateActivities();
export function useAddConstraint();
export function useResolveConstraint();
export function useCreateSnapshot();

// Import/Export
export function useImportFromMasterSchedule();
export function useExportLookAhead(projectId: string, format: 'pdf' | 'excel');
```

### 5.4 UI Components
**Files:**
- `src/pages/look-ahead/LookAheadPage.tsx` - Main 3-week view
- `src/features/look-ahead/components/WeekColumn.tsx` - Single week view
- `src/features/look-ahead/components/ActivityCard.tsx`
- `src/features/look-ahead/components/ActivityForm.tsx`
- `src/features/look-ahead/components/ConstraintsList.tsx`
- `src/features/look-ahead/components/ConstraintForm.tsx`
- `src/features/look-ahead/components/TradeFilter.tsx`
- `src/features/look-ahead/components/LookAheadGantt.tsx` - Simple Gantt view
- `src/features/look-ahead/components/ExportDialog.tsx`

### 5.5 Features
- 3-week rolling window view
- Drag-and-drop rescheduling
- Constraint tracking with visual indicators
- Filter by trade/subcontractor
- Integration with RFIs/Submittals (auto-create constraints)
- Weekly snapshot for meeting distribution
- PDF/Excel export for distribution
- Integration with meetings module (auto-populate agenda)

---

## Implementation Checklist

### Week 1: Quick Wins
- [ ] RFI Detail Page
- [ ] Create RFI Dialog
- [ ] Submittal Detail Page
- [ ] RFI Excel Export
- [ ] Submittal Excel Export
- [ ] Add routes to App.tsx

### Weeks 2-3: Payment Applications
- [ ] Migration 068
- [ ] Types (payment-application.ts)
- [ ] API Service
- [ ] React Query Hooks
- [ ] Payment Applications List Page
- [ ] Payment Application Detail Page
- [ ] Create Dialog
- [ ] Schedule of Values Editor
- [ ] G702 Form View
- [ ] G703 Form View
- [ ] PDF Generation
- [ ] Waiver Checklist Integration

### Week 4: Change Order UI
- [ ] Change Orders List Page
- [ ] Change Order Detail Page
- [ ] Create Change Order Dialog
- [ ] Items Editor (spreadsheet-like)
- [ ] Approval Workflow UI
- [ ] PCO to CO Conversion
- [ ] PDF Generation

### Weeks 5-6: Lien Waivers
- [ ] Migration 069
- [ ] Types (lien-waiver.ts)
- [ ] API Service
- [ ] React Query Hooks
- [ ] Lien Waivers List Page
- [ ] Lien Waiver Detail Page
- [ ] Create Dialog
- [ ] State Templates (10 states)
- [ ] Missing Waivers Alert
- [ ] PDF Generation

### Weeks 7-8: Insurance Tracking
- [ ] Migration 070
- [ ] Types (insurance.ts)
- [ ] API Service
- [ ] React Query Hooks
- [ ] Insurance Compliance Dashboard
- [ ] Certificate Form
- [ ] Coverage Cards
- [ ] Expiration Alerts
- [ ] Project Requirements Editor

### Weeks 9-12: Look-Ahead Planning
- [ ] Migration 071
- [ ] Types (look-ahead.ts)
- [ ] API Service
- [ ] React Query Hooks
- [ ] 3-Week Look-Ahead Page
- [ ] Activity Cards
- [ ] Constraint Management
- [ ] Trade Filtering
- [ ] Simple Gantt View
- [ ] Snapshot Creation
- [ ] PDF/Excel Export
- [ ] Meeting Integration

---

## File Structure Summary

```
src/
├── features/
│   ├── payment-applications/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── change-orders/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── lien-waivers/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── templates/
│   ├── insurance/
│   │   ├── components/
│   │   └── hooks/
│   └── look-ahead/
│       ├── components/
│       ├── hooks/
│       └── utils/
├── pages/
│   ├── payment-applications/
│   ├── change-orders/
│   ├── lien-waivers/
│   ├── insurance/
│   └── look-ahead/
├── types/
│   ├── payment-application.ts
│   ├── lien-waiver.ts
│   ├── insurance.ts
│   └── look-ahead.ts
└── lib/
    └── api/
        └── services/
            ├── payment-applications.ts
            ├── lien-waivers.ts
            ├── insurance.ts
            └── look-ahead.ts

supabase/
└── migrations/
    ├── 068_payment_applications.sql
    ├── 069_lien_waivers.sql
    ├── 070_subcontractor_insurance.sql
    └── 071_look_ahead_planning.sql
```

---

## Success Criteria

| Phase | Metric | Target |
|-------|--------|--------|
| Quick Wins | RFI/Submittal pages functional | 100% |
| Payment Apps | G702/G703 PDF generation | Working |
| Payment Apps | SOV editing | Spreadsheet-like UX |
| Change Orders | PCO→CO workflow | Full lifecycle |
| Lien Waivers | State templates | 10 states |
| Insurance | Expiration alerts | 30/60/90 days |
| Look-Ahead | 3-week view | Drag-drop working |
| Look-Ahead | PDF export | Print-ready |

---

## Dependencies

```
Payment Applications
    └── Lien Waivers (waiver requirements)
    └── Change Orders (approved COs affect contract sum)
    └── Cost Codes (SOV items)

Lien Waivers
    └── Subcontractors
    └── Payment Applications

Insurance
    └── Subcontractors

Look-Ahead
    └── Subcontractors
    └── RFIs (constraint linking)
    └── Submittals (constraint linking)
    └── Meetings (snapshot distribution)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AIA form compliance | Use official AIA form structure, validate with sample forms |
| State lien law variations | Start with 10 most common states, flag "custom template needed" for others |
| Insurance OCR complexity | Defer OCR to v2, manual entry for v1 |
| Schedule integration complexity | Keep look-ahead independent of full CPM for v1 |

---

*Plan created: December 7, 2025*
*Estimated completion: 12 weeks*
*Last updated: December 7, 2025*
