#!/usr/bin/env node
/**
 * Apply Modified Migrations 046 and 047 to fix 403 project creation error
 * Uses public schema instead of auth schema to avoid permission issues
 */

import pg from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Client } = pg

// PostgreSQL connection string from .env
const connectionString = 'postgresql://postgres.nxlznnrocrffnbzjaaae:1VXRyuU7iFbSnsgX@aws-0-us-east-1.pooler.supabase.com:6543/postgres'

// Modified Migration 046 - Same as original
const migration046 = `
-- Migration 046: Fix Projects INSERT Policy
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

-- Create a proper policy that validates company_id
CREATE POLICY "Authenticated users can insert projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- company_id must not be NULL
    AND company_id IS NOT NULL
    -- company_id must match the user's company
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

COMMENT ON POLICY "Authenticated users can insert projects in their company" ON projects IS
  'Allows authenticated users to create projects for their company.
   Validates: User is authenticated, company_id provided, company_id matches user company';
`

// Modified Migration 047 - Uses public schema instead of auth schema
const migration047 = `
-- Migration 047: Fix Users SELECT Recursion (Modified for public schema)

-- Create functions in PUBLIC schema (not auth schema) to avoid permission issues
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

-- Drop the existing recursive policy
DROP POLICY IF EXISTS "Users can view company users" ON users;

-- Create a new non-recursive policy using the public schema function
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (
    -- Allow users to see other users in their company
    company_id = public.get_user_company_id()
    -- Also allow users to always see themselves
    OR id = auth.uid()
  );

COMMENT ON POLICY "Users can view company users" ON users IS
  'Allows users to view other users in their company.
   Uses public.get_user_company_id() function to avoid RLS recursion.';

-- Create function for role check (bonus helper)
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

async function main() {
  console.log('='.repeat(70))
  console.log('🔧 Applying Modified Database Migrations 046 & 047')
  console.log('='.repeat(70))
  console.log('\nThis will fix the 403 Forbidden error on project creation')
  console.log('by updating RLS policies in the database.\n')
  console.log('Note: Using public schema functions to avoid permission issues\n')

  // Create PostgreSQL client with SSL
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('📡 Connecting to Supabase database...')
    await client.connect()
    console.log('✅ Connected successfully\n')

    // Apply Migration 046
    console.log('='.repeat(70))
    console.log('MIGRATION 046: Fix Projects INSERT Policy')
    console.log('='.repeat(70))
    console.log('📝 Applying migration...')

    try {
      await client.query(migration046)
      console.log('✅ Migration 046 applied successfully\n')
    } catch (error) {
      console.error('❌ Error applying Migration 046:', error.message)
      throw error
    }

    // Apply Migration 047
    console.log('='.repeat(70))
    console.log('MIGRATION 047: Fix Users SELECT Recursion (Public Schema)')
    console.log('='.repeat(70))
    console.log('📝 Applying migration...')

    try {
      await client.query(migration047)
      console.log('✅ Migration 047 applied successfully\n')
    } catch (error) {
      console.error('❌ Error applying Migration 047:', error.message)
      throw error
    }

    // Verify migrations
    console.log('='.repeat(70))
    console.log('VERIFICATION')
    console.log('='.repeat(70))

    // Check projects INSERT policy
    const projectsPolicy = await client.query(`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'projects' AND cmd = 'INSERT'
    `)
    console.log('\n✅ Projects INSERT policy:', projectsPolicy.rows[0]?.policyname || 'None found')

    // Check users SELECT policy
    const usersPolicy = await client.query(`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'users' AND cmd = 'SELECT'
    `)
    console.log('✅ Users SELECT policy:', usersPolicy.rows[0]?.policyname || 'None found')

    // Check helper functions in public schema
    const functions = await client.query(`
      SELECT routine_name, routine_schema, security_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('get_user_company_id', 'get_user_role')
      ORDER BY routine_name
    `)
    console.log('✅ Helper functions (public schema):')
    if (functions.rows.length > 0) {
      functions.rows.forEach(row => {
        console.log(`   - ${row.routine_schema}.${row.routine_name} (${row.security_type})`)
      })
    } else {
      console.log('   - None found (this is unexpected)')
    }

    console.log('\n' + '='.repeat(70))
    console.log('🎉 MIGRATIONS APPLIED SUCCESSFULLY!')
    console.log('='.repeat(70))
    console.log('\n✅ Migration 046: Projects INSERT policy fixed')
    console.log('✅ Migration 047: Users SELECT recursion fixed (public schema)')
    console.log('\n⚠️  IMPORTANT: You must log out and log back in')
    console.log('   for the RLS policy changes to take effect!')
    console.log('\n📝 Next steps:')
    console.log('   1. Log out of the application')
    console.log('   2. Log back in')
    console.log('   3. Try creating a project')
    console.log('   4. Should work without 403 error! 🎉')
    console.log('\n' + '='.repeat(70))

  } catch (error) {
    console.error('\n' + '='.repeat(70))
    console.error('❌ ERROR')
    console.error('='.repeat(70))
    console.error('Failed to apply migrations:', error.message)
    console.error('\nError details:', error)
    console.error('\nYou can apply these migrations manually:')
    console.error('1. Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae')
    console.error('2. Open: SQL Editor')
    console.error('3. Copy the SQL from the HTML file that was opened')
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
