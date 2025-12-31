/**
 * Autonomous Smoke Crawl Test
 *
 * Navigates through all application routes, performs safe interactions,
 * and detects console errors, 5xx responses, and crashes.
 *
 * This test is designed to run autonomously without user intervention
 * and should complete in under 5 minutes.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { createErrorCollector, type ErrorCollector } from './helpers/error-collector';
import { createSafeInteractor } from './helpers/safe-interactor';
import routesConfig from './routes.json';

// Types for route configuration
interface RouteConfig {
  path: string;
  auth: 'public' | 'authenticated' | 'admin' | 'project_manager' | 'superintendent' | 'subcontractor';
  critical: boolean;
  waitFor?: string;
  interactions?: string[];
  skip?: boolean;
  skipReason?: string;
}

interface RoutesJson {
  version: string;
  config: {
    defaultTimeout: number;
    waitStrategy: string;
    screenshotOnError: boolean;
    traceOnError: boolean;
  };
  allowlist: {
    consoleErrors: string[];
    networkErrors: string[];
  };
  routes: RouteConfig[];
}

const routes = routesConfig as RoutesJson;

// Test user credentials from environment
const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@e2e.test.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminTest123!',
  },
  project_manager: {
    email: process.env.TEST_PM_EMAIL || 'pm@e2e.test.local',
    password: process.env.TEST_PM_PASSWORD || 'PMTest123!',
  },
  superintendent: {
    email: process.env.TEST_SUPER_EMAIL || 'super@e2e.test.local',
    password: process.env.TEST_SUPER_PASSWORD || 'SuperTest123!',
  },
  subcontractor: {
    email: process.env.TEST_SUB_EMAIL || 'sub@e2e.test.local',
    password: process.env.TEST_SUB_PASSWORD || 'SubTest123!',
  },
  authenticated: {
    email: process.env.TEST_USER_EMAIL || 'test@e2e.test.local',
    password: process.env.TEST_USER_PASSWORD || 'TestUser123!',
  },
};

// Helper to get base URL
function getBaseUrl(): string {
  return process.env.BASE_URL || 'http://localhost:5173';
}

// Helper to login
async function login(page: Page, email: string, password: string): Promise<boolean> {
  try {
    await page.goto(`${getBaseUrl()}/login`, { waitUntil: 'domcontentloaded' });

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

    // Fill credentials
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for navigation away from login
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    return true;
  } catch (error) {
    console.error(`Login failed for ${email}:`, error);
    return false;
  }
}

// Helper to check if already logged in
async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for auth indicators
    const logoutButton = page.locator('[data-testid="logout"], [aria-label*="logout"], button:has-text("Logout")');
    const isVisible = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
    return isVisible;
  } catch {
    return false;
  }
}

// Group routes by auth type for efficient testing
function groupRoutesByAuth(routeList: RouteConfig[]): Map<string, RouteConfig[]> {
  const groups = new Map<string, RouteConfig[]>();

  for (const route of routeList) {
    if (route.skip) continue;

    const auth = route.auth;
    if (!groups.has(auth)) {
      groups.set(auth, []);
    }
    groups.get(auth)!.push(route);
  }

  return groups;
}

// Test describe block
test.describe('Autonomous Smoke Crawl', () => {
  test.describe.configure({ mode: 'serial' });

  let errorCollector: ErrorCollector;
  const baseUrl = getBaseUrl();
  const routeGroups = groupRoutesByAuth(routes.routes);

  // Public routes - no authentication needed
  test.describe('Public Routes', () => {
    const publicRoutes = routeGroups.get('public') || [];

    for (const route of publicRoutes) {
      test(`${route.path} ${route.critical ? '(critical)' : ''}`, async ({ page }) => {
        errorCollector = createErrorCollector(page, routes.allowlist);
        await errorCollector.attach();

        try {
          // Navigate to route
          await page.goto(`${baseUrl}${route.path}`, {
            waitUntil: 'domcontentloaded',
            timeout: routes.config.defaultTimeout,
          });

          // Wait for specific element if configured
          if (route.waitFor) {
            await page.waitForSelector(route.waitFor, { timeout: 10000 });
          }

          // Perform safe interactions
          const interactor = createSafeInteractor(page, { verbose: false });
          await interactor.performSafeInteractions();

          // Check for critical errors (5xx, uncaught exceptions)
          if (route.critical) {
            errorCollector.checkCriticalErrors();
          }

          // Log any collected errors (non-fatal for non-critical routes)
          const errors = errorCollector.getErrors();
          if (errors.totalCount > 0) {
            console.warn(`Route ${route.path} had ${errors.totalCount} errors`);
          }

          // Assert no critical errors
          expect(errorCollector.hasCriticalErrors()).toBe(false);
        } finally {
          await errorCollector.detach();
        }
      });
    }
  });

  // Authenticated routes - requires login
  test.describe('Authenticated Routes', () => {
    const authRoutes = routeGroups.get('authenticated') || [];

    test.beforeAll(async ({ browser }) => {
      // Pre-authenticate and save state
      const context = await browser.newContext();
      const page = await context.newPage();

      const loggedIn = await login(
        page,
        TEST_USERS.authenticated.email,
        TEST_USERS.authenticated.password
      );

      if (!loggedIn) {
        console.warn('Failed to login for authenticated routes, tests may fail');
      }

      await context.storageState({ path: '.auth/authenticated.json' });
      await context.close();
    });

    test.use({ storageState: '.auth/authenticated.json' });

    for (const route of authRoutes) {
      test(`${route.path} ${route.critical ? '(critical)' : ''}`, async ({ page }) => {
        errorCollector = createErrorCollector(page, routes.allowlist);
        await errorCollector.attach();

        try {
          await page.goto(`${baseUrl}${route.path}`, {
            waitUntil: 'domcontentloaded',
            timeout: routes.config.defaultTimeout,
          });

          // Handle potential redirect to login
          if (page.url().includes('/login')) {
            const loggedIn = await login(
              page,
              TEST_USERS.authenticated.email,
              TEST_USERS.authenticated.password
            );
            expect(loggedIn).toBe(true);
            await page.goto(`${baseUrl}${route.path}`);
          }

          if (route.waitFor) {
            await page.waitForSelector(route.waitFor, { timeout: 10000 });
          }

          const interactor = createSafeInteractor(page, { verbose: false });
          await interactor.performSafeInteractions();

          if (route.critical) {
            errorCollector.checkCriticalErrors();
          }

          expect(errorCollector.hasCriticalErrors()).toBe(false);
        } finally {
          await errorCollector.detach();
        }
      });
    }
  });

  // Admin routes
  test.describe('Admin Routes', () => {
    const adminRoutes = routeGroups.get('admin') || [];

    if (adminRoutes.length === 0) {
      test.skip('No admin routes configured', () => {});
      return;
    }

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const loggedIn = await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      if (!loggedIn) {
        console.warn('Failed to login as admin, tests may fail');
      }

      await context.storageState({ path: '.auth/admin.json' });
      await context.close();
    });

    test.use({ storageState: '.auth/admin.json' });

    for (const route of adminRoutes) {
      test(`${route.path} ${route.critical ? '(critical)' : ''}`, async ({ page }) => {
        errorCollector = createErrorCollector(page, routes.allowlist);
        await errorCollector.attach();

        try {
          await page.goto(`${baseUrl}${route.path}`, {
            waitUntil: 'domcontentloaded',
            timeout: routes.config.defaultTimeout,
          });

          if (page.url().includes('/login')) {
            await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
            await page.goto(`${baseUrl}${route.path}`);
          }

          if (route.waitFor) {
            await page.waitForSelector(route.waitFor, { timeout: 10000 });
          }

          const interactor = createSafeInteractor(page, { verbose: false });
          await interactor.performSafeInteractions();

          if (route.critical) {
            errorCollector.checkCriticalErrors();
          }

          expect(errorCollector.hasCriticalErrors()).toBe(false);
        } finally {
          await errorCollector.detach();
        }
      });
    }
  });

  // Project Manager routes
  test.describe('Project Manager Routes', () => {
    const pmRoutes = routeGroups.get('project_manager') || [];

    if (pmRoutes.length === 0) {
      test.skip('No project manager routes configured', () => {});
      return;
    }

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const loggedIn = await login(
        page,
        TEST_USERS.project_manager.email,
        TEST_USERS.project_manager.password
      );
      if (!loggedIn) {
        console.warn('Failed to login as project manager, tests may fail');
      }

      await context.storageState({ path: '.auth/pm.json' });
      await context.close();
    });

    test.use({ storageState: '.auth/pm.json' });

    for (const route of pmRoutes) {
      test(`${route.path} ${route.critical ? '(critical)' : ''}`, async ({ page }) => {
        errorCollector = createErrorCollector(page, routes.allowlist);
        await errorCollector.attach();

        try {
          await page.goto(`${baseUrl}${route.path}`, {
            waitUntil: 'domcontentloaded',
            timeout: routes.config.defaultTimeout,
          });

          if (route.waitFor) {
            await page.waitForSelector(route.waitFor, { timeout: 10000 });
          }

          const interactor = createSafeInteractor(page, { verbose: false });
          await interactor.performSafeInteractions();

          if (route.critical) {
            errorCollector.checkCriticalErrors();
          }

          expect(errorCollector.hasCriticalErrors()).toBe(false);
        } finally {
          await errorCollector.detach();
        }
      });
    }
  });

  // Superintendent routes
  test.describe('Superintendent Routes', () => {
    const superRoutes = routeGroups.get('superintendent') || [];

    if (superRoutes.length === 0) {
      test.skip('No superintendent routes configured', () => {});
      return;
    }

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const loggedIn = await login(
        page,
        TEST_USERS.superintendent.email,
        TEST_USERS.superintendent.password
      );
      if (!loggedIn) {
        console.warn('Failed to login as superintendent, tests may fail');
      }

      await context.storageState({ path: '.auth/super.json' });
      await context.close();
    });

    test.use({ storageState: '.auth/super.json' });

    for (const route of superRoutes) {
      test(`${route.path} ${route.critical ? '(critical)' : ''}`, async ({ page }) => {
        errorCollector = createErrorCollector(page, routes.allowlist);
        await errorCollector.attach();

        try {
          await page.goto(`${baseUrl}${route.path}`, {
            waitUntil: 'domcontentloaded',
            timeout: routes.config.defaultTimeout,
          });

          if (route.waitFor) {
            await page.waitForSelector(route.waitFor, { timeout: 10000 });
          }

          const interactor = createSafeInteractor(page, { verbose: false });
          await interactor.performSafeInteractions();

          if (route.critical) {
            errorCollector.checkCriticalErrors();
          }

          expect(errorCollector.hasCriticalErrors()).toBe(false);
        } finally {
          await errorCollector.detach();
        }
      });
    }
  });

  // Subcontractor routes
  test.describe('Subcontractor Routes', () => {
    const subRoutes = routeGroups.get('subcontractor') || [];

    if (subRoutes.length === 0) {
      test.skip('No subcontractor routes configured', () => {});
      return;
    }

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const loggedIn = await login(
        page,
        TEST_USERS.subcontractor.email,
        TEST_USERS.subcontractor.password
      );
      if (!loggedIn) {
        console.warn('Failed to login as subcontractor, tests may fail');
      }

      await context.storageState({ path: '.auth/sub.json' });
      await context.close();
    });

    test.use({ storageState: '.auth/sub.json' });

    for (const route of subRoutes) {
      test(`${route.path} ${route.critical ? '(critical)' : ''}`, async ({ page }) => {
        errorCollector = createErrorCollector(page, routes.allowlist);
        await errorCollector.attach();

        try {
          await page.goto(`${baseUrl}${route.path}`, {
            waitUntil: 'domcontentloaded',
            timeout: routes.config.defaultTimeout,
          });

          if (route.waitFor) {
            await page.waitForSelector(route.waitFor, { timeout: 10000 });
          }

          const interactor = createSafeInteractor(page, { verbose: false });
          await interactor.performSafeInteractions();

          if (route.critical) {
            errorCollector.checkCriticalErrors();
          }

          expect(errorCollector.hasCriticalErrors()).toBe(false);
        } finally {
          await errorCollector.detach();
        }
      });
    }
  });

  // Critical flow tests
  test.describe('Critical Flows', () => {
    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await login(page, TEST_USERS.authenticated.email, TEST_USERS.authenticated.password);
      await context.storageState({ path: '.auth/authenticated.json' });
      await context.close();
    });

    test.use({ storageState: '.auth/authenticated.json' });

    test('Daily Reports flow is accessible', async ({ page }) => {
      errorCollector = createErrorCollector(page, routes.allowlist);
      await errorCollector.attach();

      try {
        // Navigate to daily reports
        await page.goto(`${baseUrl}/daily-reports`);
        await page.waitForSelector('[data-testid="daily-reports-page"], h1', { timeout: 10000 });

        // Check for list or empty state
        const hasContent = await page
          .locator('[data-testid="daily-report-item"], [data-testid="empty-state"], table, .card')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        expect(hasContent || !errorCollector.hasCriticalErrors()).toBe(true);
      } finally {
        await errorCollector.detach();
      }
    });

    test('Punch Lists flow is accessible', async ({ page }) => {
      errorCollector = createErrorCollector(page, routes.allowlist);
      await errorCollector.attach();

      try {
        await page.goto(`${baseUrl}/punch-lists`);
        await page.waitForSelector('[data-testid="punch-lists-page"], h1', { timeout: 10000 });

        expect(errorCollector.hasCriticalErrors()).toBe(false);
      } finally {
        await errorCollector.detach();
      }
    });

    test('RFIs flow is accessible', async ({ page }) => {
      errorCollector = createErrorCollector(page, routes.allowlist);
      await errorCollector.attach();

      try {
        await page.goto(`${baseUrl}/rfis`);
        await page.waitForSelector('[data-testid="rfis-page"], h1', { timeout: 10000 });

        expect(errorCollector.hasCriticalErrors()).toBe(false);
      } finally {
        await errorCollector.detach();
      }
    });

    test('Change Orders flow is accessible', async ({ page }) => {
      errorCollector = createErrorCollector(page, routes.allowlist);
      await errorCollector.attach();

      try {
        await page.goto(`${baseUrl}/change-orders`);
        await page.waitForSelector('[data-testid="change-orders-page"], h1', { timeout: 10000 });

        expect(errorCollector.hasCriticalErrors()).toBe(false);
      } finally {
        await errorCollector.detach();
      }
    });
  });
});
