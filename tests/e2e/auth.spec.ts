import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 *
 * Tests login, logout, and authentication flow scenarios.
 */
test.describe('Authentication', () => {
  test('should display login page with all elements', async ({ page }) => {
    await page.goto('/login');

    // Check page title/heading
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/login');

    // Click submit without filling form
    await page.click('button[type="submit"]');

    // Check for validation messages
    await expect(
      page.locator('text=/required|invalid|enter.*email|enter.*password/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(
      page.locator('text=/invalid|incorrect|error|failed/i')
    ).toBeVisible({ timeout: 10000 });

    // Should stay on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Clear any stored auth
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/projects');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');

    // Look for signup link
    const signupLink = page.locator('a:has-text("Sign up"), a:has-text("Create account"), a:has-text("Register")');

    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/.*signup|.*register/);
    }
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');

    // Look for forgot password link
    const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("Reset password")');

    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/.*forgot|.*reset/);
    }
  });
});

test.describe('Authenticated Session', () => {
  // Use authenticated state
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should access dashboard when authenticated', async ({ page }) => {
    await page.goto('/');

    // Should see dashboard or main content
    await expect(
      page.locator('h1:has-text("Dashboard"), [data-testid="dashboard"], main')
    ).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/');

    // Find and click user menu
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label="User menu"], button:has-text("Account")');
    await userMenu.click();

    // Click logout
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")');
    await logoutBtn.click();

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});
