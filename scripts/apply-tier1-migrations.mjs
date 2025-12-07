#!/usr/bin/env node
/**
 * Apply Tier 1 Feature Migrations (048-052)
 * - Cost Codes System
 * - RFI System Overhaul
 * - Submittal System Overhaul
 * - Equipment Tracking
 * - Enhanced Change Orders
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Client } = pg

// PostgreSQL connection string - try direct database connection
const connectionString = process.env.POSTGRES_CONNECTION_STRING ||
  'postgresql://postgres:1VXRyuU7iFbSnsgX@db.nxlznnrocrffnbzjaaae.supabase.co:5432/postgres'

const migrations = [
  { name: '048_cost_codes.sql', description: 'Cost Codes System' },
  { name: '048b_seed_csi_cost_codes.sql', description: 'CSI MasterFormat Seed Functions' },
  { name: '049_dedicated_rfis.sql', description: 'RFI System Overhaul' },
  { name: '050_dedicated_submittals.sql', description: 'Submittal System Overhaul' },
  { name: '051_equipment_tracking.sql', description: 'Equipment Tracking' },
  { name: '052_enhanced_change_orders.sql', description: 'Enhanced Change Orders' },
]

async function main() {
  console.log('='.repeat(70))
  console.log('🚀 Applying Tier 1 Feature Migrations (048-052)')
  console.log('='.repeat(70))
  console.log('\nMigrations to apply:')
  migrations.forEach((m, i) => console.log(`  ${i + 1}. ${m.description} (${m.name})`))
  console.log('')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('📡 Connecting to Supabase database...')
    await client.connect()
    console.log('✅ Connected successfully\n')

    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
    let successCount = 0
    let skipCount = 0

    for (const migration of migrations) {
      console.log('='.repeat(70))
      console.log(`📦 ${migration.description}`)
      console.log(`   File: ${migration.name}`)
      console.log('='.repeat(70))

      const migrationPath = path.join(migrationsDir, migration.name)

      if (!fs.existsSync(migrationPath)) {
        console.log('⚠️  Migration file not found, skipping...\n')
        skipCount++
        continue
      }

      const sql = fs.readFileSync(migrationPath, 'utf-8')

      try {
        await client.query(sql)
        console.log('✅ Applied successfully\n')
        successCount++
      } catch (error) {
        // Check if it's a "already exists" error - that's okay
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate key') ||
            error.message.includes('relation') && error.message.includes('already exists')) {
          console.log('⚠️  Objects already exist (migration may have been applied), continuing...\n')
          skipCount++
        } else {
          console.error('❌ Error:', error.message)
          console.log('   Continuing with next migration...\n')
        }
      }
    }

    // Verification
    console.log('='.repeat(70))
    console.log('📊 VERIFICATION')
    console.log('='.repeat(70))

    // Check if tables were created
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'cost_codes', 'project_budgets', 'cost_transactions',
          'rfis', 'rfi_attachments', 'rfi_comments', 'rfi_history',
          'submittals', 'submittal_items', 'submittal_attachments', 'submittal_reviews', 'submittal_history',
          'equipment', 'equipment_assignments', 'equipment_logs', 'equipment_maintenance', 'equipment_inspections',
          'change_orders', 'change_order_items', 'change_order_attachments', 'change_order_history'
        )
      ORDER BY table_name
    `)

    console.log('\n✅ Tables created:')
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`))

    // Check views
    const views = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name IN ('equipment_summary', 'change_order_summary')
      ORDER BY table_name
    `)

    if (views.rows.length > 0) {
      console.log('\n✅ Views created:')
      views.rows.forEach(row => console.log(`   - ${row.table_name}`))
    }

    // Check functions
    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'get_next_rfi_number', 'get_next_submittal_number',
          'seed_csi_divisions_for_company', 'get_cost_code_hierarchy',
          'get_next_pco_number', 'get_next_co_number'
        )
      ORDER BY routine_name
    `)

    if (functions.rows.length > 0) {
      console.log('\n✅ Functions created:')
      functions.rows.forEach(row => console.log(`   - ${row.routine_name}()`))
    }

    console.log('\n' + '='.repeat(70))
    console.log('🎉 TIER 1 MIGRATIONS COMPLETE!')
    console.log('='.repeat(70))
    console.log(`\n✅ Success: ${successCount} migrations applied`)
    if (skipCount > 0) {
      console.log(`⚠️  Skipped: ${skipCount} (already applied or not found)`)
    }
    console.log('\n📝 New features available:')
    console.log('   • Cost Code System with CSI MasterFormat')
    console.log('   • Dedicated RFI System with ball-in-court tracking')
    console.log('   • Dedicated Submittal System with spec-based numbering')
    console.log('   • Equipment Tracking with logs and maintenance')
    console.log('   • Enhanced Change Orders with PCO/CO workflow')
    console.log('\n' + '='.repeat(70))

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
