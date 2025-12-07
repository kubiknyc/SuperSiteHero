# Autonomous E2E Testing Plan with Playwright

## Overview

This plan outlines a comprehensive autonomous testing strategy using Playwright for the Construction Management Platform. The tests are organized by feature phases to ensure systematic coverage.

---

## Phase 1: Testing Infrastructure Setup

### 1.1 Configuration Enhancements
- [ ] Update `playwright.config.ts` with autonomous test runner settings
- [ ] Configure parallel execution (4 workers for CI, 2 for local)
- [ ] Set up automatic retry on failure (2 retries)
- [ ] Configure screenshot and video capture on failure
- [ ] Enable trace collection for debugging

### 1.2 Test Reporter Setup
- [ ] HTML report with full test details
- [ ] JSON report for CI integration
- [ ] JUnit XML for test management tools
- [ ] Custom Slack/Teams notification on failure

### 1.3 Environment Configuration
```bash
# Required environment variables
TEST_USER_EMAIL=test@supersitehero.com
TEST_USER_PASSWORD=TestPassword123!
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Phase 2: Authentication Tests (Priority: CRITICAL)

### Location: `tests/e2e/auth/`

### 2.1 Login Flow Tests
| Test | Description | Status |
|------|-------------|--------|
| `login-valid-credentials` | Login with valid email/password | Exists |
| `login-invalid-email` | Reject invalid email format | Exists |
| `login-wrong-password` | Show error for wrong password | Exists |
| `login-empty-fields` | Validate required fields | Exists |
| `login-remember-me` | Test session persistence | To Add |
| `login-rate-limiting` | Test brute force protection | To Add |

### 2.2 Session Management Tests
| Test | Description | Status |
|------|-------------|--------|
| `session-persistence` | Session survives refresh | Exists |
| `session-expiry` | Redirect on expired session | To Add |
| `session-logout` | Complete logout flow | Exists |
| `session-multi-tab` | Sync across tabs | To Add |

### 2.3 Password Reset Tests
| Test | Description | Status |
|------|-------------|--------|
| `forgot-password-request` | Request reset email | To Add |
| `reset-password-link` | Valid reset link flow | To Add |
| `reset-password-expired` | Expired link handling | To Add |

### 2.4 Role-Based Access Tests
| Test | Description | Status |
|------|-------------|--------|
| `role-superintendent` | Full access verification | To Add |
| `role-project-manager` | PM permissions | To Add |
| `role-field-employee` | Limited access | To Add |
| `role-subcontractor` | Portal-only access | To Add |
| `role-client` | Read-only access | To Add |

---

## Phase 3: Core CRUD Operations (Priority: HIGH)

### Location: `tests/e2e/crud/`

### 3.1 Projects CRUD
| Test | Description | Status |
|------|-------------|--------|
| `project-create` | Create new project | Exists |
| `project-read-list` | List all projects | Exists |
| `project-read-detail` | View project details | Exists |
| `project-update` | Edit project info | Exists |
| `project-delete` | Delete project | Exists |
| `project-archive` | Archive project | Exists |
| `project-search` | Search/filter projects | Exists |
| `project-sort` | Sort by columns | Exists |
| `project-pagination` | Paginate results | Exists |

### 3.2 Daily Reports CRUD
| Test | Description | Status |
|------|-------------|--------|
| `daily-report-create` | Create new report | Exists |
| `daily-report-weather-autofill` | Auto-fill weather from location | To Add |
| `daily-report-workforce` | Add workforce entries | Exists |
| `daily-report-equipment` | Add equipment entries | Exists |
| `daily-report-photos` | Add photos with GPS | Exists |
| `daily-report-signature` | Add signature | To Add |
| `daily-report-template-save` | Save as template | To Add |
| `daily-report-template-apply` | Apply template | To Add |
| `daily-report-duplicate-check` | Detect duplicates | To Add |
| `daily-report-print` | Print view | To Add |
| `daily-report-export-pdf` | Export to PDF | Exists |
| `daily-report-export-csv` | Batch export to CSV | To Add |
| `daily-report-version-history` | View history | To Add |

### 3.3 Tasks CRUD
| Test | Description | Status |
|------|-------------|--------|
| `task-create` | Create new task | Exists |
| `task-assign` | Assign to user | Exists |
| `task-status-change` | Update status | Exists |
| `task-due-date` | Set/change due date | Exists |
| `task-priority` | Set priority | Exists |
| `task-comments` | Add comments | To Add |
| `task-attachments` | Add attachments | To Add |

### 3.4 Contacts CRUD
| Test | Description | Status |
|------|-------------|--------|
| `contact-create` | Create contact | Exists |
| `contact-types` | Different contact types | Exists |
| `contact-search` | Search contacts | Exists |
| `contact-import` | Bulk import | To Add |
| `contact-export` | Export contacts | To Add |

### 3.5 Punch Lists CRUD
| Test | Description | Status |
|------|-------------|--------|
| `punch-create` | Create punch item | Exists |
| `punch-assign` | Assign to trade | Exists |
| `punch-status` | Update status | Exists |
| `punch-photos` | Before/after photos | Exists |
| `punch-close` | Close item | Exists |
| `punch-bulk-actions` | Bulk operations | To Add |

### 3.6 Checklists CRUD
| Test | Description | Status |
|------|-------------|--------|
| `checklist-template-create` | Create template | Exists |
| `checklist-execute` | Execute checklist | Exists |
| `checklist-progress` | Track progress | Exists |
| `checklist-sign-off` | Sign off completion | To Add |

---

## Phase 4: Workflow Tests (Priority: HIGH)

### Location: `tests/e2e/workflows/`

### 4.1 RFI Workflow
| Test | Description | Status |
|------|-------------|--------|
| `rfi-create-submit` | Create and submit RFI | Exists |
| `rfi-assign-reviewer` | Assign for review | Exists |
| `rfi-respond` | Add response | Exists |
| `rfi-approve` | Approve RFI | Exists |
| `rfi-reject` | Reject with comments | Exists |
| `rfi-resubmit` | Resubmit after rejection | To Add |
| `rfi-close` | Close RFI | Exists |
| `rfi-notifications` | Email notifications | To Add |
| `rfi-overdue-alerts` | Overdue tracking | To Add |

### 4.2 Submittal Workflow
| Test | Description | Status |
|------|-------------|--------|
| `submittal-create` | Create submittal | Exists |
| `submittal-upload-docs` | Upload documents | Exists |
| `submittal-submit-review` | Submit for review | Exists |
| `submittal-approve` | Approve submittal | Exists |
| `submittal-reject` | Reject submittal | Exists |
| `submittal-revise` | Revise and resubmit | Exists |
| `submittal-spec-tracking` | CSI spec tracking | To Add |

### 4.3 Change Order Workflow
| Test | Description | Status |
|------|-------------|--------|
| `co-create` | Create change order | Exists |
| `co-cost-impact` | Calculate cost impact | Exists |
| `co-schedule-impact` | Calculate schedule impact | Exists |
| `co-approval-chain` | Multi-level approval | Exists |
| `co-approve` | Approve CO | Exists |
| `co-reject` | Reject CO | Exists |
| `co-notifications` | Stakeholder notifications | To Add |

### 4.4 Approval Workflows
| Test | Description | Status |
|------|-------------|--------|
| `approval-pending-list` | View pending approvals | Exists |
| `approval-single` | Single approver flow | Exists |
| `approval-multi` | Multi-approver flow | To Add |
| `approval-delegation` | Delegate approval | To Add |
| `approval-escalation` | Auto-escalation | To Add |

---

## Phase 5: Document Management Tests (Priority: MEDIUM-HIGH)

### Location: `tests/e2e/documents/`

### 5.1 Document Library
| Test | Description | Status |
|------|-------------|--------|
| `doc-upload-single` | Upload single document | Exists |
| `doc-upload-multiple` | Upload multiple docs | Exists |
| `doc-upload-large` | Upload large file | To Add |
| `doc-folder-structure` | Create folders | Exists |
| `doc-move` | Move documents | Exists |
| `doc-search` | Search documents | Exists |
| `doc-filter-type` | Filter by type | Exists |
| `doc-version-upload` | Upload new version | Exists |
| `doc-version-history` | View version history | Exists |
| `doc-download` | Download document | Exists |
| `doc-bulk-download` | Bulk download | To Add |

### 5.2 PDF Viewer
| Test | Description | Status |
|------|-------------|--------|
| `pdf-view` | View PDF document | Exists |
| `pdf-zoom` | Zoom in/out | Exists |
| `pdf-navigate` | Navigate pages | Exists |
| `pdf-search-text` | Search in PDF | To Add |
| `pdf-print` | Print PDF | To Add |

### 5.3 Drawing Markup
| Test | Description | Status |
|------|-------------|--------|
| `markup-pen-tool` | Draw with pen | Exists |
| `markup-shapes` | Add shapes | Exists |
| `markup-text` | Add text annotations | Exists |
| `markup-stamps` | Add stamps | To Add |
| `markup-measurements` | Add measurements | To Add |
| `markup-layers` | Manage layers | To Add |
| `markup-save` | Save markup | Exists |
| `markup-share` | Share markup | To Add |
| `markup-history` | Undo/redo | Exists |

### 5.4 Document Comparison
| Test | Description | Status |
|------|-------------|--------|
| `compare-side-by-side` | Side-by-side view | To Add |
| `compare-overlay` | Overlay comparison | To Add |
| `compare-highlight-diff` | Highlight differences | To Add |

---

## Phase 6: Safety & Inspections Tests (Priority: MEDIUM)

### Location: `tests/e2e/safety/`

### 6.1 Safety Incidents
| Test | Description | Status |
|------|-------------|--------|
| `incident-report` | Report incident | Exists |
| `incident-severity` | Set severity level | Exists |
| `incident-photos` | Add incident photos | Exists |
| `incident-witnesses` | Add witnesses | Exists |
| `incident-investigation` | Investigation workflow | To Add |
| `incident-corrective-action` | Add corrective actions | To Add |
| `incident-close` | Close incident | Exists |

### 6.2 Inspections
| Test | Description | Status |
|------|-------------|--------|
| `inspection-schedule` | Schedule inspection | Exists |
| `inspection-execute` | Execute inspection | Exists |
| `inspection-checklist` | Complete checklist | Exists |
| `inspection-deficiencies` | Log deficiencies | Exists |
| `inspection-photos` | Add photos | Exists |
| `inspection-signature` | Capture signature | To Add |
| `inspection-report` | Generate report | Exists |
| `inspection-reinspect` | Schedule re-inspection | To Add |

### 6.3 Permits
| Test | Description | Status |
|------|-------------|--------|
| `permit-create` | Create permit | Exists |
| `permit-upload-doc` | Upload permit document | Exists |
| `permit-expiry-track` | Track expiration | Exists |
| `permit-renewal` | Renewal workflow | To Add |
| `permit-alerts` | Expiry alerts | To Add |

---

## Phase 7: Materials & Equipment Tests (Priority: MEDIUM)

### Location: `tests/e2e/materials/`

### 7.1 Material Receiving
| Test | Description | Status |
|------|-------------|--------|
| `material-receive` | Receive material | Exists |
| `material-quantity` | Verify quantity | Exists |
| `material-quality` | Quality inspection | Exists |
| `material-photos` | Delivery photos | Exists |
| `material-damage` | Report damage | Exists |
| `material-return` | Return material | To Add |
| `material-inventory` | Track inventory | To Add |

### 7.2 Equipment Tracking
| Test | Description | Status |
|------|-------------|--------|
| `equipment-add` | Add equipment | To Add |
| `equipment-assign` | Assign to project | To Add |
| `equipment-hours` | Track hours | To Add |
| `equipment-maintenance` | Maintenance schedule | To Add |
| `equipment-transfer` | Transfer between projects | To Add |

---

## Phase 8: Communication Tests (Priority: MEDIUM)

### Location: `tests/e2e/communication/`

### 8.1 Messaging
| Test | Description | Status |
|------|-------------|--------|
| `message-send` | Send message | To Add |
| `message-receive` | Receive realtime | To Add |
| `message-thread` | Thread replies | To Add |
| `message-attachments` | Send attachments | To Add |
| `message-read-receipts` | Read receipts | To Add |
| `message-search` | Search messages | To Add |
| `message-priority` | Priority messages | To Add |

### 8.2 Notifications
| Test | Description | Status |
|------|-------------|--------|
| `notification-receive` | Receive notification | Exists |
| `notification-read` | Mark as read | Exists |
| `notification-preferences` | Set preferences | To Add |
| `notification-email` | Email notifications | To Add |

### 8.3 Meetings
| Test | Description | Status |
|------|-------------|--------|
| `meeting-schedule` | Schedule meeting | Exists |
| `meeting-invite` | Send invites | Exists |
| `meeting-agenda` | Create agenda | Exists |
| `meeting-minutes` | Record minutes | To Add |
| `meeting-action-items` | Track action items | To Add |

### 8.4 Notices
| Test | Description | Status |
|------|-------------|--------|
| `notice-create` | Create notice | Exists |
| `notice-distribute` | Distribute to recipients | Exists |
| `notice-acknowledge` | Track acknowledgments | To Add |

---

## Phase 9: Offline Functionality Tests (Priority: CRITICAL)

### Location: `tests/e2e/offline/`

### 9.1 Offline Detection
| Test | Description | Status |
|------|-------------|--------|
| `offline-detect` | Detect offline status | Exists |
| `offline-indicator` | Show offline indicator | Exists |
| `offline-reconnect` | Handle reconnection | Exists |

### 9.2 Offline CRUD
| Test | Description | Status |
|------|-------------|--------|
| `offline-create-report` | Create report offline | Exists |
| `offline-create-punch` | Create punch item offline | Exists |
| `offline-create-task` | Create task offline | Exists |
| `offline-edit-data` | Edit existing data | Exists |
| `offline-delete-data` | Queue delete for sync | Exists |

### 9.3 Sync Queue
| Test | Description | Status |
|------|-------------|--------|
| `sync-queue-add` | Add to sync queue | Exists |
| `sync-queue-display` | Display pending items | Exists |
| `sync-process` | Process sync queue | Exists |
| `sync-conflict-detect` | Detect conflicts | Exists |
| `sync-conflict-resolve` | Resolve conflicts | Exists |
| `sync-retry-failed` | Retry failed items | Exists |

### 9.4 Data Persistence
| Test | Description | Status |
|------|-------------|--------|
| `persist-indexeddb` | Store in IndexedDB | Exists |
| `persist-localstorage` | Store in localStorage | Exists |
| `persist-recover` | Recover on reload | Exists |

### 9.5 Service Worker
| Test | Description | Status |
|------|-------------|--------|
| `sw-install` | Install service worker | Exists |
| `sw-cache-assets` | Cache static assets | Exists |
| `sw-cache-api` | Cache API responses | Exists |
| `sw-update` | Handle SW updates | To Add |

---

## Phase 10: Quality Assurance Tests (Priority: MEDIUM)

### Location: `tests/e2e/quality/`

### 10.1 Performance Tests
| Test | Description | Status |
|------|-------------|--------|
| `perf-initial-load` | Initial page load < 3s | Exists |
| `perf-navigation` | Navigation < 500ms | Exists |
| `perf-large-list` | 100+ item list render | Exists |
| `perf-search` | Search response < 200ms | To Add |
| `perf-api-response` | API response times | To Add |
| `perf-memory-leak` | Memory leak detection | To Add |

### 10.2 Accessibility Tests
| Test | Description | Status |
|------|-------------|--------|
| `a11y-keyboard-nav` | Keyboard navigation | Exists |
| `a11y-screen-reader` | Screen reader compat | Exists |
| `a11y-color-contrast` | Color contrast | Exists |
| `a11y-focus-visible` | Focus indicators | Exists |
| `a11y-aria-labels` | ARIA labels | Exists |
| `a11y-form-labels` | Form field labels | Exists |

### 10.3 Responsive Design
| Test | Description | Status |
|------|-------------|--------|
| `responsive-mobile` | Mobile layout | Exists |
| `responsive-tablet` | Tablet layout | Exists |
| `responsive-desktop` | Desktop layout | Exists |
| `responsive-menu` | Mobile menu | Exists |
| `responsive-tables` | Table responsiveness | Exists |

### 10.4 Browser Compatibility
| Test | Description | Status |
|------|-------------|--------|
| `browser-chromium` | Chrome/Edge | Exists |
| `browser-firefox` | Firefox | Exists |
| `browser-webkit` | Safari | Exists |
| `browser-mobile-chrome` | Mobile Chrome | Exists |
| `browser-mobile-safari` | Mobile Safari | Exists |

### 10.5 Error Handling
| Test | Description | Status |
|------|-------------|--------|
| `error-404` | 404 page | Exists |
| `error-500` | Server error handling | Exists |
| `error-network` | Network error handling | Exists |
| `error-validation` | Form validation errors | Exists |
| `error-boundary` | React error boundary | To Add |

---

## Phase 11: Portal Tests (Priority: LOW-MEDIUM)

### Location: `tests/e2e/portals/`

### 11.1 Client Portal
| Test | Description | Status |
|------|-------------|--------|
| `client-login` | Client login | Exists |
| `client-view-project` | View project status | Exists |
| `client-view-photos` | View progress photos | Exists |
| `client-view-reports` | View reports | Exists |
| `client-no-edit` | Cannot edit data | Exists |

### 11.2 Subcontractor Portal
| Test | Description | Status |
|------|-------------|--------|
| `sub-login` | Subcontractor login | Exists |
| `sub-view-assigned` | View assigned work | Exists |
| `sub-update-status` | Update work status | Exists |
| `sub-submit-docs` | Submit documents | To Add |
| `sub-view-schedule` | View schedule | To Add |

---

## Autonomous Test Runner Configuration

### Continuous Integration Script

```yaml
# .github/workflows/e2e-autonomous.yml
name: Autonomous E2E Tests

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  critical-tests:
    name: Critical Path Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run Critical Tests
        run: |
          npx playwright test \
            tests/e2e/auth/*.spec.ts \
            tests/e2e/offline/*.spec.ts \
            --project=chromium \
            --reporter=html,json
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: critical-test-results
          path: playwright-report/

  crud-tests:
    name: CRUD Tests
    needs: critical-tests
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run CRUD Tests
        run: npx playwright test tests/e2e/*-crud.spec.ts --project=chromium

  workflow-tests:
    name: Workflow Tests
    needs: critical-tests
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run Workflow Tests
        run: npx playwright test tests/e2e/*-workflow.spec.ts --project=chromium

  feature-tests:
    name: Feature Tests
    needs: [crud-tests, workflow-tests]
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run Feature Tests (Shard ${{ matrix.shard }})
        run: |
          npx playwright test \
            --shard=${{ matrix.shard }}/4 \
            --project=chromium

  quality-tests:
    name: Quality Tests
    needs: feature-tests
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      matrix:
        project: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run Quality Tests (${{ matrix.project }})
        run: |
          npx playwright test tests/e2e/quality/*.spec.ts \
            --project=${{ matrix.project }}

  report:
    name: Generate Report
    needs: [quality-tests]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
      - name: Generate Summary
        run: |
          echo "## E2E Test Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          # Parse and summarize results
```

### Local Test Runner Script

```bash
#!/bin/bash
# scripts/run-autonomous-tests.sh

echo "Starting Autonomous E2E Test Suite..."

# Phase 1: Critical Tests
echo "Phase 1: Running Critical Tests..."
npx playwright test tests/e2e/auth/*.spec.ts tests/e2e/offline/*.spec.ts \
  --project=chromium --reporter=list

# Phase 2: CRUD Tests
echo "Phase 2: Running CRUD Tests..."
npx playwright test tests/e2e/*-crud.spec.ts \
  --project=chromium --reporter=list

# Phase 3: Workflow Tests
echo "Phase 3: Running Workflow Tests..."
npx playwright test tests/e2e/*-workflow.spec.ts \
  --project=chromium --reporter=list

# Phase 4: Feature Tests
echo "Phase 4: Running Feature Tests..."
npx playwright test tests/e2e/documents*.spec.ts tests/e2e/safety*.spec.ts \
  tests/e2e/materials*.spec.ts tests/e2e/inspections*.spec.ts \
  --project=chromium --reporter=list

# Phase 5: Quality Tests
echo "Phase 5: Running Quality Tests..."
npx playwright test tests/e2e/quality/*.spec.ts \
  --project=chromium --reporter=list

# Generate Report
echo "Generating HTML Report..."
npx playwright show-report
```

---

## Test Data Management

### Seeding Script
```typescript
// tests/e2e/setup/autonomous-seed.ts
import { createClient } from '@supabase/supabase-js'

export async function seedAutonomousTestData() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create test company
  const { data: company } = await supabase
    .from('companies')
    .upsert({ name: 'Test Company', slug: 'test-company' })
    .select()
    .single()

  // Create test projects
  const projects = [
    { name: 'Test Project Alpha', status: 'active' },
    { name: 'Test Project Beta', status: 'active' },
    { name: 'Test Project Gamma', status: 'on_hold' },
  ]

  for (const project of projects) {
    await supabase.from('projects').upsert({
      ...project,
      company_id: company.id,
      project_number: `PRJ-${Date.now()}`,
    })
  }

  // Create test contacts, documents, etc.
  // ...
}
```

### Cleanup Script
```typescript
// tests/e2e/setup/cleanup.ts
export async function cleanupTestData() {
  // Remove test data created during autonomous runs
  // Preserves seeded baseline data
}
```

---

## Implementation Priority

### Week 1: Foundation
1. Update playwright.config.ts with autonomous settings
2. Create autonomous CI workflow
3. Fill gaps in Phase 2 (Auth) tests
4. Fill gaps in Phase 9 (Offline) tests

### Week 2: Core Features
1. Complete Phase 3 (CRUD) test gaps
2. Complete Phase 4 (Workflow) test gaps
3. Add Daily Reports new feature tests

### Week 3: Extended Features
1. Complete Phase 5 (Documents) tests
2. Complete Phase 6 (Safety) tests
3. Complete Phase 7 (Materials) tests

### Week 4: Communication & Quality
1. Complete Phase 8 (Communication) tests
2. Complete Phase 10 (Quality) tests
3. Complete Phase 11 (Portal) tests

### Week 5: Polish & Automation
1. Implement test data management
2. Add Slack/Teams notifications
3. Create test dashboard
4. Documentation

---

## Test Metrics & Reporting

### Success Criteria
- **Pass Rate**: > 95% for all phases
- **Coverage**: > 80% of critical paths
- **Performance**: Tests complete within timeout
- **Reliability**: < 2% flaky tests

### Dashboard Metrics
- Total tests by phase
- Pass/fail rates over time
- Average execution time
- Flaky test tracking
- Coverage trends

---

## Summary

| Phase | Tests Existing | Tests To Add | Priority |
|-------|---------------|--------------|----------|
| 2. Auth | 8 | 12 | CRITICAL |
| 3. CRUD | 45+ | 20 | HIGH |
| 4. Workflows | 20+ | 10 | HIGH |
| 5. Documents | 25+ | 15 | MEDIUM-HIGH |
| 6. Safety | 15+ | 10 | MEDIUM |
| 7. Materials | 10+ | 10 | MEDIUM |
| 8. Communication | 10+ | 20 | MEDIUM |
| 9. Offline | 20+ | 5 | CRITICAL |
| 10. Quality | 25+ | 10 | MEDIUM |
| 11. Portals | 10+ | 10 | LOW-MEDIUM |
| **Total** | **188+** | **122** | - |

**Estimated Total Tests After Implementation: 310+ comprehensive E2E tests**
