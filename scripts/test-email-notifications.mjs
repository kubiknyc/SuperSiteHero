#!/usr/bin/env node


/**
 * Email Notification Testing Script
 *
 * Tests the user approval system email notifications
 * Requirements: Admin user credentials
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Test user ID (already set to pending)
const TEST_USER_ID = '793d4755-559b-4e2e-b215-dd739b8fd20a'

// Colors for terminal output
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
  console.log('\n' + '='.repeat(60))
  log(title, 'bright')
  console.log('='.repeat(60))
}

async function ensureAdmin(supabase, userId) {
  log('\n🔧 Checking admin permissions...', 'cyan')

  const { data: user } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', userId)
    .single()

  if (user && !['admin', 'owner'].includes(user.role)) {
    log(
      `⚠️  User ${user.email} is not an admin. Temporarily promoting...`,
      'yellow'
    )

    await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId)

    log('✅ User promoted to admin for testing', 'green')
    return { promoted: true, originalRole: user.role }
  }

  log('✅ User already has admin permissions', 'green')
  return { promoted: false }
}

async function resetTestUser(supabase) {
  log('\n🔄 Resetting test user to pending status...', 'cyan')

  const { error } = await supabase
    .from('users')
    .update({
      approval_status: 'pending',
      is_active: false,
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
    })
    .eq('id', TEST_USER_ID)

  if (error) {
    log(`❌ Failed to reset test user: ${error.message}`, 'red')
    throw error
  }

  log('✅ Test user reset to pending', 'green')
}

async function testApprovalEmail(supabase) {
  logSection('TEST 1: Approval Email Notification')

  try {
    // Reset user to pending status first
    log('\n🔄 Resetting test user to pending status...', 'cyan')
    await resetTestUser(supabase)

    log('📧 Sending approval request...', 'cyan')

    const { data, error } = await supabase.functions.invoke('approve-user', {
      body: { userId: TEST_USER_ID },
    })

    if (error) {
      log(`❌ Approval failed: ${error.message}`, 'red')
      log(`   Error details: ${JSON.stringify(error, null, 2)}`, 'yellow')
      if (data) {
        log(`   Response data: ${JSON.stringify(data, null, 2)}`, 'yellow')
      }
      return false
    }

    log('✅ Approval request successful!', 'green')
    log(`   Response: ${JSON.stringify(data, null, 2)}`, 'blue')

    // Verify database update
    const { data: user } = await supabase
      .from('users')
      .select('approval_status, is_active, approved_by, approved_at')
      .eq('id', TEST_USER_ID)
      .single()

    if (user.approval_status === 'approved' && user.is_active) {
      log('\n✅ Database updated correctly:', 'green')
      log(`   Status: ${user.approval_status}`, 'blue')
      log(`   Active: ${user.is_active}`, 'blue')
      log(`   Approved by: ${user.approved_by}`, 'blue')
      log(`   Approved at: ${user.approved_at}`, 'blue')
      return true
    } else {
      log('❌ Database update failed', 'red')
      return false
    }
  } catch (err) {
    log(`❌ Test failed with error: ${err.message}`, 'red')
    console.error(err)
    return false
  }
}

async function testRejectionEmail(supabase) {
  logSection('TEST 2: Rejection Email Notification (with reason)')

  try {
    // Reset user to pending first
    await resetTestUser(supabase)

    log('\n📧 Sending rejection request with reason...', 'cyan')

    const rejectionReason =
      'This is a test rejection. In a real scenario, please contact HR at hr@company.com to verify your employment status and request access again.'

    const { data, error } = await supabase.functions.invoke('reject-user', {
      body: {
        userId: TEST_USER_ID,
        reason: rejectionReason,
      },
    })

    if (error) {
      log(`❌ Rejection failed: ${error.message}`, 'red')
      log(`   Error details: ${JSON.stringify(error, null, 2)}`, 'yellow')
      if (data) {
        log(`   Response data: ${JSON.stringify(data, null, 2)}`, 'yellow')
      }
      return false
    }

    log('✅ Rejection request successful!', 'green')
    log(`   Response: ${JSON.stringify(data, null, 2)}`, 'blue')

    // Verify database update
    const { data: user } = await supabase
      .from('users')
      .select(
        'approval_status, is_active, rejected_by, rejected_at, rejection_reason'
      )
      .eq('id', TEST_USER_ID)
      .single()

    log(`\n📊 Database state after rejection:`, 'cyan')
    log(`   ${JSON.stringify(user, null, 2)}`, 'blue')

    if (user.approval_status === 'rejected' && !user.is_active) {
      log('\n✅ Database updated correctly:', 'green')
      log(`   Status: ${user.approval_status}`, 'blue')
      log(`   Active: ${user.is_active}`, 'blue')
      log(`   Rejected by: ${user.rejected_by}`, 'blue')
      log(`   Rejected at: ${user.rejected_at}`, 'blue')
      log(`   Reason: ${user.rejection_reason}`, 'blue')
      return true
    } else {
      log('❌ Database update failed', 'red')
      log(`   Expected: approval_status='rejected' and is_active=false`, 'yellow')
      log(`   Got: approval_status='${user.approval_status}' and is_active=${user.is_active}`, 'yellow')
      return false
    }
  } catch (err) {
    log(`❌ Test failed with error: ${err.message}`, 'red')
    console.error(err)
    return false
  }
}

async function cleanup(supabase, adminInfo) {
  logSection('CLEANUP')

  log('\n🧹 Cleaning up test data...', 'cyan')

  // Restore test user to approved status
  await supabase
    .from('users')
    .update({
      approval_status: 'approved',
      is_active: true,
    })
    .eq('id', TEST_USER_ID)

  // Restore original role if we promoted the user
  if (adminInfo.promoted) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase
        .from('users')
        .update({ role: adminInfo.originalRole })
        .eq('id', user.id)

      log(
        `✅ Restored user role to ${adminInfo.originalRole}`,
        'green'
      )
    }
  }

  log('✅ Cleanup complete', 'green')
}

async function main() {
  logSection('📧 EMAIL NOTIFICATION TESTING SCRIPT')

  // Check environment variables
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    log('\n❌ Missing Supabase credentials!', 'red')
    log('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY', 'yellow')
    process.exit(1)
  }

  log(`\n🔗 Supabase URL: ${SUPABASE_URL}`, 'blue')
  log(
    `📧 Test Email: browser-test-1766128036597@example.com`,
    'blue'
  )

  // Create Supabase client with service role key if available
  let supabase
  let userId

  if (SUPABASE_SERVICE_ROLE_KEY) {
    log('\n✅ Using service role key for admin access', 'green')

    // Create service role client to find admin user
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Find an admin user
    const { data: adminUser } = await serviceClient
      .from('users')
      .select('id, email, role')
      .in('role', ['admin', 'owner'])
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!adminUser) {
      log('❌ No active admin user found in database', 'red')
      process.exit(1)
    }

    log(`   Found admin: ${adminUser.email} (${adminUser.role})`, 'cyan')

    // Set a temporary password for the admin user
    const tempPassword = 'TempTestPassword123!'
    const { data: _updateData, error: updateError } = await serviceClient.auth.admin.updateUserById(
      adminUser.id,
      { password: tempPassword }
    )

    if (updateError) {
      log('❌ Failed to set temporary password', 'red')
      log(`   Error: ${JSON.stringify(updateError, null, 2)}`, 'yellow')
      process.exit(1)
    }

    log(`   Set temporary password for admin user`, 'cyan')

    // Now sign in with the password to get a proper session
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: adminUser.email,
      password: tempPassword,
    })

    if (signInError || !signInData.session) {
      log('❌ Failed to sign in with temporary password', 'red')
      log(`   Error: ${JSON.stringify(signInError, null, 2)}`, 'yellow')
      process.exit(1)
    }

    // Use the session token
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${signInData.session.access_token}`
        }
      }
    })

    userId = adminUser.id
    log(`   Successfully authenticated as admin`, 'cyan')
  } else {
    // Prompt for login
    log(
      '\n⚠️  You need to be logged in as an admin user to run this test.',
      'yellow'
    )
    log('   Please login through the app first, then run this script.', 'yellow')
    log(
      '\n   Alternatively, set SUPABASE_SERVICE_ROLE_KEY environment variable.\n',
      'yellow'
    )

    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      log('❌ Not authenticated. Please login first.', 'red')
      log(
        '\n   Run this script with: SUPABASE_SERVICE_ROLE_KEY=your_key npm run test:emails\n',
        'yellow'
      )
      process.exit(1)
    }

    userId = user.id
    log(`\n✅ Authenticated as: ${user.email}`, 'green')
  }

  // Ensure user has admin permissions (only needed when not using service role)
  let adminInfo = { promoted: false }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    adminInfo = await ensureAdmin(supabase, userId)
  }

  // Run tests
  const results = {
    approval: false,
    rejection: false,
  }

  try {
    results.approval = await testApprovalEmail(supabase)
    results.rejection = await testRejectionEmail(supabase)
  } catch (err) {
    log(`\n❌ Testing failed: ${err.message}`, 'red')
    console.error(err)
  } finally {
    await cleanup(supabase, adminInfo)
  }

  // Summary
  logSection('📊 TEST SUMMARY')

  log(`\nApproval Email Test: ${results.approval ? '✅ PASSED' : '❌ FAILED'}`, results.approval ? 'green' : 'red')
  log(`Rejection Email Test: ${results.rejection ? '✅ PASSED' : '❌ FAILED'}`, results.rejection ? 'green' : 'red')

  log('\n📬 Email Delivery Notes:', 'cyan')
  log(
    '   - Emails are sent to: browser-test-1766128036597@example.com',
    'blue'
  )
  log('   - Check your email service provider for delivery', 'blue')
  log('   - Check spam/junk folder if not received', 'blue')
  log('   - Review Edge Function logs for any errors', 'blue')

  log('\n🔍 To view logs:', 'cyan')
  log('   npx supabase functions logs approve-user --limit 10', 'blue')
  log('   npx supabase functions logs reject-user --limit 10', 'blue')
  log('   npx supabase functions logs send-email --limit 10', 'blue')

  const allPassed = results.approval && results.rejection
  process.exit(allPassed ? 0 : 1)
}

main().catch((err) => {
  log(`\n❌ Fatal error: ${err.message}`, 'red')
  console.error(err)
  process.exit(1)
})
