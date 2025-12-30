/**
 * App Store Screenshot Generator
 *
 * Generates screenshots at required App Store resolutions:
 * - iPhone 6.5" (1284x2778) - iPhone 14 Plus, 13 Pro Max, etc.
 * - iPad 12.9" (2048x2732) - iPad Pro 12.9"
 *
 * Usage: npx playwright test e2e/generate-app-store-screenshots.spec.ts --project=chromium
 */

import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// App Store screenshot dimensions (EXACT dimensions required by Apple)
const DEVICE_CONFIGS = {
  'iphone-6.5': {
    width: 1284,
    height: 2778,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  'ipad-12.9': {
    width: 2048,
    height: 2732,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
};

// Public pages to screenshot (no authentication required)
const SCREENSHOT_PAGES = [
  {
    path: '/login',
    name: '01-login',
    title: 'Sign In',
  },
  {
    path: '/signup',
    name: '02-signup',
    title: 'Create Account',
  },
  {
    path: '/privacy',
    name: '03-privacy',
    title: 'Privacy Policy',
  },
  {
    path: '/terms',
    name: '04-terms',
    title: 'Terms of Service',
  },
];

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
        viewport: { width: config.width, height: config.height },
        deviceScaleFactor: config.deviceScaleFactor,
        isMobile: config.isMobile,
        hasTouch: config.hasTouch,
        userAgent: config.userAgent,
      });

      for (const screenshotPage of SCREENSHOT_PAGES) {
        test(`capture ${screenshotPage.name}`, async ({ page }) => {
          // Navigate to page
          await page.goto(screenshotPage.path, { waitUntil: 'networkidle' });

          // Wait for page to load
          await page.waitForTimeout(2000);

          // Dismiss PWA install prompt if present
          try {
            const notNowButton = page.locator('button:has-text("Not now")').first();
            if (await notNowButton.isVisible({ timeout: 2000 })) {
              await notNowButton.click();
              await page.waitForTimeout(500);
            }
          } catch {
            // Ignore if not present
          }

          // Wait for any animations to settle
          await page.waitForTimeout(1000);

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
