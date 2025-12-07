#!/usr/bin/env node
// Autonomous Auth Schema Migration Application
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

console.log('🚀 Autonomous Auth Schema Permission Migration')
console.log('='.repeat(60))
console.log('')

// Read migration file
const migrationPath = join(__dirname, '..', 'migrations', '016_grant_auth_schema_access.sql')
console.log('📄 Reading migration file:', migrationPath)

let sql
try {
  sql = readFileSync(migrationPath, 'utf-8')
  console.log('✅ Migration file loaded')
  console.log('')
} catch (err) {
  console.error('❌ Error reading migration file:', err.message)
  process.exit(1)
}

// Execute migration
async function applyMigration() {
  const client = new Client({
    connectionString: POSTGRES_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('⏳ Connecting to database...')
    await client.connect()
    console.log('✅ Connected to Supabase PostgreSQL')
    console.log('')

    console.log('⏳ Executing migration...')
    console.log('─'.repeat(60))

    // Execute the entire SQL
    await client.query(sql)

    console.log('─'.repeat(60))
    console.log('✅ Migration executed successfully!')
    console.log('')
    console.log('🎉 Auth schema permissions granted!')
    console.log('')
    console.log('You can now query auth.users in the SQL Editor')
    console.log('')
    console.log('🧪 Test with this query:')
    console.log('   SELECT id, email, created_at FROM auth.users LIMIT 5;')
    console.log('')

  } catch (err) {
    console.error('❌ Error executing migration:', err.message)
    console.error('')
    console.error('This is expected - Supabase connection pooler restricts GRANT operations.')
    console.error('')
    console.error('✅ Fallback: Opening SQL Editor for manual execution...')
    console.error('')

    // Open browser and copy to clipboard
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      // Open browser
      await execAsync('powershell -Command "Start-Process \'https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new\'"')
      console.log('🌐 SQL Editor opened in browser')

      // Copy to clipboard
      await execAsync(`powershell -Command "Get-Content '${migrationPath}' | Set-Clipboard"`)
      console.log('📋 SQL copied to clipboard')
      console.log('')
      console.log('👉 Next steps:')
      console.log('   1. Paste the SQL (Ctrl+V)')
      console.log('   2. Click RUN')
      console.log('   3. Done!')

    } catch (fallbackErr) {
      console.error('Manual action required:')
      console.error('1. Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new')
      console.error('2. Copy SQL from:', migrationPath)
      console.error('3. Paste and click RUN')
    }

  } finally {
    await client.end()
  }
}

// Check if pg module is installed
try {
  applyMigration()
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.log('📦 Installing required module: pg...')
    const { execSync } = await import('child_process')
    execSync('npm install pg', { stdio: 'inherit' })
    console.log('✅ Module installed, retrying...')
    applyMigration()
  } else {
    throw err
  }
}
