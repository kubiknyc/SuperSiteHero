/**
 * Authentication Fixtures for Playwright Tests
 *
 * Provides reusable authenticated contexts and helper functions
 */

import { test as base, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_FILE = path.join(__dirname, '../../playwright/.auth/user.json');
const ADMIN_AUTH_FILE = path.join(__dirname, '../../playwright/.auth/admin.json');

type AuthFixtures = {
  /** Regular authenticated user context */
  authenticatedPage: typeof base extends typeof base<infer T> ? T['page'] : never;
  /** Admin authenticated user context */
  adminPage: typeof base extends typeof base<infer T> ? T['page'] : never;
  /** Helper to login as a specific user */
  loginAs: (email: string, password: string) => Promise<void>;
  /** Helper to logout */
  logout: () => Promise<void>;
};

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Authenticated user page - reuses stored auth state
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Admin user page - reuses stored auth state
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: ADMIN_AUTH_FILE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Login helper
  loginAs: async ({ page }, use) => {
    const login = async (email: string, password: string) => {
      await page.goto('/');

      // Clear any existing session
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');

      // Wait for redirect
      await page.waitForURL(url => !url.pathname.includes('/login'), {
        timeout: 15000,
      });

      // Verify login success
      const userIndicator = page.locator(
        '[data-testid="user-menu"], [aria-label="User menu"]'
      );
      await expect(userIndicator.first()).toBeVisible({ timeout: 10000 });
    };

    await use(login);
  },

  // Logout helper
  logout: async ({ page }, use) => {
    const logout = async () => {
      // Open user menu if it exists
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
      await page.waitForSelector('input[type="email"], input[name="email"]', {
        timeout: 10000,
      });
    };

    await use(logout);
  },
});

export { expect } from '@playwright/test';
