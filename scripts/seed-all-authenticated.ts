/**
 * Comprehensive Test Data Seeding Script (Authenticated Version)
 *
 * Uses authenticated user to seed data via anon key
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env files in order of priority
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const testEmail = process.env.TEST_USER_EMAIL || 'kubiknyc@gmail.com'
const testPassword = process.env.TEST_USER_PASSWORD || 'Alfa1346!'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions
const randomDate = (daysBack: number, daysForward = 0) => {
  const date = new Date()
  const offset = Math.floor(Math.random() * (daysBack + daysForward)) - daysBack
  date.setDate(date.getDate() + offset)
  return date.toISOString().split('T')[0]
}

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

// Data constants
const TRADES = ['Electrical', 'Plumbing', 'HVAC', 'Drywall', 'Framing', 'Concrete', 'Roofing', 'Flooring', 'Painting', 'Masonry']
const LOCATIONS = ['Building A - Floor 1', 'Building A - Floor 2', 'Building B - Floor 1', 'Parking Structure', 'Main Lobby', 'Mechanical Room', 'Roof Level', 'Basement']
const WEATHER = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Windy', 'Hot', 'Cold']
const INSPECTION_TYPES = ['Building', 'Electrical', 'Plumbing', 'Fire', 'HVAC', 'Structural', 'Final', 'Rough-In']
const PERMIT_TYPES = ['Building Permit', 'Electrical Permit', 'Plumbing Permit', 'Mechanical Permit', 'Fire Alarm Permit']

interface Context {
  userId: string
  companyId: string
  projectIds: string[]
}

async function authenticate(): Promise<Context> {
  console.log('🔐 Authenticating...')

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (authError) {
    console.error('Auth failed:', authError.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log(`✅ Authenticated as ${testEmail}`)

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single()

  const companyId = userProfile?.company_id || ''
  console.log(`   Company: ${companyId}`)

  // Get projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId)

  console.log(`   Projects: ${projects?.length || 0}`)

  return {
    userId,
    companyId,
    projectIds: projects?.map(p => p.id) || [],
  }
}

async function seedDailyReports(ctx: Context) {
  console.log('\n📋 Seeding daily reports...')

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 14; i++) {
      const reportDate = randomDate(14 + i, 0)
      const tempHigh = randomNumber(55, 95)

      const { error } = await supabase.from('daily_reports').upsert({
        project_id: projectId,
        report_date: reportDate,
        weather_condition: randomItem(WEATHER),
        temperature_high: tempHigh,
        temperature_low: tempHigh - randomNumber(10, 20),
        work_completed: `Work completed at ${randomItem(LOCATIONS)}. ${randomItem(TRADES)} crew active. Good progress made.`,
        total_workers: randomNumber(8, 35),
        reporter_id: ctx.userId,
        status: randomItem(['draft', 'submitted', 'approved']),
        observations: randomItem([null, 'Site conditions good', 'Minor delay due to weather', null]),
        issues: randomItem([null, 'Material delivery delayed', null, null]),
      }, { onConflict: 'project_id,report_date' })

      if (error && !error.message.includes('duplicate')) {
        console.log(`  ✗ ${error.message}`)
      }
    }
    console.log(`  ✓ Daily reports for project`)
  }
}

async function seedWorkflowItems(ctx: Context) {
  console.log('\n📝 Seeding RFIs, Submittals, Change Orders...')

  const rfiSubjects = [
    'Clarification on electrical panel location',
    'Foundation depth specification',
    'Door hardware conflict',
    'HVAC duct routing',
    'Window schedule discrepancy',
    'Structural connection detail',
  ]

  const submittals = [
    { title: 'Structural Steel Shop Drawings', spec: '05 12 00' },
    { title: 'Mechanical Equipment', spec: '23 00 00' },
    { title: 'Electrical Panel Schedule', spec: '26 24 16' },
    { title: 'Plumbing Fixtures', spec: '22 40 00' },
    { title: 'Roofing Materials', spec: '07 50 00' },
  ]

  for (const projectId of ctx.projectIds) {
    // RFIs
    for (let i = 0; i < 5; i++) {
      const subject = randomItem(rfiSubjects)
      await supabase.from('workflow_items').insert({
        project_id: projectId,
        workflow_type: 'rfi',
        item_number: `RFI-${String(i + 1).padStart(3, '0')}`,
        title: subject,
        description: `${subject}. Location: ${randomItem(LOCATIONS)}`,
        status: randomItem(['draft', 'pending_review', 'in_review', 'approved', 'closed']),
        priority: randomItem(['low', 'normal', 'high']),
        due_date: randomDate(-5, 14),
        created_by: ctx.userId,
      })
    }
    console.log(`  ✓ 5 RFIs`)

    // Submittals
    for (let i = 0; i < 5; i++) {
      const sub = randomItem(submittals)
      await supabase.from('workflow_items').insert({
        project_id: projectId,
        workflow_type: 'submittal',
        item_number: `SUB-${String(i + 1).padStart(3, '0')}`,
        title: sub.title,
        description: `Spec: ${sub.spec}`,
        status: randomItem(['draft', 'pending_review', 'approved', 'rejected']),
        priority: randomItem(['normal', 'high']),
        due_date: randomDate(-3, 21),
        spec_section: sub.spec,
        created_by: ctx.userId,
      })
    }
    console.log(`  ✓ 5 Submittals`)

    // Change Orders
    for (let i = 0; i < 3; i++) {
      await supabase.from('workflow_items').insert({
        project_id: projectId,
        workflow_type: 'change_order',
        item_number: `CO-${String(i + 1).padStart(3, '0')}`,
        title: `Change Order ${i + 1}`,
        description: `Owner requested change. Location: ${randomItem(LOCATIONS)}`,
        status: randomItem(['draft', 'pending_approval', 'approved']),
        priority: randomItem(['normal', 'high']),
        cost_impact: randomNumber(5000, 50000),
        schedule_impact_days: randomNumber(0, 10),
        created_by: ctx.userId,
      })
    }
    console.log(`  ✓ 3 Change Orders`)
  }
}

async function seedPunchItems(ctx: Context) {
  console.log('\n✅ Seeding punch lists...')

  const descriptions = [
    'Touch up paint - wall damage',
    'Adjust door closer',
    'Replace ceiling tile',
    'Fix outlet cover',
    'Caulk window frame',
    'Clean HVAC diffuser',
    'Repair drywall crack',
    'Adjust cabinet door',
  ]

  for (const projectId of ctx.projectIds) {
    const { data: punchList } = await supabase
      .from('punch_lists')
      .insert({
        project_id: projectId,
        name: 'Final Walkthrough',
        status: 'in_progress',
        due_date: randomDate(0, 30),
        created_by: ctx.userId,
      })
      .select()
      .single()

    if (punchList) {
      for (let i = 0; i < 10; i++) {
        await supabase.from('punch_items').insert({
          project_id: projectId,
          punch_list_id: punchList.id,
          item_number: `PI-${String(i + 1).padStart(3, '0')}`,
          description: randomItem(descriptions),
          location: randomItem(LOCATIONS),
          trade: randomItem(TRADES),
          priority: randomItem(['low', 'normal', 'high']),
          status: randomItem(['open', 'in_progress', 'completed']),
          due_date: randomDate(0, 21),
          created_by: ctx.userId,
        })
      }
      console.log(`  ✓ 10 punch items`)
    }
  }
}

async function seedInspections(ctx: Context) {
  console.log('\n🔍 Seeding inspections...')

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 6; i++) {
      await supabase.from('inspections').insert({
        project_id: projectId,
        inspection_type: randomItem(INSPECTION_TYPES),
        scheduled_date: randomDate(-7, 14),
        status: randomItem(['scheduled', 'passed', 'failed', 'partial']),
        inspector_name: randomItem(['John Smith', 'Mary Jones', 'Bob Wilson']),
        inspector_company: 'City Building Dept',
        location: randomItem(LOCATIONS),
        created_by: ctx.userId,
      })
    }
    console.log(`  ✓ 6 inspections`)
  }
}

async function seedTasks(ctx: Context) {
  console.log('\n📌 Seeding tasks...')

  const tasks = [
    'Order materials',
    'Schedule meeting',
    'Review drawings',
    'Coordinate shutdown',
    'Update schedule',
    'Safety walkthrough',
    'Document conditions',
    'Verify deliveries',
  ]

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 8; i++) {
      await supabase.from('tasks').insert({
        project_id: projectId,
        title: randomItem(tasks),
        status: randomItem(['pending', 'in_progress', 'completed']),
        priority: randomItem(['low', 'normal', 'high']),
        due_date: randomDate(-3, 14),
        assigned_to: ctx.userId,
        created_by: ctx.userId,
      })
    }
    console.log(`  ✓ 8 tasks`)
  }
}

async function seedMaterials(ctx: Context) {
  console.log('\n📦 Seeding material deliveries...')

  const materials = [
    { name: 'Structural Steel', supplier: 'Steel Supply', unit: 'TON' },
    { name: 'Concrete 4000 PSI', supplier: 'Ready Mix Co', unit: 'CY' },
    { name: 'Drywall 5/8"', supplier: 'Drywall Depot', unit: 'SF' },
    { name: 'Electrical Wire', supplier: 'Electric Wholesale', unit: 'FT' },
    { name: 'PVC Pipe 4"', supplier: 'Plumbing Supply', unit: 'FT' },
  ]

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 5; i++) {
      const mat = randomItem(materials)
      await supabase.from('material_deliveries').insert({
        project_id: projectId,
        material_name: mat.name,
        supplier: mat.supplier,
        quantity: randomNumber(50, 500),
        unit: mat.unit,
        expected_date: randomDate(-3, 14),
        status: randomItem(['scheduled', 'delivered', 'in_transit']),
        po_number: `PO-${randomNumber(10000, 99999)}`,
        created_by: ctx.userId,
      })
    }
    console.log(`  ✓ 5 deliveries`)
  }
}

async function seedPermits(ctx: Context) {
  console.log('\n📜 Seeding permits...')

  for (const projectId of ctx.projectIds) {
    for (const permitType of PERMIT_TYPES) {
      await supabase.from('permits').insert({
        project_id: projectId,
        permit_type: permitType,
        permit_number: `${permitType.substring(0, 2).toUpperCase()}-${randomNumber(10000, 99999)}`,
        status: randomItem(['applied', 'pending', 'approved']),
        applied_date: randomDate(-60, -30),
        issued_date: randomDate(-30, 0),
        expiration_date: randomDate(60, 180),
        issuing_authority: 'City Building Dept',
        created_by: ctx.userId,
      })
    }
    console.log(`  ✓ ${PERMIT_TYPES.length} permits`)
  }
}

async function seedContacts(ctx: Context) {
  console.log('\n📇 Seeding contacts...')

  const contacts = [
    { first_name: 'Mike', last_name: 'Johnson', company_name: 'ABC Electrical', contact_type: 'subcontractor', role: 'Foreman' },
    { first_name: 'Lisa', last_name: 'Chen', company_name: 'Premier Plumbing', contact_type: 'subcontractor', role: 'PM' },
    { first_name: 'Robert', last_name: 'Williams', company_name: 'City Building', contact_type: 'inspector', role: 'Inspector' },
    { first_name: 'Emily', last_name: 'Davis', company_name: 'Davis Architects', contact_type: 'architect', role: 'Architect' },
    { first_name: 'James', last_name: 'Brown', company_name: 'Structural Solutions', contact_type: 'engineer', role: 'Engineer' },
    { first_name: 'Maria', last_name: 'Garcia', company_name: 'HVAC Masters', contact_type: 'subcontractor', role: 'Tech' },
    { first_name: 'David', last_name: 'Miller', company_name: 'Steel Supply Inc', contact_type: 'supplier', role: 'Sales' },
    { first_name: 'Jennifer', last_name: 'Taylor', company_name: 'Concrete Pro', contact_type: 'subcontractor', role: 'Super' },
  ]

  for (const contact of contacts) {
    const email = `${contact.first_name.toLowerCase()}.${contact.last_name.toLowerCase()}@example.com`
    await supabase.from('contacts').upsert({
      company_id: ctx.companyId,
      ...contact,
      email,
      phone: `555-${randomNumber(100, 999)}-${randomNumber(1000, 9999)}`,
    }, { onConflict: 'company_id,email' })
  }
  console.log(`  ✓ ${contacts.length} contacts`)
}

async function seedSubcontractors(ctx: Context) {
  console.log('\n🏗️  Seeding subcontractors...')

  const subs = [
    { name: 'ABC Electrical Services', trade: 'Electrical', license_number: 'EC-12345' },
    { name: 'Premier Plumbing Co', trade: 'Plumbing', license_number: 'PL-67890' },
    { name: 'HVAC Masters Inc', trade: 'HVAC', license_number: 'MC-11111' },
    { name: 'Concrete Pro LLC', trade: 'Concrete', license_number: 'CC-22222' },
    { name: 'Drywall Experts', trade: 'Drywall', license_number: 'DR-33333' },
  ]

  for (const sub of subs) {
    await supabase.from('subcontractors').upsert({
      company_id: ctx.companyId,
      ...sub,
      contact_name: `${sub.trade} Contact`,
      contact_email: `contact@${sub.name.toLowerCase().replace(/\s+/g, '')}.com`,
      contact_phone: `555-${randomNumber(100, 999)}-${randomNumber(1000, 9999)}`,
    }, { onConflict: 'company_id,name' })
  }
  console.log(`  ✓ ${subs.length} subcontractors`)
}

async function seedTakeoffs(ctx: Context) {
  console.log('\n📐 Seeding takeoff items...')

  const items = [
    { name: 'Concrete Foundation', category: 'Concrete', unit: 'CY', cost: 180 },
    { name: 'Structural Steel', category: 'Steel', unit: 'TON', cost: 3500 },
    { name: 'Drywall Interior', category: 'Drywall', unit: 'SF', cost: 2.5 },
    { name: 'Roofing TPO', category: 'Roofing', unit: 'SF', cost: 8 },
    { name: 'Electrical Rough-In', category: 'Electrical', unit: 'EA', cost: 150 },
  ]

  for (const projectId of ctx.projectIds) {
    for (const item of items) {
      const qty = randomNumber(100, 2000)
      await supabase.from('takeoff_items').insert({
        project_id: projectId,
        item_name: item.name,
        category: item.category,
        quantity: qty,
        unit: item.unit,
        unit_cost: item.cost,
        total_cost: qty * item.cost,
        created_by: ctx.userId,
      })
    }
    console.log(`  ✓ ${items.length} takeoff items`)
  }
}

async function seedMeetings(ctx: Context) {
  console.log('\n📅 Seeding meetings...')

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 4; i++) {
      await supabase.from('meetings').insert({
        project_id: projectId,
        title: randomItem(['Weekly Progress', 'Safety Meeting', 'OAC Meeting', 'Coordination']),
        meeting_type: randomItem(['progress', 'safety', 'oac', 'coordination']),
        scheduled_date: randomDate(-7, 21),
        location: randomItem(['Conference Room', 'Job Trailer', 'Virtual']),
        status: randomItem(['scheduled', 'completed']),
        created_by: ctx.userId,
      })
    }
    console.log(`  ✓ 4 meetings`)
  }
}

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('   Comprehensive Test Data Seeding')
  console.log('═══════════════════════════════════════════')

  try {
    const ctx = await authenticate()

    if (ctx.projectIds.length === 0) {
      console.log('\n⚠️  No projects found. Please run seed:test first.')
      return
    }

    await seedContacts(ctx)
    await seedSubcontractors(ctx)
    await seedDailyReports(ctx)
    await seedWorkflowItems(ctx)
    await seedPunchItems(ctx)
    await seedInspections(ctx)
    await seedTasks(ctx)
    await seedMaterials(ctx)
    await seedPermits(ctx)
    await seedTakeoffs(ctx)
    await seedMeetings(ctx)

    console.log('\n═══════════════════════════════════════════')
    console.log('   ✅ All test data seeded successfully!')
    console.log('═══════════════════════════════════════════\n')
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
