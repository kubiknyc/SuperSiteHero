/**
 * Seed Change Orders Test Data
 *
 * Seeds realistic change order data to the dedicated change_orders table
 * (not the workflow_items table) for E2E testing.
 *
 * Usage: npx tsx scripts/seed-change-orders.ts
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Type assertion for tables not in generated types
const db = supabase as any

// Helper functions
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const randomDate = (daysBack: number, daysForward = 0) => {
  const date = new Date()
  const offset = Math.floor(Math.random() * (daysBack + daysForward)) - daysBack
  date.setDate(date.getDate() + offset)
  return date.toISOString()
}

// Change order data templates
const CHANGE_TYPES = ['scope_change', 'design_clarification', 'unforeseen_condition', 'owner_request', 'value_engineering', 'error_omission']
const STATUSES = ['draft', 'pending_estimate', 'estimate_complete', 'pending_internal_approval', 'internally_approved', 'pending_owner_review', 'approved', 'rejected', 'void']

const CHANGE_ORDER_TEMPLATES = [
  { title: 'Additional electrical outlets per owner request', description: 'Owner has requested 12 additional electrical outlets in the open office area on Floor 2. This includes new circuit runs and panel upgrades.', change_type: 'owner_request' },
  { title: 'Unforeseen rock excavation', description: 'During foundation excavation, rock was discovered at elevation 98.5. Requires specialized equipment and blasting permits.', change_type: 'unforeseen_condition' },
  { title: 'Upgraded HVAC system', description: 'Design change from standard efficiency to high-efficiency HVAC units with variable speed drives.', change_type: 'design_clarification' },
  { title: 'Additional fire stopping required', description: 'Fire marshal inspection identified additional penetrations requiring fire stopping per updated code interpretation.', change_type: 'error_omission' },
  { title: 'Revised storefront design', description: 'Architect has revised storefront from aluminum to steel framing per owner aesthetic preferences.', change_type: 'scope_change' },
  { title: 'Underground utility conflict', description: 'Existing telecommunications duct bank conflicts with proposed storm drainage. Requires rerouting.', change_type: 'unforeseen_condition' },
  { title: 'Added security system', description: 'Owner requests addition of card access system at all exterior doors and parking garage entries.', change_type: 'owner_request' },
  { title: 'Structural reinforcement required', description: 'Structural engineer requires additional reinforcement at roof penetrations for new mechanical units.', change_type: 'design_clarification' },
  { title: 'Waterproofing membrane upgrade', description: 'Upgrade from standard waterproofing to premium hot-applied rubberized membrane per owner request.', change_type: 'value_engineering' },
  { title: 'ADA accessibility improvements', description: 'Additional ADA accessible route required from parking to main entry per revised accessibility review.', change_type: 'error_omission' },
  { title: 'Generator capacity increase', description: 'Increase emergency generator from 150kW to 250kW to accommodate additional critical loads.', change_type: 'scope_change' },
  { title: 'Elevator shaft modifications', description: 'Elevator pit depth increased by 6 inches per manufacturer requirements for new cab design.', change_type: 'design_clarification' },
]

interface Project {
  id: string
  company_id: string
}

interface Context {
  projects: Project[]
  userIds: string[]
}

async function getContext(): Promise<Context> {
  // First try to find the test company (used by E2E tests)
  const { data: testCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', 'test-company')
    .maybeSingle()

  const companyFilter = testCompany?.id

  // Get projects - prioritize test company projects for E2E testing
  let query = supabase
    .from('projects')
    .select('id, company_id')

  if (companyFilter) {
    query = query.eq('company_id', companyFilter)
    console.log(`  Found test company: ${companyFilter}`)
  }

  const { data: projects, error: pErr } = await query.limit(10)

  if (pErr) {console.log('Projects query error:', pErr.message)}

  // If no projects found in test company, fall back to all projects
  if (!projects || projects.length === 0) {
    console.log('  No projects in test company, using all projects...')
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, company_id')
      .limit(10)

    return {
      projects: (allProjects as Project[]) || [],
      userIds: await getUserIds()
    }
  }

  return {
    projects: (projects as Project[]) || [],
    userIds: await getUserIds()
  }
}

async function getUserIds(): Promise<string[]> {
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id')
    .limit(20)

  if (uErr) {console.log('Users query error:', uErr.message)}

  return users?.map((u) => u.id) || []
}

async function seedChangeOrders(ctx: Context) {
  console.log('\n📝 Seeding change orders to change_orders table...')

  let pcoCounter = 1
  let coCounter = 1

  for (const project of ctx.projects) {
    // Create 5-8 change orders per project
    const count = randomNumber(5, 8)

    for (let i = 0; i < count; i++) {
      const template = randomItem(CHANGE_ORDER_TEMPLATES)
      const status = randomItem(STATUSES)
      const isPco = !['approved', 'rejected', 'void'].includes(status) || Math.random() > 0.3

      const proposedAmount = randomNumber(5000, 150000)
      const proposedDays = randomNumber(0, 21)
      const approvedAmount = status === 'approved' ? proposedAmount + randomNumber(-2000, 2000) : null
      const approvedDays = status === 'approved' ? proposedDays + randomNumber(-3, 3) : null

      const changeOrder = {
        company_id: project.company_id,
        project_id: project.id,
        pco_number: pcoCounter++,
        co_number: !isPco && status === 'approved' ? coCounter++ : null,
        is_pco: isPco,
        title: template.title,
        description: template.description,
        change_type: template.change_type,
        status,
        proposed_amount: proposedAmount,
        proposed_days: proposedDays,
        approved_amount: approvedAmount,
        approved_days: approvedDays,
        initiated_by: randomItem(ctx.userIds),
        assigned_to: randomItem(ctx.userIds),
        created_by: randomItem(ctx.userIds),
        ball_in_court: randomItem(ctx.userIds),
        ball_in_court_role: randomItem(['pm', 'estimating', 'owner', 'architect']),
        internal_approval_status: status === 'approved' || status === 'internally_approved' || status === 'pending_owner_review'
          ? 'approved'
          : status === 'rejected' ? 'rejected' : 'pending',
        owner_approval_status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending',
        date_created: randomDate(60, 0),
        date_estimated: status !== 'draft' && status !== 'pending_estimate' ? randomDate(45, 0) : null,
        date_internal_approved: status === 'approved' || status === 'internally_approved' || status === 'pending_owner_review' ? randomDate(30, 0) : null,
        date_owner_approved: status === 'approved' ? randomDate(14, 0) : null,
        owner_comments: status === 'approved' ? 'Approved as submitted.' : status === 'rejected' ? 'Cost exceeds budget. Please revise and resubmit.' : null,
        justification: `Reason for change: ${template.description.substring(0, 100)}...`,
      }

      const { error } = await db.from('change_orders').insert(changeOrder)

      if (error) {
        if (error.message?.includes('duplicate')) {
          console.log(`  ⏭ Skipped duplicate: ${template.title.substring(0, 40)}...`)
        } else {
          console.log(`  ✗ Error: ${error.message}`)
        }
      } else {
        console.log(`  ✓ ${isPco ? 'PCO' : 'CO'}-${isPco ? changeOrder.pco_number : changeOrder.co_number}: ${template.title.substring(0, 50)}...`)
      }
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('   Change Orders Test Data Seeding')
  console.log('═══════════════════════════════════════════')

  try {
    const ctx = await getContext()
    console.log(`\nContext loaded:`)
    console.log(`  Projects: ${ctx.projects.length}`)
    console.log(`  Users: ${ctx.userIds.length}`)

    if (ctx.projects.length === 0) {
      console.error('\n❌ No projects found. Please run seed-test-data.ts first.')
      process.exit(1)
    }

    if (ctx.userIds.length === 0) {
      console.error('\n❌ No users found. Please run seed-test-users.ts first.')
      process.exit(1)
    }

    await seedChangeOrders(ctx)

    console.log('\n═══════════════════════════════════════════')
    console.log('   ✅ Change orders seeded successfully!')
    console.log('═══════════════════════════════════════════\n')
  } catch (error) {
    console.error('\n❌ Error during seeding:', error)
    process.exit(1)
  }
}

main()
