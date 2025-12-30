/**
 * Create a test RFI for PDF export testing
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const COMPANY_ID = '3c146527-62a9-4f4d-97db-c7546da9dfed'
const TEST_USER_EMAIL = 'test@example.com'

async function createTestRFI() {
  console.log('Creating test RFI for PDF export testing...\n')

  // Get test user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', TEST_USER_EMAIL)
    .single()

  if (!user) {
    console.error('❌ Test user not found')
    return
  }

  // Get first project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', COMPANY_ID)
    .limit(1)
    .single()

  if (!project) {
    console.error('❌ No projects found')
    return
  }

  console.log(`✅ Using project: ${project.name}`)
  console.log(`✅ User: ${TEST_USER_EMAIL}\n`)

  // Create RFI in rfis table
  const { data: rfi, error } = await supabase
    .from('rfis')
    .insert({
      project_id: project.id,
      company_id: COMPANY_ID,
      rfi_number: 1,
      subject: 'Test RFI - HVAC System Clarification',
      question: 'Need clarification on HVAC ductwork routing in mechanical room on Level 2. Existing drawings show conflict with structural beams. Please advise on preferred routing path.',
      spec_section: '23 00 00',
      location: 'Level 2 - Mechanical Room',
      status: 'submitted',
      priority: 'high',
      submitted_by: user.id,
      assigned_to: user.id,
      date_required: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to create RFI:', error.message)
    return
  }

  console.log(`✅ Created RFI: "${rfi.subject}"`)
  console.log(`   ID: ${rfi.id}`)
  console.log(`   Number: RFI-${String(rfi.rfi_number).padStart(3, '0')}`)
  console.log(`   Status: ${rfi.status}`)
  console.log(`   Priority: ${rfi.priority}\n`)

  console.log('💡 To test PDF export:')
  console.log('   1. Go to: http://localhost:5173/rfis')
  console.log(`   2. Select project: "${project.name}"`)
  console.log(`   3. Open the RFI: "${rfi.subject}"`)
  console.log('   4. Click the PDF export button')
  console.log('   5. Verify JobSight branding appears in the PDF\n')
}

createTestRFI()
