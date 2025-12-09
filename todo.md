# SuperSiteHero - Consolidated TODO List

**Last Updated:** December 9, 2025 (AI Agents Integration Complete)
**Current Status:** P0 ✅ + P1 ✅ + P2 ✅ (except QuickBooks) + Quick Wins ✅ + AI Agents ✅ + All Stubs Verified
**Focus:** Production-ready! Remaining stubs are deferred P3 features.

---

## Quick Reference

| Priority | Category | Items | Status |
|----------|----------|-------|--------|
| P0 | Production Blockers | 6 ✅ ALL COMPLETE | Done |
| P1 | High Priority Features | 4 ✅ ALL COMPLETE | Done (Dec 7) |
| P2 | Medium Priority | 6/7 items ✅ | Done (Dec 8) - QuickBooks deferred |
| P3 | Long-term | 5 | 2026+ |

---

## P0 - PRODUCTION BLOCKERS ✅ ALL COMPLETE

### Infrastructure

- [x] **CI/CD Pipeline Setup** ✅ (Dec 7, 2025)
  - GitHub Actions workflow for build/test/deploy
  - Automated TypeScript checking
  - Test execution on PR
  - Deployment to staging on merge
  - **Files:** `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
  - **Setup Required:** Add GitHub Secrets (see below)

- [x] **Staging Environment** ✅ (Dec 7, 2025)
  - Documentation created: `docs/STAGING_ENVIRONMENT_SETUP.md`
  - Step-by-step Supabase staging setup guide
  - CI/CD staging deployment workflow
  - Environment variables template
  - ✅ **COMPLETE:** Comprehensive staging setup guide available

- [x] **Error Monitoring (Complete Sentry)** ✅ (Dec 7, 2025)
  - ErrorBoundary integrated with Sentry capture
  - API client captures database errors
  - AuthContext sets user context for error tracking
  - `.env.example` updated with Sentry config
  - **Files:** `src/lib/sentry.ts`, `src/components/errors/ErrorBoundary.tsx`, `src/lib/api/client.ts`
  - ✅ **COMPLETE:** VITE_SENTRY_DSN documented in `.env.example` and `docs/runbooks/environment-variables.md`

- [x] **Security Audit** ✅ (Dec 7, 2025)
  - RLS policy review - COMPLETED
  - API endpoint validation - COMPLETED
  - Input sanitization check - COMPLETED
  - OWASP Top 10 review - COMPLETED
  - **Result:** 2 HIGH severity vulnerabilities found (xlsx, expr-eval)
  - **Report:** `SECURITY_AUDIT_REPORT.md`
  - ✅ **RESOLVED:** xlsx replaced with exceljs, expr-eval replaced with mathjs (npm audit: 0 vulnerabilities)

- [x] **Performance Testing** ✅ (Dec 7, 2025)
  - k6 load testing: `tests/load/` (auth, projects, documents, api-stress)
  - Lighthouse CI: `.lighthouserc.js` with 90+ score targets
  - Web Vitals baseline: `tests/performance/web-vitals-baseline.ts`
  - Bundle analysis scripts in package.json
  - **Run:** `npm run perf:load`, `npm run lighthouse`

- [x] **User Acceptance Testing** ✅ (Dec 7, 2025)
  - UAT test scripts: `docs/UAT_TEST_SCRIPTS.md`
  - E2E test suites created for all critical flows:
    - `e2e/auth.spec.ts` - Authentication
    - `e2e/projects.spec.ts` - Project management
    - `e2e/daily-reports.spec.ts` - Daily reports
    - `e2e/rfis.spec.ts` - RFIs
    - `e2e/submittals.spec.ts` - Submittals
    - `e2e/offline.spec.ts` - Offline mode
  - Mobile testing enabled in playwright.config.ts
  - **Run:** `npm run test:e2e`

---

## P1 - HIGH PRIORITY FEATURES ✅ ALL COMPLETE (Dec 7, 2025)

### Weather API Integration ✅ COMPLETE
**Priority:** P1 | **Effort:** 2-3 days | **Completed:** Dec 2025

- [x] **Weather API Integration (Open-Meteo)**
  - Auto-fetch weather based on GPS coordinates
  - Supports both current location and project coordinates
  - Full weather data: condition, temp high/low, precipitation, wind speed
  - **File:** `src/features/daily-reports/services/weatherService.ts`
  - Uses Open-Meteo API (free, no API key required)
  - **Migration:** `supabase/migrations/072_weather_history.sql`

### Look-Ahead Planning (3-Week View) ✅ COMPLETE
**Priority:** P1 | **Effort:** 1-2 weeks | **Completed:** Dec 7, 2025

- [x] **Database Migration** ✅
  - Created `look_ahead_activities` table
  - Created `look_ahead_constraints` table
  - Created `look_ahead_snapshots` table
  - **File:** `supabase/migrations/073_look_ahead_planning.sql`

- [x] **TypeScript Types** ✅
  - Activity, Constraint, Snapshot interfaces
  - **File:** `src/types/look-ahead.ts`

- [x] **React Query Hooks** ✅
  - useActivitiesByWeek, useCreateActivity, useUpdateActivity
  - useMoveActivityToWeek, useUpdateActivityStatus
  - useActivityConstraints, useCreateConstraint
  - usePPCMetrics, useLookAheadSnapshots
  - **File:** `src/features/look-ahead/hooks/useLookAhead.ts`

- [x] **UI Components** ✅
  - WeekColumn, ActivityCard, ConstraintsList
  - LookAheadPlanner, ActivityDetailDialog
  - LookAheadStats, PPCBadge, ConstraintBadge
  - **Files:** `src/features/look-ahead/components/`

- [x] **Look-Ahead Pages** ✅
  - LookAheadPage - 3-column week view with drag-drop
  - LookAheadSnapshotsPage - PPC history and trends
  - **Files:** `src/pages/look-ahead/`

- [x] **Routes Added** ✅
  - `/projects/:projectId/look-ahead`
  - `/projects/:projectId/look-ahead/snapshots`

### Real-time Collaboration ✅ COMPLETE
**Priority:** P1 | **Effort:** 1 week | **Completed:** Dec 7, 2025

- [x] **Supabase Realtime Integration** ✅
  - Enabled realtime on key tables
  - Presence tracking system
  - Typing indicators
  - Connection status monitoring
  - **Files:**
    - `src/lib/realtime/client.ts`
    - `src/lib/realtime/presence.ts`
    - `src/lib/realtime/types.ts`
    - `src/hooks/useRealtimePresence.ts`
    - `src/hooks/useRealtimeSubscription.ts`
    - `src/hooks/useRealtimeUpdates.ts`
  - **Migration:** `supabase/migrations/075_enable_realtime.sql`

- [x] **Live Updates UI** ✅
  - Presence avatars showing who's viewing
  - Live update badges
  - Connection status component
  - PresenceContext for app-wide state
  - **Files:**
    - `src/components/presence/PresenceAvatars.tsx`
    - `src/components/presence/PresenceIndicator.tsx`
    - `src/components/realtime/ConnectionStatus.tsx`
    - `src/components/realtime/LiveUpdateBadge.tsx`
    - `src/components/realtime/TypingIndicator.tsx`
    - `src/contexts/PresenceContext.tsx`

### Mobile PWA Optimization ✅ COMPLETE
**Priority:** P1 | **Effort:** 1 week | **Completed:** Dec 7, 2025

- [x] **PWA Manifest Review** ✅
  - Complete icon set (72-512px PNG icons)
  - iOS splash screens for all device sizes
  - Offline fallback page (already existed)
  - Apple-specific meta tags (apple-mobile-web-app-capable, etc.)
  - **Files:**
    - `index.html` - PWA meta tags, splash screen links
    - `vite.config.ts` - Enhanced manifest with shortcuts, screenshots
    - `scripts/generate-pwa-icons.cjs` - Icon generation script
  - **Run:** `npm run pwa:icons` to regenerate icons

- [x] **Touch-Friendly UI** ✅
  - `.touch-target` class (44px min touch targets)
  - Safe area utilities for notched devices
  - Touch-active states and animations
  - **File:** `src/index.css` - Touch-friendly CSS utilities

- [x] **Mobile-Specific Components** ✅
  - Mobile bottom navigation with 5-tab design
  - Full-screen navigation drawer with sections
  - Prominent offline indicator (banner + in-drawer)
  - Auto-reconnection messaging
  - **Files:**
    - `src/components/layout/MobileBottomNav.tsx`
    - `src/components/layout/MobileNavDrawer.tsx`
    - `src/components/mobile/MobileOfflineIndicator.tsx`
    - `src/components/layout/AppLayout.tsx` - Responsive layout

- [x] **Responsive Layout** ✅
  - Sidebar hidden on mobile (md:hidden)
  - Bottom navigation visible on mobile only
  - Content padding for bottom nav (pb-20)
  - Safe area support for notched devices

---

## Quick Wins ✅ ALL COMPLETE (Dec 9, 2025)

### Export & PDF Features
- [x] **RFI Excel Export** - Already implemented (`src/features/rfis/utils/rfiExport.ts`)
- [x] **Submittal Excel Export** - Already implemented (`src/features/submittals/utils/submittalExport.ts`)
- [x] **G702/G703 PDF Generation** - Already implemented (`src/features/payment-applications/utils/g702Template.ts`, `g703Template.ts`)
- [x] **Lien Waiver PDF** - Already implemented (`src/features/lien-waivers/utils/pdfExport.ts`)
- [x] **Change Order PDF** - Added download button to detail page

### Document Management
- [x] **Document Edit/Delete Dialogs** - Already implemented in DocumentLibraryPage

### Photo Management
- [x] **Photo Organizer Upload** - Implemented Supabase storage upload in PhotoOrganizerPage

---

## P2 - MEDIUM PRIORITY (Q1-Q2 2026)

### QuickBooks Integration ⏸️ DEFERRED
**Effort:** 2-3 weeks | **Status:** Deferred to future

- [ ] **OAuth2 Setup**
  - QuickBooks developer app
  - Token management
  - **File:** `src/lib/integrations/quickbooks/auth.ts`

- [ ] **Data Sync**
  - Vendors (subcontractors)
  - Invoices (payment applications)
  - Expense tracking

- [ ] **UI**
  - Settings page for connection
  - Sync status dashboard

> **Note:** Deferred to future release. Will implement when accounting integration becomes a priority.

### Custom Report Builder ✅ COMPLETE
**Effort:** 2-3 weeks | **Completed:** Dec 8, 2025

- [x] **Database Schema** ✅
  - Report templates table with field definitions
  - Filter, sort, grouping configuration
  - Scheduled delivery settings
  - **Migration:** `supabase/migrations/083_custom_report_builder.sql`

- [x] **React Query Hooks** ✅
  - Template management hooks
  - Field definition hooks
  - **File:** `src/features/reports/hooks/useReportBuilder.ts`

- [x] **UI Components** ✅
  - DataSourceSelector - Choose data source ✅
  - FieldPicker - Select fields ✅
  - FilterBuilder - Filter data with relative dates ✅ (Dec 8)
  - ReportTemplateCard - Template cards ✅
  - **Files:** `src/features/reports/components/`

- [x] **Report Builder Page** ✅
  - 4-step wizard interface (complete)
  - Data source, fields, filters, options
  - **File:** `src/pages/reports/ReportBuilderPage.tsx`

- [x] **Export Options** ✅ (Dec 8)
  - PDF, Excel, CSV generation with reportExportService.ts
  - **File:** `src/features/reports/services/reportExportService.ts`
  - **Hook:** `useExportReport` in `src/features/reports/hooks/useReportBuilder.ts`
  - [ ] Scheduled email delivery (future)

### Toolbox Talks Module ✅ COMPLETE
**Effort:** 1 week | **Completed:** Dec 7, 2025

- [x] **Database Schema** ✅
  - `toolbox_talks` table with full RLS policies
  - `toolbox_talk_attendees` with sign-in/sign-out tracking
  - `toolbox_talk_hazards` for hazard identification
  - `toolbox_talk_topics` library
  - **Migration:** `supabase/migrations/074_toolbox_talks.sql`

- [x] **TypeScript Types** ✅
  - ToolboxTalk, Attendee, Hazard, Topic interfaces
  - **File:** `src/types/toolbox-talks.ts`

- [x] **API Services** ✅
  - Complete CRUD operations for talks
  - Attendance management with digital signatures
  - Hazard tracking and mitigation
  - Topic library management
  - **File:** `src/lib/api/services/toolbox-talks.ts`

- [x] **React Query Hooks** ✅
  - useToolboxTalks, useToolboxTalk, useCreateToolboxTalk
  - useAttendance, useSignIn, useSignOut
  - useHazards, useTalkTopics
  - **File:** `src/features/toolbox-talks/hooks/useToolboxTalks.ts`

- [x] **UI Components** ✅
  - AttendanceTracker with digital sign-in
  - StatusBadge, ToolboxTalkCard
  - **Files:** `src/features/toolbox-talks/components/`

- [x] **Pages** ✅
  - ToolboxTalksPage - List view with filters
  - ToolboxTalkDetailPage - Full talk details
  - ToolboxTalkFormPage - Create/edit talks
  - **Files:** `src/pages/toolbox-talks/`

- [x] **Routes Added** ✅
  - `/toolbox-talks`
  - `/toolbox-talks/new`
  - `/toolbox-talks/:id`
  - `/toolbox-talks/:id/edit`

### OSHA 300 Log ✅ COMPLETE
**Effort:** 1-2 weeks | **Completed:** Dec 2025

- [x] **Database Schema** ✅
  - Extended `safety_incidents` with OSHA fields
  - Case number, employee info, injury classification
  - Days away/restricted/transferred tracking
  - Privacy case flag for name withholding
  - **Migration:** `supabase/migrations/080_osha_300_log.sql`

- [x] **UI Components** ✅
  - OSHA300Log - Full Form 300 table (530+ lines)
  - OSHA300LogPage - Complete page with filters (470+ lines)
  - **Files:** `src/features/safety/components/OSHA300Log.tsx`, `src/features/safety/pages/OSHA300LogPage.tsx`

- [x] **Reports** ✅
  - OSHA 300 form generation
  - OSHA 300A annual summary card
  - TRIR and DART rate calculations
  - Excel, CSV, and printable HTML export
  - **File:** `src/features/safety/utils/osha300Export.ts`

- [x] **Routes** ✅
  - `/safety/osha-300` - Full OSHA 300 log with filtering

### Advanced Permissions ✅ COMPLETE
**Effort:** 2-3 weeks | **Completed:** Dec 8, 2025

- [x] **Database Schema** ✅
  - `permissions` table with 50+ granular permissions
  - `custom_roles` table for company-defined roles
  - `role_permissions` mapping table
  - `user_permission_overrides` for individual grants/revokes
  - `feature_flags` and `company_feature_flags` tables
  - Helper functions: `user_has_permission`, `get_user_permissions`, `company_has_feature`
  - **Migration:** `supabase/migrations/090_advanced_permissions.sql`

- [x] **TypeScript Types** ✅
  - Permission, CustomRole, FeatureFlag interfaces
  - Permission code constants (PERMISSION_CODES)
  - Utility functions for permission checking
  - **File:** `src/types/permissions.ts`

- [x] **React Query Hooks** ✅
  - usePermissionDefinitions, useUserPermissions
  - useCustomRoles, useCreateCustomRole, useUpdateCustomRole
  - useFeatureFlagDefinitions, useCompanyFeatureFlags
  - useHasPermission, usePermissionCheck, useFeatureFlag
  - **File:** `src/features/permissions/hooks/usePermissions.ts`

- [x] **UI Components** ✅
  - PermissionMatrix - checkbox grid by category
  - CustomRoleCard - role display with actions
  - CustomRoleFormDialog - create/edit roles with permission selection
  - **Files:** `src/features/permissions/components/`

- [x] **Feature Flags** ✅
  - 10 predefined feature flags (BIM, AI, AR, IoT, etc.)
  - Owner-only toggle in settings
  - Per-company enable/disable with optional expiration

- [x] **Management Page** ✅
  - RolesPermissionsPage with 3 tabs (Custom Roles, Default Roles, Feature Flags)
  - Route: `/settings/roles`
  - **File:** `src/pages/settings/RolesPermissionsPage.tsx`

### Distribution Lists ✅ COMPLETE
**Effort:** 3-5 days | **Completed:** Dec 8, 2025

- [x] **Database Schema** ✅
  - `distribution_lists` table with RLS policies
  - `distribution_list_members` junction table
  - Helper functions for expanding recipients
  - **Migration:** `supabase/migrations/085_distribution_lists.sql`

- [x] **TypeScript Types** ✅
  - DistributionList, Member, Selection interfaces
  - Utility functions for recipients
  - **File:** `src/types/distribution-list.ts`

- [x] **React Query Hooks** ✅
  - useDistributionLists, useProjectDistributionLists
  - useCreateDistributionList, useUpdateDistributionList
  - useAddDistributionListMember, useRemoveDistributionListMember
  - **File:** `src/features/distribution-lists/hooks/useDistributionLists.ts`

- [x] **UI Components** ✅
  - DistributionListCard, DistributionListFormDialog
  - DistributionListPicker (reusable for RFIs/Submittals)
  - **Files:** `src/features/distribution-lists/components/`, `src/components/distribution/`

- [x] **Pages** ✅
  - DistributionListsPage - Full settings management
  - **File:** `src/pages/settings/DistributionListsPage.tsx`

- [x] **Integration** ✅
  - Route: `/settings/distribution-lists`
  - Settings navigation link added
  - DistributionListPicker integrated into CreateRFIDialog
  - DistributionListPicker integrated into CreateSubmittalDialog

### Meeting Minutes ✅ COMPLETE
**Effort:** 1 week | **Completed:** Dec 2025

- [x] **Database Schema** ✅
  - Meeting minutes tables with agenda items
  - Action items and assignments
  - Attendee tracking
  - **Migration:** `supabase/migrations/081_meeting_minutes.sql`

- [x] **TypeScript Types** ✅
  - MeetingMinutes interfaces (529+ lines)
  - **File:** `src/types/meeting-minutes.ts`

- [x] **React Query Hooks** ✅
  - useMeetings, useMeeting, useCreateMeeting
  - useUpdateMeeting, useDeleteMeeting
  - useAddActionItem, useUpdateActionItem
  - **File:** `src/features/meetings/hooks/useMeetings.ts` (367 lines)

- [x] **UI Components** ✅
  - MeetingList - Full register with filters (487 lines)
  - MeetingNotesEditor, ActionItemsList
  - **Files:** `src/features/meetings/components/`

- [x] **Pages** ✅
  - MeetingsPage - List with project selector (479 lines)
  - MeetingDetailPage - Full view with action items (533 lines)
  - MeetingFormPage - Create/edit meetings
  - **Files:** `src/pages/meetings/`

- [x] **Routes** ✅
  - `/meetings`, `/meetings/new`, `/meetings/:id`, `/meetings/:id/edit`

### Closeout Documents ✅ COMPLETE
**Effort:** 1 week | **Completed:** Dec 8, 2025

- [x] **Database Schema** ✅
  - Closeout document tracking tables
  - Document categories and checklists
  - Warranty tracking with expiration alerts
  - **Migration:** `supabase/migrations/082_closeout_documents.sql`

- [x] **TypeScript Types** ✅
  - Closeout document interfaces (601 lines)
  - **File:** `src/types/closeout.ts`

- [x] **React Query Hooks** ✅ (Dec 8)
  - useCloseoutDocuments, useCloseoutDocument
  - useWarranties, useWarranty
  - useCloseoutStatistics, useWarrantyStatistics
  - useCreateCloseoutDocument, useUpdateCloseoutDocument
  - useCreateWarranty, useUpdateWarranty
  - useCloseoutChecklist, useToggleChecklistItem
  - **File:** `src/features/closeout/hooks/useCloseout.ts`

- [x] **UI Components** ✅
  - CloseoutDocumentList - Full list with filters (489 lines)
  - WarrantyList - Warranty tracking with expiration alerts
  - **Files:** `src/features/closeout/components/`

- [x] **Pages** ✅
  - CloseoutPage - Document/warranty tabs, stats dashboard
  - **File:** `src/pages/closeout/CloseoutPage.tsx`

- [x] **Routes** ✅
  - `/closeout`, `/projects/:projectId/closeout`

- [x] **Form Dialogs** ✅ (Dec 8)
  - CloseoutDocumentFormDialog ✅
  - WarrantyFormDialog ✅
  - **Files:** `src/features/closeout/components/CloseoutDocumentFormDialog.tsx`, `WarrantyFormDialog.tsx`
  - [ ] Export/packaging for handover (future)

---

## P3 - LONG-TERM (2026+)

### BIM Model Viewer
- [ ] IFC file support
- [ ] 3D navigation
- [ ] Markup on 3D models

### IoT Sensor Integration
- [ ] Temperature/humidity sensors
- [ ] Equipment GPS tracking
- [ ] Real-time dashboards

### AR/VR Site Walkthroughs
- [ ] 360 photo integration
- [ ] VR headset support
- [ ] Markup in VR

### AI Agents ✅ COMPLETE (Dec 9, 2025)
**Effort:** 2-3 weeks | **Completed:** Dec 9, 2025

- [x] **Phase 1: Foundation** ✅
  - Database migration with 14 tables, 6 enums, RLS policies
  - Provider-agnostic AI service (OpenAI, Anthropic, local/Ollama)
  - Cost tracking and budget controls
  - AI Settings page with feature toggles
  - **Migration:** `supabase/migrations/094_ai_agents_foundation.sql`
  - **Files:** `src/types/ai.ts`, `src/lib/api/services/ai-provider.ts`, `src/pages/settings/AISettingsPage.tsx`

- [x] **Phase 2: RFI Auto-Routing** ✅
  - Intelligent role suggestions based on content analysis
  - CSI MasterFormat classification
  - Pattern learning from user feedback
  - Related RFIs/Submittals finder
  - **Files:** `src/lib/api/services/rfi-routing-ai.ts`, `src/features/rfis/hooks/useRFIRouting.ts`, `src/features/rfis/components/RFIRoutingSuggestions.tsx`
  - **Integration:** RFIRoutingSuggestions integrated into CreateDedicatedRFIDialog

- [x] **Phase 3: Smart Summaries** ✅
  - Daily report summaries (highlights, concerns, tomorrow focus)
  - Meeting action item extraction with assignees
  - Weekly status generation with metrics
  - Change order impact analysis
  - **Files:** `src/lib/api/services/smart-summaries.ts`, `src/features/summaries/hooks/useSmartSummaries.ts`, `src/features/summaries/components/`
  - **Integrations:**
    - DailyReportSummaryCard in DailyReportDetailPage
    - MeetingActionItemExtractor in MeetingDetailPage sidebar

- [x] **Phase 4: Risk Prediction** ✅
  - Multi-factor activity risk scoring (20+ factors)
  - Constraint, weather, trade performance, resource analysis
  - Risk alerts with severity levels
  - Critical path risk multiplier
  - **Files:** `src/lib/ml/scoring/activity-risk-scorer.ts`, `src/features/analytics/hooks/useRiskPrediction.ts`, `src/features/analytics/components/risk-prediction/`
  - **Integration:** AtRiskActivitiesPanel in LookAheadPage

- [x] **Phase 5: Schedule Optimization** ✅
  - Critical path calculation (forward/backward pass)
  - Float opportunity identification
  - Constraint prioritization by schedule impact
  - Resource conflict detection
  - Optimization recommendations
  - **Files:** `src/lib/ml/scoring/schedule-optimizer.ts`, `src/features/analytics/hooks/useScheduleOptimization.ts`, `src/features/analytics/components/schedule-optimization/`
  - **Integration:** ScheduleOptimizationPanel in LookAheadPage

- [x] **Phase 6: Document AI Enhancement** ✅
  - Hybrid classification (keyword + LLM fallback)
  - Entity linking (RFIs, Submittals, Change Orders)
  - Smart metadata extraction by document type
  - Document summary generation
  - **Files:** `src/lib/api/services/document-entity-linking.ts`, `src/features/documents/hooks/useDocumentAiEnhanced.ts`

- [x] **Routes Added** ✅
  - `/settings/ai` - AI configuration and usage dashboard

### Native Mobile Apps
- [ ] iOS app (React Native)
- [ ] Android app (React Native)
- [ ] Push notifications
- [ ] Background sync

---

## IMPLEMENTATION PLAN ITEMS (From IMPLEMENTATION_PLAN.md)

### Phase 0 Quick Wins (Completed Dec 7)

- [x] RFI Detail Page
- [x] Create RFI Dialog
- [x] Submittal Detail Page
- [ ] RFI Excel Export
- [ ] Submittal Excel Export

### Phase 1: Payment Applications (Completed Dec 7)

- [x] Database Migration 068
- [x] TypeScript types
- [x] React Query hooks
- [x] Payment Applications List Page
- [x] Payment Application Detail Page
- [ ] G702 Form PDF generation
- [ ] G703 Form PDF generation
- [ ] Waiver Checklist Integration

### Phase 2: Change Order UI Enhancements

- [x] Change Orders List Page
- [x] Change Order Detail Page
- [x] Items Editor
- [ ] Approval Workflow UI improvements
- [ ] PDF Generation for owner approval

### Phase 3: Lien Waivers (Completed Dec 7)

- [x] Database Migration 069
- [x] TypeScript types
- [x] React Query hooks
- [x] Lien Waivers List Page
- [x] State Templates (10 states)
- [x] Missing Waivers Alert ✅
  - **Files:** `src/features/lien-waivers/components/MissingWaiversAlert.tsx`, `src/features/lien-waivers/hooks/useMissingWaivers.ts`
- [ ] PDF Generation

### Phase 4: Insurance Tracking ✅ COMPLETE (Dec 7, 2025)

- [x] Database Migration 071 ✅
- [x] TypeScript types ✅
- [x] React Query hooks ✅
- [x] Insurance Compliance Dashboard ✅
- [x] Certificate Form ✅
- [x] Expiration Alerts ✅
- [x] Insurance Page with filters and search ✅
- **Files:**
  - `supabase/migrations/071_insurance_tracking.sql`
  - `src/types/insurance.ts`
  - `src/lib/api/services/insurance.ts`
  - `src/features/insurance/hooks/useInsurance.ts`
  - `src/features/insurance/components/`
  - `src/pages/insurance/InsurancePage.tsx`

---

## DEPLOYMENT CHECKLIST

### Pre-Launch

- [x] All P0 items complete ✅
- [ ] Database migrations applied to production
- [ ] Environment variables set (see `docs/runbooks/environment-variables.md`)
- [ ] DNS configured
- [ ] SSL certificates valid
- [ ] Backup procedures tested
- [ ] Rollback plan documented

### Launch Day

- [ ] Monitor error rates (Sentry configured)
- [ ] Check performance metrics (Lighthouse CI configured)
- [ ] Verify all features working
- [ ] Support team briefed
- [ ] Status page updated

### Post-Launch

- [ ] User feedback collection
- [ ] Performance optimization
- [ ] Bug fix prioritization
- [ ] Feature request tracking

---

## CODE-LEVEL TODOs (Fully Verified Dec 9, 2025)

### Stub Implementations Status Summary

**✅ COMPLETE (8 items):** All quick win stubs have been implemented
**⚠️ PARTIAL (1 item):** Takeoff calibration - has modal but needs line capture mode
**⏸️ DEFERRED (6 items):** Complex features requiring database changes or significant work

| Feature | File | Line | Status |
|---------|------|------|--------|
| Cost Estimate PDF Export | `src/features/cost-estimates/utils/pdfExport.ts` | - | ✅ COMPLETE |
| Document Edit Dialog | `src/pages/documents/DocumentLibraryPage.tsx` | 685-735 | ✅ COMPLETE |
| Document Delete Dialog | `src/pages/documents/DocumentLibraryPage.tsx` | 643-682 | ✅ COMPLETE |
| Drawing Markup Sharing | `src/features/documents/components/markup/UnifiedDrawingCanvas.tsx` | 960 | ⏸️ DEFERRED (canShare=false) |
| Manual Merge (Conflicts) | `src/components/ConflictResolutionDialog.tsx` | 163 | ⏸️ DEFERRED (disabled button) |
| Photo Organizer Upload | `src/features/photos/pages/PhotoOrganizerPage.tsx` | 345-420 | ✅ COMPLETE |
| Takeoff Calibration Mode | `src/pages/takeoffs/TakeoffPage.tsx` | 179 | ⚠️ PARTIAL (modal exists, line capture TODO) |
| Analytics Baseline | `src/lib/api/services/analytics.ts` | 702 | ⏸️ DEFERRED (needs baseline table) |
| MFA User Preferences | `src/lib/auth/mfa.ts` | 207-229 | ⏸️ DEFERRED (needs user_preferences table) |
| Email Notifications | `src/lib/notifications/notification-service.ts` | - | ✅ COMPLETE (978 lines) |
| Subcontractor GC Notify | `src/lib/notifications/notification-service.ts` | 565 | ✅ COMPLETE (notifyBidSubmitted) |
| Invitation Emails | `src/lib/notifications/notification-service.ts` | 621 | ✅ COMPLETE (notifyPortalInvitation) |
| Offline Sync Config | `src/lib/supabase.ts` | 33 | ⏸️ DEFERRED (P3 - requires IndexedDB) |
| PWA Service Worker | `src/lib/supabase.ts` | 34 | ⏸️ DEFERRED (P3 - requires SW setup) |
| useApiCall Toasts | `src/lib/hooks/useApiCall.ts` | - | ✅ COMPLETE (uses useToast) |

### Notes
- ✅ Toast system IS fully implemented (`src/lib/notifications/ToastContext.tsx`) AND integrated in useApiCall
- ✅ Safety Incidents module IS complete (`src/features/safety/`)
- ✅ Weather API IS complete (`src/features/daily-reports/services/weatherService.ts`)
- ✅ Email templates complete: 14 templates in `src/lib/email/templates/`
- ✅ Notification service complete: 978 lines with approval, incident, RFI, task, change order, bid, portal notifications

### Deferred Items - Implementation Requirements

| Feature | Requirements | Priority |
|---------|-------------|----------|
| Drawing Markup Sharing | Email/link sharing API, sharing permissions | P3 |
| Manual Merge (Conflicts) | Field-by-field merge UI, conflict resolution logic | P3 |
| Takeoff Calibration | Line capture mode in canvas, calibration point storage | P2 |
| Analytics Baseline | New DB table for baselines, snapshot capture/comparison | P3 |
| MFA User Preferences | `user_preferences` table migration, UI for settings | P3 |
| Offline Sync Config | IndexedDB setup, sync queue, conflict handling | P3 |
| PWA Service Worker | Service worker registration, cache strategies | P3 |

---

## TECHNICAL DEBT

### Code Quality
- [ ] Remove deprecated code patterns
- [ ] Standardize error handling
- [ ] Improve TypeScript strictness
- [ ] Add JSDoc comments to public APIs

### Testing
- [ ] Increase E2E test coverage
- [ ] Add visual regression tests
- [ ] Load testing scripts
- [ ] Accessibility testing

### Documentation
- [ ] API documentation
- [ ] User guides
- [ ] Admin guides
- [ ] Developer onboarding

---

## NOTES

### Key Dependencies
```
Look-Ahead Planning → Subcontractors, RFIs, Submittals, Meetings
QuickBooks → Payment Applications, Subcontractors
OSHA 300 → Safety Incidents
Insurance Tracking → Subcontractors
```

### Risk Mitigation
| Risk | Mitigation |
|------|------------|
| Weather API rate limits | Cache responses, use fallback |
| QuickBooks API changes | Abstract integration layer |
| Large file uploads | Chunked uploads, progress tracking |
| Mobile performance | Lazy loading, virtual lists |

---

## GITHUB SECRETS SETUP (Required for CI/CD)

Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

### Required Secrets

| Secret | Description | Where to get it |
|--------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard → Settings → API |
| `TEST_USER_EMAIL` | Test user email for E2E | Your test account |
| `TEST_USER_PASSWORD` | Test user password for E2E | Your test account |
| `VERCEL_TOKEN` | Vercel API token | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel organization ID | `.vercel/project.json` or Vercel CLI |
| `VERCEL_PROJECT_ID` | Vercel project ID | `.vercel/project.json` or Vercel CLI |

### How to Get Vercel IDs

```bash
# Install Vercel CLI
npm i -g vercel

# Link project (creates .vercel/project.json)
vercel link

# View IDs
cat .vercel/project.json
```

---

**Document Owner:** Development Team
**Last Review:** December 9, 2025 (Full stub verification - all items verified, 8 complete, 6 deferred)
**Next Review:** December 16, 2025
