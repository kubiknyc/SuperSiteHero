# RFI (Request for Information) Process

This document outlines the complete workflow for RFIs (Requests for Information) in the SuperSiteHero construction management platform.

---

## Table of Contents

1. [Overview](#overview)
2. [When to Use an RFI](#when-to-use-an-rfi)
3. [RFI Numbering](#rfi-numbering)
4. [Workflow States](#workflow-states)
5. [Ball-in-Court Tracking](#ball-in-court-tracking)
6. [Response Types](#response-types)
7. [Complete Workflow](#complete-workflow)
8. [Drawing Links](#drawing-links)
9. [Cost & Schedule Impact](#cost--schedule-impact)
10. [Response Time Tracking](#response-time-tracking)
11. [User Roles & Responsibilities](#user-roles--responsibilities)
12. [Database Schema](#database-schema)
13. [UI Components](#ui-components)
14. [API Reference](#api-reference)

---

## Overview

An RFI (Request for Information) is a formal question submitted when there's ambiguity, conflict, or missing information in contract documents (drawings, specifications, or scope of work). RFIs are a critical communication tool to prevent costly mistakes and document decisions.

### Why RFIs Matter

- **Prevent Costly Mistakes**: Clarify before building wrong
- **Document Decisions**: Create paper trail for disputes
- **Manage Risk**: Identify cost/schedule impacts early
- **Coordinate Trades**: Resolve conflicts between disciplines
- **Protect All Parties**: Legal record of communications

### RFI Volume Benchmarks

| Project Size | Typical RFI Count |
|--------------|-------------------|
| Small (<$5M) | 20-50 RFIs |
| Medium ($5M-$50M) | 100-300 RFIs |
| Large ($50M+) | 500-1,500+ RFIs |

---

## When to Use an RFI

### Common RFI Scenarios

| Scenario | Example |
|----------|---------|
| **Drawing Conflicts** | Plan shows door 3'-0" from wall, elevation shows 4'-0" |
| **Missing Information** | Detail shows "anchor bolt" but no size or embedment depth |
| **Specification Conflicts** | Plans call for painted CMU, specs call for ground face CMU |
| **Site Conditions** | Existing utility found that's not shown on drawings |
| **Substitution Requests** | "Can we use Product X instead of specified Product Y?" |
| **Clarification** | "Does 'provide blocking' mean solid or composite?" |
| **Code Questions** | "Does this detail meet current fire code?" |
| **Coordination Issues** | "Ductwork conflicts with structural beam at grid B-4" |

### When NOT to Use an RFI

- **Minor questions** that can be resolved with a phone call
- **Submittals** - use the submittal process instead
- **Change requests** - use the change order process
- **Schedule questions** - use meeting minutes or emails

---

## RFI Numbering

RFIs are automatically numbered sequentially per project:

### Format: `RFI-[Number]`

**Examples:**
- `RFI-001` → First RFI on project
- `RFI-042` → 42nd RFI on project
- `RFI-156` → 156th RFI on project

### Numbering Rules

- Numbers are **auto-assigned** when RFI is created
- Numbers are **unique per project**
- Numbers are **never reused** (even if RFI is voided)
- Format is zero-padded to 3 digits (001, 042, 156)

---

## Workflow States

### Status Values

```
┌─────────────────────┐
│       draft         │  (Created, not yet submitted)
└─────────┬───────────┘
          │ Submit RFI
          ▼
┌─────────────────────┐
│        open         │  (Submitted, awaiting response)
└─────────┬───────────┘
          │ Under review
          ▼
┌─────────────────────┐
│  pending_response   │  (Being reviewed)
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────┐
│responded│  │  void  │
│        │  │        │
└────┬───┘  └────────┘
     │
     ▼
┌─────────────────────┐
│       closed        │  (Final state)
└─────────────────────┘
```

### Status Definitions

| Status | Description | Can Edit Question? | Can Respond? |
|--------|-------------|-------------------|--------------|
| `draft` | Created, not submitted | Yes | No |
| `open` | Submitted, awaiting review | No | Yes |
| `pending_response` | Under active review | No | Yes |
| `responded` | Answer provided | No | No |
| `closed` | Final state | No | No |
| `void` | Cancelled/voided | No | No |

### Date Tracking by Status

| Status Change | Date Field Updated |
|---------------|-------------------|
| Draft → Open | `date_submitted` |
| Open → Responded | `date_responded` |
| Responded → Closed | `date_closed` |

---

## Ball-in-Court Tracking

Ball-in-court shows who currently has responsibility to act on the RFI:

### Ball-in-Court Roles

| Role | Description | Typical Actions |
|------|-------------|-----------------|
| `subcontractor` | Trade contractor | Prepare RFI, clarify question |
| `gc` | General Contractor | Review, forward to architect |
| `architect` | Design architect | Provide response |
| `engineer` | Consulting engineer | Technical response |
| `owner` | Project owner | Decision required |
| `consultant` | Specialty consultant | Expert input needed |

### Automatic Ball-in-Court Updates

| Action | Ball Moves To |
|--------|---------------|
| RFI created | `gc` or assigned user |
| Submitted to architect | `architect` |
| Response provided | `gc` for distribution |
| Clarification needed | `subcontractor` |
| Owner decision required | `owner` |

---

## Response Types

When responding to an RFI, the responder selects a response type:

### Response Type Values

| Type | Description | Typical Use |
|------|-------------|-------------|
| `answered` | Direct answer provided | Clear response to question |
| `see_drawings` | Answer is in drawings | Reference specific sheet/detail |
| `see_specs` | Answer is in specifications | Reference spec section |
| `deferred` | Decision deferred | Need more info or time |
| `partial_response` | Partial answer | More information coming |
| `request_clarification` | Need clarification | Question unclear |
| `no_change_required` | Per contract documents | No change needed |

### Response Versioning

Responses can be revised:
- Each response gets a **version number**
- Previous versions are marked as **superseded**
- Only the **current version** is active
- Full history is maintained for audit

---

## Complete Workflow

### Phase 1: RFI Creation (Subcontractor/Field)

```
1. Field identifies issue or question
2. Creates RFI in system:
   - Subject (clear, scannable title)
   - Question (detailed description)
   - Drawing reference (sheet number, detail)
   - Location (building, floor, grid lines)
   - Priority (low, normal, high, critical)
   - Required response date
   - Attachments (photos, marked-up drawings)
3. Submits to GC for review
```

### Phase 2: GC Review

```
1. GC receives RFI notification
2. Reviews for:
   - Clarity of question
   - Completeness of information
   - Correct routing
3. Decision:
   - If incomplete → Return to originator
   - If GC can answer → Provide response
   - If design question → Forward to architect
4. Updates ball-in-court
5. Sends to architect with deadline
```

### Phase 3: Architect/Engineer Response

```
1. A/E receives RFI
2. Reviews question and references
3. May consult with:
   - Structural engineer
   - MEP consultants
   - Owner
4. Prepares response:
   - Selects response type
   - Provides answer text
   - Attaches sketches if needed
   - Notes cost/schedule impact
5. Returns to GC
```

### Phase 4: Distribution

```
1. GC receives response
2. Logs response in system
3. Reviews for:
   - Cost impact → May initiate PCO
   - Schedule impact → Update schedule
4. Distributes to:
   - Originator
   - Affected trades
   - Project files
5. Closes RFI when work complete
```

### Phase 5: Impact Assessment

```
If cost impact identified:
1. Create linked Change Order
2. Track cost_impact_status:
   - estimated → pending → approved/rejected

If schedule impact identified:
1. Update project schedule
2. Document days of delay
3. May require time extension request
```

---

## Drawing Links

RFIs can be linked to multiple drawings with precise pin locations:

### Drawing Link Features

- **Multiple drawings per RFI**: Reference all relevant sheets
- **Pin locations**: Mark exact location on drawing
- **Pin metadata**: Labels, colors, notes per pin
- **Drawing reference**: Store sheet number and detail

### Pin Coordinate System

```
(0,0) ────────────────────────────── (1,0)
  │                                    │
  │                                    │
  │         Drawing Area               │
  │                                    │
  │              (0.5, 0.5)            │
  │                 ●                  │
  │              Center                │
  │                                    │
(0,1) ────────────────────────────── (1,1)

- pin_x: 0 = left edge, 1 = right edge
- pin_y: 0 = top edge, 1 = bottom edge
```

### Drawing Link Fields

| Field | Description | Example |
|-------|-------------|---------|
| `drawing_number` | Drawing sheet ID | "A-101" |
| `sheet_number` | Sheet sequence | "1 of 5" |
| `pin_x` | Horizontal position (0-1) | 0.35 |
| `pin_y` | Vertical position (0-1) | 0.72 |
| `pin_label` | Pin description | "Detail 3" |
| `pin_color` | Pin color (hex) | "#EF4444" |
| `notes` | Drawing-specific notes | "See gridline B-4" |

---

## Cost & Schedule Impact

### Cost Impact Tracking

| Field | Type | Description |
|-------|------|-------------|
| `cost_impact` | DECIMAL(15,2) | Dollar amount of impact |
| `cost_impact_status` | VARCHAR | estimated, approved, rejected, pending |
| `related_change_order_id` | UUID | Link to resulting CO |

### Schedule Impact Tracking

| Field | Type | Description |
|-------|------|-------------|
| `schedule_impact_days` | INTEGER | Days of delay |

### Cost Rollup Function

The system provides aggregated cost metrics per project:

```sql
SELECT * FROM get_rfi_cost_rollup(project_id);

Returns:
- total_estimated: Sum of estimated costs
- total_approved: Sum of approved costs
- total_rejected: Sum of rejected costs
- total_pending: Sum of pending costs
- rfi_count: Total RFIs
- rfis_with_cost_impact: RFIs that have cost impact
- rfis_linked_to_co: RFIs linked to change orders
- total_schedule_days: Total schedule impact days
```

### Linking RFI to Change Order

When an RFI results in additional cost:

```
1. RFI response indicates cost impact
2. Create PCO (Potential Change Order)
3. Link RFI to change order:
   - related_change_order_id set on RFI
   - related_rfi_id set on Change Order
4. cost_impact_status updates to 'approved' when CO approved
```

---

## Response Time Tracking

### Key Metrics

| Metric | Description |
|--------|-------------|
| `days_open` | Days since RFI submitted |
| `days_until_due` | Days until response required |
| `days_overdue` | Days past due date |
| `response_on_time` | Boolean: was response on time? |
| `required_response_days` | Contract response period (default: 14) |

### Response Due Date Calculation

```
response_due_date = date_submitted + required_response_days

Example:
- Submitted: January 15
- Required days: 14
- Due date: January 29
```

### Aging Buckets

RFIs are categorized by age:

| Bucket | Days Open | Color |
|--------|-----------|-------|
| 0-7 days | 0-7 | Green |
| 8-14 days | 8-14 | Yellow |
| 15-21 days | 15-21 | Orange |
| 22-30 days | 22-30 | Red |
| 30+ days | 31+ | Dark Red |

### On-Time Percentage

```
On-Time % = (RFIs responded on time / Total RFIs responded) × 100

Target: 90%+ on-time response rate
```

---

## User Roles & Responsibilities

### Subcontractor / Field

| Task | Description |
|------|-------------|
| Identify issues | Spot conflicts, missing info in field |
| Create RFIs | Document question clearly |
| Provide context | Photos, marked drawings, location |
| Respond to clarifications | Answer follow-up questions |
| Implement response | Execute work per RFI answer |

### General Contractor (GC)

| Task | Description |
|------|-------------|
| Review RFIs | Check for clarity and completeness |
| Route appropriately | Send to correct consultant |
| Track responses | Monitor aging and overdue |
| Distribute answers | Share with affected parties |
| Assess impact | Evaluate cost/schedule effects |
| Close RFIs | Mark complete when work done |

### Architect / Engineer

| Task | Description |
|------|-------------|
| Review questions | Understand issue completely |
| Research answer | Check drawings, specs, codes |
| Provide response | Clear, actionable answer |
| Meet deadlines | Respond within contract period |
| Issue clarifications | Provide sketches if needed |

### Owner

| Task | Description |
|------|-------------|
| Decision authority | Make scope/cost decisions |
| Monitor status | Track RFI metrics |
| Approve costs | Approve resulting change orders |

---

## Database Schema

### Core Table: `rfis`

```sql
CREATE TABLE rfis (
  -- Identification
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  company_id UUID NOT NULL,
  rfi_number INTEGER NOT NULL,        -- Auto-incremented per project

  -- Content
  subject VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  response TEXT,

  -- References
  spec_section VARCHAR(50),
  drawing_id UUID,
  drawing_reference VARCHAR(100),     -- e.g., "A-101, Detail 3"
  location VARCHAR(255),

  -- Timeline
  date_created TIMESTAMPTZ DEFAULT NOW(),
  date_submitted TIMESTAMPTZ,
  date_required TIMESTAMPTZ,
  date_responded TIMESTAMPTZ,
  date_closed TIMESTAMPTZ,

  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  priority VARCHAR(20) DEFAULT 'normal',

  -- Ball-in-Court
  ball_in_court UUID,
  ball_in_court_role VARCHAR(50),

  -- Assignment
  submitted_by UUID,
  assigned_to UUID,
  responded_by UUID,

  -- Response Tracking
  response_type VARCHAR(50),
  required_response_days INTEGER DEFAULT 14,
  is_internal BOOLEAN DEFAULT FALSE,
  response_due_date DATE,
  response_on_time BOOLEAN,

  -- Impact
  cost_impact DECIMAL(15,2),
  cost_impact_status VARCHAR(20),
  schedule_impact_days INTEGER,
  related_submittal_id UUID,
  related_change_order_id UUID,

  -- Distribution
  distribution_list UUID[],
  discipline VARCHAR(100),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMPTZ              -- Soft delete
);
```

### Supporting Tables

#### `rfi_attachments`
```sql
CREATE TABLE rfi_attachments (
  id UUID PRIMARY KEY,
  rfi_id UUID REFERENCES rfis(id),
  document_id UUID,
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size BIGINT,
  attachment_type VARCHAR(50),        -- question, response, general, sketch, photo
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `rfi_comments`
```sql
CREATE TABLE rfi_comments (
  id UUID PRIMARY KEY,
  rfi_id UUID REFERENCES rfis(id),
  comment TEXT NOT NULL,
  comment_type VARCHAR(50),           -- comment, response, internal_note, question_clarification
  mentioned_users UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID,
  deleted_at TIMESTAMPTZ
);
```

#### `rfi_drawing_links`
```sql
CREATE TABLE rfi_drawing_links (
  id UUID PRIMARY KEY,
  rfi_id UUID REFERENCES rfis(id),
  document_id UUID,
  drawing_number VARCHAR(50),
  sheet_number VARCHAR(50),
  pin_x DECIMAL(5,4),                 -- 0-1 normalized
  pin_y DECIMAL(5,4),                 -- 0-1 normalized
  pin_label VARCHAR(255),
  pin_color VARCHAR(20) DEFAULT '#EF4444',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);
```

#### `rfi_responses`
```sql
CREATE TABLE rfi_responses (
  id UUID PRIMARY KEY,
  rfi_id UUID REFERENCES rfis(id),
  response_text TEXT NOT NULL,
  response_type VARCHAR(50),
  action_type VARCHAR(50),
  version_number INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT TRUE,
  supersedes_id UUID,
  superseded_by_id UUID,
  responder_company VARCHAR(255),
  responder_title VARCHAR(255),
  attachment_ids UUID[],
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  responded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
```

#### `rfi_history`
```sql
CREATE TABLE rfi_history (
  id UUID PRIMARY KEY,
  rfi_id UUID REFERENCES rfis(id),
  action VARCHAR(50),                 -- created, updated, status_changed, responded, assigned
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID
);
```

---

## UI Components

### Main Pages

| Component | Path | Purpose |
|-----------|------|---------|
| `DedicatedRFIsPage` | `/projects/:id/rfis` | Main RFI list |
| `DedicatedRFIDetailPage` | `/projects/:id/rfis/:rfiId` | Single RFI detail |

### Key Components

| Component | Purpose |
|-----------|---------|
| `CreateDedicatedRFIDialog` | Create new RFI |
| `RFIForm` | RFI data entry form |
| `RFIStatusBadge` | Display status with color |
| `RFIPriorityBadge` | Display priority with color |
| `RFIList` | Sortable, filterable RFI table |
| `RFICommentThread` | Discussion/comments section |
| `RFITimeline` | Visual lifecycle timeline |
| `RFIAttachments` | File attachments display |
| `RFIAttachmentUploader` | File upload component |
| `RFIAgingAlerts` | Aging bucket display |
| `RFIEscalationPanel` | Overdue RFI management |
| `RFITrendChart` | Status/priority trends |
| `RFIResponseTimeline` | Response version history |
| `RFIRegister` | Comprehensive register view |
| `RFITemplateSelector` | Pre-defined RFI templates |

### RFI Templates

Pre-built templates for common RFI types:

| Template | Use Case |
|----------|----------|
| Design Clarification | Question about design intent |
| Conflict/Coordination | Trade conflicts |
| Material Substitution | Product alternatives |
| Field Condition | Site condition discovery |
| Code Compliance | Building code questions |
| Shop Drawing | Fabrication questions |
| Specification | Spec interpretation |
| Owner Decision | Scope decisions |

---

## API Reference

### React Query Hooks

#### Queries

```typescript
// Fetch all RFIs for a project
const { data: rfis } = useProjectRFIs(projectId);

// Fetch single RFI
const { data: rfi } = useRFI(rfiId);

// Fetch by ball-in-court role
const { data: myRFIs } = useRFIsByBallInCourt(projectId, 'gc');

// Fetch by status
const { data: openRFIs } = useRFIsByStatus(projectId, 'open');

// Fetch overdue RFIs
const { data: overdue } = useOverdueRFIs(projectId);

// Fetch comments
const { data: comments } = useRFIComments(rfiId);

// Fetch history
const { data: history } = useRFIHistory(rfiId);

// Fetch attachments
const { data: attachments } = useRFIAttachments(rfiId);

// Get statistics
const { data: stats } = useRFIStats(projectId);
// Returns: total, by_status, by_priority, open_count, overdue_count, avg_response_days
```

#### Mutations

```typescript
// Create RFI
const createMutation = useCreateRFI();
await createMutation.mutateAsync({
  project_id: projectId,
  subject: 'Door Frame Conflict at Room 201',
  question: 'Plans show door frame at 3\'-0" from corner, but...',
  spec_section: '08 11 00',
  drawing_reference: 'A-201, Detail 5',
  location: 'Building A, 2nd Floor, Room 201',
  priority: 'high',
  date_required: '2024-02-15',
  assigned_to: architectId,
  distribution_list: [pmId, superintendentId],
});

// Submit RFI (draft → open)
const submitMutation = useSubmitRFI();
await submitMutation.mutateAsync(rfiId);

// Respond to RFI
const respondMutation = useRespondToRFI();
await respondMutation.mutateAsync({
  rfiId: rfiId,
  response: 'Door frame shall be located 4\'-0" from corner per revised detail.',
  response_type: 'answered',
  cost_impact: 1500,
  schedule_impact_days: 2,
});

// Update ball-in-court
const updateBIC = useUpdateBallInCourt();
await updateBIC.mutateAsync({
  rfiId: rfiId,
  ballInCourtId: architectId,
  ballInCourtRole: 'architect',
});

// Close RFI
const closeMutation = useCloseRFI();
await closeMutation.mutateAsync(rfiId);

// Add comment
const commentMutation = useAddRFIComment();
await commentMutation.mutateAsync({
  rfiId: rfiId,
  comment: 'Awaiting structural engineer input on this issue.',
  comment_type: 'internal_note',
  mentioned_users: [structuralEngineerId],
});
```

---

## Best Practices

### Writing Good RFI Questions

**DO:**
- Be specific and concise
- Reference exact drawing/spec locations
- Include photos or marked-up drawings
- Propose a solution if you have one
- Set realistic required dates

**DON'T:**
- Ask multiple questions in one RFI
- Use vague language ("the wall over there")
- Skip drawing references
- Wait until work is blocked to ask

### Managing RFI Response Times

1. **Set realistic due dates** based on complexity
2. **Track aging weekly** - run aging reports
3. **Escalate proactively** - don't wait until overdue
4. **Follow up regularly** - send reminders at 7, 3, 1 days before due
5. **Document delays** - note reasons for late responses

### RFI Best Practice Checklist

- [ ] Clear, specific subject line
- [ ] Detailed question text
- [ ] Drawing/spec references included
- [ ] Location specified (building, floor, grid)
- [ ] Photos attached if applicable
- [ ] Priority set appropriately
- [ ] Due date is realistic
- [ ] Correct person assigned
- [ ] Distribution list includes all affected parties

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| RFI stuck in review | Check ball-in-court, send reminder |
| Vague responses | Request clarification, reference specific issue |
| Overdue RFIs piling up | Escalate to management, review at OAC meeting |
| Cost impact disputes | Link to change order, document thoroughly |
| Missing attachments | Request from originator |

### Reporting

- **RFI Register**: Export PDF for OAC meetings
- **Aging Report**: Filter by aging bucket
- **Ball-in-Court Summary**: Who has pending items
- **Response Time Analysis**: Track on-time percentage
- **Cost Rollup**: Total cost/schedule impacts

---

## Related Documentation

- [Workflows Overview](./WORKFLOWS.md)
- [Shop Drawings Submittal Process](./SHOP_DRAWINGS_SUBMITTAL_PROCESS.md)
- [Change Order Process](./CHANGE_ORDER_PROCESS.md)
- [Document Management](./DOCUMENT_MANAGEMENT.md)

---

*Last Updated: January 2026*
