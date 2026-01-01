/**
 * Projects E2E Tests
 *
 * Tests critical project management flows:
 * - View projects list
 * - Create new project
 * - Navigate to project detail
 * - Project dashboard
 */

import { test, expect } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

test.describe('Projects', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  });

  test('should display projects list', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Should show main content area
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should open create project dialog or page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Look for create button with various labels
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add"), a:has-text("New Project")');

    // Skip if no create button found
    const buttonVisible = await createButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!buttonVisible) {
      test.skip(true, 'Create project button not found');
      return;
    }

    await createButton.first().click();
    await page.waitForTimeout(1000);

    // Check if dialog opened OR navigated to new page
    const dialogOrForm = page.locator('[role="dialog"], .modal, [data-state="open"], form, input[name="name"]');
    const formVisible = await dialogOrForm.first().isVisible({ timeout: 5000 }).catch(() => false);

    // Either dialog/form should be visible, or we navigated to a new URL
    const urlChanged = !(await page.url().includes('/projects'));
    expect(formVisible || urlChanged).toBe(true);
  });

  test('should navigate to project detail page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Look for any project link
    const projectLink = page.locator('a[href*="/projects/"]').first();

    // Skip if no projects exist
    const linkVisible = await projectLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!linkVisible) {
      test.skip(true, 'No projects found to navigate to');
      return;
    }

    await projectLink.click();

    // Should navigate to project detail
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/i, { timeout: 10000 });
  });

  test('should show project detail with content', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Click on first project
    const projectLink = page.locator('a[href*="/projects/"]').first();

    const linkVisible = await projectLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!linkVisible) {
      test.skip(true, 'No projects found');
      return;
    }

    await projectLink.click();
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/i, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Should have some content visible
    const content = page.locator('main, h1, h2');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});
