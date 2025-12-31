# E2E Testing Quick Start Guide

## 🚀 Get Started in 5 Minutes

This is your quick-start guide to running E2E tests. For comprehensive documentation, see `E2E_EXECUTION_PLAN.md`.

---

## Prerequisites

- ✅ Node.js v18+ installed
- ✅ npm installed
- ✅ Supabase test project access

---

## Setup (First Time Only)

### 1. Install Dependencies
```bash
npm install
npx playwright install --with-deps
```

### 2. Configure Environment
```bash
# Copy template
cp .env.test.example .env.test

# Edit .env.test and add:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - TEST_USER_EMAIL
# - TEST_USER_PASSWORD
```

### 3. Create Test Users
```bash
npm run seed:test-users
```

### 4. Verify Setup
```bash
npx playwright test e2e/hello-world.spec.ts --headed
```

If the browser opens and test passes ✅, you're ready!

---

## Running Tests

### Most Common Commands

```bash
# Open test UI (RECOMMENDED for development)
npm run test:e2e:ui

# Run all tests headless
npm run test:e2e

# Run specific test with browser visible
npx playwright test e2e/auth.spec.ts --headed

# Debug a test (step through)
npx playwright test e2e/auth.spec.ts --debug

# Run critical path tests only
npx playwright test e2e/auth*.spec.ts e2e/projects.spec.ts --project=chromium

# View last test report
npm run test:e2e:report
```

### By Phase

```bash
# Phase 1: Critical Path (Auth, Projects, Daily Reports, Documents)
npx playwright test \
  e2e/auth*.spec.ts \
  e2e/projects.spec.ts \
  e2e/daily-reports*.spec.ts \
  e2e/documents.spec.ts \
  --project=chromium

# Phase 2: Features (RFIs, Submittals, Change Orders, etc.)
npx playwright test \
  e2e/rfis.spec.ts \
  e2e/submittals.spec.ts \
  e2e/change-orders.spec.ts \
  e2e/schedule.spec.ts \
  e2e/tasks.spec.ts \
  --project=chromium

# Phase 5: Visual & Accessibility
npm run test:visual
npm run test:dark-mode
```

### By Browser

```bash
# Chromium only (fastest)
npm run test:e2e:chromium

# Firefox
npm run test:e2e:firefox

# WebKit (Safari)
npm run test:e2e:webkit

# Mobile
npm run test:e2e:mobile

# All browsers
npx playwright test --project=chromium --project=firefox --project=webkit
```

---

## Development Workflow

### Writing New Tests

1. **Create test file**
   ```bash
   code e2e/my-feature.spec.ts
   ```

2. **Use this template**
   ```typescript
   import { test, expect } from '@playwright/test';

   test.describe('My Feature', () => {
     test.beforeEach(async ({ page }) => {
       // Login (or use auth fixture)
       await page.goto('/login');
       await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
       await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
       await page.click('button[type="submit"]');
       await expect(page).not.toHaveURL(/\/login/);
     });

     test('should do something', async ({ page }) => {
       await page.goto('/my-feature');

       // Your test logic
       await page.click('[data-testid="button"]');
       await expect(page.locator('[data-testid="result"]')).toBeVisible();
     });
   });
   ```

3. **Run in UI mode**
   ```bash
   npm run test:e2e:ui
   ```

4. **Watch it fail → Implement feature → Watch it pass**

### Debugging Failed Tests

```bash
# Method 1: Debug mode (step through)
npx playwright test e2e/my-test.spec.ts --debug

# Method 2: Headed mode (see what's happening)
npx playwright test e2e/my-test.spec.ts --headed

# Method 3: Add pause in test
# Add this line in your test:
await page.pause();

# Method 4: View trace (after failure)
npx playwright test e2e/my-test.spec.ts --trace on
npx playwright show-trace trace.zip
```

### Before Committing

```bash
# 1. Run unit tests
npm run test:unit

# 2. Run type check
npm run type-check

# 3. Run linting
npm run lint

# 4. Run critical E2E tests
npx playwright test e2e/auth*.spec.ts e2e/projects.spec.ts --project=chromium

# 5. If all pass, commit!
git add .
git commit -m "feat: add new feature"
```

---

## Common Tasks

### Update Visual Baselines

```bash
# After design changes
npm run test:visual:update

# Review changes in UI
npm run test:visual:ui

# Commit new baselines
git add e2e/**/*.png
git commit -m "test: update visual baselines"
```

### Test Specific User Flow

```bash
# Example: Test RFI creation flow
npx playwright test e2e/rfis.spec.ts --grep "create RFI" --headed
```

### Run Tests in Parallel

```bash
# Split across 4 workers
npx playwright test --shard=1/4 &
npx playwright test --shard=2/4 &
npx playwright test --shard=3/4 &
npx playwright test --shard=4/4 &
```

### Generate Screenshots

```bash
npx playwright test e2e/generate-app-store-screenshots.spec.ts
# Screenshots saved to screenshots/app-store/
```

---

## Troubleshooting

### "Test user not found"
```bash
npm run seed:test-users
```

### "Port 5173 already in use"
```bash
# Kill existing process
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Unix:
lsof -i :5173
kill -9 <PID>
```

### "Timeout waiting for element"
```typescript
// Increase timeout
await page.waitForSelector('[data-testid="element"]', { timeout: 30000 });

// Or wait for network idle
await page.goto('/dashboard', { waitUntil: 'networkidle' });
```

### "Tests are flaky"
```typescript
// Use auto-waiting assertions
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// Instead of
await page.waitForSelector('[data-testid="result"]');
const element = await page.locator('[data-testid="result"]');
expect(element).toBeTruthy();
```

### "Out of memory"
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run test:e2e
```

---

## Test Execution Matrix

| Phase | Priority | Command | Time |
|-------|----------|---------|------|
| Phase 1: Critical Path | 🔴 CRITICAL | `npx playwright test e2e/auth*.spec.ts e2e/projects.spec.ts e2e/daily-reports*.spec.ts e2e/documents.spec.ts` | ~5 min |
| Phase 2: Features | 🟡 HIGH | `npx playwright test e2e/rfis.spec.ts e2e/submittals.spec.ts e2e/change-orders.spec.ts` | ~10 min |
| Phase 3: Advanced | 🟢 MEDIUM | `npx playwright test e2e/offline.spec.ts e2e/photo-progress.spec.ts e2e/meetings.spec.ts` | ~8 min |
| Phase 4: UX | 🟢 MEDIUM | `npx playwright test e2e/search-navigation.spec.ts e2e/workflows.spec.ts e2e/theme/` | ~5 min |
| Phase 5: Visual/A11y | 🟢 MEDIUM | `npm run test:visual && npm run test:dark-mode` | ~10 min |
| Phase 6: Cross-browser | 🔵 LOW | `npx playwright test --project=firefox --project=webkit` | ~15 min |
| Phase 7: Performance | 🔵 LOW | `npx playwright test e2e/performance/` | ~5 min |
| Phase 8: Edge Cases | 🔵 LOW | `npx playwright test e2e/blueprint-variants-edge-cases.spec.ts` | ~5 min |

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- ✅ Every commit (Phase 1 - Critical Path)
- ✅ Every PR (Phase 1-2 - Critical + Features)
- ✅ Nightly (All Phases)
- ✅ Before release (All Phases + All Browsers)

### View CI Results

1. Go to GitHub Actions tab
2. Click on workflow run
3. Download artifacts (test reports, screenshots, videos)
4. View summary in workflow output

---

## Best Practices

### ✅ DO
- Use `data-testid` attributes for stable selectors
- Use auto-waiting assertions (`expect(locator).toBeVisible()`)
- Test user flows, not implementation details
- Use meaningful test names
- Clean up test data after tests
- Run tests locally before pushing

### ❌ DON'T
- Use fragile selectors (`.className`, `div > div`)
- Use fixed waits (`page.waitForTimeout(5000)`)
- Test internal state or props
- Skip tests without a good reason
- Leave console errors unfixed
- Commit failing tests

---

## Quick Reference

### Selectors
```typescript
// By data-testid (RECOMMENDED)
page.locator('[data-testid="submit-button"]')

// By role
page.getByRole('button', { name: 'Submit' })

// By text
page.getByText('Submit')

// By label
page.getByLabel('Email')

// By placeholder
page.getByPlaceholder('Enter email')
```

### Assertions
```typescript
// Visibility
await expect(page.locator('[data-testid="element"]')).toBeVisible()
await expect(page.locator('[data-testid="element"]')).toBeHidden()

// Text content
await expect(page.locator('[data-testid="title"]')).toHaveText('Welcome')
await expect(page.locator('[data-testid="title"]')).toContainText('Wel')

// URL
await expect(page).toHaveURL('/dashboard')
await expect(page).toHaveURL(/\/dashboard/)

// Count
await expect(page.locator('[data-testid="item"]')).toHaveCount(5)

// Value
await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com')
```

### Actions
```typescript
// Click
await page.click('[data-testid="button"]')
await page.locator('[data-testid="button"]').click()

// Fill input
await page.fill('input[name="email"]', 'test@example.com')

// Select dropdown
await page.selectOption('select[name="status"]', 'active')

// Upload file
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf')

// Keyboard
await page.keyboard.press('Enter')
await page.keyboard.type('Hello')

// Mouse
await page.mouse.click(100, 200)
```

---

## Next Steps

1. **Read Full Documentation**
   - `E2E_EXECUTION_PLAN.md` - Comprehensive execution plan
   - `E2E_TESTING_PHASES.md` - Phase breakdown
   - `e2e/README.md` - Quick reference

2. **Run Your First Test**
   ```bash
   npm run test:e2e:ui
   ```

3. **Join the Testing Channel**
   - Ask questions
   - Share findings
   - Report flaky tests

4. **Contribute**
   - Write tests for new features
   - Fix flaky tests
   - Improve test coverage

---

## Help & Support

### Documentation
- 📖 `E2E_EXECUTION_PLAN.md` - Complete execution guide
- 📖 `E2E_TESTING_PHASES.md` - Phase details
- 📖 `e2e/README.md` - Quick reference
- 📖 [Playwright Docs](https://playwright.dev)

### Common Issues
- Check `E2E_EXECUTION_PLAN.md` → Troubleshooting Guide
- Search existing GitHub issues
- Ask in team chat

### Reporting Bugs
```markdown
**Test File:** e2e/auth.spec.ts
**Test Name:** should login successfully
**Error:** Timeout waiting for selector
**Environment:** Local / CI
**Browser:** Chromium / Firefox / WebKit
**Steps to Reproduce:**
1. Run `npm run test:e2e:ui`
2. Select auth.spec.ts
3. Run test
**Expected:** Test passes
**Actual:** Timeout after 30s
```

---

**Happy Testing! 🎭**

For detailed execution plan, see `E2E_EXECUTION_PLAN.md`
