# Shop Drawings Submittal/Review/Approval Process

This document outlines the complete workflow for shop drawings and other submittals in the JobSight construction management platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Submittal Types](#submittal-types)
3. [Submittal Numbering (CSI MasterFormat)](#submittal-numbering-csi-masterformat)
4. [Workflow States](#workflow-states)
5. [Approval Codes (A/B/C/D)](#approval-codes-abcd)
6. [Ball-in-Court Tracking](#ball-in-court-tracking)
7. [Complete Workflow](#complete-workflow)
8. [Revision Process](#revision-process)
9. [Lead Time Management](#lead-time-management)
10. [User Roles & Responsibilities](#user-roles--responsibilities)
11. [Database Schema](#database-schema)
12. [UI Components](#ui-components)
13. [API Reference](#api-reference)

---

## Overview

Submittals are documents submitted by contractors/subcontractors to demonstrate that materials, equipment, or shop drawings meet contract requirements. They require review and approval before purchasing materials or beginning installation.

### Why Submittals Matter

- **Quality Control**: Ensures specified materials are used
- **Design Verification**: Confirms fabrication meets design intent
- **Documentation**: Creates permanent record for closeout
- **Liability Protection**: Establishes approval chain for disputes
- **Schedule Management**: Late submittals delay material procurement

---

## Submittal Types

| Type | Description | Examples |
|------|-------------|----------|
| `shop_drawing` | Fabrication/installation drawings | Structural steel details, millwork, precast panels |
| `product_data` | Manufacturer specifications | Cut sheets, performance data, installation guides |
| `sample` | Physical product samples | Brick, tile, carpet, paint colors, wood stains |
| `mix_design` | Material formulas | Concrete mix, asphalt mix |
| `test_report` | Lab/field test results | Concrete breaks, soil compaction, fire ratings |
| `certificate` | Compliance documentation | Mill certifications, UL listings |
| `warranty` | Warranty documentation | Equipment warranties, roofing warranties |
| `operation_maintenance` | O&M manuals | Equipment manuals, maintenance procedures |
| `closeout` | Project closeout docs | As-built drawings, final certifications |
| `other` | Miscellaneous | Any other submittal type |

---

## Submittal Numbering (CSI MasterFormat)

Submittals are numbered using the **CSI MasterFormat** specification section system:

### Format: `[Spec Section]-[Sequence Number]`

**Examples:**
- `03 30 00-1` → First submittal in Cast-in-Place Concrete
- `05 12 00-2` → Second submittal in Structural Steel Framing
- `08 11 13-1` → First submittal in Hollow Metal Doors
- `09 65 00-3` → Third submittal in Resilient Flooring

### Common CSI Divisions

| Division | Name | Common Submittals |
|----------|------|-------------------|
| 03 | Concrete | Mix designs, rebar shop drawings, form drawings |
| 04 | Masonry | Brick samples, mortar colors, lintel details |
| 05 | Metals | Structural steel shop drawings, misc metals |
| 06 | Wood/Plastics | Millwork shop drawings, wood samples |
| 07 | Thermal/Moisture | Roofing, waterproofing, insulation |
| 08 | Openings | Door/window hardware, curtain wall details |
| 09 | Finishes | Paint colors, flooring, ceiling systems |
| 10 | Specialties | Signage, toilet accessories, lockers |
| 21 | Fire Suppression | Sprinkler shop drawings |
| 22 | Plumbing | Fixtures, piping shop drawings |
| 23 | HVAC | Equipment, ductwork shop drawings |
| 26 | Electrical | Panels, fixtures, conduit layouts |

---

## Workflow States

### Review Status Values

```
┌─────────────────────┐
│   not_submitted     │  (Draft - not yet sent for review)
└─────────┬───────────┘
          │ Submit for Review
          ▼
┌─────────────────────┐
│     submitted       │  (Awaiting initial review)
└─────────┬───────────┘
          │ GC picks up for review
          ▼
┌─────────────────────┐
│  under_gc_review    │  (GC reviewing)
└─────────┬───────────┘
          │
    ┌─────┴─────┬──────────────┬──────────────┐
    │           │              │              │
    ▼           ▼              ▼              ▼
┌────────┐ ┌──────────┐ ┌───────────────┐ ┌────────────────────┐
│approved│ │approved_ │ │submitted_to_  │ │  revise_resubmit   │
│  (A)   │ │as_noted  │ │  architect    │ │       (C)          │
│        │ │   (B)    │ │               │ │                    │
└────────┘ └──────────┘ └───────┬───────┘ └────────┬───────────┘
                                │                   │
                          A/E Review          Back to Sub
                                │                   │
                    ┌───────────┼───────────┐       │
                    │           │           │       │
                    ▼           ▼           ▼       ▼
              ┌────────┐  ┌──────────┐  ┌────────┐
              │approved│  │approved_ │  │rejected│
              │  (A)   │  │as_noted  │  │  (D)   │
              │        │  │   (B)    │  │        │
              └────────┘  └──────────┘  └────────┘
```

### Status Definitions

| Status | Description | Can Proceed? |
|--------|-------------|--------------|
| `not_submitted` | Draft, not yet sent for review | No |
| `submitted` | Sent, awaiting initial review | No |
| `under_gc_review` | GC is actively reviewing | No |
| `submitted_to_architect` | Forwarded to A/E for review | No |
| `approved` | Final approval (Code A) | **Yes** |
| `approved_as_noted` | Minor notes (Code B) | **Yes** |
| `revise_resubmit` | Must revise and resubmit (Code C) | No |
| `rejected` | Not approved (Code D) | No |

---

## Approval Codes (A/B/C/D)

The industry-standard approval action codes used by architects and engineers:

### Code A - Approved

```
┌─────────────────────────────────────────────────────────────┐
│  ● A - APPROVED                                             │
│                                                             │
│  No exceptions taken.                                       │
│  Proceed with fabrication/procurement.                      │
│  No resubmittal required.                                   │
└─────────────────────────────────────────────────────────────┘
```

**What it means:**
- Submittal meets all contract requirements
- Proceed with ordering and installation
- Keep approved copy on site

### Code B - Approved as Noted

```
┌─────────────────────────────────────────────────────────────┐
│  ● B - APPROVED AS NOTED                                    │
│                                                             │
│  Make corrections noted.                                    │
│  Proceed with fabrication/procurement.                      │
│  No resubmittal typically required.                         │
└─────────────────────────────────────────────────────────────┘
```

**What it means:**
- Generally acceptable with minor corrections
- Incorporate noted changes during fabrication/installation
- Review comments carefully before proceeding
- Keep marked-up copy with corrections noted

### Code C - Revise and Resubmit

```
┌─────────────────────────────────────────────────────────────┐
│  ● C - REVISE AND RESUBMIT                                  │
│                                                             │
│  Make corrections and resubmit for review.                  │
│  DO NOT proceed until approved.                             │
│  Resubmittal required.                                      │
└─────────────────────────────────────────────────────────────┘
```

**What it means:**
- Significant issues found
- Cannot proceed with fabrication/ordering
- Must address all comments
- Submit revised version as new revision (Rev 1, Rev 2, etc.)
- Expect additional review time

### Code D - Rejected

```
┌─────────────────────────────────────────────────────────────┐
│  ● D - REJECTED                                             │
│                                                             │
│  Not approved. See comments.                                │
│  DO NOT proceed.                                            │
│  Major revisions or different product required.             │
└─────────────────────────────────────────────────────────────┘
```

**What it means:**
- Does not meet contract requirements
- Cannot proceed under any circumstances
- May need different product/manufacturer
- Often requires RFI or substitution request
- Consult with design team before resubmitting

---

## Ball-in-Court Tracking

Ball-in-court shows who currently has responsibility to act:

| Entity | When Ball is Here |
|--------|-------------------|
| `subcontractor` | Needs to prepare/submit, or revise after C code |
| `gc` | GC reviewing before forwarding to architect |
| `architect` | Architect/engineer reviewing |
| `owner` | Owner approval required (special items) |
| `engineer` | Consulting engineer review |
| `consultant` | Specialty consultant review |

### Automatic Ball-in-Court Updates

| Action | Ball Moves To |
|--------|---------------|
| Submittal created | `subcontractor` |
| Submitted for review | `gc` |
| Forwarded to architect | `architect` |
| Approved (A) | Complete |
| Approved as Noted (B) | Complete |
| Revise & Resubmit (C) | `subcontractor` |
| Rejected (D) | `subcontractor` |

---

## Complete Workflow

### Phase 1: Preparation (Subcontractor)

```
1. Subcontractor receives contract documents
2. Reviews specifications for submittal requirements
3. Prepares submittal package:
   - Shop drawings from fabricator
   - Product data from manufacturer
   - Samples as required
4. Creates submittal in system:
   - Assigns spec section number
   - Attaches documents
   - Adds items/products
   - Sets required date
5. Submits to GC for review
```

### Phase 2: GC Review

```
1. GC receives submittal notification
2. Reviews for:
   - Compliance with specifications
   - Coordination with other trades
   - Dimensions and clearances
   - Schedule impact
3. Decision:
   - If issues found → Return to sub with comments
   - If acceptable → Forward to architect
4. Stamps and forwards to architect/engineer
```

### Phase 3: Architect/Engineer Review

```
1. A/E receives submittal
2. Reviews for:
   - Design intent compliance
   - Code compliance
   - Aesthetic requirements
   - Technical specifications
3. Applies approval code:
   - A = Approved (proceed)
   - B = Approved as Noted (proceed with corrections)
   - C = Revise & Resubmit (do not proceed)
   - D = Rejected (do not proceed)
4. Returns with comments/markups
```

### Phase 4: Distribution

```
1. GC receives reviewed submittal
2. Logs approval code in system
3. Distributes to:
   - Subcontractor (for fabrication)
   - Project files
   - Field (if approved)
4. If C or D code → Notifies sub, tracks resubmittal
```

### Phase 5: Fabrication/Procurement

```
If Approved (A or B):
1. Subcontractor orders materials
2. Fabrication begins
3. Lead time countdown starts
4. Delivery scheduled
5. Installation proceeds per approved submittal
```

---

## Revision Process

When a submittal receives a **C (Revise & Resubmit)** code:

### Step 1: Review Comments

```
- Carefully read all reviewer comments
- Identify required changes
- Address each comment point-by-point
```

### Step 2: Create Revision

```
1. In submittal detail, click "Create Revision"
2. System increments revision:
   - Rev 0 → Rev 1
   - Rev 1 → Rev 2
   - Or letter: Rev A → Rev B
3. Add reason for resubmission
4. Update/replace attachments with revised documents
5. Submit new revision for review
```

### Step 3: Resubmit

```
1. New revision starts at "not_submitted" status
2. Ball-in-court returns to subcontractor
3. Submit revised package through same workflow
4. Previous revision marked as "superseded"
```

### Revision History

The system maintains complete revision history:

```
Submittal: 05 12 00-1 (Structural Steel Shop Drawings)
├── Rev 0: Submitted 01/15, Code C (Revise)
├── Rev 1: Submitted 01/29, Code B (Approved as Noted)
└── Rev 1 is current
```

---

## Lead Time Management

### Key Dates

| Field | Description |
|-------|-------------|
| `date_required` | When submittal is needed (based on schedule) |
| `date_submitted` | When submitted for review |
| `date_received` | When GC received |
| `date_returned` | When returned with approval code |
| `review_due_date` | When review should be complete |

### Lead Time Calculation

```
Required On-Site Date:     March 15
Fabrication Lead Time:     8 weeks
Review Cycle Time:         14 days
                          ─────────
Latest Submit Date:        January 3

Timeline:
Jan 3 ──── Submit ──── Jan 17 ──── Approval ──── Mar 15 ──── Delivery
         (14 days)              (8 weeks fab)
```

### Overdue Detection

Submittals are flagged as overdue when:
- `date_required` < today's date
- AND `review_status` is NOT `approved` or `approved_as_noted`

### Traffic Light Status

| Color | Condition |
|-------|-----------|
| 🟢 Green | Approved or Approved as Noted |
| 🟡 Yellow | Pending review, not yet overdue |
| 🔴 Red | Overdue or Rejected |
| ⚪ Gray | Not yet submitted |

---

## User Roles & Responsibilities

### Subcontractor

| Task | Description |
|------|-------------|
| Prepare submittals | Create shop drawings, gather product data |
| Submit for review | Upload documents, submit to GC |
| Address comments | Respond to reviewer notes |
| Create revisions | Revise and resubmit after C code |
| Track status | Monitor approval progress |

### General Contractor (GC)

| Task | Description |
|------|-------------|
| Review submittals | Check for spec compliance, coordination |
| Forward to A/E | Send to architect for design review |
| Log approvals | Record approval codes in system |
| Distribute | Send approved submittals to field |
| Track schedule | Monitor overdue submittals |

### Architect/Engineer

| Task | Description |
|------|-------------|
| Review design | Verify design intent compliance |
| Apply approval code | A, B, C, or D |
| Provide comments | Document required corrections |
| Return promptly | Meet contractual review timeframes |

### Owner

| Task | Description |
|------|-------------|
| Special approvals | Review high-value or visible items |
| Monitor progress | Track submittal status via reports |
| Final acceptance | Accept closeout submittals |

---

## Database Schema

### Core Tables

#### `submittals`
Primary submittal tracking table.

```sql
CREATE TABLE submittals (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  company_id UUID NOT NULL,

  -- Identification
  submittal_number VARCHAR(50),        -- "03 30 00-1"
  revision_number INTEGER DEFAULT 0,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Classification
  submittal_type VARCHAR(50),          -- shop_drawing, product_data, etc.
  spec_section VARCHAR(20),            -- "03 30 00"
  spec_section_title VARCHAR(255),     -- "Cast-in-Place Concrete"
  discipline VARCHAR(100),

  -- Timeline
  date_required DATE,
  date_submitted TIMESTAMPTZ,
  date_received TIMESTAMPTZ,
  date_returned TIMESTAMPTZ,

  -- Review
  review_status VARCHAR(50) DEFAULT 'not_submitted',
  approval_code VARCHAR(1),            -- A, B, C, D
  approval_code_date TIMESTAMPTZ,
  approval_code_set_by UUID,
  review_comments TEXT,
  review_due_date DATE,
  days_for_review INTEGER DEFAULT 14,

  -- Ball-in-Court
  ball_in_court UUID,
  ball_in_court_entity VARCHAR(50),    -- subcontractor, gc, architect

  -- Assignment
  submitted_by_company UUID,
  submitted_by_user UUID,
  subcontractor_id UUID,
  reviewer_id UUID,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ               -- Soft delete
);
```

#### `submittal_items`
Individual products within a submittal.

```sql
CREATE TABLE submittal_items (
  id UUID PRIMARY KEY,
  submittal_id UUID REFERENCES submittals(id),
  item_number INTEGER,
  description TEXT,
  manufacturer VARCHAR(255),
  model_number VARCHAR(255),
  quantity DECIMAL,
  unit VARCHAR(50),
  notes TEXT
);
```

#### `submittal_attachments`
Files attached to submittals.

```sql
CREATE TABLE submittal_attachments (
  id UUID PRIMARY KEY,
  submittal_id UUID REFERENCES submittals(id),
  document_id UUID,                    -- Links to documents table
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size BIGINT,
  uploaded_by UUID
);
```

#### `submittal_reviews`
Review history and decisions.

```sql
CREATE TABLE submittal_reviews (
  id UUID PRIMARY KEY,
  submittal_id UUID REFERENCES submittals(id),
  review_status VARCHAR(50),
  approval_code VARCHAR(1),            -- A, B, C, D
  comments TEXT,
  reviewed_by UUID,
  reviewer_name VARCHAR(255),
  reviewer_company VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  review_attachments JSONB             -- Marked-up documents
);
```

#### `submittal_revisions`
Revision tracking for resubmittals.

```sql
CREATE TABLE submittal_revisions (
  id UUID PRIMARY KEY,
  submittal_id UUID REFERENCES submittals(id),
  revision_number INTEGER,
  revision_letter VARCHAR(10),         -- "A", "B", "AA"
  revision_label TEXT GENERATED ALWAYS AS (
    CASE
      WHEN revision_letter IS NOT NULL THEN 'Rev ' || revision_letter
      ELSE 'Rev ' || revision_number
    END
  ) STORED,
  status VARCHAR(50),                  -- current, superseded, void
  is_current BOOLEAN DEFAULT true,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  approval_code VARCHAR(1),
  change_description TEXT,
  reason_for_resubmission TEXT,
  attachments JSONB                    -- Snapshot of files
);
```

---

## UI Components

### Main Pages

| Component | Path | Purpose |
|-----------|------|---------|
| `DedicatedSubmittalsPage` | `/projects/:id/submittals` | Main submittal list with CSI grouping |
| `DedicatedSubmittalDetailPage` | `/projects/:id/submittals/:submittalId` | Single submittal detail view |

### Key Components

| Component | Purpose |
|-----------|---------|
| `CreateDedicatedSubmittalDialog` | Create new submittal |
| `SubmittalReviewForm` | A/B/C/D approval code selection |
| `ApprovalCodeBadge` | Display approval code with color |
| `ApprovalCodeSelect` | Dropdown to select approval code |
| `SubmittalStatusBadge` | Display review status |
| `SubmittalItemsEditor` | Add/edit submittal items |
| `CreateRevisionDialog` | Create new revision after C code |
| `SubmittalRegister` | AIA G810-style log view |
| `LeadTimeCalculator` | Calculate required submit dates |
| `DedicatedSubmittalAnalytics` | Dashboard with statistics |

### Views & Filtering

- **List View**: All submittals in table format
- **Spec-Grouped View**: Organized by CSI division
- **Analytics View**: Charts and statistics
- **Filters**: Status, ball-in-court, spec section, type

---

## API Reference

### React Query Hooks

#### Queries

```typescript
// Fetch all submittals for a project
const { data: submittals } = useProjectSubmittals(projectId);

// Fetch single submittal
const { data: submittal } = useSubmittal(submittalId);

// Fetch by ball-in-court
const { data: myItems } = useSubmittalsByBallInCourt(projectId, 'gc');

// Fetch by status
const { data: pending } = useSubmittalsByStatus(projectId, 'submitted');

// Fetch grouped by spec section
const { data: grouped } = useSubmittalsBySpecSection(projectId);

// Fetch submittal items
const { data: items } = useSubmittalItems(submittalId);

// Fetch review history
const { data: reviews } = useSubmittalReviews(submittalId);

// Fetch change history
const { data: history } = useSubmittalHistory(submittalId);
```

#### Mutations

```typescript
// Create submittal
const createMutation = useCreateSubmittal();
await createMutation.mutateAsync({
  project_id: projectId,
  title: 'Structural Steel Shop Drawings',
  submittal_type: 'shop_drawing',
  spec_section: '05 12 00',
  spec_section_title: 'Structural Steel Framing',
  date_required: '2024-03-15',
  subcontractor_id: subId,
});

// Submit for review
const submitMutation = useSubmitForReview();
await submitMutation.mutateAsync(submittalId);

// Apply approval code
const reviewMutation = useSubmitReviewWithCode();
await reviewMutation.mutateAsync({
  submittal_id: submittalId,
  approval_code: 'B',
  comments: 'Verify anchor bolt embedment depth per structural notes.',
});

// Create revision (after C code)
const revisionMutation = useCreateSubmittalRevision();
await revisionMutation.mutateAsync({
  submittal_id: submittalId,
  reason_for_resubmission: 'Updated per architect comments',
});

// Upload attachment
const uploadMutation = useUploadSubmittalAttachment();
await uploadMutation.mutateAsync({
  submittal_id: submittalId,
  file: fileObject,
});
```

---

## Best Practices

### For Subcontractors

1. **Submit Early**: Account for review cycles and potential resubmittals
2. **Complete Packages**: Include all required items in initial submission
3. **Reference Specs**: Clearly note specification section compliance
4. **Quality Documents**: High-resolution drawings, complete data sheets
5. **Track Status**: Monitor ball-in-court and respond promptly to C codes

### For GC Project Teams

1. **Pre-Review**: Check submittals before forwarding to architect
2. **Coordinate**: Verify submittal doesn't conflict with other trades
3. **Track Overdue**: Run weekly overdue reports
4. **Expedite**: Push architect for timely reviews on critical items
5. **Document**: Log all reviews and communications

### For Architects/Engineers

1. **Timely Review**: Meet contractual review periods (typically 14 days)
2. **Clear Comments**: Specific, actionable review comments
3. **Consistent Codes**: Apply A/B/C/D codes consistently
4. **Markup Clearly**: Mark up drawings with clear corrections
5. **Respond to RFIs**: If submittal raises questions, document via RFI

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Submittal stuck in review | Check ball-in-court, send reminder |
| Multiple C codes | Review comments for recurring issues |
| Overdue submittals | Escalate to PM, adjust schedule |
| Missing attachments | Contact subcontractor for files |
| Wrong spec section | Edit submittal to correct section |

### Reporting

- **Submittal Register**: Export PDF for OAC meetings
- **Overdue Report**: Filter by overdue status
- **Ball-in-Court Summary**: See who has pending items
- **Approval Code Stats**: Track A/B/C/D distribution

---

## Related Documentation

- [Workflows Overview](./WORKFLOWS.md)
- [RFI Process](./RFI_PROCESS.md)
- [Change Order Process](./CHANGE_ORDER_PROCESS.md)
- [Document Management](./DOCUMENT_MANAGEMENT.md)

---

*Last Updated: January 2026*
