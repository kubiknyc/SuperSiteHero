import { test, expect } from '@playwright/test';

/**
 * Performance E2E Tests
 *
 * Tests for page load times and rendering performance.
 */
test.describe('Performance', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should load dashboard under 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load projects page under 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/projects', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible({ timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load daily reports page under 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/daily-reports', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Daily Reports")')).toBeVisible({ timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load tasks page under 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/tasks', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible({ timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load RFIs page under 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/rfis', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Requests for Information")')).toBeVisible({ timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load change orders page under 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/change-orders', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Change Orders")')).toBeVisible({ timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should navigate between pages quickly', async ({ page }) => {
    // Start on dashboard
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

    // Navigate to projects
    const startTime1 = Date.now();
    await page.locator('aside a:has-text("Projects")').click();
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible({ timeout: 10000 });
    const navTime1 = Date.now() - startTime1;

    // Navigate to tasks
    const startTime2 = Date.now();
    await page.locator('aside a:has-text("Tasks")').click();
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible({ timeout: 10000 });
    const navTime2 = Date.now() - startTime2;

    // Navigation should be quick (under 3 seconds each)
    expect(navTime1).toBeLessThan(3000);
    expect(navTime2).toBeLessThan(3000);
  });

  test('should handle rapid navigation without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Rapidly navigate between pages
    const pages = [
      { link: 'Projects', heading: 'Projects' },
      { link: 'Daily Reports', heading: 'Daily Reports' },
      { link: 'Tasks', heading: 'Tasks' },
      { link: 'Dashboard', heading: 'Dashboard' },
    ];

    for (const nav of pages) {
      const navLink = page.locator(`aside a:has-text("${nav.link}")`);
      if (await navLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await navLink.click();
        await page.waitForLoadState('domcontentloaded');
      }
    }

    // Page should still be functional
    await expect(page.locator('main')).toBeVisible();
  });

  test('should filter list quickly', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[placeholder*="Search"]');

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const startTime = Date.now();

      // Type search query
      await searchInput.fill('test');
      await page.waitForLoadState('networkidle');

      const filterTime = Date.now() - startTime;

      // Filtering should be quick (under 2 seconds)
      expect(filterTime).toBeLessThan(2000);
    }
  });

  test('should maintain scroll performance', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'networkidle' });

    // Scroll down and up multiple times
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(100);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
    }

    // Page should still be responsive
    await expect(page.locator('main')).toBeVisible();
  });
});
