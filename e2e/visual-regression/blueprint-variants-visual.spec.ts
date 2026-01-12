/**
 * Visual Regression Tests for PolishedVariant1Professional
 *
 * Tests visual consistency across:
 * - 4 breakpoints (mobile, tablet, desktop, wide)
 * - 2 themes (light, dark)
 * Total: 8 baseline screenshots
 *
 * Run: npx playwright test e2e/visual-regression/
 * Update baselines: npx playwright test e2e/visual-regression/ --update-snapshots
 */

import { test, expect } from '@playwright/test';

test.describe('PolishedVariant1Professional - Visual Regression', () => {
  const breakpoints = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1024, height: 768 },
    { name: 'wide', width: 1536, height: 864 },
  ];

  // Test light mode for all breakpoints
  for (const bp of breakpoints) {
    test(`${bp.name} - light mode`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: bp.width, height: bp.height });

      // Navigate to component
      await page.goto('/blueprint-samples/variants/1-professional');

      // Wait for page to be fully loaded
      await page.waitForLoadState('domcontentloaded');

      // Wait for blueprint pattern to render
      await page.waitForTimeout(500);

      // Take full page screenshot
      await expect(page).toHaveScreenshot(`polished-variant-${bp.name}-light.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }

  // Test dark mode for all breakpoints
  for (const bp of breakpoints) {
    test(`${bp.name} - dark mode`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: bp.width, height: bp.height });

      // Navigate to component
      await page.goto('/blueprint-samples/variants/1-professional');

      // Wait for page to be fully loaded
      await page.waitForLoadState('domcontentloaded');

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Wait for dark mode transition
      await page.waitForTimeout(500);

      // Take full page screenshot
      await expect(page).toHaveScreenshot(`polished-variant-${bp.name}-dark.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }

  // Test focus states (keyboard navigation)
  test('desktop - focus states visible', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/blueprint-samples/variants/1-professional');
    await page.waitForLoadState('domcontentloaded');

    // Tab to first focusable element (Back button)
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Take screenshot showing focus ring
    await expect(page).toHaveScreenshot('polished-variant-focus-back-button.png', {
      animations: 'disabled',
    });

    // Tab to stat card
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Take screenshot showing stat card focus
    await expect(page).toHaveScreenshot('polished-variant-focus-stat-card.png', {
      animations: 'disabled',
    });
  });

  // Test hover states (where applicable)
  test('desktop - stat card hover state', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/blueprint-samples/variants/1-professional');
    await page.waitForLoadState('domcontentloaded');

    // Hover over first stat card
    const statCard = page.locator('button[aria-label*="Active Projects"]').first();
    await statCard.hover();
    await page.waitForTimeout(300);

    // Take screenshot showing hover state
    await expect(page).toHaveScreenshot('polished-variant-hover-stat-card.png', {
      animations: 'disabled',
    });
  });
});
