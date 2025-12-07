# Fix 403 Project Creation Error - Quick Instructions

## Summary
Your application code is **100% correct**. The 403 error is caused by missing database policies in Supabase. You need to apply two SQL migrations that already exist in your codebase.

## Quick Fix (5 minutes)

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Apply Migration 046 (Fix Projects Policy)

**Copy and paste this SQL** into the SQL Editor:

```sql
-- Migration: 046_fix_projects_insert_policy.sql
-- Description: Fix INSERT policy on projects table to properly validate company_id

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

-- Add helpful comment
COMMENT ON POLICY "Authenticated users can insert projects in their company" ON projects IS
  'Allows authenticated users to create projects for their company.
   Validates:
   - User is authenticated (auth.uid() IS NOT NULL)
   - company_id is provided (NOT NULL)
   - company_id matches user company (multi-tenant isolation)';
```

**Then click "Run"** (or press Ctrl+Enter)

✅ You should see a success message.

---

### Step 3: Apply Migration 047 (Fix RLS Recursion)

**Click "New Query"** again, then **copy and paste this SQL**:

```sql
-- Migration: 047_fix_users_select_policy_recursion.sql
-- Description: Fix recursive SELECT policy on users table

-- Create a security definer function to get user's company_id
CREATE OR REPLACE FUNCTION auth.user_company_id()
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

COMMENT ON FUNCTION auth.user_company_id() IS
  'Returns the company_id for the currently authenticated user.
   Uses SECURITY DEFINER to bypass RLS and prevent recursion.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth.user_company_id() TO authenticated;

-- Drop the existing recursive policy
DROP POLICY IF EXISTS "Users can view company users" ON users;

-- Create a new non-recursive policy using the function
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (
    -- Allow users to see other users in their company
    company_id = auth.user_company_id()
    -- Also allow users to always see themselves
    OR id = auth.uid()
  );

COMMENT ON POLICY "Users can view company users" ON users IS
  'Allows users to view other users in their company.
   Uses auth.user_company_id() function to avoid RLS recursion.';

-- Create function for role check (bonus helper)
CREATE OR REPLACE FUNCTION auth.user_role()
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

COMMENT ON FUNCTION auth.user_role() IS
  'Returns the role for the currently authenticated user.
   Can be used in RLS policies that need role-based checks.';

GRANT EXECUTE ON FUNCTION auth.user_role() TO authenticated;
```

**Then click "Run"** (or press Ctrl+Enter)

✅ You should see a success message.

---

### Step 4: Verify the Fix

**Click "New Query"** and run this verification:

```sql
-- Check projects INSERT policy
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'INSERT';

-- Check users SELECT policy
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'SELECT';

-- Check helper functions exist
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'auth'
  AND routine_name IN ('user_company_id', 'user_role');
```

**Expected results**:
- Projects policy: "Authenticated users can insert projects in their company"
- Users policy: "Users can view company users"
- Two functions: `user_company_id` and `user_role` with DEFINER security

---

### Step 5: Log Out and Back In

**CRITICAL**: You must log out and log back in for the changes to take effect!

1. In your app, click **Logout**
2. **Log back in** with your credentials
3. Try creating a project again

---

### Step 6: Test Project Creation

1. Go to **Projects** page
2. Click **Create Project** button
3. Fill in the form:
   - Project Name: "Test Project"
   - Project Number: "2024-TEST-001"
   - Address, City, State, ZIP
   - Status: "Planning"
4. Click **Create Project**

✅ **Should work without 403 error!**

---

## What Was Fixed?

### Problem 1: Overly Permissive Policy
The old policy allowed any authenticated user to insert ANY company_id, which broke multi-tenant isolation. The new policy enforces that users can only create projects for their own company.

### Problem 2: RLS Recursion
The old users SELECT policy had a recursive subquery that caused infinite loops. The new policy uses a SECURITY DEFINER function to avoid recursion and improve performance.

---

## Troubleshooting

### Still getting 403 error?
1. Make sure you **logged out and back in**
2. Check the browser console for errors
3. Verify migrations were applied (run verification query above)
4. Check that your user has a `company_id` in the users table:
   ```sql
   SELECT id, email, company_id, role FROM users WHERE id = auth.uid();
   ```

### User has no company_id?
If your user record is missing a company_id, you need to assign one:
```sql
-- Replace YOUR_COMPANY_ID with an actual company UUID
UPDATE users
SET company_id = 'YOUR_COMPANY_ID'
WHERE id = auth.uid();
```

---

## Files Reference

The full migration files are located at:
- `supabase/migrations/046_fix_projects_insert_policy.sql`
- `supabase/migrations/047_fix_users_select_policy_recursion.sql`

---

**That's it!** Your 403 error should be fixed. The application code was already correct - it was just a database configuration issue.
