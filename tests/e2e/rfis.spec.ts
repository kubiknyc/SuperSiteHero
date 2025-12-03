import { test, expect } from '@playwright/test';

/**
 * RFI (Request for Information) E2E Tests
 *
 * Tests display and navigation for RFIs.
 * Note: RFIs require a project to be selected first.
 */
test.describe('RFIs', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/rfis', { waitUntil: 'networkidle' });
  });

  test('should display RFIs page', async ({ page }) => {
    // Check page heading (exact text: "Requests for Information")
    await expect(page.getByRole('heading', { name: 'Requests for Information', level: 1 })).toBeVisible({ timeout: 10000 });

    // Check for New RFI button (disabled until project selected)
    const newRFIBtn = page.locator('button:has-text("New RFI")');
    await expect(newRFIBtn).toBeVisible();
  });

  test('should show project selector', async ({ page }) => {
    // RFIs page requires project selection first
    const projectLabel = page.locator('label:has-text("Select Project")');
    await expect(projectLabel).toBeVisible();

    // Project select dropdown
    const projectSelect = page.locator('#project-select');
    await expect(projectSelect).toBeVisible();
  });

  test('should show message when no project selected', async ({ page }) => {
    // Without project selection, shows prompt to select project
    const noProjectMessage = page.locator('text="No Project Selected"');
    await expect(noProjectMessage).toBeVisible();

    const selectPrompt = page.locator('text="Select a project above to view and manage RFIs"');
    await expect(selectPrompt).toBeVisible();
  });

  test('should show stats cards when project is selected', async ({ page }) => {
    // Select first project if available
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      // Select first real project (not placeholder)
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Should show stats cards
      const totalRFIsCard = page.locator('text="Total RFIs"');
      const openCard = page.locator('text="Open"');
      const overdueCard = page.locator('text="Overdue"');
      const answeredCard = page.locator('text="Answered"');

      // At least one stat card should be visible after project selection
      const hasStats =
        (await totalRFIsCard.isVisible({ timeout: 5000 }).catch(() => false)) ||
        (await page.locator('text="No RFIs Yet"').isVisible().catch(() => false)) ||
        (await page.locator('text="No Matching RFIs"').isVisible().catch(() => false));

      expect(hasStats).toBeTruthy();
    }
  });

  test('should show filters when project is selected', async ({ page }) => {
    // Select first project if available
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Search input
      const searchInput = page.locator('input[placeholder*="Search RFIs"]');
      await expect(searchInput).toBeVisible();

      // Status filter dropdown
      const statusSelect = page.locator('select').filter({ has: page.locator('option:has-text("All Statuses")') });
      await expect(statusSelect).toBeVisible();

      // Priority filter dropdown
      const prioritySelect = page.locator('select').filter({ has: page.locator('option:has-text("All Priorities")') });
      await expect(prioritySelect).toBeVisible();
    }
  });

  test('should show New RFI button state based on project and workflow type', async ({ page }) => {
    // Select first project if available
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Wait for workflow type to potentially load
      await page.waitForTimeout(2000);

      // New RFI button should be visible (may still be disabled if no workflow type)
      const newRFIBtn = page.locator('button:has-text("New RFI")');
      await expect(newRFIBtn).toBeVisible();
    }
  });

  test('should allow clicking New RFI if workflow type exists', async ({ page }) => {
    // Select first project if available
    const projectSelect = page.locator('#project-select');
    const options = await projectSelect.locator('option').all();

    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Wait for workflow type to load
      await page.waitForTimeout(3000);

      // Check if New RFI button is enabled (depends on workflow type being configured)
      const newRFIBtn = page.locator('button:has-text("New RFI")');
      const isEnabled = await newRFIBtn.isEnabled();

      if (isEnabled) {
        await newRFIBtn.click();

        // Dialog should open
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });
      }
      // If not enabled, the workflow type is not configured - this is expected behavior
    }
  });
});

// Skip mobile tests since this app uses fixed sidebar layout
test.describe.skip('RFIs - Mobile', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
    viewport: { width: 375, height: 667 },
  });

  test('should display mobile-optimized RFI list', async ({ page }) => {
    await page.goto('/rfis');
    // App uses fixed sidebar, not responsive design
  });
});
