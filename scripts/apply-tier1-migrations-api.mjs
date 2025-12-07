#!/usr/bin/env node
/**
 * Apply Tier 1 Feature Migrations using Supabase REST API
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase configuration
const SUPABASE_URL = 'https://nxlznnrocrffnbzjaaae.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc'

const migrations = [
  { name: '048_cost_codes.sql', description: 'Cost Codes System' },
  { name: '048b_seed_csi_cost_codes.sql', description: 'CSI MasterFormat Seed Functions' },
  { name: '049_dedicated_rfis.sql', description: 'RFI System Overhaul' },
  { name: '050_dedicated_submittals.sql', description: 'Submittal System Overhaul' },
  { name: '051_equipment_tracking.sql', description: 'Equipment Tracking' },
  { name: '052_enhanced_change_orders.sql', description: 'Enhanced Change Orders' },
]

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql_query: sql })
  })

  if (!response.ok) {
    // Try executing directly via pg_query endpoint
    const response2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: sql
    })
    if (!response2.ok) {
      const text = await response.text()
      throw new Error(`API Error: ${response.status} - ${text}`)
    }
  }

  return response.json()
}

async function checkTableExists(tableName) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=0`,
    {
      method: 'HEAD',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    }
  )
  return response.ok
}

async function main() {
  console.log('='.repeat(70))
  console.log('🚀 Applying Tier 1 Feature Migrations (048-052)')
  console.log('='.repeat(70))

  // First, check which tables already exist
  console.log('\n📊 Checking existing tables...')

  const tablesToCheck = [
    'cost_codes', 'project_budgets', 'cost_transactions',
    'rfis', 'rfi_attachments', 'rfi_comments', 'rfi_history',
    'submittals', 'submittal_items', 'submittal_attachments',
    'equipment', 'equipment_assignments', 'equipment_logs',
    'change_orders', 'change_order_items'
  ]

  const existingTables = []
  const missingTables = []

  for (const table of tablesToCheck) {
    const exists = await checkTableExists(table)
    if (exists) {
      existingTables.push(table)
    } else {
      missingTables.push(table)
    }
  }

  console.log('\n✅ Existing tables:', existingTables.length > 0 ? existingTables.join(', ') : 'None')
  console.log('⚠️  Missing tables:', missingTables.length > 0 ? missingTables.join(', ') : 'None (all exist!)')

  if (missingTables.length === 0) {
    console.log('\n🎉 All Tier 1 feature tables already exist!')
    console.log('   Migrations have already been applied.')
    return
  }

  console.log('\n📋 Migrations need to be applied via Supabase SQL Editor:')
  console.log('   https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new')
  console.log('')

  // Output migration content for manual application
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')

  for (const migration of migrations) {
    const migrationPath = path.join(migrationsDir, migration.name)
    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️  ${migration.name} not found`)
      continue
    }
    console.log(`📦 ${migration.name} - ${migration.description}`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('📝 To apply migrations, copy each SQL file content to Supabase SQL Editor')
  console.log('   or use the direct PostgreSQL connection.')
  console.log('='.repeat(70))
}

main().catch(console.error)
