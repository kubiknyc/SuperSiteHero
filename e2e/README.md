# E2E Tests Quick Reference

## Quick Start

1. **Setup environment:**
   ```bash
   # Copy and edit .env.test with your Supabase test credentials
   cp .env.test .env.test.local  # Optional: keep local copy
   ```

2. **Install Playwright:**
   ```bash
   npx playwright install
   ```

3. **Run tests:**
   ```bash
   npm run test:e2e
   ```

## Common Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (recommended for development)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug a specific test
npm run test:e2e:debug

# Run only chromium tests
npm run test:e2e:chromium

# Run specific test file
npm run test:e2e -- auth.spec.ts

# Update visual snapshots
npm run test:visual:update
```

## Using Auth Fixtures

```typescript
// Import from fixtures instead of @playwright/test
import { test, expect } from './fixtures/auth';

// Use pre-authenticated page
test('my test', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  // User is already logged in!
});

// Use admin page
test('admin test', async ({ adminPage }) => {
  await adminPage.goto('/admin/settings');
});

// Login as custom user
test('custom login', async ({ page, loginAs }) => {
  await loginAs('user@example.com', 'password');
});
```

## Test Structure

```
e2e/
├── global-setup.ts       # Runs once before all tests
├── fixtures/
│   └── auth.ts           # Auth helpers and fixtures
├── auth.spec.ts          # Authentication tests
├── projects.spec.ts      # Project management tests
├── daily-reports.spec.ts # Daily reports tests
└── ...
```

## Troubleshooting

### "Environment variable not set"
- Check `.env.test` has all required variables
- Verify variable names match exactly

### "Login failed"
- Create test user in Supabase dashboard
- Verify credentials match `.env.test`
- Check Supabase URL and keys are correct

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Check dev server is running
- Verify network connection

## More Information

See [E2E_TESTING_SETUP.md](../E2E_TESTING_SETUP.md) for complete documentation.
