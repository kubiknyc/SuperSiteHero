import { test, expect } from '@playwright/test';

/**
 * Analytics E2E Tests
 *
 * Tests the predictive analytics page.
 */
test.describe('Analytics', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'networkidle' });
  });

  test('should display analytics page with heading', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h1:has-text("Predictive Analytics")')).toBeVisible({ timeout: 10000 });
  });

  test('should show project selector when no project selected', async ({ page }) => {
    // Check for Select a Project heading
    await expect(page.locator('text="Select a Project"')).toBeVisible();
  });

  test('should show analytics icon', async ({ page }) => {
    // Check for analytics icon (emoji)
    await expect(page.locator('text="📊"')).toBeVisible();
  });

  test('should show project description text', async ({ page }) => {
    // Check for description
    await expect(page.locator('text="Choose a project to view its predictive analytics dashboard"')).toBeVisible();
  });

  test('should show project links when projects exist', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Either shows project links or no projects message
    const hasProjectLinks = await page.locator('a[href*="/projects/"][href*="/analytics"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoProjects = await page.locator('text="No projects available"').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasProjectLinks || hasNoProjects).toBeTruthy();
  });

  test('should navigate to project analytics', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click first project link if available
    const projectLinks = page.locator('a[href*="/projects/"][href*="/analytics"]');
    const count = await projectLinks.count();

    if (count > 0) {
      await projectLinks.first().click();

      // Should navigate to project analytics page
      await expect(page).toHaveURL(/.*projects\/[a-z0-9-]+\/analytics/);
    }
  });

  test('should show loading state', async ({ page }) => {
    // Navigate fresh
    await page.goto('/analytics');

    // Either loading or content should appear
    await expect(page.locator('main, .container')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Project Analytics', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should show breadcrumb navigation on project analytics', async ({ page }) => {
    // First go to analytics and select a project
    await page.goto('/analytics', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click first project link if available
    const projectLinks = page.locator('a[href*="/projects/"][href*="/analytics"]');
    const count = await projectLinks.count();

    if (count > 0) {
      await projectLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Should show breadcrumb with Projects link
      await expect(page.locator('a:has-text("Projects")')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text="Analytics"')).toBeVisible();
    }
  });
});
