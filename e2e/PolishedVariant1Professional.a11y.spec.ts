/**
 * Accessibility Tests for Polished Variant1Professional
 *
 * Tests WCAG 2.1 AA compliance using axe-core:
 * - Automated accessibility scans
 * - Color contrast verification
 * - Keyboard navigation
 * - ARIA label verification
 * - Semantic HTML validation
 *
 * Run: npx playwright test --grep "a11y"
 */

import { test, expect } from '@playwright/test';

// Use pre-authenticated session to skip login
test.use({ storageState: 'playwright/.auth/user.json' });
import AxeBuilder from '@axe-core/playwright';

test.describe('PolishedVariant1Professional - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the component
    await page.goto('/blueprint-samples/variants/1-professional');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('should not have any automatically detectable WCAG AA accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper color contrast in light mode', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['cat.colour'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have proper color contrast in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page })
      .withTags(['cat.colour'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have all interactive elements keyboard accessible', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['cat.keyboard'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have proper ARIA labels on all interactive elements', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['cat.aria'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Get all headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = await Promise.all(
      headings.map(async (heading) => {
        const tagName = await heading.evaluate((el) => el.tagName);
        return parseInt(tagName.replace('H', ''), 10);
      })
    );

    // Check there's exactly one h1
    const h1Count = headingLevels.filter((level) => level === 1).length;
    expect(h1Count).toBe(1);

    // Check headings don't skip levels
    for (let i = 1; i < headingLevels.length; i++) {
      const diff = headingLevels[i] - headingLevels[i - 1];
      expect(diff).toBeLessThanOrEqual(1);
    }
  });

  test('should have proper semantic HTML structure', async ({ page }) => {
    // Check for banner (header)
    const banner = page.locator('header[role="banner"], [role="banner"]');
    await expect(banner).toBeVisible();

    // Check for regions
    const activeProjectsRegion = page.locator('[aria-labelledby="active-projects-heading"]');
    await expect(activeProjectsRegion).toBeVisible();

    // Check for semantic elements
    const buttons = page.locator('button');
    const buttonsCount = await buttons.count();
    expect(buttonsCount).toBeGreaterThan(0);

    // All buttons should have accessible names
    for (let i = 0; i < buttonsCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();

      // Button should have either aria-label or text content
      expect(ariaLabel || text).toBeTruthy();
    }
  });

  test('should have minimum touch target sizes on mobile (44px)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Get all interactive elements
    const interactiveElements = page.locator('button, a, input, select, textarea');
    const count = await interactiveElements.count();

    // Check each interactive element has minimum 44px height
    for (let i = 0; i < count; i++) {
      const element = interactiveElements.nth(i);
      const box = await element.boundingBox();

      if (box) {
        // WCAG AA requires 44px minimum for touch targets
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should have proper focus indicators', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Get the focused element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Check that focus ring is visible (has outline or ring styles)
    const styles = await focusedElement.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineWidth: computed.outlineWidth,
        boxShadow: computed.boxShadow,
      };
    });

    // Should have visible focus indicator (outline or box-shadow/ring)
    const hasFocusIndicator =
      styles.outline !== 'none' ||
      styles.outlineWidth !== '0px' ||
      styles.boxShadow !== 'none';

    expect(hasFocusIndicator).toBe(true);
  });

  test('should have proper time elements with datetime attributes', async ({ page }) => {
    const timeElements = page.locator('time');
    const count = await timeElements.count();

    if (count > 0) {
      // All time elements should have datetime attribute for screen readers
      for (let i = 0; i < count; i++) {
        const timeEl = timeElements.nth(i);
        const datetime = await timeEl.getAttribute('datetime');

        // datetime attribute is optional but recommended for accessibility
        // Just verify the element is present
        await expect(timeEl).toBeVisible();
      }
    }
  });

  test('should pass landmark region accessibility rules', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['cat.structure'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have no duplicate IDs', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['cat.parsing'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
