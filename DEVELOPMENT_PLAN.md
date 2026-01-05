# JobSight Development Plan
## Construction Management Platform - Continuation Strategy

**Date:** December 26, 2025
**Current Status:** Phase 1 at 96% completion
**TypeScript Status:** Compiling without errors

---

## Executive Summary

This document outlines the comprehensive development plan to complete the remaining Phase 1 features and prepare for production deployment. The codebase is in excellent shape with strong architecture, comprehensive test coverage infrastructure, and well-organized feature modules.

---

## 1. Current State Analysis

### Completed Features (96%)
- User Authentication with MFA and role-based access
- Multi-tenant architecture with company management
- Project Management with comprehensive detail pages
- Daily Reports with field documentation
- Document Management with version control and PDF viewing
- Task Management with assignment and status tracking
- RFI, Change Order, and Submittal workflows
- Punch Lists with deficiency tracking
- Safety Management with OSHA compliance
- Payment Applications (AIA G702/G703)
- Lien Waivers with state templates
- Cost Tracking with cost codes and budgets
- Equipment and Material Tracking
- Meetings with minutes and action items
- Drawing Markup with 7+ annotation tools
- Takeoff measurements (9 types)
- Subcontractor Portal with compliance tracking
- Insurance Certificate Tracking (newly enhanced)

### In-Progress Work (Modified Files)
1. **Insurance Compliance Enhancement** - Migration 150
2. **MFA Backup Codes** - Migration 148
3. **Markup Sharing RLS** - Migration 149
4. **Offline Data Prefetching** - `useDataPrefetch.ts`
5. **PWA Update Notifications** - `PWAUpdateNotification.tsx`
6. **Enhanced Sync Management** - `sync-manager.ts`
7. **Takeoff Calibration** - Line capture mode

---

## 2. Immediate Priorities (Next 1-2 Sprints)

### 2.1 Apply Pending Migrations

**Status:** 4 migrations pending application

| Migration | Description | Priority |
|-----------|-------------|----------|
| 147 | Enable RLS and fix missing policies | CRITICAL |
| 148 | MFA backup codes schema | HIGH |
| 149 | Markup sharing RLS | HIGH |
| 150 | Insurance compliance enhancement | HIGH |

**Action Items:**
```bash
# Apply migrations to Supabase project
npx supabase db push
# Or apply individually via MCP
```

### 2.2 Complete Insurance Compliance Feature

**Current State:** 85% complete

**Completed:**
- [x] Database schema (migration 150)
- [x] TypeScript types (`src/types/insurance.ts`)
- [x] API services (`src/lib/api/services/insurance.ts`)
- [x] Certificate List component with sorting/filtering
- [x] Compliance Matrix with payment hold controls
- [x] Insurance hooks (`useInsurance.ts`)

**Remaining Work:**
- [ ] AI certificate extraction UI (OCR integration)
- [ ] Expiration alert notification system
- [ ] Insurance requirement templates per project type
- [ ] Certificate upload flow with auto-extraction
- [ ] Email notifications for expiring certificates
- [ ] Integration with payment application workflow

### 2.3 Complete Offline Sync & Data Prefetching

**Current State:** 80% complete

**Completed:**
- [x] Data prefetcher core (`src/lib/offline/data-prefetcher.ts`)
- [x] Sync manager with priority queue
- [x] Bandwidth detection
- [x] `useDataPrefetch` hook

**Remaining Work:**
- [ ] Offline sync settings UI (`src/components/settings/OfflineSyncSettings.tsx`)
- [ ] Sync conflict resolution UI
- [ ] Selective sync per project
- [ ] Storage quota management
- [ ] Background sync registration with service worker
- [ ] Sync telemetry dashboard

### 2.4 Complete PWA Functionality

**Current State:** 75% complete

**Completed:**
- [x] PWAUpdateNotification component
- [x] Service worker registration
- [x] Basic push notification support

**Remaining Work:**
- [ ] Push notification opt-in flow
- [ ] Notification preferences UI
- [ ] App badge updates
- [ ] Install prompt handling
- [ ] Offline page fallback
- [ ] Web share target

---

## 3. Feature Completion Details

### 3.1 RFI/Submittal Workflow Enhancements

**Files Modified:**
- `src/features/rfis/hooks/useDedicatedRFIs.ts`
- `src/features/rfis/components/RFIResponseForm.tsx`
- `src/features/rfis/components/RFIAttachmentUploader.tsx`
- `src/features/submittals/hooks/useDedicatedSubmittals.ts`
- `src/features/submittals/components/CreateRevisionDialog.tsx`
- `src/features/submittals/components/SubmittalReviewForm.tsx`

**Enhancements Needed:**
- [ ] Ball-in-court notifications
- [ ] RFI cost/schedule impact tracking
- [ ] Submittal spec section organization
- [ ] Revision comparison view
- [ ] Email distribution workflows
- [ ] Integration with daily reports

### 3.2 Drawing & Markup Features

**Files Modified:**
- `src/features/documents/components/markup/UnifiedDrawingCanvas.tsx`
- `src/features/documents/hooks/useEnhancedMarkupState.ts`
- `src/lib/api/services/markups.ts`

**Enhancements Needed:**
- [ ] Live cursor sharing (real-time collaboration)
- [ ] Layer visibility controls
- [ ] Markup permission management UI
- [ ] Export markups to PDF
- [ ] Markup templates
- [ ] Measurement annotations

### 3.3 Takeoff Calibration

**Files Modified:**
- `src/features/takeoffs/components/CalibrationDialog.tsx`
- `src/features/takeoffs/components/TakeoffToolbar.tsx`
- `src/features/takeoffs/utils/measurements.ts`

**Enhancements Needed:**
- [ ] Calibration line capture mode (in progress)
- [ ] Scale persistence per sheet
- [ ] Unit conversion (metric/imperial)
- [ ] Calibration history
- [ ] Auto-detect scale from drawing

---

## 4. Technical Debt & Improvements

### 4.1 Security

**High Priority:**
- [x] Enable RLS on all tables (migration 147)
- [x] MFA backup codes (migration 148)
- [ ] Session management improvements
- [ ] Rate limiting on auth endpoints
- [ ] Audit logging for sensitive operations

### 4.2 Performance

**Optimizations Needed:**
- [ ] Query optimization for large projects
- [ ] Image lazy loading improvements
- [ ] Virtual scrolling for long lists
- [ ] Service worker caching strategy refinement
- [ ] Bundle size analysis and reduction

### 4.3 Testing

**Test Coverage Goals:**
- [ ] Unit tests for new hooks (>80%)
- [ ] Integration tests for workflows
- [ ] E2E tests for critical paths
- [ ] Visual regression testing setup
- [ ] Mobile responsiveness tests

---

## 5. Development Sequence

### Sprint 1: Foundation & Security
1. Apply all pending migrations (147-150)
2. Complete offline sync settings UI
3. Finish PWA update notification flow
4. Add MFA backup code UI
5. Run security audit

### Sprint 2: Insurance & Compliance
1. Complete AI certificate extraction UI
2. Implement expiration alert system
3. Add email notification triggers
4. Integration with payment workflow
5. Testing and QA

### Sprint 3: Workflows & Collaboration
1. RFI ball-in-court notifications
2. Submittal revision comparison
3. Live markup collaboration
4. Export functionality enhancements
5. Mobile UX improvements

### Sprint 4: Polish & Production
1. Performance optimization
2. Error handling improvements
3. Accessibility audit
4. Documentation updates
5. Production deployment preparation

---

## 6. File Structure Reference

```
src/
├── components/
│   ├── PWAUpdateNotification.tsx    # NEW - PWA updates
│   ├── shared/
│   │   ├── WorkflowProgressIndicator.tsx  # NEW
│   │   └── index.ts
│   └── settings/
│       └── OfflineSyncSettings.tsx  # NEW - Offline config
├── features/
│   ├── insurance/
│   │   ├── components/
│   │   │   ├── CertificateList.tsx  # NEW
│   │   │   └── ComplianceMatrix.tsx # NEW
│   │   └── hooks/
│   │       └── useInsurance.ts      # ENHANCED
│   ├── rfis/
│   │   ├── components/
│   │   │   ├── RFIAttachmentUploader.tsx  # NEW
│   │   │   └── RFIResponseForm.tsx  # NEW
│   │   └── hooks/
│   │       └── useDedicatedRFIs.ts  # ENHANCED
│   ├── submittals/
│   │   ├── components/
│   │   │   ├── CreateRevisionDialog.tsx  # NEW
│   │   │   ├── SubmittalItemsEditor.tsx  # NEW
│   │   │   └── SubmittalReviewForm.tsx   # NEW
│   │   └── hooks/
│   │       └── useDedicatedSubmittals.ts # ENHANCED
│   └── takeoffs/
│       └── components/
│           ├── CalibrationDialog.tsx     # ENHANCED
│           └── TakeoffToolbar.tsx        # ENHANCED
├── hooks/
│   ├── useDataPrefetch.ts   # NEW
│   └── usePhotoQueue.ts     # NEW
├── lib/
│   ├── offline/
│   │   ├── data-prefetcher.ts  # NEW
│   │   └── sync-manager.ts     # ENHANCED
│   └── auth/
│       └── mfa.ts              # ENHANCED
└── types/
    ├── insurance.ts            # ENHANCED
    └── subcontractor-portal.ts # ENHANCED
```

---

## 7. Environment & Configuration

### Required Environment Variables
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_SENTRY_DSN=xxx
VITE_VAPID_PUBLIC_KEY=xxx
```

### Build Commands
```bash
# Development
npm run dev

# Type checking
npm run typecheck

# Testing
npm run test
npm run test:e2e

# Production build
npm run build
```

---

## 8. Next Steps (Immediate Actions)

1. **Apply Migrations** - Push pending schema changes to Supabase
2. **Complete Offline Settings UI** - Wire up the sync configuration interface
3. **Test Insurance Workflow** - End-to-end testing of certificate management
4. **PWA Install Flow** - Implement app installation prompts
5. **Run Type Check & Tests** - Ensure all changes compile and pass tests

---

## 9. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration conflicts | HIGH | Test on branch database first |
| Offline sync data loss | HIGH | Implement conflict resolution UI |
| Performance regression | MEDIUM | Monitor Web Vitals, bundle size |
| RLS policy gaps | HIGH | Security audit post-migration |

---

*Plan last updated: December 26, 2025*

---

## 10. Comprehensive Continuation Plan

### Current Session Status
**Date:** December 26, 2025
**Migrations Applied:** 147, 148, 149, 150, 151 (all confirmed in Supabase)
**Migration Pending:** None - All migrations applied

### Session Progress (December 26, 2025)
- [x] Applied migration 151 (payment_hold_overrides)
- [x] Applied migration 152 (fix_security_advisor_warnings) - Revoked anon access from auth views
- [x] TypeScript compiling without errors
- [x] Verified OfflineSyncSettings UI is complete
- [x] MFABackupCodes component integrated into SettingsPage
- [x] CertificateExtractor AI/OCR component verified
- [x] PWA Install/Update flow verified (PWAInstallBanner, PWAUpdateNotification)
- [x] Security advisor warnings addressed (auth_users now only accessible to authenticated)
- [x] Created SessionManagement component for active sessions UI
- [x] Verified Insurance Expiration Alert System is complete (Edge function + UI + notifications)
- [x] Security definer views addressed in migration 152

### Migrations Applied This Session
| Migration | Name | Description |
|-----------|------|-------------|
| 151 | payment_hold_overrides | Payment hold audit table with RLS |
| 152 | fix_security_advisor_warnings | Revoked anon access, fixed security definer views |

### Phase 1 Completion Checklist

#### 10.1 Database & Security (Sprint 1)

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Apply migration 151 | ✅ DONE | CRITICAL | Payment hold overrides table |
| Run security advisors check | ✅ DONE | HIGH | Security definer views flagged |
| Verify RLS policies working | PENDING | HIGH | Test with different user roles |

#### 10.2 Offline & PWA Features (Sprint 1-2)

| Task | Status | Priority | Files |
|------|--------|----------|-------|
| Create OfflineSyncSettings.tsx | ✅ DONE | HIGH | Complete with all features |
| Implement sync conflict UI | ✅ DONE | HIGH | `ConflictResolutionDialog.tsx` |
| Storage quota management | ✅ DONE | MEDIUM | Integrated in OfflineSyncSettings |
| PWA install prompt handling | PENDING | HIGH | `PWAUpdateNotification.tsx` |
| Push notification opt-in | PENDING | MEDIUM | Service worker registration |
| App badge updates | PENDING | LOW | Native app integration |

#### 10.3 Insurance Compliance (Sprint 2)

| Task | Status | Priority | Files |
|------|--------|----------|-------|
| AI certificate extraction UI | ✅ DONE | HIGH | `CertificateExtractor.tsx` |
| Expiration alert system | ✅ DONE | HIGH | Edge function + UI + notifications |
| Email notification triggers | ✅ DONE | MEDIUM | `compliance-notifications.ts` |
| Payment workflow integration | PENDING | HIGH | Connect to pay apps |
| Certificate upload with OCR | ✅ DONE | HIGH | Tesseract integration ready |

#### 10.4 MFA & Authentication (Sprint 1)

| Task | Status | Priority | Files |
|------|--------|----------|-------|
| MFA backup code generation UI | ✅ DONE | HIGH | `MFABackupCodes.tsx` |
| Backup code display/copy | ✅ DONE | HIGH | Integrated in component |
| Backup code regeneration | ✅ DONE | MEDIUM | With confirmation dialog |
| Session management UI | ✅ DONE | MEDIUM | `SessionManagement.tsx` |

#### 10.5 Workflow Enhancements (Sprint 3)

| Task | Status | Priority | Files |
|------|--------|----------|-------|
| RFI ball-in-court notifications | PENDING | HIGH | `useDedicatedRFIs.ts` |
| Submittal revision comparison | PENDING | HIGH | New comparison view |
| Cost/schedule impact tracking | PENDING | MEDIUM | RFI detail page |
| Email distribution workflows | PENDING | MEDIUM | Edge functions |
| Daily report integration | PENDING | MEDIUM | Cross-feature link |

#### 10.6 Drawing & Markup (Sprint 3)

| Task | Status | Priority | Files |
|------|--------|----------|-------|
| Live cursor sharing | PENDING | LOW | Real-time collab |
| Layer visibility controls | PENDING | MEDIUM | Canvas toolbar |
| Export markups to PDF | PENDING | HIGH | jsPDF integration |
| Markup templates | PENDING | LOW | Template system |

#### 10.7 Takeoff Calibration (Sprint 2)

| Task | Status | Priority | Files |
|------|--------|----------|-------|
| Line capture mode | DONE | - | Recent commit |
| Scale persistence per sheet | PENDING | HIGH | localStorage/DB |
| Unit conversion (metric/imperial) | PENDING | HIGH | Settings + utils |
| Calibration history | PENDING | MEDIUM | DB storage |
| Auto-detect scale | PENDING | LOW | OCR detection |

### 10.8 Immediate Development Sequence

```
Week 1 (Current):
├── Day 1: Apply migration 151, run security audit
├── Day 2: Create OfflineSyncSettings UI component
├── Day 3: Complete PWA install/update flow
├── Day 4: MFA backup code UI implementation
└── Day 5: Insurance AI extraction UI foundation

Week 2:
├── Day 1: Insurance certificate upload with OCR
├── Day 2: Expiration alert system
├── Day 3: Payment hold integration testing
├── Day 4: RFI notifications setup
└── Day 5: Submittal revision comparison

Week 3:
├── Day 1: Live markup collaboration (if time)
├── Day 2: Export enhancements (PDF markups)
├── Day 3: Takeoff scale persistence
├── Day 4: Unit conversion implementation
└── Day 5: Testing & QA

Week 4:
├── Day 1-2: Performance optimization
├── Day 3: Accessibility audit
├── Day 4: Final bug fixes
└── Day 5: Production deployment prep
```

### 10.9 Component Implementation Details

#### OfflineSyncSettings.tsx
```typescript
// Location: src/components/settings/OfflineSyncSettings.tsx
// Features needed:
// - Toggle offline mode on/off
// - Select projects for offline sync
// - Show sync status per project
// - Storage quota display with progress bar
// - Manual sync trigger button
// - Clear offline data option
// - Last sync timestamp display
```

#### MFA Backup Codes UI
```typescript
// Location: src/components/settings/MFABackupCodes.tsx
// Features needed:
// - Generate new backup codes button
// - Display codes in grid format
// - Copy all codes to clipboard
// - Download codes as text file
// - Show remaining unused codes count
// - Regenerate warning dialog
```

#### Insurance AI Extraction
```typescript
// Location: src/features/insurance/components/CertificateExtractor.tsx
// Features needed:
// - File upload dropzone
// - OCR processing status
// - Extracted data preview
// - Field mapping/correction UI
// - Confidence scores display
// - Manual override options
// - Save and create certificate button
```

### 10.10 Testing Requirements

| Area | Test Type | Coverage Goal |
|------|-----------|---------------|
| Insurance hooks | Unit | 90% |
| Offline sync | Integration | 80% |
| MFA flows | E2E | Critical paths |
| PWA features | E2E | Install/update |
| RFI workflow | E2E | Ball-in-court |
| Payment holds | Integration | Override flow |

### 10.11 Files to Create

```
src/
├── components/
│   └── settings/
│       ├── OfflineSyncSettings.tsx      # NEW
│       ├── MFABackupCodes.tsx           # NEW
│       └── NotificationPreferences.tsx  # NEW
├── features/
│   └── insurance/
│       └── components/
│           └── CertificateExtractor.tsx # NEW
└── pages/
    └── settings/
        └── SecuritySettingsPage.tsx     # ENHANCE (add MFA section)
```

### 10.12 Edge Functions to Deploy

| Function | Status | Purpose |
|----------|--------|---------|
| insurance-compliance-check | CREATED | Check compliance status |
| process-insurance-certificate | CREATED | OCR extraction |
| send-expiration-alerts | PENDING | Email notifications |
| rfi-ball-in-court-notify | PENDING | RFI notifications |

### 10.13 Risk Mitigation

1. **Migration 151 dependency**: Test in development branch first
2. **OCR accuracy**: Implement manual correction UI
3. **Offline conflicts**: Prioritize conflict resolution UI
4. **Push notifications**: Fallback to in-app notifications
5. **Performance**: Monitor bundle size after changes

---

## 11. Quick Reference Commands

```bash
# Apply pending migration
npx supabase db push

# Run type check
npm run type-check

# Run all tests
npm run test:all

# Run specific E2E tests
npm run test:e2e:chromium

# Check bundle size
npm run analyze

# Generate TypeScript types from Supabase
npx supabase gen types typescript --project-id nxlznnrocrffnbzjaaae > src/types/supabase.ts
```
