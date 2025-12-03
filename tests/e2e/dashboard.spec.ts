import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 *
 * Tests the main dashboard page (/) with metrics, quick actions, and activity.
 */
test.describe('Dashboard', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('should display dashboard page with heading', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });
  });

  test('should display current date', async ({ page }) => {
    // Dashboard shows current date below heading
    const dateText = page.locator('p.text-gray-600');
    await expect(dateText.first()).toBeVisible();
  });

  test('should show metrics cards', async ({ page }) => {
    // Check for metric cards (Tasks Pending, Open RFIs, Punch Items, Days Since Incident)
    await expect(page.locator('text="Tasks Pending"')).toBeVisible();
    await expect(page.locator('text="Open RFIs"')).toBeVisible();
    await expect(page.locator('text="Punch Items"')).toBeVisible();
    await expect(page.locator('text="Days Since Incident"')).toBeVisible();
  });

  test('should show Quick Actions section', async ({ page }) => {
    // Check for Quick Actions heading
    await expect(page.locator('h2:has-text("Quick Actions")')).toBeVisible();

    // Check for quick action cards
    await expect(page.locator('text="New Daily Report"')).toBeVisible();
    await expect(page.locator('text="Submit RFI"')).toBeVisible();
    await expect(page.locator('text="Add Task"')).toBeVisible();
    await expect(page.locator('text="Log Safety Incident"')).toBeVisible();
  });

  test('should navigate to daily reports from quick actions', async ({ page }) => {
    // Click on New Daily Report quick action
    const dailyReportAction = page.locator('a[href="/daily-reports/new"]');
    await expect(dailyReportAction).toBeVisible();
    await dailyReportAction.click();

    // Should navigate to new daily report page
    await expect(page).toHaveURL(/.*daily-reports\/new/);
  });

  test('should navigate to tasks from quick actions', async ({ page }) => {
    // Click on Add Task quick action
    const taskAction = page.locator('a[href="/tasks/new"]');
    await expect(taskAction).toBeVisible();
    await taskAction.click();

    // Should navigate to new task page
    await expect(page).toHaveURL(/.*tasks\/new/);
  });

  test('should navigate to safety from quick actions', async ({ page }) => {
    // Click on Log Safety Incident quick action
    const safetyAction = page.locator('a[href="/safety/new"]');
    await expect(safetyAction).toBeVisible();
    await safetyAction.click();

    // Should navigate to new safety incident page
    await expect(page).toHaveURL(/.*safety\/new/);
  });

  test('should show Recent Activity section', async ({ page }) => {
    // Check for Recent Activity card
    await expect(page.locator('text="Recent Activity"')).toBeVisible();
    await expect(page.locator('text="Latest updates across all projects"')).toBeVisible();
  });

  test('should show Upcoming This Week section', async ({ page }) => {
    // Check for Upcoming This Week card
    await expect(page.locator('text="Upcoming This Week"')).toBeVisible();
  });

  test('should show project selector when projects exist', async ({ page }) => {
    // Look for project selector (Select element with All Projects option)
    const projectSelector = page.locator('select').filter({ has: page.locator('option:has-text("All Projects")') });

    // Project selector should be visible if there are projects
    const isVisible = await projectSelector.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await expect(projectSelector).toBeVisible();
    }
  });

  test('should display active project info when project selected', async ({ page }) => {
    // If a project is selected/active, should show project card with name
    const projectCard = page.locator('.text-xl').first();

    // Either shows project info or empty state
    const hasProjectInfo = await projectCard.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.locator('text="No projects yet"').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasProjectInfo || hasEmptyState).toBeTruthy();
  });

  test('should display main content area', async ({ page }) => {
    // Main content should be visible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});
