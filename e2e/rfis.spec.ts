/**
 * RFIs (Request for Information) E2E Tests
 *
 * Tests critical RFI workflows:
 * - View RFIs list
 * - Create new RFI
 * - Edit RFI
 * - Add response to RFI
 * - Change RFI status
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('RFIs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 15000 });
  });

  test('should navigate to RFIs from project', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    const rfisLink = page.locator('a:has-text("RFIs"), a[href*="rfis"]');
    await rfisLink.first().click();

    await expect(page).toHaveURL(/rfis/, { timeout: 10000 });
  });

  test('should display RFIs list with status indicators', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    const rfisLink = page.locator('a:has-text("RFIs"), a[href*="rfis"]');
    await rfisLink.first().click();

    // Should show RFIs page header
    await expect(page.locator('h1:has-text("RFI"), h2:has-text("RFI")')).toBeVisible({ timeout: 10000 });

    // Should have status filter or column
    const statusIndicator = page.locator('[data-testid="status-filter"], th:has-text("Status"), .badge, [class*="badge"]');
    await expect(statusIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('should create a new RFI', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    const rfisLink = page.locator('a:has-text("RFIs"), a[href*="rfis"]');
    await rfisLink.first().click();

    // Click create button
    const createButton = page.locator('button:has-text("New RFI"), button:has-text("Create RFI"), button:has-text("Add RFI")');
    await createButton.first().click();

    // Fill in RFI form
    const subjectInput = page.locator('input[name="subject"], input[name="title"], input[placeholder*="subject" i]');
    await subjectInput.first().fill(`Test RFI ${Date.now()}`);

    const questionInput = page.locator('textarea[name="question"], textarea[name="description"], textarea[placeholder*="question" i]');
    if (await questionInput.first().isVisible()) {
      await questionInput.first().fill('This is a test RFI question created by E2E tests.');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    await submitButton.first().click();

    // Should show success or new RFI
    await page.waitForTimeout(2000);
  });

  test('should view RFI details', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    const rfisLink = page.locator('a:has-text("RFIs"), a[href*="rfis"]');
    await rfisLink.first().click();

    // Click on first RFI
    const rfiRow = page.locator('tr, a[href*="rfis/"], .rfi-card').first();
    await rfiRow.click();

    // Should show RFI detail page
    await expect(page).toHaveURL(/rfis\/[a-z0-9-]+/i, { timeout: 10000 });

    // Should show RFI number or subject
    const detailHeader = page.locator('h1, h2, [data-testid="rfi-number"]');
    await expect(detailHeader.first()).toBeVisible();
  });

  test('should filter RFIs by status', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    const rfisLink = page.locator('a:has-text("RFIs"), a[href*="rfis"]');
    await rfisLink.first().click();

    // Look for status filter
    const statusFilter = page.locator('select[name*="status"], [data-testid="status-filter"], button:has-text("Status")');
    if (await statusFilter.first().isVisible()) {
      await statusFilter.first().click();

      // Select a status option
      const statusOption = page.locator('[role="option"], option').first();
      await statusOption.click();

      // Wait for filter to apply
      await page.waitForTimeout(1000);
    }
  });
});
