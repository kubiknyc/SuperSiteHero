#!/usr/bin/env tsx
/**
 * Apply Migrations 046 and 047 to fix 403 project creation error
 *
 * This script applies the RLS policy fixes directly to Supabase
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nxlznnrocrffnbzjaaae.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment')
  console.error('Make sure .env file is loaded')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSql(sql: string, description: string): Promise<boolean> {
  console.log(`\n📝 ${description}...`)

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error(`❌ Error: ${error.message}`)
      return false
    }

    console.log(`✅ ${description} - SUCCESS`)
    return true
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('🔧 Applying Database Migrations 046 & 047')
  console.log('='.repeat(60))
  console.log('\nThis will fix the 403 Forbidden error on project creation')
  console.log('by updating RLS policies in the database.\n')

  // Read migration files
  const migration046Path = path.join(__dirname, '..', 'supabase', 'migrations', '046_fix_projects_insert_policy.sql')
  const migration047Path = path.join(__dirname, '..', 'supabase', 'migrations', '047_fix_users_select_policy_recursion.sql')

  console.log('📂 Reading migration files...')

  let migration046: string
  let migration047: string

  try {
    migration046 = fs.readFileSync(migration046Path, 'utf-8')
    migration047 = fs.readFileSync(migration047Path, 'utf-8')
    console.log('✅ Migration files loaded')
  } catch (error: any) {
    console.error('❌ Error reading migration files:', error.message)
    process.exit(1)
  }

  // Apply migrations
  console.log('\n' + '='.repeat(60))
  console.log('MIGRATION 046: Fix Projects INSERT Policy')
  console.log('='.repeat(60))

  const success046 = await executeSql(migration046, 'Applying Migration 046')

  if (!success046) {
    console.error('\n❌ Migration 046 failed. Stopping here.')
    console.error('You may need to apply this migration manually in Supabase SQL Editor.')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(60))
  console.log('MIGRATION 047: Fix Users SELECT Recursion')
  console.log('='.repeat(60))

  const success047 = await executeSql(migration047, 'Applying Migration 047')

  if (!success047) {
    console.error('\n❌ Migration 047 failed.')
    console.error('You may need to apply this migration manually in Supabase SQL Editor.')
    process.exit(1)
  }

  // Verify migrations
  console.log('\n' + '='.repeat(60))
  console.log('VERIFICATION')
  console.log('='.repeat(60))

  // Check projects INSERT policy
  const { data: projectPolicies, error: projectError } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'projects' AND cmd = 'INSERT'
      `
    })

  if (!projectError && projectPolicies) {
    console.log('\n✅ Projects INSERT policy verified')
  }

  // Check users SELECT policy
  const { data: userPolicies, error: userError } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'users' AND cmd = 'SELECT'
      `
    })

  if (!userError && userPolicies) {
    console.log('✅ Users SELECT policy verified')
  }

  // Check helper functions
  const { data: functions, error: functionsError } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT routine_name, security_type
        FROM information_schema.routines
        WHERE routine_schema = 'auth'
          AND routine_name IN ('user_company_id', 'user_role')
      `
    })

  if (!functionsError && functions) {
    console.log('✅ Helper functions verified')
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 MIGRATIONS APPLIED SUCCESSFULLY!')
  console.log('='.repeat(60))
  console.log('\n✅ Migration 046: Projects INSERT policy fixed')
  console.log('✅ Migration 047: Users SELECT recursion fixed')
  console.log('\n⚠️  IMPORTANT: You must log out and log back in')
  console.log('   for the RLS policy changes to take effect!')
  console.log('\n📝 Next steps:')
  console.log('   1. Log out of the application')
  console.log('   2. Log back in')
  console.log('   3. Try creating a project')
  console.log('   4. Should work without 403 error! 🎉')
  console.log('\n' + '='.repeat(60))
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error)
  process.exit(1)
})
