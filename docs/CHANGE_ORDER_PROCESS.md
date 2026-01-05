# Change Order Process

This document outlines the complete workflow for Change Orders (COs) and Potential Change Orders (PCOs) in the JobSight construction management platform.

---

## Table of Contents

1. [Overview](#overview)
2. [PCO vs CO Distinction](#pco-vs-co-distinction)
3. [Change Types & Reason Codes](#change-types--reason-codes)
4. [Workflow States](#workflow-states)
5. [Complete Workflow](#complete-workflow)
6. [Line Items Structure](#line-items-structure)
7. [Approval Workflow](#approval-workflow)
8. [Cost & Schedule Impact](#cost--schedule-impact)
9. [Contingency Tracking](#contingency-tracking)
10. [Ball-in-Court Tracking](#ball-in-court-tracking)
11. [User Roles & Responsibilities](#user-roles--responsibilities)
12. [Database Schema](#database-schema)
13. [UI Components](#ui-components)
14. [API Reference](#api-reference)

---

## Overview

A Change Order is a formal modification to the construction contract that changes the scope of work, contract price, or contract time. Change Orders document agreed-upon changes between the owner and contractor.

### Why Change Orders Matter

- **Contract Modification**: Legal document changing original agreement
- **Cost Control**: Track budget changes and variances
- **Schedule Management**: Document time extensions
- **Risk Management**: Allocate responsibility for changes
- **Payment Authorization**: Authorize additional compensation
- **Audit Trail**: Complete record of all contract modifications

### Change Order Terminology

| Term | Definition |
|------|------------|
| **PCO** | Potential Change Order - proposed change, not yet approved |
| **CO** | Change Order - approved and executed change |
| **CCD** | Construction Change Directive - owner directs work before price agreement |
| **T&M** | Time & Materials - hourly labor plus materials pricing |
| **Lump Sum** | Fixed price for defined scope |
| **Unit Price** | Price per unit of work (e.g., $/cubic yard) |

---

## PCO vs CO Distinction

The system tracks changes through two phases:

### Potential Change Order (PCO)

| Attribute | Value |
|-----------|-------|
| `is_pco` | `true` |
| `pco_number` | Assigned (e.g., PCO-001) |
| `co_number` | `null` |
| Status | Draft through pending approval |
| Authorization | **Cannot proceed** with cost/time impacts |
| Purpose | Document proposed change, get pricing |

### Change Order (CO)

| Attribute | Value |
|-----------|-------|
| `is_pco` | `false` |
| `pco_number` | Retained from PCO |
| `co_number` | Assigned (e.g., CO-001) |
| Status | Approved and executed |
| Authorization | **Authorized to proceed** |
| Purpose | Formal contract modification |

### Numbering Example

```
PCO-001 → Under review → Approved → CO-001
PCO-002 → Rejected → (no CO number)
PCO-003 → Under review → Approved → CO-002
PCO-004 → Voided → (no CO number)
PCO-005 → Under review → Approved → CO-003
```

---

## Change Types & Reason Codes

### Change Type Values

| Type | Description | Example |
|------|-------------|---------|
| `scope_change` | Owner requests additional work | Add extra conference room |
| `design_clarification` | Design details added/clarified | RFI response adds scope |
| `unforeseen_condition` | Site conditions differ from expected | Rock encountered during excavation |
| `owner_request` | Owner-initiated change | Upgrade finishes |
| `value_engineering` | Alternative approach (additive or deductive) | Substitute materials for savings |
| `error_omission` | Error in contract documents | Missing details on drawings |

### When to Use Each Type

```
SCOPE_CHANGE
├── Owner adds rooms or features
├── Owner deletes scope
└── Phasing changes

DESIGN_CLARIFICATION
├── RFI response adds work
├── ASI (Architect's Supplemental Instruction)
└── Coordination details added

UNFORESEEN_CONDITION
├── Subsurface conditions (rock, water, contamination)
├── Concealed conditions in renovation
└── Utility conflicts

OWNER_REQUEST
├── Finish upgrades
├── Equipment changes
└── Occupancy date changes

VALUE_ENGINEERING
├── Material substitutions
├── Method changes
└── System alternatives

ERROR_OMISSION
├── Missing details on drawings
├── Specification conflicts
└── Calculation errors
```

---

## Workflow States

### Status Flow Diagram

```
┌─────────────────────┐
│       DRAFT         │  (PCO created, editing)
└─────────┬───────────┘
          │ Assign estimator
          ▼
┌─────────────────────┐
│  PENDING_ESTIMATE   │  (Awaiting pricing)
└─────────┬───────────┘
          │ Submit estimate
          ▼
┌─────────────────────┐
│  ESTIMATE_COMPLETE  │  (Pricing submitted)
└─────────┬───────────┘
          │ Submit for internal approval
          ▼
┌─────────────────────────────┐
│  PENDING_INTERNAL_APPROVAL  │  (PM/Manager review)
└─────────┬───────────────────┘
          │ ← Rejected (terminal)
          │ Approved
          ▼
┌─────────────────────┐
│  INTERNALLY_APPROVED │  (Ready for owner)
└─────────┬───────────┘
          │ Submit to owner
          ▼
┌─────────────────────┐
│ PENDING_OWNER_REVIEW │  (Owner reviewing)
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────┐
│APPROVED│  │REJECTED│
│        │  │        │
│ is_pco │  └────────┘
│ =false │
│CO-XXX  │
│assigned│
└────────┘

At any point:
ANY STATE → VOID (can be voided)
```

### Status Definitions

| Status | Description | `is_pco` | Can Edit? |
|--------|-------------|----------|-----------|
| `draft` | Initial creation | true | Yes |
| `pending_estimate` | Awaiting pricing | true | Yes |
| `estimate_complete` | Pricing submitted | true | Limited |
| `pending_internal_approval` | Internal review | true | No |
| `internally_approved` | Ready for owner | true | No |
| `pending_owner_review` | Owner reviewing | true | No |
| `approved` | Executed | **false** | No |
| `rejected` | Not approved | true | No |
| `void` | Cancelled | true | No |

---

## Complete Workflow

### Phase 1: Identification

```
Change identified through:
├── RFI response (links to related_rfi_id)
├── Field discovery (unforeseen condition)
├── Owner request (scope change)
├── Design revision (ASI/Bulletin)
└── Value engineering proposal

Create PCO:
1. Title and description
2. Select change_type
3. Reference related RFI/submittal
4. Preliminary cost/time estimate (optional)
5. Justification text
```

### Phase 2: Pricing (Estimate)

```
Estimator assigned:
1. Reviews scope of change
2. Gathers subcontractor quotes
3. Prepares line item breakdown:
   - Labor (hours × rates)
   - Materials (quantity × unit price)
   - Equipment (rental/usage)
   - Subcontractor quotes
   - Markup (overhead & profit)
4. Calculates schedule impact
5. Submits estimate

Line Item Categories:
├── LABOR: Worker hours, rates, burden
├── MATERIAL: Products, quantities, costs
├── EQUIPMENT: Rentals, usage charges
├── SUBCONTRACTOR: Trade contractor bids
└── OTHER: Miscellaneous costs
```

### Phase 3: Internal Approval

```
Project Manager/Operations review:
1. Verify pricing accuracy
2. Check markup rates
3. Confirm schedule impact
4. Review justification
5. Decision:
   - Approve → Move to owner submission
   - Reject → Return with comments
   - Request revision → Back to estimating

Approval Authority Hierarchy:
├── PM: Up to $5,000
├── Sr. PM: Up to $25,000
├── Operations Manager: Up to $50,000
├── Director: Up to $100,000
├── VP Operations: Up to $250,000
├── CFO: Up to $500,000
└── CEO: Unlimited
```

### Phase 4: Owner Submission

```
Submit to Owner:
1. Formal proposal package
2. Line item breakdown
3. Schedule impact analysis
4. Supporting documentation:
   - Related RFI and response
   - Photos of conditions
   - Subcontractor quotes
   - Spec references
5. Set ball_in_court to owner
```

### Phase 5: Owner Review & Approval

```
Owner reviews proposal:
1. Verify scope is required
2. Review pricing
3. May negotiate:
   - Request cost reduction
   - Challenge line items
   - Adjust schedule days
4. Decision:
   - Approve (with final amounts)
   - Approve with modifications
   - Reject (with reason)

Upon Approval:
├── is_pco → false
├── co_number assigned (CO-001, CO-002...)
├── approved_amount set (may differ from proposed)
├── approved_days set
├── date_owner_approved recorded
├── owner_signature_url captured
└── Contract amount updated
```

### Phase 6: Execution

```
After Owner Approval:
1. Issue Notice to Proceed for change work
2. Update project budget
3. Update project schedule
4. Distribute to field team
5. Track work completion
6. Include in payment applications
```

---

## Line Items Structure

### Line Item Categories

| Category | Description | Typical Fields |
|----------|-------------|----------------|
| **LABOR** | Worker hours and wages | Hours, rate, burden % |
| **MATERIAL** | Products and supplies | Quantity, unit, unit price |
| **EQUIPMENT** | Tools and machinery | Hours, daily/weekly rate |
| **SUBCONTRACTOR** | Trade contractor work | Lump sum or unit pricing |
| **OTHER** | Miscellaneous costs | Description, amount |

### Line Item Fields

```typescript
interface LineItem {
  id: string;
  change_order_id: string;
  item_number: number;              // Sequential: 1, 2, 3...
  category: LineItemCategory;       // labor, material, equipment, subcontractor, other
  description: string;
  cost_code?: string;               // Budget code reference

  // Pricing
  quantity: number;
  unit: string;                     // HR, EA, SF, CY, LS, etc.
  unit_price: number;
  extended_price: number;           // quantity × unit_price

  // Markup
  markup_percent: number;           // e.g., 15%
  markup_amount: number;            // extended_price × markup_percent

  // Total
  total_amount: number;             // extended_price + markup_amount

  notes?: string;
}
```

### Calculation Flow

```
Step 1: Extended Price
quantity × unit_price = extended_price

Example: 40 hours × $75/hr = $3,000

Step 2: Markup Amount
extended_price × (markup_percent / 100) = markup_amount

Example: $3,000 × 0.15 = $450

Step 3: Line Item Total
extended_price + markup_amount = total_amount

Example: $3,000 + $450 = $3,450

Step 4: Change Order Total
SUM(all line items total_amount) = proposed_amount

Example:
  Labor:        $3,450
  Material:     $2,300
  Equipment:      $800
  Subcontractor: $5,750
  ────────────────────
  Total:       $12,300
```

### Common Units

| Unit | Description | Used For |
|------|-------------|----------|
| HR | Hour | Labor |
| EA | Each | Items, fixtures |
| SF | Square Foot | Flooring, painting |
| LF | Linear Foot | Piping, conduit |
| CY | Cubic Yard | Concrete, excavation |
| TON | Ton | Asphalt, steel |
| LS | Lump Sum | Subcontractor work |
| DAY | Day | Equipment rental |
| WK | Week | Equipment rental |

---

## Approval Workflow

### Approval Authority Levels

| Role | Max Amount | Second Approval Required |
|------|------------|-------------------------|
| Project Manager | $5,000 | No |
| Senior PM | $25,000 | Yes (>$15,000) |
| Operations Manager | $50,000 | Yes (>$35,000) |
| Director | $100,000 | Yes (>$75,000) |
| VP Operations | $250,000 | Yes (>$150,000) |
| CFO | $500,000 | No |
| CEO | Unlimited | No |

### Approval Check Logic

```typescript
function canApprove(userRole: Role, amount: number): ApprovalCheck {
  const level = getApprovalLevel(userRole);

  if (amount <= level.maxAmount) {
    if (amount > level.secondApprovalThreshold) {
      return { canApprove: true, requiresSecondApproval: true };
    }
    return { canApprove: true, requiresSecondApproval: false };
  }

  return {
    canApprove: false,
    requiresEscalation: true,
    escalateTo: getNextLevel(userRole)
  };
}
```

### Escalation Process

When amount exceeds user's authority:

```
1. User attempts to approve $75,000 CO
2. System checks: User is PM (max $5,000)
3. System identifies: Requires Operations Manager approval
4. User clicks "Request Escalation"
5. System:
   - Records escalation request in metadata
   - Updates ball_in_court to Operations Manager
   - Sends notification
6. Operations Manager reviews and approves/rejects
```

### Multi-Level Approval Flow

```
Internal Approval:
├── Step 1: PM reviews and approves internally
├── Step 2: If > PM authority, escalates to Sr. PM/Ops Manager
├── Step 3: Internal approval recorded
└── Sets: internal_approval_status, date_internal_approved

Owner Approval:
├── Step 1: CO submitted to owner
├── Step 2: Owner reviews proposal
├── Step 3: Owner approves with final amounts
├── Step 4: Signature captured
└── Sets: owner_approval_status, approved_amount, approved_days

Execution:
├── is_pco → false
├── co_number assigned
└── date_executed set
```

---

## Cost & Schedule Impact

### Cost Fields

| Field | Description |
|-------|-------------|
| `proposed_amount` | Contractor's proposed cost |
| `approved_amount` | Owner-approved cost (may differ) |
| `original_contract_amount` | Base contract price |
| `previous_changes_amount` | Sum of prior approved COs |
| `revised_contract_amount` | Current total contract value |

### Contract Amount Calculation

```
revised_contract_amount =
  original_contract_amount +
  previous_changes_amount +
  approved_amount (current CO)

Example:
  Original Contract:    $1,000,000
  Previous COs:           $50,000  (CO-001 + CO-002)
  Current CO-003:         $25,000
  ────────────────────────────────
  Revised Contract:    $1,075,000
```

### Schedule Fields

| Field | Description |
|-------|-------------|
| `proposed_days` | Contractor's proposed time extension |
| `approved_days` | Owner-approved days (may differ) |

### Pricing Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| `lump_sum` | Fixed price for scope | Defined, measurable work |
| `time_materials` | Actual costs + markup | Undefined scope, T&M work |
| `unit_price` | Price per unit | Repetitive, quantity-based |

---

## Contingency Tracking

### What is Contingency?

Contingency is a budget reserve for unforeseen costs. Change orders often draw from contingency.

### Contingency Fields

```
Project Level:
├── contingency_amount: Original reserve ($100,000)
├── contingency_used: Sum of approved COs
├── contingency_remaining: contingency_amount - contingency_used
└── contingency_percent_used: (used / amount) × 100
```

### Alert Thresholds

| Usage | Status | Color |
|-------|--------|-------|
| < 90% | Healthy | Green |
| 90-95% | Warning | Yellow |
| 95-100% | Critical | Orange |
| > 100% | Depleted | Red |

### Contingency Tracking View

```
┌─────────────────────────────────────────────┐
│ Project Contingency                         │
├─────────────────────────────────────────────┤
│ Original:    $100,000                       │
│ Used:         $45,000  ████████░░░░ 45%    │
│ Remaining:    $55,000                       │
├─────────────────────────────────────────────┤
│ Recent Changes:                             │
│ • CO-001: $15,000 (Jan 15)                 │
│ • CO-002: $12,500 (Feb 3)                  │
│ • CO-003: $17,500 (Feb 28)                 │
└─────────────────────────────────────────────┘
```

---

## Ball-in-Court Tracking

### Ball-in-Court Roles

| Role | Description |
|------|-------------|
| `estimating` | Estimator preparing pricing |
| `pm` | Project Manager reviewing |
| `owner` | Owner/client reviewing |
| `architect` | Architect providing input |

### Automatic Updates

| Status Change | Ball Moves To |
|---------------|---------------|
| Draft created | Assigned user or PM |
| Pending estimate | Estimator |
| Estimate complete | PM |
| Pending internal approval | Approver |
| Internally approved | PM (to submit to owner) |
| Pending owner review | Owner |
| Approved/Rejected | Complete |

---

## User Roles & Responsibilities

### Project Manager

| Task | Description |
|------|-------------|
| Create PCOs | Initiate change documentation |
| Assign estimators | Route for pricing |
| Review estimates | Verify accuracy |
| Internal approval | Approve within authority |
| Submit to owner | Formal submission |
| Track status | Monitor approvals |

### Estimator

| Task | Description |
|------|-------------|
| Gather quotes | Collect subcontractor pricing |
| Build line items | Detailed cost breakdown |
| Calculate markup | Apply O&P percentages |
| Assess schedule | Determine time impact |
| Submit estimate | Complete pricing package |

### Operations/Executive

| Task | Description |
|------|-------------|
| Review large COs | Approve above PM authority |
| Approve escalations | Handle escalated requests |
| Monitor contingency | Track budget reserves |
| Negotiate with owner | Major CO discussions |

### Owner

| Task | Description |
|------|-------------|
| Review proposals | Evaluate necessity and cost |
| Negotiate pricing | Request adjustments |
| Approve/reject | Final decision authority |
| Sign COs | Execute approved changes |

---

## Database Schema

### Core Table: `change_orders`

```sql
CREATE TABLE change_orders (
  -- Identification
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  company_id UUID NOT NULL,
  pco_number INTEGER NOT NULL,        -- Always assigned
  co_number INTEGER,                  -- Assigned at approval
  display_number VARCHAR(20),         -- PCO-001 or CO-001

  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  change_type VARCHAR(50),            -- scope_change, unforeseen_condition, etc.
  justification TEXT,

  -- Status
  is_pco BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) DEFAULT 'draft',
  internal_approval_status VARCHAR(30),
  owner_approval_status VARCHAR(30),

  -- Timeline
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_submitted TIMESTAMPTZ,
  date_estimated TIMESTAMPTZ,
  date_internal_approved TIMESTAMPTZ,
  date_owner_submitted TIMESTAMPTZ,
  date_owner_approved TIMESTAMPTZ,
  date_executed TIMESTAMPTZ,

  -- Financial
  proposed_amount DECIMAL(15,2),
  approved_amount DECIMAL(15,2),
  proposed_days INTEGER,
  approved_days INTEGER,
  pricing_method VARCHAR(30),         -- lump_sum, time_materials, unit_price
  original_contract_amount DECIMAL(15,2),
  previous_changes_amount DECIMAL(15,2),
  revised_contract_amount DECIMAL(15,2),

  -- Assignment
  initiated_by UUID,
  assigned_to UUID,
  estimator_id UUID,
  ball_in_court UUID,
  ball_in_court_role VARCHAR(50),

  -- Related Items
  related_rfi_id UUID,
  related_submittal_id UUID,
  subcontractor_id UUID,

  -- Approval Signatures
  internal_approver_id UUID,
  internal_approver_name VARCHAR(255),
  owner_approver_name VARCHAR(255),
  owner_signature_url TEXT,
  owner_comments TEXT,

  -- Metadata
  metadata JSONB,                     -- Escalation history, approval history
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);
```

### Line Items Table: `change_order_line_items`

```sql
CREATE TABLE change_order_line_items (
  id UUID PRIMARY KEY,
  change_order_id UUID REFERENCES change_orders(id),
  item_number INTEGER,
  category VARCHAR(30),               -- labor, material, equipment, subcontractor, other
  description TEXT,
  cost_code VARCHAR(20),
  cost_code_id UUID,

  -- Pricing
  quantity DECIMAL(12,4),
  unit VARCHAR(20),
  unit_price DECIMAL(15,4),
  extended_price DECIMAL(15,2),       -- quantity × unit_price

  -- Markup
  markup_percent DECIMAL(5,2),
  markup_amount DECIMAL(15,2),

  -- Total
  total_amount DECIMAL(15,2),         -- extended_price + markup_amount

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);
```

### Supporting Tables

#### `change_order_attachments`
```sql
CREATE TABLE change_order_attachments (
  id UUID PRIMARY KEY,
  change_order_id UUID REFERENCES change_orders(id),
  document_id UUID,
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(50),              -- backup, proposal, approval, general
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `change_order_history`
```sql
CREATE TABLE change_order_history (
  id UUID PRIMARY KEY,
  change_order_id UUID REFERENCES change_orders(id),
  action VARCHAR(50),                 -- created, status_changed, amount_changed, converted_to_co
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID
);
```

---

## UI Components

### Main Components

| Component | Purpose |
|-----------|---------|
| `ChangeOrderApprovalFlow` | Visual workflow with approval actions |
| `ChangeOrderLineItems` | Full-featured line item editor |
| `ChangeOrderItemsEditor` | Spreadsheet-like bulk editor |
| `ChangeOrderHistoryTimeline` | Audit trail timeline |
| `ContingencyTracker` | Contingency reserve display |
| `ApprovalAuthorityDisplay` | User's approval limits |

### Dialog Components

| Component | Purpose |
|-----------|---------|
| `CreateChangeOrderDialogV2` | Create new PCO |
| `EditChangeOrderDialog` | Edit existing CO |
| `DeleteChangeOrderConfirmation` | Delete confirmation |

### List Components

| Component | Purpose |
|-----------|---------|
| `ChangeOrdersList` | Filterable CO table |
| `ChangeOrderAuditLog` | Detailed history log |

---

## API Reference

### React Query Hooks

#### Queries

```typescript
// Fetch COs with filters
const { data } = useChangeOrdersV2({
  project_id: projectId,
  status: 'pending_owner_review',
  is_pco: true,
});

// Fetch single CO
const { data: co } = useChangeOrderV2(changeOrderId);

// Fetch only PCOs
const { data: pcos } = usePCOs(projectId);

// Fetch only approved COs
const { data: cos } = useApprovedCOs(projectId);

// Get statistics
const { data: stats } = useChangeOrderStatisticsV2(projectId);

// Get line items
const { data: items } = useChangeOrderLineItems(changeOrderId);

// Get line item summary
const { data: summary } = useLineItemSummary(changeOrderId);

// Get history
const { data: history } = useChangeOrderHistory(changeOrderId);

// Check approval authority
const { data: check } = useCanApproveChangeOrder(changeOrderId, amount);
```

#### Mutations

```typescript
// Create PCO
const createMutation = useCreateChangeOrderV2();
await createMutation.mutateAsync({
  project_id: projectId,
  title: 'Additional HVAC Ductwork',
  description: 'Field discovered missing duct sections',
  change_type: 'unforeseen_condition',
  proposed_amount: 15000,
  proposed_days: 5,
});

// Submit estimate
const estimateMutation = useSubmitEstimate();
await estimateMutation.mutateAsync({
  id: coId,
  proposed_amount: 15000,
  proposed_days: 5,
});

// Internal approval
const internalMutation = useProcessInternalApproval();
await internalMutation.mutateAsync({
  id: coId,
  approved: true,
  comments: 'Approved - work is necessary',
});

// Submit to owner
const submitMutation = useSubmitToOwner();
await submitMutation.mutateAsync(coId);

// Owner approval
const ownerMutation = useProcessOwnerApproval();
await ownerMutation.mutateAsync({
  id: coId,
  approved: true,
  approved_amount: 14800,  // Negotiated down
  approved_days: 5,
  approver_name: 'John Smith - Owner',
});

// Execute CO
const executeMutation = useExecuteChangeOrder();
await executeMutation.mutateAsync(coId);
// Sets: is_pco=false, co_number assigned

// Void CO
const voidMutation = useVoidChangeOrder();
await voidMutation.mutateAsync({
  id: coId,
  reason: 'Scope no longer required',
});

// Add line item
const addItemMutation = useAddLineItem();
await addItemMutation.mutateAsync({
  changeOrderId: coId,
  item: {
    category: 'labor',
    description: 'Ductwork installation',
    quantity: 40,
    unit: 'HR',
    unit_price: 75,
    markup_percent: 15,
  },
});

// Request escalation
const escalateMutation = useRequestEscalation();
await escalateMutation.mutateAsync({
  changeOrderId: coId,
  amount: 75000,
  escalateTo: 'operations_manager',
  reason: 'Exceeds PM authority',
});
```

---

## Best Practices

### Creating Change Orders

**DO:**
- Document justification clearly
- Reference related RFIs/submittals
- Include photos of conditions
- Get subcontractor quotes in writing
- Set realistic schedule impacts

**DON'T:**
- Proceed with work before approval
- Combine unrelated changes in one CO
- Underestimate costs (causes disputes)
- Skip internal review process

### Pricing Best Practices

1. **Detailed Line Items**: Break down labor, material, equipment separately
2. **Support Documentation**: Include quotes, invoices, labor calculations
3. **Reasonable Markup**: Industry standard is 10-20% O&P
4. **Clear Units**: Use standard units (HR, SF, EA, LS)
5. **Cost Codes**: Link to budget for tracking

### Approval Best Practices

1. **Know Your Authority**: Understand your approval limits
2. **Escalate Properly**: Use system escalation, not email
3. **Document Decisions**: Add comments explaining approvals
4. **Track Ball-in-Court**: Know who needs to act
5. **Follow Up**: Don't let COs sit pending

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| CO stuck in pending | Check ball-in-court, send reminder |
| Amount disputes | Review line item backup |
| Missing signature | Use DocuSign integration |
| Contingency depleted | Escalate to executive team |
| Wrong approval level | Request proper escalation |

### Reporting

- **CO Log**: All COs with status and amounts
- **Contingency Report**: Reserve usage tracking
- **Approval Aging**: COs pending approval
- **Cost Summary**: Total contract changes

---

## Related Documentation

- [Workflows Overview](./WORKFLOWS.md)
- [Shop Drawings Submittal Process](./SHOP_DRAWINGS_SUBMITTAL_PROCESS.md)
- [RFI Process](./RFI_PROCESS.md)
- [Document Management](./DOCUMENT_MANAGEMENT.md)

---

*Last Updated: January 2026*
