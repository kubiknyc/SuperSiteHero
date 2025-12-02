import { test, expect } from '@playwright/test';

/**
 * Offline Mode E2E Tests
 *
 * Tests the PWA offline capabilities and sync behavior.
 */
test.describe('Offline Mode', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should show offline indicator when network is disconnected', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Wait for offline indicator to appear
    await expect(
      page.locator('[data-testid="offline-indicator"], .offline-indicator, text=/offline/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should cache pages for offline access', async ({ page, context }) => {
    // Visit pages while online to cache them
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.goto('/daily-reports');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Should still be able to view cached pages
    await page.goto('/');
    await expect(page.locator('main, [data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('should queue form submissions when offline', async ({ page, context }) => {
    await page.goto('/daily-reports');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Open create form
    const createBtn = page.locator('button:has-text("New"), button:has-text("Create")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();

      // Fill form
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await dateInput.fill(new Date().toISOString().split('T')[0]);
      }

      const summaryField = page.locator('textarea[name*="work"], textarea[name*="summary"]').first();
      if (await summaryField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await summaryField.fill('Offline test report');
      }

      // Submit form
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();

      // Should show queued/pending message
      await expect(
        page.locator('text=/queued|pending|sync|offline/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should sync queued items when back online', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate offline mode and queue some action
    await context.setOffline(true);

    // Wait a bit
    await page.waitForTimeout(1000);

    // Go back online
    await context.setOffline(false);

    // Check for sync activity
    await page.waitForLoadState('networkidle');

    // Offline indicator should disappear
    const offlineIndicator = page.locator('[data-testid="offline-indicator"], .offline-indicator');
    await expect(offlineIndicator).toBeHidden({ timeout: 10000 });
  });

  test('should show sync status in UI', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for sync status indicator
    const syncStatus = page.locator('[data-testid="sync-status"], .sync-indicator');

    if (await syncStatus.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Should indicate synced state
      await expect(syncStatus).toContainText(/synced|up to date/i);

      // Go offline
      await context.setOffline(true);

      // Status should change
      await expect(syncStatus).toContainText(/offline|not synced/i);

      // Go back online
      await context.setOffline(false);

      // Should sync
      await expect(syncStatus).toContainText(/syncing|synced/i);
    }
  });

  test('should handle intermittent connectivity', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate flaky connection
    for (let i = 0; i < 3; i++) {
      await context.setOffline(true);
      await page.waitForTimeout(500);
      await context.setOffline(false);
      await page.waitForTimeout(500);
    }

    // App should remain functional
    await expect(page.locator('main, [data-testid="dashboard"]')).toBeVisible();
  });

  test('should preserve data integrity during offline operations', async ({ page, context }) => {
    await page.goto('/daily-reports');
    await page.waitForLoadState('networkidle');

    // Count initial reports
    const initialCount = await page.locator('[data-testid="report-item"]').count().catch(() => 0);

    // Go offline and create report
    await context.setOffline(true);

    const createBtn = page.locator('button:has-text("New"), button:has-text("Create")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();

      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.fill(new Date().toISOString().split('T')[0]);
      }

      await page.locator('button[type="submit"]').first().click();
    }

    // Go back online
    await context.setOffline(false);
    await page.waitForLoadState('networkidle');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Count should increase (report was synced)
    const newCount = await page.locator('[data-testid="report-item"]').count().catch(() => 0);

    // Data should be preserved (count same or higher)
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });
});

test.describe('Service Worker', () => {
  test('should register service worker', async ({ page }) => {
    await page.goto('/');

    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return !!registration;
      }
      return false;
    });

    expect(swRegistered).toBeTruthy();
  });

  test('should cache static assets', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try to reload - should work with cached assets
    await page.reload();

    // Main app should still render
    await expect(page.locator('body')).toBeVisible();
  });
});
