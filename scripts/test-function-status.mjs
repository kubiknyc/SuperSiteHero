#!/usr/bin/env node

import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const functions = ['approve-user', 'reject-user', 'get-pending-users']

console.log('\n🔍 Testing Edge Function Deployment Status...\n')

for (const functionName of functions) {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true })
    })

    const text = await response.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }

    console.log(`${functionName}:`)
    console.log(`  Status: ${response.status} ${response.statusText}`)
    console.log(`  Response: ${JSON.stringify(body, null, 2)}`)
    console.log('')
  } catch (error) {
    console.log(`${functionName}:`)
    console.log(`  Error: ${error.message}`)
    console.log('')
  }
}
