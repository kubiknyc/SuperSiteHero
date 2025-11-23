# Manual Migration Steps

## ⚠️ IMPORTANT: RLS Policy Fixes Required

The following migrations need to be applied manually through the Supabase SQL Editor:

### Migration 018 & 019: Fix RLS Recursion Issues

**Steps:**
1. Go to https://supabase.com/dashboard
2. Select your project: `nxlznnrocrffnbzjaaae`
3. Navigate to SQL Editor
4. Create a new query
5. Copy and paste the SQL below
6. Click "Run" to execute

### SQL to Execute:

```sql
-- ============================================
-- FIX RLS RECURSION ISSUES
-- Migrations 018 and 019 combined
-- ============================================

-- Migration 018: Simplify projects insert policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;

-- Create a simpler policy that avoids RLS recursion
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Migration 019: Fix project_users recursion
-- 1. Drop all existing policies on project_users
DROP POLICY IF EXISTS "Users can view project assignments" ON project_users;
DROP POLICY IF EXISTS "Users can view same company project assignments" ON project_users;
DROP POLICY IF EXISTS "Company users can view project assignments" ON project_users;
DROP POLICY IF EXISTS "Users can manage project assignments" ON project_users;
DROP POLICY IF EXISTS "Authorized users can view project assignments" ON project_users;

-- 2. Create simple, non-recursive policies

-- SELECT policy - allow authenticated users to see project assignments
CREATE POLICY "Authenticated users can view project_users"
  ON project_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT policy - allow authenticated users to create assignments
CREATE POLICY "Authenticated users can insert project_users"
  ON project_users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE policy - allow authenticated users to update assignments
CREATE POLICY "Authenticated users can update project_users"
  ON project_users FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE policy - allow authenticated users to delete assignments
CREATE POLICY "Authenticated users can delete project_users"
  ON project_users FOR DELETE
  USING (auth.uid() IS NOT NULL);
```

### Verification Query:

After applying, run this to verify:

```sql
SELECT
  tablename,
  policyname,
  cmd,
  using::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename IN ('projects', 'project_users')
ORDER BY tablename, cmd, policyname;
```

### Expected Results:

You should see:
- 1 policy on `projects` table for INSERT
- 4 policies on `project_users` table (SELECT, INSERT, UPDATE, DELETE)
- No recursive references to other tables in policy definitions

### Why This Is Important:

These policies fix infinite recursion issues that were preventing:
1. Project creation
2. Querying projects with user assignments
3. Managing project access control

The simplified policies allow all authenticated users to perform operations, with application-level authorization handling company isolation and role-based access.
