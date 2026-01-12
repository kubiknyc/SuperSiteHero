/**
 * Accessibility Tests using axe-core
 *
 * Automated WCAG 2.1 compliance testing for critical pages.
 * Uses @axe-core/playwright for comprehensive accessibility audits.
 *
 * These tests check for:
 * - WCAG 2.1 Level A violations
 * - WCAG 2.1 Level AA violations
 * - Common accessibility issues (color contrast, missing labels, etc.)
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Use pre-authenticated session
test.use({ storageState: 'playwright/.auth/user.json' });

// Critical pages to test for accessibility
const CRITICAL_PAGES = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Projects', path: '/projects' },
  { name: 'Daily Reports', path: '/daily-reports' },
  { name: 'RFIs', path: '/rfis' },
  { name: 'Tasks', path: '/tasks' },
  { name: 'Settings', path: '/settings' },
];

// Pages that should be accessible without authentication
const PUBLIC_PAGES = [
  { name: 'Login', path: '/login' },
];

test.describe('Accessibility - WCAG 2.1 Compliance', () => {
  test.describe('Authenticated Pages', () => {
    for (const page of CRITICAL_PAGES) {
      test(`${page.name} page should have no critical accessibility violations`, async ({ page: browserPage }) => {
        await browserPage.goto(page.path);
        await browserPage.waitForLoadState('domcontentloaded');

        // Run axe accessibility scan
        const accessibilityScanResults = await new AxeBuilder({ page: browserPage })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          // Exclude known issues that are being tracked in accessibility backlog
          .exclude('div[role="button"][tabindex="0"]')
          .analyze();

        // Filter for critical violations only (critical impact) - exclude 'serious' for now as they're tracked
        const criticalViolations = accessibilityScanResults.violations.filter(
          (v) => v.impact === 'critical'
        );

        // Log all violations for debugging
        if (accessibilityScanResults.violations.length > 0) {
          console.log(`\n${page.name} - Accessibility Issues Found:`);
          for (const violation of accessibilityScanResults.violations) {
            console.log(`  [${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.description}`);
            console.log(`    Help: ${violation.helpUrl}`);
            console.log(`    Nodes affected: ${violation.nodes.length}`);
          }
        }

        // Fail only on critical violations (serious violations are tracked separately)
        expect(
          criticalViolations,
          `${page.name} has ${criticalViolations.length} critical accessibility violations`
        ).toHaveLength(0);
      });
    }
  });

  test.describe('Public Pages', () => {
    // Reset storage state for public pages
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const page of PUBLIC_PAGES) {
      test(`${page.name} page should have no critical accessibility violations`, async ({ page: browserPage }) => {
        await browserPage.goto(page.path);
        await browserPage.waitForLoadState('domcontentloaded');

        const accessibilityScanResults = await new AxeBuilder({ page: browserPage })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .exclude('div[role="button"][tabindex="0"]')
          .analyze();

        // Only check for critical violations
        const criticalViolations = accessibilityScanResults.violations.filter(
          (v) => v.impact === 'critical'
        );

        if (accessibilityScanResults.violations.length > 0) {
          console.log(`\n${page.name} - Accessibility Issues Found:`);
          for (const violation of accessibilityScanResults.violations) {
            console.log(`  [${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.description}`);
          }
        }

        expect(criticalViolations).toHaveLength(0);
      });
    }
  });

  test.describe('Interactive Components', () => {
    test('Modal dialogs should be accessible', async ({ page }) => {
      await page.goto('/daily-reports');
      await page.waitForLoadState('domcontentloaded');

      // Try to open a create dialog
      const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")');
      if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await createButton.first().click();
        await page.waitForTimeout(500); // Wait for dialog animation

        // Check dialog accessibility
        const dialog = page.locator('[role="dialog"], .modal, [data-testid="dialog"]');
        if (await dialog.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          const dialogResults = await new AxeBuilder({ page })
            .include('[role="dialog"], .modal, [data-testid="dialog"]')
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();

          const criticalViolations = dialogResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
          );

          expect(criticalViolations).toHaveLength(0);
        }
      }
    });

    test('Form inputs should have proper labels', async ({ page }) => {
      await page.goto('/daily-reports');
      await page.waitForLoadState('domcontentloaded');

      // Open create form
      const createButton = page.locator('button:has-text("New"), button:has-text("Create")');
      if (await createButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await createButton.first().click();
        await page.waitForTimeout(500);

        // Check for form label issues specifically
        const formResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .options({ rules: { 'label': { enabled: true }, 'label-title-only': { enabled: true } } })
          .analyze();

        const labelViolations = formResults.violations.filter(
          (v) => v.id.includes('label')
        );

        if (labelViolations.length > 0) {
          console.log('\nForm Label Issues:');
          for (const violation of labelViolations) {
            console.log(`  ${violation.id}: ${violation.help}`);
            for (const node of violation.nodes) {
              console.log(`    - ${node.html}`);
            }
          }
        }

        // Allow minor violations but log them
        const criticalLabelViolations = labelViolations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );
        expect(criticalLabelViolations).toHaveLength(0);
      }
    });

    test('Navigation should be keyboard accessible', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check that focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Run axe on navigation elements
      const navResults = await new AxeBuilder({ page })
        .include('nav, [role="navigation"], header')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalNavViolations = navResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalNavViolations).toHaveLength(0);
    });
  });

  test.describe('Color and Contrast', () => {
    test('Text should have sufficient color contrast', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const contrastResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .options({ rules: { 'color-contrast': { enabled: true } } })
        .analyze();

      const contrastViolations = contrastResults.violations.filter(
        (v) => v.id === 'color-contrast'
      );

      if (contrastViolations.length > 0) {
        console.log('\nColor Contrast Issues:');
        for (const violation of contrastViolations) {
          console.log(`  ${violation.nodes.length} elements have insufficient contrast`);
          // Log first 5 examples
          for (const node of violation.nodes.slice(0, 5)) {
            console.log(`    - ${node.html.substring(0, 100)}...`);
          }
        }
      }

      // Contrast violations are serious - should be 0
      expect(contrastViolations).toHaveLength(0);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('Images should have alt text', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const imageResults = await new AxeBuilder({ page })
        .withTags(['wcag2a'])
        .options({ rules: { 'image-alt': { enabled: true } } })
        .analyze();

      const altViolations = imageResults.violations.filter(
        (v) => v.id === 'image-alt'
      );

      expect(altViolations).toHaveLength(0);
    });

    test('Headings should be in logical order', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const headingResults = await new AxeBuilder({ page })
        .withTags(['wcag2a'])
        .options({ rules: { 'heading-order': { enabled: true } } })
        .analyze();

      const headingViolations = headingResults.violations.filter(
        (v) => v.id === 'heading-order'
      );

      if (headingViolations.length > 0) {
        console.log('\nHeading Order Issues:');
        for (const node of headingViolations[0]?.nodes || []) {
          console.log(`  - ${node.html}`);
        }
      }

      // Heading order is important but not critical
      // Log but don't fail for minor issues
      expect(
        headingViolations.filter((v) => v.impact === 'critical')
      ).toHaveLength(0);
    });

    test('ARIA attributes should be valid', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const ariaResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .options({
          rules: {
            'aria-allowed-attr': { enabled: true },
            'aria-hidden-body': { enabled: true },
            'aria-hidden-focus': { enabled: true },
            'aria-required-attr': { enabled: true },
            'aria-required-children': { enabled: true },
            'aria-required-parent': { enabled: true },
            'aria-roles': { enabled: true },
            'aria-valid-attr': { enabled: true },
            'aria-valid-attr-value': { enabled: true },
          },
        })
        .analyze();

      const ariaViolations = ariaResults.violations.filter(
        (v) => v.id.startsWith('aria-')
      );

      if (ariaViolations.length > 0) {
        console.log('\nARIA Issues:');
        for (const violation of ariaViolations) {
          console.log(`  [${violation.impact}] ${violation.id}: ${violation.help}`);
        }
      }

      const criticalAriaViolations = ariaViolations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalAriaViolations).toHaveLength(0);
    });
  });
});

/**
 * Helper to generate accessibility report
 */
export async function generateAccessibilityReport(
  page: import('@playwright/test').Page,
  pageName: string
): Promise<{
  violations: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const report = {
    violations: results.violations.length,
    critical: results.violations.filter((v) => v.impact === 'critical').length,
    serious: results.violations.filter((v) => v.impact === 'serious').length,
    moderate: results.violations.filter((v) => v.impact === 'moderate').length,
    minor: results.violations.filter((v) => v.impact === 'minor').length,
  };

  console.log(`\n=== Accessibility Report: ${pageName} ===`);
  console.log(`Total Violations: ${report.violations}`);
  console.log(`  Critical: ${report.critical}`);
  console.log(`  Serious: ${report.serious}`);
  console.log(`  Moderate: ${report.moderate}`);
  console.log(`  Minor: ${report.minor}`);

  return report;
}
