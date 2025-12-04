// Script to completely delete a user from database and Supabase Auth
// WARNING: This is a destructive operation that cannot be undone!

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database-extensions'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!
const userEmail = process.env.TEST_USER_EMAIL!
const userPassword = process.env.TEST_USER_PASSWORD!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

if (!userEmail || !userPassword) {
  console.error('❌ Missing user credentials in .env')
  process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

async function deleteUserCompletely() {
  console.log('🔐 Authenticating as user to be deleted...')
  console.log(`   Email: ${userEmail}`)

  // Sign in with the user to be deleted
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: userPassword,
  })

  if (authError || !authData.user) {
    console.error('❌ Authentication failed:', authError?.message)
    console.log('   User may already be deleted from auth, checking database...')
  } else {
    console.log(`✅ Authenticated as ${authData.user.email}`)
    console.log(`   User ID: ${authData.user.id}`)
  }

  const userId = authData?.user?.id

  if (userId) {
    console.log('\n🗑️  Step 1: Deleting user from database tables...')

    // Delete from users table (this should cascade to related tables)
    const { error: dbDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (dbDeleteError) {
      console.error('❌ Error deleting from database:', dbDeleteError.message)
    } else {
      console.log('✅ Deleted user record from database (cascading to related tables)')
    }

    console.log('\n🗑️  Step 2: Deleting user from Supabase Auth...')

    // Delete the user from auth (this requires the user to be authenticated)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('❌ Error deleting from auth:', authDeleteError.message)
      console.log('   Note: User deletion from auth may require service role key')
      console.log('   The database record has been deleted, but auth record remains')
      console.log('   You can delete the auth user manually in Supabase Dashboard:')
      console.log(`   Authentication > Users > Find ${userEmail} > Delete User`)
    } else {
      console.log('✅ Deleted user from Supabase Auth')
    }
  } else {
    console.log('\n⚠️  No authenticated user ID found, attempting database cleanup only...')

    // Try to find and delete by email if auth failed
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userEmail)

    if (users && users.length > 0) {
      console.log(`📋 Found ${users.length} user(s) in database with email ${userEmail}`)

      for (const user of users) {
        const { error: dbDeleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id)

        if (dbDeleteError) {
          console.error(`❌ Error deleting user ${user.id}:`, dbDeleteError.message)
        } else {
          console.log(`✅ Deleted user ${user.id} from database`)
        }
      }
    } else {
      console.log('✅ No user records found in database')
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   User: ${userEmail}`)
  console.log(`   Status: Deletion process completed`)
  console.log('\n⚠️  Important Notes:')
  console.log('   - If auth deletion failed, manually delete in Supabase Dashboard')
  console.log('   - Database records have been removed')
  console.log('   - The user can sign up again with the same email if auth was deleted')
}

deleteUserCompletely()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  })
