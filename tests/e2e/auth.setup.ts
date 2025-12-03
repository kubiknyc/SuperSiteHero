import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, '.auth', 'user.json');

/**
 * Authentication Setup
 *
 * This runs before all tests to create an authenticated session.
 * The session is saved and reused across all test files.
 */
setup('authenticate', async ({ page }) => {
  // Use test credentials from environment or fallback
  const email = process.env.TEST_USER_EMAIL || 'test@supersitehero.com';
  const password = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

  // Navigate to login page and wait for it to fully load
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Wait for the login form to be visible (using ID selector)
  const emailInput = page.locator('#email');
  await expect(emailInput).toBeVisible({ timeout: 15000 });

  // Fill in credentials
  await emailInput.fill(email);
  await page.locator('#password').fill(password);

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for successful redirect (either dashboard or root)
  await page.waitForURL(/\/(dashboard|projects)?$/, { timeout: 20000 });

  // Verify we're authenticated by checking for dashboard main element
  await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
