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

    // Wait for login to complete - either URL changes OR dashboard content appears
    // Some apps stay on same URL after login or redirect to root
    try {
      await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
    } catch {
      // If URL doesn't change, check if we're authenticated by looking for dashboard content
      const dashboardContent = page.locator('h1:has-text("Dashboard")')
        .or(page.getByText(/Welcome back/i))
        .or(page.locator('a[href="/settings"]'));
      await expect(dashboardContent.first()).toBeVisible({ timeout: 15000 });
    }

    // Should show user is logged in - look for:
    // 1. User avatar link (shows initials like "TU")
    // 2. Welcome message
    // 3. Dashboard heading
    // 4. Settings link in header
    const userIndicator = page.locator('a[href="/settings/profile"]')
      .or(page.getByText(/Welcome back/i))
      .or(page.locator('h1:has-text("Dashboard")'))
      .or(page.locator('a[href="/settings"]'));
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

    // Wait for login to complete
    try {
      await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
    } catch {
      // If URL doesn't change, wait for dashboard content
      await page.locator('h1:has-text("Dashboard")').or(page.getByText(/Welcome back/i)).first().waitFor({ timeout: 15000 });
    }

    // Wait for the page to fully load
    await page.waitForLoadState('domcontentloaded');

    // Navigate to settings page where logout is available
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    // Look for logout/sign out button in sidebar or settings page
    // Try multiple selectors for different layouts
    const logoutButton = page.locator('button:has-text("Sign Out")')
      .or(page.locator('button:has-text("Logout")'))
      .or(page.locator('a:has-text("Sign Out")'))
      .or(page.locator('a:has-text("Logout")'))
      .or(page.locator('[data-testid="logout-button"]'));

    await logoutButton.first().click({ timeout: 10000 });

    // Should redirect to login page
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('should persist session after page refresh', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for login to complete
    try {
      await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
    } catch {
      await page.locator('h1:has-text("Dashboard")').or(page.getByText(/Welcome back/i)).first().waitFor({ timeout: 15000 });
    }

    // Refresh the page
    await page.reload();

    // Should still be logged in (session persisted) - not redirected to login
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
  });

  test('should redirect protected routes to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/projects');

    // Should redirect to login
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });
});
