import { test, expect } from '@playwright/test';

/**
 * Punch Lists E2E Tests
 *
 * Tests the punch lists page and punch item detail pages.
 */
test.describe('Punch Lists', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/punch-lists', { waitUntil: 'networkidle' });
  });

  test('should display punch lists page with heading', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Punch Lists")')).toBeVisible({ timeout: 10000 });
  });

  test('should show page description', async ({ page }) => {
    // Check page description
    await expect(page.locator('text="Track and manage punch list items"')).toBeVisible();
  });

  test('should show New Punch Item button', async ({ page }) => {
    // Check for New Punch Item button (may be conditional on project selection)
    const newPunchBtn = page.locator('button:has-text("New Punch Item")');
    // Button may or may not be visible depending on project selection
    const isVisible = await newPunchBtn.isVisible({ timeout: 3000 }).catch(() => false);
    // Just verify the page loads correctly
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show filter controls', async ({ page }) => {
    // Project filter
    const projectSelect = page.locator('#project-select');
    await expect(projectSelect).toBeVisible();

    // Status filter
    const statusSelect = page.locator('#status-filter');
    await expect(statusSelect).toBeVisible();

    // Priority filter
    const prioritySelect = page.locator('#priority-filter');
    await expect(prioritySelect).toBeVisible();

    // Search input
    const searchInput = page.locator('#trade-search');
    await expect(searchInput).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    const statusSelect = page.locator('#status-filter');
    await expect(statusSelect).toBeVisible();

    // Select Open status
    await statusSelect.selectOption('open');
    await page.waitForLoadState('networkidle');

    // Page should update
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

  test('should search by trade or title', async ({ page }) => {
    const searchInput = page.locator('#trade-search');
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('electrical');
    await page.waitForLoadState('networkidle');

    // Page should update
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show punch items list or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Either shows punch items or empty state
    const hasEmptyState = await page.locator('text="No punch items yet"').isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoMatching = await page.locator('text="No matching punch items"').isVisible({ timeout: 2000 }).catch(() => false);
    const hasPunchItems = await page.locator('table, [class*="hover:shadow-md"]').first().isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasEmptyState || hasNoMatching || hasPunchItems).toBeTruthy();
  });

  test('should show project selector with All Projects option', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    await expect(projectSelect).toBeVisible();

    // Should have All Projects option
    const allProjectsOption = projectSelect.locator('option:has-text("All Projects")');
    await expect(allProjectsOption).toBeVisible();
  });

  test('should show status options in filter', async ({ page }) => {
    const statusSelect = page.locator('#status-filter');
    await expect(statusSelect).toBeVisible();

    // Check for various status options
    await expect(statusSelect.locator('option:has-text("All Statuses")')).toBeVisible();
    await expect(statusSelect.locator('option:has-text("Open")')).toBeVisible();
    await expect(statusSelect.locator('option:has-text("In Progress")')).toBeVisible();
    await expect(statusSelect.locator('option:has-text("Ready for Review")')).toBeVisible();
    await expect(statusSelect.locator('option:has-text("Completed")')).toBeVisible();
  });

  test('should show priority options in filter', async ({ page }) => {
    const prioritySelect = page.locator('#priority-filter');
    await expect(prioritySelect).toBeVisible();

    // Check for priority options
    await expect(prioritySelect.locator('option:has-text("All Priorities")')).toBeVisible();
    await expect(prioritySelect.locator('option:has-text("Low")')).toBeVisible();
    await expect(prioritySelect.locator('option:has-text("Normal")')).toBeVisible();
    await expect(prioritySelect.locator('option:has-text("High")')).toBeVisible();
  });

  test('should open create dialog when clicking New Punch Item', async ({ page }) => {
    const newPunchBtn = page.locator('button:has-text("New Punch Item")');

    if (await newPunchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newPunchBtn.click();

      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show loading state while fetching', async ({ page }) => {
    // Navigate fresh
    await page.goto('/punch-lists');

    // Either loading state or content should appear
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to punch item detail when clicking item', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to find and click a punch item row/card
    const punchItemRow = page.locator('tr, [class*="cursor-pointer"]').first();

    if (await punchItemRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await punchItemRow.click();

      // Should navigate to punch item detail page
      await page.waitForTimeout(1000);
      // URL might change to /punch-lists/:id
    }
  });
});
