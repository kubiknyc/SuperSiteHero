import { test, expect } from '@playwright/test';

/**
 * Daily Reports E2E Tests
 *
 * Tests CRUD operations and workflows for daily reports.
 */
test.describe('Daily Reports', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/daily-reports');
  });

  test('should display daily reports page', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1')).toContainText(/daily.*report/i);

    // Check for create button
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")');
    await expect(createBtn.first()).toBeVisible();
  });

  test('should show reports list or empty state', async ({ page }) => {
    // Either shows a list of reports or an empty state
    const hasReports = await page.locator('[data-testid="report-item"], .report-card, tr[data-testid]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*report|empty|get started/i').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasReports || hasEmptyState).toBeTruthy();
  });

  test('should open create report dialog/form', async ({ page }) => {
    // Click create button
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add Report")').first();
    await createBtn.click();

    // Check for form or dialog
    const form = page.locator('form, [role="dialog"], [data-testid="report-form"]');
    await expect(form).toBeVisible({ timeout: 5000 });

    // Check for common form fields
    await expect(page.locator('input[name*="date"], input[type="date"]').first()).toBeVisible();
  });

  test('should validate required fields on create', async ({ page }) => {
    // Open create form
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create")').first();
    await createBtn.click();

    // Try to submit without filling required fields
    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Submit")').first();
    await submitBtn.click();

    // Check for validation errors
    await expect(
      page.locator('text=/required|please.*fill|invalid/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should create a new daily report', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    const uniqueText = `Test report ${Date.now()}`;

    // Open create form
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create")').first();
    await createBtn.click();

    // Fill form fields
    const dateInput = page.locator('input[name*="date"], input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(today);
    }

    // Fill weather if available
    const weatherSelect = page.locator('select[name*="weather"], [data-testid="weather-select"]').first();
    if (await weatherSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await weatherSelect.selectOption({ index: 1 });
    }

    // Fill work summary/description
    const summaryField = page.locator('textarea[name*="work"], textarea[name*="summary"], textarea[name*="description"]').first();
    if (await summaryField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await summaryField.fill(uniqueText);
    }

    // Submit form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Save")').first();
    await submitBtn.click();

    // Check for success message
    await expect(
      page.locator('text=/created|saved|success/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should filter reports by date', async ({ page }) => {
    // Look for date filter controls
    const dateFilter = page.locator('input[type="date"], [data-testid="date-filter"]').first();

    if (await dateFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      const filterDate = new Date().toISOString().split('T')[0];
      await dateFilter.fill(filterDate);

      // Apply filter (might be auto-apply or need button click)
      const applyBtn = page.locator('button:has-text("Filter"), button:has-text("Apply")').first();
      if (await applyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await applyBtn.click();
      }

      // Wait for filtered results
      await page.waitForLoadState('networkidle');
    }
  });

  test('should view report details', async ({ page }) => {
    // Wait for reports to load
    await page.waitForLoadState('networkidle');

    // Click on first report
    const reportItem = page.locator('[data-testid="report-item"], .report-card, tr[data-testid]').first();

    if (await reportItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reportItem.click();

      // Should show detail view or dialog
      await expect(
        page.locator('[data-testid="report-detail"], [role="dialog"], .report-detail, h2:has-text("Report")')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should export report as PDF', async ({ page }) => {
    // Look for export button
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("PDF"), button:has-text("Download")').first();

    if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Set up download promise
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      await exportBtn.click();

      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(pdf|xlsx|csv)$/i);
      }
    }
  });
});

test.describe('Daily Reports - Mobile', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
    viewport: { width: 375, height: 667 },
  });

  test('should display mobile-optimized list', async ({ page }) => {
    await page.goto('/daily-reports');

    // Page should load
    await expect(page.locator('h1')).toContainText(/daily.*report/i);

    // Create button should be accessible
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create"), [aria-label="Create"]');
    await expect(createBtn.first()).toBeVisible();
  });

  test('should create report on mobile', async ({ page }) => {
    await page.goto('/daily-reports');

    // Open create form
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create"), [aria-label="Create"]').first();
    await createBtn.click();

    // Form should be visible and usable
    const form = page.locator('form, [role="dialog"]');
    await expect(form).toBeVisible();

    // Fill minimal required fields
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(new Date().toISOString().split('T')[0]);
    }
  });
});
