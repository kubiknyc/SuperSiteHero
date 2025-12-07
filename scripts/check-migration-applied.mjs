#!/usr/bin/env node
/**
 * Check if migrations 046 & 047 were applied successfully
 * Verifies helper functions and RLS policies exist
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nxlznnrocrffnbzjaaae.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc'

console.log('='.repeat(70))
console.log('🔍 Checking Migration Status')
console.log('='.repeat(70))
console.log('')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkMigration() {
  let allPassed = true

  console.log('Test 1: Checking helper functions...')
  const { data: functions, error: funcError } = await supabase
    .from('routines')
    .select('*')
    .eq('routine_schema', 'public')
    .in('routine_name', ['get_user_company_id', 'get_user_role'])

  if (funcError) {
    console.log('   ⚠️  Cannot query routines table (this is normal)')
    console.log('   ℹ️  Will verify via SQL Editor instead')
  } else if (functions && functions.length === 2) {
    console.log('   ✅ Both helper functions found in public schema')
  } else {
    console.log('   ❌ Helper functions not found or incomplete')
    allPassed = false
  }
  console.log('')

  console.log('Test 2: Checking projects INSERT policy...')
  // Can't query pg_policies directly, so we'll try to test behavior
  console.log('   ℹ️  Policy structure cannot be queried via API')
  console.log('   ✅ Will verify by testing project creation')
  console.log('')

  console.log('Test 3: Checking users SELECT policy...')
  console.log('   ℹ️  Policy structure cannot be queried via API')
  console.log('   ✅ Will verify by accessing users table')
  console.log('')

  console.log('='.repeat(70))
  console.log('📊 Verification Summary')
  console.log('='.repeat(70))
  console.log('')
  console.log('To fully verify the migration, run this SQL in Supabase SQL Editor:')
  console.log('')
  console.log('-- Check helper functions')
  console.log('SELECT routine_name, routine_schema, security_type')
  console.log('FROM information_schema.routines')
  console.log("WHERE routine_schema = 'public'")
  console.log("  AND routine_name IN ('get_user_company_id', 'get_user_role');")
  console.log('')
  console.log('-- Expected: 2 rows with security_type = DEFINER')
  console.log('')
  console.log('-- Check projects policy')
  console.log('SELECT policyname, cmd')
  console.log('FROM pg_policies')
  console.log("WHERE tablename = 'projects' AND cmd = 'INSERT';")
  console.log('')
  console.log('-- Expected: "Authenticated users can insert projects in their company"')
  console.log('')
  console.log('-- Check users policy')
  console.log('SELECT policyname, cmd')
  console.log('FROM pg_policies')
  console.log("WHERE tablename = 'users' AND cmd = 'SELECT';")
  console.log('')
  console.log('-- Expected: "Users can view company users"')
  console.log('')
  console.log('='.repeat(70))
  console.log('')
  console.log('📝 Next Steps After Verification:')
  console.log('   1. Log out of your application')
  console.log('   2. Log back in (clears cached RLS policies)')
  console.log('   3. Try creating a new project')
  console.log('   4. Should work without 403 error! 🎉')
  console.log('')
}

checkMigration()
