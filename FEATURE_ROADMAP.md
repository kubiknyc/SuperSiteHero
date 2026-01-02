# JobSight Feature Roadmap

**Last Updated**: 2026-01-01
**Current Version**: 2.0.0

---

## Overview

This document tracks the feature implementation roadmap for JobSight, a comprehensive construction field management platform. The roadmap is organized into phases focusing on different aspects of the platform.

---

## Phase 1: Critical Fixes (COMPLETE)

Core data integration and essential workflow fixes.

| Item | Feature | Description | Status |
|------|---------|-------------|--------|
| 1.1 | Dashboard Real Data | Connect dashboard stats to actual database queries | ✅ Complete |
| 1.2 | RFI Ball-in-Court | Track responsibility assignment for RFI responses | ✅ Complete |
| 1.3 | Change Order Backup Docs | Attach supporting documentation to change orders | ✅ Complete |
| 1.4 | Project Budget Tracking | Add budget fields with contingency and health scoring | ✅ Complete |

### Implementation Details

**Dashboard (1.1)**
- Created `useDashboardStats.ts` hook
- Connected to real project, RFI, submittal, and task data
- Added action required widget

**RFIs (1.2)**
- Ball-in-court tracking via migration 049
- Role-based assignment (Architect, Engineer, Owner, GC)
- Response due date tracking

**Change Orders (1.3)**
- Backup document storage via migration 052
- File attachments for supporting documentation
- Cost breakdown itemization

**Projects (1.4)**
- Budget tracking via migration 060
- Fields: `budget_amount`, `spent_to_date`, `contingency_amount`, `contingency_used`
- Auto-calculated `budget_health_score`
- Trigger for automatic contingency updates from approved COs

---

## Phase 2: Industry Essentials (COMPLETE)

Standard construction management features expected by industry professionals.

| Item | Feature | Description | Status |
|------|---------|-------------|--------|
| 2.1 | Submittal Lead Time Calculator | Calculate submit-by dates based on fabrication + review | ✅ Complete |
| 2.2 | Tasks Gantt Chart | Interactive timeline view with dependencies | ✅ Complete |
| 2.3 | Document Revision Tracking | Drawing register, transmittals, ASI tracking | ✅ Complete |
| 2.4 | OSHA 301 Form | Injury and Illness Incident Report | ✅ Complete |

### Implementation Details

**Submittals (2.1)**
- Created `LeadTimeCalculator.tsx` component
- Inputs: Required on-site date, fabrication lead time, review cycle days
- Outputs: Submit-by date, approval needed by date
- Visual timeline with milestones
- Database fields via migration 061

**Tasks (2.2)**
- Created `GanttChart.tsx` component
- Horizontal bar visualization
- Dependency arrows (predecessor/successor)
- Today marker and date range navigation
- Color-coded by status
- Click to view task details

**Documents (2.3)**
- Created `DrawingRegister.tsx` (AIA G810-style drawing log)
- Created `TransmittalForm.tsx` for document transmittals
- Created `useDrawingRevisions.ts` hook
- Revision history tracking (Rev A, B, C...)
- ASI tracking and filtering
- Discipline grouping (Architectural, Structural, MEP, etc.)
- CSV export functionality
- Database fields via migration 062

**Safety (2.4)**
- Created `OSHA301Form.tsx` component
- Complete OSHA Form 301 implementation
- Employee and physician information
- Incident details and classification
- Print-ready layout
- Integration with existing OSHA 300/300A forms

---

## Phase 3: Field Enhancement (COMPLETE)

Tools to improve field documentation and verification.

| Item | Feature | Description | Status |
|------|---------|-------------|--------|
| 3.1 | Daily Report Photos | Photo gallery with weather API integration | ✅ Complete |
| 3.2 | Punch List Photos | Before/after photo documentation | ✅ Complete |
| 3.3 | Checklist Signatures | Digital signature capture for inspections | ✅ Complete |

### Implementation Details

**Daily Reports (3.1)**
- Photo gallery already implemented
- Weather API integration (Open-Meteo)
- GPS-based location detection
- EXIF metadata extraction

**Punch Lists (3.2)**
- Before/after photo support already implemented
- Photo comparison view
- Status tracking with visual evidence

**Checklists (3.3)**
- Created `signature-pad.tsx` component
- Canvas-based signature capture
- Clear and save functionality
- Integration with checklist submissions
- Print-ready signature display

---

## Phase 4: Analytics & Reporting (COMPLETE)

Enhanced visibility and budget management tools.

| Item | Feature | Description | Status |
|------|---------|-------------|--------|
| 4.1 | Dashboard Action Widget | Items requiring immediate attention | ✅ Complete |
| 4.2 | Contingency Tracking | Visual budget and contingency monitoring | ✅ Complete |

### Implementation Details

**Dashboard (4.1)**
- Action required widget on main dashboard
- Shows overdue RFIs, pending approvals, upcoming deadlines
- Priority-based sorting
- Quick navigation to action items

**Change Orders (4.2)**
- Created `ContingencyTracker.tsx` component
- Visual progress bar with health status
- Status levels: Healthy (< 50%), Warning (50-75%), Critical (75-90%), Depleted (> 90%)
- Approved CO list with impact amounts
- Pending CO warnings with potential budget impact
- Contract impact summary
- Integrated into Project Detail page sidebar

---

## Phase 5: Enterprise Features (PLANNED)

Advanced capabilities for larger organizations.

| Item | Feature | Description | Status |
|------|---------|-------------|--------|
| 5.1 | SSO/SAML Authentication | Enterprise single sign-on integration | ⬜ Planned |
| 5.2 | Audit Trails | Comprehensive change logging | ⬜ Planned |
| 5.3 | Custom Fields | User-defined data fields | ⬜ Planned |
| 5.4 | API Keys | Third-party integration support | ⬜ Planned |

### Proposed Implementation

**SSO/SAML (5.1)**
- Supabase Auth SAML provider integration
- Support for Okta, Azure AD, Google Workspace
- Just-in-time user provisioning
- Role mapping from identity provider

**Audit Trails (5.2)**
- Database triggers for change tracking
- Audit log table with before/after values
- User, timestamp, and action type
- Filterable audit log viewer

**Custom Fields (5.3)**
- Dynamic field definitions per entity type
- Field types: text, number, date, select, multi-select
- Validation rules
- Search and filter integration

**API Keys (5.4)**
- API key generation and management
- Scoped permissions per key
- Rate limiting
- Usage analytics

---

## Summary

| Phase | Description | Status | Items |
|-------|-------------|--------|-------|
| 1 | Critical Fixes | ✅ Complete | 4/4 |
| 2 | Industry Essentials | ✅ Complete | 4/4 |
| 3 | Field Enhancement | ✅ Complete | 3/3 |
| 4 | Analytics & Reporting | ✅ Complete | 2/2 |
| 5 | Enterprise Features | ⬜ Planned | 0/4 |

**Total Completed**: 13/17 features (76%)

---

## Key Files Created/Modified

### Phase 1
- `src/features/dashboard/hooks/useDashboardStats.ts`
- `src/pages/DashboardPage.tsx`
- `supabase/migrations/060_enhanced_project_budget.sql`

### Phase 2
- `src/features/submittals/components/LeadTimeCalculator.tsx`
- `src/features/tasks/components/GanttChart.tsx`
- `src/features/documents/components/DrawingRegister.tsx`
- `src/features/documents/components/TransmittalForm.tsx`
- `src/features/documents/hooks/useDrawingRevisions.ts`
- `src/features/safety/components/OSHA301Form.tsx`
- `supabase/migrations/061_submittal_lead_time.sql`
- `supabase/migrations/062_document_revisions.sql`

### Phase 3
- `src/components/ui/signature-pad.tsx`

### Phase 4
- `src/features/change-orders/components/ContingencyTracker.tsx`
- `src/pages/projects/ProjectDetailPage.tsx` (modified)

---

## Architecture Notes

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **State Management**: TanStack Query (React Query), Zustand
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Testing**: Vitest, Playwright, React Testing Library

### Design Patterns
- Feature-based folder structure (`src/features/*`)
- Custom hooks for data fetching (`use*.ts`)
- Component composition with shadcn/ui
- Row Level Security (RLS) for multi-tenancy

### Database
- 172+ migrations
- 60+ tables
- Comprehensive RLS policies
- Optimized indexes for performance

---

*Last reviewed: 2026-01-01*
