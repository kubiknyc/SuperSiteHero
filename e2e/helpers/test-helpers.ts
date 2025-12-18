/**
 * Test Helper Functions
 *
 * Shared utilities for Playwright E2E tests to reduce duplication
 * and improve test maintainability.
 */

import { Page, expect } from '@playwright/test';

/**
 * Login helper - authenticates user and waits for successful login
 */
export async function loginAsTestUser(
  page: Page,
  email: string = process.env.TEST_USER_EMAIL || 'test@example.com',
  password: string = process.env.TEST_USER_PASSWORD || 'testpassword123'
) {
  // Clear all browser storage to ensure clean state
  await page.context().clearCookies();

  // Try to clear localStorage and sessionStorage, ignore security errors
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore security errors
      }
    });
  } catch (e) {
    // Ignore any errors from clearing storage
  }

  // Navigate directly to /login
  await page.goto('/login');

  // Wait for login page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for successful login and navigation away from login page
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}

/**
 * Logout helper - logs out current user
 */
export async function logout(page: Page) {
  // Find and click user menu if present
  const userMenu = page.locator('[data-testid="user-menu"], [aria-label="User menu"]');
  if (await userMenu.isVisible()) {
    await userMenu.click();
  }

  // Click logout button
  const logoutButton = page.locator(
    'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
  );
  await logoutButton.first().click();

  // Wait for redirect to login
  await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Navigate to a specific page and wait for it to load
 */
export async function navigateToPage(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Fill a form field by various selectors
 */
export async function fillFormField(
  page: Page,
  fieldName: string,
  value: string,
  fieldType: 'input' | 'textarea' | 'select' = 'input'
) {
  const selector =
    fieldType === 'textarea'
      ? `textarea[name="${fieldName}"], textarea[placeholder*="${fieldName}" i]`
      : fieldType === 'select'
      ? `select[name="${fieldName}"]`
      : `input[name="${fieldName}"], input[placeholder*="${fieldName}" i]`;

  const field = page.locator(selector).first();

  if (fieldType === 'select') {
    await field.selectOption(value);
  } else {
    await field.fill(value);
  }
}

/**
 * Submit a form and wait for navigation or success
 */
export async function submitForm(page: Page) {
  const submitButton = page.locator(
    'button[type="submit"], button:has-text("Create"), button:has-text("Save"), button:has-text("Submit")'
  ).first();

  await submitButton.click();
  await page.waitForTimeout(2000);
}

/**
 * Check if success message is displayed
 */
export async function expectSuccessMessage(page: Page, timeout: number = 5000) {
  const successMessage = page.locator('[role="alert"]').filter({ hasText: /success|created|updated|saved/i });
  await expect(successMessage.first()).toBeVisible({ timeout });
}

/**
 * Check if error message is displayed
 */
export async function expectErrorMessage(page: Page, timeout: number = 5000) {
  const errorMessage = page.locator(
    '[role="alert"], .error, .text-red-500, .text-destructive'
  );
  await expect(errorMessage.first()).toBeVisible({ timeout });
}

/**
 * Click the first item in a list
 */
export async function clickFirstListItem(page: Page, itemSelector: string) {
  await page.waitForTimeout(2000);
  const firstItem = page.locator(itemSelector).first();

  if (await firstItem.isVisible()) {
    await firstItem.click();
    return true;
  }
  return false;
}

/**
 * Apply a filter by selecting from a dropdown
 */
export async function applyFilter(
  page: Page,
  filterName: string,
  optionIndex: number = 1
) {
  const filter = page.locator(
    `select[name="${filterName}"], [data-testid="${filterName}-filter"]`
  ).first();

  if (await filter.isVisible()) {
    await filter.selectOption({ index: optionIndex });
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

/**
 * Search using the search input
 */
export async function searchFor(page: Page, searchTerm: string) {
  const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

  if (await searchInput.isVisible()) {
    await searchInput.fill(searchTerm);
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

/**
 * Wait for page to finish loading (generic loader detection)
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');

  // Wait for common loaders to disappear
  const loaders = page.locator('[data-testid="loader"], .loading, .spinner');
  if (await loaders.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await loaders.first().waitFor({ state: 'hidden', timeout: 10000 });
  }
}

/**
 * Generate unique test data with timestamp
 */
export function generateTestData(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).count() > 0;
}

/**
 * Click edit button and navigate to edit page
 */
export async function navigateToEdit(page: Page) {
  const editButton = page.locator('button, a').filter({ hasText: /edit/i }).first();

  if (await editButton.isVisible()) {
    await editButton.click();
    await page.waitForLoadState('networkidle');
    return true;
  }
  return false;
}

/**
 * Upload a file to a file input
 */
export async function uploadFile(page: Page, filePath: string, inputSelector?: string) {
  const fileInput = inputSelector
    ? page.locator(inputSelector)
    : page.locator('input[type="file"]').first();

  await fileInput.setInputFiles(filePath);
}

/**
 * Take a screenshot with automatic naming
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `./test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true
  });
}
