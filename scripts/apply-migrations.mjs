#!/usr/bin/env node
/**
 * Apply Migrations 046 and 047 to fix 403 project creation error
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Client } = pg

// PostgreSQL connection string from .env
const connectionString = 'postgresql://postgres.nxlznnrocrffnbzjaaae:1VXRyuU7iFbSnsgX@aws-0-us-east-1.pooler.supabase.com:6543/postgres'

async function main() {
  console.log('='.repeat(70))
  console.log('🔧 Applying Database Migrations 046 & 047')
  console.log('='.repeat(70))
  console.log('\nThis will fix the 403 Forbidden error on project creation')
  console.log('by updating RLS policies in the database.\n')

  // Create PostgreSQL client with SSL
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('📡 Connecting to Supabase database...')
    await client.connect()
    console.log('✅ Connected successfully\n')

    // Read migration files
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
    const migration046Path = path.join(migrationsDir, '046_fix_projects_insert_policy.sql')
    const migration047Path = path.join(migrationsDir, '047_fix_users_select_policy_recursion.sql')

    console.log('📂 Reading migration files...')
    const migration046 = fs.readFileSync(migration046Path, 'utf-8')
    const migration047 = fs.readFileSync(migration047Path, 'utf-8')
    console.log('✅ Migration files loaded\n')

    // Apply Migration 046
    console.log('='.repeat(70))
    console.log('MIGRATION 046: Fix Projects INSERT Policy')
    console.log('='.repeat(70))
    console.log('📝 Applying migration...')

    try {
      await client.query(migration046)
      console.log('✅ Migration 046 applied successfully\n')
    } catch (error) {
      console.error('❌ Error applying Migration 046:', error.message)
      throw error
    }

    // Apply Migration 047
    console.log('='.repeat(70))
    console.log('MIGRATION 047: Fix Users SELECT Recursion')
    console.log('='.repeat(70))
    console.log('📝 Applying migration...')

    try {
      await client.query(migration047)
      console.log('✅ Migration 047 applied successfully\n')
    } catch (error) {
      console.error('❌ Error applying Migration 047:', error.message)
      throw error
    }

    // Verify migrations
    console.log('='.repeat(70))
    console.log('VERIFICATION')
    console.log('='.repeat(70))

    // Check projects INSERT policy
    const projectsPolicy = await client.query(`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'projects' AND cmd = 'INSERT'
    `)
    console.log('\n✅ Projects INSERT policy:',projectsPolicy.rows[0]?.policyname || 'None found')

    // Check users SELECT policy
    const usersPolicy = await client.query(`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'users' AND cmd = 'SELECT'
    `)
    console.log('✅ Users SELECT policy:', usersPolicy.rows[0]?.policyname || 'None found')

    // Check helper functions
    const functions = await client.query(`
      SELECT routine_name, security_type
      FROM information_schema.routines
      WHERE routine_schema = 'auth'
        AND routine_name IN ('user_company_id', 'user_role')
      ORDER BY routine_name
    `)
    console.log('✅ Helper functions:')
    functions.rows.forEach(row => {
      console.log(`   - ${row.routine_name} (${row.security_type})`)
    })

    console.log('\n' + '='.repeat(70))
    console.log('🎉 MIGRATIONS APPLIED SUCCESSFULLY!')
    console.log('='.repeat(70))
    console.log('\n✅ Migration 046: Projects INSERT policy fixed')
    console.log('✅ Migration 047: Users SELECT recursion fixed')
    console.log('\n⚠️  IMPORTANT: You must log out and log back in')
    console.log('   for the RLS policy changes to take effect!')
    console.log('\n📝 Next steps:')
    console.log('   1. Log out of the application')
    console.log('   2. Log back in')
    console.log('   3. Try creating a project')
    console.log('   4. Should work without 403 error! 🎉')
    console.log('\n' + '='.repeat(70))

  } catch (error) {
    console.error('\n' + '='.repeat(70))
    console.error('❌ ERROR')
    console.error('='.repeat(70))
    console.error('Failed to apply migrations:', error.message)
    console.error('\nYou can apply these migrations manually:')
    console.error('1. Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae')
    console.error('2. Open: SQL Editor')
    console.error('3. Run: supabase/migrations/046_fix_projects_insert_policy.sql')
    console.error('4. Run: supabase/migrations/047_fix_users_select_policy_recursion.sql')
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
