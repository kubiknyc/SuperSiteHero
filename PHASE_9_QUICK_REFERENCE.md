# Phase 9 Testing - Quick Reference Card

**Last Updated:** 2025-12-06

---

## Run Tests

```bash
# Start dev server FIRST
npm run dev

# Run all Phase 9 tests
npx playwright test tests/e2e/offline*.spec.ts tests/e2e/performance-metrics.spec.ts tests/e2e/accessibility.spec.ts --reporter=html

# Run by category
npx playwright test tests/e2e/offline*.spec.ts           # 81 offline tests
npx playwright test tests/e2e/performance-metrics.spec.ts  # 15 performance tests
npx playwright test tests/e2e/accessibility.spec.ts        # 20 accessibility tests

# View report
npx playwright show-report
```

---

## Test Counts

| Category | Tests | Status |
|----------|-------|--------|
| Offline Functionality | 81 | 🟡 17% working |
| Performance Metrics | 15 | 🟢 Ready to run |
| Accessibility | 20 | 🟢 70% working |
| **TOTAL** | **116** | **37% complete** |

---

## What's Working

### Offline ✓
- Reading cached data (projects, reports, tasks)
- IndexedDB storage
- Network state detection
- Basic storage quota tracking

### Performance ✓
- All tests ready to run
- Metrics collection implemented
- Thresholds defined

### Accessibility ✓
- Keyboard navigation
- Form labels
- Heading hierarchy
- Semantic HTML
- ARIA roles

---

## What's Missing

### Offline ✗
- Creating/updating data offline
- Sync queue management
- Conflict resolution
- Service Worker configuration
- Offline indicators

### Performance ⏳
- Need baseline measurement
- No monitoring yet

### Accessibility ⏳
- Color contrast audit needed
- Some buttons < 44px
- Dynamic announcements missing

---

## Priority Fixes

### P1: Critical
1. **Offline Sync Queue** (`src/lib/offline/sync-manager.ts`)
   - Complete queue management
   - Add retry logic
   - Implement sync on reconnect

2. **Service Worker** (`vite.config.ts`)
   ```bash
   npm install vite-plugin-pwa
   ```

3. **Touch Targets** (Components)
   - Increase button sizes to 44x44px
   - Check icon-only buttons

4. **Focus Indicators** (CSS)
   - Add visible focus styles
   - Test keyboard navigation

### P2: High
5. **Conflict Resolution UI** (New component)
   - Design dialog
   - Implement strategies

6. **Performance Monitoring**
   - Set up Sentry
   - Track Core Web Vitals

7. **Offline Indicators** (`src/components/OfflineIndicator.tsx`)
   - Show sync status
   - Display pending count

---

## Files to Modify

### Offline Features
```
src/lib/offline/
├── sync-manager.ts          # Complete sync logic ⚠️
├── message-queue.ts         # Queue implementation ⚠️
└── offline-store.ts         # State management ⚠️

src/components/
└── OfflineIndicator.tsx     # Enhance UI ⚠️

vite.config.ts               # Add PWA plugin ⚠️
```

### Accessibility
```
src/components/ui/
├── button.tsx               # Increase touch targets ⚠️
├── dialog.tsx               # Fix focus trap ⚠️
└── index.ts                 # Export components

global.css                   # Add focus styles ⚠️
```

### Performance
```
vite.config.ts               # Bundle optimization
package.json                 # Add Sentry
sentry.client.config.ts      # Configure monitoring
```

---

## Performance Thresholds

| Metric | Threshold | Current | Status |
|--------|-----------|---------|--------|
| Page Load | < 3s | TBD | ⏳ |
| API Response | < 1s | TBD | ⏳ |
| Bundle Size | < 2 MB | TBD | ⏳ |
| Memory | < 50 MB | TBD | ⏳ |
| TTI | < 3s | TBD | ⏳ |

---

## Accessibility Checklist

### WCAG 2.1 AA
- [x] Keyboard navigation (2.1.1)
- [ ] No keyboard traps (2.1.2)
- [ ] Skip links (2.4.1)
- [x] Focus order (2.4.3)
- [ ] Focus visible (2.4.7)
- [ ] Touch targets 44px (2.5.5)
- [x] Form labels (3.3.2)
- [x] Name, role, value (4.1.2)
- [ ] Status messages (4.1.3)
- [ ] Contrast 4.5:1 (1.4.3)

---

## Quick Commands

```bash
# Run specific test file
npx playwright test tests/e2e/offline-crud.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with debug
npx playwright test --debug

# Generate new test
npx playwright codegen http://localhost:3000

# Update snapshots
npx playwright test --update-snapshots

# Run specific test by name
npx playwright test -g "should create daily report offline"

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## Helper Functions

```typescript
// Offline helpers
import {
  goOffline,
  goOnline,
  getSyncQueue,
  getIndexedDBData,
  isServiceWorkerActive
} from './helpers/offline-helpers';

// UI helpers
import {
  waitForLoadingToComplete,
  waitForContentOrEmptyState,
  openDialog,
  waitForDialog
} from './helpers/ui-helpers';

// Form helpers
import {
  fillFormByName,
  fillAndSubmitDialogForm
} from './helpers/form-helpers';
```

---

## Common Issues

### Tests timeout
**Cause:** Dev server not running
**Fix:** `npm run dev` in separate terminal

### Auth setup fails
**Cause:** Server slow to start
**Fix:** Wait for server, increase timeout in config

### Service Worker tests fail
**Cause:** SW not configured
**Fix:** Install vite-plugin-pwa

### Offline tests skip
**Cause:** Features not implemented
**Fix:** Implement offline CRUD first

---

## Test Writing Tips

### Good Test
```typescript
test('should create item offline', async ({ page }) => {
  // 1. Setup
  await page.goto('/items');
  await waitForLoadingToComplete(page);

  // 2. Go offline
  await goOffline(page);

  // 3. Act
  const createBtn = page.locator('button:has-text("Create")');
  await createBtn.click();
  await fillFormByName(page, { name: 'Test Item' });
  await page.click('button:has-text("Save")');

  // 4. Assert
  const queue = await getSyncQueue(page);
  expect(queue.length).toBeGreaterThan(0);
});
```

### Bad Test
```typescript
test('create item', async ({ page }) => {
  await page.goto('/items');
  await page.waitForTimeout(5000); // ❌ Don't use arbitrary waits
  await page.click('button'); // ❌ Too generic
  // No assertions ❌
});
```

---

## Documentation Links

- **Detailed Report:** [PHASE_9_CROSS_CUTTING_TESTS_REPORT.md](PHASE_9_CROSS_CUTTING_TESTS_REPORT.md)
- **Execution Summary:** [PHASE_9_EXECUTION_SUMMARY.md](PHASE_9_EXECUTION_SUMMARY.md)
- **Coverage Matrix:** [PHASE_9_TEST_COVERAGE_MATRIX.md](PHASE_9_TEST_COVERAGE_MATRIX.md)
- **Playwright Docs:** https://playwright.dev
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/

---

## Getting Help

1. Check test output: `npx playwright show-report`
2. Read error messages carefully
3. Check if dev server is running
4. Review helper functions in `tests/e2e/helpers/`
5. Look at existing working tests for examples

---

## Next Steps

1. ✓ Tests created (DONE)
2. ⏳ Start dev server
3. ⏳ Run tests to get baseline
4. ⏳ Implement P1 fixes
5. ⏳ Re-run tests
6. ⏳ Iterate until 95% pass

---

**Generated:** 2025-12-06
**Maintained:** QA Team
