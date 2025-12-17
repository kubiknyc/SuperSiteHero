/**
 * Check what test data was actually seeded
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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const COMPANY_ID = '3c146527-62a9-4f4d-97db-c7546da9dfed'

async function checkData() {
  console.log('Checking seeded test data...\n')

  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', COMPANY_ID)

  console.log(`✅ Projects (${projects?.length || 0}):`)
  projects?.forEach((p, i) => console.log(`   ${i + 1}. ${p.name} (${p.id})`))

  if (!projects || projects.length === 0) return

  const projectIds = projects.map(p => p.id)

  // Check RFIs
  const { data: rfis, count: rfiCount } = await supabase
    .from('workflow_items')
    .select('id, title, project_id', { count: 'exact' })
    .eq('type', 'rfi')
    .in('project_id', projectIds)

  console.log(`\n✅ RFIs (${rfiCount || 0}):`)
  rfis?.slice(0, 5).forEach((r, i) => {
    const project = projects.find(p => p.id === r.project_id)
    console.log(`   ${i + 1}. ${r.title} - ${project?.name}`)
  })

  // Check Submittals
  const { count: submittalCount } = await supabase
    .from('workflow_items')
    .select('id', { count: 'exact' })
    .eq('type', 'submittal')
    .in('project_id', projectIds)

  console.log(`\n✅ Submittals (${submittalCount || 0})`)

  // Check Change Orders
  const { count: coCount } = await supabase
    .from('workflow_items')
    .select('id', { count: 'exact' })
    .eq('type', 'change_order')
    .in('project_id', projectIds)

  console.log(`✅ Change Orders (${coCount || 0})`)

  // Check Daily Reports
  const { data: reports, count: reportCount } = await supabase
    .from('daily_reports')
    .select('id, report_number, project_id', { count: 'exact' })
    .in('project_id', projectIds)

  console.log(`\n✅ Daily Reports (${reportCount || 0}):`)
  reports?.slice(0, 5).forEach((r, i) => {
    const project = projects.find(p => p.id === r.project_id)
    console.log(`   ${i + 1}. ${r.report_number} - ${project?.name}`)
  })

  // Check Checklists
  const { count: checklistCount } = await supabase
    .from('checklist_executions')
    .select('id', { count: 'exact' })
    .in('project_id', projectIds)

  console.log(`\n✅ Checklist Executions (${checklistCount || 0})`)

  // Find a project with RFIs
  if (rfis && rfis.length > 0) {
    const firstRfi = rfis[0]
    const project = projects.find(p => p.id === firstRfi.project_id)
    console.log(`\n💡 To test PDF export:`)
    console.log(`   1. Go to RFIs page`)
    console.log(`   2. Select project: "${project?.name}"`)
    console.log(`   3. Open RFI: "${firstRfi.title}"`)
    console.log(`   4. Click PDF export button`)
  }
}

checkData()
