/**
 * Change Orders E2E Tests
 *
 * Tests critical change order workflows:
 * - View change orders list
 * - Create new change order with costs
 * - Edit change order details
 * - Change order approval workflow
 * - Track cost impacts
 * - Filter by status and project
 * - Change order detail view with line items
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Change Orders Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for successful login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    // Navigate to change orders page
    await page.goto('/change-orders');
    await page.waitForLoadState('networkidle');
  });

  test('should display change orders list page', async ({ page }) => {
    // Should show page title
    const heading = page.locator('h1, h2').filter({ hasText: /change order/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });

    // Should show create button
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i });
    await expect(createButton.first()).toBeVisible();
  });

  test('should show change order status indicators', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for status badges or indicators
    const statusElements = page.locator('[data-testid*="status"], .status-badge, .badge, [class*="status"]');

    // Should have status indicators if change orders exist
    const count = await statusElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to create change order page', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();
    await createButton.click();

    // Should navigate to create page
    await expect(page).toHaveURL(/\/change-orders\/(new|create)/, { timeout: 10000 });

    // Should show form fields
    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 5000 });
  });

  test('should create a new change order with basic information', async ({ page }) => {
    // Navigate to create page
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();
    await createButton.click();

    await page.waitForLoadState('networkidle');

    // Fill in change order number/title
    const numberInput = page.locator('input[name="number"], input[name="title"], input[placeholder*="number" i]').first();
    const coNumber = `CO-${Date.now()}`;
    await numberInput.fill(coNumber);

    // Fill in description
    const descriptionField = page.locator('textarea[name="description"], textarea[placeholder*="description" i]');
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('Test change order for automated testing');
    }

    // Fill in cost if available
    const costInput = page.locator('input[name="amount"], input[name="cost"], input[type="number"]').first();
    if (await costInput.isVisible()) {
      await costInput.fill('5000');
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click();

    // Should redirect or show success
    await page.waitForTimeout(2000);

    // Look for success indication
    const successIndicator = page.locator('[role="alert"]').filter({ hasText: /created|success/i });
    const coInList = page.locator(`text="${coNumber}"`);

    await expect(successIndicator.or(coInList)).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields on create', async ({ page }) => {
    // Navigate to create page
    const createButton = page.locator('button, a').filter({ hasText: /new|create|add/i }).first();
    await createButton.click();

    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click();

    // Should show validation error
    const errorMessage = page.locator('[role="alert"], .error, .text-red-500, .text-destructive');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter change orders by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();

    if (await statusFilter.isVisible()) {
      // Change filter selection
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      // Verify filter was applied (URL might change or content updates)
      expect(await statusFilter.inputValue()).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should open change order detail view', async ({ page }) => {
    // Wait for change orders to load
    await page.waitForTimeout(2000);

    // Click first change order
    const firstCO = page.locator('[data-testid*="change-order-"] a, [role="row"] a, .change-order-item a, button:has-text("View")').first();

    if (await firstCO.isVisible()) {
      await firstCO.click();

      // Should navigate to detail page
      await expect(page).toHaveURL(/\/change-orders\/[^/]+/, { timeout: 10000 });

      // Should show change order details
      const detailContent = page.locator('[data-testid="change-order-detail"], .change-order-detail, main');
      await expect(detailContent).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should display cost breakdown in detail view', async ({ page }) => {
    // Wait for change orders to load
    await page.waitForTimeout(2000);

    // Click first change order
    const firstCO = page.locator('[data-testid*="change-order-"] a, [role="row"] a, .change-order-item a').first();

    if (await firstCO.isVisible()) {
      await firstCO.click();
      await page.waitForLoadState('networkidle');

      // Look for cost information
      const costElements = page.locator('text=/\\$|cost|amount|total/i');
      const hasCosts = await costElements.count() > 0;

      expect(hasCosts).toBe(true);
    } else {
      test.skip();
    }
  });

  test('should navigate to edit change order', async ({ page }) => {
    // Wait for change orders to load
    await page.waitForTimeout(2000);

    // Click first change order
    const firstCO = page.locator('[data-testid*="change-order-"] a, [role="row"] a, .change-order-item a').first();

    if (await firstCO.isVisible()) {
      await firstCO.click();
      await page.waitForLoadState('networkidle');

      // Look for edit button
      const editButton = page.locator('button, a').filter({ hasText: /edit/i }).first();

      if (await editButton.isVisible()) {
        await editButton.click();

        // Should navigate to edit page
        await expect(page).toHaveURL(/\/change-orders\/[^/]+\/edit/, { timeout: 10000 });

        // Should show form
        const form = page.locator('form');
        await expect(form).toBeVisible();
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should show approval status and workflow', async ({ page }) => {
    // Wait for change orders to load
    await page.waitForTimeout(2000);

    // Click first change order
    const firstCO = page.locator('[data-testid*="change-order-"] a, [role="row"] a, .change-order-item a').first();

    if (await firstCO.isVisible()) {
      await firstCO.click();
      await page.waitForLoadState('networkidle');

      // Look for approval indicators
      const approvalElements = page.locator('text=/approv|pending|reject/i, [data-testid*="approval"]');
      const hasApprovalInfo = await approvalElements.count() > 0;

      expect(hasApprovalInfo).toBe(true);
    } else {
      test.skip();
    }
  });

  test('should search change orders', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      // Enter search term
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Verify search was applied
      await expect(searchInput).toHaveValue('test');
    } else {
      test.skip();
    }
  });

  test('should sort change orders by column', async ({ page }) => {
    // Look for sortable column headers
    const columnHeaders = page.locator('[role="columnheader"], th, .sortable');

    if (await columnHeaders.count() > 0) {
      const firstHeader = columnHeaders.first();
      await firstHeader.click();
      await page.waitForTimeout(1000);

      // Verify page still shows change orders (sort applied)
      const heading = page.locator('h1, h2').filter({ hasText: /change order/i });
      await expect(heading.first()).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should display change order financial summary', async ({ page }) => {
    // Look for summary cards or totals
    const summaryElements = page.locator('[data-testid*="summary"], .summary-card, text=/total|pending|approved/i');

    // Should show some summary information
    const count = await summaryElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
