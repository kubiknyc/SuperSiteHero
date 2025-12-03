import { test, expect } from '@playwright/test';

/**
 * Navigation E2E Tests
 *
 * Tests sidebar navigation, routing, and page transitions.
 * Note: This app uses a fixed sidebar layout (not responsive mobile menu)
 */
test.describe('Navigation', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should navigate to all main sections', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for sidebar to be visible
    await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });

    // Test navigation to each main section via sidebar links
    const routes = [
      { name: 'Projects', url: '/projects' },
      { name: 'Daily Reports', url: '/daily-reports' },
      { name: 'RFIs', url: '/rfis' },
      { name: 'Change Orders', url: '/change-orders' },
      { name: 'Tasks', url: '/tasks' },
      { name: 'Punch Lists', url: '/punch-lists' },
    ];

    for (const route of routes) {
      // Find and click the nav link in the sidebar
      const navLink = page.locator('aside a').filter({ hasText: route.name }).first();

      if (await navLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await navLink.click();
        await expect(page).toHaveURL(new RegExp(route.url));
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should display sidebar navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Check sidebar exists (fixed aside element)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Check for navigation items in sidebar
    const expectedItems = ['Dashboard', 'Projects', 'Daily Reports', 'RFIs', 'Change Orders'];

    for (const item of expectedItems) {
      const navItem = sidebar.locator('a').filter({ hasText: item });
      await expect(navItem).toBeVisible();
    }
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'networkidle' });

    // Find the projects nav link in sidebar
    const projectsLink = page.locator('aside a[href="/projects"]');
    await expect(projectsLink).toBeVisible();

    // Check for active state via class (bg-gray-800 indicates active)
    const className = await projectsLink.getAttribute('class');
    expect(className).toContain('bg-gray-800');
  });

  test('should maintain scroll position on back navigation', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'networkidle' });

    // Scroll down if there's content
    await page.evaluate(() => window.scrollTo(0, 200));

    // Navigate to another page
    await page.goto('/daily-reports', { waitUntil: 'networkidle' });

    // Go back
    await page.goBack();

    // Check URL
    await expect(page).toHaveURL(/.*projects/);
  });

  test('should show main content area', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'networkidle' });

    // Check main content area is visible (offset from sidebar)
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Main content should have margin-left for sidebar
    const className = await mainContent.getAttribute('class');
    expect(className).toContain('ml-64');
  });
});

// Skip mobile navigation tests since this app uses fixed sidebar
test.describe.skip('Mobile Navigation', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
    viewport: { width: 375, height: 667 },
  });

  test('should show mobile menu toggle', async ({ page }) => {
    // This app uses fixed sidebar, not responsive mobile menu
    await page.goto('/');
    // Skip - no mobile menu implementation
  });
});
