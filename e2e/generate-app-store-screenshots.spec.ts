/**
 * App Store Screenshot Generator
 *
 * Generates screenshots at required App Store resolutions:
 * - iPhone 6.5" (1290x2796 or 1284x2778) - iPhone 14 Plus, 13 Pro Max, etc.
 * - iPad 12.9" (2048x2732) - iPad Pro 12.9"
 *
 * Usage: npx playwright test scripts/generate-app-store-screenshots.ts
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test credentials for authenticated screenshots
const TEST_EMAIL = 'admin@jobsight.co';
const TEST_PASSWORD = 'TestAdmin123!';

// App Store screenshot dimensions (EXACT dimensions required by Apple)
// iPhone 6.5": 1284 x 2778 or 1242 x 2688
// iPad 12.9": 2048 x 2732
const DEVICE_CONFIGS = {
  'iphone-6.5': {
    width: 1284,
    height: 2778,
    deviceScaleFactor: 1, // Use 1 to get exact pixel dimensions
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  'ipad-12.9': {
    width: 2048,
    height: 2732,
    deviceScaleFactor: 1, // Use 1 to get exact pixel dimensions
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
};

// Pages to screenshot with descriptions for App Store
const SCREENSHOT_PAGES = [
  {
    path: '/',
    name: '01-dashboard',
    title: 'Project Dashboard',
    waitFor: '.dashboard, [data-testid="dashboard"], main',
  },
  {
    path: '/projects',
    name: '02-projects',
    title: 'Project List',
    waitFor: '[data-testid="projects-list"], .projects-grid, main',
  },
  {
    path: '/daily-reports',
    name: '03-daily-reports',
    title: 'Daily Reports',
    waitFor: '[data-testid="daily-reports"], .reports-list, main',
  },
  {
    path: '/tasks',
    name: '04-tasks',
    title: 'Task Management',
    waitFor: '[data-testid="tasks-list"], .tasks-container, main',
  },
  {
    path: '/documents',
    name: '05-documents',
    title: 'Document Library',
    waitFor: '[data-testid="document-library"], .documents-grid, main',
  },
  {
    path: '/punch-lists',
    name: '06-punch-lists',
    title: 'Punch Lists',
    waitFor: '[data-testid="punch-lists"], .punch-items, main',
  },
];

// Create output directory
const OUTPUT_DIR = path.join(process.cwd(), 'app-store-screenshots');

test.describe('App Store Screenshot Generation', () => {
  test.beforeAll(async () => {
    // Create output directories
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    for (const device of Object.keys(DEVICE_CONFIGS)) {
      const deviceDir = path.join(OUTPUT_DIR, device);
      if (!fs.existsSync(deviceDir)) {
        fs.mkdirSync(deviceDir, { recursive: true });
      }
    }
  });

  for (const [deviceName, config] of Object.entries(DEVICE_CONFIGS)) {
    test.describe(`${deviceName} screenshots`, () => {
      test.use({
        viewport: { width: config.width / config.deviceScaleFactor, height: config.height / config.deviceScaleFactor },
        deviceScaleFactor: config.deviceScaleFactor,
        isMobile: config.isMobile,
        hasTouch: config.hasTouch,
        userAgent: config.userAgent,
      });

      // First, we need to login
      test.beforeEach(async ({ page }) => {
        // Navigate to login page
        await page.goto('/login', { waitUntil: 'networkidle' });

        // Wait for login page to fully load
        await page.waitForTimeout(2000);

        // Dismiss any PWA install prompt if present
        const notNowButton = page.locator('button:has-text("Not now")');
        if (await notNowButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await notNowButton.click();
          await page.waitForTimeout(500);
        }

        // Also try dismiss button
        const dismissButton = page.locator('button:has-text("Dismiss")');
        if (await dismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await dismissButton.click();
          await page.waitForTimeout(500);
        }

        // Fill login form
        const emailInput = page.locator('input[type="email"]').first();
        const passwordInput = page.locator('input[type="password"]').first();

        // Wait for inputs to be ready
        await emailInput.waitFor({ state: 'visible', timeout: 10000 });

        // Clear and fill email
        await emailInput.click();
        await emailInput.fill(TEST_EMAIL);

        // Clear and fill password
        await passwordInput.click();
        await passwordInput.fill(TEST_PASSWORD);

        // Find and click the Sign in button (the submit button, not biometrics)
        const loginButton = page.locator('button[type="submit"]:has-text("Sign in"), button:has-text("Sign in"):not(:has-text("Biometrics"))').first();
        await loginButton.waitFor({ state: 'visible', timeout: 5000 });

        // Click and wait for navigation
        await loginButton.click();

        // Wait for successful login - should redirect away from /login
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });

        // Additional wait for app to fully load after login
        await page.waitForTimeout(3000);

        // Dismiss any dialogs that might appear after login
        const postLoginDismiss = page.locator('button:has-text("Not now"), button:has-text("Dismiss"), button:has-text("Skip")');
        if (await postLoginDismiss.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await postLoginDismiss.first().click();
          await page.waitForTimeout(500);
        }
      });

      for (const screenshotPage of SCREENSHOT_PAGES) {
        test(`capture ${screenshotPage.name}`, async ({ page }) => {
          // Navigate to page
          await page.goto(screenshotPage.path, { waitUntil: 'networkidle' });

          // Wait for content to load
          try {
            await page.waitForSelector(screenshotPage.waitFor, { timeout: 10000 });
          } catch {
            // Continue even if specific selector not found
            await page.waitForLoadState('networkidle');
          }

          // Wait for animations and data to fully load
          await page.waitForTimeout(3000);

          // Take screenshot
          const screenshotPath = path.join(OUTPUT_DIR, deviceName, `${screenshotPage.name}.png`);
          await page.screenshot({
            path: screenshotPath,
            fullPage: false,
          });

          console.log(`✓ Captured: ${deviceName}/${screenshotPage.name}.png`);
        });
      }
    });
  }
});

// Also create a simpler standalone script version
export async function generateScreenshots() {
  const { chromium } = await import('playwright');

  console.log('🖼️  Generating App Store Screenshots...\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  for (const [deviceName, config] of Object.entries(DEVICE_CONFIGS)) {
    console.log(`\n📱 Generating ${deviceName} screenshots...`);

    const deviceDir = path.join(OUTPUT_DIR, deviceName);
    if (!fs.existsSync(deviceDir)) {
      fs.mkdirSync(deviceDir, { recursive: true });
    }

    const context = await browser.newContext({
      viewport: {
        width: Math.round(config.width / config.deviceScaleFactor),
        height: Math.round(config.height / config.deviceScaleFactor)
      },
      deviceScaleFactor: config.deviceScaleFactor,
      isMobile: config.isMobile,
      hasTouch: config.hasTouch,
      userAgent: config.userAgent,
    });

    const page = await context.newPage();

    // Login first
    try {
      await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle', timeout: 30000 });

      const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
      if (await emailInput.isVisible({ timeout: 5000 })) {
        await emailInput.fill(process.env.TEST_USER_EMAIL || 'test@example.com');
        await page.locator('input[type="password"]').first().fill(process.env.TEST_USER_PASSWORD || 'testpassword123');
        await page.locator('button[type="submit"]').first().click();
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log('  Note: Could not login, continuing with public pages...');
    }

    for (const screenshotPage of SCREENSHOT_PAGES) {
      try {
        await page.goto(`http://localhost:5175${screenshotPage.path}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await page.waitForTimeout(2000); // Wait for animations

        const screenshotPath = path.join(deviceDir, `${screenshotPage.name}.png`);
        await page.screenshot({
          path: screenshotPath,
          fullPage: false,
        });

        console.log(`  ✓ ${screenshotPage.name}.png`);
      } catch (e) {
        console.log(`  ✗ ${screenshotPage.name} - Error: ${(e as Error).message}`);
      }
    }

    await context.close();
  }

  await browser.close();

  console.log(`\n✅ Screenshots saved to: ${OUTPUT_DIR}`);
  console.log('\nNext steps:');
  console.log('1. Review screenshots and select the best ones');
  console.log('2. Upload to App Store Connect under "App Preview and Screenshots"');
  console.log('   - iPhone 6.5" Display (required)');
  console.log('   - iPad Pro 12.9" Display (required)');
}

// Run if called directly
if (process.argv[1]?.includes('generate-app-store-screenshots')) {
  generateScreenshots().catch(console.error);
}
