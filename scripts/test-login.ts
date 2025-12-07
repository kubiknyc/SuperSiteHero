/**
 * Test login with specific credentials
 * Run with: npx tsx scripts/test-login.ts <email> <password>
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Use ANON key (same as the app uses)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

async function testLogin(email: string, password: string) {
  console.log('🔐 Testing login...')
  console.log('=' .repeat(60))
  console.log(`Email: ${email}`)
  console.log(`Password: ${'*'.repeat(password.length)}`)
  console.log('=' .repeat(60))
  console.log()

  // Step 1: Try to sign in
  console.log('1️⃣ Attempting sign in...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    console.error('❌ Sign in FAILED')
    console.error(`   Error: ${signInError.message}`)
    console.error(`   Status: ${signInError.status}`)
    console.error(`   Code: ${(signInError as any).code || 'N/A'}`)
    console.log()

    if (signInError.message.includes('Invalid login credentials')) {
      console.log('💡 COMMON CAUSES:')
      console.log('   1. Wrong password - double check for typos')
      console.log('   2. Email not confirmed yet (check email inbox)')
      console.log('   3. User account disabled')
      console.log('   4. Copy-paste issue with spaces in email/password')
      console.log()
      console.log('💡 TRY THIS:')
      console.log('   1. Reset password: Go to /forgot-password page')
      console.log('   2. Register with a BRAND NEW email')
      console.log('   3. Check Supabase Dashboard → Auth → Users to see user status')
    }

    process.exit(1)
  }

  console.log('✅ Sign in successful!')
  console.log(`   User ID: ${signInData.user?.id}`)
  console.log(`   Email: ${signInData.user?.email}`)
  console.log(`   Email confirmed: ${signInData.user?.email_confirmed_at ? 'Yes' : 'No'}`)
  console.log()

  // Step 2: Check if user profile exists
  console.log('2️⃣ Checking user profile...')
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', signInData.user!.id)
    .maybeSingle()

  if (profileError) {
    console.error('❌ Error fetching profile:', profileError.message)
    process.exit(1)
  }

  if (!profile) {
    console.error('❌ NO PROFILE FOUND in public.users table!')
    console.error('   This will cause the app to fail after login')
    console.log()
    console.log('💡 FIX: Run the backfill script or re-apply migration 044')
    process.exit(1)
  }

  console.log('✅ Profile found!')
  console.log(`   Name: ${profile.first_name} ${profile.last_name}`)
  console.log(`   Role: ${profile.role}`)
  console.log(`   Company ID: ${profile.company_id}`)
  console.log(`   Active: ${profile.is_active}`)
  console.log()

  // Step 3: Summary
  console.log('=' .repeat(60))
  console.log('🎉 LOGIN TEST PASSED!')
  console.log('=' .repeat(60))
  console.log()
  console.log('✅ Authentication successful')
  console.log('✅ User profile exists')
  console.log('✅ Ready to use the app')
  console.log()
  console.log('If the app still shows login errors, check:')
  console.log('1. Browser console for JavaScript errors')
  console.log('2. Network tab for failed API requests')
  console.log('3. Clear browser cache/localStorage and try again')
  console.log()

  // Sign out
  await supabase.auth.signOut()
}

// Get email and password from command line
const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Usage: npx tsx scripts/test-login.ts <email> <password>')
  console.error('Example: npx tsx scripts/test-login.ts user@example.com MyPassword123!')
  process.exit(1)
}

testLogin(email, password).catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
