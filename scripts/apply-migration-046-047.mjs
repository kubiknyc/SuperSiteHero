#!/usr/bin/env node
/**
 * Apply migrations 046 & 047 to fix 403 project creation error
 * Uses service role key to execute SQL directly
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nxlznnrocrffnbzjaaae.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc'

console.log('='.repeat(70))
console.log('🚀 Applying Migrations 046 & 047')
console.log('   Fix: Project creation 403 error (RLS recursion)')
console.log('='.repeat(70))
console.log('')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '046_047_combined_final.sql')
    console.log(`📂 Reading migration file: ${migrationPath}`)
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    console.log(`✅ Migration file loaded (${migrationSQL.length} characters)`)
    console.log('')

    // Execute the migration using raw SQL
    console.log('⏳ Executing migration SQL...')
    console.log('   This will:')
    console.log('   1. Drop existing problematic policies')
    console.log('   2. Create SECURITY DEFINER helper functions in public schema')
    console.log('   3. Create new non-recursive RLS policies')
    console.log('   4. Verify all changes')
    console.log('')

    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // Try alternative approach: split into individual statements
      console.log('⚠️  Direct execution failed, trying statement-by-statement...')
      console.log(`   Error: ${error.message}`)
      console.log('')

      // Split the SQL into individual statements (rough approach)
      const statements = migrationSQL
        .split(/;\s*(?=CREATE|DROP|GRANT|COMMENT|DO)/g)
        .map(s => s.trim())
        .filter(s => s.length > 0)

      console.log(`📝 Split into ${statements.length} statements`)

      let successCount = 0
      let failureCount = 0

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]
        if (!stmt.endsWith(';')) {
          stmt += ';'
        }

        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt })

        if (stmtError) {
          console.log(`   ❌ Statement ${i + 1} failed: ${stmtError.message.substring(0, 100)}`)
          failureCount++
        } else {
          successCount++
        }
      }

      console.log('')
      console.log(`📊 Results: ${successCount} succeeded, ${failureCount} failed`)

      if (failureCount > 0) {
        throw new Error(`Migration partially failed: ${failureCount} statements failed`)
      }
    } else {
      console.log('✅ Migration executed successfully!')
    }

    console.log('')
    console.log('='.repeat(70))
    console.log('🎉 MIGRATIONS 046 & 047 APPLIED!')
    console.log('='.repeat(70))
    console.log('')
    console.log('✅ Migration 046: Projects INSERT policy')
    console.log('   → Policy: "Authenticated users can insert projects in their company"')
    console.log('   → Company_id validation enforced')
    console.log('   → Multi-tenant isolation secured')
    console.log('')
    console.log('✅ Migration 047: Users SELECT policy (non-recursive)')
    console.log('   → Function: public.get_user_company_id()')
    console.log('   → Function: public.get_user_role()')
    console.log('   → Policy: "Users can view company users"')
    console.log('   → No more recursion issues!')
    console.log('')
    console.log('⚠️  IMPORTANT: Users must log out and back in')
    console.log('   for RLS policy changes to take effect!')
    console.log('')
    console.log('📝 Next Steps:')
    console.log('   1. Run verification: node scripts/verify-migrations-046-047.mjs')
    console.log('   2. Log out of your application')
    console.log('   3. Log back in')
    console.log('   4. Try creating a project')
    console.log('   5. Should work without 403 error! 🎉')
    console.log('')

  } catch (err) {
    console.error('')
    console.error('='.repeat(70))
    console.error('❌ ERROR APPLYING MIGRATION')
    console.error('='.repeat(70))
    console.error('')
    console.error(`Error: ${err.message}`)
    console.error('')
    console.error('🔧 Manual application required:')
    console.error('   1. Open Supabase SQL Editor:')
    console.error('      https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new')
    console.error('   2. Copy contents of: supabase/migrations/046_047_combined_final.sql')
    console.error('   3. Paste into SQL Editor')
    console.error('   4. Click RUN')
    console.error('')
    process.exit(1)
  }
}

applyMigration()
