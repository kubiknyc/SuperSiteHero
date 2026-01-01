/**
 * Authentication Fixtures for Playwright Tests
 *
 * Provides reusable authenticated contexts and helper functions for all roles.
 * Supports email/password, magic link, MFA, and OAuth authentication.
 */

import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auth state file paths
const AUTH_DIR = path.join(__dirname, '../../playwright/.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'user.json');
const ADMIN_AUTH_FILE = path.join(AUTH_DIR, 'admin.json');
const PM_AUTH_FILE = path.join(AUTH_DIR, 'pm.json');
const SUPER_AUTH_FILE = path.join(AUTH_DIR, 'super.json');
const SUB_AUTH_FILE = path.join(AUTH_DIR, 'sub.json');

// Test user credentials from environment
export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@e2e.test.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminTest123!',
    role: 'admin' as const,
  },
  project_manager: {
    email: process.env.TEST_PM_EMAIL || 'pm@e2e.test.local',
    password: process.env.TEST_PM_PASSWORD || 'PMTest123!',
    role: 'project_manager' as const,
  },
  superintendent: {
    email: process.env.TEST_SUPER_EMAIL || 'super@e2e.test.local',
    password: process.env.TEST_SUPER_PASSWORD || 'SuperTest123!',
    role: 'superintendent' as const,
  },
  subcontractor: {
    email: process.env.TEST_SUB_EMAIL || 'sub@e2e.test.local',
    password: process.env.TEST_SUB_PASSWORD || 'SubPassword123!',
    role: 'subcontractor' as const,
  },
  default: {
    email: process.env.TEST_USER_EMAIL || 'test@e2e.test.local',
    password: process.env.TEST_USER_PASSWORD || 'TestUser123!',
    role: 'user' as const,
  },
};

export type UserRole = keyof typeof TEST_USERS;

type AuthFixtures = {
  /** Regular authenticated user context */
  authenticatedPage: Page;
  /** Admin authenticated user context */
  adminPage: Page;
  /** Project Manager authenticated user context */
  projectManagerPage: Page;
  /** Superintendent authenticated user context */
  superintendentPage: Page;
  /** Subcontractor authenticated user context */
  subcontractorPage: Page;
  /** Helper to login as a specific user */
  loginAs: (email: string, password: string) => Promise<void>;
  /** Helper to login with a specific role */
  loginAsRole: (role: UserRole) => Promise<void>;
  /** Helper to logout */
  logout: () => Promise<void>;
  /** Helper to login with magic link (requires admin API) */
  loginWithMagicLink: (email: string) => Promise<void>;
  /** Helper to verify MFA with TOTP code */
  verifyMFA: (code: string) => Promise<void>;
  /** Helper to check if user is logged in */
  isLoggedIn: () => Promise<boolean>;
  /** Helper to clear all auth state */
  clearAuthState: () => Promise<void>;
};

/**
 * Login helper function (can be used outside fixtures)
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<boolean> {
  try {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', {
      timeout: 10000,
    });

    // Fill credentials
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect away from login
    await page.waitForURL(url => !url.pathname.includes('/login'), {
      timeout: 30000,
    });

    return true;
  } catch (error) {
    console.error(`Login failed for ${email}:`, error);
    return false;
  }
}

/**
 * Login as a specific role
 */
export async function loginAsRole(page: Page, role: UserRole): Promise<boolean> {
  const user = TEST_USERS[role];
  return login(page, user.email, user.password);
}

/**
 * Check if the page has an authenticated user
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    const logoutButton = page.locator(
      '[data-testid="logout"], [aria-label*="logout"], button:has-text("Logout"), button:has-text("Sign out")'
    );
    return await logoutButton.first().isVisible({ timeout: 2000 }).catch(() => false);
  } catch {
    return false;
  }
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  // Try to find and click user menu
  const userMenu = page.locator('[data-testid="user-menu"], [aria-label="User menu"]');
  if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
    await userMenu.click();
    await page.waitForTimeout(300);
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
}

/**
 * Clear all auth state from browser
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Clear cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
  });
}

/**
 * Create authenticated context for a role
 */
export async function createAuthenticatedContext(
  browser: ReturnType<typeof base.extend>,
  role: UserRole
): Promise<BrowserContext> {
  const storageStateFile = {
    admin: ADMIN_AUTH_FILE,
    project_manager: PM_AUTH_FILE,
    superintendent: SUPER_AUTH_FILE,
    subcontractor: SUB_AUTH_FILE,
    default: AUTH_FILE,
  }[role];

  try {
    return await browser.newContext({ storageState: storageStateFile });
  } catch {
    // If storage state doesn't exist, create a new context and login
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsRole(page, role);
    await context.storageState({ path: storageStateFile });
    return context;
  }
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Authenticated user page - reuses stored auth state
  authenticatedPage: async ({ browser }, use) => {
    let context: BrowserContext;
    try {
      context = await browser.newContext({ storageState: AUTH_FILE });
    } catch {
      context = await browser.newContext();
    }
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Admin user page
  adminPage: async ({ browser }, use) => {
    let context: BrowserContext;
    try {
      context = await browser.newContext({ storageState: ADMIN_AUTH_FILE });
    } catch {
      context = await browser.newContext();
    }
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Project Manager user page
  projectManagerPage: async ({ browser }, use) => {
    let context: BrowserContext;
    try {
      context = await browser.newContext({ storageState: PM_AUTH_FILE });
    } catch {
      context = await browser.newContext();
    }
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Superintendent user page
  superintendentPage: async ({ browser }, use) => {
    let context: BrowserContext;
    try {
      context = await browser.newContext({ storageState: SUPER_AUTH_FILE });
    } catch {
      context = await browser.newContext();
    }
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Subcontractor user page
  subcontractorPage: async ({ browser }, use) => {
    let context: BrowserContext;
    try {
      context = await browser.newContext({ storageState: SUB_AUTH_FILE });
    } catch {
      context = await browser.newContext();
    }
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Login helper
  loginAs: async ({ page }, use) => {
    const loginFn = async (email: string, password: string) => {
      await login(page, email, password);
    };
    await use(loginFn);
  },

  // Login as role helper
  loginAsRole: async ({ page }, use) => {
    const loginFn = async (role: UserRole) => {
      await loginAsRole(page, role);
    };
    await use(loginFn);
  },

  // Logout helper
  logout: async ({ page }, use) => {
    const logoutFn = async () => {
      await logout(page);
    };
    await use(logoutFn);
  },

  // Magic link login helper
  loginWithMagicLink: async ({ page }, use) => {
    const loginFn = async (email: string) => {
      // This requires the Supabase Admin API
      // Import dynamically to avoid issues when not available
      try {
        const { generateMagicLink } = await import('../utils/supabase-admin');
        const magicLink = await generateMagicLink(email);
        await page.goto(magicLink);
        await page.waitForURL(url => !url.pathname.includes('/login'), {
          timeout: 30000,
        });
      } catch (error) {
        console.error('Magic link login failed:', error);
        throw new Error(
          'Magic link login requires SUPABASE_SERVICE_ROLE_KEY to be set'
        );
      }
    };
    await use(loginFn);
  },

  // MFA verification helper
  verifyMFA: async ({ page }, use) => {
    const verifyFn = async (code: string) => {
      // Wait for MFA input
      await page.waitForSelector(
        'input[data-testid="totp-input"], input[name="totp"], input[placeholder*="code"]',
        { timeout: 10000 }
      );

      // Fill the code
      const input = page.locator(
        'input[data-testid="totp-input"], input[name="totp"], input[placeholder*="code"]'
      );
      await input.fill(code);

      // Submit
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Verify")'
      );
      await submitButton.click();

      // Wait for navigation
      await page.waitForURL(url => !url.pathname.includes('/mfa'), {
        timeout: 10000,
      });
    };
    await use(verifyFn);
  },

  // Check if logged in
  isLoggedIn: async ({ page }, use) => {
    const checkFn = async () => {
      return isLoggedIn(page);
    };
    await use(checkFn);
  },

  // Clear auth state
  clearAuthState: async ({ page }, use) => {
    const clearFn = async () => {
      await clearAuthState(page);
    };
    await use(clearFn);
  },
});

export { expect } from '@playwright/test';

/**
 * Generate TOTP code for MFA testing
 * Requires otplib package
 */
export async function generateTOTPCode(secret: string): Promise<string> {
  try {
    const { authenticator } = await import('otplib');
    return authenticator.generate(secret);
  } catch {
    throw new Error('otplib is required for TOTP code generation');
  }
}

/**
 * Setup auth state for all roles (useful in global setup)
 */
export async function setupAllAuthStates(
  browser: ReturnType<typeof base.extend>
): Promise<void> {
  const roles: UserRole[] = [
    'admin',
    'project_manager',
    'superintendent',
    'subcontractor',
    'default',
  ];

  for (const role of roles) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const success = await loginAsRole(page, role);
      if (success) {
        const storageFile = {
          admin: ADMIN_AUTH_FILE,
          project_manager: PM_AUTH_FILE,
          superintendent: SUPER_AUTH_FILE,
          subcontractor: SUB_AUTH_FILE,
          default: AUTH_FILE,
        }[role];
        await context.storageState({ path: storageFile });
        console.log(`✓ Auth state saved for ${role}`);
      } else {
        console.warn(`⚠ Failed to login as ${role}`);
      }
    } catch (error) {
      console.error(`✗ Error setting up auth for ${role}:`, error);
    } finally {
      await context.close();
    }
  }
}
