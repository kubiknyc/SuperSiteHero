/**
 * Check Test User Status
 *
 * This script checks the current state of the test user in the database
 * to help diagnose E2E test failures.
 *
 * Usage: npx tsx scripts/check-test-user.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const testEmail = process.env.TEST_USER_EMAIL || 'kubiknyc@gmail.com'
const testPassword = process.env.TEST_USER_PASSWORD || 'Alfa1346!'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTestUser() {
  console.log('🔍 Checking test user status...\n')

  // Step 1: Authenticate
  console.log('1️⃣  Authenticating as:', testEmail)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (authError) {
    console.error('❌ Authentication failed:', authError.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log('✅ Authenticated. User ID:', userId)

  // Step 2: Check user profile
  console.log('\n2️⃣  Checking user profile in users table...')
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    console.error('❌ Error fetching user profile:', profileError.message)
  } else if (!userProfile) {
    console.error('❌ User profile NOT FOUND in users table')
    console.log('\n💡 This is the root cause of E2E test failures!')
    console.log('   The app requires a user record in the users table.')
    console.log('\n📝 To fix, run this SQL in Supabase:')
    console.log(`
INSERT INTO users (id, company_id, email, first_name, last_name, role, status)
VALUES (
  '${userId}',
  '<company-id>',  -- Get this from your companies table
  '${testEmail}',
  'Eli',
  'Vidyaev',
  'superintendent',
  'active'
);
    `)
  } else {
    console.log('✅ User profile found:')
    console.log(`   - Name: ${userProfile.first_name} ${userProfile.last_name}`)
    console.log(`   - Email: ${userProfile.email}`)
    console.log(`   - Role: ${userProfile.role}`)
    console.log(`   - Company ID: ${userProfile.company_id || '❌ MISSING'}`)
    console.log(`   - Status: ${userProfile.status}`)

    if (!userProfile.company_id) {
      console.log('\n❌ PROBLEM: User has no company_id!')
      console.log('   All queries will fail because they filter by company_id.')
    }
  }

  // Step 3: Check company
  if (userProfile?.company_id) {
    console.log('\n3️⃣  Checking company...')
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userProfile.company_id)
      .maybeSingle()

    if (companyError) {
      console.error('❌ Error fetching company:', companyError.message)
    } else if (!company) {
      console.error('❌ Company NOT FOUND')
    } else {
      console.log('✅ Company found:')
      console.log(`   - Name: ${company.name}`)
      console.log(`   - Slug: ${company.slug}`)
    }
  }

  // Step 4: Check projects
  if (userProfile?.id) {
    console.log('\n4️⃣  Checking projects assigned to user...')
    const { data: projectAssignments, error: assignError } = await supabase
      .from('project_users')
      .select('project:projects(id, name, project_number, status)')
      .eq('user_id', userProfile.id)

    if (assignError) {
      console.error('❌ Error fetching projects:', assignError.message)
    } else if (!projectAssignments || projectAssignments.length === 0) {
      console.log('⚠️  No projects assigned to user')
      console.log('   Tests expecting projects will fail or show empty states.')
    } else {
      console.log(`✅ Found ${projectAssignments.length} assigned projects:`)
      projectAssignments.forEach((pa: any) => {
        const p = pa.project
        if (p) {
          console.log(`   - ${p.name} (${p.project_number}) - ${p.status}`)
        }
      })
    }
  }

  // Step 5: Check contacts
  if (userProfile?.company_id) {
    console.log('\n5️⃣  Checking contacts...')
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, contact_type')
      .eq('company_id', userProfile.company_id)
      .limit(10)

    if (contactsError) {
      console.error('❌ Error fetching contacts:', contactsError.message)
    } else if (!contacts || contacts.length === 0) {
      console.log('⚠️  No contacts found')
    } else {
      console.log(`✅ Found ${contacts.length} contacts`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))

  const issues = []
  if (!userProfile) {
    issues.push('❌ User profile missing in users table')
  }
  if (userProfile && !userProfile.company_id) {
    issues.push('❌ User has no company_id')
  }

  if (issues.length > 0) {
    console.log('\n🚨 ISSUES FOUND:\n')
    issues.forEach(issue => console.log('   ' + issue))
    console.log('\n These issues will cause E2E tests to fail.')
    console.log(' Please fix them before running tests.\n')
  } else {
    console.log('\n✅ All checks passed!')
    console.log('   User is properly configured for E2E testing.\n')
  }
}

checkTestUser()
  .catch((error) => {
    console.error('\n❌ Check failed:', error)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
