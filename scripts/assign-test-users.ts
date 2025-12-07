/**
 * Assign test users to main company and projects
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('Assigning test users to main company and projects...\n')

  // Get the main company ID (from the existing user's company)
  const mainCompanyId = '3c146527-62a9-4f4d-97db-c7546da9dfed'

  // Update all test users to use the main company
  const { data: testUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, email, role')
    .like('email', '%@test.supersitehero.com')

  if (fetchError) {
    console.log('Error fetching test users:', fetchError.message)
    return
  }

  console.log(`Found ${testUsers?.length || 0} test users\n`)

  for (const user of testUsers || []) {
    // Update company_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ company_id: mainCompanyId })
      .eq('id', user.id)

    if (updateError) {
      console.log(`❌ Error updating ${user.email}: ${updateError.message}`)
    } else {
      console.log(`✅ Updated ${user.email} to main company`)
    }
  }

  // Get all projects in the main company
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', mainCompanyId)

  console.log(`\nFound ${projects?.length || 0} projects\n`)

  // Permission matrix by role
  const permissions: Record<string, { can_edit: boolean, can_delete: boolean, can_approve: boolean }> = {
    superintendent: { can_edit: true, can_delete: true, can_approve: true },
    project_manager: { can_edit: true, can_delete: true, can_approve: true },
    office_admin: { can_edit: true, can_delete: true, can_approve: false },
    field_employee: { can_edit: true, can_delete: false, can_approve: false },
    subcontractor: { can_edit: false, can_delete: false, can_approve: false },
    architect: { can_edit: true, can_delete: false, can_approve: true },
    client: { can_edit: false, can_delete: false, can_approve: false },
  }

  // Assign test users to all projects
  console.log('Assigning users to projects...\n')
  for (const user of testUsers || []) {
    const perms = permissions[user.role] || permissions.field_employee
    let assignedCount = 0

    for (const project of projects || []) {
      const { error } = await supabase
        .from('project_users')
        .upsert({
          project_id: project.id,
          user_id: user.id,
          project_role: user.role,
          ...perms
        }, { onConflict: 'project_id,user_id' })

      if (!error) {
        assignedCount++
      }
    }

    console.log(`✅ ${user.email.split('@')[0]} assigned to ${assignedCount} projects`)
  }

  console.log('\n✨ Done!')
}

main().catch(console.error)
