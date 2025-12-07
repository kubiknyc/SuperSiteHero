/**
 * Update user role by user ID
 * Run with: npx tsx scripts/update-user-role-by-id.ts <user-id> <new-role>
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function updateUserRole(userId: string, newRole: string) {
  console.log('🔧 Updating user role by ID...')
  console.log('=' .repeat(60))
  console.log(`User ID: ${userId}`)
  console.log(`New Role: ${newRole}`)
  console.log('=' .repeat(60))
  console.log()

  // Valid roles from database schema
  const validRoles = [
    'superintendent',
    'project_manager',
    'office_admin',
    'field_employee',
    'subcontractor',
    'architect',
    'owner',
    'admin'
  ]

  if (!validRoles.includes(newRole)) {
    console.error('❌ Invalid role!')
    console.error(`Valid roles: ${validRoles.join(', ')}`)
    process.exit(1)
  }

  // Step 1: Get current user info
  console.log('1️⃣ Getting current user info...')
  const { data: currentUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (fetchError) {
    console.error('❌ Error fetching user:', fetchError.message)
    process.exit(1)
  }

  if (!currentUser) {
    console.error('❌ User not found!')
    console.error(`No user found with ID: ${userId}`)
    process.exit(1)
  }

  console.log('✅ User found!')
  console.log(`   Name: ${currentUser.first_name} ${currentUser.last_name}`)
  console.log(`   Email: ${currentUser.email}`)
  console.log(`   Current Role: ${currentUser.role}`)
  console.log()

  // Step 2: Update role
  console.log('2️⃣ Updating role...')
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('❌ Error updating role:', updateError.message)
    process.exit(1)
  }

  console.log('✅ Role updated successfully!')
  console.log(`   Old Role: ${currentUser.role}`)
  console.log(`   New Role: ${updated.role}`)
  console.log()

  // Step 3: Summary
  console.log('=' .repeat(60))
  console.log('🎉 USER ROLE UPDATE COMPLETE!')
  console.log('=' .repeat(60))
  console.log()
  console.log('✅ Role updated successfully')
  console.log('✅ User can now perform actions allowed by this role')
  console.log()
  console.log('Next steps:')
  console.log('1. Refresh the browser or log out and log back in')
  console.log('2. Clear localStorage: localStorage.clear()')
  console.log('3. Try creating a project again')
  console.log()
}

// Get user ID and role from command line
const userId = process.argv[2]
const newRole = process.argv[3]

if (!userId || !newRole) {
  console.error('Usage: npx tsx scripts/update-user-role-by-id.ts <user-id> <new-role>')
  console.error('Example: npx tsx scripts/update-user-role-by-id.ts b7f15635-5d79-44af-954f-d12689d7e7b6 project_manager')
  console.error()
  console.error('Valid roles:')
  console.error('  - superintendent')
  console.error('  - project_manager')
  console.error('  - office_admin')
  console.error('  - field_employee')
  console.error('  - subcontractor')
  console.error('  - architect')
  console.error('  - owner')
  console.error('  - admin')
  process.exit(1)
}

updateUserRole(userId, newRole).catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
