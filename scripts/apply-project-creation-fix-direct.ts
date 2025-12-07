/**
 * Apply RLS policy fix for project creation using direct query approach
 * Fixes 403 Forbidden errors by simplifying the INSERT policy
 *
 * Run with: npx tsx scripts/apply-project-creation-fix-direct.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Use service role key to execute admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public'
  }
})

async function applyRLSPolicyFix() {
  console.log('🔧 Testing Project Creation Permissions...')
  console.log('=' .repeat(70))
  console.log()
  console.log('⚠️  NOTE: SQL policy changes must be done via Supabase Dashboard')
  console.log('          This script will verify current state and guide you.')
  console.log()

  try {
    // Test 1: Verify we can query projects table
    console.log('1️⃣ Testing projects table access...')
    const { data: projects, error: queryError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)

    if (queryError) {
      console.log('   ⚠️  Query error:', queryError.message)
    } else {
      console.log('   ✅ Projects table accessible')
      console.log(`   Found ${projects?.length || 0} project(s)`)
    }
    console.log()

    // Test 2: Check user accounts
    console.log('2️⃣ Checking admin user accounts...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, company_id')
      .in('email', ['kubiknyc@gmail.com', 'evidyaev@gdc.nyc'])

    if (usersError) {
      console.log('   ⚠️  Users query error:', usersError.message)
    } else {
      console.log('   ✅ Found admin users:')
      users?.forEach(u => {
        console.log(`      • ${u.email}: role=${u.role}, company=${u.company_id ? '✓' : '✗'}`)
      })
    }
    console.log()

    // Instructions
    console.log('=' .repeat(70))
    console.log('📋 MANUAL FIX REQUIRED')
    console.log('=' .repeat(70))
    console.log()
    console.log('The RLS policy fix must be applied via Supabase Dashboard:')
    console.log()
    console.log('STEPS:')
    console.log('------')
    console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard')
    console.log('2. Navigate to: SQL Editor')
    console.log('3. Create a new query and paste this SQL:')
    console.log()
    console.log('```sql')
    console.log('-- Drop old restrictive policy')
    console.log('DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;')
    console.log()
    console.log('-- Create new simplified policy')
    console.log('CREATE POLICY "Authenticated users can insert projects"')
    console.log('  ON projects FOR INSERT')
    console.log('  WITH CHECK (auth.uid() IS NOT NULL);')
    console.log()
    console.log('-- Verify the policy')
    console.log('SELECT policyname, cmd, with_check::text')
    console.log('FROM pg_policies')
    console.log('WHERE tablename = \'projects\' AND cmd = \'INSERT\';')
    console.log('```')
    console.log()
    console.log('4. Click "Run" to execute the SQL')
    console.log('5. Verify you see the new policy in the results')
    console.log()
    console.log('=' .repeat(70))
    console.log()
    console.log('📄 Full SQL script available in:')
    console.log('   FIX_PROJECT_CREATION_403_ERROR.sql')
    console.log()
    console.log('📖 Complete analysis in:')
    console.log('   PROJECT_CREATION_403_ERROR_ANALYSIS.md')
    console.log()

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

// Execute
applyRLSPolicyFix().catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
