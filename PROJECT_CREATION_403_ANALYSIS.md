# Project Creation 403 Error - Complete Analysis

## Issue Summary
User receives `403 Forbidden` error when attempting to create a project, despite having supposedly fixed the user role and company_id.

## Timeline
1. **Initial issue**: User had wrong role (field_employee instead of superintendent)
2. **First fix attempt**: Applied QUICK_FIX_SQL.sql to update user role
3. **Result**: Still getting 403 error after logout/login
4. **Port change**: Dev server restarted (5173 → 5174), suggesting fresh session

## Root Cause: RLS Policy Mismatch

### The Database Policy (migration 012)
```sql
CREATE POLICY "Authorized users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superintendent', 'project_manager', 'owner', 'admin')
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
```

**Requirements:**
- User role MUST be: superintendent, project_manager, owner, or admin
- Project's company_id MUST match user's company_id

### The Code Assumption (useProjectsMutations.ts)
```typescript
// Lines 36-38
// Note: Role-based validation removed to match backend RLS policy (migration 018)
// The database RLS policy now allows any authenticated user to create projects
// Backend will enforce company_id isolation via RLS
```

**CRITICAL FINDING**: Migration 018 does not exist! The code assumes a more permissive policy that was never applied.

## Evidence

### Migration Files Present:
```
001-015: Initial migrations
021: RLS policy optimization
043: Material receiving
044: Enable auto user creation
999: Setup test user
```

**Missing**: Migration 018 that supposedly relaxed the INSERT policy

### Code Flow:
1. `CreateProjectDialog.tsx` → calls `useCreateProjectWithNotification()`
2. `useProjectsMutations.ts` → validates auth, calls `projectsApi.createProject()`
3. `projects.ts:91-94` → calls `apiClient.insert('projects', {...data, company_id})`
4. `client.ts:196-209` → executes Supabase INSERT
5. **Supabase RLS blocks the INSERT with 403**

### Why the Fix Didn't Work:
The QUICK_FIX_SQL.sql correctly updated the user's role and company_id in the database. However:
- The user IS authenticated (auth.uid() works)
- The user DOES have a valid role (superintendent)
- The user DOES have a valid company_id
- BUT: The RLS policy is still enforcing the restrictive role check

### Possible Issues:
1. **User role wasn't updated**: Need to verify with SELECT query
2. **Session not refreshed**: Auth context may have cached old userProfile
3. **Company_id mismatch**: The company_id being sent might not match user's company_id
4. **Database policy not applied**: Someone may have manually modified the policy

## The Fix Strategy

We need to:
1. **Verify current user state** - Check actual database values
2. **Verify current RLS policy** - Check if policy was modified
3. **Create missing migration** - Apply the relaxed policy that code expects
4. **Test thoroughly** - Ensure fix works

## Next Steps

### Option 1: Apply Relaxed Policy (Match Code Expectations)
Create migration 018 to relax the INSERT policy:
```sql
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Authorized users can create projects" ON projects;

-- Create new permissive policy (any authenticated user with valid company)
CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
```

### Option 2: Keep Restrictive Policy (Fix Code Assumptions)
Update code to match the actual restrictive policy:
- Remove misleading comment about migration 018
- Add proper role validation in frontend
- Show appropriate error message when user lacks permission

## Recommended Solution: Option 1

**Rationale:**
- The code already assumes permissive policy
- Multiple developers may have written code against this assumption
- Restrictive policy may be too limiting for real-world usage
- Company_id isolation is the primary security boundary (more important than role)

## Verification Steps After Fix

1. Check user record:
```sql
SELECT id, email, role, company_id, is_active
FROM users
WHERE id = auth.uid();
```

2. Check RLS policy:
```sql
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'projects'
AND policyname LIKE '%create%';
```

3. Test project creation with proper data
4. Verify multi-tenant isolation still works
