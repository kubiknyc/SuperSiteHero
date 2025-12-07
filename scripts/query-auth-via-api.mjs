#!/usr/bin/env node
// Query auth.users via Supabase Admin API instead of direct SQL
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nxlznnrocrffnbzjaaae.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc'

console.log('🔐 Querying Auth Users via Supabase Admin API\n')

// Create admin client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function listAuthUsers() {
  try {
    console.log('⏳ Fetching auth users...\n')

    // Use Supabase Admin Auth API
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('❌ Error:', error.message)
      return
    }

    console.log(`✅ Found ${users.length} users:\n`)
    console.log('─'.repeat(100))

    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
      console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`)
      console.log(`   Confirmed: ${user.email_confirmed_at ? '✅ Yes' : '❌ No'}`)
      console.log(`   Role: ${user.role || 'authenticated'}`)
      console.log('─'.repeat(100))
    })

    console.log(`\n📊 Total Users: ${users.length}`)
    console.log('\n✅ This is the correct way to access auth.users!')
    console.log('💡 Use supabase.auth.admin.* methods instead of direct SQL queries')

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

listAuthUsers()
