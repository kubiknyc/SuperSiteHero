#!/usr/bin/env node
/**
 * Apply Migrations 048-053 for Tier 1 and Tier 2 features
 *
 * Migrations:
 * - 048: Cost Codes
 * - 048b: CSI MasterFormat seeding
 * - 049: Dedicated RFIs
 * - 050: Dedicated Submittals
 * - 051: Equipment Tracking
 * - 052: Enhanced Change Orders
 * - 053: Meeting Enhancements
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Client } = pg

// PostgreSQL connection string
const connectionString = 'postgresql://postgres.nxlznnrocrffnbzjaaae:1VXRyuU7iFbSnsgX@aws-0-us-east-1.pooler.supabase.com:6543/postgres'

// Migrations to apply in order
const migrations = [
  { file: '048_cost_codes.sql', name: 'Cost Codes System' },
  { file: '048b_seed_csi_cost_codes.sql', name: 'CSI MasterFormat Seeding' },
  { file: '049_dedicated_rfis.sql', name: 'Dedicated RFIs' },
  { file: '050_dedicated_submittals.sql', name: 'Dedicated Submittals' },
  { file: '051_equipment_tracking.sql', name: 'Equipment Tracking' },
  { file: '052_enhanced_change_orders.sql', name: 'Enhanced Change Orders' },
  { file: '053_meeting_enhancements.sql', name: 'Meeting Enhancements' },
]

async function main() {
  console.log('='.repeat(70))
  console.log('Applying Tier 1 & Tier 2 Database Migrations (048-053)')
  console.log('='.repeat(70))
  console.log('\nThis will add the following features:')
  migrations.forEach(m => console.log(`  - ${m.name}`))
  console.log('')

  // Create PostgreSQL client with SSL
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('Connecting to Supabase database...')
    await client.connect()
    console.log('Connected successfully\n')

    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
    const applied = []
    const failed = []
    const skipped = []

    for (const migration of migrations) {
      console.log('='.repeat(70))
      console.log(`MIGRATION: ${migration.name}`)
      console.log(`File: ${migration.file}`)
      console.log('='.repeat(70))

      const migrationPath = path.join(migrationsDir, migration.file)

      // Check if file exists
      if (!fs.existsSync(migrationPath)) {
        console.log(`Skipped - file not found: ${migration.file}\n`)
        skipped.push(migration.name)
        continue
      }

      const sql = fs.readFileSync(migrationPath, 'utf-8')
      console.log('Applying migration...')

      try {
        await client.query(sql)
        console.log(`SUCCESS: ${migration.name}\n`)
        applied.push(migration.name)
      } catch (error) {
        // Check if it's a "already exists" type error - we can continue
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate key') ||
            error.message.includes('relation') && error.message.includes('already exists')) {
          console.log(`SKIPPED (already applied): ${migration.name}`)
          console.log(`  Reason: ${error.message.substring(0, 100)}\n`)
          skipped.push(migration.name)
        } else {
          console.error(`FAILED: ${migration.name}`)
          console.error(`  Error: ${error.message}\n`)
          failed.push({ name: migration.name, error: error.message })
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70))
    console.log('MIGRATION SUMMARY')
    console.log('='.repeat(70))

    if (applied.length > 0) {
      console.log('\nApplied successfully:')
      applied.forEach(m => console.log(`  + ${m}`))
    }

    if (skipped.length > 0) {
      console.log('\nSkipped (already applied or not found):')
      skipped.forEach(m => console.log(`  ~ ${m}`))
    }

    if (failed.length > 0) {
      console.log('\nFailed:')
      failed.forEach(m => console.log(`  X ${m.name}: ${m.error.substring(0, 80)}`))
    }

    console.log('\n' + '='.repeat(70))
    if (failed.length === 0) {
      console.log('MIGRATIONS COMPLETED!')
      console.log('='.repeat(70))
      console.log('\nNext steps:')
      console.log('  1. Regenerate TypeScript types: npx supabase gen types typescript')
      console.log('  2. Update src/types/database.ts with generated types')
      console.log('  3. Run type-check: npm run type-check')
    } else {
      console.log('SOME MIGRATIONS FAILED')
      console.log('='.repeat(70))
      console.log('\nPlease check the errors above and apply manually if needed.')
      console.log('Manual apply: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql')
    }
    console.log('\n' + '='.repeat(70))

  } catch (error) {
    console.error('\n' + '='.repeat(70))
    console.error('ERROR')
    console.error('='.repeat(70))
    console.error('Failed to apply migrations:', error.message)
    console.error('\nManual migration URL:')
    console.error('https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql')
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
