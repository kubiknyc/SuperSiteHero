#!/usr/bin/env node
/**
 * Push migration using Supabase CLI with automated token setup
 */

import { execSync } from 'child_process'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config()

const PROJECT_REF = 'nxlznnrocrffnbzjaaae'
const MIGRATION_FILE = 'migrations/044_enable_auto_user_creation.sql'

console.log('🚀 Supabase Migration Push Tool')
console.log('================================\n')

// Check if migration file exists
if (!fs.existsSync(MIGRATION_FILE)) {
  console.error(`❌ Migration file not found: ${MIGRATION_FILE}`)
  process.exit(1)
}

console.log(`📋 Migration: ${MIGRATION_FILE}`)
console.log(`🎯 Project: ${PROJECT_REF}\n`)

// Method 1: Try using existing access token
if (process.env.SUPABASE_ACCESS_TOKEN) {
  console.log('✓ Found SUPABASE_ACCESS_TOKEN in environment')
  console.log('Attempting to push migration...\n')

  try {
    execSync(`npx supabase link --project-ref ${PROJECT_REF}`, {
      stdio: 'inherit',
      env: { ...process.env }
    })

    execSync('npx supabase db push', {
      stdio: 'inherit',
      env: { ...process.env }
    })

    console.log('\n✅ Migration pushed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Failed to push migration with access token')
  }
}

// Method 2: Try using database URL if we have the password
if (process.env.SUPABASE_DB_PASSWORD) {
  console.log('✓ Found SUPABASE_DB_PASSWORD in environment')
  console.log('Attempting to push migration via direct database connection...\n')

  const dbUrl = `postgresql://postgres.${PROJECT_REF}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

  try {
    execSync(`npx supabase db push --db-url "${dbUrl}"`, {
      stdio: 'inherit'
    })

    console.log('\n✅ Migration pushed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Failed to push migration with database URL')
  }
}

// If we get here, we need manual intervention
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('⚠️  Automatic migration push failed')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

console.log('To push this migration, you need ONE of the following:\n')

console.log('Option 1: Get Supabase Access Token')
console.log('  1. Go to: https://app.supabase.com/account/tokens')
console.log('  2. Generate a new access token')
console.log('  3. Add to .env file:')
console.log('     SUPABASE_ACCESS_TOKEN=your_token_here')
console.log('  4. Run: npx tsx scripts/push-migration.ts\n')

console.log('Option 2: Get Database Password')
console.log('  1. Go to: https://app.supabase.com/project/nxlznnrocrffnbzjaaae/settings/database')
console.log('  2. Copy your database password')
console.log('  3. Add to .env file:')
console.log('     SUPABASE_DB_PASSWORD=your_password_here')
console.log('  4. Run: npx tsx scripts/push-migration.ts\n')

console.log('Option 3: Use psql directly')
console.log('  If you have psql installed:')
console.log(`  psql "postgresql://postgres:[PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres" -f ${MIGRATION_FILE}\n`)

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

process.exit(1)
