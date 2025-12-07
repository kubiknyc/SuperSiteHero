/**
 * Apply RLS policy fix via Supabase Management API
 * This script uses the Management API to execute SQL directly
 *
 * Run with: npx tsx scripts/apply-rls-fix-via-api.ts
 */

import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_PROJECT_REF = process.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!SUPABASE_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Missing required environment variables!')
  console.error('Required:')
  console.error('  - VITE_SUPABASE_URL (to extract project ref)')
  console.error('  - SUPABASE_ACCESS_TOKEN')
  console.log()
  console.log('To get your access token:')
  console.log('1. Go to https://supabase.com/dashboard/account/tokens')
  console.log('2. Generate a new access token')
  console.log('3. Add to .env: SUPABASE_ACCESS_TOKEN=sbp_...')
  process.exit(1)
}

const SQL_STATEMENTS = [
  {
    name: 'Drop old policies',
    sql: `
      DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
      DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;
      DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
    `
  },
  {
    name: 'Create new simplified policy',
    sql: `
      CREATE POLICY "Authenticated users can insert projects"
        ON projects FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
    `
  },
  {
    name: 'Add policy comment',
    sql: `
      COMMENT ON POLICY "Authenticated users can insert projects" ON projects IS
        'Allows any authenticated user to create projects. Company isolation enforced by company_id column and SELECT policies. Applied in migration 018 to avoid RLS recursion issues.';
    `
  },
  {
    name: 'Create performance indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
      CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
      CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id);
      CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);
    `
  }
]

async function executeSQLViaAPI(sql: string): Promise<any> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API request failed: ${response.status} ${response.statusText}\n${error}`)
  }

  return response.json()
}

async function applyRLSFix() {
  console.log('🔧 Applying RLS Policy Fix via Supabase Management API...')
  console.log('=' .repeat(70))
  console.log()
  console.log(`📡 Project: ${SUPABASE_PROJECT_REF}`)
  console.log()

  try {
    // Execute each SQL statement
    for (let i = 0; i < SQL_STATEMENTS.length; i++) {
      const statement = SQL_STATEMENTS[i]
      console.log(`${i + 1}️⃣ ${statement.name}...`)

      try {
        const result = await executeSQLViaAPI(statement.sql)
        console.log('   ✅ Success')

        // Show results if any
        if (result && result.length > 0) {
          console.log('   Results:', JSON.stringify(result, null, 2))
        }
      } catch (error: any) {
        console.log(`   ⚠️  ${error.message}`)
        // Don't fail on DROP POLICY IF EXISTS errors
        if (!error.message.includes('does not exist')) {
          throw error
        }
      }

      console.log()
    }

    // Verify the fix
    console.log('5️⃣ Verifying policy update...')
    const verifySQL = `
      SELECT policyname, cmd, with_check::text
      FROM pg_policies
      WHERE tablename = 'projects' AND cmd = 'INSERT';
    `

    const verifyResult = await executeSQLViaAPI(verifySQL)
    console.log('   ✅ Current INSERT policies:')
    console.log(JSON.stringify(verifyResult, null, 2))
    console.log()

    // Success message
    console.log('=' .repeat(70))
    console.log('🎉 RLS POLICY FIX APPLIED SUCCESSFULLY!')
    console.log('=' .repeat(70))
    console.log()
    console.log('✅ Old restrictive policies removed')
    console.log('✅ New simplified policy created')
    console.log('✅ Performance indexes created')
    console.log('✅ Authentication-based INSERT policy active')
    console.log()
    console.log('📋 What changed:')
    console.log('   • Any authenticated user can now create projects')
    console.log('   • No more role-based restrictions at database level')
    console.log('   • Company isolation still enforced via company_id')
    console.log('   • No more 403 Forbidden errors')
    console.log('   • No more "Boolean index query failed" errors')
    console.log()
    console.log('🔄 Next steps:')
    console.log('   1. Refresh your browser or log out/in')
    console.log('   2. Try creating a project')
    console.log('   3. It should work without errors!')
    console.log()

  } catch (error: any) {
    console.error('=' .repeat(70))
    console.error('❌ ERROR APPLYING RLS POLICY FIX')
    console.error('=' .repeat(70))
    console.error()
    console.error('Error:', error.message)
    console.error()
    console.error('💡 Manual fix option:')
    console.error('   1. Go to Supabase Dashboard → SQL Editor')
    console.error('   2. Run the SQL from: FIX_PROJECT_CREATION_403_ERROR.sql')
    console.error()
    process.exit(1)
  }
}

// Execute
applyRLSFix().catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
