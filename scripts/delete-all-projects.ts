// Script to delete all projects from the database
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

async function deleteAllProjects() {
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
  console.log('🗑️  Starting to delete all projects...')

  // First, get all projects to see what we're deleting
  const { data: projects, error: fetchError } = await supabase
    .from('projects')
    .select('id, name, project_number')

  if (fetchError) {
    console.error('❌ Error fetching projects:', fetchError)
    return
  }

  if (!projects || projects.length === 0) {
    console.log('✅ No projects found in database')
    return
  }

  console.log(`📋 Found ${projects.length} projects:`)
  projects.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (${p.project_number})`)
  })

  // Delete projects one by one (to handle cascading deletes properly)
  let successCount = 0
  let errorCount = 0

  for (const project of projects) {
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id)

    if (deleteError) {
      console.error(`   ❌ Failed to delete "${project.name}":`, deleteError.message)
      errorCount++
    } else {
      console.log(`   ✅ Deleted "${project.name}"`)
      successCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Successfully deleted: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)

  // Sign out
  await supabase.auth.signOut()
}

deleteAllProjects()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  })
