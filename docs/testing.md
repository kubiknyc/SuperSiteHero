# Autonomous Testing Guide

This document describes the autonomous testing harness for the JobSight construction management platform.

## Overview

The autonomous testing system provides a unified, deterministic test execution framework that includes:

- **Unit Tests** (Vitest) - Component and utility testing
- **E2E Tests** (Playwright) - Full browser-based integration testing
- **Smoke Crawl** - Autonomous route crawling with error detection

## Quick Start

```bash
# Run the full autonomous test suite
npm run test:autonomous

# Run quick mode (skip unit tests)
npm run test:autonomous:quick

# Run with local Supabase
npm run test:autonomous:local

# Run against remote test project
npm run test:autonomous:remote
```

## Test Modes

### Local Mode (Supabase CLI)

Uses a local Supabase instance running on port 54322.

**Setup:**
1. Install Supabase CLI: `npm install -g supabase`
2. Start local Supabase: `npx supabase start`
3. Run tests: `npm run test:autonomous:local`

**What happens:**
- Environment variables loaded from `.env.local`
- Database reset via `npx supabase db reset --linked`
- Test users created via Admin API

### Remote Mode (Dedicated Test Project)

Uses a dedicated Supabase test project (NOT production!).

**Setup:**
1. Create a dedicated test project in Supabase
2. Copy `.env.test.example` to `.env.test`
3. Fill in your test project credentials
4. Run tests: `npm run test:autonomous:remote`

**Safety Features:**
- URL validation against production patterns
- Refuses to run if URL contains `prod`, `production`, or `live`
- Only truncates safe test data tables (not system tables)

## Environment Configuration

Copy `.env.test.example` to `.env.test` and configure:

```env
# Supabase Connection
VITE_SUPABASE_URL=https://your-test-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Test Users
TEST_USER_EMAIL=test@e2e.test.local
TEST_USER_PASSWORD=TestUser123!
TEST_ADMIN_EMAIL=admin@e2e.test.local
TEST_ADMIN_PASSWORD=AdminTest123!
# ... additional role users

# Mode
MODE=local  # or 'remote'
```

## Test Harness Phases

The `npm run test:autonomous` command executes these phases:

1. **Environment Validation**
   - Checks Node.js version (>= 20)
   - Validates required environment variables
   - Production URL safety check (remote mode)

2. **Database Preparation** (if not skipped)
   - Local: `npx supabase db reset --linked`
   - Remote: Safe truncation of test data tables

3. **Application Server**
   - Starts `npm run dev:test`
   - Waits for server readiness via `wait-on`
   - Timeout: 60 seconds

4. **Unit Tests**
   - Runs `npm run test:unit`
   - Coverage reports generated

5. **E2E Tests**
   - Runs `npm run test:e2e`
   - Screenshots and traces on failure

6. **Autonomous Smoke Crawl**
   - Navigates all configured routes
   - Performs safe UI interactions
   - Detects console errors, 5xx responses, crashes

7. **Report Generation**
   - JSON report: `test-results/autonomous/report-{timestamp}.json`
   - HTML report: `test-results/autonomous/latest-report.html`

8. **Cleanup**
   - Stops application server
   - Cleans up test data (optional)

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | Test failures |
| 2 | Environment validation failure |
| 3 | Production URL safety block |
| 4 | Server startup timeout |

## CLI Options

```bash
npm run test:autonomous -- [options]

Options:
  --skip-unit       Skip unit tests
  --skip-e2e        Skip E2E tests
  --skip-smoke      Skip smoke crawl
  --skip-db-reset   Skip database reset
  --phase <name>    Run specific phase only (critical, full, smoke)
  --mode <mode>     Override database mode (local, remote)
  --verbose         Enable verbose logging
```

## Autonomous Smoke Crawl

### Route Configuration

Routes are configured in `e2e/autonomous/routes.json`:

```json
{
  "routes": [
    {
      "path": "/login",
      "auth": "public",
      "critical": true,
      "waitFor": "input[type='email']"
    },
    {
      "path": "/daily-reports",
      "auth": "authenticated",
      "critical": true,
      "interactions": ["click-tabs", "peek-dropdowns"]
    }
  ]
}
```

### Auth Types

| Type | Description |
|------|-------------|
| `public` | No authentication required |
| `authenticated` | General authenticated user |
| `admin` | Admin role user |
| `project_manager` | Project Manager role |
| `superintendent` | Superintendent role |
| `subcontractor` | Subcontractor role |

### Safe Interactions

The smoke crawl performs non-destructive interactions:

**Safe (performed):**
- Click tabs
- Open/close dropdowns (peek)
- Hover tooltips
- Expand accordions
- Click table sort headers
- Toggle view modes

**Unsafe (avoided):**
- Form submissions
- Delete buttons
- Navigation links
- Logout actions
- File uploads

### Error Detection

The crawl detects:
- Console errors (filtered by allowlist)
- Uncaught exceptions
- 5xx HTTP responses
- Page crashes

### Allowlist Configuration

```json
{
  "allowlist": {
    "consoleErrors": [
      "ResizeObserver loop",
      "analytics",
      "gtag"
    ],
    "networkErrors": [
      "/analytics",
      "googleapis.com"
    ]
  }
}
```

## Authentication Testing

### Role-Based Fixtures

```typescript
import { test } from '../fixtures/auth';

// Pre-authenticated page for each role
test('admin can access settings', async ({ adminPage }) => {
  await adminPage.goto('/settings');
  // ...
});

test('PM can create project', async ({ projectManagerPage }) => {
  await projectManagerPage.goto('/projects/new');
  // ...
});
```

### Login Helpers

```typescript
import { test } from '../fixtures/auth';

test('custom login flow', async ({ page, loginAs }) => {
  await loginAs('custom@example.com', 'password');
  // ...
});

test('role login', async ({ page, loginAsRole }) => {
  await loginAsRole('admin');
  // ...
});
```

### Magic Link Testing

```typescript
import { test } from '../fixtures/auth';

test('magic link login', async ({ page, loginWithMagicLink }) => {
  // Requires SUPABASE_SERVICE_ROLE_KEY
  await loginWithMagicLink('user@example.com');
  // User is now logged in without email delivery
});
```

### MFA/TOTP Testing

```typescript
import { test, generateTOTPCode } from '../fixtures/auth';

test('MFA verification', async ({ page, loginAs, verifyMFA }) => {
  await loginAs('mfa-user@example.com', 'password');

  // Generate time-based code
  const code = await generateTOTPCode(process.env.TEST_TOTP_SECRET);
  await verifyMFA(code);
});
```

## CI/CD Integration

### GitHub Actions

```yaml
jobs:
  autonomous-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:autonomous
        env:
          MODE: remote
          VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SERVICE_ROLE_KEY }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: |
            test-results/
            playwright-report/
          retention-days: 7
```

## Troubleshooting

### Server Startup Timeout

**Symptom:** "Server failed to start within 60000ms"

**Solutions:**
1. Check if port 5173 is already in use
2. Increase timeout in `scripts/run-autonomous-tests.ts`
3. Run `npm run dev:test` manually to debug

### Database Reset Fails

**Symptom:** "supabase db reset failed"

**Solutions:**
1. Ensure Supabase CLI is installed: `npx supabase --version`
2. Start Supabase: `npx supabase start`
3. Check if linked: `npx supabase link --project-ref your-project`

### Auth State Not Persisting

**Symptom:** Tests fail with "not logged in"

**Solutions:**
1. Clear auth state: `rm -rf playwright/.auth`
2. Run test users seed: `npm run seed:test-users`
3. Check credentials in `.env.test`

### Production Safety Block

**Symptom:** "Refusing to run against production URL"

**Solutions:**
1. Use a dedicated test project URL
2. URL must not contain: `prod`, `production`, `live`, `www`
3. Or explicitly override (not recommended)

## Project Structure

```
e2e/
├── autonomous/
│   ├── routes.json              # Route configuration
│   ├── smoke-crawl.spec.ts      # Smoke crawl test spec
│   └── helpers/
│       ├── error-collector.ts   # Console/network error detection
│       └── safe-interactor.ts   # Non-destructive UI interactions
├── fixtures/
│   └── auth.ts                  # Authentication fixtures
└── utils/
    └── supabase-admin.ts        # Supabase Admin API client

scripts/
├── run-autonomous-tests.ts      # Main test harness
└── lib/
    ├── environment-validator.ts # Env validation
    ├── database-preparer.ts     # DB reset/seed
    ├── server-manager.ts        # Vite server lifecycle
    └── process-manager.ts       # Cross-platform process control
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run test:autonomous` | Full autonomous test suite |
| `npm run test:autonomous:quick` | Skip unit tests |
| `npm run test:autonomous:local` | Use local Supabase |
| `npm run test:autonomous:remote` | Use remote test project |
| `npm run e2e:autonomous` | Just the autonomous E2E project |
| `npm run e2e:smoke` | Just the smoke crawl spec |
| `npm run seed:test-users` | Create test users |
