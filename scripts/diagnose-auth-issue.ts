/**
 * Diagnostic script to debug login issues
 * Run with: npx tsx scripts/diagnose-auth-issue.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function diagnose() {
  console.log('🔍 Diagnosing authentication setup...\n')

  // 1. Check if trigger exists
  console.log('1️⃣ Checking if auto-create trigger exists...')
  const { data: triggers, error: triggerError } = await supabase
    .from('information_schema.triggers')
    .select('trigger_name, event_object_table, action_statement')
    .eq('trigger_name', 'on_auth_user_created')

  if (triggerError) {
    console.error('   ❌ Error checking triggers:', triggerError.message)
  } else if (!triggers || triggers.length === 0) {
    console.error('   ❌ Trigger NOT found!')
    console.error('   → Apply migration 044_enable_auto_user_creation.sql')
  } else {
    console.log('   ✅ Trigger exists')
  }

  // 2. Check user counts
  console.log('\n2️⃣ Checking user counts...')

  // Note: We can't directly query auth.users via Supabase client
  // So we'll query public.users and check company assignments
  const { data: publicUsers, error: usersError } = await supabase
    .from('users')
    .select('id, email, company_id, role, is_active')

  if (usersError) {
    console.error('   ❌ Error fetching users:', usersError.message)
  } else {
    console.log(`   📊 Public users count: ${publicUsers?.length || 0}`)

    if (publicUsers && publicUsers.length > 0) {
      console.log('\n   Recent users:')
      publicUsers.slice(0, 5).forEach(user => {
        console.log(`   - ${user.email}`)
        console.log(`     Company ID: ${user.company_id || '❌ NULL'}`)
        console.log(`     Role: ${user.role}`)
        console.log(`     Active: ${user.is_active}`)
      })
    }
  }

  // 3. Check companies
  console.log('\n3️⃣ Checking companies...')
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')

  if (companiesError) {
    console.error('   ❌ Error fetching companies:', companiesError.message)
  } else if (!companies || companies.length === 0) {
    console.error('   ❌ No companies found!')
    console.error('   → Users cannot be created without a company')
    console.log('\n   Quick fix SQL:')
    console.log(`   INSERT INTO public.companies (name, address, phone)`)
    console.log(`   VALUES ('Default Company', '123 Main St', '555-0100');`)
  } else {
    console.log(`   ✅ Found ${companies.length} companies`)
    companies.slice(0, 3).forEach(company => {
      console.log(`   - ${company.name} (${company.id})`)
    })
  }

  // 4. Check for orphaned users (users without company)
  console.log('\n4️⃣ Checking for users without company...')
  const { data: orphanedUsers } = await supabase
    .from('users')
    .select('id, email, company_id')
    .is('company_id', null)

  if (orphanedUsers && orphanedUsers.length > 0) {
    console.error(`   ❌ Found ${orphanedUsers.length} users without company:`)
    orphanedUsers.forEach(user => {
      console.error(`   - ${user.email}`)
    })
    console.log('\n   Quick fix SQL:')
    console.log(`   UPDATE public.users`)
    console.log(`   SET company_id = (SELECT id FROM companies LIMIT 1)`)
    console.log(`   WHERE company_id IS NULL;`)
  } else {
    console.log('   ✅ All users have companies assigned')
  }

  // 5. Summary and recommendations
  console.log('\n' + '='.repeat(60))
  console.log('📋 SUMMARY & RECOMMENDATIONS')
  console.log('='.repeat(60))

  const issues: string[] = []

  if (!triggers || triggers.length === 0) {
    issues.push('Apply migration 044_enable_auto_user_creation.sql')
  }

  if (!companies || companies.length === 0) {
    issues.push('Create at least one company in the database')
  }

  if (orphanedUsers && orphanedUsers.length > 0) {
    issues.push('Fix users without company_id (see SQL above)')
  }

  if (issues.length === 0) {
    console.log('\n✅ Database setup looks good!')
    console.log('\nIf you still have login issues, check:')
    console.log('1. Supabase Dashboard → Auth → Providers → Email')
    console.log('   → Disable "Confirm email" for development')
    console.log('2. Check user\'s email for verification link')
    console.log('3. Clear browser localStorage and try fresh signup')
  } else {
    console.log('\n❌ Issues found:')
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`)
    })
    console.log('\nRefer to LOGIN_DEBUG_GUIDE.md for detailed fixes')
  }

  console.log('\n' + '='.repeat(60))
}

diagnose().catch(console.error)
