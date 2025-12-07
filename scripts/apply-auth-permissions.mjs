// Apply Auth Schema Permissions Migration
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nxlznnrocrffnbzjaaae.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc'

// Read the migration file
const migrationPath = join(__dirname, '..', 'migrations', '016_grant_auth_schema_access.sql')
const sql = readFileSync(migrationPath, 'utf-8')

console.log('🚀 Applying Auth Schema Permissions...\n')
console.log('Migration file:', migrationPath)
console.log('Supabase URL:', SUPABASE_URL)
console.log('\nSQL to execute:')
console.log('─'.repeat(60))
console.log(sql)
console.log('─'.repeat(60))

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Execute the SQL
async function applyMigration() {
  try {
    console.log('\n⏳ Executing migration...\n')

    const { data, error } = await supabase.rpc('exec', { sql })

    if (error) {
      console.error('❌ Error executing migration:', error)
      process.exit(1)
    }

    console.log('✅ Migration applied successfully!')
    console.log('\nYou can now query auth.users in the SQL Editor')
    console.log('\nTest with this query:')
    console.log('  SELECT id, email, created_at FROM auth.users LIMIT 5;')

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    console.error('\n📋 Manual execution required:')
    console.error('1. Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new')
    console.error('2. Copy and paste the SQL from migrations/016_grant_auth_schema_access.sql')
    console.error('3. Click RUN')
    process.exit(1)
  }
}

applyMigration()
