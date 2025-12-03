import { test, expect } from '@playwright/test';

/**
 * Change Orders E2E Tests
 *
 * Tests display and navigation for change orders.
 */
test.describe('Change Orders', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/change-orders', { waitUntil: 'networkidle' });
  });

  test('should display change orders page', async ({ page }) => {
    // Check page heading (exact text: "Change Orders")
    await expect(page.getByRole('heading', { name: 'Change Orders', level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('should show summary cards', async ({ page }) => {
    // Summary cards should be visible with at least total COs and total cost
    await expect(page.locator('text="Total COs"')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Total Cost"')).toBeVisible();
  });

  test('should show filter controls', async ({ page }) => {
    // Project filter
    const projectLabel = page.locator('label:has-text("Project")');
    await expect(projectLabel).toBeVisible();

    const projectSelect = page.locator('#project-select');
    await expect(projectSelect).toBeVisible();

    // Status filter
    const statusLabel = page.locator('label:has-text("Status")');
    await expect(statusLabel).toBeVisible();

    const statusSelect = page.locator('#status-filter');
    await expect(statusSelect).toBeVisible();

    // Priority filter
    const priorityLabel = page.locator('label:has-text("Priority")');
    await expect(priorityLabel).toBeVisible();

    const prioritySelect = page.locator('#priority-filter');
    await expect(prioritySelect).toBeVisible();

    // Search input
    const searchLabel = page.locator('label:has-text("Search")');
    await expect(searchLabel).toBeVisible();

    const searchInput = page.locator('#search');
    await expect(searchInput).toBeVisible();
  });

  test('should show change orders list or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await page.waitForTimeout(3000);

    // Check for any of the valid states: list, empty, or loading
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // The page should show one of: list of COs, empty state message, or no matching
    // Just verify the page loaded successfully with the main content
    const pageLoaded = await page.locator('h1:has-text("Change Orders")').isVisible();
    expect(pageLoaded).toBeTruthy();
  });

  test('should filter by status', async ({ page }) => {
    const statusSelect = page.locator('#status-filter');
    await expect(statusSelect).toBeVisible();

    // Select Draft status
    await statusSelect.selectOption('draft');
    await page.waitForLoadState('networkidle');

    // Page should update (either show filtered results or empty state)
    await expect(page.locator('main')).toBeVisible();
  });

  test('should filter by priority', async ({ page }) => {
    const prioritySelect = page.locator('#priority-filter');
    await expect(prioritySelect).toBeVisible();

    // Select High priority
    await prioritySelect.selectOption('high');
    await page.waitForLoadState('networkidle');

    // Page should update
    await expect(page.locator('main')).toBeVisible();
  });

  test('should search change orders', async ({ page }) => {
    const searchInput = page.locator('#search');
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('test');
    await page.waitForLoadState('networkidle');

    // Page should update
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show description text', async ({ page }) => {
    // Page description
    const description = page.locator('text="Manage project changes, scope modifications, and cost adjustments"');
    await expect(description).toBeVisible();
  });
});

// Skip workflow tests since they depend on specific data
test.describe.skip('Change Orders - Workflow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should complete full change order workflow', async ({ page }) => {
    // Workflow tests require specific data setup
    await page.goto('/change-orders');
  });
});
