# E2E Testing Phased Implementation Plan

## Overview

This document outlines a comprehensive, phased approach to E2E testing for the JobSight construction management platform. The plan prioritizes critical user flows first, then expands to cover edge cases, cross-browser compatibility, performance, and accessibility.

---

## Phase 0: Foundation & Setup (COMPLETED)

**Status:** ✅ Complete

**Objective:** Establish testing infrastructure and environment

**Completed Items:**
- ✅ Playwright installed and configured
- ✅ Global setup with authentication
- ✅ Cloud Supabase integration
- ✅ Test environment (.env.test) configured
- ✅ Basic test structure established
- ✅ Auth fixtures created
- ✅ Test documentation (README.md)

**Key Files:**
- `playwright.config.ts`
- `e2e/global-setup.ts`
- `e2e/fixtures/auth.ts`
- `.env.test`

---

## Phase 1: Critical Path Testing (PRIORITY: CRITICAL)

**Objective:** Validate core user journeys that represent the most critical business value

**Timeline Priority:** Execute these first

### 1.1 Authentication & Session Management
**Files:** `auth.spec.ts`, `auth-biometric.spec.ts`

**Test Cases:**
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Logout functionality
- ✅ Session persistence across page refreshes
- ✅ Protected route access without auth
- ✅ Password reset flow
- ⬜ Biometric authentication (device-specific)
- ⬜ Multi-factor authentication (if implemented)

**Success Criteria:**
- All authentication flows work reliably
- Users cannot access protected routes without authentication
- Session handling is secure and consistent

### 1.2 Project Management Core Flows
**Files:** `projects.spec.ts`

**Test Cases:**
- ✅ View projects list
- ⬜ Create new project
- ⬜ Edit project details
- ⬜ Archive/delete project
- ⬜ Navigate to project dashboard
- ⬜ Project search and filtering
- ⬜ Project status updates

**Success Criteria:**
- Users can complete full project lifecycle
- Data persists correctly across sessions
- UI updates reflect backend changes

### 1.3 Daily Reports (Critical for Field Teams)
**Files:** `daily-reports.spec.ts`, `daily-reports-v2.spec.ts`

**Test Cases:**
- ⬜ Create daily report
- ⬜ Add weather conditions
- ⬜ Add crew information
- ⬜ Add work performed details
- ⬜ Add photos to report
- ⬜ Submit daily report
- ⬜ View submitted reports
- ⬜ Edit draft reports
- ⬜ Export daily report to PDF

**Success Criteria:**
- Field teams can create reports quickly
- All data types (text, photos, weather) save correctly
- Reports are immediately viewable by stakeholders

### 1.4 Document Management
**Files:** `documents.spec.ts`

**Test Cases:**
- ⬜ Upload document
- ⬜ View document list
- ⬜ Download document
- ⬜ Search documents
- ⬜ Organize documents in folders
- ⬜ Delete document
- ⬜ Document versioning
- ⬜ Share document with team

**Success Criteria:**
- Document upload/download is reliable
- Search returns accurate results
- File permissions work correctly

---

## Phase 2: Feature Completeness Testing (PRIORITY: HIGH)

**Objective:** Ensure all major features work end-to-end

**Timeline Priority:** Execute after Phase 1 is stable

### 2.1 RFIs (Requests for Information)
**Files:** `rfis.spec.ts`

**Test Cases:**
- ⬜ Create new RFI
- ⬜ Assign RFI to team member
- ⬜ Add attachments to RFI
- ⬜ Respond to RFI
- ⬜ Close RFI
- ⬜ Filter RFIs by status
- ⬜ Search RFIs

### 2.2 Submittals
**Files:** `submittals.spec.ts`

**Test Cases:**
- ⬜ Create submittal
- ⬜ Upload submittal documents
- ⬜ Review submittal
- ⬜ Approve/reject submittal
- ⬜ Track submittal status
- ⬜ Submittal workflow notifications

### 2.3 Change Orders
**Files:** `change-orders.spec.ts`

**Test Cases:**
- ⬜ Create change order
- ⬜ Add cost impacts
- ⬜ Add schedule impacts
- ⬜ Submit for approval
- ⬜ Approval workflow
- ⬜ Change order history
- ⬜ Cost tracking updates

### 2.4 Schedule Management
**Files:** `schedule.spec.ts`

**Test Cases:**
- ⬜ View project schedule
- ⬜ Create new task
- ⬜ Assign task to crew
- ⬜ Update task status
- ⬜ Mark task complete
- ⬜ View Gantt chart
- ⬜ Critical path identification

### 2.5 Tasks & Action Items
**Files:** `tasks.spec.ts`, `action-items.spec.ts`

**Test Cases:**
- ⬜ Create task
- ⬜ Assign task
- ⬜ Set due date
- ⬜ Add task notes
- ⬜ Complete task
- ⬜ Task notifications
- ⬜ Overdue task alerts

### 2.6 Safety Incidents
**Files:** `safety-incidents.spec.ts`

**Test Cases:**
- ⬜ Report safety incident
- ⬜ Add incident photos
- ⬜ Classify incident severity
- ⬜ Assign corrective actions
- ⬜ Track incident resolution
- ⬜ Generate safety reports

### 2.7 Inspections
**Files:** `inspections.spec.ts`

**Test Cases:**
- ⬜ Create inspection
- ⬜ Use inspection template
- ⬜ Complete inspection checklist
- ⬜ Add inspection photos
- ⬜ Submit inspection
- ⬜ View inspection history

### 2.8 Punch Lists
**Files:** `punch-lists.spec.ts`

**Test Cases:**
- ⬜ Create punch list item
- ⬜ Assign punch item to subcontractor
- ⬜ Add photos to punch item
- ⬜ Update punch item status
- ⬜ Mark punch item complete
- ⬜ Export punch list

### 2.9 Quality Control
**Files:** `quality-control.spec.ts`

**Test Cases:**
- ⬜ Create QC inspection
- ⬜ Record QC measurements
- ⬜ Pass/fail criteria
- ⬜ QC documentation
- ⬜ QC reports

---

## Phase 3: Advanced Features Testing (PRIORITY: MEDIUM)

**Objective:** Validate specialized and advanced features

### 3.1 Offline Functionality
**Files:** `offline.spec.ts`

**Test Cases:**
- ⬜ Create data while offline
- ⬜ View cached data offline
- ⬜ Sync data when back online
- ⬜ Conflict resolution
- ⬜ Offline indicator display
- ⬜ Background sync

**Special Considerations:**
- Requires network simulation
- Test with Service Worker active
- Validate IndexedDB operations

### 3.2 Photo & Progress Tracking
**Files:** `photo-progress.spec.ts`

**Test Cases:**
- ⬜ Capture photo from camera
- ⬜ Upload photo from gallery
- ⬜ Add photo annotations
- ⬜ Tag photos with location
- ⬜ Organize photos by area
- ⬜ Photo comparison (before/after)
- ⬜ Export photo report

### 3.3 Meetings & Minutes
**Files:** `meetings.spec.ts`

**Test Cases:**
- ⬜ Schedule meeting
- ⬜ Create meeting agenda
- ⬜ Record meeting minutes
- ⬜ Assign action items from meeting
- ⬜ Share meeting notes
- ⬜ Meeting attendance tracking

### 3.4 Approvals & Workflows
**Files:** `approvals.spec.ts`, `client-approval-workflows.spec.ts`

**Test Cases:**
- ⬜ Submit item for approval
- ⬜ Multi-level approval chain
- ⬜ Approve/reject items
- ⬜ Approval notifications
- ⬜ Conditional approval workflows
- ⬜ Client portal approval

### 3.5 Subcontractor Portal
**Files:** `subcontractor-portal.spec.ts`

**Test Cases:**
- ⬜ Subcontractor login
- ⬜ View assigned work
- ⬜ Update work status
- ⬜ Submit subcontractor reports
- ⬜ View project documents
- ⬜ Respond to punch items

### 3.6 Checklists & Templates
**Files:** `checklists.spec.ts`

**Test Cases:**
- ⬜ Create checklist
- ⬜ Use checklist template
- ⬜ Complete checklist items
- ⬜ Checklist progress tracking
- ⬜ Save checklist as template

### 3.7 DocuSign Integration
**Files:** `docusign.spec.ts`

**Test Cases:**
- ⬜ Send document for signature
- ⬜ Track signature status
- ⬜ Receive signed document
- ⬜ Store signed document

### 3.8 Settings & Configuration
**Files:** `settings.spec.ts`

**Test Cases:**
- ⬜ Update user profile
- ⬜ Change password
- ⬜ Notification preferences
- ⬜ Theme settings
- ⬜ Language preferences
- ⬜ Project settings
- ⬜ Permission management

---

## Phase 4: User Experience Testing (PRIORITY: MEDIUM)

**Objective:** Ensure excellent user experience across devices and contexts

### 4.1 Search & Navigation
**Files:** `search-navigation.spec.ts`

**Test Cases:**
- ⬜ Global search functionality
- ⬜ Search autocomplete
- ⬜ Filter search results
- ⬜ Recent searches
- ⬜ Breadcrumb navigation
- ⬜ Quick navigation shortcuts
- ⬜ Back/forward browser navigation

### 4.2 Workflows
**Files:** `workflows.spec.ts`

**Test Cases:**
- ⬜ Create custom workflow
- ⬜ Workflow triggers
- ⬜ Workflow automation
- ⬜ Workflow notifications
- ⬜ Edit workflow
- ⬜ Disable workflow

### 4.3 Theme & Dark Mode
**Files:** `theme/theme-functionality.spec.ts`

**Test Cases:**
- ⬜ Toggle dark mode
- ⬜ System theme preference detection
- ⬜ Theme persistence
- ⬜ Theme applies to all pages
- ⬜ Smooth theme transitions

---

## Phase 5: Visual & Accessibility Testing (PRIORITY: MEDIUM)

**Objective:** Ensure visual consistency and accessibility compliance

### 5.1 Visual Regression Testing
**Files:**
- `visual-regression.spec.ts`
- `visual-regression/blueprint-variants-visual.spec.ts`
- `visual-regression/dark-mode-comprehensive.spec.ts`

**Test Cases:**
- ⬜ Screenshot baseline for all major pages
- ⬜ Light mode visual regression
- ⬜ Dark mode visual regression
- ⬜ Component visual consistency
- ⬜ Blueprint variant rendering
- ⬜ Responsive breakpoint visuals
- ⬜ Animation states

**Special Considerations:**
- Update baselines after intentional design changes
- Set appropriate pixel tolerance
- Test across browsers for rendering differences

### 5.2 Accessibility (WCAG Compliance)
**Files:**
- `PolishedVariant1Professional.a11y.spec.ts`
- `accessibility/dark-mode-contrast.spec.ts`
- `accessibility/dark-mode-states.spec.ts`

**Test Cases:**
- ⬜ Keyboard navigation
- ⬜ Screen reader compatibility
- ⬜ Color contrast ratios (WCAG AA)
- ⬜ Focus indicators
- ⬜ ARIA labels and roles
- ⬜ Form accessibility
- ⬜ Alt text for images
- ⬜ Skip links
- ⬜ Dark mode contrast compliance

**Tools:**
- @axe-core/playwright
- wcag-contrast package

---

## Phase 6: Cross-Browser & Device Testing (PRIORITY: MEDIUM-LOW)

**Objective:** Ensure compatibility across all target platforms

### 6.1 Desktop Browsers
**Test Matrix:**
- ✅ Chromium (Desktop Chrome)
- ✅ Firefox
- ✅ WebKit (Desktop Safari)
- ⬜ Microsoft Edge
- ⬜ Google Chrome (branded)

**Focus Areas:**
- ⬜ Core functionality in all browsers
- ⬜ CSS rendering consistency
- ⬜ JavaScript API compatibility
- ⬜ PDF viewer compatibility
- ⬜ File upload/download

### 6.2 Mobile Devices
**Test Matrix:**
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)
- ⬜ Tablet (iPad)
- ⬜ Android tablet

**Focus Areas:**
- ⬜ Touch interactions
- ⬜ Mobile navigation
- ⬜ Camera integration
- ⬜ Geolocation
- ⬜ Mobile forms
- ⬜ Responsive layouts

### 6.3 Responsive Design
**Files:** `blueprint-variants-responsive.spec.ts`

**Test Cases:**
- ⬜ Mobile viewport (320px-767px)
- ⬜ Tablet viewport (768px-1023px)
- ⬜ Desktop viewport (1024px+)
- ⬜ Ultra-wide viewport (1920px+)
- ⬜ Orientation changes (portrait/landscape)

---

## Phase 7: Performance Testing (PRIORITY: MEDIUM-LOW)

**Objective:** Ensure application performs well under load

### 7.1 Page Load Performance
**Files:** `performance/blueprint-variants-perf.spec.ts`

**Test Cases:**
- ⬜ First Contentful Paint (FCP) < 1.8s
- ⬜ Largest Contentful Paint (LCP) < 2.5s
- ⬜ Time to Interactive (TTI) < 3.8s
- ⬜ Total Blocking Time (TBT) < 200ms
- ⬜ Cumulative Layout Shift (CLS) < 0.1

### 7.2 Runtime Performance
**Test Cases:**
- ⬜ Smooth scrolling (60fps)
- ⬜ Animation performance
- ⬜ Large list rendering
- ⬜ Image loading optimization
- ⬜ Memory leak detection

### 7.3 Network Performance
**Test Cases:**
- ⬜ Fast 3G network simulation
- ⬜ Slow network resilience
- ⬜ Request batching
- ⬜ Caching effectiveness
- ⬜ Bundle size optimization

---

## Phase 8: Edge Cases & Error Handling (PRIORITY: LOW)

**Objective:** Validate application behavior in unusual scenarios

### 8.1 Blueprint Variants Edge Cases
**Files:** `blueprint-variants-edge-cases.spec.ts`

**Test Cases:**
- ⬜ Empty states
- ⬜ Maximum data scenarios
- ⬜ Special characters in input
- ⬜ Very long text content
- ⬜ Concurrent user editing

### 8.2 Error States
**Test Cases:**
- ⬜ Network failure handling
- ⬜ API error responses
- ⬜ Invalid form submissions
- ⬜ File upload failures
- ⬜ Session expiration
- ⬜ 404 page handling
- ⬜ 500 error handling

### 8.3 Data Validation
**Test Cases:**
- ⬜ Form validation messages
- ⬜ Date range validation
- ⬜ File type validation
- ⬜ File size limits
- ⬜ Required field enforcement
- ⬜ Email format validation

### 8.4 PDF Viewer Fixes
**Files:** `pdf-viewer-fixes.spec.ts`

**Test Cases:**
- ⬜ Load PDF successfully
- ⬜ Navigate PDF pages
- ⬜ Zoom PDF
- ⬜ Download PDF
- ⬜ PDF annotation tools
- ⬜ Handle corrupted PDFs

---

## Phase 9: Screenshot Generation & Marketing (PRIORITY: LOW)

**Objective:** Generate assets for app stores and marketing

**Files:** `generate-app-store-screenshots.spec.ts`

**Test Cases:**
- ⬜ iPhone Pro Max screenshots (6.5")
- ⬜ iPad Pro screenshots (12.9")
- ⬜ Android phone screenshots
- ⬜ Android tablet screenshots
- ⬜ Feature highlight screenshots
- ⬜ Dark mode screenshots

---

## Test Execution Strategy

### Continuous Integration (CI)

**On Every Commit:**
- Phase 1: Critical Path (Chromium only, fast execution)
- Unit tests
- TypeScript type checking
- Linting

**On Pull Request:**
- Phase 1: Critical Path (All browsers)
- Phase 2: Feature Completeness (Chromium only)
- Visual regression (with baseline comparison)

**Nightly Builds:**
- All phases (comprehensive)
- All browsers and devices
- Performance benchmarking
- Accessibility audits

### Local Development

**Before Committing:**
```bash
npm run test:unit
npm run type-check
npm run lint
npm run test:e2e:chromium  # Quick smoke test
```

**Feature Development:**
```bash
npm run test:e2e:ui  # Run specific tests in UI mode
npm run test:e2e:headed  # Watch tests run
npm run test:e2e:debug  # Debug specific test
```

---

## Test Data Management

### Seed Data Strategy
**Scripts:**
- `seed:test` - Create minimal test data
- `seed:test-users` - Create test users with different roles
- `seed:all` - Complete test dataset

### Test User Roles
1. **Admin User** - Full permissions
2. **Superintendent** - Project management
3. **Foreman** - Field reporting
4. **Subcontractor** - Limited access
5. **Client** - View-only access

### Test Projects
1. **Active Project** - Ongoing work
2. **Completed Project** - Historical data
3. **Complex Project** - Large dataset for performance testing
4. **Empty Project** - Minimal data for edge cases

---

## Success Metrics

### Coverage Goals
- **Phase 1:** 100% coverage (non-negotiable)
- **Phase 2:** 90% coverage
- **Phase 3:** 80% coverage
- **Phase 4-9:** 70% coverage

### Performance Benchmarks
- **Test execution time:** < 15 minutes for critical path
- **Flaky test rate:** < 2%
- **Test maintenance time:** < 10% of development time

### Quality Gates
- All Phase 1 tests must pass before merge
- No more than 2 skipped tests in critical path
- Visual regression changes require manual approval

---

## Maintenance & Evolution

### Weekly
- Review flaky tests
- Update test data as needed
- Check for new features requiring tests

### Monthly
- Review test coverage metrics
- Update visual regression baselines
- Performance benchmark review
- Browser version compatibility check

### Quarterly
- Comprehensive test suite audit
- Refactor duplicated test code
- Update testing documentation
- Review and update test priorities

---

## Quick Reference Commands

```bash
# Run all critical tests (Phase 1)
npx playwright test auth.spec.ts projects.spec.ts daily-reports.spec.ts documents.spec.ts

# Run by phase
npx playwright test --grep "@phase1"  # If using tags
npx playwright test --grep "@critical"

# Run feature-specific tests (Phase 2)
npx playwright test rfis.spec.ts submittals.spec.ts change-orders.spec.ts

# Run accessibility tests (Phase 5)
npm run test:dark-mode
npx playwright test e2e/accessibility/

# Run visual regression (Phase 5)
npm run test:visual
npm run test:visual:update  # Update baselines

# Run performance tests (Phase 7)
npx playwright test e2e/performance/

# Mobile testing (Phase 6)
npm run test:e2e:mobile
npx playwright test --project="Mobile Chrome"

# Generate screenshots (Phase 9)
npx playwright test generate-app-store-screenshots.spec.ts
```

---

## Current Status Summary

**Total Test Files:** 42+

**Status by Phase:**
- ✅ Phase 0: Complete
- 🟡 Phase 1: In Progress (30%)
- ⬜ Phase 2: Not Started
- ⬜ Phase 3: Not Started
- ⬜ Phase 4: Not Started
- 🟡 Phase 5: Partial (test files exist, need full coverage)
- ✅ Phase 6: Infrastructure ready (browser configs set)
- 🟡 Phase 7: Partial (some performance tests exist)
- ⬜ Phase 8: Not Started
- ✅ Phase 9: Infrastructure ready

**Next Actions:**
1. Complete Phase 1 critical path tests
2. Implement test tagging for phase organization
3. Set up CI pipeline with phased execution
4. Create test data seeding strategy
5. Document test patterns and helpers

---

## Appendix: Test File Organization

```
e2e/
├── Phase 1 - Critical Path
│   ├── auth.spec.ts
│   ├── auth-biometric.spec.ts
│   ├── projects.spec.ts
│   ├── daily-reports.spec.ts
│   ├── daily-reports-v2.spec.ts
│   └── documents.spec.ts
│
├── Phase 2 - Feature Completeness
│   ├── rfis.spec.ts
│   ├── submittals.spec.ts
│   ├── change-orders.spec.ts
│   ├── schedule.spec.ts
│   ├── tasks.spec.ts
│   ├── action-items.spec.ts
│   ├── safety-incidents.spec.ts
│   ├── inspections.spec.ts
│   ├── punch-lists.spec.ts
│   └── quality-control.spec.ts
│
├── Phase 3 - Advanced Features
│   ├── offline.spec.ts
│   ├── photo-progress.spec.ts
│   ├── meetings.spec.ts
│   ├── approvals.spec.ts
│   ├── client-approval-workflows.spec.ts
│   ├── subcontractor-portal.spec.ts
│   ├── checklists.spec.ts
│   ├── docusign.spec.ts
│   └── settings.spec.ts
│
├── Phase 4 - User Experience
│   ├── search-navigation.spec.ts
│   ├── workflows.spec.ts
│   └── theme/theme-functionality.spec.ts
│
├── Phase 5 - Visual & Accessibility
│   ├── visual-regression.spec.ts
│   ├── visual-regression/
│   │   ├── blueprint-variants-visual.spec.ts
│   │   └── dark-mode-comprehensive.spec.ts
│   ├── accessibility/
│   │   ├── dark-mode-contrast.spec.ts
│   │   └── dark-mode-states.spec.ts
│   └── PolishedVariant1Professional.a11y.spec.ts
│
├── Phase 6 - Cross-Browser (configured in playwright.config.ts)
│   └── blueprint-variants-responsive.spec.ts
│
├── Phase 7 - Performance
│   └── performance/
│       └── blueprint-variants-perf.spec.ts
│
├── Phase 8 - Edge Cases
│   ├── blueprint-variants-edge-cases.spec.ts
│   ├── blueprint-variants-interaction.spec.ts
│   └── pdf-viewer-fixes.spec.ts
│
└── Phase 9 - Screenshots
    └── generate-app-store-screenshots.spec.ts
```

---

## Contact & Support

**Questions or Issues?**
- Review `e2e/README.md` for quick reference
- Check `E2E_TESTING_SETUP.md` for detailed setup
- Consult `playwright.config.ts` for configuration
- Review test helpers in `e2e/helpers/` and `e2e/fixtures/`

**Contributing:**
- Follow existing test patterns
- Add new tests to appropriate phase
- Update this document when adding new test categories
- Ensure all tests pass before submitting PR
