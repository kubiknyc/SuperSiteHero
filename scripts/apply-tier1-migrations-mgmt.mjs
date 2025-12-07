#!/usr/bin/env node
/**
 * Apply Tier 1 Feature Migrations using Supabase Management API
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase configuration
const PROJECT_REF = 'nxlznnrocrffnbzjaaae'
const ACCESS_TOKEN = 'sbp_085bac04acec4712ff695469ed2b68388c10a16f'

const migrations = [
  { name: '048_cost_codes.sql', description: 'Cost Codes System' },
  { name: '048b_seed_csi_cost_codes.sql', description: 'CSI MasterFormat Seed Functions' },
  { name: '049_dedicated_rfis.sql', description: 'RFI System Overhaul' },
  { name: '050_dedicated_submittals.sql', description: 'Submittal System Overhaul' },
  { name: '051_equipment_tracking.sql', description: 'Equipment Tracking' },
  { name: '052_enhanced_change_orders.sql', description: 'Enhanced Change Orders' },
]

async function executeSQL(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql })
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API Error: ${response.status} - ${text}`)
  }

  return response.json()
}

async function main() {
  console.log('='.repeat(70))
  console.log('🚀 Applying Tier 1 Feature Migrations (048-052)')
  console.log('='.repeat(70))
  console.log('\nMigrations to apply:')
  migrations.forEach((m, i) => console.log(`  ${i + 1}. ${m.description} (${m.name})`))
  console.log('')

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
      console.log('📝 Executing migration...')
      const result = await executeSQL(sql)
      console.log('✅ Applied successfully\n')
      successCount++
    } catch (error) {
      if (error.message.includes('already exists') ||
          error.message.includes('duplicate')) {
        console.log('⚠️  Objects already exist, continuing...\n')
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

  try {
    const tableCheck = await executeSQL(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'cost_codes', 'project_budgets', 'cost_transactions',
          'rfis', 'rfi_attachments', 'rfi_comments', 'rfi_history',
          'submittals', 'submittal_items', 'submittal_attachments',
          'equipment', 'equipment_assignments', 'equipment_logs',
          'change_orders', 'change_order_items'
        )
      ORDER BY table_name
    `)

    console.log('\n✅ Tables found:', JSON.stringify(tableCheck, null, 2))
  } catch (e) {
    console.log('⚠️  Could not verify tables:', e.message)
  }

  console.log('\n' + '='.repeat(70))
  console.log('🎉 MIGRATION PROCESS COMPLETE!')
  console.log('='.repeat(70))
  console.log(`\n✅ Attempted: ${successCount + skipCount} migrations`)
  console.log('\n' + '='.repeat(70))
}

main().catch(console.error)
