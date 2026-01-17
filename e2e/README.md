# E2E Testing Guide

End-to-end testing infrastructure for JobSight using [Playwright](https://playwright.dev/).

## Quick Start

```bash
# 1. Install Playwright browsers (first time only)
npx playwright install

# 2. Setup test environment
cp .env.test .env.test.local  # Edit with your credentials

# 3. Run tests
npm run test:e2e
```

## Common Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run in interactive UI mode (recommended for debugging)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Run specific browser only
npm run test:e2e:chromium

# Debug mode with inspector
npm run test:e2e:debug

# Run specific test file
npm run test:e2e -- daily-reports.spec.ts

# Run tests matching pattern
npx playwright test --grep "should create"

# Update visual snapshots
npm run test:visual:update

# View test report
npx playwright show-report
```

## Test Structure

```
e2e/
├── accessibility/          # WCAG accessibility tests (axe-core)
│   ├── accessibility-axe.spec.ts
│   └── dark-mode-*.spec.ts
├── autonomous/             # Smoke crawl and error detection
│   ├── helpers/            # Safe interactor, error collector
│   └── smoke-crawl.spec.ts # Autonomous route testing
├── fixtures/               # Authentication and custom fixtures
│   └── auth.ts             # Multi-role auth helpers
├── helpers/                # Reusable test utilities
│   ├── test-helpers.ts     # Common actions (login, navigate, etc.)
│   └── test-data.ts        # Test data generators
├── pages/                  # Page Object Models
│   ├── RFIsV2Page.ts
│   ├── MeetingsPage.ts
│   └── ...
├── performance/            # Performance benchmarks
├── theme/                  # Theme/dark mode tests
├── utils/                  # Infrastructure utilities
│   ├── server-health.ts    # Health checks
│   └── supabase-admin.ts   # Admin operations
├── visual-regression/      # Screenshot comparison tests
├── global-setup.ts         # Runs once before all tests
└── *.spec.ts               # Feature test files
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

// Use pre-authenticated session (no login needed)
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/feature-page');
    await expect(page.locator('h1')).toContainText('Expected Title');
  });
});
```

### Using Auth Fixtures

```typescript
// Import from fixtures for role-based testing
import { test, expect } from './fixtures/auth';

// Use pre-authenticated page
test('my test', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  // User is already logged in!
});

// Test as admin
test('admin can manage users', async ({ adminPage }) => {
  await adminPage.goto('/admin/users');
});

// Test as project manager
test('PM can create projects', async ({ projectManagerPage }) => {
  await projectManagerPage.goto('/projects');
});

// Available fixtures: authenticatedPage, adminPage, projectManagerPage,
// superintendentPage, subcontractorPage
```

### Using Page Objects

```typescript
import { test, expect } from '@playwright/test';
import { RFIsV2Page } from './pages/RFIsV2Page';

test.use({ storageState: 'playwright/.auth/user.json' });

test('should create RFI', async ({ page }) => {
  const rfisPage = new RFIsV2Page(page);
  await rfisPage.goto();
  await rfisPage.createRFI({
    subject: 'Test RFI',
    question: 'Test question',
  });
  await rfisPage.expectRFIVisible('Test RFI');
});
```

### Using Test Helpers

```typescript
import { test, expect } from '@playwright/test';
import {
  waitForContentLoad,
  waitForFormResponse,
  waitForListLoad,
  generateTestData
} from './helpers/test-helpers';

test('should submit form', async ({ page }) => {
  await page.goto('/daily-reports');
  await waitForContentLoad(page);

  // Fill form...
  await page.click('button[type="submit"]');
  await waitForFormResponse(page);

  await expect(page.locator('[role="alert"]')).toContainText('Success');
});
```

## Best Practices

### DO: Use Conditional Waits

```typescript
// Good - waits for specific condition
await expect(page.locator('[data-testid="success"]')).toBeVisible();
await waitForContentLoad(page);
await waitForFormResponse(page);

// Bad - fixed timeout (avoid!)
await page.waitForTimeout(2000);
```

### DO: Use Resilient Selectors

```typescript
// Good - multiple fallbacks, case-insensitive
const button = page.locator('button, a')
  .filter({ hasText: /create|new|add/i })
  .first();

// Bad - brittle selector
const button = page.locator('#create-btn');
```

### DO: Handle Optional Elements

```typescript
const element = page.locator('[data-testid="optional"]');
if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
  await element.click();
}
```

### DO: Skip Tests Gracefully with Standard Reasons

Use the `SKIP_REASONS` constants for consistent skip messages:

```typescript
import { SKIP_REASONS } from './helpers/test-helpers';

test('should view project details', async ({ page }) => {
  const projectLink = page.locator('a[href*="/projects/"]').first();
  const visible = await projectLink.isVisible({ timeout: 5000 }).catch(() => false);

  if (!visible) {
    test.skip(true, SKIP_REASONS.NO_PROJECTS);
    return;
  }

  await projectLink.click();
  // Continue test...
});
```

**Available skip reasons:**
- `SKIP_REASONS.NO_PROJECTS` - No projects available
- `SKIP_REASONS.NO_RFIS` - No RFIs available
- `SKIP_REASONS.NO_SUBMITTALS` - No submittals available
- `SKIP_REASONS.NO_TASKS` - No tasks available
- `SKIP_REASONS.NO_PUNCH_ITEMS` - No punch items available
- `SKIP_REASONS.NO_DAILY_REPORTS` - No daily reports available
- `SKIP_REASONS.UI_NOT_VISIBLE` - Expected UI element not visible
- `SKIP_REASONS.FEATURE_NOT_IMPLEMENTED` - Feature UI not yet implemented
- `SKIP_REASONS.FEATURE_FLAG_DISABLED` - Feature requires feature flag

See [SKIP_AUDIT.md](./SKIP_AUDIT.md) for current skip statistics.

### DO: Use Timestamped Test Data

```typescript
// Good - unique, won't conflict
const name = `Test Project ${Date.now()}`;

// Better - use helper
import { generateTestData } from './helpers/test-data';
const data = generateTestData('project');
```

## Debugging

### Interactive Mode (Recommended)

```bash
npm run test:e2e:ui
```

Opens Playwright's test UI where you can:
- Run individual tests
- See step-by-step execution
- View screenshots and traces
- Time-travel through test steps

### Debug Mode

```bash
npm run test:e2e:debug
```

Opens browser with Playwright Inspector for step-by-step debugging.

### View Test Report

```bash
npx playwright show-report
```

Opens HTML report with test results, screenshots, and traces.

## Troubleshooting

### "Environment variable not set"
- Check `.env.test` has all required variables
- Verify variable names match exactly

### "Login failed"
- Create test user in Supabase dashboard
- Run `npm run seed:test-users` to seed test accounts
- Verify credentials match `.env.test`
- Check Supabase URL and keys are correct

### Tests timeout
- Check dev server is running (`npm run dev`)
- Verify network connection
- Increase timeout in `playwright.config.ts`

### Tests fail on CI but pass locally
- CI uses 1 worker (serial execution) - tests may have race conditions
- Check for hardcoded delays that are too short
- Verify test data setup doesn't conflict

### Visual tests fail
- Update baselines: `npm run test:visual:update`
- Check for dynamic content (timestamps, random data)
- Verify consistent viewport sizes

### Firefox tests are slow
- Firefox uses longer timeouts by default (known issue)
- Consider running Firefox tests separately
- Profile app performance in Firefox DevTools

## CI/CD Integration

Tests run automatically via GitHub Actions on:
- Pull requests to `main`/`develop`
- Pushes to `main`

### Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `playwright.yml` | PR, Push | Main E2E suite (Chromium) |
| `e2e-autonomous.yml` | Manual | Autonomous smoke crawl |
| `e2e-tests.yml` | Manual | Full cross-browser suite |

### Required Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=secure-password
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=admin-password
```

## Specialized Testing

### Accessibility Testing

```bash
# Run accessibility tests (uses @axe-core/playwright)
npx playwright test e2e/accessibility/

# Check specific page
npx playwright test accessibility-axe.spec.ts --grep "Dashboard"
```

Tests WCAG 2.1 Level A and AA compliance.

### Visual Regression Testing

```bash
# Run visual tests
npm run test:visual

# Update baselines after intentional UI changes
npm run test:visual:update
```

### Autonomous Smoke Testing

```bash
# Run smoke crawl
npx playwright test --project=smoke-crawl
```

Crawls all routes and detects console errors, failed requests, and crashes.

## Adding New Tests

1. **Create test file:** `e2e/<feature>.spec.ts`
2. **Use auth fixture:** `test.use({ storageState: 'playwright/.auth/user.json' })`
3. **Follow naming:** `should <action> <expected result>`
4. **Use conditional waits** instead of `waitForTimeout`
5. **Add Page Object** if reusable: `e2e/pages/<Feature>Page.ts`
6. **Update test data** if needed: `e2e/helpers/test-data.ts`

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Locators Guide](https://playwright.dev/docs/locators)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/4.4)
- [E2E_TESTING_SETUP.md](../E2E_TESTING_SETUP.md) - Full setup documentation
