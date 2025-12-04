// Script to delete all users from the database
// WARNING: This is a destructive operation!

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database-extensions'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!
const testUserEmail = process.env.TEST_USER_EMAIL!
const testUserPassword = process.env.TEST_USER_PASSWORD!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

if (!testUserEmail || !testUserPassword) {
  console.error('❌ Missing test user credentials in .env')
  process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

async function deleteAllUsers() {
  console.log('🔐 Authenticating...')

  // Sign in with test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testUserEmail,
    password: testUserPassword,
  })

  if (authError || !authData.user) {
    console.error('❌ Authentication failed:', authError?.message)
    return
  }

  console.log(`✅ Authenticated as ${authData.user.email}`)
  console.log('🗑️  Starting to delete all users...')

  // First, get all users to see what we're deleting
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, email, role')

  if (fetchError) {
    console.error('❌ Error fetching users:', fetchError)
    return
  }

  if (!users || users.length === 0) {
    console.log('✅ No users found in database')
    return
  }

  console.log(`📋 Found ${users.length} users:`)
  users.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.email} (${u.role})`)
  })

  // Delete users one by one
  let successCount = 0
  let errorCount = 0

  for (const user of users) {
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    if (deleteError) {
      console.error(`   ❌ Failed to delete "${user.email}":`, deleteError.message)
      errorCount++
    } else {
      console.log(`   ✅ Deleted "${user.email}"`)
      successCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Successfully deleted: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)

  // Sign out
  await supabase.auth.signOut()
}

deleteAllUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  })
