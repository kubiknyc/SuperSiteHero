/**
 * Debug script to check test user data
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const testEmail = process.env.TEST_USER_EMAIL || 'test@supersitehero.local'
  console.log(`\nChecking data for test user: ${testEmail}\n`)

  // Find the test user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, company_id, email, first_name, last_name, role')
    .eq('email', testEmail)
    .maybeSingle()

  if (userError || !user) {
    console.log('User not found:', userError?.message || 'No user with that email')
    return
  }

  console.log('User:', user)
  console.log(`  Company ID: ${user.company_id}`)

  // Get the company
  if (user.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, slug')
      .eq('id', user.company_id)
      .single()

    console.log('\nCompany:', company)
  }

  // Get projects for this company
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, company_id')
    .eq('company_id', user.company_id)

  console.log(`\nProjects in user's company: ${projects?.length || 0}`)
  projects?.forEach(p => console.log(`  - ${p.name} (${p.id})`))

  // Get change orders for this company
  const { data: changeOrders, error: coError } = await (supabase as any)
    .from('change_orders')
    .select('id, title, project_id, company_id')
    .eq('company_id', user.company_id)

  console.log(`\nChange orders in user's company: ${changeOrders?.length || 0}`)
  if (coError) {
    console.log('Error fetching change orders:', coError.message)
  }

  // Check change orders in projects
  if (projects && projects.length > 0) {
    const projectIds = projects.map(p => p.id)
    const { data: coInProjects } = await (supabase as any)
      .from('change_orders')
      .select('id, title, project_id')
      .in('project_id', projectIds)

    console.log(`\nChange orders in user's projects: ${coInProjects?.length || 0}`)
    coInProjects?.slice(0, 5).forEach((co: any) => console.log(`  - ${co.title}`))

    // Check each project's change order count
    console.log('\nChange orders per project:')
    for (const project of projects) {
      const count = coInProjects?.filter((co: any) => co.project_id === project.id).length || 0
      console.log(`  - ${project.name}: ${count} change orders`)
    }
  }
}

main()
