/**
 * E2E Phase 2 Test Data Seeding Script
 *
 * Seeds test data for:
 * - Shop Drawings in various status states
 * - Job Costing / Cost Codes
 * - Subcontractors for assignment
 *
 * Usage: npx tsx scripts/seed-e2e-phase2-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const testEmail = process.env.TEST_USER_EMAIL || 'test@supersitehero.local'
const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.test file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================================
// Types
// ============================================================================

type SubmittalReviewStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_gc_review'
  | 'submitted_to_architect'
  | 'approved'
  | 'approved_as_noted'
  | 'revise_resubmit'
  | 'rejected'

type ShopDrawingPriority = 'critical_path' | 'standard' | 'non_critical'
type ShopDrawingDiscipline = 'Structural' | 'Mechanical' | 'Electrical' | 'Plumbing' | 'Architectural' | 'Fire Protection' | 'Civil' | 'Other'
type SubmittalApprovalCode = 'A' | 'B' | 'C' | 'D'

interface ShopDrawingTestData {
  title: string
  discipline: ShopDrawingDiscipline
  spec_section: string
  spec_section_title: string
  priority: ShopDrawingPriority
  review_status: SubmittalReviewStatus
  approval_code?: SubmittalApprovalCode
  long_lead_item?: boolean
  days_offset?: number // Days from today for date_required
  review_comments?: string
}

interface CostCodeTestData {
  code: string
  name: string
  cost_type: 'labor' | 'material' | 'equipment' | 'subcontract' | 'other'
  original_budget: number
  committed_cost: number
  actual_cost: number
}

// ============================================================================
// Test Data Definitions
// ============================================================================

const SHOP_DRAWINGS_TEST_DATA: ShopDrawingTestData[] = [
  // Not Submitted drawings
  {
    title: 'Structural Steel Framing - Level 1',
    discipline: 'Structural',
    spec_section: '05 12 00',
    spec_section_title: 'Structural Steel Framing',
    priority: 'critical_path',
    review_status: 'not_submitted',
    long_lead_item: true,
    days_offset: 14,
  },
  {
    title: 'HVAC Ductwork Layout - Floor 2',
    discipline: 'Mechanical',
    spec_section: '23 00 00',
    spec_section_title: 'HVAC',
    priority: 'standard',
    review_status: 'not_submitted',
    days_offset: 21,
  },

  // Submitted drawings
  {
    title: 'Electrical Panel Schedule',
    discipline: 'Electrical',
    spec_section: '26 00 00',
    spec_section_title: 'Electrical',
    priority: 'standard',
    review_status: 'submitted',
    days_offset: 10,
  },
  {
    title: 'Plumbing Riser Diagram',
    discipline: 'Plumbing',
    spec_section: '22 00 00',
    spec_section_title: 'Plumbing',
    priority: 'standard',
    review_status: 'submitted',
    days_offset: 7,
  },

  // Under GC Review drawings
  {
    title: 'Fire Sprinkler Layout - All Floors',
    discipline: 'Fire Protection',
    spec_section: '21 00 00',
    spec_section_title: 'Fire Suppression',
    priority: 'critical_path',
    review_status: 'under_gc_review',
    long_lead_item: true,
    days_offset: 5,
  },
  {
    title: 'Concrete Foundation Details',
    discipline: 'Structural',
    spec_section: '03 30 00',
    spec_section_title: 'Cast-in-Place Concrete',
    priority: 'standard',
    review_status: 'under_gc_review',
    days_offset: 12,
  },

  // Submitted to Architect
  {
    title: 'Curtain Wall System Details',
    discipline: 'Architectural',
    spec_section: '08 44 00',
    spec_section_title: 'Curtain Wall and Glazed Assemblies',
    priority: 'critical_path',
    review_status: 'submitted_to_architect',
    long_lead_item: true,
    days_offset: 3,
  },

  // Approved drawings
  {
    title: 'Metal Door Frames - Type A',
    discipline: 'Architectural',
    spec_section: '08 11 00',
    spec_section_title: 'Metal Doors and Frames',
    priority: 'standard',
    review_status: 'approved',
    approval_code: 'A',
    days_offset: -5, // Past due (already done)
    review_comments: 'No exceptions taken. Proceed with fabrication.',
  },
  {
    title: 'Structural Steel Connections',
    discipline: 'Structural',
    spec_section: '05 12 00',
    spec_section_title: 'Structural Steel Framing',
    priority: 'critical_path',
    review_status: 'approved',
    approval_code: 'A',
    days_offset: -10,
    review_comments: 'Approved. All calculations verified.',
  },

  // Approved as Noted
  {
    title: 'HVAC Equipment Schedule',
    discipline: 'Mechanical',
    spec_section: '23 00 00',
    spec_section_title: 'HVAC',
    priority: 'standard',
    review_status: 'approved_as_noted',
    approval_code: 'B',
    days_offset: -3,
    review_comments: 'Make corrections noted on sheet 3. Update equipment tags per RFI-023 response.',
  },

  // Revise & Resubmit
  {
    title: 'Electrical Single Line Diagram',
    discipline: 'Electrical',
    spec_section: '26 00 00',
    spec_section_title: 'Electrical',
    priority: 'standard',
    review_status: 'revise_resubmit',
    approval_code: 'C',
    days_offset: 7,
    review_comments: 'Revise load calculations per updated equipment schedule. Resubmit with corrected values.',
  },
  {
    title: 'Plumbing Fixture Details',
    discipline: 'Plumbing',
    spec_section: '22 00 00',
    spec_section_title: 'Plumbing',
    priority: 'non_critical',
    review_status: 'revise_resubmit',
    approval_code: 'C',
    days_offset: 14,
    review_comments: 'Coordinate with architectural fixture layout. Dimension discrepancies on sheet 2.',
  },

  // Rejected
  {
    title: 'Roofing System Details',
    discipline: 'Architectural',
    spec_section: '07 50 00',
    spec_section_title: 'Membrane Roofing',
    priority: 'standard',
    review_status: 'rejected',
    approval_code: 'D',
    days_offset: 21,
    review_comments: 'Material does not meet specification requirements. Submit alternate product data.',
  },

  // Overdue drawing (past required date, still in review)
  {
    title: 'Site Grading Plan',
    discipline: 'Civil',
    spec_section: '31 20 00',
    spec_section_title: 'Earth Moving',
    priority: 'critical_path',
    review_status: 'under_gc_review',
    days_offset: -7, // 7 days overdue
  },

  // Non-critical drawing
  {
    title: 'Signage Location Plan',
    discipline: 'Other',
    spec_section: '10 14 00',
    spec_section_title: 'Signage',
    priority: 'non_critical',
    review_status: 'not_submitted',
    days_offset: 60,
  },
]

const COST_CODES_TEST_DATA: CostCodeTestData[] = [
  // Labor codes
  {
    code: '01-1000',
    name: 'General Labor',
    cost_type: 'labor',
    original_budget: 150000,
    committed_cost: 120000,
    actual_cost: 85000,
  },
  {
    code: '01-2000',
    name: 'Skilled Labor',
    cost_type: 'labor',
    original_budget: 250000,
    committed_cost: 230000,
    actual_cost: 180000,
  },
  {
    code: '01-3000',
    name: 'Supervision',
    cost_type: 'labor',
    original_budget: 100000,
    committed_cost: 95000,
    actual_cost: 70000,
  },

  // Material codes
  {
    code: '03-3000',
    name: 'Cast-in-Place Concrete',
    cost_type: 'material',
    original_budget: 500000,
    committed_cost: 480000,
    actual_cost: 420000,
  },
  {
    code: '05-1200',
    name: 'Structural Steel',
    cost_type: 'material',
    original_budget: 800000,
    committed_cost: 850000, // Over budget
    actual_cost: 720000,
  },
  {
    code: '09-2900',
    name: 'Gypsum Board',
    cost_type: 'material',
    original_budget: 75000,
    committed_cost: 72000,
    actual_cost: 45000,
  },

  // Equipment codes
  {
    code: '01-5100',
    name: 'Crane Rental',
    cost_type: 'equipment',
    original_budget: 120000,
    committed_cost: 115000,
    actual_cost: 80000,
  },
  {
    code: '01-5200',
    name: 'Scaffolding',
    cost_type: 'equipment',
    original_budget: 45000,
    committed_cost: 50000, // Slightly over
    actual_cost: 38000,
  },

  // Subcontract codes
  {
    code: '22-0000',
    name: 'Plumbing Subcontract',
    cost_type: 'subcontract',
    original_budget: 350000,
    committed_cost: 340000,
    actual_cost: 280000,
  },
  {
    code: '26-0000',
    name: 'Electrical Subcontract',
    cost_type: 'subcontract',
    original_budget: 450000,
    committed_cost: 445000,
    actual_cost: 350000,
  },
  {
    code: '23-0000',
    name: 'HVAC Subcontract',
    cost_type: 'subcontract',
    original_budget: 400000,
    committed_cost: 420000, // Over budget
    actual_cost: 300000,
  },

  // Other codes
  {
    code: '01-4000',
    name: 'Permits & Fees',
    cost_type: 'other',
    original_budget: 50000,
    committed_cost: 48000,
    actual_cost: 48000,
  },
  {
    code: '01-4100',
    name: 'Insurance',
    cost_type: 'other',
    original_budget: 80000,
    committed_cost: 80000,
    actual_cost: 80000,
  },
]

const SUBCONTRACTORS_TEST_DATA = [
  {
    company_name: 'ABC Electrical Contractors',
    contact_name: 'John Sparks',
    email: 'john@abcelectrical.test',
    phone: '555-0101',
    trade: 'Electrical',
  },
  {
    company_name: 'XYZ Plumbing Services',
    contact_name: 'Mary Waters',
    email: 'mary@xyzplumbing.test',
    phone: '555-0102',
    trade: 'Plumbing',
  },
  {
    company_name: 'Steel Works Inc.',
    contact_name: 'Bob Steel',
    email: 'bob@steelworks.test',
    phone: '555-0103',
    trade: 'Structural',
  },
  {
    company_name: 'HVAC Solutions LLC',
    contact_name: 'Tom Cool',
    email: 'tom@hvacsolutions.test',
    phone: '555-0104',
    trade: 'Mechanical',
  },
  {
    company_name: 'Fire Protection Systems',
    contact_name: 'Sarah Safe',
    email: 'sarah@firepro.test',
    phone: '555-0105',
    trade: 'Fire Protection',
  },
]

// ============================================================================
// Main Seeding Function
// ============================================================================

async function seedE2EPhase2Data() {
  console.log('🌱 Starting E2E Phase 2 test data seeding...\n')

  // Step 1: Authenticate as test user
  console.log('1️⃣  Authenticating as test user:', testEmail)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (authError) {
    console.error('❌ Authentication failed:', authError.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log('✅ Authenticated successfully. User ID:', userId)

  // Step 2: Get user's company and project
  console.log('\n2️⃣  Getting user profile and project...')
  const { data: userProfile } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', userId)
    .single()

  if (!userProfile?.company_id) {
    console.error('❌ User does not have a company. Run seed-test-data.ts first.')
    process.exit(1)
  }

  const companyId = userProfile.company_id
  console.log('✅ Company ID:', companyId)

  // Get first active project
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .limit(1)

  if (!projects || projects.length === 0) {
    console.error('❌ No active projects found. Run seed-test-data.ts first.')
    process.exit(1)
  }

  const projectId = projects[0].id
  const projectName = projects[0].name
  console.log('✅ Using project:', projectName, '(', projectId, ')')

  // Step 3: Seed Subcontractors
  console.log('\n3️⃣  Seeding subcontractors...')
  const subcontractorIds: Record<string, string> = {}

  for (const sub of SUBCONTRACTORS_TEST_DATA) {
    const { data: existing } = await supabase
      .from('subcontractors')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', sub.email)
      .maybeSingle()

    if (existing) {
      subcontractorIds[sub.trade] = existing.id
      console.log(`  ✅ Subcontractor exists: ${sub.company_name}`)
    } else {
      const { data: newSub, error } = await supabase
        .from('subcontractors')
        .insert({
          company_id: companyId,
          company_name: sub.company_name,
          contact_name: sub.contact_name,
          email: sub.email,
          phone: sub.phone,
          trade: sub.trade,
          status: 'active',
        })
        .select()
        .single()

      if (error) {
        console.error(`  ❌ Failed to create ${sub.company_name}:`, error.message)
      } else {
        subcontractorIds[sub.trade] = newSub.id
        console.log(`  ✅ Created subcontractor: ${sub.company_name}`)
      }
    }
  }

  // Step 4: Seed Shop Drawings
  console.log('\n4️⃣  Seeding shop drawings...')
  let shopDrawingSequence = 1

  for (const sd of SHOP_DRAWINGS_TEST_DATA) {
    // Check if similar drawing already exists
    const { data: existing } = await supabase
      .from('submittals')
      .select('id')
      .eq('project_id', projectId)
      .eq('title', sd.title)
      .maybeSingle()

    if (existing) {
      console.log(`  ✅ Shop drawing exists: ${sd.title}`)
      continue
    }

    // Calculate dates
    const today = new Date()
    const dateRequired = new Date(today)
    dateRequired.setDate(today.getDate() + (sd.days_offset || 14))

    const dateSubmitted = ['submitted', 'under_gc_review', 'submitted_to_architect', 'approved', 'approved_as_noted', 'revise_resubmit', 'rejected'].includes(sd.review_status)
      ? new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null

    const dateReturned = ['approved', 'approved_as_noted', 'revise_resubmit', 'rejected'].includes(sd.review_status)
      ? new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null

    // Get discipline prefix for drawing number
    const disciplinePrefixes: Record<ShopDrawingDiscipline, string> = {
      Structural: 'SD-S',
      Mechanical: 'SD-M',
      Electrical: 'SD-E',
      Plumbing: 'SD-P',
      'Fire Protection': 'SD-FP',
      Architectural: 'SD-A',
      Civil: 'SD-C',
      Other: 'SD',
    }
    const prefix = disciplinePrefixes[sd.discipline] || 'SD'
    const drawingNumber = `${prefix}-${String(shopDrawingSequence).padStart(3, '0')}`

    // Map discipline to subcontractor
    const disciplineToTrade: Record<string, string> = {
      Electrical: 'Electrical',
      Plumbing: 'Plumbing',
      Mechanical: 'Mechanical',
      Structural: 'Structural',
      'Fire Protection': 'Fire Protection',
    }
    const subcontractorId = subcontractorIds[disciplineToTrade[sd.discipline]] || null

    // Determine ball_in_court_entity based on status
    let ballInCourtEntity = 'subcontractor'
    if (['submitted', 'under_gc_review'].includes(sd.review_status)) {
      ballInCourtEntity = 'gc'
    } else if (sd.review_status === 'submitted_to_architect') {
      ballInCourtEntity = 'architect'
    }

    const { error } = await supabase
      .from('submittals')
      .insert({
        project_id: projectId,
        company_id: companyId,
        submittal_number: `${sd.spec_section}-${shopDrawingSequence}`,
        drawing_number: drawingNumber,
        revision_number: 0,
        title: sd.title,
        description: `E2E test shop drawing: ${sd.title}`,
        spec_section: sd.spec_section,
        spec_section_title: sd.spec_section_title,
        submittal_type: 'shop_drawing',
        discipline: sd.discipline,
        priority: sd.priority,
        long_lead_item: sd.long_lead_item || false,
        review_status: sd.review_status,
        approval_code: sd.approval_code || null,
        approval_code_date: sd.approval_code ? dateReturned : null,
        review_comments: sd.review_comments || null,
        date_required: dateRequired.toISOString().split('T')[0],
        date_submitted: dateSubmitted,
        date_returned: dateReturned,
        days_for_review: 14,
        ball_in_court_entity: ballInCourtEntity,
        subcontractor_id: subcontractorId,
        reviewer_id: userId,
        created_by: userId,
      })

    if (error) {
      console.error(`  ❌ Failed to create ${sd.title}:`, error.message)
    } else {
      console.log(`  ✅ Created shop drawing: ${drawingNumber} - ${sd.title} (${sd.review_status})`)
      shopDrawingSequence++
    }
  }

  // Step 5: Seed Cost Codes
  console.log('\n5️⃣  Seeding cost codes...')

  for (const cc of COST_CODES_TEST_DATA) {
    const { data: existing } = await supabase
      .from('cost_codes')
      .select('id')
      .eq('project_id', projectId)
      .eq('code', cc.code)
      .maybeSingle()

    if (existing) {
      console.log(`  ✅ Cost code exists: ${cc.code} - ${cc.name}`)
      continue
    }

    const { error } = await supabase
      .from('cost_codes')
      .insert({
        project_id: projectId,
        company_id: companyId,
        code: cc.code,
        name: cc.name,
        cost_type: cc.cost_type,
        original_budget: cc.original_budget,
        revised_budget: cc.original_budget,
        committed_cost: cc.committed_cost,
        actual_cost: cc.actual_cost,
        is_active: true,
        created_by: userId,
      })

    if (error) {
      console.error(`  ❌ Failed to create ${cc.code}:`, error.message)
    } else {
      console.log(`  ✅ Created cost code: ${cc.code} - ${cc.name}`)
    }
  }

  // Summary
  console.log('\n✨ E2E Phase 2 test data seeding completed!\n')
  console.log('Summary:')
  console.log(`  - Subcontractors: ${SUBCONTRACTORS_TEST_DATA.length}`)
  console.log(`  - Shop Drawings: ${SHOP_DRAWINGS_TEST_DATA.length}`)
  console.log(`  - Cost Codes: ${COST_CODES_TEST_DATA.length}`)
  console.log('\nShop Drawings by Status:')

  const statusCounts: Record<string, number> = {}
  for (const sd of SHOP_DRAWINGS_TEST_DATA) {
    statusCounts[sd.review_status] = (statusCounts[sd.review_status] || 0) + 1
  }
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`  - ${status}: ${count}`)
  }

  console.log('\nYou can now run E2E tests with proper test data.\n')
}

// Export for programmatic use
export { seedE2EPhase2Data, SHOP_DRAWINGS_TEST_DATA, COST_CODES_TEST_DATA, SUBCONTRACTORS_TEST_DATA }

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`
if (isMainModule) {
  seedE2EPhase2Data()
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error)
      process.exit(1)
    })
    .finally(() => {
      process.exit(0)
    })
}
