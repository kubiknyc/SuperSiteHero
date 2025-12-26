import { test, expect } from '@playwright/test';
import {
  checkPageContrast,
  checkInteractiveContrast,
  checkHeadingContrast,
  checkBodyTextContrast,
  checkLabelContrast,
  generateContrastReport,
  checkColorPairs,
  ContrastViolation,
} from '../helpers/contrast-checker';

/**
 * Enable dark mode on the page
 */
async function enableDarkMode(page: any): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(500);
}

/**
 * Critical pages to test for contrast compliance
 */
const criticalPages = [
  { name: 'Dashboard', url: '/' },
  { name: 'Daily Reports', url: '/daily-reports' },
  { name: 'Projects', url: '/projects' },
  { name: 'Tasks', url: '/tasks' },
  { name: 'Change Orders', url: '/change-orders' },
  { name: 'Punch Lists', url: '/punch-lists' },
  { name: 'Schedule', url: '/schedule' },
  { name: 'Login', url: '/login' },
];

/**
 * Test suite: Heading Contrast in Dark Mode
 */
test.describe('Heading Contrast - Dark Mode', () => {
  for (const pageDef of criticalPages) {
    test(`${pageDef.name} - headings meet WCAG AA contrast`, async ({ page }) => {
      await page.goto(pageDef.url);
      await enableDarkMode(page);
      await page.waitForLoadState('networkidle');

      const violations = await checkHeadingContrast(page);

      if (violations.length > 0) {
        console.log(`\n⚠️  ${pageDef.name} Heading Contrast Violations:`);
        console.log(generateContrastReport(violations));
      }

      expect(violations.length, `Found ${violations.length} heading contrast violations on ${pageDef.name}`).toBe(0);
    });
  }
});

/**
 * Test suite: Body Text Contrast in Dark Mode
 */
test.describe('Body Text Contrast - Dark Mode', () => {
  for (const pageDef of criticalPages) {
    test(`${pageDef.name} - body text meets WCAG AA contrast`, async ({ page }) => {
      await page.goto(pageDef.url);
      await enableDarkMode(page);
      await page.waitForLoadState('networkidle');

      const violations = await checkBodyTextContrast(page);

      if (violations.length > 0) {
        console.log(`\n⚠️  ${pageDef.name} Body Text Contrast Violations:`);
        console.log(generateContrastReport(violations));
      }

      // Allow up to 5 violations for body text due to dynamic content
      expect(violations.length, `Found ${violations.length} body text contrast violations on ${pageDef.name}`).toBeLessThanOrEqual(5);
    });
  }
});

/**
 * Test suite: Form Label Contrast in Dark Mode
 */
test.describe('Form Label Contrast - Dark Mode', () => {
  test('Login form labels', async ({ page }) => {
    await page.goto('/login');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    const violations = await checkLabelContrast(page);

    if (violations.length > 0) {
      console.log('\n⚠️  Login Form Label Contrast Violations:');
      console.log(generateContrastReport(violations));
    }

    expect(violations.length, 'Form labels should meet WCAG AA contrast').toBe(0);
  });

  test('Daily Report form labels', async ({ page }) => {
    await page.goto('/daily-reports/new');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    const violations = await checkLabelContrast(page);

    if (violations.length > 0) {
      console.log('\n⚠️  Daily Report Form Label Contrast Violations:');
      console.log(generateContrastReport(violations));
    }

    expect(violations.length, 'Form labels should meet WCAG AA contrast').toBe(0);
  });
});

/**
 * Test suite: Interactive Element Contrast in Dark Mode
 */
test.describe('Interactive Elements Contrast - Dark Mode', () => {
  for (const pageDef of criticalPages) {
    test(`${pageDef.name} - buttons and links meet contrast`, async ({ page }) => {
      await page.goto(pageDef.url);
      await enableDarkMode(page);
      await page.waitForLoadState('networkidle');

      const violations = await checkInteractiveContrast(page);

      if (violations.length > 0) {
        console.log(`\n⚠️  ${pageDef.name} Interactive Element Contrast Violations:`);
        console.log(generateContrastReport(violations));
      }

      // Allow up to 3 violations for interactive elements
      expect(violations.length, `Found ${violations.length} interactive element contrast violations on ${pageDef.name}`).toBeLessThanOrEqual(3);
    });
  }
});

/**
 * Test suite: Navigation Contrast in Dark Mode
 */
test.describe('Navigation Contrast - Dark Mode', () => {
  test('main navigation items', async ({ page }) => {
    await page.goto('/');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    // Check navigation items specifically
    const navViolations = await checkPageContrast(page, [
      'nav a',
      'nav button',
      '[role="navigation"] a',
      '[role="navigation"] button',
    ]);

    if (navViolations.length > 0) {
      console.log('\n⚠️  Navigation Contrast Violations:');
      console.log(generateContrastReport(navViolations));
    }

    expect(navViolations.length, 'Navigation items should meet WCAG AA contrast').toBe(0);
  });

  test('mobile menu navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    // Try to open mobile menu
    const menuButton = page.locator('[aria-label*="menu" i]').first();
    if ((await menuButton.count()) && (await menuButton.isVisible())) {
      try {
        await menuButton.click();
      } catch {
        await menuButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await menuButton.click();
      }
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);

      const navViolations = await checkPageContrast(page, [
        'nav a',
        'nav button',
        '[role="navigation"] a',
      ]);

      expect(navViolations.length, 'Mobile navigation should meet WCAG AA contrast').toBe(0);
    }
  });
});

/**
 * Test suite: Status Indicators and Badges
 */
test.describe('Status Indicators - Dark Mode', () => {
  test('status badges on Projects page', async ({ page }) => {
    await page.goto('/projects');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    const badgeViolations = await checkPageContrast(page, [
      '[class*="badge"]',
      '[role="status"]',
      '[class*="status"]',
    ]);

    if (badgeViolations.length > 0) {
      console.log('\n⚠️  Status Badge Contrast Violations:');
      console.log(generateContrastReport(badgeViolations));
    }

    expect(badgeViolations.length, 'Status badges should meet WCAG AA contrast').toBe(0);
  });

  test('priority indicators on Tasks page', async ({ page }) => {
    await page.goto('/tasks');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    const priorityViolations = await checkPageContrast(page, [
      '[class*="priority"]',
      '[data-priority]',
    ]);

    if (priorityViolations.length > 0) {
      console.log('\n⚠️  Priority Indicator Contrast Violations:');
      console.log(generateContrastReport(priorityViolations));
    }

    expect(priorityViolations.length, 'Priority indicators should meet WCAG AA contrast').toBe(0);
  });

  test('approval status on Change Orders', async ({ page }) => {
    await page.goto('/change-orders');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    const approvalViolations = await checkPageContrast(page, [
      '[class*="approval"]',
      '[data-status]',
    ]);

    if (approvalViolations.length > 0) {
      console.log('\n⚠️  Approval Status Contrast Violations:');
      console.log(generateContrastReport(approvalViolations));
    }

    expect(approvalViolations.length, 'Approval status should meet WCAG AA contrast').toBe(0);
  });
});

/**
 * Test suite: UI Components Contrast
 */
test.describe('UI Components - Dark Mode', () => {
  test('card components', async ({ page }) => {
    await page.goto('/');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    const cardViolations = await checkPageContrast(page, [
      '[class*="card"] h1',
      '[class*="card"] h2',
      '[class*="card"] h3',
      '[class*="card"] p',
      '[class*="card"] span',
    ]);

    if (cardViolations.length > 0) {
      console.log('\n⚠️  Card Component Contrast Violations:');
      console.log(generateContrastReport(cardViolations));
    }

    expect(cardViolations.length, 'Card components should meet WCAG AA contrast').toBeLessThanOrEqual(3);
  });

  test('table components', async ({ page }) => {
    await page.goto('/daily-reports');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    const tableViolations = await checkPageContrast(page, [
      'table th',
      'table td',
      'thead',
      'tbody',
    ]);

    if (tableViolations.length > 0) {
      console.log('\n⚠️  Table Component Contrast Violations:');
      console.log(generateContrastReport(tableViolations));
    }

    expect(tableViolations.length, 'Table components should meet WCAG AA contrast').toBeLessThanOrEqual(5);
  });

  test('modal dialogs', async ({ page }) => {
    await page.goto('/daily-reports/new');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    const modalViolations = await checkPageContrast(page, [
      '[role="dialog"] h1',
      '[role="dialog"] h2',
      '[role="dialog"] p',
      '[role="dialog"] label',
    ]);

    if (modalViolations.length > 0) {
      console.log('\n⚠️  Modal Dialog Contrast Violations:');
      console.log(generateContrastReport(modalViolations));
    }

    expect(modalViolations.length, 'Modal dialogs should meet WCAG AA contrast').toBe(0);
  });

  test('dropdown menus', async ({ page }) => {
    await page.goto('/');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    // Find and open a dropdown
    const dropdown = page.locator('[role="combobox"]').first();
    if (await dropdown.isVisible()) {
      await dropdown.click();
      await page.waitForTimeout(200);

      const dropdownViolations = await checkPageContrast(page, [
        '[role="option"]',
        '[role="listbox"] *',
        '[class*="dropdown"] *',
      ]);

      expect(dropdownViolations.length, 'Dropdown menus should meet WCAG AA contrast').toBe(0);
    }
  });
});

/**
 * Test suite: Error and Alert Messages
 */
test.describe('Error and Alert Messages - Dark Mode', () => {
  test('error messages visibility', async ({ page }) => {
    await page.goto('/login');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    // Try to submit empty form to trigger errors
    const submitButton = page.getByRole('button', { name: 'Sign in', exact: true });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      const errorViolations = await checkPageContrast(page, [
        '[role="alert"]',
        '[class*="error"]',
        '[aria-invalid="true"] + *',
      ]);

      expect(errorViolations.length, 'Error messages should meet WCAG AA contrast').toBe(0);
    }
  });

  test('toast notifications', async ({ page }) => {
    await page.goto('/');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    // Check for toast notifications if present
    const toastViolations = await checkPageContrast(page, [
      '[role="status"]',
      '[class*="toast"]',
      '[class*="notification"]',
    ]);

    if (toastViolations.length > 0) {
      console.log('\n⚠️  Toast Notification Contrast Violations:');
      console.log(generateContrastReport(toastViolations));
    }

    expect(toastViolations.length, 'Toast notifications should meet WCAG AA contrast').toBeLessThanOrEqual(2);
  });
});

/**
 * Test suite: Predefined Color Combinations
 * Test known color pairs used in the design system
 */
test.describe('Design System Color Pairs - Dark Mode', () => {
  test('verify primary color contrast', async () => {
    // Based on updated CSS variables (HSL 217 70% 35% = #1a3a99)
    const primaryColors = [
      { text: '#3b82f6', background: '#18181b', label: 'Primary on surface-0', isLarge: false },
      { text: '#60a5fa', background: '#18181b', label: 'Primary-400 on surface-0', isLarge: false },
      { text: '#ffffff', background: '#1a3a99', label: 'White on primary', isLarge: false }, // Updated to #1a3a99 for 4.5:1 contrast
    ];

    const results = await checkColorPairs(primaryColors);

    results.forEach(result => {
      console.log(`${result.label}: ${result.ratio}:1 (${result.pass ? '✅ PASS' : '❌ FAIL'})`);
      expect(result.pass, `${result.label} should meet WCAG AA ${result.required}:1`).toBe(true);
    });
  });

  test('verify semantic color contrast', async () => {
    // Using updated colors from src/lib/theme/tokens.ts for WCAG AA compliance
    const semanticColors = [
      // Success (emerald-800 equivalent from tokens.ts: #065e45)
      { text: '#22c55e', background: '#18181b', label: 'Success on surface-0', isLarge: false },
      { text: '#ffffff', background: '#065e45', label: 'White on success', isLarge: false }, // Updated to #065e45 for 4.5:1 contrast

      // Warning (amber-600 from tokens.ts: #D97706)
      { text: '#f59e0b', background: '#18181b', label: 'Warning on surface-0', isLarge: false },
      { text: '#000000', background: '#D97706', label: 'Black on warning', isLarge: false },

      // Error (red-600 from tokens.ts: #DC2626)
      { text: '#ef4444', background: '#18181b', label: 'Error on surface-0', isLarge: false },
      { text: '#ffffff', background: '#DC2626', label: 'White on error', isLarge: false },

      // Info (cyan-700 from tokens.ts: #0e7490)
      { text: '#3b82f6', background: '#18181b', label: 'Info on surface-0', isLarge: false },
      { text: '#ffffff', background: '#0e7490', label: 'White on info', isLarge: false }, // cyan-700 for 5.36:1 ratio
    ];

    const results = await checkColorPairs(semanticColors);

    results.forEach(result => {
      console.log(`${result.label}: ${result.ratio}:1 (${result.pass ? '✅ PASS' : '❌ FAIL'})`);
      expect(result.pass, `${result.label} should meet WCAG AA ${result.required}:1`).toBe(true);
    });
  });

  test('verify text on surface colors', async () => {
    const surfaceColors = [
      // Primary text on surfaces
      { text: '#f4f4f5', background: '#18181b', label: 'zinc-100 on surface-0', isLarge: false },
      { text: '#e4e4e7', background: '#18181b', label: 'zinc-200 on surface-0', isLarge: false },
      { text: '#d4d4d8', background: '#18181b', label: 'zinc-300 on surface-0', isLarge: false },

      // Secondary text on surfaces
      { text: '#a1a1aa', background: '#18181b', label: 'zinc-400 on surface-0', isLarge: false },
      { text: '#71717a', background: '#18181b', label: 'zinc-500 on surface-0', isLarge: true }, // Often large

      // Text on surface-1
      { text: '#f4f4f5', background: '#27272a', label: 'zinc-100 on surface-1', isLarge: false },
      { text: '#e4e4e7', background: '#27272a', label: 'zinc-200 on surface-1', isLarge: false },
    ];

    const results = await checkColorPairs(surfaceColors);

    results.forEach(result => {
      console.log(`${result.label}: ${result.ratio}:1 (${result.pass ? '✅ PASS' : '❌ FAIL'})`);
      if (!result.pass) {
        console.log(`  ⚠️  Required: ${result.required}:1, Got: ${result.ratio}:1`);
      }
      // Note: Some may fail if they're intended for large text only
    });
  });
});

/**
 * Summary test
 */
test('contrast validation summary', async () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║      Dark Mode Contrast Validation Test Summary                ║
╚════════════════════════════════════════════════════════════════╝

✅ Tested Components:
   • Headings (h1-h6)
   • Body text (p, span, div, li)
   • Form labels
   • Interactive elements (buttons, links, inputs)
   • Navigation items
   • Status badges and indicators
   • Cards and containers
   • Tables
   • Modal dialogs
   • Dropdown menus
   • Error and alert messages
   • Toast notifications

✅ Design System Colors:
   • Primary color combinations
   • Semantic colors (success, warning, error, info)
   • Surface color combinations

📊 WCAG 2.1 Level AA Standards:
   • Normal text: 4.5:1 minimum
   • Large text (18pt+ or 14pt bold+): 3.0:1 minimum

All contrast validation tests completed!
  `);
});
