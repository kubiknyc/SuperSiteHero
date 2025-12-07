#!/usr/bin/env node
/**
 * Apply Migrations via Supabase Management API
 * Uses the SUPABASE_ACCESS_TOKEN for database operations
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase project details
const PROJECT_REF = 'nxlznnrocrffnbzjaaae'
const ACCESS_TOKEN = 'sbp_085bac04acec4712ff695469ed2b68388c10a16f'

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

async function executeSQL(sql, migrationName) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  return await response.json()
}

async function main() {
  console.log('='.repeat(70))
  console.log('Applying Tier 1 & Tier 2 Database Migrations (048-053)')
  console.log('Using Supabase Management API')
  console.log('='.repeat(70))
  console.log('\nMigrations to apply:')
  migrations.forEach(m => console.log(`  - ${m.name}`))
  console.log('')

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
      const result = await executeSQL(sql, migration.name)
      console.log(`SUCCESS: ${migration.name}`)
      if (result && result.length > 0) {
        console.log(`  Result: ${JSON.stringify(result).substring(0, 100)}`)
      }
      console.log('')
      applied.push(migration.name)
    } catch (error) {
      const errorMsg = error.message || String(error)
      // Check if it's a "already exists" type error
      if (errorMsg.includes('already exists') ||
          errorMsg.includes('duplicate') ||
          errorMsg.includes('42P07')) {
        console.log(`SKIPPED (already applied): ${migration.name}`)
        console.log(`  ${errorMsg.substring(0, 100)}\n`)
        skipped.push(migration.name)
      } else {
        console.error(`FAILED: ${migration.name}`)
        console.error(`  Error: ${errorMsg.substring(0, 200)}\n`)
        failed.push({ name: migration.name, error: errorMsg })
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
    failed.forEach(m => console.log(`  X ${m.name}`))
  }

  console.log('\n' + '='.repeat(70))
  if (failed.length === 0) {
    console.log('MIGRATIONS COMPLETED!')
  } else {
    console.log('SOME MIGRATIONS FAILED - Manual intervention may be required')
    console.log('Dashboard: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql')
  }
  console.log('='.repeat(70))
}

main().catch(console.error)
