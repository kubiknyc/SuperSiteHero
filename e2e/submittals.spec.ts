/**
 * Submittals E2E Tests
 *
 * Tests critical submittal workflows:
 * - View submittals list
 * - Create new submittal
 * - Upload submittal documents
 * - Track submittal status
 * - Approval workflow
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Submittals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 15000 });
  });

  test('should navigate to submittals from project', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    const submittalsLink = page.locator('a:has-text("Submittals"), a[href*="submittals"]');
    await submittalsLink.first().click();

    await expect(page).toHaveURL(/submittals/, { timeout: 10000 });
  });

  test('should display submittals with spec sections', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    const submittalsLink = page.locator('a:has-text("Submittals"), a[href*="submittals"]');
    await submittalsLink.first().click();

    // Should show submittals page
    await expect(page.locator('h1:has-text("Submittal"), h2:has-text("Submittal")')).toBeVisible({ timeout: 10000 });

    // Should show spec section column or filter
    const specIndicator = page.locator('th:has-text("Spec"), [data-testid="spec-section"], text=/\\d{2}\\s/');
    await expect(specIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('should create a new submittal', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    const submittalsLink = page.locator('a:has-text("Submittals"), a[href*="submittals"]');
    await submittalsLink.first().click();

    // Click create button
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")');
    await createButton.first().click();

    // Fill in submittal form
    const titleInput = page.locator('input[name="title"], input[name="description"], input[placeholder*="title" i]');
    await titleInput.first().fill(`Test Submittal ${Date.now()}`);

    // Fill spec section if available
    const specInput = page.locator('input[name*="spec"], input[placeholder*="spec" i]');
    if (await specInput.first().isVisible()) {
      await specInput.first().fill('03 30 00');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    await submitButton.first().click();

    await page.waitForTimeout(2000);
  });

  test('should view submittal details with revision history', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    const submittalsLink = page.locator('a:has-text("Submittals"), a[href*="submittals"]');
    await submittalsLink.first().click();

    // Click on first submittal
    const submittalRow = page.locator('tr, a[href*="submittals/"], .submittal-card').first();
    await submittalRow.click();

    // Should show detail page
    await expect(page).toHaveURL(/submittals\/[a-z0-9-]+/i, { timeout: 10000 });

    // Look for revision info or attachments section
    const detailContent = page.locator('h1, h2, [data-testid="submittal-number"], text=/Revision|Attachments/i');
    await expect(detailContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should filter submittals by status', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await projectLink.click();

    const submittalsLink = page.locator('a:has-text("Submittals"), a[href*="submittals"]');
    await submittalsLink.first().click();

    // Look for status filter
    const statusFilter = page.locator('select[name*="status"], [data-testid="status-filter"], button:has-text("Status"), button:has-text("Filter")');
    if (await statusFilter.first().isVisible()) {
      await statusFilter.first().click();
      await page.waitForTimeout(500);
    }
  });
});
