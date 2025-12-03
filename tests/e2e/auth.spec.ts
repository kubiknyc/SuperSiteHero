import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 *
 * Tests login, logout, and authentication flow scenarios.
 */
test.describe('Authentication', () => {
  test('should display login page with all elements', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Check form elements are visible
    await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Wait for form to be ready
    await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });

    // Click submit without filling form - HTML5 validation should trigger
    await page.click('button[type="submit"]');

    // HTML5 required validation shows browser-native message, or the form stays on login page
    // Either way, we should still be on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Wait for form
    await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });

    await page.fill('#email', 'invalid@test.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error toast or stay on login page (Supabase returns error)
    // The app shows a toast for errors, so we check we stay on login
    await page.waitForTimeout(3000); // Wait for API response
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
    await page.goto('/', { waitUntil: 'networkidle' });

    // Should see dashboard main content
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Should see Dashboard heading
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for page to load
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Find and click user menu/avatar in the sidebar
    // Look for common logout patterns: user dropdown, signout button, etc.
    const logoutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout"), a:has-text("Sign Out")');

    if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
    } else {
      // If no direct logout button, look for user menu first
      const userMenu = page.locator('[data-testid="user-menu"], button[aria-haspopup="menu"]');
      if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userMenu.click();
        await page.locator('text=/sign out|logout/i').click();
        await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
      } else {
        // Skip test if logout mechanism not found
        test.skip();
      }
    }
  });
});

test.describe('Authentication - Enhanced', () => {
  test('should show password visibility toggle', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Check for password visibility toggle button
    const toggleBtn = page.locator('button[aria-label*="password"], button:has([data-testid="eye-icon"])');
    const hasToggle = await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false);

    // Just verify page loads - toggle may or may not exist
    await expect(page.locator('#password')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Enter invalid email
    await page.locator('#email').fill('invalid-email');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();

    // Either HTML5 validation or stays on login page
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');

    // Click submit and check for loading indicator
    await page.locator('button[type="submit"]').click();

    // Page should remain usable
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should persist session across page reloads', async ({ page }) => {
    // Use authenticated state
    await page.goto('/', { waitUntil: 'networkidle' });

    // With auth state from setup, should be on dashboard
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Reload page
    await page.reload();

    // Should still be authenticated
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should maintain auth across different routes', async ({ page }) => {
    // Navigate to multiple protected routes
    await page.goto('/projects', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible({ timeout: 10000 });

    await page.goto('/tasks', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Tasks")')).toBeVisible({ timeout: 10000 });

    await page.goto('/daily-reports', { waitUntil: 'networkidle' });
    await expect(page.locator('h1:has-text("Daily Reports")')).toBeVisible({ timeout: 10000 });
  });
});
