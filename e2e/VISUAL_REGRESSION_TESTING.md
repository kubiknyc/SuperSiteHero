# Visual Regression Testing Guide

## Overview

Visual regression tests ensure that UI changes don't introduce unintended visual bugs. This test suite captures screenshots of key pages and compares them against baseline images.

## Prerequisites

- Playwright installed (`npm install`)
- Dev server running (`npm run dev`) or configured webServer in playwright.config.ts
- Test user credentials configured in environment variables

## Running Visual Regression Tests

### First Time Setup (Generate Baseline Screenshots)

```bash
# Generate baseline screenshots for all visual regression tests
npm run test:e2e -- visual-regression.spec.ts --update-snapshots

# Or for a specific project/browser
npm run test:e2e -- visual-regression.spec.ts --project=chromium --update-snapshots
```

This will create baseline screenshots in the `e2e/__screenshots__/` directory.

### Running Visual Regression Tests

```bash
# Run all visual regression tests
npm run test:e2e -- visual-regression.spec.ts

# Run tests for a specific page
npm run test:e2e -- visual-regression.spec.ts -g "Tasks Page"

# Run tests in headed mode to see what's happening
npm run test:e2e -- visual-regression.spec.ts --headed

# Run tests in debug mode
npm run test:e2e -- visual-regression.spec.ts --debug
```

### Updating Snapshots After Intentional Changes

When you make intentional UI changes, update the baseline screenshots:

```bash
# Update all snapshots
npm run test:e2e -- visual-regression.spec.ts --update-snapshots

# Update snapshots for a specific test
npm run test:e2e -- visual-regression.spec.ts -g "tasks list page" --update-snapshots
```

## Test Coverage

The visual regression suite covers:

### Core Pages
- **Dashboard**: Desktop, tablet, mobile views
- **Tasks**: List, detail, create form (desktop & mobile)
- **Change Orders**: List, detail, create form, filtered views (desktop & tablet)
- **Punch Lists**: List, detail, create form (desktop & mobile)
- **Schedule/Gantt**: Multiple viewports, zoom states (desktop, tablet)
- **Inspections**: List, detail, create form (desktop & mobile)
- **Safety Incidents**: List, detail, create form, filtered (desktop & mobile)
- **Checklists**: List, execution page (desktop & tablet)
- **Workflows**: List, detail with steps (desktop & mobile)

### Viewport Coverage
- **Mobile**: 375x667 (iPhone SE size)
- **Tablet**: 768x1024 (iPad size)
- **Desktop**: 1280x720 (default), 1920x1080 (large desktop)

## Understanding Test Results

### When Tests Pass ✓
- Screenshots match the baseline within acceptable threshold (maxDiffPixels)
- No visual regressions detected

### When Tests Fail ✗
Playwright will generate:
1. **Expected**: The baseline screenshot
2. **Actual**: The new screenshot from the test run
3. **Diff**: A visual diff highlighting the differences

These files are saved in:
```
test-results/
  visual-regression-should-match-tasks-list-chromium/
    tasks-list-page-actual.png
    tasks-list-page-expected.png
    tasks-list-page-diff.png
```

### Reviewing Failures

1. Open the HTML report: `npx playwright show-report`
2. Navigate to the failed test
3. Review the visual diff to determine if:
   - **Intentional change**: Update snapshots with `--update-snapshots`
   - **Bug**: Fix the code and re-run tests
   - **Flaky test**: Adjust `maxDiffPixels` or add better wait conditions

## Configuration

### Global Settings (playwright.config.ts)

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,        // Allow up to 100 pixels difference
    animations: 'disabled',     // Disable CSS animations
    scale: 'css',              // Use CSS pixels for scaling
  },
}
```

### Per-Test Settings

Override settings in individual tests:

```typescript
await expect(page).toHaveScreenshot('my-page.png', {
  fullPage: true,              // Capture entire page (scroll if needed)
  maxDiffPixels: 200,          // Allow more difference for dynamic content
  threshold: 0.2,              // Pixel-level threshold (0-1)
});
```

## Best Practices

### 1. Stable Test Data
- Use consistent test data or mock API responses
- Avoid timestamps, random IDs in visible content
- Hide or mock dynamic content (user avatars, dates)

### 2. Wait for Loading States
```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000); // Allow animations to settle
```

### 3. Handle Dynamic Content
- Increase `maxDiffPixels` for pages with charts, graphs, or dynamic data
- Use CSS to hide elements that change (e.g., `.hide-in-screenshots`)
- Mock time-sensitive content

### 4. Viewport Considerations
- Test critical pages across mobile, tablet, and desktop
- Use consistent viewport sizes
- Account for responsive design breakpoints

### 5. Browser-Specific Baselines
- Screenshots are browser-specific (Chromium vs Firefox vs WebKit)
- Maintain separate baselines for each browser if testing cross-browser
- Consider testing primarily on Chromium for speed, full suite on CI

## Troubleshooting

### Issue: Tests fail with minor pixel differences

**Solution**: Adjust `maxDiffPixels`:
```typescript
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: 150, // Increase threshold
});
```

### Issue: Text rendering differs across runs

**Solution**: Ensure fonts are loaded:
```typescript
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
```

### Issue: Animations cause failures

**Solution**: Already disabled globally, but you can add:
```typescript
await page.addStyleTag({
  content: '* { animation: none !important; transition: none !important; }'
});
```

### Issue: Screenshots differ on different machines

**Solution**:
- Use Docker for consistent rendering environment
- Run visual tests only in CI with consistent environment
- Use `scale: 'css'` in config (already set)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Visual Regression Tests

on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run visual regression tests
        run: npm run test:e2e -- visual-regression.spec.ts --project=chromium
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-test-results
          path: test-results/
```

### Baseline Management in CI

**Option 1: Commit baselines to repository**
- Pros: Simple, version controlled
- Cons: Increases repo size, merge conflicts on UI changes

**Option 2: Store baselines in artifact storage**
- Pros: Doesn't bloat repo
- Cons: More complex setup, requires artifact management

## Maintenance

### Regular Maintenance Tasks

1. **Review and update snapshots** after intentional UI changes
2. **Audit test coverage** quarterly - add tests for new pages
3. **Clean up old snapshots** for removed features
4. **Update thresholds** if tests become flaky
5. **Verify cross-browser** compatibility periodically

### When to Update Baselines

✅ Update when:
- Intentional design changes
- Layout improvements
- Typography updates
- Color scheme changes
- New components added

❌ Don't update for:
- Unexplained differences (investigate first)
- Flaky tests (fix root cause)
- CI/local environment differences (fix environment)

## Advanced Usage

### Testing Specific Component States

```typescript
test('should match button states', async ({ page }) => {
  const button = page.locator('button').first();

  // Default state
  await expect(button).toHaveScreenshot('button-default.png');

  // Hover state
  await button.hover();
  await expect(button).toHaveScreenshot('button-hover.png');

  // Focus state
  await button.focus();
  await expect(button).toHaveScreenshot('button-focus.png');

  // Disabled state
  await button.evaluate(el => el.setAttribute('disabled', 'true'));
  await expect(button).toHaveScreenshot('button-disabled.png');
});
```

### Testing Responsive Design Breakpoints

```typescript
const breakpoints = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'large', width: 1920, height: 1080 },
];

for (const breakpoint of breakpoints) {
  test(`should match at ${breakpoint.name} breakpoint`, async ({ page }) => {
    await page.setViewportSize({
      width: breakpoint.width,
      height: breakpoint.height,
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot(`homepage-${breakpoint.name}.png`);
  });
}
```

### Testing Dark Mode

```typescript
test('should match in dark mode', async ({ page }) => {
  // Enable dark mode
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('dashboard-dark-mode.png');
});
```

## Resources

- [Playwright Screenshot Testing Docs](https://playwright.dev/docs/test-snapshots)
- [Visual Testing Best Practices](https://playwright.dev/docs/best-practices#visual-comparisons)
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
- [CI/CD Integration](https://playwright.dev/docs/ci)
