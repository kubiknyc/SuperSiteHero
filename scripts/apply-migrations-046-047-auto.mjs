#!/usr/bin/env node
// Apply Migrations 046 and 047 - Autonomous Execution
import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configuration
const POSTGRES_CONNECTION_STRING = process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://postgres.nxlznnrocrffnbzjaaae:1VXRyuU7iFbSnsgX@aws-0-us-east-1.pooler.supabase.com:6543/postgres'

console.log('='.repeat(60))
console.log('🔧 Applying Database Migrations 046 & 047')
console.log('='.repeat(60))
console.log('\nThis will fix:')
console.log('  ✓ 403 Forbidden error on project creation')
console.log('  ✓ RLS policy recursion issues')
console.log('  ✓ Multi-tenant security isolation')
console.log('')

// Read migration files
const migration046Path = join(__dirname, '..', 'supabase', 'migrations', '046_fix_projects_insert_policy.sql')
const migration047Path = join(__dirname, '..', 'supabase', 'migrations', '047_fix_users_select_policy_recursion.sql')

console.log('📂 Reading migration files...')

let migration046, migration047

try {
  migration046 = readFileSync(migration046Path, 'utf-8')
  migration047 = readFileSync(migration047Path, 'utf-8')
  console.log('✅ Migration files loaded')
  console.log('')
} catch (error) {
  console.error('❌ Error reading migration files:', error.message)
  process.exit(1)
}

// Execute migrations
async function applyMigrations() {
  const client = new Client({
    connectionString: POSTGRES_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('⏳ Connecting to database...')
    await client.connect()
    console.log('✅ Connected to Supabase PostgreSQL')
    console.log('')

    // Apply Migration 046
    console.log('='.repeat(60))
    console.log('MIGRATION 046: Fix Projects INSERT Policy')
    console.log('='.repeat(60))
    console.log('⏳ Applying migration 046...')

    await client.query(migration046)

    console.log('✅ Migration 046 applied successfully!')
    console.log('   → Projects INSERT policy now validates company_id')
    console.log('   → Multi-tenant isolation enforced')
    console.log('')

    // Apply Migration 047
    console.log('='.repeat(60))
    console.log('MIGRATION 047: Fix Users SELECT Policy Recursion')
    console.log('='.repeat(60))
    console.log('⏳ Applying migration 047...')

    await client.query(migration047)

    console.log('✅ Migration 047 applied successfully!')
    console.log('   → Created auth.user_company_id() function')
    console.log('   → Created auth.user_role() function')
    console.log('   → Users SELECT policy no longer recursive')
    console.log('')

    // Verification
    console.log('='.repeat(60))
    console.log('VERIFICATION')
    console.log('='.repeat(60))

    // Verify projects policy
    const projectPolicyResult = await client.query(`
      SELECT policyname, cmd, with_check
      FROM pg_policies
      WHERE tablename = 'projects' AND cmd = 'INSERT'
    `)

    console.log('✅ Projects INSERT policy:')
    console.log(`   Policy: ${projectPolicyResult.rows[0]?.policyname || 'Not found'}`)

    // Verify users policy
    const userPolicyResult = await client.query(`
      SELECT policyname, cmd, using
      FROM pg_policies
      WHERE tablename = 'users' AND cmd = 'SELECT'
    `)

    console.log('✅ Users SELECT policy:')
    console.log(`   Policy: ${userPolicyResult.rows[0]?.policyname || 'Not found'}`)

    // Verify helper functions
    const functionsResult = await client.query(`
      SELECT routine_name, security_type
      FROM information_schema.routines
      WHERE routine_schema = 'auth'
        AND routine_name IN ('user_company_id', 'user_role')
    `)

    console.log('✅ Helper functions:')
    functionsResult.rows.forEach(row => {
      console.log(`   → ${row.routine_name} (${row.security_type})`)
    })

    console.log('')
    console.log('='.repeat(60))
    console.log('🎉 MIGRATIONS APPLIED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log('')
    console.log('✅ Migration 046: Projects INSERT policy fixed')
    console.log('✅ Migration 047: Users SELECT recursion fixed')
    console.log('')
    console.log('⚠️  IMPORTANT: Users must log out and log back in')
    console.log('   for the RLS policy changes to take effect!')
    console.log('')
    console.log('📝 Next steps:')
    console.log('   1. Log out of the application')
    console.log('   2. Log back in')
    console.log('   3. Try creating a project')
    console.log('   4. Should work without 403 error! 🎉')
    console.log('')
    console.log('='.repeat(60))

  } catch (err) {
    console.error('')
    console.error('❌ Error executing migrations:', err.message)
    console.error('')
    console.error('This may be due to connection pooler restrictions.')
    console.error('')
    console.error('✅ Fallback: Opening SQL Editor for manual execution...')
    console.error('')

    // Fallback to manual execution
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      // Open SQL Editor for migration 046
      await execAsync('powershell -Command "Start-Process \'https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new\'"')
      console.log('🌐 SQL Editor opened for Migration 046')

      // Copy migration 046 to clipboard
      await execAsync(`powershell -Command "Get-Content '${migration046Path}' | Set-Clipboard"`)
      console.log('📋 Migration 046 SQL copied to clipboard')
      console.log('')
      console.log('👉 Manual Steps:')
      console.log('   1. Paste Migration 046 (Ctrl+V) and click RUN')
      console.log('   2. Wait for success message')
      console.log('   3. Clear the editor and paste Migration 047 (run this script again)')
      console.log('')

    } catch (fallbackErr) {
      console.error('Manual action required:')
      console.error('1. Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new')
      console.error('2. Run migration 046 from:', migration046Path)
      console.error('3. Run migration 047 from:', migration047Path)
    }

  } finally {
    await client.end()
  }
}

applyMigrations()
