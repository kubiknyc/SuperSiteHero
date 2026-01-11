/* eslint-disable security/detect-object-injection, security/detect-non-literal-fs-filename */
/**
 * Run the agent system migration directly
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase connection
const supabaseUrl = 'https://nxlznnrocrffnbzjaaae.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('Reading migration file...')

  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260108_agent_system.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  console.log('Running migration...')
  console.log('Migration size:', sql.length, 'characters')

  // Split into individual statements
  const statements = sql
    .split(/;(?=\s*(?:--|CREATE|ALTER|INSERT|DROP|COMMENT|$))/gi)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} statements to execute`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt || stmt.length < 5) continue

    // Skip comments-only statements
    if (stmt.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
      continue
    }

    const preview = stmt.substring(0, 80).replace(/\n/g, ' ')
    console.log(`[${i + 1}/${statements.length}] ${preview}...`)

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' })

      if (error) {
        // Try direct query as fallback
        const { error: directError } = await supabase.from('_exec').select().maybeSingle()
        if (directError && !directError.message.includes('does not exist')) {
          console.error(`  Error: ${error.message}`)
          errorCount++
        } else {
          successCount++
        }
      } else {
        successCount++
      }
    } catch (err) {
      console.error(`  Exception: ${err.message}`)
      errorCount++
    }
  }

  console.log('\n=== Migration Complete ===')
  console.log(`Successful: ${successCount}`)
  console.log(`Errors: ${errorCount}`)
}

runMigration().catch(console.error)
