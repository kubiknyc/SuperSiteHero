# 403 Forbidden Error - Complete Solution

## Executive Summary

**Problem**: User receives `403 Forbidden` when creating projects, even after updating user role and company_id.

**Root Cause**: Code-database mismatch. The frontend code references "migration 018" that was supposed to relax the INSERT policy, but this migration was never created or applied. The database still has the restrictive policy from migration 012.

**Solution**: Apply the missing migration 018 to relax the RLS policy (recommended), OR ensure user has the correct role for the existing restrictive policy.

---

## Technical Analysis

### Error Location
File: `c:\Users\Eli\Documents\git\src\lib\api\services\projects.ts:113`
```typescript
throw new ApiErrorClass({
  code: 'CREATE_PROJECT_ERROR',
  message: 'Failed to create project',
})
```

The actual Supabase error is wrapped, but the underlying cause is:
```
POST https://[project].supabase.co/rest/v1/projects 403 (Forbidden)
```

### Data Flow
1. **UI**: CreateProjectDialog.tsx (line 67) calls mutation
2. **Hook**: useProjectsMutations.ts (line 40) validates auth and calls API
3. **API**: projects.ts (line 91) calls apiClient.insert with company_id
4. **Client**: client.ts (line 199) executes Supabase INSERT
5. **Database**: RLS policy blocks the INSERT → 403 error

### The Mismatch

**Code Says** (useProjectsMutations.ts:36-38):
```typescript
// Note: Role-based validation removed to match backend RLS policy (migration 018)
// The database RLS policy now allows any authenticated user to create projects
// Backend will enforce company_id isolation via RLS
```

**Database Has** (migration 012_rls_policies.sql:43-48):
```sql
CREATE POLICY "Authorized users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN
      ('superintendent', 'project_manager', 'owner', 'admin')
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
```

**Reality**: Migration 018 does not exist in the migrations folder.

---

## The Solution

### Option A: Apply Missing Migration (RECOMMENDED)

This aligns the database with what the code expects.

**File**: `migrations/018_relax_project_creation_policy.sql` (already created)

**Execute in Supabase SQL Editor**:
```sql
-- Drop old restrictive policy
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;

-- Create new permissive policy
CREATE POLICY "Authenticated users can create projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
```

**Why this is safe**:
- Company isolation is still enforced (primary security boundary)
- Users can ONLY create projects in their own company
- Project access is controlled by project_users table
- SELECT policies control which projects users can view

**After applying**:
1. Refresh browser (F5)
2. Try creating project
3. Should work immediately

---

### Option B: Update User Role (Alternative)

If you prefer to keep the restrictive policy, ensure user has correct role.

**Execute in Supabase SQL Editor**:
```sql
-- Check current role
SELECT id, email, role, company_id, is_active
FROM users
WHERE email = 'your-email@example.com';

-- Update role if needed
UPDATE users
SET
  role = 'superintendent',  -- or project_manager, owner, admin
  is_active = true,
  updated_at = NOW()
WHERE email = 'your-email@example.com';
```

**After updating**:
1. Log out completely
2. Close all browser tabs
3. Clear browser cache
4. Log back in
5. Try creating project

---

## Diagnostic Tools

### Quick Check Script
Run this in Supabase SQL Editor to verify current state:

```sql
-- Replace with your email
\set user_email 'your-email@example.com'

-- Check user record
SELECT
  u.id,
  u.email,
  u.role,
  u.company_id,
  u.is_active,
  c.name as company_name,
  CASE
    WHEN u.role IN ('superintendent', 'project_manager', 'owner', 'admin')
    THEN '✓ Role allows project creation'
    ELSE '✗ Role does NOT allow (with restrictive policy)'
  END as can_create
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = :'user_email';

-- Check RLS policy
SELECT
  policyname,
  cmd,
  CASE
    WHEN with_check::text LIKE '%superintendent%project_manager%'
    THEN 'RESTRICTIVE'
    ELSE 'PERMISSIVE'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'projects'
AND cmd = 'INSERT';
```

### Comprehensive Diagnostic
Run the complete diagnostic script:
- File: `scripts/diagnose-403-error.sql`
- Checks: Auth user, user profile, company, RLS policies, insert test
- Provides detailed output for troubleshooting

---

## Verification Steps

After applying the fix:

### 1. Verify Policy Changed
```sql
SELECT policyname, cmd, with_check::text
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'projects'
AND cmd = 'INSERT';
```

Expected: `policyname` = "Authenticated users can create projects in their company"

### 2. Test Insert Manually
```sql
-- Get your info
WITH user_info AS (
  SELECT id, company_id
  FROM users
  WHERE email = 'your-email@example.com'
)
-- Test insert
INSERT INTO projects (
  name,
  company_id,
  status,
  features_enabled,
  weather_units
)
SELECT
  'Test Project',
  company_id,
  'planning',
  '{"daily_reports": true}'::jsonb,
  'imperial'
FROM user_info
RETURNING id, name, company_id;

-- Clean up
DELETE FROM projects WHERE name = 'Test Project';
```

If this works, the issue is frontend/session related. If it fails, check the error message.

### 3. Test in Application
1. Refresh browser (F5)
2. Open DevTools Console (F12)
3. Click "Create Project" button
4. Fill in form
5. Submit
6. Check for success or new error

---

## Common Issues & Fixes

### Issue: "User not found in users table"
**Cause**: User exists in auth.users but not in users table
**Fix**: Run migration 044 or manually insert user record

### Issue: "company_id is NULL"
**Cause**: User has no company assigned
**Fix**:
```sql
-- Create or find company
INSERT INTO companies (name, slug, email)
VALUES ('My Company', 'my-company', 'admin@mycompany.com')
RETURNING id;

-- Update user with company_id
UPDATE users
SET company_id = 'company-id-from-above'
WHERE email = 'your-email@example.com';
```

### Issue: "Policy still restrictive after migration"
**Cause**: Old policy wasn't dropped, or new policy has wrong name
**Fix**:
```sql
-- Drop ALL INSERT policies
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;

-- Recreate with correct policy
CREATE POLICY "Authenticated users can create projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
```

### Issue: "403 error persists after fix"
**Possible causes**:
1. **Stale session**: Log out, clear cache, log back in
2. **Browser cache**: Hard refresh (Ctrl+Shift+R)
3. **Wrong company_id being sent**: Check browser console → Network tab → POST request payload
4. **Auth token expired**: Check session expiry in browser console

**Debug**:
```javascript
// In browser console
const { data: { session } } = await supabase.auth.getSession()
console.log('User ID:', session?.user?.id)
console.log('Expires:', new Date(session?.expires_at * 1000))
```

---

## Files Created

1. **migrations/018_relax_project_creation_policy.sql**
   - The missing migration to relax INSERT policy
   - Apply this in Supabase SQL Editor

2. **scripts/diagnose-403-error.sql**
   - Comprehensive diagnostic script
   - Checks all possible causes of 403 error
   - Provides detailed output

3. **PROJECT_CREATION_403_ANALYSIS.md**
   - Detailed technical analysis
   - Explains the code-database mismatch
   - Evidence and verification steps

4. **DEFINITIVE_FIX_403_ERROR.md**
   - Step-by-step fix instructions
   - Both Option A and Option B
   - Troubleshooting guide

5. **403_ERROR_COMPLETE_SOLUTION.md** (this file)
   - Executive summary and complete solution
   - All information in one place

---

## Next Steps

1. **Apply the fix**: Choose Option A (recommended) or Option B
2. **Verify it worked**: Run verification SQL queries
3. **Test in application**: Try creating a project
4. **If still failing**: Run diagnostic script and share output

---

## Why This Happened

This is a common issue in rapid development:
1. Developer writes code assuming a permissive policy
2. Adds comment referencing "migration 018"
3. Migration 018 is never actually created
4. Code ships with the assumption
5. Database still has restrictive policy from migration 012
6. Result: Code-database mismatch

**Lesson**: Always verify migrations are created AND applied before referencing them in code.

---

## Security Considerations

**Q: Is the permissive policy secure?**

**A: Yes, because:**
- Multi-tenant isolation is maintained via company_id matching
- Users can ONLY create projects in their own company
- Project access is controlled by project_users table
- SELECT policies prevent cross-company data access
- Role-based restrictions belong in the UI/business logic layer

**Q: Should we have role-based restrictions?**

**A: Depends on requirements:**
- **Database level**: Company isolation (enforced by RLS)
- **Application level**: Role-based workflows (enforced by UI)
- **Best practice**: Database enforces data boundaries, app enforces business rules

**Q: What if we want role restrictions in the database?**

**A: Keep Option B approach:**
- Use restrictive policy
- Ensure all users have appropriate roles
- Update code comment to reflect reality
- Remove misleading reference to migration 018

---

## Summary

**Recommended Action**: Apply migration 018 (Option A)

**Files to Use**:
- `migrations/018_relax_project_creation_policy.sql` - The fix
- `scripts/diagnose-403-error.sql` - Diagnostic tool
- This document - Reference guide

**Expected Outcome**: Project creation works immediately after refresh

**If Issues Persist**: Run diagnostic script and examine output for specific cause
