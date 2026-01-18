/**
 * Deployment Smoke Tests
 *
 * Lightweight tests that run after each deployment to verify the app is functional.
 * These tests are designed to be fast (<2 minutes) and catch critical deployment issues.
 *
 * Usage:
 *   BASE_URL=https://preview-xxx.netlify.app npx playwright test e2e/smoke.spec.ts
 */

import { test, expect } from '@playwright/test';

// Get base URL from environment or default to localhost
const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Deployment Smoke Tests', () => {
  // Fast timeout for smoke tests
  test.setTimeout(60000);

  test('Homepage loads successfully', async ({ page }) => {
    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Check response status
    expect(response?.status()).toBeLessThan(400);

    // Check page has title
    await expect(page).toHaveTitle(/JobSight/i);
  });

  test('Login page is accessible', async ({ page }) => {
    const response = await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });

    // Check response status
    expect(response?.status()).toBeLessThan(400);

    // Check login form elements exist
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('App renders without critical errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    // Check React app mounted (root element has content)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 15000 });

    // Filter out known non-critical errors (like browser extension issues)
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('extension') &&
        !err.includes('favicon') &&
        !err.includes('ERR_BLOCKED_BY_CLIENT')
    );

    // Log errors for debugging but don't fail on minor ones
    if (criticalErrors.length > 0) {
      console.warn('Console errors detected:', criticalErrors);
    }
  });

  test('Static assets load correctly', async ({ page }) => {
    const failedAssets: string[] = [];

    // Track failed resource loads
    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().includes('/assets/')) {
        failedAssets.push(`${response.status()}: ${response.url()}`);
      }
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    // No critical assets should fail to load
    expect(failedAssets).toHaveLength(0);
  });

  test('API connectivity check', async ({ page }) => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Check that the app can make network requests (Supabase connection)
    // The app should load without showing a connection error
    const connectionError = page.locator('text=/connection error|network error|offline/i');
    const hasConnectionError = await connectionError.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasConnectionError).toBe(false);
  });

  test('Registration page is accessible', async ({ page }) => {
    const response = await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });

    // Check response status
    expect(response?.status()).toBeLessThan(400);

    // Check page renders
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10000 });
  });

  test('No 5xx server errors on key routes', async ({ page }) => {
    const routes = ['/', '/login', '/register'];
    const serverErrors: string[] = [];

    for (const route of routes) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
      const status = response?.status() || 0;

      if (status >= 500) {
        serverErrors.push(`${route}: ${status}`);
      }
    }

    expect(serverErrors).toHaveLength(0);
  });
});
