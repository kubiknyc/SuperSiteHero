# E2E Testing Comprehensive Execution Plan

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Pre-Execution Preparation](#pre-execution-preparation)
3. [Phase-by-Phase Execution Guide](#phase-by-phase-execution-guide)
4. [CI/CD Integration](#cicd-integration)
5. [Local Execution Workflows](#local-execution-workflows)
6. [Test Data Management](#test-data-management)
7. [Monitoring & Reporting](#monitoring--reporting)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Success Criteria & Quality Gates](#success-criteria--quality-gates)

---

## Executive Summary

This document provides a comprehensive, step-by-step plan for executing all E2E testing phases for the JobSight construction management platform. The plan covers:

- **42+ test files** across 9 testing phases
- **Multiple browser configurations** (Chromium, Firefox, WebKit, Mobile)
- **Automated CI/CD workflows** for continuous testing
- **Local development workflows** for rapid iteration
- **Test data seeding strategies** for consistent environments
- **Quality gates** to ensure production readiness

**Current Status:**
- ✅ Phase 0: Foundation complete
- 🟡 Phases 1-9: Ready for systematic execution
- ✅ CI/CD infrastructure in place
- ⬜ Need to complete test implementation

---

## Pre-Execution Preparation

### 1. Environment Setup (Required Before Any Testing)

#### A. Install Dependencies
```bash
# Navigate to project root
cd c:\Users\kubik\iCloudDrive\JobSiight\SuperSiteHero

# Install all dependencies
npm install

# Install Playwright browsers
npx playwright install

# Install with dependencies (system libraries)
npx playwright install --with-deps
```

#### B. Configure Test Environment
```bash
# 1. Copy test environment template
cp .env.test.example .env.test

# 2. Configure Supabase credentials in .env.test
# Required variables:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - TEST_USER_EMAIL
# - TEST_USER_PASSWORD
# - TEST_ADMIN_EMAIL (optional)
# - TEST_ADMIN_PASSWORD (optional)

# 3. Verify environment configuration
node -e "require('dotenv').config({path: '.env.test'}); console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET'); console.log('TEST_USER_EMAIL:', process.env.TEST_USER_EMAIL ? 'SET' : 'NOT SET');"
```

#### C. Create Test Users in Supabase
```bash
# Option 1: Use existing script
npm run seed:test-users

# Option 2: Create manually via Supabase dashboard
# - Navigate to Authentication > Users
# - Create test user with email/password matching .env.test
# - Optionally create admin user
```

#### D. Seed Test Data
```bash
# Seed minimal test data
npm run seed:test

# Seed all test data (recommended for comprehensive testing)
npm run seed:all

# Check test user exists
npm run check:test-user
```

#### E. Verify Setup
```bash
# Run a simple smoke test
npx playwright test e2e/hello-world.spec.ts --headed

# Check authentication setup
npx playwright test e2e/auth.spec.ts --headed

# Verify environment
npm run test:e2e:setup
```

### 2. Pre-Flight Checklist

Before executing any test phase, verify:

- ✅ Node.js v18+ installed
- ✅ All npm dependencies installed
- ✅ Playwright browsers installed
- ✅ `.env.test` configured with valid credentials
- ✅ Test users exist in Supabase
- ✅ Test data seeded (if required for phase)
- ✅ Dev server can start (`npm run dev:test`)
- ✅ No failing unit tests (`npm run test:unit`)
- ✅ TypeScript compiles (`npm run type-check`)
- ✅ No critical linting errors (`npm run lint`)

---

## Phase-by-Phase Execution Guide

### Phase 0: Foundation (COMPLETED ✅)

**Status:** Infrastructure ready, authentication configured

**Verification:**
```bash
# Verify global setup works
npx playwright test e2e/example.spec.ts

# Check authentication fixture
npx playwright test e2e/auth.spec.ts
```

**If Issues:**
- Review `e2e/global-setup.ts`
- Check `.env.test` configuration
- Verify Supabase credentials
- Re-run `npm run playwright:install`

---

### Phase 1: Critical Path Testing

**Objective:** Validate core user journeys that represent critical business value

**Priority:** CRITICAL - Must pass before any deployment

**Estimated Time:** 2-3 hours (implementation + execution)

#### Step 1.1: Authentication Tests
**Files:** `e2e/auth.spec.ts`, `e2e/auth-biometric.spec.ts`

```bash
# Local execution with UI (recommended for development)
npm run test:e2e:ui e2e/auth.spec.ts

# Headless execution (CI-like)
npx playwright test e2e/auth.spec.ts --project=chromium

# Debug specific test
npx playwright test e2e/auth.spec.ts --debug

# Run with multiple browsers
npx playwright test e2e/auth.spec.ts --project=chromium --project=firefox --project=webkit
```

**Test Cases to Implement/Verify:**
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Logout functionality
- ✅ Session persistence
- ✅ Protected route access
- ⬜ Password reset flow
- ⬜ Biometric authentication (device-specific)
- ⬜ Token refresh handling
- ⬜ Session timeout

**Success Criteria:**
- All auth tests pass on Chromium
- 0 flaky tests
- Authentication flow completes in < 5 seconds
- No console errors during auth

#### Step 1.2: Project Management Core
**Files:** `e2e/projects.spec.ts`

```bash
# Local execution
npm run test:e2e:ui e2e/projects.spec.ts

# Quick verification
npx playwright test e2e/projects.spec.ts --project=chromium

# With trace for debugging
npx playwright test e2e/projects.spec.ts --trace on
```

**Test Cases to Implement/Verify:**
- ✅ View projects list
- ⬜ Create new project (with all required fields)
- ⬜ Edit project details
- ⬜ Archive project
- ⬜ Delete project
- ⬜ Navigate to project dashboard
- ⬜ Project search
- ⬜ Project filtering by status
- ⬜ Project sorting

**Success Criteria:**
- CRUD operations work reliably
- Data persists across page refreshes
- UI reflects backend state accurately
- No data loss scenarios

#### Step 1.3: Daily Reports
**Files:** `e2e/daily-reports.spec.ts`, `e2e/daily-reports-v2.spec.ts`

```bash
# Run both versions
npx playwright test e2e/daily-reports*.spec.ts --project=chromium

# Test with UI for validation
npm run test:e2e:ui e2e/daily-reports.spec.ts
```

**Test Cases to Implement/Verify:**
- ⬜ Create daily report
- ⬜ Add weather conditions (dropdown, manual entry)
- ⬜ Add crew information (multiple crew members)
- ⬜ Add work performed (rich text, bullet points)
- ⬜ Upload and attach photos (single, multiple)
- ⬜ Submit daily report
- ⬜ View submitted reports (list, detail)
- ⬜ Edit draft reports
- ⬜ Export to PDF
- ⬜ Email report to stakeholders

**Success Criteria:**
- Field teams can create reports in < 5 minutes
- Photos upload without errors
- PDF export includes all data and images
- Reports are immediately visible to all stakeholders

#### Step 1.4: Document Management
**Files:** `e2e/documents.spec.ts`

```bash
# Local execution
npx playwright test e2e/documents.spec.ts --project=chromium --headed

# Test file uploads specifically
npx playwright test e2e/documents.spec.ts --grep "upload" --debug
```

**Test Cases to Implement/Verify:**
- ⬜ Upload document (PDF, Word, Excel, Image)
- ⬜ Upload multiple documents (batch)
- ⬜ View document list (grid, table views)
- ⬜ Download document
- ⬜ Search documents by name
- ⬜ Filter documents by type, date, project
- ⬜ Create folder structure
- ⬜ Move document to folder
- ⬜ Delete document
- ⬜ Restore deleted document
- ⬜ Document versioning (upload new version)
- ⬜ Share document with team member
- ⬜ Set document permissions

**Success Criteria:**
- Documents upload successfully (< 30 seconds for 10MB)
- Search returns accurate results in < 1 second
- No file corruption during upload/download
- Permissions prevent unauthorized access

**Phase 1 Completion Command:**
```bash
# Run all Phase 1 tests together
npx playwright test \
  e2e/auth*.spec.ts \
  e2e/projects.spec.ts \
  e2e/daily-reports*.spec.ts \
  e2e/documents.spec.ts \
  --project=chromium \
  --reporter=html

# View report
npm run test:e2e:report
```

---

### Phase 2: Feature Completeness Testing

**Objective:** Ensure all major features work end-to-end

**Priority:** HIGH - Required before release

**Estimated Time:** 5-7 hours (implementation + execution)

#### Step 2.1: RFIs (Requests for Information)
**Files:** `e2e/rfis.spec.ts`

```bash
# Local development
npm run test:e2e:ui e2e/rfis.spec.ts

# CI-style execution
npx playwright test e2e/rfis.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Create new RFI
- ⬜ Add RFI details (subject, description, priority)
- ⬜ Assign RFI to team member
- ⬜ Add attachments (drawings, photos, documents)
- ⬜ Set due date
- ⬜ Submit RFI
- ⬜ Respond to RFI (text, attachments)
- ⬜ Track RFI status (open, pending, closed)
- ⬜ Close RFI with resolution
- ⬜ Filter RFIs by status, assignee, priority
- ⬜ Search RFIs
- ⬜ Export RFI report
- ⬜ RFI notifications (email, in-app)

#### Step 2.2: Submittals
**Files:** `e2e/submittals.spec.ts`

```bash
npx playwright test e2e/submittals.spec.ts --project=chromium --headed
```

**Test Cases:**
- ⬜ Create submittal
- ⬜ Upload submittal documents
- ⬜ Set submittal spec section
- ⬜ Assign reviewer
- ⬜ Submit for review
- ⬜ Review submittal (approve, approve as noted, revise and resubmit, reject)
- ⬜ Add review comments
- ⬜ Resubmit after rejection
- ⬜ Track submittal status
- ⬜ View submittal log
- ⬜ Generate submittal register

#### Step 2.3: Change Orders
**Files:** `e2e/change-orders.spec.ts`

```bash
npx playwright test e2e/change-orders.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Create change order
- ⬜ Add description and justification
- ⬜ Calculate cost impact (material, labor, equipment)
- ⬜ Calculate schedule impact (days)
- ⬜ Add supporting documentation
- ⬜ Submit for approval
- ⬜ Approval workflow (multi-level)
- ⬜ Approve/reject change order
- ⬜ Track change order status
- ⬜ View change order history
- ⬜ Update project budget after approval
- ⬜ Update project schedule after approval

#### Step 2.4: Schedule Management
**Files:** `e2e/schedule.spec.ts`

```bash
npx playwright test e2e/schedule.spec.ts --headed
```

**Test Cases:**
- ⬜ View project schedule (Gantt chart)
- ⬜ Create new task
- ⬜ Set task duration
- ⬜ Set task dependencies
- ⬜ Assign task to crew/subcontractor
- ⬜ Update task status (not started, in progress, complete)
- ⬜ Mark task complete
- ⬜ View critical path
- ⬜ Identify schedule delays
- ⬜ Update task dates (drag and drop)
- ⬜ Add milestones
- ⬜ Filter schedule by phase/trade

#### Step 2.5: Tasks & Action Items
**Files:** `e2e/tasks.spec.ts`, `e2e/action-items.spec.ts`

```bash
npx playwright test e2e/tasks.spec.ts e2e/action-items.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Create task
- ⬜ Set task priority (low, medium, high, urgent)
- ⬜ Assign task to user
- ⬜ Set due date
- ⬜ Add task description and notes
- ⬜ Add task checklist items
- ⬜ Complete task
- ⬜ Task notifications (assigned, due soon, overdue)
- ⬜ View my tasks
- ⬜ View team tasks
- ⬜ Filter tasks (status, assignee, priority, due date)
- ⬜ Sort tasks
- ⬜ Overdue task alerts
- ⬜ Create action item from meeting
- ⬜ Link action item to related entity (RFI, submittal, etc.)

#### Step 2.6: Safety Incidents
**Files:** `e2e/safety-incidents.spec.ts`

```bash
npx playwright test e2e/safety-incidents.spec.ts --project=chromium --headed
```

**Test Cases:**
- ⬜ Report safety incident
- ⬜ Classify incident type (injury, near miss, property damage, environmental)
- ⬜ Set incident severity (minor, moderate, serious, critical)
- ⬜ Add incident description
- ⬜ Add incident location
- ⬜ Add photos of incident
- ⬜ Identify involved parties
- ⬜ Add witness statements
- ⬜ Assign corrective actions
- ⬜ Track corrective action completion
- ⬜ Close incident
- ⬜ Generate safety reports
- ⬜ View safety metrics dashboard
- ⬜ OSHA 300 log generation

#### Step 2.7: Inspections
**Files:** `e2e/inspections.spec.ts`

```bash
npx playwright test e2e/inspections.spec.ts --headed
```

**Test Cases:**
- ⬜ Create inspection from template
- ⬜ Create custom inspection
- ⬜ Complete inspection checklist
- ⬜ Mark items pass/fail/NA
- ⬜ Add inspection photos
- ⬜ Add inspection notes
- ⬜ Require corrective action for failures
- ⬜ Sign inspection (digital signature)
- ⬜ Submit inspection
- ⬜ View inspection history
- ⬜ Generate inspection report
- ⬜ Track re-inspection items

#### Step 2.8: Punch Lists
**Files:** `e2e/punch-lists.spec.ts`

```bash
npx playwright test e2e/punch-lists.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Create punch list item
- ⬜ Add item description
- ⬜ Set location/room
- ⬜ Assign to subcontractor/trade
- ⬜ Set priority
- ⬜ Add photos showing deficiency
- ⬜ Set due date
- ⬜ Update punch item status (open, in progress, ready for review, complete)
- ⬜ Mark punch item complete with verification photo
- ⬜ Reject punch item completion
- ⬜ Filter punch items (status, trade, location)
- ⬜ Export punch list to Excel
- ⬜ Print punch list

#### Step 2.9: Quality Control
**Files:** `e2e/quality-control.spec.ts`

```bash
npx playwright test e2e/quality-control.spec.ts --headed
```

**Test Cases:**
- ⬜ Create QC inspection
- ⬜ Record measurements
- ⬜ Define pass/fail criteria
- ⬜ Add test results
- ⬜ Add QC documentation (certifications, test reports)
- ⬜ Approve/reject based on criteria
- ⬜ Require corrective action
- ⬜ Re-test failed items
- ⬜ Generate QC reports
- ⬜ Track QC metrics

**Phase 2 Completion Command:**
```bash
# Run all Phase 2 tests
npx playwright test \
  e2e/rfis.spec.ts \
  e2e/submittals.spec.ts \
  e2e/change-orders.spec.ts \
  e2e/schedule.spec.ts \
  e2e/tasks.spec.ts \
  e2e/action-items.spec.ts \
  e2e/safety-incidents.spec.ts \
  e2e/inspections.spec.ts \
  e2e/punch-lists.spec.ts \
  e2e/quality-control.spec.ts \
  --project=chromium \
  --reporter=html,json

# View results
npm run test:e2e:report
```

---

### Phase 3: Advanced Features Testing

**Objective:** Validate specialized and advanced features

**Priority:** MEDIUM - Nice to have before release

**Estimated Time:** 4-6 hours

#### Step 3.1: Offline Functionality
**Files:** `e2e/offline.spec.ts`

```bash
# Offline tests require special network simulation
npx playwright test e2e/offline.spec.ts --project=chromium --headed
```

**Test Cases:**
- ⬜ Create data while offline (daily report, task, photo)
- ⬜ View cached data offline
- ⬜ Offline indicator displays correctly
- ⬜ Sync queue shows pending items
- ⬜ Automatic sync when back online
- ⬜ Manual sync trigger
- ⬜ Conflict detection (same item edited offline and online)
- ⬜ Conflict resolution UI
- ⬜ Background sync (Service Worker)
- ⬜ IndexedDB data persistence
- ⬜ Cache invalidation

**Special Setup:**
```typescript
// In test file, simulate offline
await page.context().setOffline(true);

// Perform offline actions
await page.fill('input[name="title"]', 'Offline Task');
await page.click('button[type="submit"]');

// Verify queued
await expect(page.locator('[data-testid="sync-queue"]')).toContainText('1 item');

// Reconnect
await page.context().setOffline(false);

// Wait for sync
await expect(page.locator('[data-testid="sync-queue"]')).toContainText('0 items');
```

#### Step 3.2: Photo & Progress Tracking
**Files:** `e2e/photo-progress.spec.ts`

```bash
npx playwright test e2e/photo-progress.spec.ts --headed
```

**Test Cases:**
- ⬜ Capture photo from camera (mobile simulation)
- ⬜ Upload photo from file system
- ⬜ Upload multiple photos (bulk)
- ⬜ Add photo annotations (arrows, text, highlights)
- ⬜ Tag photos with location/GPS
- ⬜ Organize photos by area/room
- ⬜ Compare photos (before/after slider)
- ⬜ Create photo album/collection
- ⬜ Add photo captions
- ⬜ Filter photos by date, location, tag
- ⬜ Export photo report with timeline
- ⬜ Compress photos for upload
- ⬜ EXIF data extraction

#### Step 3.3: Meetings & Minutes
**Files:** `e2e/meetings.spec.ts`

```bash
npx playwright test e2e/meetings.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Schedule meeting
- ⬜ Add meeting attendees
- ⬜ Create meeting agenda
- ⬜ Start meeting (timer)
- ⬜ Record meeting minutes (real-time)
- ⬜ Create action items during meeting
- ⬜ Assign action items to attendees
- ⬜ End meeting
- ⬜ Share meeting notes
- ⬜ Mark attendance
- ⬜ Attach meeting documents
- ⬜ Generate meeting minutes PDF
- ⬜ Email meeting summary

#### Step 3.4: Approvals & Workflows
**Files:** `e2e/approvals.spec.ts`, `e2e/client-approval-workflows.spec.ts`

```bash
npx playwright test e2e/approvals.spec.ts e2e/client-approval-workflows.spec.ts
```

**Test Cases:**
- ⬜ Submit item for approval (change order, submittal, etc.)
- ⬜ Single approver workflow
- ⬜ Multi-level approval chain (sequential)
- ⬜ Parallel approval (multiple approvers simultaneously)
- ⬜ Conditional approval (if/then logic)
- ⬜ Approve item with comments
- ⬜ Reject item with reason
- ⬜ Request more information
- ⬜ Delegate approval to another user
- ⬜ Approval notifications (email, in-app)
- ⬜ Approval reminders (automated)
- ⬜ Client portal approval (external user)
- ⬜ Approval history/audit trail

#### Step 3.5: Subcontractor Portal
**Files:** `e2e/subcontractor-portal.spec.ts`

```bash
npx playwright test e2e/subcontractor-portal.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Subcontractor login (separate credentials)
- ⬜ View assigned work/tasks
- ⬜ Update work status
- ⬜ Submit progress reports
- ⬜ Upload documentation (insurance, certifications)
- ⬜ View project documents (limited access)
- ⬜ Respond to punch items
- ⬜ Mark punch items complete
- ⬜ View RFIs assigned to subcontractor
- ⬜ Submit pay applications
- ⬜ View payment status
- ⬜ Limited permissions (cannot see other subs' data)

#### Step 3.6: Checklists & Templates
**Files:** `e2e/checklists.spec.ts`

```bash
npx playwright test e2e/checklists.spec.ts --headed
```

**Test Cases:**
- ⬜ Create custom checklist
- ⬜ Add checklist items
- ⬜ Reorder checklist items (drag and drop)
- ⬜ Use pre-built checklist template
- ⬜ Complete checklist items
- ⬜ Mark item N/A
- ⬜ Add notes to checklist item
- ⬜ Add photos to checklist
- ⬜ Checklist progress indicator (% complete)
- ⬜ Save checklist as template
- ⬜ Share template with team
- ⬜ Duplicate checklist
- ⬜ Export checklist

#### Step 3.7: DocuSign Integration
**Files:** `e2e/docusign.spec.ts`

```bash
# Note: May require DocuSign sandbox/test account
npx playwright test e2e/docusign.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Send document for signature
- ⬜ Add signers (single, multiple)
- ⬜ Set signature fields
- ⬜ Set signing order
- ⬜ Send signing request
- ⬜ Track signature status (sent, delivered, signed, completed)
- ⬜ Receive webhook notification (signed)
- ⬜ Download signed document
- ⬜ Store signed document in project
- ⬜ Resend signing request
- ⬜ Void document

#### Step 3.8: Settings & Configuration
**Files:** `e2e/settings.spec.ts`

```bash
npx playwright test e2e/settings.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Update user profile (name, email, phone)
- ⬜ Upload profile photo
- ⬜ Change password
- ⬜ Enable 2FA
- ⬜ Notification preferences (email, push, in-app)
- ⬜ Theme settings (light/dark/auto)
- ⬜ Language preferences
- ⬜ Timezone settings
- ⬜ Project settings (default values, templates)
- ⬜ Company settings (logo, name, address)
- ⬜ User management (invite, remove, change roles)
- ⬜ Permission management (role-based access control)
- ⬜ Integration settings (DocuSign, email, etc.)

**Phase 3 Completion Command:**
```bash
npx playwright test \
  e2e/offline.spec.ts \
  e2e/photo-progress.spec.ts \
  e2e/meetings.spec.ts \
  e2e/approvals.spec.ts \
  e2e/client-approval-workflows.spec.ts \
  e2e/subcontractor-portal.spec.ts \
  e2e/checklists.spec.ts \
  e2e/docusign.spec.ts \
  e2e/settings.spec.ts \
  --project=chromium \
  --reporter=html
```

---

### Phase 4: User Experience Testing

**Objective:** Ensure excellent user experience across devices

**Priority:** MEDIUM

**Estimated Time:** 2-3 hours

#### Step 4.1: Search & Navigation
**Files:** `e2e/search-navigation.spec.ts`

```bash
npx playwright test e2e/search-navigation.spec.ts --headed
```

**Test Cases:**
- ⬜ Global search (Ctrl+K / Cmd+K)
- ⬜ Search autocomplete
- ⬜ Search across entities (projects, documents, tasks, RFIs)
- ⬜ Filter search results by type
- ⬜ Recent searches
- ⬜ Clear search history
- ⬜ Breadcrumb navigation
- ⬜ Back button navigation
- ⬜ Forward button navigation
- ⬜ Quick navigation shortcuts (keyboard)
- ⬜ Main navigation menu
- ⬜ Mobile navigation (hamburger menu)

#### Step 4.2: Workflows
**Files:** `e2e/workflows.spec.ts`

```bash
npx playwright test e2e/workflows.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ View workflow templates
- ⬜ Create custom workflow
- ⬜ Add workflow steps
- ⬜ Configure workflow triggers (status change, due date, etc.)
- ⬜ Set workflow conditions (if/then)
- ⬜ Add workflow actions (notification, assignment, status update)
- ⬜ Enable/disable workflow
- ⬜ Test workflow (dry run)
- ⬜ Workflow automation execution
- ⬜ Workflow notifications
- ⬜ Edit active workflow
- ⬜ Workflow analytics

#### Step 4.3: Theme & Dark Mode
**Files:** `e2e/theme/theme-functionality.spec.ts`

```bash
npx playwright test e2e/theme/theme-functionality.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Toggle dark mode (manual)
- ⬜ System theme preference detection
- ⬜ Theme persistence (localStorage)
- ⬜ Theme applies to all pages
- ⬜ Smooth theme transitions (no flash)
- ⬜ Custom color scheme
- ⬜ High contrast mode
- ⬜ Theme affects all UI components

**Phase 4 Completion Command:**
```bash
npx playwright test \
  e2e/search-navigation.spec.ts \
  e2e/workflows.spec.ts \
  e2e/theme/ \
  --project=chromium \
  --reporter=html
```

---

### Phase 5: Visual & Accessibility Testing

**Objective:** Ensure visual consistency and accessibility compliance

**Priority:** MEDIUM - Required for WCAG compliance

**Estimated Time:** 3-4 hours

#### Step 5.1: Visual Regression Testing
**Files:**
- `e2e/visual-regression.spec.ts`
- `e2e/visual-regression/blueprint-variants-visual.spec.ts`
- `e2e/visual-regression/dark-mode-comprehensive.spec.ts`

```bash
# Run visual tests
npm run test:visual

# Update baselines (after intentional design changes)
npm run test:visual:update

# Run with UI
npm run test:visual:ui
```

**Test Cases:**
- ⬜ Screenshot baseline for dashboard
- ⬜ Screenshot baseline for projects page
- ⬜ Screenshot baseline for daily reports
- ⬜ Screenshot baseline for RFIs
- ⬜ Light mode visual regression
- ⬜ Dark mode visual regression
- ⬜ Component visual consistency (buttons, forms, cards)
- ⬜ Blueprint variant rendering
- ⬜ Responsive breakpoint visuals (mobile, tablet, desktop)
- ⬜ Animation states (loading, transitions)
- ⬜ Modal/dialog rendering
- ⬜ Dropdown/select rendering

**Configuration:**
```typescript
// In test
await expect(page).toHaveScreenshot('dashboard-light.png', {
  maxDiffPixels: 150,
  maxDiffPixelRatio: 0.03,
  threshold: 0.2,
  animations: 'disabled',
  scale: 'css'
});
```

#### Step 5.2: Accessibility Testing
**Files:**
- `e2e/PolishedVariant1Professional.a11y.spec.ts`
- `e2e/accessibility/dark-mode-contrast.spec.ts`
- `e2e/accessibility/dark-mode-states.spec.ts`

```bash
# Run accessibility tests
npx playwright test e2e/accessibility/ --project=chromium

# Run dark mode contrast tests
npm run test:contrast

# Run dark mode states tests
npm run test:states

# Run all dark mode tests
npm run test:dark-mode
```

**Test Cases:**
- ⬜ Keyboard navigation (Tab, Shift+Tab, Enter, Space, Arrow keys)
- ⬜ Skip links (Skip to main content)
- ⬜ Screen reader compatibility (ARIA labels)
- ⬜ Color contrast ratios (WCAG AA: 4.5:1 text, 3:1 large text)
- ⬜ Focus indicators (visible and clear)
- ⬜ ARIA roles and attributes
- ⬜ Form accessibility (labels, error messages)
- ⬜ Alt text for images
- ⬜ Heading hierarchy (h1, h2, h3 in order)
- ⬜ Interactive element accessibility (buttons, links)
- ⬜ Dark mode contrast compliance
- ⬜ Focus states in dark mode
- ⬜ Disabled states accessibility

**Using axe-core:**
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('dashboard accessibility', async ({ page }) => {
  await page.goto('/dashboard');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

**Phase 5 Completion Command:**
```bash
# Run all visual and accessibility tests
npx playwright test \
  e2e/visual-regression.spec.ts \
  e2e/visual-regression/ \
  e2e/accessibility/ \
  e2e/PolishedVariant1Professional.a11y.spec.ts \
  --project=chromium \
  --reporter=html

# Or use shortcut
npm run test:dark-mode:full
```

---

### Phase 6: Cross-Browser & Device Testing

**Objective:** Ensure compatibility across all target platforms

**Priority:** MEDIUM-LOW - Can be done post-release

**Estimated Time:** 4-5 hours

#### Step 6.1: Desktop Browsers
**Browsers:** Chromium, Firefox, WebKit, Edge, Chrome

```bash
# Run on all desktop browsers
npx playwright test e2e/auth.spec.ts --project=chromium --project=firefox --project=webkit

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run on Edge (branded browser)
npx playwright test --project="Microsoft Edge"

# Run on Chrome (branded browser)
npx playwright test --project="Google Chrome"
```

**Test Focus:**
- ⬜ Core functionality in all browsers
- ⬜ CSS rendering consistency
- ⬜ JavaScript API compatibility
- ⬜ PDF viewer compatibility (different renderers)
- ⬜ File upload/download
- ⬜ Camera/media access
- ⬜ Local storage/IndexedDB
- ⬜ Service Worker support

**Browser-Specific Issues to Test:**
- Firefox: networkidle timeout issues (configured with longer timeout)
- Safari/WebKit: Date picker rendering, file input behavior
- Edge: Legacy compatibility mode

#### Step 6.2: Mobile Devices
**Devices:** Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12), Tablet

```bash
# Run mobile tests
npm run test:e2e:mobile

# Run specific device
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"

# Custom device
npx playwright test --device="iPad Pro"
```

**Test Focus:**
- ⬜ Touch interactions (tap, swipe, pinch-to-zoom)
- ⬜ Mobile navigation (hamburger menu)
- ⬜ Responsive layouts (portrait, landscape)
- ⬜ Camera integration (photo capture)
- ⬜ Geolocation
- ⬜ Mobile forms (keyboard types, autocomplete)
- ⬜ Pull-to-refresh
- ⬜ Virtual keyboard handling

**Mobile-Specific Test:**
```typescript
test('mobile photo capture', async ({ page, context }) => {
  // Grant camera permissions
  await context.grantPermissions(['camera']);

  await page.goto('/daily-reports/new');

  // Trigger camera
  await page.click('[data-testid="camera-button"]');

  // Simulate photo capture (mock in test environment)
  // Real camera testing requires actual device

  await page.waitForSelector('[data-testid="photo-preview"]');
});
```

#### Step 6.3: Responsive Design
**Files:** `e2e/blueprint-variants-responsive.spec.ts`

```bash
npx playwright test e2e/blueprint-variants-responsive.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Mobile viewport (320px-767px)
- ⬜ Tablet viewport (768px-1023px)
- ⬜ Desktop viewport (1024px-1919px)
- ⬜ Ultra-wide viewport (1920px+)
- ⬜ Orientation changes (portrait → landscape)
- ⬜ Layout breakpoints
- ⬜ Content reflow
- ⬜ Navigation menu responsive behavior
- ⬜ Table responsive (scroll, stack)
- ⬜ Form responsive layout

**Viewport Testing:**
```typescript
test('responsive dashboard', async ({ page }) => {
  await page.goto('/dashboard');

  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();

  // Desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.locator('[data-testid="full-nav"]')).toBeVisible();
});
```

**Phase 6 Completion Command:**
```bash
# Run all browsers and devices
npx playwright test \
  e2e/auth.spec.ts \
  e2e/projects.spec.ts \
  e2e/blueprint-variants-responsive.spec.ts \
  --project=chromium \
  --project=firefox \
  --project=webkit \
  --project="Mobile Chrome" \
  --project="Mobile Safari" \
  --reporter=html
```

---

### Phase 7: Performance Testing

**Objective:** Ensure application performs well under load

**Priority:** MEDIUM-LOW - Optimize after functionality complete

**Estimated Time:** 3-4 hours

#### Step 7.1: Page Load Performance
**Files:** `e2e/performance/blueprint-variants-perf.spec.ts`

```bash
npx playwright test e2e/performance/ --project=chromium
```

**Test Cases & Metrics:**
- ⬜ First Contentful Paint (FCP) < 1.8s
- ⬜ Largest Contentful Paint (LCP) < 2.5s
- ⬜ Time to Interactive (TTI) < 3.8s
- ⬜ Total Blocking Time (TBT) < 200ms
- ⬜ Cumulative Layout Shift (CLS) < 0.1
- ⬜ Speed Index < 3.4s

**Performance Test Example:**
```typescript
import { test, expect } from '@playwright/test';

test('dashboard load performance', async ({ page }) => {
  // Start performance measurement
  await page.goto('/dashboard');

  // Get web vitals
  const metrics = await page.evaluate(() => ({
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    cls: performance.getEntriesByType('layout-shift').reduce((sum, entry) => sum + entry.value, 0)
  }));

  // Assert performance budgets
  expect(metrics.fcp).toBeLessThan(1800); // 1.8s
  expect(metrics.lcp).toBeLessThan(2500); // 2.5s
  expect(metrics.cls).toBeLessThan(0.1);
});
```

#### Step 7.2: Runtime Performance

**Test Cases:**
- ⬜ Smooth scrolling (60fps)
- ⬜ Animation performance (no jank)
- ⬜ Large list rendering (virtualization)
- ⬜ Image loading optimization (lazy loading)
- ⬜ Memory leak detection
- ⬜ CPU usage under load
- ⬜ React re-render optimization

**Memory Leak Test:**
```typescript
test('no memory leaks in navigation', async ({ page }) => {
  await page.goto('/dashboard');

  const initialMemory = await page.evaluate(() => performance.memory.usedJSHeapSize);

  // Navigate through pages multiple times
  for (let i = 0; i < 10; i++) {
    await page.goto('/projects');
    await page.goto('/dashboard');
  }

  const finalMemory = await page.evaluate(() => performance.memory.usedJSHeapSize);

  // Memory should not grow excessively (allow 20% increase)
  expect(finalMemory).toBeLessThan(initialMemory * 1.2);
});
```

#### Step 7.3: Network Performance

**Test Cases:**
- ⬜ Fast 3G network simulation
- ⬜ Slow 3G network simulation
- ⬜ Offline → Online transition
- ⬜ Request batching
- ⬜ Caching effectiveness
- ⬜ Bundle size optimization
- ⬜ Resource compression (gzip/brotli)
- ⬜ Image optimization (WebP, responsive images)

**Network Throttling Test:**
```typescript
test('app usable on slow connection', async ({ page, context }) => {
  // Simulate slow 3G
  await context.route('**/*', route => {
    setTimeout(() => route.continue(), 500); // 500ms delay
  });

  const startTime = Date.now();
  await page.goto('/dashboard');
  const loadTime = Date.now() - startTime;

  // Should still load in reasonable time
  expect(loadTime).toBeLessThan(10000); // 10 seconds on slow network

  // Check that UI is responsive
  await expect(page.locator('main')).toBeVisible({ timeout: 5000 });
});
```

**Phase 7 Completion Command:**
```bash
npx playwright test e2e/performance/ --project=chromium --reporter=html
```

---

### Phase 8: Edge Cases & Error Handling

**Objective:** Validate application behavior in unusual scenarios

**Priority:** LOW - Polish and robustness

**Estimated Time:** 3-4 hours

#### Step 8.1: Blueprint Variants Edge Cases
**Files:** `e2e/blueprint-variants-edge-cases.spec.ts`, `e2e/blueprint-variants-interaction.spec.ts`

```bash
npx playwright test e2e/blueprint-variants*.spec.ts --project=chromium
```

**Test Cases:**
- ⬜ Empty states (no data)
- ⬜ Maximum data scenarios (1000+ items)
- ⬜ Special characters in input (<, >, &, ", ')
- ⬜ Unicode characters (emoji, non-Latin)
- ⬜ Very long text content (10,000+ characters)
- ⬜ Concurrent user editing (race conditions)
- ⬜ Rapid clicking (double submit prevention)
- ⬜ Invalid data types (string in number field)

#### Step 8.2: Error States

**Test Cases:**
- ⬜ Network failure handling (500, 502, 503)
- ⬜ API timeout handling
- ⬜ API error responses (400, 401, 403, 404)
- ⬜ Invalid form submissions
- ⬜ File upload failures (size limit, type restriction)
- ⬜ Session expiration mid-action
- ⬜ 404 page handling
- ⬜ 500 error page
- ⬜ Graceful degradation
- ⬜ Error recovery (retry mechanism)

**Error Handling Test:**
```typescript
test('handles network failure gracefully', async ({ page, context }) => {
  await page.goto('/dashboard');

  // Simulate network failure
  await context.setOffline(true);

  // Try to perform action
  await page.click('[data-testid="create-project"]');
  await page.fill('input[name="name"]', 'Test Project');
  await page.click('button[type="submit"]');

  // Should show error message
  await expect(page.locator('[role="alert"]')).toContainText('network');

  // Restore network
  await context.setOffline(false);

  // Should be able to retry
  await page.click('button:has-text("Retry")');
  await expect(page.locator('[data-testid="project-created"]')).toBeVisible();
});
```

#### Step 8.3: Data Validation

**Test Cases:**
- ⬜ Form validation messages (clear, helpful)
- ⬜ Date range validation (start < end)
- ⬜ File type validation (PDF, DOC, XLS, images only)
- ⬜ File size limits (< 10MB, configurable)
- ⬜ Required field enforcement
- ⬜ Email format validation
- ⬜ Phone number format validation
- ⬜ URL format validation
- ⬜ Number range validation (min, max)
- ⬜ Custom validation rules

#### Step 8.4: PDF Viewer Edge Cases
**Files:** `e2e/pdf-viewer-fixes.spec.ts`

```bash
npx playwright test e2e/pdf-viewer-fixes.spec.ts --headed
```

**Test Cases:**
- ⬜ Load PDF successfully (various sizes)
- ⬜ Load very large PDF (50+ MB)
- ⬜ Navigate PDF pages (next, previous, jump to page)
- ⬜ Zoom PDF (in, out, fit width, fit page)
- ⬜ Download PDF
- ⬜ Print PDF
- ⬜ PDF annotation tools (if implemented)
- ⬜ Handle corrupted PDFs
- ⬜ Handle password-protected PDFs
- ⬜ Handle scanned PDFs (OCR)

**Phase 8 Completion Command:**
```bash
npx playwright test \
  e2e/blueprint-variants-edge-cases.spec.ts \
  e2e/blueprint-variants-interaction.spec.ts \
  e2e/pdf-viewer-fixes.spec.ts \
  --project=chromium \
  --reporter=html
```

---

### Phase 9: Screenshot Generation & Marketing

**Objective:** Generate assets for app stores and marketing

**Priority:** LOW - Marketing materials

**Estimated Time:** 1-2 hours

**Files:** `e2e/generate-app-store-screenshots.spec.ts`

```bash
npx playwright test e2e/generate-app-store-screenshots.spec.ts --project=chromium
```

**Screenshot Requirements:**
- ⬜ iPhone Pro Max (6.5") - 1242 x 2688 px
- ⬜ iPhone (6.5") - 1242 x 2688 px
- ⬜ iPad Pro (12.9") - 2048 x 2732 px
- ⬜ Android Phone - 1080 x 1920 px
- ⬜ Android Tablet - 1200 x 1920 px

**Screenshots Needed:**
1. Dashboard overview
2. Daily report creation
3. Photo management
4. Project list
5. RFI workflow
6. Offline capabilities
7. Dark mode showcase

**Screenshot Generation:**
```typescript
test('generate app store screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1242, height: 2688 });

  // Login and navigate
  await page.goto('/dashboard');

  // Wait for content to load
  await page.waitForLoadState('networkidle');

  // Remove any dynamic elements (dates, usernames)
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="current-date"]').forEach(el => {
      el.textContent = 'March 15, 2024';
    });
  });

  // Take screenshot
  await page.screenshot({
    path: 'screenshots/app-store/dashboard-iphone-pro-max.png',
    fullPage: false
  });
});
```

**Phase 9 Completion:**
```bash
npx playwright test e2e/generate-app-store-screenshots.spec.ts
# Screenshots saved to screenshots/app-store/
```

---

## CI/CD Integration

### Current CI/CD Workflows

The project has comprehensive CI/CD workflows already configured:

1. **`e2e-tests.yml`** - Multi-phase E2E testing
2. **`e2e-autonomous.yml`** - Scheduled autonomous testing
3. **`e2e-quick-check.yml`** - Fast smoke tests
4. **`playwright.yml`** - Standard Playwright execution
5. **`ci.yml`** - Full CI pipeline
6. **`test.yml`** - Unit test execution

### Recommended CI Execution Strategy

#### On Every Commit (Fast Feedback)
```yaml
# Run critical path only (Phase 1)
- name: Quick E2E Check
  run: |
    npx playwright test \
      e2e/auth.spec.ts \
      e2e/hello-world.spec.ts \
      --project=chromium \
      --reporter=line
```

**Execution Time:** ~3-5 minutes

#### On Pull Request (Comprehensive)
```yaml
# Run Phases 1-4 (Critical + Features)
- name: PR E2E Tests
  run: |
    npx playwright test \
      e2e/auth*.spec.ts \
      e2e/projects.spec.ts \
      e2e/daily-reports*.spec.ts \
      e2e/documents.spec.ts \
      e2e/rfis.spec.ts \
      e2e/submittals.spec.ts \
      --project=chromium \
      --project=firefox \
      --reporter=html,json
```

**Execution Time:** ~15-20 minutes

#### Nightly Builds (Full Test Suite)
```yaml
# Run ALL phases, ALL browsers
- name: Nightly E2E Tests
  run: npm run test:e2e:all
```

**Execution Time:** ~60-90 minutes

#### Before Release (Final Validation)
```yaml
# Run ALL phases, ALL browsers, generate reports
- name: Release E2E Tests
  run: |
    npm run test:e2e
    npm run test:visual
    npm run test:dark-mode:full
```

**Execution Time:** ~90-120 minutes

### GitHub Actions Secrets Required

Configure these secrets in GitHub repository settings:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=securepassword123
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=adminsecurepassword123
```

### Parallel Test Execution

For faster CI execution, use test sharding:

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]

- name: Run E2E Tests (Shard ${{ matrix.shard }})
  run: npx playwright test --shard=${{ matrix.shard }}/4
```

This divides tests across 4 parallel runners, reducing execution time by ~75%.

---

## Local Execution Workflows

### Developer Daily Workflow

```bash
# Morning: Quick smoke test
npm run test:e2e:chromium -- e2e/auth.spec.ts

# During feature development: Watch mode
npm run test:e2e:ui  # Opens UI mode, select specific test

# Before commit: Run affected tests
npx playwright test e2e/[feature].spec.ts --headed

# Before push: Run Phase 1 critical tests
npx playwright test \
  e2e/auth*.spec.ts \
  e2e/projects.spec.ts \
  --project=chromium
```

### Feature Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Write test first (TDD)
code e2e/new-feature.spec.ts

# 3. Run test in UI mode (watch it fail)
npm run test:e2e:ui

# 4. Implement feature

# 5. Run test (watch it pass)
npm run test:e2e:ui

# 6. Run related tests
npx playwright test e2e/new-feature.spec.ts e2e/related-feature.spec.ts

# 7. Run critical path
npx playwright test e2e/auth*.spec.ts e2e/projects.spec.ts

# 8. Commit and push
git add .
git commit -m "feat: add new feature with E2E tests"
git push origin feature/new-feature
```

### Bug Fix Workflow

```bash
# 1. Reproduce bug with test
code e2e/bug-reproduction.spec.ts

# 2. Run test (should fail)
npx playwright test e2e/bug-reproduction.spec.ts --debug

# 3. Fix bug

# 4. Run test (should pass)
npx playwright test e2e/bug-reproduction.spec.ts

# 5. Run regression tests
npx playwright test --project=chromium

# 6. Commit
git commit -m "fix: resolve issue #123 with E2E test"
```

### Visual Regression Update Workflow

```bash
# 1. Make design changes

# 2. Run visual tests (will fail)
npm run test:visual

# 3. Review differences
npm run test:visual:ui  # Opens UI to compare

# 4. Update baselines (if changes are intentional)
npm run test:visual:update

# 5. Commit new baselines
git add e2e/**/*.png
git commit -m "test: update visual regression baselines for new design"
```

---

## Test Data Management

### Test Data Strategy

#### 1. Seed Data Before Tests

```bash
# Full seed (recommended before comprehensive testing)
npm run seed:all

# Minimal seed (faster, for quick tests)
npm run seed:test

# User-only seed
npm run seed:test-users
```

#### 2. Test Isolation

Each test should:
- Create its own test data (projects, tasks, etc.)
- Use unique identifiers (timestamps, UUIDs)
- Clean up after itself (delete created data)

```typescript
test('create project', async ({ page }) => {
  const projectName = `Test Project ${Date.now()}`;

  await page.goto('/projects/new');
  await page.fill('input[name="name"]', projectName);
  await page.click('button[type="submit"]');

  // Cleanup
  test.afterEach(async () => {
    // Delete project via API or UI
  });
});
```

#### 3. Shared Test Data

For data used across multiple tests:
- Use global setup (`e2e/global-setup.ts`)
- Create once, use many times
- Don't modify shared data in tests

#### 4. Test User Accounts

**Standard Test Users:**
```
Admin User:
  Email: admin@test.jobsight.app
  Password: AdminTest123!
  Role: Administrator

Superintendent:
  Email: super@test.jobsight.app
  Password: SuperTest123!
  Role: Superintendent

Foreman:
  Email: foreman@test.jobsight.app
  Password: ForemanTest123!
  Role: Foreman

Subcontractor:
  Email: sub@test.jobsight.app
  Password: SubTest123!
  Role: Subcontractor

Client:
  Email: client@test.jobsight.app
  Password: ClientTest123!
  Role: Client (View-only)
```

#### 5. Test Projects

**Standard Test Projects:**
```
1. Active Commercial Project
   - Name: "Downtown Office Building"
   - Status: In Progress
   - Data: Full dataset (RFIs, submittals, daily reports, etc.)

2. Active Residential Project
   - Name: "Sunset Apartments"
   - Status: In Progress
   - Data: Moderate dataset

3. Completed Project
   - Name: "Memorial Hospital Renovation"
   - Status: Complete
   - Data: Historical data

4. New Project (Minimal Data)
   - Name: "City Center Retail"
   - Status: Planning
   - Data: Minimal (for testing edge cases)
```

### Database State Management

#### Option 1: Snapshot & Restore (Recommended)
```bash
# Create snapshot after seeding
npm run test:db:snapshot

# Restore before test runs
npm run test:db:restore
```

#### Option 2: Transactions (For Supabase)
```typescript
// Not directly supported, use alternative approach
// Each test creates and deletes its own data
```

#### Option 3: Separate Test Database
```
Production: your-project.supabase.co
Testing:    your-project-test.supabase.co
```

---

## Monitoring & Reporting

### Test Execution Monitoring

#### 1. Playwright HTML Report

```bash
# After test run
npm run test:e2e:report

# Opens browser with:
# - Test results summary
# - Failed test details
# - Screenshots and videos
# - Traces for failed tests
```

#### 2. GitHub Actions Summary

Automatically generated in CI:
- Test pass/fail status
- Execution time
- Flaky test detection
- Artifacts (reports, screenshots, videos)

#### 3. Test Metrics Dashboard

Track over time:
- Test pass rate
- Execution time trends
- Flaky test frequency
- Coverage metrics

### Reporting Tools

#### Playwright Report
```bash
# Generate HTML report
npx playwright test --reporter=html

# Generate JSON report
npx playwright test --reporter=json

# Generate JUnit XML (for CI integration)
npx playwright test --reporter=junit
```

#### Custom Reporting
```typescript
// playwright.config.ts
reporter: [
  ['html', { open: 'never' }],
  ['json', { outputFile: 'test-results.json' }],
  ['junit', { outputFile: 'test-results.xml' }],
  ['github'], // GitHub Actions annotations
],
```

### Alerting & Notifications

#### On Test Failure (CI)
```yaml
- name: Notify on Failure
  if: failure()
  run: |
    # Send Slack notification
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -d '{"text": "E2E tests failed on ${{ github.ref }}"}'
```

#### Daily Test Report
```yaml
# Scheduled workflow
on:
  schedule:
    - cron: '0 8 * * *'  # 8 AM daily

# Send email with test summary
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue: "Environment variable not set"

**Solution:**
```bash
# Check .env.test exists
ls -la .env.test

# Verify contents
cat .env.test

# Reload environment
source .env.test  # Unix
# Or restart terminal
```

#### Issue: "Login failed" or "Invalid credentials"

**Solution:**
```bash
# Verify test user exists in Supabase
npm run check:test-user

# Create test user
npm run seed:test-users

# Manually verify in Supabase dashboard:
# Authentication > Users > Search for test user
```

#### Issue: "Timeout waiting for selector"

**Solution:**
```typescript
// Increase timeout for specific selector
await page.waitForSelector('[data-testid="element"]', { timeout: 30000 });

// Or increase global timeout in playwright.config.ts
timeout: 90000,
```

#### Issue: "Dev server not starting"

**Solution:**
```bash
# Check if port 5173 is in use
lsof -i :5173  # Unix
netstat -ano | findstr :5173  # Windows

# Kill process or use different port
# Update playwright.config.ts webServer.url
```

#### Issue: "Tests are flaky"

**Solution:**
```typescript
// Add wait for network idle
await page.goto('/dashboard', { waitUntil: 'networkidle' });

// Wait for specific condition
await page.waitForLoadState('domcontentloaded');

// Add explicit waits
await page.waitForTimeout(1000);

// Use retry logic
await expect(async () => {
  await page.click('button');
  await expect(page.locator('.success')).toBeVisible();
}).toPass({ timeout: 10000 });
```

#### Issue: "Visual regression tests failing"

**Solution:**
```bash
# Update baselines after intentional changes
npm run test:visual:update

# Review differences in UI mode
npm run test:visual:ui

# Adjust pixel tolerance in playwright.config.ts
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 200,  // Increase tolerance
    threshold: 0.3,
  }
}
```

#### Issue: "Out of memory in CI"

**Solution:**
```yaml
# Increase Node memory limit
env:
  NODE_OPTIONS: '--max-old-space-size=8192'

# Or reduce parallelism
workers: 1,  # In playwright.config.ts
```

#### Issue: "Supabase rate limiting"

**Solution:**
```typescript
// Add delays between requests
await page.waitForTimeout(500);

// Use test-specific Supabase project
// Separate from production
```

---

## Success Criteria & Quality Gates

### Phase-Specific Success Criteria

#### Phase 1: Critical Path
- ✅ 100% test pass rate
- ✅ 0 skipped tests
- ✅ < 5 minute execution time
- ✅ 0 flaky tests (0% flakiness)
- ✅ All auth flows complete in < 5 seconds

#### Phase 2: Feature Completeness
- ✅ 95%+ test pass rate
- ✅ < 2% skipped tests
- ✅ < 20 minute execution time
- ✅ < 5% flaky tests
- ✅ All CRUD operations work reliably

#### Phase 3: Advanced Features
- ✅ 90%+ test pass rate
- ✅ < 5% skipped tests
- ✅ Offline sync works correctly
- ✅ No data loss in offline scenarios

#### Phase 4: User Experience
- ✅ 90%+ test pass rate
- ✅ Navigation flows intuitive
- ✅ Search returns results in < 1 second

#### Phase 5: Visual & Accessibility
- ✅ 100% WCAG AA compliance
- ✅ 0 visual regressions (unless intentional)
- ✅ Color contrast >= 4.5:1 (text)
- ✅ Keyboard navigation works on all pages

#### Phase 6: Cross-Browser
- ✅ 95%+ pass rate on Chromium
- ✅ 90%+ pass rate on Firefox
- ✅ 90%+ pass rate on WebKit
- ✅ 85%+ pass rate on mobile

#### Phase 7: Performance
- ✅ FCP < 1.8s
- ✅ LCP < 2.5s
- ✅ TTI < 3.8s
- ✅ CLS < 0.1

#### Phase 8: Edge Cases
- ✅ 80%+ test pass rate
- ✅ Graceful error handling
- ✅ No data corruption scenarios

#### Phase 9: Screenshots
- ✅ All required screenshots generated
- ✅ High quality (no pixelation)
- ✅ Representative of actual use

### Overall Quality Gates

**Before Merge:**
- ✅ Phase 1 (Critical Path): 100% pass
- ✅ No new console errors
- ✅ TypeScript compiles
- ✅ Linting passes
- ✅ Unit tests pass

**Before Release:**
- ✅ Phase 1-4: 95%+ pass
- ✅ Phase 5: 100% accessibility compliance
- ✅ Phase 6: 90%+ cross-browser pass
- ✅ Phase 7: Performance budgets met
- ✅ Visual regression approved
- ✅ No critical bugs

**Production Readiness:**
- ✅ ALL phases: 90%+ pass
- ✅ Test coverage: 80%+ of user flows
- ✅ Flaky test rate: < 2%
- ✅ Performance: All Core Web Vitals green
- ✅ Accessibility: WCAG AA compliant
- ✅ Security: No high/critical vulnerabilities

---

## Appendix: Useful Commands Reference

### Quick Commands

```bash
# Run all tests
npm run test:e2e

# Run with UI (recommended)
npm run test:e2e:ui

# Run specific test
npx playwright test e2e/auth.spec.ts

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug specific test
npx playwright test e2e/auth.spec.ts --debug

# Run on specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile

# Visual tests
npm run test:visual
npm run test:visual:update

# Dark mode tests
npm run test:dark-mode

# Generate report
npm run test:e2e:report

# Code generation (create test from actions)
npm run test:manual
```

### Advanced Commands

```bash
# Run with trace
npx playwright test --trace on

# Run with video
npx playwright test --video on

# Run specific project
npx playwright test --project=chromium

# Run in parallel with sharding
npx playwright test --shard=1/4

# Run tests matching pattern
npx playwright test --grep "@smoke"

# Skip tests matching pattern
npx playwright test --grep-invert "@slow"

# List all tests
npx playwright test --list

# Show browser
npx playwright test --headed

# Slow mo (slow down execution)
npx playwright test --slow-mo 1000

# Update snapshots
npx playwright test --update-snapshots
```

### Debugging Commands

```bash
# Debug mode (step through)
npx playwright test --debug

# Inspect (pause at line)
# Add to test: await page.pause();

# View trace
npx playwright show-trace trace.zip

# Show report
npx playwright show-report

# Clear test cache
npx playwright test --clear-cache

# Doctor (check installation)
npx playwright doctor
```

---

## Summary & Next Steps

### Current State
- ✅ Infrastructure complete (Phase 0)
- ✅ CI/CD workflows configured
- ✅ Test environment ready
- 🟡 Tests partially implemented
- ⬜ Full execution pending

### Immediate Next Steps (Priority Order)

1. **Complete Phase 1 Tests (CRITICAL)**
   - Implement all auth test cases
   - Implement project management tests
   - Implement daily reports tests
   - Implement document management tests
   - **Goal:** 100% Phase 1 coverage

2. **Run Phase 1 Locally**
   - Execute all Phase 1 tests
   - Fix any failures
   - Achieve 100% pass rate
   - Document any issues

3. **CI Integration for Phase 1**
   - Configure CI to run Phase 1 on every commit
   - Set up quality gates (must pass to merge)
   - Monitor for flakiness

4. **Proceed to Phase 2**
   - Implement feature tests incrementally
   - Run after each implementation
   - Integrate into CI pipeline

5. **Continue Through Remaining Phases**
   - Follow systematic approach
   - Maintain quality gates
   - Update documentation

### Long-Term Goals

- **Week 1-2:** Complete Phase 1-2 (Critical + Features)
- **Week 3-4:** Complete Phase 3-4 (Advanced + UX)
- **Week 5:** Complete Phase 5-6 (Visual + Cross-browser)
- **Week 6:** Complete Phase 7-8 (Performance + Edge cases)
- **Week 7:** Complete Phase 9 + Documentation
- **Week 8:** Final review, optimization, production deployment

### Success Indicators

You'll know you're successful when:
- ✅ All critical path tests run automatically on every commit
- ✅ Test failures block merges (quality gate)
- ✅ Developers trust the tests (no false positives)
- ✅ Tests run in < 20 minutes for full suite
- ✅ Visual regressions are caught before deployment
- ✅ Accessibility is verified automatically
- ✅ Performance budgets are enforced
- ✅ Production deployments have zero downtime

---

**Document Version:** 1.0
**Last Updated:** 2024-12-31
**Maintained By:** JobSight Engineering Team
**Related Documents:**
- `E2E_TESTING_PHASES.md` - Phase breakdown
- `e2e/README.md` - Quick reference
- `playwright.config.ts` - Configuration
- `E2E_TESTING_SETUP.md` - Initial setup guide
