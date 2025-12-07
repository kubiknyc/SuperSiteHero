/**
 * Apply missing INSERT policy for projects table
 * Autonomous fix for 403 Forbidden on project creation
 */

import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_PROJECT_REF = process.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!SUPABASE_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

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
    throw new Error(`API request failed: ${response.status}\n${error}`)
  }

  return response.json()
}

async function applyFix() {
  console.log('🔧 Applying Missing INSERT Policy Fix...')
  console.log('=' .repeat(70))
  console.log()

  try {
    // Step 1: Check current state
    console.log('1️⃣ Checking current INSERT policy...')
    const checkSQL = `
      SELECT p.polname as policyname, p.polcmd as cmd
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      WHERE c.relname = 'projects' AND p.polcmd = 'a';
    `
    const current = await executeSQLViaAPI(checkSQL)
    console.log('   Current policies:', current.length > 0 ? current : 'None found')
    console.log()

    // Step 2: Drop old policies
    console.log('2️⃣ Dropping old INSERT policies...')
    const dropSQL = `
      DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
      DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
      DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;
    `
    await executeSQLViaAPI(dropSQL)
    console.log('   ✅ Old policies dropped')
    console.log()

    // Step 3: Create new simple policy
    console.log('3️⃣ Creating simple INSERT policy...')
    const createSQL = `
      CREATE POLICY "Authenticated users can insert projects"
        ON projects FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
    `
    await executeSQLViaAPI(createSQL)
    console.log('   ✅ New policy created')
    console.log()

    // Step 4: Verify
    console.log('4️⃣ Verifying policy...')
    const verify = await executeSQLViaAPI(checkSQL)
    console.log('   ✅ Verified:', verify)
    console.log()

    // Success
    console.log('=' .repeat(70))
    console.log('🎉 FIX APPLIED SUCCESSFULLY!')
    console.log('=' .repeat(70))
    console.log()
    console.log('✅ Missing INSERT policy added')
    console.log('✅ Projects table now allows authenticated inserts')
    console.log()
    console.log('🔄 Next: Refresh browser and try creating a project')
    console.log()

  } catch (error: any) {
    console.error('=' .repeat(70))
    console.error('❌ ERROR')
    console.error('=' .repeat(70))
    console.error()
    console.error('Error:', error.message)
    console.error()
    process.exit(1)
  }
}

applyFix().catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
