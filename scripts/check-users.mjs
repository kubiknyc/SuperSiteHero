#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

console.log('\n📋 Checking users in database...\n')

const { data: users, error } = await supabase
  .from('users')
  .select('id, email, role, is_active, approval_status')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log(`Found ${users.length} users:\n`)
users.forEach((user, i) => {
  console.log(`${i + 1}. ${user.email}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   Active: ${user.is_active}`)
  console.log(`   Status: ${user.approval_status}`)
  console.log(`   ID: ${user.id}`)
  console.log('')
})
