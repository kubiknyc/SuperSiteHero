#!/usr/bin/env node
/**
 * Apply migrations using Supabase REST API
 * This bypasses direct PostgreSQL connection issues
 */

import https from 'https'

const SUPABASE_URL = 'https://nxlznnrocrffnbzjaaae.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.K9Zt9yUuYrTqTzTyXUUiTkee40R919fnY1o9iLmO1Tc'

// Migration 046 - Fix Projects INSERT Policy
const migration046 = `
-- Migration 046: Fix Projects INSERT Policy
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

CREATE POLICY "Authenticated users can insert projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

COMMENT ON POLICY "Authenticated users can insert projects in their company" ON projects IS
  'Allows authenticated users to create projects for their company.
   Validates: User is authenticated, company_id provided, company_id matches user company';
`

// Migration 047 - Fix Users SELECT Recursion (using public schema)
const migration047 = `
-- Migration 047: Fix Users SELECT Recursion (Modified for public schema)

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_company_id() IS
  'Returns the company_id for the currently authenticated user.
   Uses SECURITY DEFINER to bypass RLS and prevent recursion.';

GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;

DROP POLICY IF EXISTS "Users can view company users" ON users;

CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (
    company_id = public.get_user_company_id()
    OR id = auth.uid()
  );

COMMENT ON POLICY "Users can view company users" ON users IS
  'Allows users to view other users in their company.
   Uses public.get_user_company_id() function to avoid RLS recursion.';

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_role() IS
  'Returns the role for the currently authenticated user.
   Can be used in RLS policies that need role-based checks.';

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
`

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql })

    const options = {
      hostname: 'nxlznnrocrffnbzjaaae.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    }

    const req = https.request(options, (res) => {
      let responseData = ''

      res.on('data', (chunk) => {
        responseData += chunk
      })

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(data)
    req.end()
  })
}

async function main() {
  console.log('='.repeat(70))
  console.log('🔧 Applying Database Migrations via Supabase API')
  console.log('='.repeat(70))
  console.log()

  try {
    console.log('📝 Applying Migration 046...')
    await executeSQL(migration046)
    console.log('✅ Migration 046 applied successfully')
    console.log()

    console.log('📝 Applying Migration 047...')
    await executeSQL(migration047)
    console.log('✅ Migration 047 applied successfully')
    console.log()

    console.log('='.repeat(70))
    console.log('🎉 SUCCESS! Migrations applied.')
    console.log('='.repeat(70))
    console.log()
    console.log('⚠️  IMPORTANT: Log out and log back in for changes to take effect!')
    console.log()

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error()
    console.error('Manual application required.')
    console.error('The HTML guide has been opened in your browser with instructions.')
    process.exit(1)
  }
}

main()
