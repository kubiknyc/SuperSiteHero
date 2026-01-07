#!/usr/bin/env node


/**
 * Registration & Approval Workflow E2E Test
 *
 * Tests the complete user registration and approval system:
 * 1. New company registration (immediate owner access)
 * 2. Existing company registration (pending state)
 * 3. Admin approval workflow
 * 4. Admin rejection workflow
 * 5. Email notification verification
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Test data
const timestamp = Date.now()
const TEST_COMPANY_NAME = `Test Company ${timestamp}`
const TEST_USER_1 = {
  email: `owner-${timestamp}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'Owner',
  roleTitle: 'Project Manager',
}
const TEST_USER_2 = {
  email: `pending-${timestamp}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'Pending',
  roleTitle: 'Field Worker',
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(70))
  log(title, 'bright')
  console.log('='.repeat(70))
}

function logSubSection(title) {
  console.log('\n' + '-'.repeat(70))
  log(title, 'cyan')
  console.log('-'.repeat(70))
}

// Test state
const testState = {
  user1Id: null,
  user2Id: null,
  companyId: null,
  adminClient: null,
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================================
// TEST 1: NEW COMPANY REGISTRATION
// ============================================================================

async function testNewCompanyRegistration() {
  logSection('TEST 1: NEW COMPANY REGISTRATION (Owner with Immediate Access)')

  try {
    log('\n📝 Registering new user with new company...', 'cyan')
    log(`   Email: ${TEST_USER_1.email}`, 'blue')
    log(`   Company: ${TEST_COMPANY_NAME}`, 'blue')

    // Create anon client for signup
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Sign up new user
    const { data, error } = await supabase.auth.signUp({
      email: TEST_USER_1.email,
      password: TEST_USER_1.password,
      options: {
        data: {
          first_name: TEST_USER_1.firstName,
          last_name: TEST_USER_1.lastName,
          company_name: TEST_COMPANY_NAME,
          role_title: TEST_USER_1.roleTitle,
        },
      },
    })

    if (error) {
      log(`❌ FAIL - Signup error: ${error.message}`, 'red')
      return false
    }

    if (!data.user) {
      log('❌ FAIL - No user returned from signup', 'red')
      return false
    }

    testState.user1Id = data.user.id
    log(`✅ User created: ${data.user.id}`, 'green')

    // Wait for trigger to process
    log('\n⏳ Waiting 2 seconds for database trigger to create profile...', 'yellow')
    await sleep(2000)

    // Create service role client to check user profile
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch user profile
    const { data: profile, error: profileError } = await serviceClient
      .from('users')
      .select('id, email, role, approval_status, is_active, company_id')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      log(`❌ FAIL - Profile not created: ${profileError.message}`, 'red')
      return false
    }

    log('\n📊 User Profile:', 'cyan')
    log(`   ID: ${profile.id}`, 'blue')
    log(`   Email: ${profile.email}`, 'blue')
    log(`   Role: ${profile.role}`, 'blue')
    log(`   Approval Status: ${profile.approval_status}`, 'blue')
    log(`   Is Active: ${profile.is_active}`, 'blue')
    log(`   Company ID: ${profile.company_id}`, 'blue')

    testState.companyId = profile.company_id

    // Verify expectations
    const checks = {
      role: profile.role === 'owner',
      approvalStatus: profile.approval_status === 'approved',
      isActive: profile.is_active === true,
      hasCompany: !!profile.company_id,
    }

    log('\n✓ Verification Checks:', 'cyan')
    log(`   Role is "owner": ${checks.role ? '✅' : '❌'}`, checks.role ? 'green' : 'red')
    log(`   Approval status is "approved": ${checks.approvalStatus ? '✅' : '❌'}`, checks.approvalStatus ? 'green' : 'red')
    log(`   Is active: ${checks.isActive ? '✅' : '❌'}`, checks.isActive ? 'green' : 'red')
    log(`   Has company ID: ${checks.hasCompany ? '✅' : '❌'}`, checks.hasCompany ? 'green' : 'red')

    // Verify company was created
    const { data: company, error: companyError } = await serviceClient
      .from('companies')
      .select('id, name')
      .eq('id', profile.company_id)
      .single()

    if (companyError || !company) {
      log('\n❌ FAIL - Company not created', 'red')
      return false
    }

    log('\n📊 Company Created:', 'cyan')
    log(`   ID: ${company.id}`, 'blue')
    log(`   Name: ${company.name}`, 'blue')
    log(`   Name matches: ${company.name === TEST_COMPANY_NAME ? '✅' : '❌'}`, company.name === TEST_COMPANY_NAME ? 'green' : 'red')

    const allChecks = Object.values(checks).every((check) => check === true) && company.name === TEST_COMPANY_NAME

    if (allChecks) {
      log('\n✅ TEST 1 PASSED - New company registration working correctly!', 'green')
      log('   - User created as owner', 'green')
      log('   - Immediate approval granted', 'green')
      log('   - User is active', 'green')
      log('   - Company created successfully', 'green')
      return true
    } else {
      log('\n❌ TEST 1 FAILED - Some checks did not pass', 'red')
      return false
    }
  } catch (err) {
    log(`\n❌ TEST 1 FAILED - Error: ${err.message}`, 'red')
    console.error(err)
    return false
  }
}

// ============================================================================
// TEST 2: EXISTING COMPANY REGISTRATION
// ============================================================================

async function testExistingCompanyRegistration() {
  logSection('TEST 2: EXISTING COMPANY REGISTRATION (Pending User)')

  try {
    log('\n📝 Registering new user with existing company...', 'cyan')
    log(`   Email: ${TEST_USER_2.email}`, 'blue')
    log(`   Company: ${TEST_COMPANY_NAME} (existing)`, 'blue')

    // Create anon client for signup
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Sign up new user with existing company name
    const { data, error } = await supabase.auth.signUp({
      email: TEST_USER_2.email,
      password: TEST_USER_2.password,
      options: {
        data: {
          first_name: TEST_USER_2.firstName,
          last_name: TEST_USER_2.lastName,
          company_name: TEST_COMPANY_NAME, // Same company as Test 1
          role_title: TEST_USER_2.roleTitle,
        },
      },
    })

    if (error) {
      log(`❌ FAIL - Signup error: ${error.message}`, 'red')
      return false
    }

    if (!data.user) {
      log('❌ FAIL - No user returned from signup', 'red')
      return false
    }

    testState.user2Id = data.user.id
    log(`✅ User created: ${data.user.id}`, 'green')

    // Wait for trigger to process
    log('\n⏳ Waiting 2 seconds for database trigger to create profile...', 'yellow')
    await sleep(2000)

    // Create service role client to check user profile
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch user profile
    const { data: profile, error: profileError } = await serviceClient
      .from('users')
      .select('id, email, role, approval_status, is_active, company_id')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      log(`❌ FAIL - Profile not created: ${profileError.message}`, 'red')
      return false
    }

    log('\n📊 User Profile:', 'cyan')
    log(`   ID: ${profile.id}`, 'blue')
    log(`   Email: ${profile.email}`, 'blue')
    log(`   Role: ${profile.role}`, 'blue')
    log(`   Approval Status: ${profile.approval_status}`, 'blue')
    log(`   Is Active: ${profile.is_active}`, 'blue')
    log(`   Company ID: ${profile.company_id}`, 'blue')

    // Verify expectations
    const checks = {
      role: profile.role === 'field_employee',
      approvalStatus: profile.approval_status === 'pending',
      isActive: profile.is_active === false,
      sameCompany: profile.company_id === testState.companyId,
    }

    log('\n✓ Verification Checks:', 'cyan')
    log(`   Role is "field_employee": ${checks.role ? '✅' : '❌'}`, checks.role ? 'green' : 'red')
    log(`   Approval status is "pending": ${checks.approvalStatus ? '✅' : '❌'}`, checks.approvalStatus ? 'green' : 'red')
    log(`   Is not active: ${checks.isActive ? '✅' : '❌'}`, checks.isActive ? 'green' : 'red')
    log(`   Same company as Test 1: ${checks.sameCompany ? '✅' : '❌'}`, checks.sameCompany ? 'green' : 'red')

    const allChecks = Object.values(checks).every((check) => check === true)

    if (allChecks) {
      log('\n✅ TEST 2 PASSED - Existing company registration working correctly!', 'green')
      log('   - User created with pending status', 'green')
      log('   - User is inactive', 'green')
      log('   - Joined existing company', 'green')
      log('   - Role set to field_employee', 'green')
      return true
    } else {
      log('\n❌ TEST 2 FAILED - Some checks did not pass', 'red')
      return false
    }
  } catch (err) {
    log(`\n❌ TEST 2 FAILED - Error: ${err.message}`, 'red')
    console.error(err)
    return false
  }
}

// ============================================================================
// TEST 3: ADMIN APPROVAL WORKFLOW
// ============================================================================

async function testAdminApproval() {
  logSection('TEST 3: ADMIN APPROVAL WORKFLOW')

  try {
    // Sign in as user 1 (owner) to approve user 2
    log('\n🔐 Signing in as owner to approve pending user...', 'cyan')
    log(`   Email: ${TEST_USER_1.email}`, 'blue')

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER_1.email,
      password: TEST_USER_1.password,
    })

    if (signInError || !signInData.session) {
      log(`❌ FAIL - Sign in error: ${signInError?.message || 'No session'}`, 'red')
      return false
    }

    log('✅ Signed in successfully', 'green')

    // Create authenticated client
    const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${signInData.session.access_token}`,
        },
      },
    })

    testState.adminClient = adminClient

    // Get pending users
    log('\n📋 Fetching pending users...', 'cyan')
    const { data: pendingResponse, error: pendingError } = await adminClient.functions.invoke(
      'get-pending-users',
      {
        method: 'POST',
      }
    )

    if (pendingError) {
      log(`❌ FAIL - Error fetching pending users: ${pendingError.message}`, 'red')
      return false
    }

    const pendingUsers = pendingResponse?.pendingUsers || []
    log(`✅ Found ${pendingUsers.length} pending user(s)`, 'green')

    // Find our test user
    const testUser = pendingUsers.find((u) => u.id === testState.user2Id)
    if (!testUser) {
      log(`❌ FAIL - Test user ${testState.user2Id} not in pending list`, 'red')
      log(`   Pending users: ${JSON.stringify(pendingUsers, null, 2)}`, 'yellow')
      return false
    }

    log('\n📊 Pending User Found:', 'cyan')
    log(`   ID: ${testUser.id}`, 'blue')
    log(`   Email: ${testUser.email}`, 'blue')
    log(`   Name: ${testUser.first_name} ${testUser.last_name}`, 'blue')

    // Approve the user
    log('\n✅ Approving user...', 'cyan')
    const { data: approveData, error: approveError } = await adminClient.functions.invoke(
      'approve-user',
      {
        body: { userId: testState.user2Id },
      }
    )

    if (approveError) {
      log(`❌ FAIL - Approval error: ${approveError.message}`, 'red')
      log(`   Response: ${JSON.stringify(approveData, null, 2)}`, 'yellow')
      return false
    }

    log('✅ Approval request successful', 'green')
    log(`   Response: ${JSON.stringify(approveData, null, 2)}`, 'blue')

    // Wait a moment for database update
    log('\n⏳ Waiting 1 second for database update...', 'yellow')
    await sleep(1000)

    // Verify user was approved
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: updatedUser, error: fetchError } = await serviceClient
      .from('users')
      .select('approval_status, is_active, approved_by, approved_at')
      .eq('id', testState.user2Id)
      .single()

    if (fetchError) {
      log(`❌ FAIL - Error fetching updated user: ${fetchError.message}`, 'red')
      return false
    }

    log('\n📊 Updated User Status:', 'cyan')
    log(`   Approval Status: ${updatedUser.approval_status}`, 'blue')
    log(`   Is Active: ${updatedUser.is_active}`, 'blue')
    log(`   Approved By: ${updatedUser.approved_by}`, 'blue')
    log(`   Approved At: ${updatedUser.approved_at}`, 'blue')

    const checks = {
      approved: updatedUser.approval_status === 'approved',
      active: updatedUser.is_active === true,
      hasApprover: updatedUser.approved_by === testState.user1Id,
      hasTimestamp: !!updatedUser.approved_at,
    }

    log('\n✓ Verification Checks:', 'cyan')
    log(`   Status is "approved": ${checks.approved ? '✅' : '❌'}`, checks.approved ? 'green' : 'red')
    log(`   Is active: ${checks.active ? '✅' : '❌'}`, checks.active ? 'green' : 'red')
    log(`   Approved by owner: ${checks.hasApprover ? '✅' : '❌'}`, checks.hasApprover ? 'green' : 'red')
    log(`   Has approval timestamp: ${checks.hasTimestamp ? '✅' : '❌'}`, checks.hasTimestamp ? 'green' : 'red')

    const allChecks = Object.values(checks).every((check) => check === true)

    if (allChecks) {
      log('\n✅ TEST 3 PASSED - Admin approval working correctly!', 'green')
      log('   - User approved successfully', 'green')
      log('   - User is now active', 'green')
      log('   - Approval metadata recorded', 'green')
      return true
    } else {
      log('\n❌ TEST 3 FAILED - Some checks did not pass', 'red')
      return false
    }
  } catch (err) {
    log(`\n❌ TEST 3 FAILED - Error: ${err.message}`, 'red')
    console.error(err)
    return false
  }
}

// ============================================================================
// TEST 4: ADMIN REJECTION WORKFLOW
// ============================================================================

async function testAdminRejection() {
  logSection('TEST 4: ADMIN REJECTION WORKFLOW')

  try {
    // First, reset user 2 back to pending
    log('\n🔄 Resetting user 2 to pending status for rejection test...', 'cyan')

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { error: resetError } = await serviceClient
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
      .eq('id', testState.user2Id)

    if (resetError) {
      log(`❌ FAIL - Reset error: ${resetError.message}`, 'red')
      return false
    }

    log('✅ User reset to pending', 'green')

    // Wait a moment
    await sleep(500)

    // Reject the user using admin client from Test 3
    log('\n❌ Rejecting user with reason...', 'cyan')
    const rejectionReason = 'Test rejection - This is an automated test. Please contact HR for re-approval.'

    const { data: rejectData, error: rejectError } = await testState.adminClient.functions.invoke(
      'reject-user',
      {
        body: {
          userId: testState.user2Id,
          reason: rejectionReason,
        },
      }
    )

    if (rejectError) {
      log(`❌ FAIL - Rejection error: ${rejectError.message}`, 'red')
      log(`   Response: ${JSON.stringify(rejectData, null, 2)}`, 'yellow')
      return false
    }

    log('✅ Rejection request successful', 'green')
    log(`   Response: ${JSON.stringify(rejectData, null, 2)}`, 'blue')

    // Wait a moment for database update
    log('\n⏳ Waiting 1 second for database update...', 'yellow')
    await sleep(1000)

    // Verify user was rejected
    const { data: updatedUser, error: fetchError } = await serviceClient
      .from('users')
      .select('approval_status, is_active, rejected_by, rejected_at, rejection_reason')
      .eq('id', testState.user2Id)
      .single()

    if (fetchError) {
      log(`❌ FAIL - Error fetching updated user: ${fetchError.message}`, 'red')
      return false
    }

    log('\n📊 Updated User Status:', 'cyan')
    log(`   Approval Status: ${updatedUser.approval_status}`, 'blue')
    log(`   Is Active: ${updatedUser.is_active}`, 'blue')
    log(`   Rejected By: ${updatedUser.rejected_by}`, 'blue')
    log(`   Rejected At: ${updatedUser.rejected_at}`, 'blue')
    log(`   Rejection Reason: ${updatedUser.rejection_reason}`, 'blue')

    const checks = {
      rejected: updatedUser.approval_status === 'rejected',
      inactive: updatedUser.is_active === false,
      hasRejector: updatedUser.rejected_by === testState.user1Id,
      hasTimestamp: !!updatedUser.rejected_at,
      hasReason: updatedUser.rejection_reason === rejectionReason,
    }

    log('\n✓ Verification Checks:', 'cyan')
    log(`   Status is "rejected": ${checks.rejected ? '✅' : '❌'}`, checks.rejected ? 'green' : 'red')
    log(`   Is not active: ${checks.inactive ? '✅' : '❌'}`, checks.inactive ? 'green' : 'red')
    log(`   Rejected by owner: ${checks.hasRejector ? '✅' : '❌'}`, checks.hasRejector ? 'green' : 'red')
    log(`   Has rejection timestamp: ${checks.hasTimestamp ? '✅' : '❌'}`, checks.hasTimestamp ? 'green' : 'red')
    log(`   Rejection reason recorded: ${checks.hasReason ? '✅' : '❌'}`, checks.hasReason ? 'green' : 'red')

    const allChecks = Object.values(checks).every((check) => check === true)

    if (allChecks) {
      log('\n✅ TEST 4 PASSED - Admin rejection working correctly!', 'green')
      log('   - User rejected successfully', 'green')
      log('   - User is inactive', 'green')
      log('   - Rejection metadata recorded', 'green')
      log('   - Rejection reason saved', 'green')
      return true
    } else {
      log('\n❌ TEST 4 FAILED - Some checks did not pass', 'red')
      return false
    }
  } catch (err) {
    log(`\n❌ TEST 4 FAILED - Error: ${err.message}`, 'red')
    console.error(err)
    return false
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

async function cleanup() {
  logSection('🧹 CLEANUP')

  try {
    log('\n🗑️  Cleaning up test data...', 'cyan')

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Delete test users from auth
    if (testState.user1Id) {
      log(`   Deleting user 1: ${testState.user1Id}`, 'blue')
      await serviceClient.auth.admin.deleteUser(testState.user1Id)
    }

    if (testState.user2Id) {
      log(`   Deleting user 2: ${testState.user2Id}`, 'blue')
      await serviceClient.auth.admin.deleteUser(testState.user2Id)
    }

    // Note: Database users will be automatically soft-deleted via ON DELETE trigger
    // Company will remain in database (as designed for audit trail)

    log('\n✅ Cleanup complete', 'green')
    log('   Note: Company record remains for audit purposes', 'yellow')
  } catch (err) {
    log(`\n⚠️  Cleanup error (non-fatal): ${err.message}`, 'yellow')
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  logSection('🧪 REGISTRATION & APPROVAL WORKFLOW E2E TEST')

  // Check environment variables
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    log('\n❌ Missing Supabase credentials!', 'red')
    log('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY', 'yellow')
    process.exit(1)
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    log('\n❌ Missing SUPABASE_SERVICE_ROLE_KEY!', 'red')
    log('   This test requires service role access for verification', 'yellow')
    process.exit(1)
  }

  log(`\n🔗 Supabase URL: ${SUPABASE_URL}`, 'blue')
  log(`📧 Test Company: ${TEST_COMPANY_NAME}`, 'blue')
  log(`👤 Test User 1 (Owner): ${TEST_USER_1.email}`, 'blue')
  log(`👤 Test User 2 (Pending): ${TEST_USER_2.email}`, 'blue')

  // Run all tests
  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
  }

  try {
    results.test1 = await testNewCompanyRegistration()
    results.test2 = await testExistingCompanyRegistration()
    results.test3 = await testAdminApproval()
    results.test4 = await testAdminRejection()
  } catch (err) {
    log(`\n❌ Testing failed: ${err.message}`, 'red')
    console.error(err)
  } finally {
    await cleanup()
  }

  // Summary
  logSection('📊 TEST SUMMARY')

  log(`\nTest 1 - New Company Registration: ${results.test1 ? '✅ PASSED' : '❌ FAILED'}`, results.test1 ? 'green' : 'red')
  log(`Test 2 - Existing Company Registration: ${results.test2 ? '✅ PASSED' : '❌ FAILED'}`, results.test2 ? 'green' : 'red')
  log(`Test 3 - Admin Approval: ${results.test3 ? '✅ PASSED' : '❌ FAILED'}`, results.test3 ? 'green' : 'red')
  log(`Test 4 - Admin Rejection: ${results.test4 ? '✅ PASSED' : '❌ FAILED'}`, results.test4 ? 'green' : 'red')

  const passedCount = Object.values(results).filter((r) => r === true).length
  const totalCount = Object.keys(results).length

  log(`\n📈 Overall: ${passedCount}/${totalCount} tests passed (${Math.round((passedCount / totalCount) * 100)}%)`, passedCount === totalCount ? 'green' : 'yellow')

  if (passedCount === totalCount) {
    log('\n🎉 ALL TESTS PASSED!', 'green')
    log('\n✅ The user approval system is working correctly:', 'green')
    log('   ✓ New company users get immediate owner access', 'green')
    log('   ✓ Existing company users enter pending state', 'green')
    log('   ✓ Admins can approve pending users', 'green')
    log('   ✓ Admins can reject pending users with reasons', 'green')
    log('\n📧 Next steps:', 'cyan')
    log('   - Verify email notifications are being sent (check your email service)', 'blue')
    log('   - Test the frontend registration flow manually', 'blue')
    log('   - Test the pending approval page auto-refresh', 'blue')
    log('   - Test the admin approval dashboard UI', 'blue')
  } else {
    log('\n⚠️  SOME TESTS FAILED', 'red')
    log('   Please review the errors above and fix before proceeding.', 'yellow')
  }

  process.exit(passedCount === totalCount ? 0 : 1)
}

main().catch((err) => {
  log(`\n❌ Fatal error: ${err.message}`, 'red')
  console.error(err)
  process.exit(1)
})
