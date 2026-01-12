#!/usr/bin/env node
/* eslint-disable security/detect-object-injection */

/**
 * Simple Email Notification Test
 *
 * Creates a test user and triggers approval/rejection emails
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const timestamp = Date.now()
const TEST_EMAIL = `test-email-${timestamp}@example.com`
const ADMIN_EMAIL = `admin-email-${timestamp}@example.com`
const TEST_COMPANY = `Email Test Company ${timestamp}`

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(70))
  log(title, 'bright')
  console.log('='.repeat(70))
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  logSection('📧 SIMPLE EMAIL NOTIFICATION TEST')

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    log('\n❌ Missing environment variables', 'red')
    process.exit(1)
  }

  log(`\n📧 Test Email: ${TEST_EMAIL}`, 'blue')
  log(`👤 Admin Email: ${ADMIN_EMAIL}`, 'blue')
  log(`🏢 Company: ${TEST_COMPANY}`, 'blue')

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let adminUserId, testUserId, companyId

  try {
    // Step 1: Create admin user (new company)
    logSection('1. CREATE ADMIN USER')
    log('\n📝 Creating admin user with new company...', 'cyan')

    const { data: adminSignup, error: adminError } = await anonClient.auth.signUp({
      email: ADMIN_EMAIL,
      password: 'TestPassword123!',
      options: {
        data: {
          first_name: 'Admin',
          last_name: 'User',
          company_name: TEST_COMPANY,
          role_title: 'Manager',
        },
      },
    })

    if (adminError) {
      log(`❌ Admin signup failed: ${adminError.message}`, 'red')
      process.exit(1)
    }

    adminUserId = adminSignup.user.id
    log(`✅ Admin user created: ${adminUserId}`, 'green')

    await sleep(2000)

    const { data: adminProfile } = await serviceClient
      .from('users')
      .select('company_id')
      .eq('id', adminUserId)
      .single()

    companyId = adminProfile.company_id
    log(`✅ Company created: ${companyId}`, 'green')

    // Step 2: Create test user (existing company - pending)
    logSection('2. CREATE PENDING USER')
    log('\n📝 Creating pending user...', 'cyan')

    const { data: testSignup, error: testError } = await anonClient.auth.signUp({
      email: TEST_EMAIL,
      password: 'TestPassword123!',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          company_name: TEST_COMPANY,
          role_title: 'Worker',
        },
      },
    })

    if (testError) {
      log(`❌ Test user signup failed: ${testError.message}`, 'red')
      throw testError
    }

    testUserId = testSignup.user.id
    log(`✅ Test user created: ${testUserId}`, 'green')

    await sleep(2000)

    // Verify pending status
    const { data: testProfile } = await serviceClient
      .from('users')
      .select('approval_status, is_active')
      .eq('id', testUserId)
      .single()

    log(`   Status: ${testProfile.approval_status}`, 'blue')
    log(`   Active: ${testProfile.is_active}`, 'blue')

    if (testProfile.approval_status !== 'pending') {
      log('❌ User should be pending', 'red')
      throw new Error('Expected pending status')
    }

    log('✅ User is pending (as expected)', 'green')

    // Step 3: Test Approval Email
    logSection('3. TEST APPROVAL EMAIL')
    log('\n✅ Approving user (will send email)...', 'cyan')

    // Sign in as admin
    const { data: adminSession } = await anonClient.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: 'TestPassword123!',
    })

    const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${adminSession.session.access_token}`,
        },
      },
    })

    const { data: approveData, error: approveError } = await adminClient.functions.invoke(
      'approve-user',
      {
        body: { userId: testUserId },
      }
    )

    if (approveError) {
      log(`❌ Approval failed: ${approveError.message}`, 'red')
      log(`   Details: ${JSON.stringify(approveData, null, 2)}`, 'yellow')
    } else {
      log('✅ Approval successful!', 'green')
      log(`   Response: ${JSON.stringify(approveData, null, 2)}`, 'blue')
      log('\n📧 Approval email should have been sent to:', 'cyan')
      log(`   ${TEST_EMAIL}`, 'bright')
      log('   (Check logs if email provider is configured)', 'yellow')
    }

    await sleep(2000)

    // Reset to pending for rejection test
    await serviceClient
      .from('users')
      .update({
        approval_status: 'pending',
        is_active: false,
        approved_by: null,
        approved_at: null,
      })
      .eq('id', testUserId)

    log('\n🔄 Reset user to pending for rejection test', 'cyan')
    await sleep(1000)

    // Step 4: Test Rejection Email
    logSection('4. TEST REJECTION EMAIL')
    log('\n❌ Rejecting user (will send email)...', 'cyan')

    const { data: rejectData, error: rejectError } = await adminClient.functions.invoke(
      'reject-user',
      {
        body: {
          userId: testUserId,
          reason: 'This is a test rejection email. Please ignore.',
        },
      }
    )

    if (rejectError) {
      log(`❌ Rejection failed: ${rejectError.message}`, 'red')
      log(`   Details: ${JSON.stringify(rejectData, null, 2)}`, 'yellow')
    } else {
      log('✅ Rejection successful!', 'green')
      log(`   Response: ${JSON.stringify(rejectData, null, 2)}`, 'blue')
      log('\n📧 Rejection email should have been sent to:', 'cyan')
      log(`   ${TEST_EMAIL}`, 'bright')
      log('   (Check logs if email provider is configured)', 'yellow')
    }

  } catch (err) {
    log(`\n❌ Error: ${err.message}`, 'red')
    console.error(err)
  } finally {
    // Cleanup
    logSection('CLEANUP')
    log('\n🗑️  Cleaning up test users...', 'cyan')

    if (adminUserId) {
      await serviceClient.auth.admin.deleteUser(adminUserId)
      log(`   Deleted admin: ${adminUserId}`, 'blue')
    }

    if (testUserId) {
      await serviceClient.auth.admin.deleteUser(testUserId)
      log(`   Deleted test user: ${testUserId}`, 'blue')
    }

    log('✅ Cleanup complete', 'green')
  }

  logSection('📋 NEXT STEPS')

  log('\n✅ If you have Resend API configured:', 'green')
  log('   1. Check your email inbox (including spam)', 'blue')
  log('   2. Verify approval email was received', 'blue')
  log('   3. Verify rejection email was received', 'blue')

  log('\n🔍 To check edge function logs:', 'cyan')
  log('   npx supabase functions logs approve-user --limit 5', 'blue')
  log('   npx supabase functions logs reject-user --limit 5', 'blue')
  log('   npx supabase functions logs send-email --limit 5', 'blue')

  log('\n📧 Email will be sent to:', 'cyan')
  log(`   ${TEST_EMAIL}`, 'bright')
  log('   (example.com emails - check your email service logs)', 'yellow')
}

main().catch((err) => {
  log(`\n❌ Fatal error: ${err.message}`, 'red')
  console.error(err)
  process.exit(1)
})
