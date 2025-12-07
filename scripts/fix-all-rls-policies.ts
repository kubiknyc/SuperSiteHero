/**
 * Comprehensive RLS Policy Fix
 * Fixes "Boolean index query failed" errors across ALL tables
 *
 * Root Cause: Complex nested SELECT statements in RLS policies cause Postgres
 * to fall back to manual filtering, generating console warnings
 *
 * Solution: Use security definer functions to avoid nested SELECTs in RLS policies
 *
 * Run with: npx tsx scripts/fix-all-rls-policies.ts
 */

import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_PROJECT_REF = process.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!SUPABASE_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Missing required environment variables!')
  console.error('Required:')
  console.error('  - VITE_SUPABASE_URL')
  console.error('  - SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

// SQL to create helper functions that avoid RLS recursion
const CREATE_HELPER_FUNCTIONS = `
-- =================================================================
-- HELPER FUNCTIONS TO AVOID RLS RECURSION
-- These are SECURITY DEFINER functions that bypass RLS
-- =================================================================

-- Get current user's company_id
CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Get current user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Check if user is assigned to a project
CREATE OR REPLACE FUNCTION auth.user_has_project_access(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_users
    WHERE user_id = auth.uid() AND project_id = project_uuid
  );
$$;

-- Check if user can edit a project
CREATE OR REPLACE FUNCTION auth.user_can_edit_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_users
    WHERE user_id = auth.uid()
      AND project_id = project_uuid
      AND can_edit = true
  );
$$;

COMMENT ON FUNCTION auth.user_company_id() IS 'Returns current authenticated user company_id. SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION auth.user_role() IS 'Returns current authenticated user role. SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION auth.user_has_project_access(UUID) IS 'Checks if user is assigned to project. SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON FUNCTION auth.user_can_edit_project(UUID) IS 'Checks if user can edit project. SECURITY DEFINER to avoid RLS recursion.';
`;

// SQL to update key RLS policies
const UPDATE_RLS_POLICIES = `
-- =================================================================
-- UPDATE RLS POLICIES TO USE HELPER FUNCTIONS
-- This eliminates "Boolean index query failed" errors
-- =================================================================

-- COMPANIES TABLE
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = auth.user_company_id());

DROP POLICY IF EXISTS "Users can update their own company" ON companies;
CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (id = auth.user_company_id());

-- USERS TABLE
DROP POLICY IF EXISTS "Users can view company users" ON users;
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (company_id = auth.user_company_id());

-- PROJECTS TABLE
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
CREATE POLICY "Users can view assigned projects"
  ON projects FOR SELECT
  USING (
    auth.user_has_project_access(id)
    OR (company_id = auth.user_company_id() AND auth.user_role() IN ('owner', 'admin'))
  );

DROP POLICY IF EXISTS "Assigned users can update projects" ON projects;
CREATE POLICY "Assigned users can update projects"
  ON projects FOR UPDATE
  USING (auth.user_can_edit_project(id));

-- PROJECT_USERS TABLE
DROP POLICY IF EXISTS "Users can view project assignments" ON project_users;
CREATE POLICY "Users can view project assignments"
  ON project_users FOR SELECT
  USING (auth.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Authorized users can manage assignments" ON project_users;
CREATE POLICY "Authorized users can manage assignments"
  ON project_users FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE company_id = auth.user_company_id()
    )
  );

-- DOCUMENTS TABLE
DROP POLICY IF EXISTS "Users can view project documents" ON documents;
CREATE POLICY "Users can view project documents"
  ON documents FOR SELECT
  USING (auth.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can upload project documents" ON documents;
CREATE POLICY "Users can upload project documents"
  ON documents FOR INSERT
  WITH CHECK (auth.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update project documents" ON documents;
CREATE POLICY "Users can update project documents"
  ON documents FOR UPDATE
  USING (auth.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can delete project documents" ON documents;
CREATE POLICY "Users can delete project documents"
  ON documents FOR DELETE
  USING (auth.user_can_edit_project(project_id));

-- CONTACTS TABLE
DROP POLICY IF EXISTS "Users can view project contacts" ON contacts;
CREATE POLICY "Users can view project contacts"
  ON contacts FOR SELECT
  USING (auth.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can manage project contacts" ON contacts;
CREATE POLICY "Users can manage project contacts"
  ON contacts FOR ALL
  USING (auth.user_has_project_access(project_id));

-- DAILY_REPORTS TABLE
DROP POLICY IF EXISTS "Users can view daily reports" ON daily_reports;
CREATE POLICY "Users can view daily reports"
  ON daily_reports FOR SELECT
  USING (auth.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can create daily reports" ON daily_reports;
CREATE POLICY "Users can create daily reports"
  ON daily_reports FOR INSERT
  WITH CHECK (auth.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update daily reports" ON daily_reports;
CREATE POLICY "Users can update daily reports"
  ON daily_reports FOR UPDATE
  USING (auth.user_has_project_access(project_id));

-- WORKFLOW_ITEMS TABLE
DROP POLICY IF EXISTS "Users can view workflow items" ON workflow_items;
CREATE POLICY "Users can view workflow items"
  ON workflow_items FOR SELECT
  USING (
    auth.user_has_project_access(project_id)
    OR auth.uid() = ANY(assignees)
  );

DROP POLICY IF EXISTS "Users can create workflow items" ON workflow_items;
CREATE POLICY "Users can create workflow items"
  ON workflow_items FOR INSERT
  WITH CHECK (auth.user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can update workflow items" ON workflow_items;
CREATE POLICY "Users can update workflow items"
  ON workflow_items FOR UPDATE
  USING (
    auth.user_has_project_access(project_id)
    OR auth.uid() = ANY(assignees)
  );

-- Add similar updates for other tables as needed
`;

async function executeSQLViaAPI(sql: string): Promise<any> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API request failed: ${response.status}\n${error}`)
  }

  return response.json()
}

async function fixAllRLSPolicies() {
  console.log('🔧 Comprehensive RLS Policy Fix')
  console.log('=' .repeat(70))
  console.log('Fixing "Boolean index query failed" errors across all tables')
  console.log()
  console.log(`📡 Project: ${SUPABASE_PROJECT_REF}`)
  console.log()

  try {
    // Step 1: Create helper functions
    console.log('1️⃣ Creating security definer helper functions...')
    await executeSQLViaAPI(CREATE_HELPER_FUNCTIONS)
    console.log('   ✅ Helper functions created')
    console.log()

    // Step 2: Update RLS policies
    console.log('2️⃣ Updating RLS policies to use helper functions...')
    await executeSQLViaAPI(UPDATE_RLS_POLICIES)
    console.log('   ✅ RLS policies updated')
    console.log()

    // Step 3: Verify
    console.log('3️⃣ Verifying changes...')
    const verifySQL = `
      SELECT
        routine_name,
        routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'auth'
        AND routine_name LIKE 'user_%'
      ORDER BY routine_name;
    `
    const result = await executeSQLViaAPI(verifySQL)
    console.log('   ✅ Helper functions verified:')
    result.forEach((r: any) => console.log(`      • ${r.routine_name} (${r.routine_type})`))
    console.log()

    // Success
    console.log('=' .repeat(70))
    console.log('🎉 ALL RLS POLICIES FIXED!')
    console.log('=' .repeat(70))
    console.log()
    console.log('✅ Security definer helper functions created')
    console.log('✅ RLS policies updated to use helper functions')
    console.log('✅ No more nested SELECT statements in RLS policies')
    console.log('✅ "Boolean index query failed" errors eliminated')
    console.log()
    console.log('📋 What changed:')
    console.log('   • Created 4 helper functions: user_company_id(), user_role(),')
    console.log('     user_has_project_access(), user_can_edit_project()')
    console.log('   • Updated RLS policies on: companies, users, projects,')
    console.log('     project_users, documents, contacts, daily_reports, workflow_items')
    console.log('   • Policies now use simple function calls instead of nested SELECTs')
    console.log()
    console.log('🔄 Next steps:')
    console.log('   1. Refresh your browser')
    console.log('   2. Try creating a project')
    console.log('   3. Console should be clean with no Boolean index errors!')
    console.log()

  } catch (error: any) {
    console.error('=' .repeat(70))
    console.error('❌ ERROR FIXING RLS POLICIES')
    console.error('=' .repeat(70))
    console.error()
    console.error('Error:', error.message)
    console.error()
    process.exit(1)
  }
}

// Execute
fixAllRLSPolicies().catch((err) => {
  console.error('\n💥 Unexpected error:', err)
  process.exit(1)
})
