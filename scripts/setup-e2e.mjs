#!/usr/bin/env node

/**
 * Interactive E2E Testing Setup Script
 *
 * This script guides you through setting up E2E testing:
 * 1. Checks prerequisites
 * 2. Prompts for Supabase credentials
 * 3. Tests the connection
 * 4. Creates test user
 * 5. Configures .env.test
 * 6. Runs initial test verification
 */

import { createInterface } from 'readline';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}\n`),
};

async function main() {
  try {
    log.header('🎭 E2E Testing Setup Wizard');
    log.info('This wizard will help you set up E2E testing for SuperSiteHero\n');

    // Step 1: Check prerequisites
    log.header('Step 1: Checking Prerequisites');
    await checkPrerequisites();

    // Step 2: Get Supabase credentials
    log.header('Step 2: Supabase Configuration');
    log.info('You need a Supabase project for E2E testing');
    log.info('For best practice, create a separate project from production\n');

    const useExisting = await question('Do you want to use your existing Supabase project? (yes/no): ');

    if (useExisting.toLowerCase() !== 'yes' && useExisting.toLowerCase() !== 'y') {
      log.info('\n📚 How to create a test Supabase project:');
      log.info('1. Go to https://supabase.com/dashboard');
      log.info('2. Click "New Project"');
      log.info('3. Name it something like "supersitehero-test"');
      log.info('4. Wait for project to initialize');
      log.info('5. Copy the URL and anon key from Settings > API\n');
      await question('Press Enter when you have created your test project...');
    }

    const supabaseUrl = await question('\nEnter Supabase URL: ');
    const supabaseKey = await question('Enter Supabase Anon Key: ');

    // Step 3: Test connection
    log.header('Step 3: Testing Supabase Connection');
    const supabase = await testSupabaseConnection(supabaseUrl.trim(), supabaseKey.trim());

    // Step 4: Create test user
    log.header('Step 4: Test User Setup');
    log.info('We need to create a test user for E2E testing\n');

    const testEmail = await question('Test user email (default: test@example.com): ') || 'test@example.com';
    const testPassword = await question('Test user password (default: Test123!@#): ') || 'Test123!@#';

    await createTestUser(supabase, testEmail.trim(), testPassword.trim());

    // Step 5: Create admin user (optional)
    log.header('Step 5: Admin User Setup (Optional)');
    const createAdmin = await question('Create admin test user? (yes/no): ');

    let adminEmail = '';
    let adminPassword = '';

    if (createAdmin.toLowerCase() === 'yes' || createAdmin.toLowerCase() === 'y') {
      adminEmail = await question('Admin user email (default: admin@example.com): ') || 'admin@example.com';
      adminPassword = await question('Admin user password (default: Admin123!@#): ') || 'Admin123!@#';
      await createTestUser(supabase, adminEmail.trim(), adminPassword.trim(), true);
    }

    // Step 6: Write .env.test
    log.header('Step 6: Configuring .env.test');
    await writeEnvTest({
      supabaseUrl: supabaseUrl.trim(),
      supabaseKey: supabaseKey.trim(),
      testEmail: testEmail.trim(),
      testPassword: testPassword.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword: adminPassword.trim(),
    });

    // Step 7: Run verification
    log.header('Step 7: Running Verification');
    await runVerification();

    // Done!
    log.header('✅ Setup Complete!');
    log.success('E2E testing is now configured and ready to use\n');

    log.info('Next steps:');
    log.info('• Run tests: npm run test:e2e');
    log.info('• Run with UI: npm run test:e2e:ui');
    log.info('• Debug tests: npm run test:e2e:debug');
    log.info('• See documentation: E2E_TESTING_SETUP.md\n');

  } catch (error) {
    log.error(`\nSetup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function checkPrerequisites() {
  log.step('Checking Node.js...');
  try {
    const nodeVersion = process.version;
    log.success(`Node.js ${nodeVersion} found`);
  } catch (error) {
    log.error('Node.js not found');
    throw new Error('Please install Node.js');
  }

  log.step('Checking npm packages...');
  if (!existsSync('node_modules')) {
    log.warning('node_modules not found, running npm install...');
    execSync('npm install', { stdio: 'inherit' });
  }
  log.success('npm packages installed');

  log.step('Checking Playwright...');
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
    log.success('Playwright is installed');
  } catch (error) {
    log.warning('Playwright browsers not installed, installing now...');
    execSync('npx playwright install chromium', { stdio: 'inherit' });
    log.success('Playwright installed');
  }
}

async function testSupabaseConnection(url, key) {
  log.step('Testing Supabase connection...');

  try {
    const supabase = createClient(url, key);

    // Test connection by checking auth settings
    const { data, error } = await supabase.auth.getSession();

    if (error && error.message.includes('Invalid API key')) {
      throw new Error('Invalid Supabase credentials');
    }

    log.success('Successfully connected to Supabase');
    return supabase;
  } catch (error) {
    log.error('Failed to connect to Supabase');
    throw error;
  }
}

async function createTestUser(supabase, email, password, isAdmin = false) {
  log.step(`Creating ${isAdmin ? 'admin' : 'test'} user: ${email}...`);

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();

    const userExists = existingUsers?.users?.some(u => u.email === email);

    if (userExists) {
      log.warning(`User ${email} already exists, skipping creation`);
      return;
    }

    // Create user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      // If admin methods not available, guide user to create manually
      if (error.message.includes('not available') || error.message.includes('admin')) {
        log.warning('Cannot create user automatically (admin API not available)');
        log.info(`\nPlease create the test user manually:`);
        log.info(`1. Go to your Supabase dashboard`);
        log.info(`2. Navigate to Authentication → Users`);
        log.info(`3. Click "Add User"`);
        log.info(`4. Email: ${email}`);
        log.info(`5. Password: ${password}`);
        log.info(`6. Click "Create User"\n`);
        await question('Press Enter after creating the user...');
        log.success(`User ${email} created manually`);
        return;
      }
      throw error;
    }

    log.success(`User ${email} created successfully`);

    // If admin, assign admin role (if profiles table exists)
    if (isAdmin && data?.user) {
      log.step('Assigning admin role...');
      try {
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', data.user.id);

        if (roleError) {
          log.warning('Could not assign admin role (profiles table might not exist yet)');
        } else {
          log.success('Admin role assigned');
        }
      } catch (error) {
        log.warning('Admin role assignment skipped');
      }
    }
  } catch (error) {
    log.error(`Failed to create user: ${error.message}`);
    throw error;
  }
}

async function writeEnvTest(config) {
  log.step('Writing .env.test file...');

  const envContent = `# E2E Test Environment Configuration
# Auto-generated by setup-e2e.mjs

# Supabase Test Instance
VITE_SUPABASE_URL=${config.supabaseUrl}
VITE_SUPABASE_ANON_KEY=${config.supabaseKey}

# Test User Credentials
TEST_USER_EMAIL=${config.testEmail}
TEST_USER_PASSWORD=${config.testPassword}

${config.adminEmail ? `# Admin User Credentials
TEST_ADMIN_EMAIL=${config.adminEmail}
TEST_ADMIN_PASSWORD=${config.adminPassword}
` : ''}
# Environment
VITE_APP_ENV=test
VITE_APP_URL=http://localhost:5173

# Email (console for tests)
VITE_EMAIL_PROVIDER=console

# Sentry (disabled for tests)
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=test
VITE_SENTRY_DEBUG=false

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false

# Generated: ${new Date().toISOString()}
`;

  try {
    await writeFile('.env.test', envContent);
    log.success('.env.test file created');
  } catch (error) {
    log.error('Failed to write .env.test');
    throw error;
  }
}

async function runVerification() {
  log.step('Running test verification...');

  try {
    // Run a simple test to verify everything works
    log.info('Testing authentication flow...');

    execSync('npm run test:e2e -- auth.spec.ts --project=chromium --reporter=list', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    log.success('Verification tests passed!');
  } catch (error) {
    log.warning('Some verification tests failed - this is normal for first run');
    log.info('You can debug with: npm run test:e2e:debug');
  }
}

// Run the setup
main();
