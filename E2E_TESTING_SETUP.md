# E2E Testing Setup Guide

This guide explains how to set up and run end-to-end (E2E) tests for the SuperSiteHero application using Playwright.

## Prerequisites

- Node.js installed
- Supabase account and project
- Test credentials configured

## Quick Start

### 1. Install Dependencies

```bash
npm install
npx playwright install
```

### 2. Configure Test Environment

Copy the `.env.test` file and fill in your test Supabase credentials:

```bash
# The .env.test file is already created with placeholders
# Edit it with your actual test credentials
```

**Required environment variables:**
- `VITE_SUPABASE_URL` - Your test Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your test Supabase anonymous key
- `TEST_USER_EMAIL` - Email of a test user in your Supabase project
- `TEST_USER_PASSWORD` - Password for the test user

### 3. Create Test User in Supabase

You need to manually create a test user in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Users
3. Click "Add User" (or use the SQL editor)
4. Create a user with the email/password from `.env.test`

**SQL method:**
```sql
-- In your Supabase SQL editor
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  'test@example.com',  -- Match TEST_USER_EMAIL
  crypt('Test123!@#', gen_salt('bf')),  -- Match TEST_USER_PASSWORD
  now(),
  now(),
  now()
);
```

### 4. Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- auth.spec.ts

# Debug mode
npm run test:e2e -- --debug

# Run tests with UI mode
npx playwright test --ui
```

## Test Environment Architecture

### Directory Structure

```
e2e/
├── global-setup.ts          # Runs once before all tests
├── fixtures/
│   └── auth.ts              # Reusable auth fixtures
├── auth.spec.ts             # Authentication tests
├── projects.spec.ts         # Project tests
└── ... (other test files)

playwright/
└── .auth/
    ├── user.json           # Saved auth state for regular user
    └── admin.json          # Saved auth state for admin user

.env.test                   # Test environment configuration
playwright.config.ts        # Playwright configuration
```

### Global Setup

The `global-setup.ts` script runs once before all tests to:
1. Verify all required environment variables are set
2. Create authenticated browser sessions for test users
3. Save auth states to be reused across tests (faster execution)

### Auth Fixtures

The `fixtures/auth.ts` file provides:
- `authenticatedPage` - Pre-authenticated regular user page
- `adminPage` - Pre-authenticated admin user page
- `loginAs(email, password)` - Helper to login as any user
- `logout()` - Helper to logout

## Writing Tests

### Basic Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should display projects page', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('h1')).toContainText('Projects');
});
```

### Using Auth Fixtures

```typescript
import { test, expect } from './fixtures/auth';

test('authenticated user can create project', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/projects');
  await authenticatedPage.click('text=New Project');
  // ... rest of test
});

test('admin can access settings', async ({ adminPage }) => {
  await adminPage.goto('/admin/settings');
  // ... admin-specific test
});
```

### Custom Login Test

```typescript
import { test, expect } from './fixtures/auth';

test('login with specific user', async ({ page, loginAs }) => {
  await loginAs('custom@example.com', 'password123');
  await page.goto('/dashboard');
  // ... test continues
});
```

## Best Practices

### 1. Use Test Data Isolation

- Use a separate Supabase project for testing
- Never run tests against production database
- Consider resetting test data between test runs

### 2. Speed Up Tests with Auth State

```typescript
// SLOW - login on every test
test('my test', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  // ...
});

// FAST - reuse saved auth state
import { test } from './fixtures/auth';
test('my test', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  // Already logged in!
});
```

### 3. Use Test IDs for Stable Selectors

```typescript
// FRAGILE - text can change
await page.click('text=Submit');

// STABLE - uses data-testid
await page.click('[data-testid="submit-button"]');
```

### 4. Wait for Network Idle

```typescript
// Wait for page to fully load
await page.goto('/projects', { waitUntil: 'networkidle' });

// Wait for specific API call
await page.waitForResponse(resp => resp.url().includes('/api/projects'));
```

## Troubleshooting

### Tests Fail with "Environment variable not set"

**Problem:** Missing required environment variables in `.env.test`

**Solution:**
1. Check that `.env.test` exists
2. Verify all required variables are set
3. Ensure no typos in variable names

### Tests Fail with "Login failed"

**Problem:** Test user doesn't exist or wrong credentials

**Solution:**
1. Verify test user exists in Supabase
2. Check email/password match `.env.test`
3. Ensure Supabase URL and keys are correct

### Tests Timeout

**Problem:** Application not running or too slow

**Solution:**
1. Increase timeouts in `playwright.config.ts`
2. Check dev server is running (`npm run dev`)
3. Verify network connection to Supabase

### Auth State File Not Found

**Problem:** Global setup didn't run or failed

**Solution:**
1. Delete `playwright/.auth/` directory
2. Run tests again - global setup will recreate auth files
3. Check global setup logs for errors

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        env:
          VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Categories

The test suite is organized into:

- **Authentication** (`auth.spec.ts`) - Login, logout, session management
- **Projects** (`projects.spec.ts`) - Project CRUD operations
- **Daily Reports** (`daily-reports.spec.ts`) - Report creation and viewing
- **RFIs** (`rfis.spec.ts`) - RFI workflow tests
- **Submittals** (`submittals.spec.ts`) - Submittal management
- **Accessibility** (`accessibility/`) - WCAG compliance tests
- **Visual Regression** (`visual-regression/`) - Screenshot comparison tests

## Performance Tips

1. **Run tests in parallel**: Playwright runs tests across multiple workers by default
2. **Use test.describe.configure()**: Control parallelization per test suite
3. **Share authentication state**: Global setup creates auth once, all tests reuse it
4. **Skip unnecessary navigation**: Start tests on the page you need
5. **Use test.skip() or test.only()**: Focus on specific tests during development

## Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)

## Support

For issues or questions:
1. Check this documentation first
2. Review Playwright logs in `test-results/`
3. Enable debug mode: `npm run test:e2e -- --debug`
4. Open an issue with logs and error messages
