#!/usr/bin/env node
/**
 * Run database migration using Supabase TypeScript client
 * Usage: npx tsx scripts/run-migration.ts [migration-file]
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env file')
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase admin client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Get migration file path
const migrationFile = process.argv[2] || 'migrations/044_enable_auto_user_creation.sql'
const migrationPath = path.join(process.cwd(), migrationFile)

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Error: Migration file not found: ${migrationPath}`)
  process.exit(1)
}

const sql = fs.readFileSync(migrationPath, 'utf8')

console.log('📋 Migration Details:')
console.log(`   File: ${migrationFile}`)
console.log(`   Project: ${SUPABASE_URL}`)
console.log(`   SQL Length: ${sql.length} characters`)
console.log(`   Lines: ${sql.split('\n').length}`)
console.log()

async function runMigration() {
  try {
    console.log('🚀 Executing migration...')
    console.log()

    // Split SQL into individual statements
    // This is a simple approach - a more robust solution would use a proper SQL parser
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    console.log()

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'

      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim() === ';') {
        continue
      }

      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        })

        if (error) {
          // If rpc method doesn't exist, try using raw SQL via postgrest
          console.log(`   Note: exec_sql RPC not found, trying alternative method...`)

          // For CREATE FUNCTION, CREATE TRIGGER, etc., we need to use the SQL Editor
          // which isn't available via the REST API
          console.error(`   ❌ Failed: ${error.message}`)
          console.log()
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log('⚠️  The Supabase REST API does not support DDL statements.')
          console.log('    You need to run this migration using one of these methods:')
          console.log()
          console.log('1. Supabase Dashboard SQL Editor (recommended):')
          console.log(`   • Open: ${SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/')}/sql/new`)
          console.log(`   • Copy the contents of: ${migrationFile}`)
          console.log('   • Paste and click "Run"')
          console.log()
          console.log('2. Using psql (if you have database password):')
          console.log(`   psql "postgresql://postgres:[password]@db.${SUPABASE_URL.split('.')[0].replace('https://', '')}.supabase.co:5432/postgres" -f ${migrationFile}`)
          console.log()
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          process.exit(1)
        }

        console.log(`   ✅ Success`)
      } catch (err: any) {
        console.error(`   ❌ Error: ${err.message}`)
        throw err
      }
    }

    console.log()
    console.log('✅ Migration completed successfully!')
    console.log()
    console.log('🔍 Verifying migration...')

    // Verify the trigger was created
    const { data: triggerCheck, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_name', 'on_auth_user_created')
      .maybeSingle()

    if (triggerError) {
      console.log('   ⚠️  Could not verify trigger (this is normal if you don\'t have access to information_schema)')
    } else if (triggerCheck) {
      console.log('   ✅ Trigger "on_auth_user_created" is active')
    } else {
      console.log('   ⚠️  Trigger not found - migration may not have completed')
    }

    // Check user counts
    const { count: authCount } = await supabase.auth.admin.listUsers()
    const { count: profileCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    console.log()
    console.log('📊 User Counts:')
    console.log(`   Auth Users: ${authCount || 'unknown'}`)
    console.log(`   Profile Users: ${profileCount || 'unknown'}`)

    if (authCount !== undefined && profileCount !== undefined) {
      if (authCount === profileCount) {
        console.log('   ✅ All auth users have profiles')
      } else {
        console.log(`   ⚠️  Missing ${authCount - profileCount} profiles`)
      }
    }

  } catch (error: any) {
    console.error()
    console.error('❌ Migration failed:', error.message)
    console.error()
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

runMigration()
