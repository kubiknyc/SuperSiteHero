import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const testUserEmail = process.env.TEST_USER_EMAIL!

if (!supabaseUrl || !serviceRoleKey || !testUserEmail) {
  console.error('❌ Missing required environment variables')
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_USER_EMAIL')
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixUserRole() {
  console.log('🔍 Looking up user:', testUserEmail)

  // Get user from auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('❌ Error fetching auth users:', authError.message)
    process.exit(1)
  }

  const authUser = authUsers.users.find(u => u.email === testUserEmail)

  if (!authUser) {
    console.error('❌ User not found in auth.users:', testUserEmail)
    console.log('\nAvailable users:')
    authUsers.users.forEach(u => console.log(`  - ${u.email}`))
    process.exit(1)
  }

  console.log('✅ Found user in auth.users')
  console.log('   ID:', authUser.id)
  console.log('   Email:', authUser.email)

  // Check current role in users table
  const { data: currentUser, error: fetchError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', authUser.id)
    .single()

  if (fetchError) {
    console.error('❌ Error fetching user from users table:', fetchError.message)
    process.exit(1)
  }

  console.log('\n📋 Current user data:')
  console.log('   ID:', currentUser.id)
  console.log('   Email:', currentUser.email)
  console.log('   Current Role:', currentUser.role)

  if (currentUser.role === 'superintendent') {
    console.log('\n✅ User already has superintendent role - no changes needed!')
    return
  }

  // Update role to superintendent
  console.log('\n🔧 Updating role to superintendent...')

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ role: 'superintendent' })
    .eq('id', authUser.id)
    .select()
    .single()

  if (updateError) {
    console.error('❌ Error updating user role:', updateError.message)
    process.exit(1)
  }

  console.log('✅ Successfully updated user role!')
  console.log('\n📋 Updated user data:')
  console.log('   ID:', updatedUser.id)
  console.log('   Email:', updatedUser.email)
  console.log('   New Role:', updatedUser.role)
  console.log('\n🎉 Done! Please log out and log back in to the application.')
}

fixUserRole().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
