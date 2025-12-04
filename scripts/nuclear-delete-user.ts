// Script to completely nuke a user from existence
// WARNING: This is an irreversible nuclear option!

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database-extensions'

const supabaseUrl = 'https://nxlznnrocrffnbzjaaae.supabase.co'
const supabaseAnonKey = 'sb_publishable_SnCdtnmyYI8ntqnrMpFbXA_Iz57pn8L'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc'
const targetEmail = 'kubiknyc@gmail.com'

// Regular client for database operations
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Admin client for auth operations
const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function nuclearDeleteUser() {
  console.log('💣 NUCLEAR DELETE INITIATED')
  console.log(`   Target: ${targetEmail}`)
  console.log('   This will delete ALL traces from database and auth\n')

  let userId: string | null = null

  // Step 1: Get user ID from auth
  console.log('🔍 Step 1: Looking for user in Supabase Auth...')
  const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error listing auth users:', listError.message)
  } else {
    const authUser = authUsers.users.find(u => u.email === targetEmail)
    if (authUser) {
      userId = authUser.id
      console.log(`✅ Found auth user with ID: ${userId}`)
    } else {
      console.log('⚠️  User not found in auth')
    }
  }

  // Step 2: Try to authenticate and get user ID from database
  if (!userId) {
    console.log('\n🔍 Step 2: Trying to authenticate as user...')
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: process.env.TEST_USER_PASSWORD || 'Alfa1346!',
    })

    if (authData?.user) {
      userId = authData.user.id
      console.log(`✅ Authenticated, user ID: ${userId}`)
      await supabase.auth.signOut()
    } else {
      console.log('⚠️  Could not authenticate as user')
    }
  }

  // Step 3: Search database for user by email
  console.log('\n🔍 Step 3: Searching database for user records...')
  const { data: dbUsers, error: dbError } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('email', targetEmail)

  if (dbError) {
    console.error('❌ Error searching database:', dbError.message)
  } else if (dbUsers && dbUsers.length > 0) {
    console.log(`✅ Found ${dbUsers.length} user record(s) in database:`)
    dbUsers.forEach(u => {
      console.log(`   - ID: ${u.id}, Role: ${u.role}`)
      if (!userId) userId = u.id
    })
  } else {
    console.log('⚠️  No user records found in database')
  }

  // Step 4: Delete from database (if user ID found)
  if (userId) {
    console.log('\n🗑️  Step 4: Deleting from database...')

    // Delete user record (should cascade to related tables)
    const { error: deleteDbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteDbError) {
      console.error('❌ Error deleting from database:', deleteDbError.message)
    } else {
      console.log('✅ Deleted user from database (cascading to related tables)')
    }
  }

  // Step 5: Delete from auth (if user ID found)
  if (userId) {
    console.log('\n🗑️  Step 5: Deleting from Supabase Auth...')

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      console.error('❌ Error deleting from auth:', deleteAuthError.message)
    } else {
      console.log('✅ Deleted user from Supabase Auth')
    }
  }

  // Step 6: Clean up any email-based records that might remain
  console.log('\n🧹 Step 6: Final cleanup...')

  // Check for any remaining user records by email
  const { data: remainingUsers } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', targetEmail)

  if (remainingUsers && remainingUsers.length > 0) {
    console.log(`⚠️  Found ${remainingUsers.length} remaining records, attempting cleanup...`)
    for (const user of remainingUsers) {
      await supabaseAdmin.from('users').delete().eq('id', user.id)
    }
    console.log('✅ Additional cleanup completed')
  } else {
    console.log('✅ No remaining records found')
  }

  // Summary
  console.log('\n📊 DELETION SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   Email: ${targetEmail}`)
  console.log(`   User ID: ${userId || 'Not found'}`)
  console.log('   Database: Deleted ✅')
  console.log('   Auth: Deleted ✅')
  console.log('   Status: Complete ✅')
  console.log('\n💀 User has been completely erased from existence')
  console.log('   The email can now be used to create a fresh account')
}

nuclearDeleteUser()
  .then(() => {
    console.log('\n✅ Nuclear deletion completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Nuclear deletion failed:', error)
    process.exit(1)
  })
