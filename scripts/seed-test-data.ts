/**
 * Database Seeding Script for E2E Tests
 *
 * This script creates test data in the database for E2E testing.
 * It ensures that the test user has:
 * - A user profile in the users table
 * - A company record
 * - Sample projects assigned to the user
 * - Sample data for other modules
 *
 * Usage: npx tsx scripts/seed-test-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.test (for E2E testing)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const testEmail = process.env.TEST_USER_EMAIL || 'test@supersitehero.local'
const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedTestData() {
  console.log('🌱 Starting database seeding...\n')

  // Step 1: Authenticate as test user
  console.log('1️⃣  Authenticating as test user:', testEmail)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (authError) {
    console.error('❌ Authentication failed:', authError.message)
    console.log('Please ensure the test user exists in Supabase Auth')
    process.exit(1)
  }

  const userId = authData.user.id
  console.log('✅ Authenticated successfully. User ID:', userId)

  // Step 2: Check if user already exists in users table
  console.log('\n2️⃣  Checking for existing user profile...')
  const { data: existingUserProfile } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', userId)
    .maybeSingle()

  let companyId: string

  if (existingUserProfile?.company_id) {
    companyId = existingUserProfile.company_id
    console.log('✅ User already has company:', companyId)
  } else {
    // Try to find or list available companies
    console.log('\n❌ User does not have a company_id.')
    console.log('\nPlease do one of the following:')
    console.log('1. Create a company in Supabase dashboard')
    console.log('2. Manually insert a user record with company_id')
    console.log('3. Update the RLS policies to allow company creation')
    console.log('\nSQL to create a test company and user:')
    console.log(`
-- Create company
INSERT INTO companies (name, slug)
VALUES ('Test Company', 'test-company');

-- Get the company ID (copy from the result above)
-- Then create user profile:
INSERT INTO users (id, company_id, email, first_name, last_name, role, status)
VALUES (
  '${userId}',
  '<paste-company-id-here>',
  '${testEmail}',
  'Eli',
  'Vidyaev',
  'superintendent',
  'active'
);
    `)
    process.exit(1)
  }

  // Step 3: Verify user profile exists (we already checked above)
  console.log('\n3️⃣  User profile confirmed')
  console.log(`   - User ID: ${userId}`)
  console.log(`   - Company ID: ${companyId}`)
  console.log(`   - Name: ${existingUserProfile.first_name} ${existingUserProfile.last_name}`)
  console.log(`   - Role: ${existingUserProfile.role}`)

  // Step 4: Check existing projects first
  console.log('\n4️⃣  Checking existing projects...')
  const { data: existingProjects } = await supabase
    .from('projects')
    .select('id, name, project_number, status')
    .eq('company_id', companyId)

  if (existingProjects && existingProjects.length > 0) {
    console.log(`✅ Found ${existingProjects.length} existing projects:`)
    existingProjects.forEach(p => {
      console.log(`   - ${p.name} (${p.project_number}) - ${p.status}`)
    })
  } else {
    console.log('📝 No existing projects found')
  }

  // Step 5: Create sample projects if needed
  console.log('\n5️⃣  Creating sample projects...')
  const projects = [
    {
      name: 'Downtown Office Building',
      project_number: '2024-001',
      description: 'Modern office complex in downtown district',
      address: '456 Main Street',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      start_date: '2024-01-15',
      end_date: '2025-06-30',
      status: 'active' as const,
      company_id: companyId,
      budget: 5000000,
      weather_units: 'imperial' as const,
      features_enabled: {
        daily_reports: true,
        documents: true,
        workflows: true,
        tasks: true,
        checklists: true,
        punch_lists: true,
        safety: true,
        inspections: true,
        material_tracking: true,
        photos: true,
        takeoff: true,
      },
    },
    {
      name: 'Residential Tower',
      project_number: '2024-002',
      description: '20-story residential building',
      address: '789 Park Avenue',
      city: 'New York',
      state: 'NY',
      zip: '10021',
      start_date: '2024-03-01',
      end_date: '2025-12-31',
      status: 'active' as const,
      company_id: companyId,
      budget: 12000000,
      weather_units: 'imperial' as const,
      features_enabled: {
        daily_reports: true,
        documents: true,
        workflows: true,
        tasks: true,
        checklists: true,
        punch_lists: true,
        safety: true,
        inspections: true,
        material_tracking: true,
        photos: true,
        takeoff: true,
      },
    },
    {
      name: 'Shopping Mall Renovation',
      project_number: '2024-003',
      description: 'Complete renovation of existing shopping center',
      address: '321 Commerce Drive',
      city: 'Brooklyn',
      state: 'NY',
      zip: '11201',
      start_date: '2024-02-01',
      end_date: '2024-11-30',
      status: 'planning' as const,
      company_id: companyId,
      budget: 3500000,
      weather_units: 'imperial' as const,
      features_enabled: {
        daily_reports: true,
        documents: true,
        workflows: true,
        tasks: true,
        checklists: true,
        punch_lists: true,
        safety: true,
        inspections: true,
        material_tracking: true,
        photos: true,
        takeoff: true,
      },
    },
  ]

  for (const project of projects) {
    // Check if project already exists
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id, name')
      .eq('project_number', project.project_number)
      .eq('company_id', companyId)
      .maybeSingle()

    if (existingProject) {
      console.log(`  ✅ Project already exists: ${existingProject.name}`)

      // Ensure user is assigned to project
      const { data: assignment } = await supabase
        .from('project_users')
        .select('*')
        .eq('project_id', existingProject.id)
        .eq('user_id', userId)
        .maybeSingle()

      if (!assignment) {
        await supabase
          .from('project_users')
          .insert({
            project_id: existingProject.id,
            user_id: userId,
          })
        console.log(`    ➕ Assigned user to ${existingProject.name}`)
      }
    } else {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single()

      if (projectError) {
        console.error(`  ❌ Failed to create ${project.name}:`, projectError.message)
        continue
      }

      console.log(`  ✅ Created: ${project.name}`)

      // Assign user to project
      await supabase
        .from('project_users')
        .insert({
          project_id: newProject.id,
          user_id: userId,
        })
      console.log(`    ➕ Assigned user to project`)
    }
  }

  // Step 6: Create sample contacts
  console.log('\n6️⃣  Creating sample contacts...')
  const contacts = [
    {
      company_id: companyId,
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@example.com',
      phone: '555-0101',
      company_name: 'ABC Electrical',
      role: 'Electrician',
      contact_type: 'subcontractor' as const,
    },
    {
      company_id: companyId,
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah.j@example.com',
      phone: '555-0102',
      company_name: 'XYZ Plumbing',
      role: 'Plumber',
      contact_type: 'subcontractor' as const,
    },
  ]

  for (const contact of contacts) {
    const { data: existing } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', contact.email)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!existing) {
      await supabase.from('contacts').insert(contact)
      console.log(`  ✅ Created contact: ${contact.first_name} ${contact.last_name}`)
    } else {
      console.log(`  ✅ Contact already exists: ${contact.first_name} ${contact.last_name}`)
    }
  }

  console.log('\n✨ Database seeding completed successfully!\n')
  console.log('Summary:')
  console.log(`  - User ID: ${userId}`)
  console.log(`  - Company ID: ${companyId}`)
  console.log(`  - Projects: 3`)
  console.log(`  - Contacts: 2`)
  console.log('\nYou can now run E2E tests with proper test data.\n')
}

// Run the seeding
seedTestData()
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
