import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment if running tests, otherwise use local environment
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.local';
dotenv.config({ path: path.resolve(__dirname, envFile) });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Global setup - runs once before all tests */
  globalSetup: './e2e/global-setup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot settings for visual regression testing */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* Increase timeout for slow-loading pages */
    actionTimeout: 60000,
    navigationTimeout: 60000,
  },

  /* Global test timeout */
  timeout: 90000,

  /* Visual regression test settings */
  expect: {
    toHaveScreenshot: {
      /* Maximum allowed pixel difference */
      maxDiffPixels: 150,
      /* Maximum difference ratio (3% tolerance for browser rendering differences) */
      maxDiffPixelRatio: 0.03,
      /* Pixel comparison threshold */
      threshold: 0.2,
      /* Animation handling */
      animations: 'disabled',
      /* Scale handling for different DPIs */
      scale: 'css',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Firefox needs more time to reach networkidle state
        navigationTimeout: 180000, // 3 minutes for Firefox
        actionTimeout: 90000, // 1.5 minutes for actions
      },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:test',
    url: 'http://localhost:5173',
    reuseExistingServer: false,  // Always start fresh server in test mode
    timeout: 180000,  // Increased timeout for slow server startup
  },
});
