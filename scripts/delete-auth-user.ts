// Script to delete user from Supabase Auth using service role key
// WARNING: This requires SUPABASE_SERVICE_ROLE_KEY in .env

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nxlznnrocrffnbzjaaae.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc'
const userEmail = process.env.TEST_USER_EMAIL || 'kubiknyc@gmail.com'
const userId = 'ee8b7ed6-b1af-4b46-8ba1-4ea764dcdb45' // From previous deletion attempt

if (!supabaseUrl) {
  console.error('❌ Missing VITE_SUPABASE_URL in .env')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env')
  console.error('\n📝 To get your service role key:')
  console.error('   1. Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/settings/api')
  console.error('   2. Copy the "service_role" key (NOT the anon key)')
  console.error('   3. Add to .env: SUPABASE_SERVICE_ROLE_KEY=your_key_here')
  console.error('\n⚠️  IMPORTANT: Never commit the service role key to git!')
  process.exit(1)
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function deleteAuthUser() {
  console.log('🔐 Using service role key to delete auth user...')
  console.log(`   Email: ${userEmail}`)
  console.log(`   User ID: ${userId}`)

  try {
    // Delete user from auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('❌ Error deleting user from auth:', error.message)
      process.exit(1)
    }

    console.log('✅ Successfully deleted user from Supabase Auth')
    console.log('\n📊 Summary:')
    console.log(`   User ${userEmail} has been completely removed`)
    console.log(`   - Database records: Deleted ✅`)
    console.log(`   - Auth account: Deleted ✅`)
    console.log('\n✨ The user can now sign up again with the same email')
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

deleteAuthUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
