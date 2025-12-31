#!/usr/bin/env node

/**
 * Create Test Users for E2E Testing
 *
 * This script creates test users in your Supabase instance
 * using the credentials from .env.test
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

async function createTestUsers() {
  console.log('\n🔐 Creating Test Users\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(`${colors.red}✗ Missing Supabase configuration in .env.test${colors.reset}`);
    console.log('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n');
    process.exit(1);
  }

  // Create admin client
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Create test user
    if (testEmail && testPassword) {
      console.log(`${colors.blue}→${colors.reset} Creating test user: ${testEmail}`);

      const { data, error } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`${colors.yellow}⚠ User already exists: ${testEmail}${colors.reset}`);
        } else {
          throw error;
        }
      } else {
        console.log(`${colors.green}✓ Test user created: ${testEmail}${colors.reset}`);
        console.log(`  User ID: ${data.user.id}`);
      }
    }

    // Create admin user
    if (adminEmail && adminPassword) {
      console.log(`\n${colors.blue}→${colors.reset} Creating admin user: ${adminEmail}`);

      const { data, error } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { role: 'admin' },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`${colors.yellow}⚠ User already exists: ${adminEmail}${colors.reset}`);
        } else {
          throw error;
        }
      } else {
        console.log(`${colors.green}✓ Admin user created: ${adminEmail}${colors.reset}`);
        console.log(`  User ID: ${data.user.id}`);
      }
    }

    console.log(`\n${colors.green}✓ Test users ready!${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}✗ Error creating test users:${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

createTestUsers();
