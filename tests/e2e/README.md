# E2E Tests for Takeoff Feature

Complete End-to-End test coverage for the Takeoff Measurement feature using Playwright.

## Overview

- **Total Tests**: 31 scenarios
- **Coverage**: ~95% of manual testing scenarios
- **Test Categories**:
  - Canvas Rendering & Drawing Tools (10 tests)
  - Toolbar Controls (5 tests)
  - Measurement List (6 tests)
  - Measurement Detail Card (4 tests)
  - Export Functionality (3 tests)
  - Assembly Picker (2 tests)
  - Performance Validation (1 test)

## Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

## Environment Variables

Create a `.env.test` file or set these environment variables:

```env
# Test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword

# Test data IDs (optional - tests will use defaults)
TEST_PROJECT_ID=test-project-123
TEST_DOCUMENT_ID=test-document-456
```

## Running Tests

### All Takeoff Tests
```bash
npm run test:e2e:takeoffs
```

### Specific Test
```bash
npx playwright test takeoffs --grep "Scenario 1"
```

### Interactive Mode (UI)
```bash
npx playwright test takeoffs --ui
```

### Debug Mode
```bash
npx playwright test takeoffs --debug
```

### Headed Mode (See Browser)
```bash
npx playwright test takeoffs --headed
```

### Specific Browser
```bash
npx playwright test takeoffs --project=chromium
npx playwright test takeoffs --project=firefox
npx playwright test takeoffs --project=webkit
```

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Test Structure

### Helper Functions

The test file includes reusable helper functions:

- `waitForCanvas(page)` - Waits for canvas to load
- `drawLinearMeasurement(page, start, end)` - Creates linear measurement
- `drawAreaMeasurement(page, points)` - Creates area measurement
- `selectTool(page, toolName)` - Selects drawing tool

### Test Organization

Tests are organized by feature area using `test.describe()` blocks:

1. **Canvas Rendering & Drawing Tools** - Core drawing functionality
2. **Toolbar Controls** - Tool selection, color picker, scale calibration
3. **Measurement List** - Search, filter, sort, selection
4. **Measurement Detail Card** - Editing individual measurements
5. **Export Functionality** - CSV and Excel export
6. **Assembly Picker** - Assembly selection (if available)
7. **Performance Validation** - Load testing with 50+ measurements

## Test Data Setup

### Using Test Fixtures

Tests use the `authenticatedPage` fixture from `tests/e2e/fixtures/auth.ts` which:
- Automatically logs in before each test
- Provides authenticated page context
- Handles session management

### Creating Test Data

For best results, seed your test database with:
- A test project (ID: `TEST_PROJECT_ID`)
- A test document (ID: `TEST_DOCUMENT_ID`)
- Sample assemblies (optional)

## CI/CD Integration

### GitHub Actions

Tests are configured to run automatically on PRs. See `.github/workflows/e2e-tests.yml`.

### Running in CI

The configuration in `playwright.config.ts` automatically:
- Uses single worker in CI for stability
- Retries failed tests 2 times
- Captures screenshots and videos on failure
- Generates JSON report for CI artifacts

## Debugging Failed Tests

### View Trace

Playwright captures traces on first retry:

```bash
npx playwright show-trace test-results/trace.zip
```

### Screenshots

Failed test screenshots are saved to `test-results/`:

```
test-results/
  takeoffs-Scenario-1-Canvas-renders-chromium/
    test-failed-1.png
```

### Videos

Videos of failed tests are in `test-results/`:

```
test-results/
  takeoffs-Scenario-1-Canvas-renders-chromium/
    video.webm
```

## Test Maintenance

### Adding New Tests

1. Add new test scenarios to `takeoffs.spec.ts`
2. Use existing helper functions
3. Follow naming convention: `Scenario N: Description`
4. Update this README with new test count

### Updating Selectors

If UI changes break tests, update selectors in:
- `data-testid` attributes (preferred)
- Text content selectors (fallback)
- CSS selectors (last resort)

### Test Data Cleanup

Tests should be idempotent and clean up their own data. Use:
- `test.afterEach()` for cleanup
- Unique test data IDs
- Database transactions (if supported)

## Coverage Mapping

Tests map directly to scenarios in `TAKEOFF_TESTING_CHECKLIST.md`:

| Test Scenario | Checklist Item | Status |
|---------------|----------------|--------|
| Scenario 1-10 | Canvas Rendering | ✅ Automated |
| Scenario 11-15 | Toolbar Controls | ✅ Automated |
| Scenario 16-21 | Measurement List | ✅ Automated |
| Scenario 22-25 | Detail Card | ✅ Automated |
| Scenario 26-28 | Export | ✅ Automated |
| Scenario 29-30 | Assembly Picker | ✅ Automated |
| Scenario 31 | Performance | ✅ Automated |

## Known Issues

### Test Skips

Some tests use `test.skip()` when:
- Feature is not yet implemented
- Test requires specific data setup
- Browser compatibility issues

### Flaky Tests

If tests are flaky:
1. Increase `waitForTimeout` values
2. Use `waitForLoadState('networkidle')`
3. Add explicit `waitForSelector()` calls
4. Check for race conditions

## Performance Targets

Tests validate these performance metrics:
- Canvas renders in < 2 seconds
- 50+ measurements load without timeout
- Page remains responsive after interactions
- Export completes in < 10 seconds

## Best Practices

1. **Use data-testid attributes** for reliable selectors
2. **Wait for network idle** before interactions
3. **Avoid hard-coded timeouts** when possible
4. **Test user workflows** not implementation details
5. **Keep tests independent** - no shared state
6. **Use descriptive test names** - Scenario N: Description

## Support

For issues with tests:
1. Check Playwright documentation: https://playwright.dev
2. Review test traces and screenshots
3. Run tests in headed mode to see what's happening
4. Ask in team chat or create GitHub issue

---

**Last Updated**: December 2, 2025
**Test Coverage**: 31 scenarios / ~95% of manual testing
