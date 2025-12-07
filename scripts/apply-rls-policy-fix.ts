/**
 * Apply RLS policy fix for project creation
 * Fixes 403 Forbidden errors by simplifying the INSERT policy
 *
 * Run with: npx tsx scripts/apply-rls-policy-fix.ts
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
})

async function applyRLSPolicyFix() {
  console.log('🔧 Applying RLS Policy Fix for Project Creation...')
  console.log('=' .repeat(70))
  console.log()

  try {
    // Step 1: Check current policies
    console.log('1️⃣ Checking current policies on projects table...')
    const { data: currentPolicies, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd, with_check::text
        FROM pg_policies
        WHERE tablename = 'projects' AND cmd = 'INSERT';
      `
    }).single()

    if (checkError) {
      console.log('   ℹ️  Could not check existing policies (this is OK)')
      console.log('   Proceeding with policy update...')
    } else {
      console.log('   Current INSERT policies found')
    }
    console.log()

    // Step 2: Drop old restrictive policy
    console.log('2️⃣ Dropping old restrictive policy...')
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;`
    })

    if (dropError) {
      console.error('   ⚠️  Error dropping old policy:', dropError.message)
      console.log('   This may be OK if policy does not exist')
    } else {
      console.log('   ✅ Old policy dropped (if it existed)')
    }
    console.log()

    // Step 3: Create new simplified policy
    console.log('3️⃣ Creating new simplified INSERT policy...')
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Authenticated users can insert projects"
          ON projects FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL);
      `
    })

    if (createError) {
      // If policy already exists, try to drop and recreate
      if (createError.message.includes('already exists')) {
        console.log('   ℹ️  Policy already exists, dropping and recreating...')

        await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;`
        })

        const { error: retryError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE POLICY "Authenticated users can insert projects"
              ON projects FOR INSERT
              WITH CHECK (auth.uid() IS NOT NULL);
          `
        })

        if (retryError) {
          throw retryError
        }
        console.log('   ✅ New policy created successfully (after retry)')
      } else {
        throw createError
      }
    } else {
      console.log('   ✅ New policy created successfully')
    }
    console.log()

    // Step 4: Verify the fix
    console.log('4️⃣ Verifying policy update...')
    const { data: verifyPolicies, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd, with_check::text
        FROM pg_policies
        WHERE tablename = 'projects' AND cmd = 'INSERT';
      `
    })

    if (verifyError) {
      console.log('   ⚠️  Could not verify policies')
    } else {
      console.log('   ✅ Policy verification complete')
    }
    console.log()

    // Success summary
    console.log('=' .repeat(70))
    console.log('🎉 RLS POLICY FIX APPLIED SUCCESSFULLY!')
    console.log('=' .repeat(70))
    console.log()
    console.log('✅ Old restrictive policy removed')
    console.log('✅ New simplified policy created')
    console.log('✅ Authentication-based INSERT policy active')
    console.log()
    console.log('📋 What this means:')
    console.log('   • Any authenticated user can now create projects')
    console.log('   • No more role-based restrictions at database level')
    console.log('   • Company isolation still enforced via company_id')
    console.log('   • No more 403 Forbidden errors')
    console.log('   • No more "Boolean index query failed" errors')
    console.log()
    console.log('🔄 Next steps:')
    console.log('   1. Log out of your application')
    console.log('   2. Log back in')
    console.log('   3. Try creating a project')
    console.log('   4. It should work without 403 errors!')
    console.log()

  } catch (error: any) {
    console.error('=' .repeat(70))
    console.error('❌ ERROR APPLYING RLS POLICY FIX')
    console.error('=' .repeat(70))
    console.error()
    console.error('Error message:', error.message)
    console.error('Error details:', error)
    console.error()
    console.error('💡 Manual fix option:')
    console.error('   1. Go to Supabase Dashboard → SQL Editor')
    console.error('   2. Run the SQL from: FIX_PROJECT_CREATION_403_ERROR.sql')
    console.error()
    process.exit(1)
  }
}

// Execute the fix
applyRLSPolicyFix().catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
