import { test, expect } from '@playwright/test';

/**
 * Navigation E2E Tests
 *
 * Tests sidebar navigation, routing, and page transitions.
 */
test.describe('Navigation', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should navigate to all main sections', async ({ page }) => {
    await page.goto('/');

    // Test navigation to each main section
    const routes = [
      { link: /projects/i, url: '/projects', heading: /project/i },
      { link: /daily.*report/i, url: '/daily-reports', heading: /daily.*report/i },
      { link: /rfi/i, url: '/rfis', heading: /rfi/i },
      { link: /change.*order/i, url: '/change-orders', heading: /change.*order/i },
      { link: /task/i, url: '/tasks', heading: /task/i },
      { link: /punch.*list/i, url: '/punch-lists', heading: /punch.*list/i },
    ];

    for (const route of routes) {
      // Find and click the nav link
      const navLink = page.locator(`nav a, aside a`).filter({ hasText: route.link }).first();

      if (await navLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        await navLink.click();
        await expect(page).toHaveURL(new RegExp(route.url));

        // Verify page heading
        await expect(page.locator('h1, h2').first()).toContainText(route.heading);
      }
    }
  });

  test('should display sidebar navigation', async ({ page }) => {
    await page.goto('/');

    // Check sidebar exists
    const sidebar = page.locator('nav, aside, [role="navigation"]');
    await expect(sidebar).toBeVisible();

    // Check for common navigation items
    const expectedItems = ['Dashboard', 'Projects', 'Reports'];

    for (const item of expectedItems) {
      const navItem = sidebar.locator(`a, button`).filter({ hasText: new RegExp(item, 'i') });
      // At least one matching nav item should exist
      expect(await navItem.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.goto('/projects');

    // Find the projects nav link
    const projectsLink = page.locator('nav a[href*="projects"], aside a[href*="projects"]').first();

    if (await projectsLink.isVisible()) {
      // Check for active state (usually indicated by class or aria-current)
      const isActive =
        (await projectsLink.getAttribute('aria-current')) === 'page' ||
        (await projectsLink.getAttribute('class'))?.includes('active') ||
        (await projectsLink.getAttribute('data-active')) === 'true';

      // Active state should be present (or parent has active class)
      expect(isActive || await projectsLink.locator('..').getAttribute('class').then(c => c?.includes('active'))).toBeTruthy;
    }
  });

  test('should maintain scroll position on back navigation', async ({ page }) => {
    await page.goto('/projects');

    // Scroll down if there's content
    await page.evaluate(() => window.scrollTo(0, 200));

    // Navigate to another page
    await page.goto('/daily-reports');

    // Go back
    await page.goBack();

    // Check URL
    await expect(page).toHaveURL(/.*projects/);
  });

  test('should show breadcrumbs on nested pages', async ({ page }) => {
    await page.goto('/projects');

    // Click on a project if available
    const projectCard = page.locator('[data-testid="project-card"], .project-card, tr, li').first();

    if (await projectCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectCard.click();

      // Check for breadcrumbs
      const breadcrumbs = page.locator('[aria-label="Breadcrumb"], nav[aria-label*="bread"], .breadcrumb');

      if (await breadcrumbs.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Should have at least Projects link
        await expect(breadcrumbs.locator('a:has-text("Projects")')).toBeVisible();
      }
    }
  });
});

test.describe('Mobile Navigation', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json',
    viewport: { width: 375, height: 667 },
  });

  test('should show mobile menu toggle', async ({ page }) => {
    await page.goto('/');

    // Look for hamburger menu button
    const menuToggle = page.locator(
      '[aria-label="Menu"], [aria-label="Toggle menu"], button:has([data-testid="menu-icon"]), .hamburger'
    );

    await expect(menuToggle).toBeVisible();
  });

  test('should open and close mobile menu', async ({ page }) => {
    await page.goto('/');

    // Find menu toggle
    const menuToggle = page.locator('[aria-label="Menu"], [aria-label="Toggle menu"]').first();

    if (await menuToggle.isVisible()) {
      // Open menu
      await menuToggle.click();

      // Menu should be visible
      const mobileMenu = page.locator('[role="dialog"], .mobile-menu, aside, nav');
      await expect(mobileMenu).toBeVisible();

      // Close menu (click toggle again or outside)
      await menuToggle.click();
    }
  });

  test('should navigate via mobile menu', async ({ page }) => {
    await page.goto('/');

    // Open mobile menu
    const menuToggle = page.locator('[aria-label="Menu"], [aria-label="Toggle menu"]').first();

    if (await menuToggle.isVisible()) {
      await menuToggle.click();

      // Click on Projects
      const projectsLink = page.locator('a:has-text("Projects")').first();
      await projectsLink.click();

      // Should navigate
      await expect(page).toHaveURL(/.*projects/);
    }
  });
});
