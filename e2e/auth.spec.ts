/**
 * Authentication E2E Tests
 *
 * Tests critical authentication flows:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Logout
 * - Session persistence
 * - Protected route access
 */

import { test, expect } from '@playwright/test';

// Test credentials from environment
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh - clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login or show login form
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/');

    // Fill in credentials
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Submit login form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or projects page
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 15000 });

    // Should show user is logged in (look for logout button or user menu)
    const userIndicator = page.locator('[data-testid="user-menu"], [aria-label="User menu"], button:has-text("Logout"), button:has-text("Sign out")');
    await expect(userIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');

    // Fill in invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit login form
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = page.locator('[role="alert"], .error, .text-red-500, .text-destructive');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 15000 });

    // Find and click logout button
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label="User menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }

    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")');
    await logoutButton.first().click();

    // Should redirect to login page
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('should persist session after page refresh', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 15000 });

    // Refresh the page
    await page.reload();

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 10000 });
  });

  test('should redirect protected routes to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/projects');

    // Should redirect to login
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });
});
