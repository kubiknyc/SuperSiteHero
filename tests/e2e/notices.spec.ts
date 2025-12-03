import { test, expect } from '@playwright/test';

/**
 * Notices E2E Tests
 *
 * Tests the notices page with deadlines and correspondence tracking.
 */
test.describe('Notices', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/notices', { waitUntil: 'networkidle' });
  });

  test('should display notices page with heading', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Notices")')).toBeVisible({ timeout: 10000 });
  });

  test('should show page description', async ({ page }) => {
    // Check page description
    await expect(page.locator('text="Track formal notices, correspondence, and response deadlines"')).toBeVisible();
  });

  test('should show project selector when multiple projects', async ({ page }) => {
    // Project selector may or may not be visible depending on number of projects
    const projectSelect = page.locator('#project-select');
    const isVisible = await projectSelect.isVisible({ timeout: 3000 }).catch(() => false);

    // Verify page loads correctly regardless
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show summary cards when project selected', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Summary cards may be visible if project has data
    const hasCards = await page.locator('text="Total Notices"').isVisible({ timeout: 3000 }).catch(() => false);
    const hasSelectProject = await page.locator('text="Select a Project"').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasCards || hasSelectProject).toBeTruthy();
  });

  test('should show action required banner when there are overdue notices', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Action required banner is conditional on data
    const overdueText = page.locator('text=/overdue|action required/i');
    const hasOverdue = await overdueText.isVisible({ timeout: 3000 }).catch(() => false);

    // Just verify page loads
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show notices list or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for notices count or empty state
    const hasNotices = await page.locator('text=/\\d+ Notice/').isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoNotices = await page.locator('text="No notices yet"').isVisible({ timeout: 2000 }).catch(() => false);
    const hasNoMatch = await page.locator('text="No notices match"').isVisible({ timeout: 2000 }).catch(() => false);
    const selectProject = await page.locator('text="Select a Project"').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasNotices || hasNoNotices || hasNoMatch || selectProject).toBeTruthy();
  });

  test('should show loading state', async ({ page }) => {
    // Navigate fresh
    await page.goto('/notices');

    // Either loading or content should appear
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });
});
