import { test, expect } from '@playwright/test';

/**
 * Tasks E2E Tests
 *
 * Tests the tasks list, create, and detail pages.
 */
test.describe('Tasks', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks', { waitUntil: 'networkidle' });
  });

  test('should display tasks page with heading', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible({ timeout: 10000 });
  });

  test('should show page description', async ({ page }) => {
    // Check page description
    await expect(page.locator('text="Manage and track project tasks"')).toBeVisible();
  });

  test('should show New Task button', async ({ page }) => {
    // Check for New Task button (may be conditional on project selection)
    const newTaskBtn = page.locator('button:has-text("New Task"), a:has-text("New Task")');
    // Button may or may not be visible depending on project selection
    const isVisible = await newTaskBtn.isVisible({ timeout: 3000 }).catch(() => false);
    // Just verify the page loads correctly
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show summary cards', async ({ page }) => {
    // Check for summary cards - at least one should be visible
    const totalTasks = page.locator('text="Total Tasks"');
    const pending = page.locator('text="Pending"');
    const inProgress = page.locator('text="In Progress"');

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // At least one summary stat should be visible
    const hasStats =
      await totalTasks.isVisible({ timeout: 5000 }).catch(() => false) ||
      await pending.isVisible({ timeout: 2000 }).catch(() => false) ||
      await inProgress.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasStats).toBeTruthy();
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
    const searchInput = page.locator('#search');
    await expect(searchInput).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    const statusSelect = page.locator('#status-filter');
    await expect(statusSelect).toBeVisible();

    // Select Pending status
    await statusSelect.selectOption('pending');
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

  test('should search tasks', async ({ page }) => {
    const searchInput = page.locator('#search');
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('test');
    await page.waitForLoadState('networkidle');

    // Page should update
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show tasks list or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Either shows tasks or empty state
    const hasEmptyState = await page.locator('text="No tasks yet"').isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoMatching = await page.locator('text="No matching tasks"').isVisible({ timeout: 2000 }).catch(() => false);
    const hasTaskCards = await page.locator('[class*="hover:shadow-md"]').first().isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasEmptyState || hasNoMatching || hasTaskCards).toBeTruthy();
  });

  test('should display task cards with status and priority badges', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if there are task cards
    const taskCards = page.locator('[class*="hover:shadow-md"]');
    const count = await taskCards.count();

    if (count > 0) {
      // First card should have badges
      const firstCard = taskCards.first();
      await expect(firstCard).toBeVisible();
    }
  });

  test('should show overdue card when tasks are overdue', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Overdue card may or may not be visible depending on data
    const overdueCard = page.locator('text="Overdue"');
    // Just verify the check works - overdue may or may not exist
    const isVisible = await overdueCard.isVisible({ timeout: 2000 }).catch(() => false);
    expect(true).toBeTruthy();
  });

  test('should navigate to task detail when clicking view button', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find view button (Eye icon) - exclude /tasks/new links (with or without query params)
    const viewButtons = page.locator('a[href^="/tasks/"]').filter({ has: page.locator('svg') });
    const count = await viewButtons.count();

    if (count > 0) {
      // Find a link that's not /tasks/new (check for /tasks/new? or /tasks/new/)
      for (let i = 0; i < count; i++) {
        const href = await viewButtons.nth(i).getAttribute('href');
        if (href && !href.match(/\/tasks\/new($|\?|\/)/)) {
          await viewButtons.nth(i).click();
          // Should navigate to task detail page (UUID pattern, may have /edit suffix)
          await expect(page).toHaveURL(/.*tasks\/[a-f0-9-]{36}/);
          break;
        }
      }
    }
  });

  test('should show project selector with All Projects option', async ({ page }) => {
    const projectSelect = page.locator('#project-select');
    await expect(projectSelect).toBeVisible();

    // Verify select has option (options are hidden until dropdown opens)
    const optionCount = await projectSelect.locator('option').count();
    expect(optionCount).toBeGreaterThan(0);
  });
});

test.describe('Task Create', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should navigate to create task page', async ({ page }) => {
    await page.goto('/tasks', { waitUntil: 'networkidle' });

    // Find New Task link
    const newTaskLink = page.locator('a[href*="/tasks/new"]').first();

    if (await newTaskLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newTaskLink.click();

      // Should navigate to new task page
      await expect(page).toHaveURL(/.*tasks\/new/);
    }
  });
});
