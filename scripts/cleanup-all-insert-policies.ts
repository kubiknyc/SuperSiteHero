/**
 * Clean up ALL INSERT policies and create only the simple one
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

async function cleanupPolicies() {
  console.log('🧹 Cleaning Up ALL INSERT Policies on Projects Table...')
  console.log('=' .repeat(70))
  console.log()

  try {
    // Drop ALL possible INSERT policies
    console.log('1️⃣ Dropping ALL INSERT policies...')
    const dropSQL = `
      DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
      DROP POLICY IF EXISTS "Authenticated users can insert projects in their company" ON projects;
      DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;
      DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
      DROP POLICY IF EXISTS "Users can create projects" ON projects;
      DROP POLICY IF EXISTS "Allow authenticated users to insert projects" ON projects;
    `
    await executeSQLViaAPI(dropSQL)
    console.log('   ✅ All old policies dropped')
    console.log()

    // Create ONE simple policy
    console.log('2️⃣ Creating single simple INSERT policy...')
    const createSQL = `
      CREATE POLICY "Authenticated users can insert projects"
        ON projects FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
    `
    await executeSQLViaAPI(createSQL)
    console.log('   ✅ Policy created')
    console.log()

    // Verify only one exists
    console.log('3️⃣ Verifying...')
    const verifySQL = `
      SELECT p.polname as policyname
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      WHERE c.relname = 'projects' AND p.polcmd = 'a';
    `
    const result = await executeSQLViaAPI(verifySQL)
    console.log(`   ✅ Found ${result.length} INSERT policy:`)
    result.forEach((r: any) => console.log(`      - ${r.policyname}`))
    console.log()

    // Success
    console.log('=' .repeat(70))
    console.log('🎉 CLEANUP COMPLETE!')
    console.log('=' .repeat(70))
    console.log()
    console.log('✅ Only ONE simple INSERT policy remains')
    console.log('✅ Policy: auth.uid() IS NOT NULL')
    console.log()
    console.log('🔄 Refresh browser and try creating a project now!')
    console.log()

  } catch (error: any) {
    console.error('❌ ERROR:', error.message)
    process.exit(1)
  }
}

cleanupPolicies().catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
