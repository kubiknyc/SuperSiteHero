/**
 * Grant Test User Access to Seeded Data
 *
 * This script:
 * 1. Associates test user with the seeded company
 * 2. Adds test user to all projects in the seeded company
 * 3. Enables test user to view/edit all seeded data via existing RLS policies
 *
 * Run with: npx tsx scripts/grant-test-user-access.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const COMPANY_ID = '3c146527-62a9-4f4d-97db-c7546da9dfed'
const TEST_USER_EMAIL = 'test@example.com'

async function grantAccess() {
  console.log('═══════════════════════════════════════════')
  console.log('   Grant Test User Access to Seeded Data')
  console.log('═══════════════════════════════════════════\n')

  // Step 1: Get test user
  const { data: testUser, error: userError } = await supabase
    .from('users')
    .select('id, email, company_id')
    .eq('email', TEST_USER_EMAIL)
    .single()

  if (userError || !testUser) {
    console.error('❌ Test user not found:', userError?.message)
    console.error(`   Looking for: ${TEST_USER_EMAIL}`)
    process.exit(1)
  }

  console.log(`✅ Found test user: ${testUser.email}`)
  console.log(`   User ID: ${testUser.id}`)
  console.log(`   Current company: ${testUser.company_id || 'none'}\n`)

  // Step 2: Update user's company_id
  if (testUser.company_id !== COMPANY_ID) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ company_id: COMPANY_ID, updated_at: new Date().toISOString() })
      .eq('id', testUser.id)

    if (updateError) {
      console.error('❌ Failed to update user company:', updateError.message)
      process.exit(1)
    }

    console.log(`✅ Updated user company to: ${COMPANY_ID}\n`)
  } else {
    console.log(`✓ User already belongs to company: ${COMPANY_ID}\n`)
  }

  // Step 3: Get all projects for this company
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', COMPANY_ID)

  if (projectsError || !projects || projects.length === 0) {
    console.error('❌ No projects found for company:', projectsError?.message)
    process.exit(1)
  }

  console.log(`✅ Found ${projects.length} projects in company:\n`)
  projects.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}`)
  })

  // Step 4: Add user to all projects
  console.log(`\n📝 Adding test user to all projects...\n`)

  let successCount = 0
  let skippedCount = 0

  for (const project of projects) {
    // Check if user is already assigned
    const { data: existing } = await supabase
      .from('project_users')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', testUser.id)
      .single()

    if (existing) {
      console.log(`   ✓ Already assigned to: ${project.name}`)
      skippedCount++
      continue
    }

    // Add user to project
    const { error: insertError } = await supabase
      .from('project_users')
      .insert({
        project_id: project.id,
        user_id: testUser.id,
        project_role: 'superintendent',
        can_edit: true,
        can_delete: true,
      })

    if (insertError) {
      console.error(`   ❌ Failed to add to ${project.name}:`, insertError.message)
    } else {
      console.log(`   ✅ Added to: ${project.name}`)
      successCount++
    }
  }

  // Step 5: Verify access
  console.log('\n📊 Summary:')
  console.log(`   ✅ Successfully added to ${successCount} projects`)
  console.log(`   ✓ Already assigned to ${skippedCount} projects`)
  console.log(`   📁 Total accessible projects: ${successCount + skippedCount}\n`)

  // Verify RFIs are accessible
  const { data: rfis, error: rfisError } = await supabase
    .from('workflow_items')
    .select('id, title')
    .eq('type', 'rfi')
    .in('project_id', projects.map(p => p.id))
    .limit(5)

  if (!rfisError && rfis) {
    console.log(`✅ Test user can now access ${rfis.length}+ RFIs`)
  }

  // Verify Daily Reports are accessible
  const { data: reports, error: reportsError } = await supabase
    .from('daily_reports')
    .select('id, report_number')
    .in('project_id', projects.map(p => p.id))
    .limit(5)

  if (!reportsError && reports) {
    console.log(`✅ Test user can now access ${reports.length}+ Daily Reports`)
  }

  console.log('\n═══════════════════════════════════════════')
  console.log('   ✅ Test user access granted successfully!')
  console.log('═══════════════════════════════════════════\n')

  console.log('💡 Next steps:')
  console.log('   1. Refresh the browser (F5)')
  console.log('   2. Navigate to any module (RFIs, Daily Reports, etc.)')
  console.log('   3. Select "Downtown Office Tower" project')
  console.log('   4. You should now see the seeded test data\n')
}

grantAccess().catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
