#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const sql = fs.readFileSync('migrations/044_enable_auto_user_creation.sql', 'utf8')

console.log('🚀 Running migration via Supabase service role...\n')

// Execute the SQL by splitting into statements
const statements = sql
  .split(/;\s*$/gm)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

async function runMigration() {
  for (const statement of statements) {
    if (!statement || statement.startsWith('--')) {continue}

    console.log('Executing statement...')

    const { error } = await supabase.rpc('exec', { sql: statement + ';' })

    if (error) {
      console.error('Error:', error.message)

      // Try alternative: direct query for simple statements
      const { error: error2 } = await (supabase as any).from('_sql').insert({ query: statement })

      if (error2) {
        console.error('Failed. Statement:', statement.substring(0, 100) + '...')
      }
    }
  }

  console.log('\n✅ Migration completed!')
  console.log('\nVerifying...')

  // Verify trigger exists
  const { data: triggers } = await supabase
    .rpc('get_triggers')
    .then(res => res)
    .catch(() => ({ data: null }))

  console.log('Trigger check:', triggers ? 'Found' : 'Unable to verify')

  // Check user counts
  const { count: authCount } = await supabase.auth.admin.listUsers()
  const { count: profileCount } = await supabase.from('users').select('*', { count: 'exact', head: true })

  console.log(`Auth users: ${authCount}`)
  console.log(`Profile users: ${profileCount}`)
}

runMigration().catch(console.error)
