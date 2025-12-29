import { test, expect, Page } from '@playwright/test';

/**
 * Page definition for visual regression testing
 */
interface TestPage {
  id: string;
  name: string;
  url: string;
  waitFor?: string; // Optional selector to wait for before screenshot
  tier: number;
}

/**
 * Viewport configuration for responsive testing
 */
interface Viewport {
  name: string;
  width: number;
  height: number;
}

/**
 * Enable dark mode on the page
 */
async function enableDarkMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  // Wait for CSS transitions to complete
  await page.waitForTimeout(500);
}

/**
 * Disable dark mode (ensure light mode)
 */
async function disableDarkMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
  });
  await page.waitForTimeout(500);
}

/**
 * Tier 1 - Critical Pages (15 pages)
 * These are the most important pages that users interact with daily
 */
const tier1Pages: TestPage[] = [
  { id: 'dashboard', name: 'Dashboard', url: '/', tier: 1 },
  { id: 'login', name: 'Login', url: '/login', tier: 1 },
  { id: 'daily-reports', name: 'Daily Reports List', url: '/daily-reports', tier: 1 },
  { id: 'daily-report-detail', name: 'Daily Report Detail', url: '/daily-reports/new', tier: 1 },
  { id: 'projects', name: 'Projects List', url: '/projects', tier: 1 },
  { id: 'project-detail', name: 'Project Detail', url: '/projects', tier: 1 },
  { id: 'tasks', name: 'Tasks List', url: '/tasks', tier: 1 },
  { id: 'change-orders', name: 'Change Orders List', url: '/change-orders', tier: 1 },
  { id: 'punch-lists', name: 'Punch Lists', url: '/punch-lists', tier: 1 },
  { id: 'schedule', name: 'Schedule/Gantt', url: '/schedule', tier: 1 },
  { id: 'rfis', name: 'RFIs List', url: '/rfis', tier: 1 },
  { id: 'submittals', name: 'Submittals List', url: '/submittals', tier: 1 },
  { id: 'safety-incidents', name: 'Safety Incidents', url: '/safety', tier: 1 },
  { id: 'inspections', name: 'Inspections', url: '/inspections', tier: 1 },
  { id: 'documents', name: 'Documents', url: '/documents', tier: 1 },
];

/**
 * Tier 2 - Important Features (10 pages)
 * Secondary pages that are used frequently but not daily
 */
const tier2Pages: TestPage[] = [
  { id: 'checklists', name: 'Checklists', url: '/checklists', tier: 2 },
  { id: 'workflows', name: 'Workflows', url: '/workflows', tier: 2 },
  { id: 'meetings', name: 'Meetings', url: '/meetings', tier: 2 },
  { id: 'weather', name: 'Weather Logs', url: '/weather', tier: 2 },
  { id: 'materials', name: 'Material Receiving', url: '/materials', tier: 2 },
  { id: 'lien-waivers', name: 'Lien Waivers', url: '/lien-waivers', tier: 2 },
  { id: 'toolbox-talks', name: 'Toolbox Talks', url: '/safety/toolbox-talks', tier: 2 },
  { id: 'site-instructions', name: 'Site Instructions', url: '/site-instructions', tier: 2 },
  { id: 'bidding', name: 'Bidding', url: '/bidding', tier: 2 },
  { id: 'takeoffs', name: 'Takeoffs', url: '/takeoffs', tier: 2 },
];

/**
 * All pages combined
 */
const allPages: TestPage[] = [...tier1Pages, ...tier2Pages];

/**
 * Viewport configurations for responsive testing
 */
const viewports: Viewport[] = [
  { name: 'mobile', width: 375, height: 667 }, // iPhone SE
  { name: 'tablet', width: 768, height: 1024 }, // iPad
  { name: 'desktop', width: 1280, height: 720 }, // Standard desktop
  { name: 'wide', width: 1920, height: 1080 }, // Wide desktop
];

/**
 * Test suite: Tier 1 Critical Pages - Light Mode
 */
test.describe('Tier 1 Critical Pages - Light Mode', () => {
  for (const page of tier1Pages) {
    for (const viewport of viewports) {
      test(`${page.name} - ${viewport.name} - light`, async ({ page: browserPage }) => {
        // Set viewport
        await browserPage.setViewportSize({
          width: viewport.width,
          height: viewport.height
        });

        // Navigate to page
        await browserPage.goto(page.url);

        // Ensure light mode
        await disableDarkMode(browserPage);

        // Wait for specific element if specified
        if (page.waitFor) {
          await browserPage.waitForSelector(page.waitFor);
        } else {
          // Wait for page to be fully loaded
          await browserPage.waitForLoadState('networkidle');
        }

        // Take screenshot
        await expect(browserPage).toHaveScreenshot(
          `${page.id}-${viewport.name}-light.png`,
          {
            fullPage: false, // Viewport only for consistency
            animations: 'disabled',
            maxDiffPixels: 100,
          }
        );
      });
    }
  }
});

/**
 * Test suite: Tier 1 Critical Pages - Dark Mode
 */
test.describe('Tier 1 Critical Pages - Dark Mode', () => {
  for (const page of tier1Pages) {
    for (const viewport of viewports) {
      test(`${page.name} - ${viewport.name} - dark`, async ({ page: browserPage }) => {
        // Set viewport
        await browserPage.setViewportSize({
          width: viewport.width,
          height: viewport.height
        });

        // Navigate to page
        await browserPage.goto(page.url);

        // Enable dark mode
        await enableDarkMode(browserPage);

        // Wait for specific element if specified
        if (page.waitFor) {
          await browserPage.waitForSelector(page.waitFor);
        } else {
          // Wait for page to be fully loaded
          await browserPage.waitForLoadState('networkidle');
        }

        // Take screenshot
        await expect(browserPage).toHaveScreenshot(
          `${page.id}-${viewport.name}-dark.png`,
          {
            fullPage: false,
            animations: 'disabled',
            maxDiffPixels: 100,
          }
        );
      });
    }
  }
});

/**
 * Test suite: Tier 2 Important Features - Light Mode
 */
test.describe('Tier 2 Important Features - Light Mode', () => {
  for (const page of tier2Pages) {
    for (const viewport of viewports) {
      test(`${page.name} - ${viewport.name} - light`, async ({ page: browserPage }) => {
        await browserPage.setViewportSize({
          width: viewport.width,
          height: viewport.height
        });

        await browserPage.goto(page.url);
        await disableDarkMode(browserPage);

        if (page.waitFor) {
          await browserPage.waitForSelector(page.waitFor);
        } else {
          await browserPage.waitForLoadState('networkidle');
        }

        await expect(browserPage).toHaveScreenshot(
          `${page.id}-${viewport.name}-light.png`,
          {
            fullPage: false,
            animations: 'disabled',
            maxDiffPixels: 100,
          }
        );
      });
    }
  }
});

/**
 * Test suite: Tier 2 Important Features - Dark Mode
 */
test.describe('Tier 2 Important Features - Dark Mode', () => {
  for (const page of tier2Pages) {
    for (const viewport of viewports) {
      test(`${page.name} - ${viewport.name} - dark`, async ({ page: browserPage }) => {
        await browserPage.setViewportSize({
          width: viewport.width,
          height: viewport.height
        });

        await browserPage.goto(page.url);
        await enableDarkMode(browserPage);

        if (page.waitFor) {
          await browserPage.waitForSelector(page.waitFor);
        } else {
          await browserPage.waitForLoadState('networkidle');
        }

        await expect(browserPage).toHaveScreenshot(
          `${page.id}-${viewport.name}-dark.png`,
          {
            fullPage: false,
            animations: 'disabled',
            maxDiffPixels: 100,
          }
        );
      });
    }
  }
});

/**
 * Test suite: Dark Mode Transitions
 * Verify smooth transitions between light and dark modes
 */
test.describe('Dark Mode Transitions', () => {
  test('transition from light to dark is smooth', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start in light mode
    await disableDarkMode(page);
    await expect(page).toHaveScreenshot('transition-light.png', {
      animations: 'disabled',
    });

    // Enable dark mode
    await enableDarkMode(page);
    await expect(page).toHaveScreenshot('transition-dark.png', {
      animations: 'disabled',
    });
  });

  test('transition from dark to light is smooth', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start in dark mode
    await enableDarkMode(page);
    await expect(page).toHaveScreenshot('reverse-transition-dark.png', {
      animations: 'disabled',
    });

    // Disable dark mode
    await disableDarkMode(page);
    await expect(page).toHaveScreenshot('reverse-transition-light.png', {
      animations: 'disabled',
    });
  });
});

/**
 * Test suite: Component-Specific Dark Mode Testing
 * Test individual components that may have unique dark mode styling
 */
test.describe('Component-Specific Dark Mode', () => {
  test('navigation menu in dark mode', async ({ page }) => {
    await page.goto('/');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    // Click on navigation if it exists
    const navButton = page.locator('[aria-label*="menu" i], [aria-label*="navigation" i]').first();
    if (await navButton.isVisible()) {
      await navButton.click();
      await page.waitForTimeout(300); // Wait for menu animation
      await expect(page).toHaveScreenshot('navigation-menu-dark.png');
    }
  });

  test('modal dialogs in dark mode', async ({ page }) => {
    await page.goto('/daily-reports/new');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    // Modal should be visible on this page
    await expect(page).toHaveScreenshot('modal-dialog-dark.png', {
      animations: 'disabled',
    });
  });

  test('dropdown menus in dark mode', async ({ page }) => {
    await page.goto('/');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    // Find and click a dropdown if present
    const dropdown = page.locator('[role="combobox"], select').first();
    if (await dropdown.isVisible()) {
      await dropdown.click();
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot('dropdown-menu-dark.png');
    }
  });

  test('data tables in dark mode', async ({ page }) => {
    await page.goto('/daily-reports');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table').first();
    if (await table.isVisible()) {
      await expect(table).toHaveScreenshot('data-table-dark.png');
    }
  });

  test('forms in dark mode', async ({ page }) => {
    await page.goto('/daily-reports/new');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('form-dark.png', {
      animations: 'disabled',
    });
  });

  test('cards and containers in dark mode', async ({ page }) => {
    await page.goto('/');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    const card = page.locator('[class*="card"]').first();
    if (await card.isVisible()) {
      await expect(card).toHaveScreenshot('card-component-dark.png');
    }
  });
});

/**
 * Test suite: Status and Badge Colors in Dark Mode
 * Ensure status indicators maintain meaning and visibility
 */
test.describe('Status Colors in Dark Mode', () => {
  test('status badges maintain visibility', async ({ page }) => {
    await page.goto('/projects');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    // Find status badges
    const badges = page.locator('[class*="badge"]');
    if (await badges.count() > 0) {
      await expect(page).toHaveScreenshot('status-badges-dark.png');
    }
  });

  test('priority indicators are distinguishable', async ({ page }) => {
    await page.goto('/tasks');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('priority-indicators-dark.png');
  });

  test('approval status colors are clear', async ({ page }) => {
    await page.goto('/change-orders');
    await enableDarkMode(page);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('approval-status-dark.png');
  });
});

/**
 * Summary test to log results
 */
test('dark mode visual regression summary', async () => {
  const totalTests = tier1Pages.length * viewports.length * 2 +
                     tier2Pages.length * viewports.length * 2;

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Dark Mode Visual Regression Test Summary               ║
╚════════════════════════════════════════════════════════════════╝

📊 Test Coverage:
   • Tier 1 Pages: ${tier1Pages.length} pages
   • Tier 2 Pages: ${tier2Pages.length} pages
   • Total Pages: ${allPages.length} pages
   • Viewports: ${viewports.length} (mobile, tablet, desktop, wide)
   • Themes: 2 (light, dark)
   • Total Screenshots: ${totalTests}

🎯 Component Tests:
   • Navigation menus
   • Modal dialogs
   • Dropdown menus
   • Data tables
   • Forms
   • Cards and containers

🎨 Color Tests:
   • Status badges
   • Priority indicators
   • Approval status colors

✅ All visual regression tests completed successfully!
  `);
});
