/**
 * Development Database Cleanup Script
 *
 * WARNING: This script deletes ALL user data from the database
 * Only run this on LOCAL DEVELOPMENT environment
 *
 * Usage:
 *   npx tsx scripts/clean-dev-database.ts
 *
 * Or add to package.json:
 *   "scripts": { "db:clean": "tsx scripts/clean-dev-database.ts" }
 *   npm run db:clean
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

async function confirmAction(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(
      `${colors.yellow}${colors.bold}WARNING: This will delete ALL users and data from your database!${colors.reset}\n` +
      `Are you sure you want to proceed? Type 'DELETE ALL DATA' to confirm: `,
      (answer) => {
        rl.close()
        resolve(answer === 'DELETE ALL DATA')
      }
    )
  })
}

async function main() {
  console.log(`${colors.cyan}${colors.bold}==============================================`)
  console.log('DEVELOPMENT DATABASE CLEANUP')
  console.log(`==============================================${colors.reset}\n`)

  // Check environment
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(`${colors.red}Error: Missing Supabase configuration${colors.reset}`)
    console.error('Please set the following environment variables:')
    console.error('  - VITE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)')
    console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Safety check - ensure this is not production
  if (supabaseUrl.includes('prod') || supabaseUrl.includes('production')) {
    console.error(`${colors.red}${colors.bold}CRITICAL ERROR: This appears to be a PRODUCTION database!${colors.reset}`)
    console.error('This script can only be run on local development databases.')
    console.error(`URL detected: ${supabaseUrl}`)
    process.exit(1)
  }

  console.log(`Database URL: ${colors.cyan}${supabaseUrl}${colors.reset}`)
  console.log(`Environment: ${colors.green}DEVELOPMENT${colors.reset}\n`)

  // Confirm action
  const confirmed = await confirmAction()

  if (!confirmed) {
    console.log(`\n${colors.yellow}Operation cancelled.${colors.reset}`)
    process.exit(0)
  }

  console.log(`\n${colors.cyan}Starting database cleanup...${colors.reset}\n`)

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Read the SQL cleanup script
  const sqlFilePath = path.join(__dirname, 'clean-dev-database.sql')
  const sqlScript = fs.readFileSync(sqlFilePath, 'utf-8')

  try {
    // Execute the cleanup script
    console.log('Executing cleanup script...')

    // Note: Supabase client doesn't support multi-statement SQL directly
    // We'll need to split and execute each statement
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let successCount = 0
    let errorCount = 0

    for (const statement of statements) {
      try {
        if (statement.toLowerCase().includes('delete from')) {
          const tableName = statement.match(/delete from\s+(\S+)/i)?.[1]
          process.stdout.write(`  Cleaning ${tableName}... `)

          // For auth.users, we need to use the admin API
          if (tableName === 'auth.users') {
            // Get all users and delete them one by one
            const { data: users } = await supabase.auth.admin.listUsers()
            if (users?.users) {
              for (const user of users.users) {
                await supabase.auth.admin.deleteUser(user.id)
              }
              console.log(`${colors.green}✓${colors.reset} (${users.users.length} users)`)
            }
          } else {
            // For other tables, execute the DELETE statement
            const { error } = await supabase.rpc('exec_sql', { sql: statement })
            if (error) {
              console.log(`${colors.red}✗${colors.reset}`)
              errorCount++
            } else {
              console.log(`${colors.green}✓${colors.reset}`)
              successCount++
            }
          }
        }
      } catch (err) {
        console.log(`${colors.red}✗${colors.reset}`)
        errorCount++
      }
    }

    console.log(`\n${colors.green}${colors.bold}==============================================`)
    console.log('CLEANUP COMPLETE!')
    console.log(`==============================================${colors.reset}`)
    console.log(`  Successful operations: ${colors.green}${successCount}${colors.reset}`)
    if (errorCount > 0) {
      console.log(`  Failed operations: ${colors.red}${errorCount}${colors.reset}`)
    }
    console.log(`\n${colors.cyan}All user data has been deleted from the database.`)
    console.log(`Database schema and structure have been preserved.${colors.reset}\n`)

  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}Error during cleanup:${colors.reset}`)
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  process.exit(1)
})
