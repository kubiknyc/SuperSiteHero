#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Update the first user to be an owner
const userId = '3895c065-36a2-4f2d-9bee-759f1ca039bf' // evidyaev@gdc.nyc

console.log('\n🔧 Updating user to owner role...\n')

const { data, error } = await supabase
  .from('users')
  .update({ role: 'owner' })
  .eq('id', userId)
  .select('id, email, role')
  .single()

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log('✅ User updated successfully!')
console.log(`   Email: ${data.email}`)
console.log(`   Role: ${data.role}`)
console.log(`   ID: ${data.id}\n`)
