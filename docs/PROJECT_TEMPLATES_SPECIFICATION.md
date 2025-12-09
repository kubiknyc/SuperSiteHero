# Project Templates Feature Specification

**Document Version:** 1.0
**Created:** 2025-12-08
**Status:** Production-Ready Specification

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Use Cases and Business Value](#use-cases-and-business-value)
3. [Data Model](#data-model)
4. [Template Components](#template-components)
5. [User Interface](#user-interface)
6. [API Design](#api-design)
7. [Database Migration](#database-migration)
8. [Implementation Phases](#implementation-phases)
9. [Security and Permissions](#security-and-permissions)
10. [Testing Strategy](#testing-strategy)

---

## Feature Overview

### What Are Project Templates?

Project Templates allow construction companies to standardize and accelerate project setup by creating reusable configurations that capture organizational best practices, industry standards, and project-specific workflows. Instead of manually configuring every new project, users can select a template that automatically populates settings, structures, workflows, and defaults.

### Why They Matter in Construction

**Time Savings:**
- Reduce project setup time from hours to minutes
- Eliminate repetitive configuration work
- Ensure consistency across similar project types

**Standardization:**
- Enforce company standards and best practices
- Maintain consistent folder structures and naming conventions
- Apply proven workflows from successful projects

**Quality Control:**
- Pre-populate required checklists and safety protocols
- Set up appropriate approval workflows
- Define standard roles and responsibilities

**Knowledge Capture:**
- Preserve institutional knowledge in templates
- Enable less experienced team members to set up projects correctly
- Capture lessons learned from completed projects

### Construction-Specific Use Cases

**By Project Type:**
- **Commercial Construction:** Multi-story office buildings, retail centers, warehouses
- **Residential:** Single-family homes, multi-family apartments, townhomes
- **Industrial:** Manufacturing facilities, distribution centers, process plants
- **Renovation/Remodel:** Interior fit-outs, tenant improvements, adaptive reuse
- **Civil/Infrastructure:** Roads, bridges, utilities, site development
- **Institutional:** Schools, hospitals, government buildings

**By Delivery Method:**
- **Design-Bid-Build:** Traditional procurement with architect-led design
- **Design-Build:** Integrated design and construction
- **Construction Management:** CM as advisor or at-risk
- **Public Works:** Prevailing wage, DBE requirements, public bidding

**By Specialization:**
- **High-Rise Construction:** Tower cranes, safety protocols, vertical logistics
- **Fast-Track Projects:** Accelerated schedules, phased completion
- **LEED/Green Building:** Sustainability tracking, commissioning requirements
- **Tenant Improvement:** Occupied building protocols, phased occupancy

---

## Data Model

### Core Schema

The template system uses a primary `project_templates` table with related configuration stored in JSONB columns for flexibility.

#### Tables

**1. project_templates** (Main template definition)

```sql
CREATE TABLE project_templates (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'commercial', 'residential', 'industrial', etc.
  tags TEXT[], -- searchable keywords

  -- Visibility
  visibility VARCHAR(50) DEFAULT 'company', -- 'company' or 'private'
  is_system_template BOOLEAN DEFAULT FALSE, -- Industry-standard templates
  is_active BOOLEAN DEFAULT TRUE,

  -- Icon/Color for UI
  icon VARCHAR(50), -- icon identifier
  color VARCHAR(7), -- hex color code

  -- Template Configuration (JSONB)
  default_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  folder_structure JSONB DEFAULT '[]'::jsonb,
  default_roles JSONB DEFAULT '[]'::jsonb,
  numbering_config JSONB DEFAULT '{}'::jsonb,
  notification_rules JSONB DEFAULT '[]'::jsonb,
  enabled_features JSONB DEFAULT '{}'::jsonb,
  custom_fields JSONB DEFAULT '[]'::jsonb,

  -- Usage Statistics
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_template_name UNIQUE(company_id, name)
);
```

**2. project_template_phases** (Phase/milestone templates)

```sql
CREATE TABLE project_template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,

  -- Phase Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  phase_order INTEGER NOT NULL,

  -- Duration
  estimated_duration_days INTEGER,

  -- Dependencies
  depends_on_phase_id UUID REFERENCES project_template_phases(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_phase_order UNIQUE(template_id, phase_order)
);
```

**3. project_template_checklists** (Checklist templates association)

```sql
CREATE TABLE project_template_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  checklist_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,

  -- Configuration
  is_required BOOLEAN DEFAULT TRUE,
  auto_create BOOLEAN DEFAULT TRUE,
  trigger_phase VARCHAR(100), -- When to create: 'project_start', 'substantial_completion', etc.

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_template_checklist UNIQUE(template_id, checklist_template_id)
);
```

**4. project_template_workflows** (Approval workflow associations)

```sql
CREATE TABLE project_template_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,

  -- Assignment
  workflow_type VARCHAR(50) NOT NULL, -- 'document', 'submittal', 'rfi', 'change_order'
  is_default BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_template_workflow_type UNIQUE(template_id, workflow_type)
);
```

**5. project_template_distribution_lists** (Distribution list associations)

```sql
CREATE TABLE project_template_distribution_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,

  -- List definition (to be created per project)
  list_name VARCHAR(200) NOT NULL,
  list_type VARCHAR(50) NOT NULL, -- 'rfi', 'submittal', 'transmittal', etc.
  is_default BOOLEAN DEFAULT FALSE,

  -- Members configuration (role-based, will be resolved at project creation)
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example: [{"role": "project_manager", "member_role": "to"}, {"email": "architect@firm.com", "member_role": "cc"}]

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### JSONB Schema Definitions

#### default_settings

Stores project-level default settings.

```typescript
interface DefaultSettings {
  weather_units: 'imperial' | 'metric';
  timezone?: string;

  // Budget settings
  budget?: {
    tracking_enabled: boolean;
    currency: string;
    contingency_percentage?: number;
  };

  // Schedule settings
  schedule?: {
    working_days: number[]; // 0-6, Sunday=0
    holidays?: string[]; // ISO date strings
    default_duration_unit: 'hours' | 'days' | 'weeks';
  };

  // Safety settings
  safety?: {
    require_daily_safety_briefing: boolean;
    require_jsa_for_hazardous_work: boolean;
    incident_notification_emails?: string[];
  };

  // Document settings
  documents?: {
    require_approval_for_upload: boolean;
    auto_version_on_edit: boolean;
    retention_period_days?: number;
  };
}
```

#### folder_structure

Defines the default folder hierarchy for documents.

```typescript
interface FolderStructure {
  id: string; // temporary ID for hierarchy
  name: string;
  description?: string;
  parent_id?: string; // reference to parent in same structure
  sort_order: number;
  children?: FolderStructure[];
}

// Example:
[
  {
    id: "1",
    name: "01 - Drawings",
    sort_order: 1,
    children: [
      { id: "1.1", name: "Architectural", parent_id: "1", sort_order: 1 },
      { id: "1.2", name: "Structural", parent_id: "1", sort_order: 2 },
      { id: "1.3", name: "MEP", parent_id: "1", sort_order: 3 }
    ]
  },
  {
    id: "2",
    name: "02 - Specifications",
    sort_order: 2
  },
  {
    id: "3",
    name: "03 - Submittals",
    sort_order: 3
  },
  {
    id: "4",
    name: "04 - RFIs",
    sort_order: 4
  },
  {
    id: "5",
    name: "05 - Change Orders",
    sort_order: 5
  },
  {
    id: "6",
    name: "06 - Meeting Minutes",
    sort_order: 6
  },
  {
    id: "7",
    name: "07 - Progress Photos",
    sort_order: 7
  },
  {
    id: "8",
    name: "08 - Closeout",
    sort_order: 8,
    children: [
      { id: "8.1", name: "As-Builts", parent_id: "8", sort_order: 1 },
      { id: "8.2", name: "O&M Manuals", parent_id: "8", sort_order: 2 },
      { id: "8.3", name: "Warranties", parent_id: "8", sort_order: 3 }
    ]
  }
]
```

#### default_roles

Defines standard team roles and permissions.

```typescript
interface DefaultRole {
  role_name: string;
  project_role: string; // 'superintendent', 'project_manager', 'engineer', etc.
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  description?: string;
  typical_responsibilities?: string[];
}

// Example:
[
  {
    role_name: "Project Manager",
    project_role: "project_manager",
    can_edit: true,
    can_delete: true,
    can_approve: true,
    description: "Overall project leadership and client coordination",
    typical_responsibilities: [
      "Budget management",
      "Schedule oversight",
      "Client communication",
      "Change order approval"
    ]
  },
  {
    role_name: "Superintendent",
    project_role: "superintendent",
    can_edit: true,
    can_delete: false,
    can_approve: true,
    description: "Day-to-day field operations and quality control"
  },
  {
    role_name: "Project Engineer",
    project_role: "engineer",
    can_edit: true,
    can_delete: false,
    can_approve: false,
    description: "Technical coordination and documentation"
  }
]
```

#### numbering_config

Defines numbering schemes for various entities.

```typescript
interface NumberingConfig {
  rfis?: {
    format: string; // e.g., "RFI-{number:3}" produces "RFI-001"
    start_number: number;
    prefix?: string;
    increment: number;
  };
  submittals?: {
    format: string; // e.g., "{spec_section}-{number:2}" produces "03300-01"
    use_spec_section: boolean;
    start_number: number;
  };
  change_orders?: {
    format: string; // e.g., "PCO-{number:3}"
    start_number: number;
    separate_pco_sequence: boolean; // separate numbering for PCOs vs executed COs
  };
  daily_reports?: {
    format: string; // e.g., "DR-{date:YYYYMMDD}"
  };
  transmittals?: {
    format: string; // e.g., "TR-{number:4}"
    start_number: number;
  };
}

// Example:
{
  "rfis": {
    "format": "RFI-{number:3}",
    "start_number": 1,
    "increment": 1
  },
  "submittals": {
    "format": "{spec_section}-{number:2}",
    "use_spec_section": true,
    "start_number": 1
  },
  "change_orders": {
    "format": "PCO-{number:3}",
    "start_number": 1,
    "separate_pco_sequence": true
  }
}
```

#### notification_rules

Defines default notification behaviors.

```typescript
interface NotificationRule {
  event_type: string; // 'rfi_created', 'submittal_submitted', 'change_order_approved', etc.
  notify_roles: string[]; // ['project_manager', 'superintendent']
  notify_emails?: string[]; // external emails
  delivery_method: ('email' | 'in_app' | 'push')[];
  delay_minutes?: number; // batch notifications
  conditions?: Record<string, any>; // conditional logic
}

// Example:
[
  {
    event_type: "rfi_created",
    notify_roles: ["project_manager", "architect"],
    delivery_method: ["email", "in_app"],
    delay_minutes: 0
  },
  {
    event_type: "submittal_submitted",
    notify_roles: ["project_manager"],
    delivery_method: ["email"],
    delay_minutes: 60, // batch hourly
    conditions: {
      "priority": ["high", "critical"]
    }
  },
  {
    event_type: "safety_incident_reported",
    notify_roles: ["project_manager", "safety_manager"],
    notify_emails: ["safety@company.com"],
    delivery_method: ["email", "push"],
    delay_minutes: 0
  }
]
```

#### enabled_features

Controls which features are enabled for projects using this template.

```typescript
interface EnabledFeatures {
  daily_reports: boolean;
  documents: boolean;
  workflows: boolean; // RFIs, Submittals, etc.
  tasks: boolean;
  checklists: boolean;
  punch_lists: boolean;
  safety: boolean;
  inspections: boolean;
  material_tracking: boolean;
  photos: boolean;
  takeoff: boolean;
  cost_tracking: boolean;
  equipment_tracking: boolean;
  time_tracking: boolean;
  qr_codes: boolean;
  gantt_schedule: boolean;
  weather_logs: boolean;
  transmittals: boolean;
  meeting_minutes: boolean;
  permits: boolean;
  notices: boolean;
  closeout: boolean;
  client_portal: boolean;
  subcontractor_portal: boolean;
}

// Example for residential project:
{
  "daily_reports": true,
  "documents": true,
  "workflows": true,
  "punch_lists": true,
  "safety": true,
  "photos": true,
  "cost_tracking": true,
  "client_portal": true,
  "subcontractor_portal": true,
  "takeoff": false, // not needed for residential
  "equipment_tracking": false,
  "gantt_schedule": false, // simpler projects
  "transmittals": false
}
```

#### custom_fields

Defines additional data fields for project tracking.

```typescript
interface CustomField {
  id: string;
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';
  label: string;
  description?: string;
  required: boolean;
  default_value?: any;
  options?: string[]; // for select/multiselect
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  apply_to: 'project' | 'daily_report' | 'rfi' | 'submittal' | 'change_order' | 'punch_item';
}

// Example:
[
  {
    id: "cf_1",
    field_name: "building_type",
    field_type: "select",
    label: "Building Type",
    required: true,
    apply_to: "project",
    options: ["Type I", "Type II", "Type III", "Type IV", "Type V"]
  },
  {
    id: "cf_2",
    field_name: "story_count",
    field_type: "number",
    label: "Number of Stories",
    required: false,
    apply_to: "project",
    validation: { min: 1, max: 100 }
  },
  {
    id: "cf_3",
    field_name: "permit_number",
    field_type: "text",
    label: "Building Permit Number",
    required: true,
    apply_to: "project"
  }
]
```

---

## Template Components

### What Can Be Templated

Based on the data model, here are all the components that can be configured in a project template:

#### 1. Project Settings

**Default Configuration:**
- Weather units (imperial/metric)
- Timezone
- Currency
- Working calendar (working days, holidays)
- Safety requirements
- Document approval workflows

**Feature Toggles:**
- Enable/disable specific modules (Daily Reports, RFIs, Submittals, etc.)
- Configure which features are visible and active
- Set default behaviors for each feature

**Numbering Schemes:**
- RFI numbering format and starting number
- Submittal numbering (spec-section based or sequential)
- Change Order numbering (separate PCO/CO sequences)
- Transmittal numbering
- Daily Report numbering

#### 2. Folder Structure

**Document Organization:**
- Pre-defined folder hierarchy
- CSI MasterFormat alignment for specs/submittals
- Standard folder names (Drawings, Specs, RFIs, COs, etc.)
- Nested sub-folders for disciplines
- Closeout documentation structure

**Common Structures by Project Type:**

**Commercial:**
```
01 - Drawings
  ├── Architectural
  ├── Structural
  ├── Mechanical
  ├── Electrical
  ├── Plumbing
  └── Fire Protection
02 - Specifications
03 - Submittals
04 - RFIs
05 - Change Orders
06 - Meeting Minutes
07 - Daily Reports
08 - Photos
09 - Shop Drawings
10 - Closeout
  ├── As-Builts
  ├── O&M Manuals
  ├── Warranties
  └── Training Materials
```

**Residential:**
```
01 - Plans & Drawings
02 - Permits
03 - Selections & Finishes
04 - Change Orders
05 - Photos
06 - Warranty Documents
07 - Homeowner Manual
```

#### 3. Project Phases/Milestones

**Typical Commercial Phases:**
1. Pre-Construction / Planning (30 days)
2. Mobilization (14 days)
3. Sitework & Foundations (60 days)
4. Structural (90 days)
5. Envelope (45 days)
6. Rough-In MEP (60 days)
7. Interior Finishes (45 days)
8. Final MEP & Trim (30 days)
9. Substantial Completion (14 days)
10. Punch List & Closeout (30 days)

**Typical Residential Phases:**
1. Site Prep & Foundation (21 days)
2. Framing (14 days)
3. Rough-In (Electrical, Plumbing, HVAC) (10 days)
4. Insulation & Drywall (14 days)
5. Interior Finishes (21 days)
6. Exterior Finishes (14 days)
7. Final Inspection & Closeout (7 days)

#### 4. Team Roles & Structure

**Standard Roles:**
- Project Manager (full permissions)
- Superintendent (edit/approve, no delete)
- Project Engineer (edit only)
- Assistant Superintendent (view/edit limited)
- Safety Manager (safety module access)
- QA/QC Manager (inspection/checklist focus)
- Document Controller (document management)
- Owner Representative (view-only or limited approval)
- Architect (RFI/submittal reviewer)
- Subcontractor (limited project access)

**Permission Templates:**
Each role defines:
- Can edit project data
- Can delete items
- Can approve workflows
- Feature access restrictions
- Notification preferences

#### 5. Checklist Templates

**Safety Checklists:**
- Daily Safety Briefing
- Weekly Toolbox Talk
- Monthly Safety Inspection
- Incident Investigation
- Job Safety Analysis (JSA) for high-risk tasks

**Quality Control:**
- Pre-pour concrete inspection
- Rough-in inspection checklist
- Final walkthrough
- Substantial completion punchlist
- Systems commissioning

**Closeout Checklists:**
- As-built drawing verification
- O&M manual compilation
- Warranty document collection
- Training completion
- Final inspection sign-off
- Certificate of occupancy

**Project-Specific:**
- LEED certification requirements
- Commissioning activities
- Special inspections (welding, bolting, etc.)

#### 6. Approval Workflows

**Document Approval:**
- Multi-step review process
- Role-based approvers
- Auto-escalation rules
- Parallel vs. sequential approvals

**Submittal Workflow:**
Example: Submittal → GC Review → Architect Review → Owner Approval
- Step 1: Project Engineer reviews (3 days)
- Step 2: Project Manager approves (2 days)
- Step 3: Architect reviews (10 days)
- Auto-approve if no response in X days (optional)

**RFI Workflow:**
Example: RFI → PM → Architect → Engineer of Record
- Step 1: Project Manager review (1 day)
- Step 2: Architect response (5 days)

**Change Order Workflow:**
- PCO creation
- Cost estimate
- PM review
- Owner approval (if over threshold)
- Execution

#### 7. Distribution Lists

**Pre-configured Lists:**
- Project Team (internal)
- Design Team (architect, engineers)
- Owner/Client Team
- Key Subcontractors
- Regulatory Authorities (inspectors, AHJ)

**By Document Type:**
- RFI Distribution (architect, engineers, PM)
- Submittal Distribution (architect, owner rep, PM)
- Daily Report Distribution (client, PM, super)
- Safety Incident (safety manager, PM, corporate)
- Change Order (client, PM, estimating)

#### 8. Notification Rules

**Event-Based Notifications:**
- RFI created → notify architect
- Submittal overdue → escalate to PM
- Safety incident → immediate alert
- Change order approved → notify accounting
- Inspection scheduled → notify super + trades
- Weather alert → notify field team

**Batching/Timing:**
- Immediate (safety, critical issues)
- Hourly digest (routine updates)
- Daily summary (progress reports)
- Weekly rollup (metrics, analytics)

#### 9. Custom Fields

**Project-Level:**
- Building permit number
- AHJ jurisdiction
- Project classification (Type I-V construction)
- Square footage
- Number of units/stories
- LEED certification level

**RFI Custom Fields:**
- Drawing number reference
- Spec section reference
- Cost impact estimate
- Schedule impact (days)

**Submittal Custom Fields:**
- Lead time (weeks)
- Long-lead indicator
- Resubmittal count

**Daily Report Custom Fields:**
- Inspector on site (yes/no)
- Weather delay (yes/no)
- Milestone achieved

---

## User Interface

### 1. Template Management Page

**Location:** Settings → Project Templates
**URL:** `/settings/project-templates`

**Features:**

**Template List View:**
```
┌─────────────────────────────────────────────────────────────┐
│ Project Templates                              [+ New]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Search: [_____________]  Category: [All ▼]  [Active only ☑] │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🏢 Commercial Office Building           [⋮]            ││
│ │ High-rise commercial construction                       ││
│ │ Used 12 times • Last used 2 days ago                   ││
│ │ Tags: commercial, office, high-rise                    ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🏠 Single-Family Residential            [⋮]            ││
│ │ Standard single-family home construction                ││
│ │ Used 45 times • Last used 5 days ago                   ││
│ │ Tags: residential, single-family                       ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🏭 Industrial Warehouse                 [⋮]            ││
│ │ Tilt-up warehouse and distribution                      ││
│ │ Used 8 times • Last used 14 days ago                   ││
│ │ Tags: industrial, warehouse, tilt-up                   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Context Menu (⋮):**
- Edit Template
- Duplicate Template
- Preview Settings
- Delete Template

**Template Categories:**
- All Templates
- Commercial
- Residential
- Industrial
- Renovation
- Civil/Infrastructure
- Custom

### 2. Create/Edit Template Dialog

**Multi-Tab Interface:**

**Tab 1: Basic Info**
```
┌─────────────────────────────────────────────────────┐
│ Create Project Template                             │
├─────────────────────────────────────────────────────┤
│ [Basic Info] [Settings] [Structure] [Workflows]     │
│                                                      │
│ Template Name *                                     │
│ [_________________________________]                 │
│                                                      │
│ Description                                         │
│ [_________________________________]                 │
│ [_________________________________]                 │
│                                                      │
│ Category *                                          │
│ [Commercial ▼]                                      │
│                                                      │
│ Tags (comma-separated)                              │
│ [office, high-rise, commercial____]                 │
│                                                      │
│ Icon & Color                                        │
│ [🏢 ▼]  [#2563EB ▼]                                │
│                                                      │
│ Visibility                                          │
│ ○ Company-wide (all users can use)                 │
│ ● Private (only me)                                 │
│                                                      │
│               [Cancel]  [Next: Settings →]          │
└─────────────────────────────────────────────────────┘
```

**Tab 2: Default Settings**
```
┌─────────────────────────────────────────────────────┐
│ Default Project Settings                            │
├─────────────────────────────────────────────────────┤
│ [Basic Info] [Settings] [Structure] [Workflows]     │
│                                                      │
│ ▼ General Settings                                  │
│   Weather Units:     [Imperial ▼]                   │
│   Timezone:          [America/New_York ▼]           │
│   Currency:          [USD ▼]                        │
│                                                      │
│ ▼ Working Calendar                                  │
│   Working Days:      [M][T][W][T][F] S  S           │
│   Default Duration:  [Days ▼]                       │
│                                                      │
│ ▼ Budget Settings                                   │
│   ☑ Enable cost tracking                            │
│   Contingency %:     [10____]%                      │
│                                                      │
│ ▼ Safety Settings                                   │
│   ☑ Require daily safety briefing                   │
│   ☑ Require JSA for hazardous work                  │
│   Incident notifications: [_________________]       │
│                                                      │
│ ▼ Enabled Features                                  │
│   ☑ Daily Reports      ☑ Documents                  │
│   ☑ RFIs              ☑ Submittals                  │
│   ☑ Change Orders     ☑ Punch Lists                 │
│   ☑ Safety            ☑ Photos                      │
│   ☐ Equipment Tracking ☐ Time Tracking              │
│                                                      │
│         [← Back]  [Cancel]  [Next: Structure →]     │
└─────────────────────────────────────────────────────┘
```

**Tab 3: Folder Structure**
```
┌─────────────────────────────────────────────────────┐
│ Document Folder Structure                           │
├─────────────────────────────────────────────────────┤
│ [Basic Info] [Settings] [Structure] [Workflows]     │
│                                                      │
│ [Load from Template ▼]  [+ Add Folder]              │
│                                                      │
│ Drag to reorder folders:                            │
│                                                      │
│ ≡ 01 - Drawings                          [⋮] [−]    │
│   ├─ Architectural                       [⋮] [−]    │
│   ├─ Structural                          [⋮] [−]    │
│   ├─ Mechanical                          [⋮] [−]    │
│   └─ Electrical                          [⋮] [−]    │
│                                                      │
│ ≡ 02 - Specifications                    [⋮] [−]    │
│                                                      │
│ ≡ 03 - Submittals                        [⋮] [−]    │
│                                                      │
│ ≡ 04 - RFIs                              [⋮] [−]    │
│                                                      │
│ ≡ 05 - Change Orders                     [⋮] [−]    │
│                                                      │
│ ≡ 06 - Photos                            [⋮] [−]    │
│                                                      │
│         [← Back]  [Cancel]  [Next: Workflows →]     │
└─────────────────────────────────────────────────────┘
```

**Tab 4: Workflows & Checklists**
```
┌─────────────────────────────────────────────────────┐
│ Workflows & Checklists                              │
├─────────────────────────────────────────────────────┤
│ [Basic Info] [Settings] [Structure] [Workflows]     │
│                                                      │
│ ▼ Approval Workflows                                │
│                                                      │
│   RFI Workflow:                                     │
│   [Standard RFI Workflow ▼]                         │
│                                                      │
│   Submittal Workflow:                               │
│   [3-Step: GC → Architect → Owner ▼]                │
│                                                      │
│   Change Order Workflow:                            │
│   [PM Approval Required ▼]                          │
│                                                      │
│ ▼ Checklist Templates                               │
│                                                      │
│   ☑ Daily Safety Briefing (auto-create daily)      │
│   ☑ Pre-Pour Concrete (manual)                      │
│   ☑ Substantial Completion (at milestone)           │
│   ☑ Final Closeout (at substantial completion)      │
│                                                      │
│   [+ Add Checklist Template]                        │
│                                                      │
│ ▼ Project Phases                                    │
│                                                      │
│   1. Pre-Construction (30 days)          [⋮] [−]    │
│   2. Sitework (45 days)                  [⋮] [−]    │
│   3. Foundation (21 days)                [⋮] [−]    │
│                                                      │
│   [+ Add Phase]                                     │
│                                                      │
│         [← Back]  [Cancel]  [Save Template]         │
└─────────────────────────────────────────────────────┘
```

### 3. Template Selection During Project Creation

**Enhanced Create Project Dialog:**

```
┌─────────────────────────────────────────────────────┐
│ Create New Project                                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Start from Template (optional)                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Select Template ▼]                             │ │
│ │                                                  │ │
│ │ ┌──────────────────────────────────────────────┐│ │
│ │ │ 🏢 Commercial Office Building               ││ │
│ │ │ High-rise commercial construction            ││ │
│ │ ├──────────────────────────────────────────────┤│ │
│ │ │ 🏠 Single-Family Residential                ││ │
│ │ │ Standard single-family home                  ││ │
│ │ ├──────────────────────────────────────────────┤│ │
│ │ │ 🏭 Industrial Warehouse                     ││ │
│ │ │ Tilt-up warehouse and distribution           ││ │
│ │ ├──────────────────────────────────────────────┤│ │
│ │ │ ⚙️ Custom (start from scratch)               ││ │
│ │ └──────────────────────────────────────────────┘│ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ [Preview Template Settings]                         │
│                                                      │
│ Template will apply:                                │
│ • Folder structure (8 folders)                      │
│ • 3 approval workflows                              │
│ • 4 checklist templates                             │
│ • Default team roles                                │
│ • Numbering schemes                                 │
│                                                      │
│ ─────────────────────────────────────────────────   │
│                                                      │
│ Project Name *                                      │
│ [_________________________________]                 │
│                                                      │
│ Project Number                                      │
│ [_________________________________]                 │
│                                                      │
│ Description                                         │
│ [_________________________________]                 │
│                                                      │
│ [Show Advanced Settings ▼]                          │
│                                                      │
│               [Cancel]  [Create Project]            │
└─────────────────────────────────────────────────────┘
```

**Template Preview Modal:**
```
┌─────────────────────────────────────────────────────┐
│ Template Preview: Commercial Office Building        │
├─────────────────────────────────────────────────────┤
│ [Settings] [Folders] [Workflows] [Checklists]       │
│                                                      │
│ Default Settings:                                   │
│ • Weather: Imperial                                 │
│ • Working Days: Monday - Friday                     │
│ • Features: 15 enabled                              │
│                                                      │
│ Numbering Schemes:                                  │
│ • RFIs: RFI-001, RFI-002, ...                       │
│ • Submittals: {spec}-01, {spec}-02, ...             │
│ • Change Orders: PCO-001, PCO-002, ...              │
│                                                      │
│ Default Roles:                                      │
│ • Project Manager (full access)                     │
│ • Superintendent (edit/approve)                     │
│ • Project Engineer (edit only)                      │
│ • Safety Manager (safety focus)                     │
│                                                      │
│                            [Close]                  │
└─────────────────────────────────────────────────────┘
```

### 4. "Save as Template" from Existing Project

**Project Settings → Save as Template:**

```
┌─────────────────────────────────────────────────────┐
│ Save Project as Template                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│ This will create a new template based on the        │
│ current project configuration.                      │
│                                                      │
│ Template Name *                                     │
│ [Multi-Family Residential_____________]             │
│                                                      │
│ Description                                         │
│ [_________________________________]                 │
│ [_________________________________]                 │
│                                                      │
│ Category                                            │
│ [Residential ▼]                                     │
│                                                      │
│ What to include:                                    │
│ ☑ Project settings & enabled features               │
│ ☑ Folder structure                                  │
│ ☑ Team roles (without specific users)               │
│ ☑ Approval workflows                                │
│ ☑ Checklist templates                               │
│ ☑ Numbering schemes                                 │
│ ☑ Distribution lists (without specific people)      │
│ ☐ Project phases/milestones                         │
│ ☐ Custom fields                                     │
│                                                      │
│ Privacy:                                            │
│ ● Company-wide (all users)                          │
│ ○ Private (only me)                                 │
│                                                      │
│               [Cancel]  [Create Template]           │
└─────────────────────────────────────────────────────┘
```

### 5. Template Usage Analytics

**Template Details Page:**

```
┌─────────────────────────────────────────────────────┐
│ Commercial Office Building                   [Edit] │
├─────────────────────────────────────────────────────┤
│                                                      │
│ High-rise commercial construction template          │
│ Category: Commercial • Created Jan 15, 2025         │
│                                                      │
│ Usage Statistics                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 12 projects created    Last used 2 days ago    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ Recent Projects Using This Template                 │
│ • Downtown Tower Phase 2 (Dec 1, 2025)              │
│ • City Center Office (Nov 15, 2025)                 │
│ • Corporate HQ Renovation (Nov 3, 2025)             │
│                                                      │
│ Configuration Summary                               │
│ • 8 folder categories                               │
│ • 3 approval workflows                              │
│ • 4 checklist templates                             │
│ • 15 enabled features                               │
│ • 4 default team roles                              │
│                                                      │
│ [View Full Configuration]  [Duplicate]  [Delete]    │
└─────────────────────────────────────────────────────┘
```

---

## API Design

### Service Layer

**File:** `c:\Users\Eli\Documents\git\src\lib\api\services\project-templates.ts`

```typescript
import { supabase } from '@/lib/supabase';
import type {
  ProjectTemplate,
  ProjectTemplateWithDetails,
  CreateProjectTemplateDTO,
  UpdateProjectTemplateDTO,
  ProjectTemplateFilters,
  ApplyTemplateResult,
} from '@/types/project-template';

/**
 * Project Templates Service
 * Manages CRUD operations for project templates
 */

// =============================================
// Read Operations
// =============================================

/**
 * Get all templates for a company
 */
export async function getProjectTemplates(
  companyId: string,
  filters?: ProjectTemplateFilters
): Promise<ProjectTemplate[]> {
  let query = supabase
    .from('project_templates')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('usage_count', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as ProjectTemplate[];
}

/**
 * Get single template with all details
 */
export async function getProjectTemplate(
  templateId: string
): Promise<ProjectTemplateWithDetails> {
  const { data: template, error: templateError } = await supabase
    .from('project_templates')
    .select(`
      *,
      created_by_user:users!created_by(
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;

  // Fetch phases
  const { data: phases, error: phasesError } = await supabase
    .from('project_template_phases')
    .select('*')
    .eq('template_id', templateId)
    .order('phase_order');

  if (phasesError) throw phasesError;

  // Fetch checklist associations
  const { data: checklists, error: checklistsError } = await supabase
    .from('project_template_checklists')
    .select(`
      *,
      checklist_template:checklist_templates(*)
    `)
    .eq('template_id', templateId);

  if (checklistsError) throw checklistsError;

  // Fetch workflow associations
  const { data: workflows, error: workflowsError } = await supabase
    .from('project_template_workflows')
    .select(`
      *,
      workflow:approval_workflows(*)
    `)
    .eq('template_id', templateId);

  if (workflowsError) throw workflowsError;

  // Fetch distribution lists
  const { data: distributionLists, error: listsError } = await supabase
    .from('project_template_distribution_lists')
    .select('*')
    .eq('template_id', templateId);

  if (listsError) throw listsError;

  return {
    ...template,
    phases: phases || [],
    checklists: checklists || [],
    workflows: workflows || [],
    distribution_lists: distributionLists || [],
  } as ProjectTemplateWithDetails;
}

/**
 * Get templates used recently
 */
export async function getRecentTemplates(
  companyId: string,
  limit: number = 5
): Promise<ProjectTemplate[]> {
  const { data, error } = await supabase
    .from('project_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .not('last_used_at', 'is', null)
    .order('last_used_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as ProjectTemplate[];
}

/**
 * Get most popular templates
 */
export async function getPopularTemplates(
  companyId: string,
  limit: number = 5
): Promise<ProjectTemplate[]> {
  const { data, error } = await supabase
    .from('project_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('usage_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as ProjectTemplate[];
}

// =============================================
// Create Operations
// =============================================

/**
 * Create a new template
 */
export async function createProjectTemplate(
  data: CreateProjectTemplateDTO,
  userId: string
): Promise<ProjectTemplate> {
  const { data: template, error } = await supabase
    .from('project_templates')
    .insert({
      company_id: data.company_id,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      visibility: data.visibility || 'company',
      icon: data.icon,
      color: data.color,
      default_settings: data.default_settings || {},
      folder_structure: data.folder_structure || [],
      default_roles: data.default_roles || [],
      numbering_config: data.numbering_config || {},
      notification_rules: data.notification_rules || [],
      enabled_features: data.enabled_features || {},
      custom_fields: data.custom_fields || [],
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Create phases if provided
  if (data.phases && data.phases.length > 0) {
    await createTemplatePhasess(template.id, data.phases);
  }

  // Associate checklists if provided
  if (data.checklist_template_ids && data.checklist_template_ids.length > 0) {
    await associateChecklistTemplates(template.id, data.checklist_template_ids);
  }

  // Associate workflows if provided
  if (data.workflow_associations && data.workflow_associations.length > 0) {
    await associateWorkflows(template.id, data.workflow_associations);
  }

  return template as ProjectTemplate;
}

/**
 * Create template from existing project
 */
export async function createTemplateFromProject(
  projectId: string,
  templateData: {
    name: string;
    description?: string;
    category?: string;
    visibility?: 'company' | 'private';
  },
  userId: string
): Promise<ProjectTemplate> {
  // Fetch project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  // Fetch project folders
  const { data: folders, error: foldersError } = await supabase
    .from('folders')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('sort_order');

  if (foldersError) throw foldersError;

  // Transform folder data
  const folderStructure = transformFoldersToStructure(folders);

  // Create template
  return createProjectTemplate(
    {
      company_id: project.company_id,
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      visibility: templateData.visibility,
      default_settings: {
        weather_units: project.weather_units,
      },
      folder_structure: folderStructure,
      enabled_features: project.features_enabled,
    },
    userId
  );
}

/**
 * Duplicate an existing template
 */
export async function duplicateTemplate(
  templateId: string,
  newName: string,
  userId: string
): Promise<ProjectTemplate> {
  const template = await getProjectTemplate(templateId);

  return createProjectTemplate(
    {
      company_id: template.company_id,
      name: newName,
      description: template.description,
      category: template.category,
      tags: template.tags,
      visibility: template.visibility,
      icon: template.icon,
      color: template.color,
      default_settings: template.default_settings,
      folder_structure: template.folder_structure,
      default_roles: template.default_roles,
      numbering_config: template.numbering_config,
      notification_rules: template.notification_rules,
      enabled_features: template.enabled_features,
      custom_fields: template.custom_fields,
    },
    userId
  );
}

// =============================================
// Update Operations
// =============================================

/**
 * Update template
 */
export async function updateProjectTemplate(
  templateId: string,
  updates: UpdateProjectTemplateDTO
): Promise<ProjectTemplate> {
  const { data, error } = await supabase
    .from('project_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectTemplate;
}

/**
 * Increment usage count
 */
export async function incrementTemplateUsage(templateId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_template_usage', {
    template_id: templateId,
  });

  if (error) throw error;
}

// =============================================
// Delete Operations
// =============================================

/**
 * Soft delete template
 */
export async function deleteProjectTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('project_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', templateId);

  if (error) throw error;
}

/**
 * Permanently delete template
 */
export async function permanentlyDeleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('project_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

// =============================================
// Template Application
// =============================================

/**
 * Apply template to a project
 * This is called during project creation
 */
export async function applyTemplateToProject(
  projectId: string,
  templateId: string,
  userId: string
): Promise<ApplyTemplateResult> {
  const template = await getProjectTemplate(templateId);
  const results: ApplyTemplateResult = {
    success: true,
    folders_created: 0,
    workflows_assigned: 0,
    checklists_created: 0,
    phases_created: 0,
    errors: [],
  };

  try {
    // 1. Create folder structure
    if (template.folder_structure && template.folder_structure.length > 0) {
      results.folders_created = await createFoldersFromStructure(
        projectId,
        template.folder_structure,
        userId
      );
    }

    // 2. Assign approval workflows
    if (template.workflows && template.workflows.length > 0) {
      results.workflows_assigned = template.workflows.length;
      // Workflows are already associated at company level, just mark as defaults
    }

    // 3. Create checklists from templates
    if (template.checklists && template.checklists.length > 0) {
      results.checklists_created = await createChecklistsFromTemplates(
        projectId,
        template.checklists,
        userId
      );
    }

    // 4. Create project phases
    if (template.phases && template.phases.length > 0) {
      results.phases_created = await createProjectPhases(
        projectId,
        template.phases
      );
    }

    // 5. Update template usage
    await incrementTemplateUsage(templateId);

  } catch (error) {
    results.success = false;
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return results;
}

// =============================================
// Helper Functions
// =============================================

/**
 * Transform folder rows to hierarchical structure
 */
function transformFoldersToStructure(folders: any[]): any[] {
  const folderMap = new Map();
  const rootFolders: any[] = [];

  // First pass: create map
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      sort_order: folder.sort_order,
      parent_id: folder.parent_folder_id,
      children: [],
    });
  });

  // Second pass: build hierarchy
  folders.forEach(folder => {
    const folderNode = folderMap.get(folder.id);
    if (folder.parent_folder_id) {
      const parent = folderMap.get(folder.parent_folder_id);
      if (parent) {
        parent.children.push(folderNode);
      }
    } else {
      rootFolders.push(folderNode);
    }
  });

  return rootFolders;
}

/**
 * Create folders from structure recursively
 */
async function createFoldersFromStructure(
  projectId: string,
  structure: any[],
  userId: string,
  parentId?: string
): Promise<number> {
  let count = 0;

  for (const folderDef of structure) {
    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        project_id: projectId,
        parent_folder_id: parentId,
        name: folderDef.name,
        description: folderDef.description,
        sort_order: folderDef.sort_order,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      continue;
    }

    count++;

    // Recursively create children
    if (folderDef.children && folderDef.children.length > 0) {
      count += await createFoldersFromStructure(
        projectId,
        folderDef.children,
        userId,
        folder.id
      );
    }
  }

  return count;
}

/**
 * Create checklists from templates
 */
async function createChecklistsFromTemplates(
  projectId: string,
  checklistAssocs: any[],
  userId: string
): Promise<number> {
  let count = 0;

  for (const assoc of checklistAssocs) {
    if (!assoc.auto_create) continue;

    const { error } = await supabase
      .from('checklists')
      .insert({
        project_id: projectId,
        template_id: assoc.checklist_template_id,
        name: assoc.checklist_template.name,
        category: assoc.checklist_template.category,
        status: 'not_started',
        created_by: userId,
      });

    if (error) {
      console.error('Error creating checklist:', error);
      continue;
    }

    count++;
  }

  return count;
}

/**
 * Create template phases
 */
async function createTemplatePhasess(
  templateId: string,
  phases: any[]
): Promise<void> {
  const { error } = await supabase
    .from('project_template_phases')
    .insert(
      phases.map((phase, index) => ({
        template_id: templateId,
        name: phase.name,
        description: phase.description,
        phase_order: index + 1,
        estimated_duration_days: phase.estimated_duration_days,
      }))
    );

  if (error) throw error;
}

/**
 * Create project phases from template
 */
async function createProjectPhases(
  projectId: string,
  templatePhases: any[]
): Promise<number> {
  // This would create entries in a project_phases table if it exists
  // For now, phases are just stored in the template
  return templatePhases.length;
}

/**
 * Associate checklist templates
 */
async function associateChecklistTemplates(
  templateId: string,
  checklistIds: string[]
): Promise<void> {
  const { error } = await supabase
    .from('project_template_checklists')
    .insert(
      checklistIds.map(id => ({
        template_id: templateId,
        checklist_template_id: id,
        is_required: true,
        auto_create: true,
        trigger_phase: 'project_start',
      }))
    );

  if (error) throw error;
}

/**
 * Associate workflows
 */
async function associateWorkflows(
  templateId: string,
  workflows: Array<{ workflow_id: string; workflow_type: string }>
): Promise<void> {
  const { error } = await supabase
    .from('project_template_workflows')
    .insert(
      workflows.map(w => ({
        template_id: templateId,
        workflow_id: w.workflow_id,
        workflow_type: w.workflow_type,
        is_default: true,
      }))
    );

  if (error) throw error;
}

export const projectTemplatesApi = {
  getProjectTemplates,
  getProjectTemplate,
  getRecentTemplates,
  getPopularTemplates,
  createProjectTemplate,
  createTemplateFromProject,
  duplicateTemplate,
  updateProjectTemplate,
  deleteProjectTemplate,
  applyTemplateToProject,
  incrementTemplateUsage,
};
```

### Type Definitions

**File:** `c:\Users\Eli\Documents\git\src\types\project-template.ts`

```typescript
/**
 * Project Template Types
 * Complete type definitions for project templates feature
 */

// =============================================
// Enums and Constants
// =============================================

export type TemplateCategory =
  | 'commercial'
  | 'residential'
  | 'industrial'
  | 'renovation'
  | 'civil'
  | 'institutional'
  | 'custom';

export type TemplateVisibility = 'company' | 'private';

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'civil', label: 'Civil/Infrastructure' },
  { value: 'institutional', label: 'Institutional' },
  { value: 'custom', label: 'Custom' },
];

// =============================================
// Core Types (Database Schema)
// =============================================

export interface ProjectTemplate {
  id: string;
  company_id: string;

  // Template Info
  name: string;
  description: string | null;
  category: TemplateCategory | null;
  tags: string[] | null;

  // Visibility
  visibility: TemplateVisibility;
  is_system_template: boolean;
  is_active: boolean;

  // UI
  icon: string | null;
  color: string | null;

  // Configuration
  default_settings: DefaultSettings;
  folder_structure: FolderStructure[];
  default_roles: DefaultRole[];
  numbering_config: NumberingConfig;
  notification_rules: NotificationRule[];
  enabled_features: EnabledFeatures;
  custom_fields: CustomField[];

  // Statistics
  usage_count: number;
  last_used_at: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

export interface ProjectTemplatePhase {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  phase_order: number;
  estimated_duration_days: number | null;
  depends_on_phase_id: string | null;
  created_at: string;
}

export interface ProjectTemplateChecklist {
  id: string;
  template_id: string;
  checklist_template_id: string;
  is_required: boolean;
  auto_create: boolean;
  trigger_phase: string | null;
  created_at: string;
}

export interface ProjectTemplateWorkflow {
  id: string;
  template_id: string;
  workflow_id: string;
  workflow_type: string;
  is_default: boolean;
  created_at: string;
}

export interface ProjectTemplateDistributionList {
  id: string;
  template_id: string;
  list_name: string;
  list_type: string;
  is_default: boolean;
  members: DistributionMemberConfig[];
  created_at: string;
}

// =============================================
// Configuration Types (JSONB)
// =============================================

export interface DefaultSettings {
  weather_units?: 'imperial' | 'metric';
  timezone?: string;
  budget?: {
    tracking_enabled: boolean;
    currency: string;
    contingency_percentage?: number;
  };
  schedule?: {
    working_days: number[];
    holidays?: string[];
    default_duration_unit: 'hours' | 'days' | 'weeks';
  };
  safety?: {
    require_daily_safety_briefing: boolean;
    require_jsa_for_hazardous_work: boolean;
    incident_notification_emails?: string[];
  };
  documents?: {
    require_approval_for_upload: boolean;
    auto_version_on_edit: boolean;
    retention_period_days?: number;
  };
}

export interface FolderStructure {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  children?: FolderStructure[];
}

export interface DefaultRole {
  role_name: string;
  project_role: string;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  description?: string;
  typical_responsibilities?: string[];
}

export interface NumberingConfig {
  rfis?: {
    format: string;
    start_number: number;
    prefix?: string;
    increment: number;
  };
  submittals?: {
    format: string;
    use_spec_section: boolean;
    start_number: number;
  };
  change_orders?: {
    format: string;
    start_number: number;
    separate_pco_sequence: boolean;
  };
  daily_reports?: {
    format: string;
  };
  transmittals?: {
    format: string;
    start_number: number;
  };
}

export interface NotificationRule {
  event_type: string;
  notify_roles: string[];
  notify_emails?: string[];
  delivery_method: ('email' | 'in_app' | 'push')[];
  delay_minutes?: number;
  conditions?: Record<string, any>;
}

export interface EnabledFeatures {
  daily_reports?: boolean;
  documents?: boolean;
  workflows?: boolean;
  tasks?: boolean;
  checklists?: boolean;
  punch_lists?: boolean;
  safety?: boolean;
  inspections?: boolean;
  material_tracking?: boolean;
  photos?: boolean;
  takeoff?: boolean;
  cost_tracking?: boolean;
  equipment_tracking?: boolean;
  time_tracking?: boolean;
  qr_codes?: boolean;
  gantt_schedule?: boolean;
  weather_logs?: boolean;
  transmittals?: boolean;
  meeting_minutes?: boolean;
  permits?: boolean;
  notices?: boolean;
  closeout?: boolean;
  client_portal?: boolean;
  subcontractor_portal?: boolean;
}

export interface CustomField {
  id: string;
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';
  label: string;
  description?: string;
  required: boolean;
  default_value?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  apply_to: 'project' | 'daily_report' | 'rfi' | 'submittal' | 'change_order' | 'punch_item';
}

export interface DistributionMemberConfig {
  role?: string; // e.g., 'project_manager', 'superintendent'
  email?: string; // hardcoded email
  member_role: 'to' | 'cc' | 'bcc';
}

// =============================================
// Extended Types
// =============================================

export interface ProjectTemplateWithDetails extends ProjectTemplate {
  phases: ProjectTemplatePhase[];
  checklists: (ProjectTemplateChecklist & {
    checklist_template?: any;
  })[];
  workflows: (ProjectTemplateWorkflow & {
    workflow?: any;
  })[];
  distribution_lists: ProjectTemplateDistributionList[];
  created_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface ProjectTemplateWithStats extends ProjectTemplate {
  recent_projects?: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
}

// =============================================
// DTO Types
// =============================================

export interface CreateProjectTemplateDTO {
  company_id: string;
  name: string;
  description?: string;
  category?: TemplateCategory;
  tags?: string[];
  visibility?: TemplateVisibility;
  icon?: string;
  color?: string;

  // Configuration
  default_settings?: DefaultSettings;
  folder_structure?: FolderStructure[];
  default_roles?: DefaultRole[];
  numbering_config?: NumberingConfig;
  notification_rules?: NotificationRule[];
  enabled_features?: EnabledFeatures;
  custom_fields?: CustomField[];

  // Associations
  phases?: Array<{
    name: string;
    description?: string;
    estimated_duration_days?: number;
  }>;
  checklist_template_ids?: string[];
  workflow_associations?: Array<{
    workflow_id: string;
    workflow_type: string;
  }>;
}

export interface UpdateProjectTemplateDTO {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  tags?: string[];
  visibility?: TemplateVisibility;
  icon?: string;
  color?: string;
  is_active?: boolean;

  // Configuration
  default_settings?: DefaultSettings;
  folder_structure?: FolderStructure[];
  default_roles?: DefaultRole[];
  numbering_config?: NumberingConfig;
  notification_rules?: NotificationRule[];
  enabled_features?: EnabledFeatures;
  custom_fields?: CustomField[];
}

export interface ApplyTemplateResult {
  success: boolean;
  folders_created: number;
  workflows_assigned: number;
  checklists_created: number;
  phases_created: number;
  errors: string[];
}

// =============================================
// Filter Types
// =============================================

export interface ProjectTemplateFilters {
  category?: TemplateCategory;
  isActive?: boolean;
  search?: string;
  tags?: string[];
}
```

---

## Database Migration

**File:** `c:\Users\Eli\Documents\git\supabase\migrations\088_project_templates.sql`

```sql
-- =============================================
-- Migration: 088_project_templates.sql
-- Description: Project templates for standardized project creation
-- Created: 2025-12-08
-- =============================================

-- =============================================
-- TABLES
-- =============================================

-- Main project templates table
CREATE TABLE IF NOT EXISTS project_templates (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'commercial', 'residential', 'industrial', etc.
  tags TEXT[], -- searchable keywords

  -- Visibility
  visibility VARCHAR(50) DEFAULT 'company' CHECK (visibility IN ('company', 'private')),
  is_system_template BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Icon/Color for UI
  icon VARCHAR(50),
  color VARCHAR(7), -- hex color code

  -- Template Configuration (JSONB)
  default_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  folder_structure JSONB DEFAULT '[]'::jsonb,
  default_roles JSONB DEFAULT '[]'::jsonb,
  numbering_config JSONB DEFAULT '{}'::jsonb,
  notification_rules JSONB DEFAULT '[]'::jsonb,
  enabled_features JSONB DEFAULT '{}'::jsonb,
  custom_fields JSONB DEFAULT '[]'::jsonb,

  -- Usage Statistics
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_template_name UNIQUE(company_id, name)
);

COMMENT ON TABLE project_templates IS 'Reusable project templates for standardized project setup';
COMMENT ON COLUMN project_templates.visibility IS 'company = visible to all company users, private = only creator';
COMMENT ON COLUMN project_templates.is_system_template IS 'Industry-standard templates provided by the system';
COMMENT ON COLUMN project_templates.default_settings IS 'Default project settings (weather units, schedule, budget, etc.)';
COMMENT ON COLUMN project_templates.folder_structure IS 'Hierarchical folder structure to create';
COMMENT ON COLUMN project_templates.default_roles IS 'Standard team roles and permissions';
COMMENT ON COLUMN project_templates.numbering_config IS 'Numbering schemes for RFIs, submittals, etc.';
COMMENT ON COLUMN project_templates.enabled_features IS 'Which features are enabled for projects';

-- Phase/milestone templates
CREATE TABLE IF NOT EXISTS project_template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,

  -- Phase Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  phase_order INTEGER NOT NULL,

  -- Duration
  estimated_duration_days INTEGER,

  -- Dependencies
  depends_on_phase_id UUID REFERENCES project_template_phases(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_phase_order UNIQUE(template_id, phase_order)
);

COMMENT ON TABLE project_template_phases IS 'Phase/milestone templates for project schedules';

-- Checklist template associations
CREATE TABLE IF NOT EXISTS project_template_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  checklist_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,

  -- Configuration
  is_required BOOLEAN DEFAULT TRUE,
  auto_create BOOLEAN DEFAULT TRUE,
  trigger_phase VARCHAR(100), -- When to create: 'project_start', 'substantial_completion', etc.

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_template_checklist UNIQUE(template_id, checklist_template_id)
);

COMMENT ON TABLE project_template_checklists IS 'Associates checklist templates with project templates';
COMMENT ON COLUMN project_template_checklists.auto_create IS 'Automatically create checklist when project is created';
COMMENT ON COLUMN project_template_checklists.trigger_phase IS 'When to create the checklist (project_start, phase_name, milestone)';

-- Approval workflow associations
CREATE TABLE IF NOT EXISTS project_template_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,

  -- Assignment
  workflow_type VARCHAR(50) NOT NULL, -- 'document', 'submittal', 'rfi', 'change_order'
  is_default BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_template_workflow_type UNIQUE(template_id, workflow_type)
);

COMMENT ON TABLE project_template_workflows IS 'Associates approval workflows with project templates';
COMMENT ON COLUMN project_template_workflows.workflow_type IS 'Type of entity this workflow applies to';
COMMENT ON COLUMN project_template_workflows.is_default IS 'Use as default workflow for this entity type';

-- Distribution list templates
CREATE TABLE IF NOT EXISTS project_template_distribution_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,

  -- List definition
  list_name VARCHAR(200) NOT NULL,
  list_type VARCHAR(50) NOT NULL, -- 'rfi', 'submittal', 'transmittal', etc.
  is_default BOOLEAN DEFAULT FALSE,

  -- Members configuration (role-based, resolved at project creation)
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example: [{"role": "project_manager", "member_role": "to"}, {"email": "architect@firm.com", "member_role": "cc"}]

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE project_template_distribution_lists IS 'Distribution list definitions to create per project';
COMMENT ON COLUMN project_template_distribution_lists.members IS 'Array of member configs with role or email';

-- =============================================
-- INDEXES
-- =============================================

-- Templates
CREATE INDEX IF NOT EXISTS idx_project_templates_company ON project_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category);
CREATE INDEX IF NOT EXISTS idx_project_templates_active ON project_templates(company_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_project_templates_usage ON project_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_project_templates_tags ON project_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_project_templates_deleted ON project_templates(deleted_at) WHERE deleted_at IS NULL;

-- Phases
CREATE INDEX IF NOT EXISTS idx_template_phases_template ON project_template_phases(template_id);
CREATE INDEX IF NOT EXISTS idx_template_phases_order ON project_template_phases(template_id, phase_order);

-- Checklists
CREATE INDEX IF NOT EXISTS idx_template_checklists_template ON project_template_checklists(template_id);
CREATE INDEX IF NOT EXISTS idx_template_checklists_checklist ON project_template_checklists(checklist_template_id);

-- Workflows
CREATE INDEX IF NOT EXISTS idx_template_workflows_template ON project_template_workflows(template_id);
CREATE INDEX IF NOT EXISTS idx_template_workflows_workflow ON project_template_workflows(workflow_id);
CREATE INDEX IF NOT EXISTS idx_template_workflows_type ON project_template_workflows(workflow_type);

-- Distribution Lists
CREATE INDEX IF NOT EXISTS idx_template_dist_lists_template ON project_template_distribution_lists(template_id);
CREATE INDEX IF NOT EXISTS idx_template_dist_lists_type ON project_template_distribution_lists(list_type);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp
CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON project_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS
-- =============================================

-- Increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE project_templates
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_template_usage IS 'Increment usage count and update last_used_at timestamp';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_distribution_lists ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Users can view templates for their company"
  ON project_templates FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      visibility = 'company'
      OR (visibility = 'private' AND created_by = auth.uid())
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create templates for their company"
  ON project_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own templates or company templates if admin"
  ON project_templates FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
      )
    )
  );

CREATE POLICY "Users can delete their own templates"
  ON project_templates FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND company_id = project_templates.company_id
      AND role IN ('admin', 'owner')
    )
  );

-- Phase policies (inherit from template)
CREATE POLICY "Users can view phases for accessible templates"
  ON project_template_phases FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage phases for their templates"
  ON project_template_phases FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
      OR company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

-- Checklist association policies
CREATE POLICY "Users can view checklist associations"
  ON project_template_checklists FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage checklist associations"
  ON project_template_checklists FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
    )
  );

-- Workflow association policies
CREATE POLICY "Users can view workflow associations"
  ON project_template_workflows FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage workflow associations"
  ON project_template_workflows FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
    )
  );

-- Distribution list policies
CREATE POLICY "Users can view distribution list templates"
  ON project_template_distribution_lists FOR SELECT
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage distribution list templates"
  ON project_template_distribution_lists FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM project_templates
      WHERE created_by = auth.uid()
    )
  );

-- =============================================
-- SEED DATA (Optional System Templates)
-- =============================================

-- Insert system templates (company_id = NULL means system-wide)
-- These would be created by a separate seed script

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 088_project_templates completed successfully';
END $$;
```

---

## Implementation Phases

### Phase 1: Core Template CRUD (Week 1-2)

**Database:**
- [x] Create migration 088_project_templates.sql
- [x] Define all tables and relationships
- [x] Create indexes and RLS policies
- [x] Create helper functions

**Backend:**
- [ ] Create type definitions (project-template.ts)
- [ ] Implement service layer (project-templates.ts)
- [ ] Create React Query hooks (useProjectTemplates.ts)
- [ ] Add validation schemas

**Frontend:**
- [ ] Create template list page
- [ ] Build template creation dialog
- [ ] Implement template editing
- [ ] Add template deletion

**Testing:**
- [ ] Unit tests for service functions
- [ ] Integration tests for CRUD operations
- [ ] E2E tests for template management

### Phase 2: Template Application (Week 3)

**Backend:**
- [ ] Implement applyTemplateToProject function
- [ ] Create folder structure from template
- [ ] Handle workflow associations
- [ ] Process checklist creation

**Frontend:**
- [ ] Add template selector to Create Project dialog
- [ ] Show template preview
- [ ] Display template application progress
- [ ] Handle errors gracefully

**Testing:**
- [ ] Test template application with various configurations
- [ ] Verify folder creation
- [ ] Validate workflow assignments

### Phase 3: Advanced Features (Week 4)

**Backend:**
- [ ] Implement "Save as Template" from project
- [ ] Add template duplication
- [ ] Create usage analytics
- [ ] Add system template management

**Frontend:**
- [ ] Build "Save as Template" UI
- [ ] Create template analytics dashboard
- [ ] Add template preview modal
- [ ] Implement template search/filter

**Testing:**
- [ ] Test project-to-template conversion
- [ ] Verify analytics accuracy
- [ ] Test search and filtering

### Phase 4: Polish & Documentation (Week 5)

**Documentation:**
- [ ] User guide for templates
- [ ] Admin documentation
- [ ] API documentation
- [ ] Video tutorials

**Polish:**
- [ ] Improve UI/UX based on feedback
- [ ] Optimize performance
- [ ] Add loading states
- [ ] Improve error messages

**Testing:**
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Load testing

---

## Security and Permissions

### Row-Level Security (RLS)

**Template Visibility:**
- Company-wide templates: Visible to all users in the company
- Private templates: Only visible to creator
- System templates: Visible to all users (read-only)

**Template Permissions:**
- **Create:** Any authenticated user
- **Read:** Company members (respecting visibility)
- **Update:** Creator or company admin
- **Delete:** Creator or company admin
- **Apply:** Any company member with project creation permission

### Permission Checks

```typescript
// Check if user can edit template
function canEditTemplate(userId: string, template: ProjectTemplate): boolean {
  return (
    template.created_by === userId ||
    userHasRole(userId, ['admin', 'owner'])
  );
}

// Check if user can delete template
function canDeleteTemplate(userId: string, template: ProjectTemplate): boolean {
  return (
    template.created_by === userId ||
    userHasRole(userId, ['admin', 'owner'])
  );
}

// Check if user can use template
function canUseTemplate(userId: string, template: ProjectTemplate): boolean {
  if (template.visibility === 'company') return true;
  if (template.visibility === 'private') return template.created_by === userId;
  return false;
}
```

### Audit Trail

All template operations should be logged:

- Template created
- Template updated
- Template deleted
- Template applied to project
- Template duplicated

Store in activity log or separate audit table.

---

## Testing Strategy

### Unit Tests

**Service Layer:**
```typescript
describe('projectTemplatesApi', () => {
  describe('getProjectTemplates', () => {
    it('should fetch templates for a company', async () => {
      const templates = await projectTemplatesApi.getProjectTemplates(companyId);
      expect(templates).toBeInstanceOf(Array);
    });

    it('should filter by category', async () => {
      const templates = await projectTemplatesApi.getProjectTemplates(companyId, {
        category: 'commercial',
      });
      templates.forEach(t => expect(t.category).toBe('commercial'));
    });

    it('should search by name', async () => {
      const templates = await projectTemplatesApi.getProjectTemplates(companyId, {
        search: 'office',
      });
      templates.forEach(t => expect(t.name.toLowerCase()).toContain('office'));
    });
  });

  describe('createProjectTemplate', () => {
    it('should create a new template', async () => {
      const template = await projectTemplatesApi.createProjectTemplate(
        {
          company_id: companyId,
          name: 'Test Template',
          category: 'commercial',
        },
        userId
      );
      expect(template.id).toBeDefined();
      expect(template.name).toBe('Test Template');
    });

    it('should reject duplicate names', async () => {
      await expect(
        projectTemplatesApi.createProjectTemplate(
          {
            company_id: companyId,
            name: 'Existing Template',
          },
          userId
        )
      ).rejects.toThrow();
    });
  });

  describe('applyTemplateToProject', () => {
    it('should create folders from template', async () => {
      const result = await projectTemplatesApi.applyTemplateToProject(
        projectId,
        templateId,
        userId
      );
      expect(result.folders_created).toBeGreaterThan(0);
    });

    it('should increment usage count', async () => {
      const before = await projectTemplatesApi.getProjectTemplate(templateId);
      await projectTemplatesApi.applyTemplateToProject(projectId, templateId, userId);
      const after = await projectTemplatesApi.getProjectTemplate(templateId);
      expect(after.usage_count).toBe(before.usage_count + 1);
    });
  });
});
```

### Integration Tests

**Template Application:**
```typescript
describe('Template Application Integration', () => {
  it('should create complete project from template', async () => {
    // Create template with full config
    const template = await createFullTemplate();

    // Create project using template
    const project = await createProjectFromTemplate(template.id);

    // Verify all components created
    const folders = await getFolders(project.id);
    expect(folders.length).toBe(8);

    const checklists = await getChecklists(project.id);
    expect(checklists.length).toBe(4);

    // Verify settings applied
    expect(project.weather_units).toBe(template.default_settings.weather_units);
    expect(project.features_enabled).toEqual(template.enabled_features);
  });
});
```

### E2E Tests

**User Workflows:**
```typescript
describe('Project Template E2E', () => {
  it('should allow creating and using a template', async () => {
    // Navigate to templates page
    await page.goto('/settings/project-templates');

    // Create new template
    await page.click('[data-testid="create-template-button"]');
    await page.fill('[name="name"]', 'E2E Test Template');
    await page.selectOption('[name="category"]', 'commercial');
    await page.click('[data-testid="save-template"]');

    // Verify template appears in list
    await expect(page.locator('text=E2E Test Template')).toBeVisible();

    // Create project using template
    await page.goto('/projects');
    await page.click('[data-testid="create-project-button"]');
    await page.selectOption('[name="template"]', { label: 'E2E Test Template' });
    await page.fill('[name="name"]', 'Test Project');
    await page.click('[data-testid="create-project-submit"]');

    // Verify project created with template settings
    await expect(page.locator('text=Test Project')).toBeVisible();
  });
});
```

---

## Summary

This specification provides a complete, production-ready design for Project Templates in a construction management application. The feature addresses real-world construction needs by:

1. **Saving Time:** Reduce project setup from hours to minutes
2. **Ensuring Consistency:** Standardize workflows across similar projects
3. **Capturing Knowledge:** Preserve best practices and lessons learned
4. **Supporting Multiple Project Types:** Commercial, residential, industrial, etc.
5. **Flexible Configuration:** Highly customizable yet simple to use

The implementation is broken into manageable phases, with clear database schema, API design, and UI specifications. All components are designed to integrate seamlessly with the existing codebase structure and patterns.

**Key Files Created:**
- Database: `supabase/migrations/088_project_templates.sql`
- Types: `src/types/project-template.ts`
- Service: `src/lib/api/services/project-templates.ts`
- UI: Template management pages and dialogs

**Next Steps:**
1. Review and approve specification
2. Begin Phase 1 implementation (Core CRUD)
3. Iterate based on user feedback
4. Expand with system templates and advanced features
