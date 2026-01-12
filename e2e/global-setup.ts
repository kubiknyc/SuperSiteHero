/**
 * Playwright Global Setup
 *
 * This script runs once before all tests to:
 * 1. Verify test environment is properly configured
 * 2. Run server health checks to ensure responsiveness
 * 3. Create authenticated user sessions
 * 4. Seed necessary test data (optional)
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { runHealthChecks, waitForHealthyServer } from './utils/server-health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json');
const ADMIN_AUTH_FILE = path.join(__dirname, '../playwright/.auth/admin.json');

async function globalSetup(config: FullConfig) {
  console.log('\n🔧 Running Playwright global setup...\n');

  // Verify required environment variables
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables in .env.test:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease copy .env.test and fill in the required values.\n');
    throw new Error('Missing required environment variables');
  }

  console.log('✅ Environment variables verified');

  // Get base URL from config
  const baseURL = config.use?.baseURL || 'http://localhost:5173';

  // ============================================
  // SERVER HEALTH CHECKS
  // ============================================
  // Run pre-test verification to ensure all services are responsive
  // This prevents test failures due to server issues vs actual bugs

  const supabaseUrl = process.env.VITE_SUPABASE_URL;

  // First, wait for the server to be ready (Playwright's webServer may still be starting)
  console.log('\n📡 Verifying server responsiveness before tests...\n');

  const healthResult = await waitForHealthyServer({
    baseURL,
    supabaseUrl,
    timeout: 15000,      // 15s timeout per check
    retries: 3,          // 3 retries per check
    retryDelay: 2000,    // 2s between retries
    maxWaitTime: 120000, // 2 minutes max wait
    pollInterval: 5000,  // Check every 5s
    verbose: true,
  });

  if (!healthResult.healthy) {
    console.error('\n❌ Server health checks failed. Test run aborted.\n');
    console.error('Failed checks:');
    healthResult.checks
      .filter(c => !c.passed)
      .forEach(c => {
        console.error(`   - ${c.name}: ${c.error}`);
        if (c.details) {
          console.error(`     Details: ${JSON.stringify(c.details, null, 2)}`);
        }
      });
    console.error('\nTroubleshooting tips:');
    console.error('  1. Ensure the dev server is running: npm run dev:test');
    console.error('  2. Check Supabase project status at: https://supabase.com/dashboard');
    console.error('  3. Verify .env.test has correct VITE_SUPABASE_URL');
    console.error('  4. Check network connectivity and firewall settings\n');

    throw new Error(
      `Server health checks failed: ${healthResult.checks
        .filter(c => !c.passed)
        .map(c => c.name)
        .join(', ')}`
    );
  }

  console.log('✅ All server health checks passed\n');

  // Create authenticated sessions
  await createAuthenticatedSession({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
    authFile: AUTH_FILE,
    baseURL,
    role: 'user',
  });

  // Wait between session creation to avoid overwhelming the server
  console.log('⏳ Waiting 3 seconds before creating admin session...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Create admin session if admin credentials provided
  if (process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD) {
    await createAuthenticatedSession({
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
      authFile: ADMIN_AUTH_FILE,
      baseURL,
      role: 'admin',
    });
  }

  console.log('\n✅ Global setup complete!\n');
}

async function createAuthenticatedSession(options: {
  email: string;
  password: string;
  authFile: string;
  baseURL: string;
  role: string;
}) {
  const { email, password, authFile, baseURL, role } = options;

  console.log(`🔐 Creating authenticated session for ${role}: ${email}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Navigate to login page with longer timeout
    console.log(`   → Navigating to ${baseURL}`);
    await page.goto(baseURL, { timeout: 60000, waitUntil: 'domcontentloaded' });

    console.log(`   → Current URL: ${page.url()}`);

    // Take screenshot immediately to see what loaded
    await page.screenshot({ path: path.join(__dirname, '../playwright/.auth/page-load.png') });
    console.log(`   📸 Page load screenshot: playwright/.auth/page-load.png`);

    // Check what Supabase URL is being used in the browser
    const supabaseUrl = await page.evaluate(() => {
      return (window as any).VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || 'NOT_SET';
    }).catch(() => 'ERROR_CHECKING');
    console.log(`   → Supabase URL in browser: ${supabaseUrl}`);

    // Wait for login form
    console.log(`   → Waiting for email input...`);
    await page.waitForSelector('input[type="email"], input[name="email"]', {
      timeout: 30000,
    });

    // Fill in credentials
    console.log(`   → Filling in credentials...`);
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);

    // Submit login form
    console.log(`   → Submitting form...`);
    await page.click('button[type="submit"]');

    // Wait a moment to see if there are any errors
    await page.waitForTimeout(3000);

    // Check for error messages - look for common error patterns
    const errorSelectors = [
      '[role="alert"]',
      '.error',
      '[data-testid="error-message"]',
      '.text-destructive',
      '.text-red-500',
      '[class*="error"]',
    ];

    let errorMessage = null;
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector);
      if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        errorMessage = await errorElement.textContent().catch(() => null);
        if (errorMessage) break;
      }
    }

    if (errorMessage) {
      console.log(`   ⚠️  Error message found: ${errorMessage}`);
      console.log(`   ⚠️  The test user may not exist in Supabase. Please create the user manually.`);
      console.log(`   ⚠️  User email: ${email}`);
    }

    // Take screenshot for debugging
    await page.screenshot({ path: path.join(__dirname, '../playwright/.auth/login-debug.png') });
    console.log(`   📸 Screenshot saved to playwright/.auth/login-debug.png`);

    // Check if we're already on the dashboard (URL changed) or still on login
    const currentUrl = page.url();
    console.log(`   → Current URL after submit: ${currentUrl}`);

    if (currentUrl.includes('/login') || currentUrl === baseURL || currentUrl === `${baseURL}/`) {
      // Still on login page, try waiting for redirect with more context
      console.log(`   → Waiting for redirect from login page...`);
      try {
        await page.waitForURL(url => !url.pathname.includes('/login') && url.pathname !== '/', {
          timeout: 30000,
        });
      } catch (redirectError) {
        // If redirect fails, check if we're now authenticated (app might stay on same URL)
        const dashboardHeading = page.locator('h1:has-text("Dashboard")');
        const welcomeText = page.getByText(/Welcome back/i);

        if (await dashboardHeading.isVisible({ timeout: 5000 }).catch(() => false) ||
            await welcomeText.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log(`   → Login successful (dashboard content visible)`);
        } else {
          throw redirectError;
        }
      }
    }

    // Verify we're logged in by checking for authenticated indicators
    // The UI shows a user avatar link to profile, dashboard content, or welcome message
    const userIndicator = page.locator('a[href="/settings/profile"]')
      .or(page.locator('a[href="/settings"]'))
      .or(page.getByText(/Welcome back/i))
      .or(page.locator('h1:has-text("Dashboard")'))
      .or(page.locator('button:has-text("Sign Out")'))
      .or(page.locator('[class*="avatar"]'));
    await userIndicator.first().waitFor({ timeout: 10000 });

    // Save authentication state
    await context.storageState({ path: authFile });

    console.log(`   ✅ ${role} session saved to ${path.basename(authFile)}`);
  } catch (error) {
    console.error(`   ❌ Failed to create ${role} session:`, error);
    if (consoleErrors.length > 0) {
      console.error(`   🔍 Console errors during login:`, consoleErrors.join('\n   '));
    }
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
