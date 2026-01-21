/**
 * Route Verification Test Suite
 *
 * Systematically tests ALL routes to identify 404 errors.
 * Uses specific NotFoundPage detection to avoid false positives.
 *
 * Generated: 2026-01-21
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test credentials
const TEST_EMAIL = 'admin@supersitehero.local';
const TEST_PASSWORD = 'AdminPassword123!';

interface RouteResult {
  route: string;
  status: 'OK' | '404' | 'ERROR' | 'REDIRECT' | 'TIMEOUT';
  finalUrl?: string;
  error?: string;
  loadTime?: number;
}

// All static routes from DesktopApp.tsx
const ALL_ROUTES = [
  // Public/Auth
  '/login', '/signup', '/register', '/forgot-password', '/reset-password',
  '/privacy', '/terms',

  // Demo pages
  '/demo', '/demo/colors', '/demo/refined', '/demo/concepts',
  '/demo/sidebar-v2', '/demo/sidebar-concepts', '/demo/navigation',

  // Design concepts
  '/design-concepts',
  '/design-concepts/1-industrial', '/design-concepts/2-blueprint',
  '/design-concepts/3-modern-dark', '/design-concepts/4-scandinavian',
  '/design-concepts/5-bold-contrast', '/design-concepts/6-earth-natural',
  '/design-concepts/7-safety-highvis', '/design-concepts/8-navy-premium',

  // Blueprint samples
  '/blueprint-samples', '/blueprint-samples/layout', '/blueprint-samples/dashboard',
  '/blueprint-samples/project-detail', '/blueprint-samples/daily-reports',
  '/blueprint-samples/documents', '/blueprint-samples/animated-demo',
  '/blueprint-samples/variants', '/blueprint-samples/variants/1-professional',
  '/blueprint-samples/variants/1-professional-improved',
  '/blueprint-samples/variants/2-technical-dark',
  '/blueprint-samples/variants/3-minimal', '/blueprint-samples/variants/4-industrial',

  // Dashboards (protected)
  '/dashboard', '/dashboard/owner', '/dashboard/admin', '/dashboard/pm',
  '/dashboard/superintendent', '/dashboard/foreman', '/dashboard/worker',
  '/field-dashboard',

  // Core features (protected)
  '/projects', '/projects/new',
  '/daily-reports', '/daily-reports/new',
  '/change-orders', '/change-orders/new',
  '/workflows',
  '/tasks', '/tasks/new',
  '/documents',
  '/rfis', '/rfis/new', '/rfis-v2',
  '/submittals', '/submittals-v2',
  '/shop-drawings',
  '/punch-lists',
  '/checklists/dashboard', '/checklists/schedules', '/checklists/templates', '/checklists/executions',
  '/reports', '/reports/builder',
  '/approvals',
  '/profile', '/profile/edit',

  // Settings (protected)
  '/settings', '/settings/company', '/settings/users', '/settings/user-approvals',
  '/settings/approval-workflows', '/settings/project-templates', '/settings/distribution-lists',
  '/settings/roles', '/settings/notifications', '/settings/quickbooks', '/settings/calendar',
  '/settings/integrations', '/settings/ai', '/settings/audit-logs', '/settings/cost-codes',
  '/settings/docusign',

  // Other features (protected)
  '/analytics', '/safety', '/safety/new', '/safety/osha-300',
  '/quality-control', '/photo-progress',
  '/inspections', '/inspections/new',
  '/messages', '/notices', '/photos',
  '/contacts', '/contacts/new',
  '/weather-logs', '/site-instructions', '/site-instructions/new',
  '/meetings', '/meetings/new', '/action-items',
  '/equipment', '/budget', '/cost-tracking', '/permits',
  '/payment-applications', '/lien-waivers', '/invoices',
  '/procurement', '/transmittals', '/insurance',
  '/toolbox-talks', '/toolbox-talks/new',
  '/bidding', '/closeout',

  // Subcontractor Portal
  '/sub', '/sub/dashboard', '/sub/projects', '/sub/bids', '/sub/punch-items',
  '/sub/tasks', '/sub/compliance', '/sub/daily-reports', '/sub/lien-waivers',
  '/sub/retainage', '/sub/pay-apps', '/sub/change-orders', '/sub/schedule',
  '/sub/safety', '/sub/photos', '/sub/meetings', '/sub/certifications',

  // Client Portal
  '/client', '/client/dashboard',
];

/**
 * Detect if page is the NotFoundPage component
 */
async function isNotFoundPage(page: Page): Promise<boolean> {
  try {
    // Look for the specific text from NotFoundPage.tsx
    const notFoundText = page.locator('text="The page you\'re looking for doesn\'t exist in JobSight"');
    if (await notFoundText.count() > 0) return true;

    // Check for "Page Not Found" heading
    const heading = page.locator('h2:has-text("Page Not Found")');
    if (await heading.count() > 0) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Test a single route
 */
async function testRoute(page: Page, route: string): Promise<RouteResult> {
  const startTime = Date.now();

  try {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(300); // Let React render

    const loadTime = Date.now() - startTime;
    const finalUrl = page.url();

    // Check for NotFoundPage
    if (await isNotFoundPage(page)) {
      return { route, status: '404', finalUrl, loadTime };
    }

    // Check for redirect to login
    if (finalUrl.includes('/login') && !route.includes('/login')) {
      return { route, status: 'REDIRECT', finalUrl, loadTime };
    }

    return { route, status: 'OK', finalUrl, loadTime };

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      route,
      status: msg.includes('timeout') ? 'TIMEOUT' : 'ERROR',
      error: msg,
      loadTime: Date.now() - startTime,
    };
  }
}

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });
    return true;
  } catch (e) {
    console.error('Login failed:', e);
    return false;
  }
}

test.describe('Route Verification', () => {
  test.setTimeout(600000); // 10 minutes

  test('Check all routes for 404 errors', async ({ page }) => {
    const results: RouteResult[] = [];

    console.log('\n========================================');
    console.log('  ROUTE VERIFICATION TEST');
    console.log(`  Testing ${ALL_ROUTES.length} routes`);
    console.log('========================================\n');

    // Login first
    console.log('Logging in as admin...');
    const loggedIn = await login(page);
    expect(loggedIn, 'Login should succeed').toBeTruthy();
    console.log('Login successful!\n');

    // Test each route
    for (let i = 0; i < ALL_ROUTES.length; i++) {
      const route = ALL_ROUTES[i];
      const result = await testRoute(page, route);
      results.push(result);

      const icon = { OK: '✓', '404': '✗', ERROR: '!', REDIRECT: '→', TIMEOUT: '⏱' }[result.status];
      const progress = `[${i + 1}/${ALL_ROUTES.length}]`;
      console.log(`${progress} ${icon} ${route} - ${result.status}`);
    }

    // Summary
    const notFound = results.filter(r => r.status === '404');
    const errors = results.filter(r => r.status === 'ERROR');
    const ok = results.filter(r => r.status === 'OK');
    const redirects = results.filter(r => r.status === 'REDIRECT');

    console.log('\n========================================');
    console.log('  SUMMARY');
    console.log('========================================');
    console.log(`Total:      ${results.length}`);
    console.log(`OK:         ${ok.length}`);
    console.log(`Redirects:  ${redirects.length}`);
    console.log(`404 Errors: ${notFound.length}`);
    console.log(`Errors:     ${errors.length}`);

    if (notFound.length > 0) {
      console.log('\n404 ROUTES (BROKEN):');
      notFound.forEach(r => console.log(`  - ${r.route}`));
    }

    if (errors.length > 0) {
      console.log('\nERROR ROUTES:');
      errors.forEach(r => console.log(`  - ${r.route}: ${r.error?.substring(0, 80)}`));
    }

    console.log('\n========================================\n');

    // Save results to JSON
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(resultsDir, 'route-verification.json'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
          total: results.length,
          ok: ok.length,
          redirects: redirects.length,
          notFound: notFound.length,
          errors: errors.length,
        },
        notFoundRoutes: notFound.map(r => r.route),
        errorRoutes: errors.map(r => ({ route: r.route, error: r.error })),
        allResults: results,
      }, null, 2)
    );

    // Test assertion
    expect(notFound.length, `Found ${notFound.length} routes returning 404`).toBe(0);
  });
});
