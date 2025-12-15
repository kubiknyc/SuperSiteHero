/**
 * Migration Status Check Script
 *
 * This script helps identify which migrations need to be applied to Supabase.
 * Run with: npx tsx scripts/check-migration-status.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Critical tables that should exist for each feature
const CRITICAL_TABLES = {
  messaging: {
    tables: ['conversations', 'conversation_participants', 'messages', 'message_reactions'],
    migrations: ['029_messaging_system.sql', '039_enhance_messaging_system.sql'],
    alternativeTables: ['chat_channels', 'chat_channel_members', 'chat_messages'], // Old schema
  },
  approvals: {
    tables: ['approval_workflows', 'approval_steps', 'approval_requests', 'approval_actions'],
    migrations: ['023_approval_workflows.sql'],
  },
  checklists: {
    tables: ['checklist_templates', 'checklists', 'checklist_template_items', 'checklist_responses'],
    migrations: ['007_tasks_and_checklists.sql', '024_enhanced_inspection_checklists.sql'],
  },
  safety: {
    tables: ['safety_incidents', 'safety_incident_people', 'safety_incident_photos', 'safety_incident_corrective_actions'],
    migrations: ['028_safety_incidents.sql'],
  },
}

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select('id').limit(1)
    // If no error or error is about RLS (not missing table), table exists
    if (!error) {return true}
    if (error.code === '42501') {return true} // RLS error means table exists
    if (error.code === '42P01') {return false} // Table doesn't exist
    if (error.message?.includes('does not exist')) {return false}
    return true // Assume exists for other errors
  } catch {
    return false
  }
}

async function main() {
  console.log('🔍 Checking Migration Status for SuperSiteHero\n')
  console.log(`📡 Supabase URL: ${supabaseUrl}\n`)
  console.log('='.repeat(60))

  let hasIssues = false

  for (const [feature, config] of Object.entries(CRITICAL_TABLES)) {
    console.log(`\n📦 ${feature.toUpperCase()}`)
    console.log('-'.repeat(40))

    const missingTables: string[] = []
    const existingTables: string[] = []

    for (const table of config.tables) {
      const exists = await checkTableExists(table)
      if (exists) {
        existingTables.push(table)
        console.log(`  ✅ ${table}`)
      } else {
        missingTables.push(table)
        console.log(`  ❌ ${table} - MISSING`)
      }
    }

    // Check for alternative schema (messaging)
    if ('alternativeTables' in config && missingTables.length > 0) {
      console.log(`\n  🔄 Checking alternative schema...`)
      let altExists = 0
      for (const altTable of config.alternativeTables) {
        const exists = await checkTableExists(altTable)
        if (exists) {
          console.log(`  ⚠️  ${altTable} - EXISTS (old schema)`)
          altExists++
        }
      }
      if (altExists > 0) {
        console.log(`\n  ⚠️  SCHEMA MISMATCH DETECTED!`)
        console.log(`     Code expects: ${config.tables.join(', ')}`)
        console.log(`     Database has: ${config.alternativeTables.join(', ')}`)
        console.log(`     Action: Apply migrations ${config.migrations.join(', ')}`)
      }
    }

    if (missingTables.length > 0) {
      hasIssues = true
      console.log(`\n  📋 Required migrations: ${config.migrations.join(', ')}`)
    } else {
      console.log(`\n  ✅ All tables exist for ${feature}`)
    }
  }

  console.log('\n' + '='.repeat(60))

  if (hasIssues) {
    console.log('\n🚨 ACTION REQUIRED:')
    console.log('   Some migrations need to be applied. See MIGRATION_INSTRUCTIONS.md')
    console.log('\n   Quick commands:')
    console.log('   1. npx supabase link --project-ref <your-project-ref>')
    console.log('   2. npx supabase db push')
    console.log('   3. npx supabase gen types typescript > src/types/database.ts')
  } else {
    console.log('\n✅ All critical tables exist! Database schema looks complete.')
  }

  console.log('\n')
}

main().catch(console.error)
