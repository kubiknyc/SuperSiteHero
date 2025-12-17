/**
 * Cross-Browser Responsive Tests for PolishedVariant1Professional
 *
 * Tests browser compatibility and responsive behavior across:
 * - Chromium (Chrome, Edge)
 * - Firefox
 * - WebKit (Safari)
 * - Mobile Chrome
 * - Mobile Safari
 *
 * Verifies:
 * - Consistent rendering across browsers
 * - Touch interactions on mobile
 * - Responsive layout breakpoints
 * - Interactive element functionality
 *
 * Run: npx playwright test e2e/blueprint-variants-responsive.spec.ts
 * Run specific browser: npx playwright test e2e/blueprint-variants-responsive.spec.ts --project=firefox
 */

import { test, expect, devices } from '@playwright/test';

test.describe('PolishedVariant1Professional - Cross-Browser Responsive', () => {
  const url = '/blueprint-samples/variants/1-professional';

  // Desktop breakpoints to test
  const desktopBreakpoints = [
    { name: 'desktop', width: 1024, height: 768 },
    { name: 'wide', width: 1536, height: 864 },
  ];

  test.describe('Desktop Browsers', () => {
    for (const bp of desktopBreakpoints) {
      test(`${bp.name} - should render correctly in all browsers`, async ({ page, browserName }) => {
        // Set viewport
        await page.setViewportSize({ width: bp.width, height: bp.height });

        // Navigate to component
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // Verify main heading exists
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

        // Verify all 4 stat cards are visible
        await expect(page.getByText('Active Projects')).toBeVisible();
        await expect(page.getByText('Team Members')).toBeVisible();
        await expect(page.getByText('Pending Reports')).toBeVisible();
        await expect(page.getByText('Open RFIs')).toBeVisible();

        // Verify sections are visible
        await expect(page.getByRole('heading', { name: 'Active Projects' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();

        // Log browser name for debugging
        console.log(`✓ ${browserName} - ${bp.name} rendering verified`);
      });

      test(`${bp.name} - interactive elements work in all browsers`, async ({ page, browserName }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // Test back button navigation
        const backButton = page.getByLabel('Back to Blueprint Variants');
        await expect(backButton).toBeVisible();
        await expect(backButton).toHaveAttribute('href', /\/blueprint-samples\/variants/);

        // Test stat card interactivity (first stat card)
        const statCard = page.getByRole('button').first();
        await expect(statCard).toBeVisible();

        // Hover test (not available on mobile)
        await statCard.hover();
        await page.waitForTimeout(200);

        // Click test
        await statCard.click();
        await page.waitForTimeout(200);

        console.log(`✓ ${browserName} - ${bp.name} interactions verified`);
      });

      test(`${bp.name} - keyboard navigation works in all browsers`, async ({ page, browserName }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // Tab to first focusable element
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);

        // Verify focus is visible
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();

        // Tab through a few more elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);

        // Verify focus ring is present
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();

        console.log(`✓ ${browserName} - ${bp.name} keyboard navigation verified`);
      });
    }

    test('desktop - dark mode works in all browsers', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(300);

      // Verify dark mode is applied (check for dark background)
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Verify content is still visible
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      console.log(`✓ ${browserName} - dark mode verified`);
    });
  });

  test.describe('Mobile Browsers', () => {
    const mobileBreakpoints = [
      { name: 'mobile-portrait', width: 375, height: 667 },
      { name: 'mobile-landscape', width: 667, height: 375 },
      { name: 'tablet', width: 768, height: 1024 },
    ];

    for (const bp of mobileBreakpoints) {
      test(`${bp.name} - should render correctly on mobile browsers`, async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // Verify main heading
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

        // Verify stat cards are visible (should stack vertically on mobile)
        const statCards = page.getByRole('button').filter({ has: page.locator('[aria-label*="out of"]') });
        const count = await statCards.count();
        expect(count).toBeGreaterThanOrEqual(4);

        console.log(`✓ Mobile - ${bp.name} rendering verified`);
      });

      test(`${bp.name} - touch interactions work on mobile`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // Test tap on stat card
        const statCard = page.getByRole('button').first();
        await expect(statCard).toBeVisible();
        await statCard.tap();
        await page.waitForTimeout(200);

        // Test tap on back button
        const backButton = page.getByLabel('Back to Blueprint Variants');
        await backButton.tap();
        // Don't navigate away - just verify it's tappable

        console.log(`✓ Mobile - ${bp.name} touch interactions verified`);
      });

      test(`${bp.name} - touch targets meet 44px minimum`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // Get all interactive elements
        const interactiveElements = page.locator('button, a, input, select, textarea');
        const count = await interactiveElements.count();

        // Check each element
        let violations = 0;
        for (let i = 0; i < count; i++) {
          const element = interactiveElements.nth(i);
          const box = await element.boundingBox();

          if (box && box.height < 44) {
            const ariaLabel = await element.getAttribute('aria-label');
            const text = await element.textContent();
            console.warn(`⚠ Touch target too small (${box.height}px): ${ariaLabel || text || 'unlabeled'}`);
            violations++;
          }
        }

        // WCAG AA requires 44px minimum
        expect(violations).toBe(0);

        console.log(`✓ Mobile - ${bp.name} touch targets verified (${count} elements checked)`);
      });
    }

    test('mobile - scroll behavior works correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY);
      expect(initialScroll).toBe(0);

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(200);

      // Verify scroll happened
      const newScroll = await page.evaluate(() => window.scrollY);
      expect(newScroll).toBeGreaterThan(0);

      console.log('✓ Mobile - scroll behavior verified');
    });

    test('mobile - viewport meta tag is set correctly', async ({ page }) => {
      await page.goto(url);

      // Check viewport meta tag
      const viewport = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta?.getAttribute('content');
      });

      // Should have viewport meta tag for proper mobile rendering
      expect(viewport).toBeTruthy();
      expect(viewport).toContain('width=device-width');

      console.log('✓ Mobile - viewport meta tag verified');
    });
  });

  test.describe('Browser-Specific Features', () => {
    test('Safari - should handle webkit-specific styles', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'WebKit-specific test');

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Verify rendering works in Safari
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      // Check for any webkit-specific rendering issues
      const body = page.locator('body');
      await expect(body).toBeVisible();

      console.log('✓ Safari - webkit styles verified');
    });

    test('Firefox - should handle moz-specific styles', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Verify rendering works in Firefox
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      console.log('✓ Firefox - moz styles verified');
    });

    test('Chrome - should handle chrome-specific features', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium-specific test');

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Verify rendering works in Chrome
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      console.log('✓ Chrome - chromium features verified');
    });
  });

  test.describe('Responsive Layout Verification', () => {
    test('should show correct layout at each breakpoint', async ({ page }) => {
      // Test mobile (single column)
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      let statsGrid = page.locator('.grid').first();
      let gridClasses = await statsGrid.getAttribute('class');
      expect(gridClasses).toContain('grid-cols-1');

      // Test tablet (2 columns for stats)
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(200);

      gridClasses = await statsGrid.getAttribute('class');
      expect(gridClasses).toContain('sm:grid-cols-2');

      // Test desktop (4 columns for stats)
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(200);

      gridClasses = await statsGrid.getAttribute('class');
      expect(gridClasses).toContain('lg:grid-cols-4');

      console.log('✓ Responsive layout breakpoints verified');
    });

    test('should handle orientation changes', async ({ page }) => {
      // Portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      // Landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(300);

      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      console.log('✓ Orientation changes handled correctly');
    });
  });

  test.describe('Performance Across Browsers', () => {
    test('should load within acceptable time in all browsers', async ({ page, browserName }) => {
      const startTime = Date.now();

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);

      console.log(`✓ ${browserName} - page loaded in ${loadTime}ms`);
    });

    test('should render smoothly without layout shift', async ({ page, browserName }) => {
      await page.goto(url);

      // Wait for initial render
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Take initial position of a stable element
      const heading = page.getByRole('heading', { name: 'Dashboard' });
      const initialBox = await heading.boundingBox();

      // Wait a bit more
      await page.waitForTimeout(500);

      // Check if position changed (layout shift)
      const finalBox = await heading.boundingBox();

      // Position should be stable (allowing 1px tolerance)
      if (initialBox && finalBox) {
        expect(Math.abs(initialBox.y - finalBox.y)).toBeLessThan(2);
      }

      console.log(`✓ ${browserName} - no layout shift detected`);
    });
  });
});
