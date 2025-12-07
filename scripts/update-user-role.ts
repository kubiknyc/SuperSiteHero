/**
 * Update user role to project_manager
 * Run with: npx tsx scripts/update-user-role.ts <email> <new-role>
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

async function updateUserRole(email: string, newRole: string) {
  console.log('🔧 Updating user role...')
  console.log('=' .repeat(60))
  console.log(`Email: ${email}`)
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

  // Step 1: Find user by email (trying with ilike for case-insensitive match)
  console.log('1️⃣ Finding user...')
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .maybeSingle()

  if (fetchError) {
    console.error('❌ Error fetching user:', fetchError.message)
    console.error('Error details:', fetchError)
    process.exit(1)
  }

  if (!users) {
    console.error('❌ User not found!')
    console.error(`No user found with email: ${email}`)
    console.log()
    console.log('💡 TIP: You can also update by user ID directly:')
    console.log('   npx tsx scripts/update-user-role-by-id.ts <user-id> <new-role>')
    process.exit(1)
  }

  console.log('✅ User found!')
  console.log(`   ID: ${users.id}`)
  console.log(`   Name: ${users.first_name} ${users.last_name}`)
  console.log(`   Current Role: ${users.role}`)
  console.log()

  // Step 2: Update role
  console.log('2️⃣ Updating role...')
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', users.id)
    .select()
    .single()

  if (updateError) {
    console.error('❌ Error updating role:', updateError.message)
    process.exit(1)
  }

  console.log('✅ Role updated successfully!')
  console.log(`   Old Role: ${users.role}`)
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
  console.log('2. Try creating a project again')
  console.log()
}

// Get email and role from command line
const email = process.argv[2]
const newRole = process.argv[3]

if (!email || !newRole) {
  console.error('Usage: npx tsx scripts/update-user-role.ts <email> <new-role>')
  console.error('Example: npx tsx scripts/update-user-role.ts user@example.com project_manager')
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

updateUserRole(email, newRole).catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
