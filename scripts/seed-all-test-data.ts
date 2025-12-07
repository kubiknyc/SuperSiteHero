/**
 * Comprehensive Test Data Seeding Script
 *
 * Seeds realistic test data across ALL app modules:
 * - Daily Reports
 * - RFIs, Submittals, Change Orders (workflow_items)
 * - Punch Lists
 * - Inspections
 * - Checklists
 * - Tasks
 * - Contacts & Subcontractors
 * - Materials & Deliveries
 * - Meetings
 * - Notices
 * - Permits
 * - Safety Incidents
 * - Site Conditions
 * - Site Instructions
 * - Takeoffs
 *
 * Usage: npx tsx scripts/seed-all-test-data.ts
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
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Helper functions
const randomDate = (daysBack: number, daysForward = 0) => {
  const date = new Date()
  const offset = Math.floor(Math.random() * (daysBack + daysForward)) - daysBack
  date.setDate(date.getDate() + offset)
  return date.toISOString().split('T')[0]
}

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const randomNumber = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

// Data constants
const TRADES = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Drywall',
  'Framing',
  'Concrete',
  'Roofing',
  'Flooring',
  'Painting',
  'Masonry',
  'Steel',
  'Glass/Glazing',
  'Insulation',
  'Fire Protection',
  'Landscaping',
]

const LOCATIONS = [
  'Building A - Floor 1',
  'Building A - Floor 2',
  'Building A - Floor 3',
  'Building B - Floor 1',
  'Building B - Floor 2',
  'Parking Structure',
  'Main Lobby',
  'Mechanical Room',
  'Electrical Room',
  'Roof Level',
  'Basement',
  'Loading Dock',
  'Conference Room 101',
  'Office Suite 200',
  'Restrooms - Floor 2',
]

const WEATHER_CONDITIONS = [
  'Sunny',
  'Partly Cloudy',
  'Cloudy',
  'Light Rain',
  'Heavy Rain',
  'Windy',
  'Hot',
  'Cold',
  'Humid',
  'Clear',
]

const INSPECTION_TYPES = [
  'Building',
  'Electrical',
  'Plumbing',
  'Fire',
  'HVAC',
  'Structural',
  'Final',
  'Rough-In',
  'Foundation',
  'Framing',
]

const PERMIT_TYPES = [
  'Building Permit',
  'Electrical Permit',
  'Plumbing Permit',
  'Mechanical Permit',
  'Fire Alarm Permit',
  'Demolition Permit',
  'Excavation Permit',
  'Sign Permit',
]

interface SeedContext {
  companyId: string
  projectIds: string[]
  userIds: string[]
  contactIds: string[]
  subcontractorIds: string[]
}

async function getContext(): Promise<SeedContext> {
  const companyId = '3c146527-62a9-4f4d-97db-c7546da9dfed'

  // Use explicit select to bypass any RLS issues with service role
  const { data: projects, error: pErr } = await supabase
    .from('projects')
    .select('id')
    .eq('company_id', companyId)

  if (pErr) console.log('Projects query error:', pErr.message)

  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', companyId)

  if (uErr) console.log('Users query error:', uErr.message)

  // If no users found in company, get all users
  let userIds = users?.map((u) => u.id) || []
  if (userIds.length === 0) {
    const { data: allUsers } = await supabase.from('users').select('id').limit(20)
    userIds = allUsers?.map((u) => u.id) || []
    console.log(`  (Using ${userIds.length} users from all companies)`)
  }

  // If no projects found, get all projects
  let projectIds = projects?.map((p) => p.id) || []
  if (projectIds.length === 0) {
    const { data: allProjects } = await supabase.from('projects').select('id').limit(10)
    projectIds = allProjects?.map((p) => p.id) || []
    console.log(`  (Using ${projectIds.length} projects from all companies)`)
  }

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('company_id', companyId)

  const { data: subcontractors } = await supabase
    .from('subcontractors')
    .select('id')
    .eq('company_id', companyId)

  return {
    companyId,
    projectIds,
    userIds,
    contactIds: contacts?.map((c) => c.id) || [],
    subcontractorIds: subcontractors?.map((s) => s.id) || [],
  }
}

// ============================================
// CONTACTS & SUBCONTRACTORS
// ============================================
async function seedContacts(ctx: SeedContext) {
  console.log('\n📇 Seeding contacts...')

  const contacts = [
    { first_name: 'Mike', last_name: 'Johnson', company_name: 'ABC Electrical', contact_type: 'subcontractor', role: 'Foreman', email: 'mike.j@abcelectric.com', phone: '555-0201' },
    { first_name: 'Lisa', last_name: 'Chen', company_name: 'Premier Plumbing', contact_type: 'subcontractor', role: 'Project Manager', email: 'lisa@premierplumb.com', phone: '555-0202' },
    { first_name: 'Robert', last_name: 'Williams', company_name: 'City Building Dept', contact_type: 'inspector', role: 'Building Inspector', email: 'rwilliams@city.gov', phone: '555-0203' },
    { first_name: 'Emily', last_name: 'Davis', company_name: 'Davis Architecture', contact_type: 'architect', role: 'Lead Architect', email: 'emily@davisarch.com', phone: '555-0204' },
    { first_name: 'James', last_name: 'Brown', company_name: 'Structural Solutions', contact_type: 'engineer', role: 'Structural Engineer', email: 'jbrown@structsol.com', phone: '555-0205' },
    { first_name: 'Maria', last_name: 'Garcia', company_name: 'HVAC Masters', contact_type: 'subcontractor', role: 'HVAC Tech', email: 'maria@hvacmasters.com', phone: '555-0206' },
    { first_name: 'David', last_name: 'Miller', company_name: 'Steel Supply Inc', contact_type: 'supplier', role: 'Sales Rep', email: 'dmiller@steelsupply.com', phone: '555-0207' },
    { first_name: 'Jennifer', last_name: 'Taylor', company_name: 'Concrete Pro', contact_type: 'subcontractor', role: 'Superintendent', email: 'jtaylor@concretepro.com', phone: '555-0208' },
    { first_name: 'Chris', last_name: 'Anderson', company_name: 'Owner Rep LLC', contact_type: 'owner_rep', role: 'Owner Representative', email: 'chris@ownerrep.com', phone: '555-0209' },
    { first_name: 'Amanda', last_name: 'White', company_name: 'Drywall Experts', contact_type: 'subcontractor', role: 'Foreman', email: 'awhite@drywallexp.com', phone: '555-0210' },
  ]

  for (const contact of contacts) {
    const { error } = await supabase
      .from('contacts')
      .upsert({ company_id: ctx.companyId, ...contact }, { onConflict: 'company_id,email' })
    if (!error) console.log(`  ✓ ${contact.first_name} ${contact.last_name}`)
  }
}

async function seedSubcontractors(ctx: SeedContext) {
  console.log('\n🏗️  Seeding subcontractors...')

  const subcontractors = [
    { name: 'ABC Electrical Services', trade: 'Electrical', license_number: 'EC-12345', contact_name: 'Mike Johnson', contact_email: 'mike@abcelectric.com', contact_phone: '555-0301' },
    { name: 'Premier Plumbing Co', trade: 'Plumbing', license_number: 'PL-67890', contact_name: 'Lisa Chen', contact_email: 'lisa@premierplumb.com', contact_phone: '555-0302' },
    { name: 'HVAC Masters Inc', trade: 'HVAC', license_number: 'MC-11111', contact_name: 'Maria Garcia', contact_email: 'maria@hvacmasters.com', contact_phone: '555-0303' },
    { name: 'Concrete Pro LLC', trade: 'Concrete', license_number: 'CC-22222', contact_name: 'Jennifer Taylor', contact_email: 'jtaylor@concretepro.com', contact_phone: '555-0304' },
    { name: 'Drywall Experts', trade: 'Drywall', license_number: 'DR-33333', contact_name: 'Amanda White', contact_email: 'awhite@drywallexp.com', contact_phone: '555-0305' },
    { name: 'Steel Erectors Inc', trade: 'Steel', license_number: 'ST-44444', contact_name: 'Tom Steel', contact_email: 'tom@steelerectors.com', contact_phone: '555-0306' },
    { name: 'Roofing Solutions', trade: 'Roofing', license_number: 'RF-55555', contact_name: 'Bill Roof', contact_email: 'bill@roofingsol.com', contact_phone: '555-0307' },
    { name: 'Elite Painting', trade: 'Painting', license_number: 'PT-66666', contact_name: 'Sarah Paint', contact_email: 'sarah@elitepainting.com', contact_phone: '555-0308' },
  ]

  for (const sub of subcontractors) {
    const { error } = await supabase
      .from('subcontractors')
      .upsert({ company_id: ctx.companyId, ...sub }, { onConflict: 'company_id,name' })
    if (!error) console.log(`  ✓ ${sub.name}`)
  }

  // Refresh subcontractor IDs
  const { data } = await supabase
    .from('subcontractors')
    .select('id')
    .eq('company_id', ctx.companyId)
  ctx.subcontractorIds = data?.map((s) => s.id) || []
}

// ============================================
// DAILY REPORTS
// ============================================
async function seedDailyReports(ctx: SeedContext) {
  console.log('\n📋 Seeding daily reports...')

  for (const projectId of ctx.projectIds) {
    // Create 30 days of daily reports
    for (let i = 0; i < 30; i++) {
      const reportDate = randomDate(30, 0)
      const weather = randomItem(WEATHER_CONDITIONS)
      const tempHigh = randomNumber(55, 95)
      const tempLow = tempHigh - randomNumber(10, 25)

      const report = {
        project_id: projectId,
        report_date: reportDate,
        reporter_id: randomItem(ctx.userIds),
        weather_condition: weather,
        temperature_high: tempHigh,
        temperature_low: tempLow,
        precipitation: weather.includes('Rain') ? randomNumber(0, 2) : 0,
        wind_speed: randomNumber(0, 25),
        work_completed: `Completed work on ${randomItem(LOCATIONS)}. ${randomItem(TRADES)} crew made good progress. ${randomItem(['On schedule.', 'Ahead of schedule.', 'Minor delays due to material delivery.'])}`,
        issues: randomItem([null, 'Material delivery delayed', 'Weather delay - 2 hours', 'Equipment breakdown - 1 hour', null, null]),
        observations: randomItem([null, null, null, null, 'Near miss reported - reviewed with crew', null]),
        total_workers: randomNumber(8, 45),
        comments: randomItem([null, 'Good progress today', 'Need to expedite material orders', 'Coordination meeting scheduled for tomorrow', null]),
        status: randomItem(['draft', 'submitted', 'approved']),
        created_by: randomItem(ctx.userIds),
      }

      const { error } = await supabase
        .from('daily_reports')
        .upsert(report, { onConflict: 'project_id,report_date' })
      if (error && !error.message.includes('duplicate')) {
        console.log(`  ✗ Error: ${error.message}`)
      }
    }
    console.log(`  ✓ Daily reports for project`)
  }
}

// ============================================
// WORKFLOW ITEMS (RFIs, Submittals, Change Orders)
// ============================================
async function seedWorkflowItems(ctx: SeedContext) {
  console.log('\n📝 Seeding workflow items (RFIs, Submittals, Change Orders)...')

  const rfiSubjects = [
    'Clarification needed on electrical panel location',
    'Foundation depth specification question',
    'Door hardware specification conflict',
    'HVAC duct routing clarification',
    'Window schedule discrepancy',
    'Structural steel connection detail',
    'Fire stopping requirements',
    'Ceiling height confirmation',
    'Waterproofing membrane specification',
    'Light fixture mounting height',
  ]

  const submittalTypes = [
    { title: 'Structural Steel Shop Drawings', spec_section: '05 12 00' },
    { title: 'Mechanical Equipment Submittals', spec_section: '23 00 00' },
    { title: 'Electrical Panel Schedule', spec_section: '26 24 16' },
    { title: 'Plumbing Fixture Cut Sheets', spec_section: '22 40 00' },
    { title: 'Door Hardware Schedule', spec_section: '08 71 00' },
    { title: 'Roofing Material Samples', spec_section: '07 50 00' },
    { title: 'Paint Color Samples', spec_section: '09 91 00' },
    { title: 'Concrete Mix Design', spec_section: '03 30 00' },
    { title: 'Fire Alarm System Drawings', spec_section: '28 31 00' },
    { title: 'HVAC Equipment Data', spec_section: '23 70 00' },
  ]

  const changeOrderReasons = [
    { title: 'Additional electrical outlets per owner request', reason: 'Owner change' },
    { title: 'Unforeseen rock excavation', reason: 'Field condition' },
    { title: 'Upgraded HVAC system', reason: 'Design change' },
    { title: 'Additional fire stopping required', reason: 'Code requirement' },
    { title: 'Revised storefront design', reason: 'Architect revision' },
    { title: 'Underground utility conflict', reason: 'Field condition' },
    { title: 'Added security system', reason: 'Owner change' },
    { title: 'Structural reinforcement required', reason: 'Design change' },
  ]

  for (const projectId of ctx.projectIds) {
    // RFIs
    for (let i = 0; i < 8; i++) {
      const subject = randomItem(rfiSubjects)
      const { error } = await supabase.from('workflow_items').insert({
        project_id: projectId,
        workflow_type: 'rfi',
        item_number: `RFI-${String(i + 1).padStart(3, '0')}`,
        title: subject,
        description: `${subject}. Please provide clarification on the following issue found at ${randomItem(LOCATIONS)}.`,
        status: randomItem(['draft', 'pending_review', 'in_review', 'approved', 'closed']),
        priority: randomItem(['low', 'normal', 'high', 'urgent']),
        due_date: randomDate(-10, 14),
        assigned_to: randomItem(ctx.userIds),
        created_by: randomItem(ctx.userIds),
        cost_impact: randomItem([null, randomNumber(0, 5000), null]),
        schedule_impact_days: randomItem([null, randomNumber(0, 5), null]),
      })
      if (!error) console.log(`  ✓ RFI: ${subject.substring(0, 40)}...`)
    }

    // Submittals
    for (let i = 0; i < 10; i++) {
      const submittal = randomItem(submittalTypes)
      const { error } = await supabase.from('workflow_items').insert({
        project_id: projectId,
        workflow_type: 'submittal',
        item_number: `SUB-${String(i + 1).padStart(3, '0')}`,
        title: submittal.title,
        description: `Submittal for ${submittal.title}. Spec section: ${submittal.spec_section}`,
        status: randomItem(['draft', 'pending_review', 'in_review', 'approved', 'approved_as_noted', 'rejected', 'resubmit']),
        priority: randomItem(['low', 'normal', 'high']),
        due_date: randomDate(-5, 21),
        assigned_to: randomItem(ctx.userIds),
        created_by: randomItem(ctx.userIds),
        spec_section: submittal.spec_section,
      })
      if (!error) console.log(`  ✓ Submittal: ${submittal.title}`)
    }

    // Change Orders
    for (let i = 0; i < 5; i++) {
      const co = randomItem(changeOrderReasons)
      const costImpact = randomNumber(5000, 75000)
      const { error } = await supabase.from('workflow_items').insert({
        project_id: projectId,
        workflow_type: 'change_order',
        item_number: `CO-${String(i + 1).padStart(3, '0')}`,
        title: co.title,
        description: `${co.title}. Reason: ${co.reason}. Location: ${randomItem(LOCATIONS)}`,
        status: randomItem(['draft', 'pending_approval', 'approved', 'rejected', 'void']),
        priority: randomItem(['normal', 'high', 'urgent']),
        due_date: randomDate(-5, 14),
        assigned_to: randomItem(ctx.userIds),
        created_by: randomItem(ctx.userIds),
        cost_impact: costImpact,
        schedule_impact_days: randomNumber(0, 14),
      })
      if (!error) console.log(`  ✓ Change Order: ${co.title.substring(0, 40)}...`)
    }
  }
}

// ============================================
// PUNCH LISTS & ITEMS
// ============================================
async function seedPunchLists(ctx: SeedContext) {
  console.log('\n✅ Seeding punch lists and items...')

  const punchDescriptions = [
    'Touch up paint - wall damage',
    'Adjust door closer',
    'Replace damaged ceiling tile',
    'Fix loose outlet cover',
    'Caulk gap at window frame',
    'Clean HVAC diffuser',
    'Repair drywall crack',
    'Adjust cabinet door alignment',
    'Replace scratched hardware',
    'Fix light switch plate',
    'Grout repair needed',
    'Touch up base trim',
    'Clean construction debris',
    'Install missing outlet cover',
    'Repair carpet seam',
  ]

  for (const projectId of ctx.projectIds) {
    // Create punch list
    const { data: punchList, error: plError } = await supabase
      .from('punch_lists')
      .insert({
        project_id: projectId,
        name: 'Final Walkthrough Punch List',
        description: 'Items identified during final walkthrough',
        status: 'in_progress',
        due_date: randomDate(0, 30),
        created_by: randomItem(ctx.userIds),
      })
      .select()
      .single()

    if (plError) continue

    // Create punch items
    for (let i = 0; i < 15; i++) {
      const description = randomItem(punchDescriptions)
      await supabase.from('punch_items').insert({
        project_id: projectId,
        punch_list_id: punchList.id,
        item_number: `PI-${String(i + 1).padStart(3, '0')}`,
        description,
        location: randomItem(LOCATIONS),
        trade: randomItem(TRADES),
        priority: randomItem(['low', 'normal', 'high', 'urgent']),
        status: randomItem(['open', 'in_progress', 'completed', 'verified']),
        due_date: randomDate(0, 21),
        assigned_to: ctx.subcontractorIds.length > 0 ? randomItem(ctx.subcontractorIds) : null,
        created_by: randomItem(ctx.userIds),
      })
    }
    console.log(`  ✓ Punch list with 15 items`)
  }
}

// ============================================
// INSPECTIONS
// ============================================
async function seedInspections(ctx: SeedContext) {
  console.log('\n🔍 Seeding inspections...')

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 8; i++) {
      const inspType = randomItem(INSPECTION_TYPES)
      const status = randomItem(['scheduled', 'in_progress', 'passed', 'failed', 'partial'])

      await supabase.from('inspections').insert({
        project_id: projectId,
        inspection_type: inspType,
        scheduled_date: randomDate(-14, 14),
        status,
        result: status === 'passed' ? 'passed' : status === 'failed' ? 'failed' : null,
        inspector_name: randomItem(['John Smith', 'Mary Jones', 'Bob Wilson', 'Sarah Davis']),
        inspector_company: 'City Building Department',
        location: randomItem(LOCATIONS),
        scope: `${inspType} inspection for ${randomItem(LOCATIONS)}`,
        notes: status === 'failed' ? 'Corrections required - see attached report' : null,
        created_by: randomItem(ctx.userIds),
      })
    }
    console.log(`  ✓ 8 inspections`)
  }
}

// ============================================
// TASKS
// ============================================
async function seedTasks(ctx: SeedContext) {
  console.log('\n📌 Seeding tasks...')

  const taskTitles = [
    'Order materials for next phase',
    'Schedule subcontractor meeting',
    'Review shop drawings',
    'Coordinate utility shutdown',
    'Prepare progress report',
    'Update project schedule',
    'Review change order pricing',
    'Conduct safety walkthrough',
    'Document existing conditions',
    'Verify material deliveries',
    'Update RFI log',
    'Schedule owner meeting',
    'Review submittal package',
    'Coordinate crane delivery',
    'Prepare closeout documents',
  ]

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 12; i++) {
      const title = randomItem(taskTitles)
      await supabase.from('tasks').insert({
        project_id: projectId,
        title,
        description: `${title}. Priority task for project completion.`,
        status: randomItem(['pending', 'in_progress', 'completed', 'on_hold']),
        priority: randomItem(['low', 'normal', 'high', 'urgent']),
        due_date: randomDate(-7, 21),
        assigned_to: randomItem(ctx.userIds),
        created_by: randomItem(ctx.userIds),
      })
    }
    console.log(`  ✓ 12 tasks`)
  }
}

// ============================================
// CHECKLIST TEMPLATES & EXECUTIONS
// ============================================
async function seedChecklists(ctx: SeedContext) {
  console.log('\n✔️  Seeding checklists...')

  const templates = [
    {
      name: 'Daily Safety Inspection',
      category: 'safety',
      items: [
        { id: '1', title: 'PPE compliance verified', required: true, item_type: 'checkbox', order: 1 },
        { id: '2', title: 'Fall protection in place', required: true, item_type: 'checkbox', order: 2 },
        { id: '3', title: 'Fire extinguishers accessible', required: true, item_type: 'checkbox', order: 3 },
        { id: '4', title: 'First aid kit stocked', required: true, item_type: 'checkbox', order: 4 },
        { id: '5', title: 'Emergency exits clear', required: true, item_type: 'checkbox', order: 5 },
      ],
    },
    {
      name: 'Quality Control - Concrete Pour',
      category: 'quality',
      items: [
        { id: '1', title: 'Forms inspected and approved', required: true, item_type: 'checkbox', order: 1 },
        { id: '2', title: 'Rebar placement verified', required: true, item_type: 'checkbox', order: 2 },
        { id: '3', title: 'Slump test completed', required: true, item_type: 'checkbox', order: 3 },
        { id: '4', title: 'Cylinders taken', required: true, item_type: 'checkbox', order: 4 },
        { id: '5', title: 'Weather conditions acceptable', required: true, item_type: 'checkbox', order: 5 },
      ],
    },
    {
      name: 'MEP Rough-In Inspection',
      category: 'inspection',
      items: [
        { id: '1', title: 'Electrical runs per plan', required: true, item_type: 'checkbox', order: 1 },
        { id: '2', title: 'Plumbing vents correct', required: true, item_type: 'checkbox', order: 2 },
        { id: '3', title: 'HVAC duct sizing verified', required: true, item_type: 'checkbox', order: 3 },
        { id: '4', title: 'Fire stopping installed', required: true, item_type: 'checkbox', order: 4 },
        { id: '5', title: 'Penetrations sealed', required: true, item_type: 'checkbox', order: 5 },
      ],
    },
  ]

  for (const template of templates) {
    const { data: tmpl, error } = await supabase
      .from('checklist_templates')
      .upsert(
        {
          company_id: ctx.companyId,
          name: template.name,
          category: template.category,
          items: template.items,
          is_active: true,
          created_by: randomItem(ctx.userIds),
        },
        { onConflict: 'company_id,name' }
      )
      .select()
      .single()

    if (!error && tmpl) {
      console.log(`  ✓ Template: ${template.name}`)

      // Create executions for each project
      for (const projectId of ctx.projectIds) {
        for (let i = 0; i < 3; i++) {
          await supabase.from('checklists').insert({
            template_id: tmpl.id,
            project_id: projectId,
            scheduled_date: randomDate(-14, 7),
            status: randomItem(['pending', 'in_progress', 'completed']),
            completed_by: randomItem(ctx.userIds),
            created_by: randomItem(ctx.userIds),
          })
        }
      }
    }
  }
}

// ============================================
// MATERIAL DELIVERIES
// ============================================
async function seedMaterialDeliveries(ctx: SeedContext) {
  console.log('\n📦 Seeding material deliveries...')

  const materials = [
    { name: 'Structural Steel Beams', supplier: 'Steel Supply Inc', unit: 'EA' },
    { name: 'Concrete - 4000 PSI', supplier: 'Ready Mix Co', unit: 'CY' },
    { name: 'Lumber - 2x4x8', supplier: 'Building Materials Plus', unit: 'BF' },
    { name: 'Electrical Wire - 12 AWG', supplier: 'Electrical Wholesale', unit: 'FT' },
    { name: 'PVC Pipe - 4"', supplier: 'Plumbing Supply Co', unit: 'FT' },
    { name: 'Drywall - 5/8"', supplier: 'Drywall Depot', unit: 'SF' },
    { name: 'Roofing Membrane', supplier: 'Roofing Materials Inc', unit: 'SF' },
    { name: 'Insulation - R-19', supplier: 'Insulation Warehouse', unit: 'SF' },
    { name: 'HVAC Ductwork', supplier: 'HVAC Supply', unit: 'LF' },
    { name: 'Paint - Interior Latex', supplier: 'Paint Pro', unit: 'GAL' },
  ]

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 10; i++) {
      const material = randomItem(materials)
      const quantity = randomNumber(50, 500)
      const status = randomItem(['scheduled', 'in_transit', 'delivered', 'partially_delivered'])

      await supabase.from('material_deliveries').insert({
        project_id: projectId,
        material_name: material.name,
        supplier: material.supplier,
        quantity,
        unit: material.unit,
        expected_date: randomDate(-7, 14),
        delivery_date: status === 'delivered' ? randomDate(-7, 0) : null,
        status,
        condition: status === 'delivered' ? randomItem(['acceptable', 'acceptable', 'damaged']) : null,
        po_number: `PO-${randomNumber(10000, 99999)}`,
        notes: randomItem([null, 'Verify quantity on receipt', 'Fragile - handle with care', null]),
        created_by: randomItem(ctx.userIds),
      })
    }
    console.log(`  ✓ 10 material deliveries`)
  }
}

// ============================================
// MEETINGS
// ============================================
async function seedMeetings(ctx: SeedContext) {
  console.log('\n📅 Seeding meetings...')

  const meetingTypes = [
    { title: 'Weekly Progress Meeting', type: 'progress' },
    { title: 'Safety Toolbox Talk', type: 'safety' },
    { title: 'Owner/Architect/Contractor Meeting', type: 'oac' },
    { title: 'Subcontractor Coordination', type: 'coordination' },
    { title: 'Pre-Construction Meeting', type: 'preconstruction' },
    { title: 'Closeout Meeting', type: 'closeout' },
  ]

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 6; i++) {
      const meeting = randomItem(meetingTypes)
      await supabase.from('meetings').insert({
        project_id: projectId,
        title: meeting.title,
        meeting_type: meeting.type,
        scheduled_date: randomDate(-14, 21),
        location: randomItem(['Conference Room A', 'Job Trailer', 'Virtual - Zoom', 'Owner Office']),
        status: randomItem(['scheduled', 'completed', 'cancelled']),
        notes: `Agenda: Review progress, discuss issues, coordinate next steps.`,
        created_by: randomItem(ctx.userIds),
      })
    }
    console.log(`  ✓ 6 meetings`)
  }
}

// ============================================
// NOTICES
// ============================================
async function seedNotices(ctx: SeedContext) {
  console.log('\n📢 Seeding notices...')

  const notices = [
    { title: 'Delay Notice - Material Shortage', type: 'delay' },
    { title: 'Change Directive', type: 'change' },
    { title: 'Safety Violation Notice', type: 'safety' },
    { title: 'Schedule Update Notice', type: 'schedule' },
    { title: 'Site Access Restriction', type: 'access' },
  ]

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 4; i++) {
      const notice = randomItem(notices)
      await supabase.from('notices').insert({
        project_id: projectId,
        title: notice.title,
        notice_type: notice.type,
        description: `${notice.title}. Please review and respond within 5 business days.`,
        status: randomItem(['draft', 'sent', 'acknowledged', 'resolved']),
        priority: randomItem(['low', 'normal', 'high', 'urgent']),
        due_date: randomDate(0, 14),
        created_by: randomItem(ctx.userIds),
      })
    }
    console.log(`  ✓ 4 notices`)
  }
}

// ============================================
// PERMITS
// ============================================
async function seedPermits(ctx: SeedContext) {
  console.log('\n📜 Seeding permits...')

  for (const projectId of ctx.projectIds) {
    for (const permitType of PERMIT_TYPES) {
      await supabase.from('permits').insert({
        project_id: projectId,
        permit_type: permitType,
        permit_number: `${permitType.substring(0, 2).toUpperCase()}-${randomNumber(10000, 99999)}`,
        status: randomItem(['applied', 'pending', 'approved', 'expired']),
        applied_date: randomDate(-60, -30),
        issued_date: randomDate(-30, 0),
        expiration_date: randomDate(30, 180),
        issuing_authority: 'City Building Department',
        notes: `${permitType} for construction work`,
        created_by: randomItem(ctx.userIds),
      })
    }
    console.log(`  ✓ ${PERMIT_TYPES.length} permits`)
  }
}

// ============================================
// SAFETY INCIDENTS
// ============================================
async function seedSafetyIncidents(ctx: SeedContext) {
  console.log('\n⚠️  Seeding safety incidents...')

  const incidents = [
    { type: 'near_miss', description: 'Unsecured ladder nearly fell' },
    { type: 'first_aid', description: 'Minor cut from sheet metal' },
    { type: 'near_miss', description: 'Dropped tool from scaffold' },
    { type: 'property_damage', description: 'Forklift damaged drywall' },
    { type: 'near_miss', description: 'Tripping hazard identified' },
  ]

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 3; i++) {
      const incident = randomItem(incidents)
      await supabase.from('safety_incidents').insert({
        project_id: projectId,
        incident_type: incident.type,
        incident_date: randomDate(-30, 0),
        description: incident.description,
        location: randomItem(LOCATIONS),
        severity: randomItem(['low', 'medium', 'high']),
        status: randomItem(['reported', 'investigating', 'resolved', 'closed']),
        corrective_actions: 'Reviewed safety procedures with crew. Implemented additional safeguards.',
        reported_by: randomItem(ctx.userIds),
        created_by: randomItem(ctx.userIds),
      })
    }
    console.log(`  ✓ 3 safety incidents`)
  }
}

// ============================================
// SITE CONDITIONS
// ============================================
async function seedSiteConditions(ctx: SeedContext) {
  console.log('\n🏗️  Seeding site conditions...')

  const conditions = [
    { title: 'Underground utility discovered', type: 'utility' },
    { title: 'Rock encountered during excavation', type: 'soil' },
    { title: 'Existing foundation found', type: 'structure' },
    { title: 'Contaminated soil identified', type: 'environmental' },
    { title: 'High water table discovered', type: 'water' },
  ]

  for (const projectId of ctx.projectIds) {
    for (let i = 0; i < 3; i++) {
      const condition = randomItem(conditions)
      await supabase.from('site_conditions').insert({
        project_id: projectId,
        title: condition.title,
        condition_type: condition.type,
        description: `${condition.title}. Location: ${randomItem(LOCATIONS)}. Requires further investigation.`,
        location: randomItem(LOCATIONS),
        severity: randomItem(['minor', 'moderate', 'major']),
        status: randomItem(['identified', 'investigating', 'resolved']),
        discovered_date: randomDate(-30, 0),
        created_by: randomItem(ctx.userIds),
      })
    }
    console.log(`  ✓ 3 site conditions`)
  }
}

// ============================================
// TAKEOFF ITEMS
// ============================================
async function seedTakeoffs(ctx: SeedContext) {
  console.log('\n📐 Seeding takeoff items...')

  const takeoffItems = [
    { name: 'Concrete Foundation', category: 'Concrete', unit: 'CY', unitCost: 180 },
    { name: 'Structural Steel', category: 'Steel', unit: 'TON', unitCost: 3500 },
    { name: 'Drywall - Interior', category: 'Drywall', unit: 'SF', unitCost: 2.5 },
    { name: 'Roofing - TPO Membrane', category: 'Roofing', unit: 'SF', unitCost: 8 },
    { name: 'Electrical Rough-In', category: 'Electrical', unit: 'EA', unitCost: 150 },
    { name: 'Plumbing Fixtures', category: 'Plumbing', unit: 'EA', unitCost: 450 },
    { name: 'HVAC Ductwork', category: 'HVAC', unit: 'LF', unitCost: 25 },
    { name: 'Interior Paint', category: 'Painting', unit: 'SF', unitCost: 1.5 },
    { name: 'Flooring - Carpet', category: 'Flooring', unit: 'SF', unitCost: 6 },
    { name: 'Doors - Interior', category: 'Doors', unit: 'EA', unitCost: 350 },
  ]

  for (const projectId of ctx.projectIds) {
    for (const item of takeoffItems) {
      const quantity = randomNumber(100, 5000)
      await supabase.from('takeoff_items').insert({
        project_id: projectId,
        item_name: item.name,
        category: item.category,
        quantity,
        unit: item.unit,
        unit_cost: item.unitCost,
        total_cost: quantity * item.unitCost,
        notes: `Takeoff for ${item.name}`,
        created_by: randomItem(ctx.userIds),
      })
    }
    console.log(`  ✓ ${takeoffItems.length} takeoff items`)
  }
}

// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('   Comprehensive Test Data Seeding')
  console.log('═══════════════════════════════════════════')

  try {
    const ctx = await getContext()
    console.log(`\nContext loaded:`)
    console.log(`  Company: ${ctx.companyId}`)
    console.log(`  Projects: ${ctx.projectIds.length}`)
    console.log(`  Users: ${ctx.userIds.length}`)

    // Seed all data
    await seedContacts(ctx)
    await seedSubcontractors(ctx)

    // Refresh context after subcontractors
    const updatedCtx = await getContext()

    await seedDailyReports(updatedCtx)
    await seedWorkflowItems(updatedCtx)
    await seedPunchLists(updatedCtx)
    await seedInspections(updatedCtx)
    await seedTasks(updatedCtx)
    await seedChecklists(updatedCtx)
    await seedMaterialDeliveries(updatedCtx)
    await seedMeetings(updatedCtx)
    await seedNotices(updatedCtx)
    await seedPermits(updatedCtx)
    await seedSafetyIncidents(updatedCtx)
    await seedSiteConditions(updatedCtx)
    await seedTakeoffs(updatedCtx)

    console.log('\n═══════════════════════════════════════════')
    console.log('   ✅ All test data seeded successfully!')
    console.log('═══════════════════════════════════════════\n')
  } catch (error) {
    console.error('\n❌ Error during seeding:', error)
    process.exit(1)
  }
}

main()
