# E2E Test Skip Audit

**Date:** January 17, 2026
**Total Skips:** 1,121
**Affected Files:** 38 of 85 test files (45%)

## Executive Summary

The vast majority of skips (1,117) are **runtime conditional skips** (`test.skip()`) that trigger when expected data isn't available. Only 4 are **permanently disabled test suites** (`test.describe.skip()`).

This is actually healthy - tests skip gracefully rather than fail when no test data exists. However, it masks the fact that many tests never actually run in CI because seeded data may not exist.

---

## Skip Categories

### Category 1: Runtime Conditional Skips (1,117 instances)

These skip when data conditions aren't met:
```typescript
if (!projectVisible) {
  test.skip(true, 'No projects found');
  return;
}
```

**Pattern:** Check if element/data exists → skip if not

**Top files:**
| File | Skip Count | Trigger |
|------|------------|---------|
| bidding.spec.ts | 88 | No bid packages found |
| cost-estimates.spec.ts | 84 | No cost estimates found |
| rfis-v2.spec.ts | 59 | No RFIs/projects found |
| messaging.spec.ts | 46 | No messages/threads found |
| client-portal.spec.ts | 43 | No client portal data |
| notifications.spec.ts | 41 | No notifications found |
| submittals-v2.spec.ts | 40 | No submittals found |
| gantt-chart.spec.ts | 40 | No schedule data |

**Fix Strategy:** Ensure test data is seeded before tests run

---

### Category 2: Permanently Disabled Suites (4 instances)

Located in `e2e/action-items.spec.ts`:
- Line 155: `test.describe.skip('Action Items - CRUD Operations')`
- Line 256: `test.describe.skip('Action Items - Status Management')`
- Line 455: `test.describe.skip('Action Items - Actions')`
- Line 711: `test.describe.skip('Action Items - Error Handling')`

**Reason:** CRUD UI not implemented (dashboard interface missing)

**Fix Strategy:** Enable when action items UI is complete

---

### Category 3: shop-drawings.spec.ts (65 skips)

High skip count but no describe.skip - all conditional on data availability.

---

## Skip Count by File

```
88  e2e/bidding.spec.ts
84  e2e/cost-estimates.spec.ts
65  e2e/shop-drawings.spec.ts (estimated)
59  e2e/rfis-v2.spec.ts
46  e2e/messaging.spec.ts
43  e2e/client-portal.spec.ts
41  e2e/notifications.spec.ts
40  e2e/submittals-v2.spec.ts
40  e2e/gantt-chart.spec.ts
39  e2e/job-costing.spec.ts
34  e2e/calendar-integration.spec.ts
32  e2e/ai-features.spec.ts
31  e2e/schedule.spec.ts
30  e2e/permissions.spec.ts
30  e2e/action-items.spec.ts
29  e2e/project-templates.spec.ts
27  e2e/punch-lists.spec.ts
27  e2e/look-ahead.spec.ts
25  e2e/safety-incidents.spec.ts
23  e2e/inspections.spec.ts
21  e2e/onboarding.spec.ts
20  e2e/workflow-automation.spec.ts
20  e2e/project-settings.spec.ts
17  e2e/profile.spec.ts
15  e2e/change-orders.spec.ts
14  e2e/visual-regression.spec.ts
14  e2e/closeout.spec.ts
13  e2e/tasks.spec.ts
13  e2e/client-approval-workflows.spec.ts
12  e2e/docusign.spec.ts
10  e2e/contacts.spec.ts
10  e2e/company-settings.spec.ts
10  e2e/checklists.spec.ts
 9  e2e/subcontractor-portal.spec.ts
 8  e2e/approvals.spec.ts
 6  e2e/workflows.spec.ts
 6  e2e/site-instructions.spec.ts
 6  e2e/client-approval-workflows.spec.ts
 4  e2e/settings.spec.ts
 3  e2e/search-navigation.spec.ts
 2  e2e/registration.spec.ts
 2  e2e/documents.spec.ts
 2  e2e/change-orders.spec.ts
 1  e2e/daily-reports.spec.ts
```

---

## Recommended Actions

### Priority 1: Seed Test Data (Target: -500 skips)

Create a comprehensive test data seeding script that runs before E2E tests:

1. **Create at least 1 project** with all related entities:
   - Daily reports
   - RFIs, Submittals
   - Bid packages with bidders
   - Punch lists, Tasks
   - Schedule/Gantt data
   - Cost estimates
   - Messages/notifications

2. **Enhance global-setup.ts** to verify data exists:
   ```typescript
   // In global-setup.ts
   async function ensureTestDataExists() {
     const { data: projects } = await supabase
       .from('projects')
       .select('id')
       .limit(1);

     if (!projects?.length) {
       await seedTestProject();
     }
   }
   ```

3. **Create seed script**: `npm run seed:e2e`

### Priority 2: Enable Action Items Tests (Target: -4 describe.skip)

When action items CRUD UI is ready:
1. Remove `test.describe.skip` from action-items.spec.ts
2. Update tests to match actual UI
3. Add to CI smoke tests

### Priority 3: Add Skip Reasons

For remaining conditional skips, add reason messages:
```typescript
// Before
test.skip()

// After
test.skip(true, 'No projects available - run npm run seed:e2e')
```

### Priority 4: Track Skip Metrics in CI

Add to CI workflow:
```yaml
- name: Count skipped tests
  run: |
    SKIP_COUNT=$(grep -r "test.skip" e2e/*.spec.ts | wc -l)
    echo "Skipped tests: $SKIP_COUNT"
    if [ $SKIP_COUNT -gt 1200 ]; then
      echo "::warning::Skip count increased above threshold"
    fi
```

---

## Files That Should Never Skip (Core Flows)

These files should have 0 skips after seeding:
- [x] auth.spec.ts - Authentication flow
- [ ] daily-reports.spec.ts (1 skip - data dependent)
- [ ] projects.spec.ts - Project CRUD
- [ ] rfis.spec.ts - RFI workflow
- [ ] tasks.spec.ts - Task management

---

## Implementation Progress

### Completed
1. [x] Created test data verification utility (`e2e/utils/test-data-verification.ts`)
2. [x] Integrated data verification into `global-setup.ts` (set `VERIFY_TEST_DATA=true`)
3. [x] Added standardized skip reasons to `test-helpers.ts` (`SKIP_REASONS`)
4. [x] Updated rfis.spec.ts with standard skip reasons
5. [x] Updated daily-reports.spec.ts with standard skip reasons

### In Progress
6. [ ] Update remaining high-skip files with standard skip reasons
7. [ ] Fix flaky tests (messaging, notifications)

### Remaining
8. [ ] Run full E2E suite and measure skip reduction
9. [ ] Create CI workflow for skip count tracking
10. [ ] Update this document with final results

---

## New Files Created

| File | Purpose |
|------|---------|
| `e2e/utils/test-data-verification.ts` | Verifies test data exists before tests run |
| `e2e/SKIP_AUDIT.md` | This document |

## Modified Files

| File | Changes |
|------|---------|
| `e2e/global-setup.ts` | Added optional test data verification |
| `e2e/helpers/test-helpers.ts` | Added SKIP_REASONS constants and skipWithReason helper |
| `e2e/rfis.spec.ts` | Using standardized skip reasons |
| `e2e/daily-reports.spec.ts` | Using standardized skip reasons |
| `e2e/punch-lists.spec.ts` | Using standardized skip reasons (27 skips updated) |
| `e2e/tasks.spec.ts` | Using standardized skip reasons (13 skips updated) |
| `e2e/README.md` | Added skip policy documentation |

---

## How to Use New Features

### 1. Enable Test Data Verification

Add to `.env.test`:
```bash
VERIFY_TEST_DATA=true
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Use Standardized Skip Reasons

```typescript
import { SKIP_REASONS } from './helpers/test-helpers';

// Instead of:
test.skip(true, 'No projects found');

// Use:
test.skip(true, SKIP_REASONS.NO_PROJECTS);
```

### 3. Run Tests with Seeding

```bash
npm run test:e2e:seed  # Seeds data then runs tests
```
