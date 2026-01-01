/**
 * Seed Test Users Script
 *
 * Creates test users with different roles for comprehensive testing:
 * - superintendent (full access)
 * - project_manager
 * - office_admin
 * - field_employee
 * - subcontractor
 * - architect
 * - client (read-only)
 *
 * Usage: npx tsx scripts/seed-test-users.ts
 *
 * NOTE: This script requires the Supabase service role key to create auth users.
 * Set SUPABASE_SERVICE_ROLE_KEY in your .env file.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables - try .env.test first, fall back to .env
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') })
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL in .env file')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env file')
  console.log('\nTo get this key:')
  console.log('1. Go to your Supabase dashboard')
  console.log('2. Settings > API')
  console.log('3. Copy the "service_role" key (NOT the anon key)')
  console.log('4. Add to .env: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  process.exit(1)
}

// Use service role client to bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// E2E Test users (from .env.test) - these match the credentials in smoke-crawl tests
const E2E_TEST_USERS = [
  {
    email: process.env.TEST_USER_EMAIL || 'test@supersitehero.local',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User',
    role: 'superintendent', // General test user with full access
    phone: '555-E2E-0001',
  },
  {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@supersitehero.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
    first_name: 'Admin',
    last_name: 'E2E',
    role: 'superintendent', // Admin has full access
    phone: '555-E2E-0002',
  },
  {
    email: process.env.TEST_PM_EMAIL || 'pm@supersitehero.local',
    password: process.env.TEST_PM_PASSWORD || 'PMPassword123!',
    first_name: 'PM',
    last_name: 'E2E',
    role: 'project_manager',
    phone: '555-E2E-0003',
  },
  {
    email: process.env.TEST_SUPER_EMAIL || 'super@supersitehero.local',
    password: process.env.TEST_SUPER_PASSWORD || 'SuperPassword123!',
    first_name: 'Super',
    last_name: 'E2E',
    role: 'superintendent',
    phone: '555-E2E-0004',
  },
  {
    email: process.env.TEST_SUB_EMAIL || 'sub@supersitehero.local',
    password: process.env.TEST_SUB_PASSWORD || 'SubPassword123!',
    first_name: 'Sub',
    last_name: 'E2E',
    role: 'subcontractor',
    phone: '555-E2E-0005',
  },
]

// Manual test user definitions (for development testing)
const MANUAL_TEST_USERS = [
  {
    email: 'superintendent@test.supersitehero.com',
    password: 'TestSuper123!',
    first_name: 'Sarah',
    last_name: 'Superintendent',
    role: 'superintendent',
    phone: '555-001-0001',
  },
  {
    email: 'pm@test.supersitehero.com',
    password: 'TestPM123!',
    first_name: 'Paul',
    last_name: 'ProjectManager',
    role: 'project_manager',
    phone: '555-001-0002',
  },
  {
    email: 'admin@test.supersitehero.com',
    password: 'TestAdmin123!',
    first_name: 'Amy',
    last_name: 'OfficeAdmin',
    role: 'office_admin',
    phone: '555-001-0003',
  },
  {
    email: 'field@test.supersitehero.com',
    password: 'TestField123!',
    first_name: 'Frank',
    last_name: 'FieldEmployee',
    role: 'field_employee',
    phone: '555-001-0004',
  },
  {
    email: 'subcontractor@test.supersitehero.com',
    password: 'TestSub123!',
    first_name: 'Steve',
    last_name: 'Subcontractor',
    role: 'subcontractor',
    phone: '555-001-0005',
  },
  {
    email: 'architect@test.supersitehero.com',
    password: 'TestArch123!',
    first_name: 'Alice',
    last_name: 'Architect',
    role: 'architect',
    phone: '555-001-0006',
  },
  {
    email: 'client@test.supersitehero.com',
    password: 'TestClient123!',
    first_name: 'Charlie',
    last_name: 'Client',
    role: 'client',
    phone: '555-001-0007',
  },
  {
    email: 'owner@test.supersitehero.com',
    password: 'TestOwner123!',
    first_name: 'Oliver',
    last_name: 'Owner',
    role: 'client', // Owner uses client role for portal access
    phone: '555-001-0008',
  },
]

// Combined test users - E2E users first, then manual test users
const TEST_USERS = [...E2E_TEST_USERS, ...MANUAL_TEST_USERS]

interface CreatedUser {
  id: string
  email: string
  role: string
}

async function getOrCreateCompany(): Promise<string> {
  console.log('\n1. Getting or creating test company...')

  // Check for existing test company
  const { data: existingCompany } = await supabaseAdmin
    .from('companies')
    .select('id, name')
    .eq('slug', 'test-company')
    .maybeSingle()

  if (existingCompany) {
    console.log(`   Found existing company: ${existingCompany.name} (${existingCompany.id})`)
    return existingCompany.id
  }

  // Create test company
  const { data: newCompany, error } = await supabaseAdmin
    .from('companies')
    .insert({
      name: 'Test Construction Co',
      slug: 'test-company',
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        date_format: 'MM/DD/YYYY',
      },
    })
    .select()
    .single()

  if (error) {
    console.error('   Failed to create company:', error.message)
    throw error
  }

  console.log(`   Created new company: ${newCompany.name} (${newCompany.id})`)
  return newCompany.id
}

async function createAuthUser(
  email: string,
  password: string
): Promise<{ id: string; isNew: boolean } | null> {
  // Check if user already exists by trying to get user by email
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find((u) => u.email === email)

  if (existingUser) {
    return { id: existingUser.id, isNew: false }
  }

  // Create new auth user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
  })

  if (error) {
    console.error(`   Failed to create auth user ${email}:`, error.message)
    return null
  }

  return { id: data.user.id, isNew: true }
}

async function createUserProfile(
  userId: string,
  companyId: string,
  userData: (typeof TEST_USERS)[0]
): Promise<boolean> {
  // Check if profile already exists
  const { data: existingProfile } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (existingProfile) {
    // Update role if different
    if (existingProfile.role !== userData.role) {
      await supabaseAdmin
        .from('users')
        .update({ role: userData.role })
        .eq('id', userId)
      console.log(`   Updated role to ${userData.role}`)
    }
    return true
  }

  // Create user profile
  const { error } = await supabaseAdmin.from('users').insert({
    id: userId,
    company_id: companyId,
    email: userData.email,
    first_name: userData.first_name,
    last_name: userData.last_name,
    role: userData.role,
    phone: userData.phone,
    is_active: true,
    notification_preferences: {
      email: true,
      push: true,
      in_app: true,
    },
  })

  if (error) {
    console.error(`   Failed to create profile for ${userData.email}:`, error.message)
    return false
  }

  return true
}

async function assignUserToProjects(userId: string, companyId: string, role: string): Promise<void> {
  // Get all projects for the company
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId)

  if (!projects || projects.length === 0) {
    console.log('   No projects found to assign user to')
    return
  }

  // Determine permissions based on role
  const permissions = {
    superintendent: { can_edit: true, can_delete: true, can_approve: true },
    project_manager: { can_edit: true, can_delete: true, can_approve: true },
    office_admin: { can_edit: true, can_delete: true, can_approve: false },
    field_employee: { can_edit: true, can_delete: false, can_approve: false },
    subcontractor: { can_edit: false, can_delete: false, can_approve: false },
    architect: { can_edit: true, can_delete: false, can_approve: true },
    client: { can_edit: false, can_delete: false, can_approve: false },
  }

  const userPermissions = permissions[role as keyof typeof permissions] || permissions.field_employee

  for (const project of projects) {
    // Check if assignment exists
    const { data: existingAssignment } = await supabaseAdmin
      .from('project_users')
      .select('*')
      .eq('project_id', project.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingAssignment) {
      await supabaseAdmin.from('project_users').insert({
        project_id: project.id,
        user_id: userId,
        project_role: role,
        ...userPermissions,
      })
    }
  }

  console.log(`   Assigned to ${projects.length} project(s)`)
}

async function seedTestUsers() {
  console.log('========================================')
  console.log('   Test Users Seeding Script')
  console.log('========================================\n')

  const createdUsers: CreatedUser[] = []

  try {
    // Step 1: Get or create company
    const companyId = await getOrCreateCompany()

    // Step 2: Create each test user
    console.log('\n2. Creating test users...\n')

    for (const userData of TEST_USERS) {
      console.log(`   Processing: ${userData.email} (${userData.role})`)

      // Create auth user
      const authResult = await createAuthUser(userData.email, userData.password)
      if (!authResult) {
        console.log(`   SKIPPED - Failed to create auth user`)
        continue
      }

      const { id: userId, isNew } = authResult
      if (isNew) {
        console.log(`   Created auth user: ${userId}`)
      } else {
        console.log(`   Auth user exists: ${userId}`)
      }

      // Create user profile
      const profileCreated = await createUserProfile(userId, companyId, userData)
      if (!profileCreated) {
        console.log(`   SKIPPED - Failed to create profile`)
        continue
      }

      // Assign to projects
      await assignUserToProjects(userId, companyId, userData.role)

      createdUsers.push({
        id: userId,
        email: userData.email,
        role: userData.role,
      })

      console.log(`   SUCCESS`)
      console.log('')
    }

    // Summary
    console.log('\n========================================')
    console.log('   Summary')
    console.log('========================================\n')
    console.log(`Company ID: ${companyId}`)
    console.log(`Users created/updated: ${createdUsers.length}/${TEST_USERS.length}\n`)

    console.log('Test User Credentials:')
    console.log('----------------------')
    for (const userData of TEST_USERS) {
      console.log(`\n${userData.role.toUpperCase()}:`)
      console.log(`  Email: ${userData.email}`)
      console.log(`  Password: ${userData.password}`)
      console.log(`  Name: ${userData.first_name} ${userData.last_name}`)
    }

    console.log('\n========================================')
    console.log('   Seeding Complete!')
    console.log('========================================\n')
  } catch (error) {
    console.error('\nFatal error during seeding:', error)
    process.exit(1)
  }
}

// Also export for programmatic use
export { TEST_USERS, seedTestUsers }

// Run if called directly
seedTestUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
