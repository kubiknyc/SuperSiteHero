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
  /* Use 2 workers in CI for faster execution while maintaining stability */
  /* Set to 1 if tests become flaky due to shared state issues */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace for all tests. See https://playwright.dev/docs/trace-viewer */
    trace: 'on',

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
        // Firefox performance optimizations:
        // - Use 'domcontentloaded' instead of 'networkidle' for faster tests
        // - Reduced timeouts from 180s/90s to 90s/60s (matching other browsers)
        // - If tests still timeout, consider: 1) Code splitting, 2) Lazy loading routes
        navigationTimeout: 90000,
        actionTimeout: 60000,
        // Wait for DOMContentLoaded instead of networkidle for Firefox
        // networkidle can be slow in Firefox due to persistent connections
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

    /* Autonomous smoke crawl project */
    {
      name: 'smoke-crawl',
      testDir: './e2e/autonomous',
      testMatch: 'smoke-crawl.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        trace: 'retain-on-failure', // Only record trace on failure to avoid Windows path issues
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
      timeout: 300000, // 5 minutes for full crawl
      retries: 0, // No retries for smoke tests - they should be deterministic
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
    reuseExistingServer: !process.env.CI,  // Reuse existing server locally, fresh in CI
    timeout: 180000,  // Increased timeout for slow server startup
  },
});
