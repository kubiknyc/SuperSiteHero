/**
 * Playwright Global Setup
 *
 * This script runs once before all tests to:
 * 1. Verify test environment is properly configured
 * 2. Create authenticated user sessions
 * 3. Seed necessary test data (optional)
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

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

  // Create authenticated sessions
  await createAuthenticatedSession({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
    authFile: AUTH_FILE,
    baseURL,
    role: 'user',
  });

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

  try {
    // Navigate to login page
    await page.goto(baseURL);

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', {
      timeout: 30000,
    });

    // Fill in credentials
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for successful login (redirect away from login page)
    await page.waitForURL(url => !url.pathname.includes('/login'), {
      timeout: 15000,
    });

    // Verify we're logged in by checking for user menu or other authenticated indicator
    const userIndicator = page.locator(
      '[data-testid="user-menu"], [aria-label="User menu"], button:has-text("Logout"), button:has-text("Sign out")'
    );
    await userIndicator.first().waitFor({ timeout: 10000 });

    // Save authentication state
    await context.storageState({ path: authFile });

    console.log(`   ✅ ${role} session saved to ${path.basename(authFile)}`);
  } catch (error) {
    console.error(`   ❌ Failed to create ${role} session:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
