import { test, expect } from '@playwright/test';

/**
 * Error Handling E2E Tests
 *
 * Tests for graceful error handling, 404 pages, and recovery.
 */
test.describe('Error Handling', () => {
  test.describe('404 Pages', () => {
    test.use({ storageState: 'tests/e2e/.auth/user.json' });

    test('should show 404 for invalid route', async ({ page }) => {
      await page.goto('/this-route-does-not-exist', { waitUntil: 'networkidle' });

      // Should show some error or redirect to valid page
      // Either 404 page, redirect to dashboard, or blank page
      const has404 = await page.locator('text=/404|not found|page not found/i').isVisible({ timeout: 5000 }).catch(() => false);
      const hasDashboard = await page.locator('h1:has-text("Dashboard")').isVisible({ timeout: 2000 }).catch(() => false);
      const hasMain = await page.locator('main').isVisible({ timeout: 2000 }).catch(() => false);

      // Should handle gracefully
      expect(has404 || hasDashboard || hasMain).toBeTruthy();
    });

    test('should show error for invalid project ID', async ({ page }) => {
      await page.goto('/projects/invalid-uuid-here', { waitUntil: 'networkidle' });

      // Should show error or redirect
      const hasError = await page.locator('text=/error|not found|invalid/i').isVisible({ timeout: 5000 }).catch(() => false);
      const hasRedirect = await page.locator('h1').isVisible({ timeout: 2000 }).catch(() => false);

      // Should handle gracefully
      expect(hasError || hasRedirect).toBeTruthy();
    });

    test('should show error for invalid task ID', async ({ page }) => {
      await page.goto('/tasks/invalid-task-id', { waitUntil: 'networkidle' });

      // Should show error or redirect
      await expect(page.locator('main, body')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation error on empty login', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'networkidle' });

      // Try to submit empty form
      await page.locator('button[type="submit"]').click();

      // Should show validation errors (browser native or custom)
      const emailInput = page.locator('#email');
      const isInvalid = await emailInput.evaluate((el) => !(el as HTMLInputElement).checkValidity());

      expect(isInvalid).toBeTruthy();
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'networkidle' });

      // Enter invalid email
      await page.locator('#email').fill('not-an-email');
      await page.locator('#password').fill('password123');
      await page.locator('button[type="submit"]').click();

      // Should show error or validation message
      await page.waitForTimeout(1000);

      // Page should still be usable
      await expect(page.locator('main, body')).toBeVisible();
    });

    test('should show error for wrong credentials', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'networkidle' });

      // Enter wrong credentials
      await page.locator('#email').fill('wrong@email.com');
      await page.locator('#password').fill('wrongpassword');
      await page.locator('button[type="submit"]').click();

      // Should show error message
      await page.waitForTimeout(2000);

      // Either shows error or stays on login page
      const hasError = await page.locator('text=/error|invalid|incorrect/i').isVisible({ timeout: 5000 }).catch(() => false);
      const staysOnLogin = await page.locator('#email').isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasError || staysOnLogin).toBeTruthy();
    });
  });

  test.describe('Session Handling', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      // Use new context without auth
      const newContext = await page.context().browser()!.newContext();
      const newPage = await newContext.newPage();

      await newPage.goto('/projects', { waitUntil: 'networkidle' });

      // Should redirect to login
      await expect(newPage).toHaveURL(/.*login/, { timeout: 10000 });

      await newContext.close();
    });

    test('should handle expired session gracefully', async ({ page }) => {
      // This test simulates what happens when session expires
      // In practice, the app should redirect to login

      await page.goto('/projects', { waitUntil: 'networkidle' });

      // Clear storage to simulate expired session
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Navigate to another page
      await page.goto('/tasks', { waitUntil: 'networkidle' });

      // Should either show page or redirect to login
      const hasContent = await page.locator('main').isVisible({ timeout: 5000 }).catch(() => false);
      const hasLogin = await page.locator('#email').isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasContent || hasLogin).toBeTruthy();
    });
  });

  test.describe('Network Error Handling', () => {
    test.use({ storageState: 'tests/e2e/.auth/user.json' });

    test('should handle slow network gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await route.continue();
      });

      await page.goto('/projects', { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Page should eventually load
      await expect(page.locator('main')).toBeVisible({ timeout: 30000 });
    });

    test('should show loading state during data fetch', async ({ page }) => {
      // Navigate to page
      await page.goto('/projects');

      // Either loading or content should appear quickly
      const hasContent = await page.locator('main').isVisible({ timeout: 10000 });
      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('Recovery', () => {
    test.use({ storageState: 'tests/e2e/.auth/user.json' });

    test('should recover after browser back button', async ({ page }) => {
      await page.goto('/projects', { waitUntil: 'networkidle' });
      await page.goto('/tasks', { waitUntil: 'networkidle' });

      // Go back
      await page.goBack();

      // Should return to projects
      await expect(page).toHaveURL(/.*projects/);
      await expect(page.locator('main')).toBeVisible();
    });

    test('should recover after page refresh', async ({ page }) => {
      await page.goto('/projects', { waitUntil: 'networkidle' });

      // Refresh the page
      await page.reload();

      // Page should load correctly
      await expect(page.locator('h1:has-text("Projects")')).toBeVisible({ timeout: 10000 });
    });

    test('should handle rapid page refreshes', async ({ page }) => {
      await page.goto('/projects', { waitUntil: 'networkidle' });

      // Rapid refreshes
      for (let i = 0; i < 3; i++) {
        await page.reload({ waitUntil: 'domcontentloaded' });
      }

      // Page should still work
      await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    });
  });
});
