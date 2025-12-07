# Complete Fix Guide: 403 Forbidden on Project Creation

## Quick Summary

The 403 error persists after applying QUICK_FIX_SQL.sql because **the user has not logged out and back in**. The browser has cached (stale) user profile data that doesn't match the updated database.

## Root Cause

The authentication system caches user profile data when you log in. This cache is stored in React state and only refreshes when:
1. User logs in
2. User logs out
3. Browser is refreshed AND session is re-validated

**Without a fresh login, the frontend still has:**
- Old role (e.g., 'field_employee' instead of 'superintendent')
- Old company_id (possibly NULL)
- Old is_active status

## The Fix (3-Step Process)

### Step 1: IMMEDIATE - Force Session Refresh

**YOU MUST DO THIS FIRST:**

1. Log out of the application completely
2. Clear browser cache (Ctrl+Shift+Delete)
3. Log back in with your credentials
4. Try creating a project again

See `IMMEDIATE_FIX_INSTRUCTIONS.md` for detailed steps.

### Step 2: VERIFY - Database State

Run the diagnostic script to confirm database is correct:

```bash
# Copy and run VERIFY_FIX_STATUS.sql in Supabase SQL Editor
# Replace 'your-email@example.com' with your actual email
```

**Key things to verify:**
- User role is 'superintendent' or similar (not 'field_employee')
- User company_id is a valid UUID (not NULL)
- User is_active is true
- Company record exists

### Step 3: PERMANENT - Apply Migration Fixes

Once immediate issue is resolved, apply permanent fixes:

**Migration 046: Fix INSERT Policy**
```bash
# Apply in Supabase SQL Editor
supabase/migrations/046_fix_projects_insert_policy.sql
```

This replaces the overly permissive policy with one that validates company_id.

**Migration 047: Fix SELECT Recursion**
```bash
# Apply in Supabase SQL Editor
supabase/migrations/047_fix_users_select_policy_recursion.sql
```

This fixes recursive RLS policies that can cause 403 errors.

## Technical Details

### Why Logout/Login is Required

**File**: `src/lib/auth/AuthContext.tsx`

The authentication context fetches user profile on login and stores it in React state:

```typescript
// Fetches profile from database
const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  setUserProfile(data)  // Cached in React state!
}

// Only called when:
useEffect(() => {
  // 1. Initial session load
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      fetchUserProfile(session.user.id)  // HERE
    }
  })

  // 2. Auth state change (login/logout)
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      fetchUserProfile(session.user.id)  // HERE
    }
  })
}, [])
```

**The cached profile is used everywhere:**
- Project creation validation
- Permission checks
- UI rendering (role-based features)
- API calls (company_id is passed from cache)

**Updating the database does NOT trigger a refresh** because:
- There's no real-time subscription to user profile changes
- The useEffect only runs on auth state changes (login/logout)
- Browser refresh doesn't guarantee a fresh fetch (session might be restored from localStorage)

### What the Migrations Fix

**Migration 046** - INSERT Policy:
- Current: Allows any authenticated user to insert with any company_id
- Fixed: Validates company_id matches user's company (multi-tenant isolation)
- Prevents: Cross-company data leakage, NULL company_id errors

**Migration 047** - SELECT Recursion:
- Current: SELECT policy has recursive subquery that causes infinite loop
- Fixed: Uses SECURITY DEFINER function to bypass RLS recursion
- Prevents: Performance issues, unpredictable 403 errors, query failures

### Error Chain Breakdown

When you try to create a project:

1. **Frontend Validation** (useProjectsMutations.ts)
   - Checks cached userProfile.role
   - Checks cached userProfile.company_id
   - If stale data shows NULL company_id → Error thrown

2. **API Call** (projects.ts)
   - Sends INSERT with cached company_id
   - If company_id is NULL → 400 Bad Request
   - If company_id is wrong → 403 Forbidden

3. **Database RLS Policy** (Postgres)
   - Evaluates INSERT policy WITH CHECK clause
   - Runs subquery: `SELECT company_id FROM users WHERE id = auth.uid()`
   - If subquery fails due to recursive SELECT policy → 403 Forbidden
   - If company_id doesn't match → 403 Forbidden

4. **Project-User Assignment** (projects.ts)
   - After project created, tries to assign user
   - Runs INSERT into project_users table
   - If this fails, project exists but user not assigned
   - Error is logged but not thrown (non-blocking)

**Any failure in steps 1-3 causes the 403 error.**

## Verification Checklist

After applying fixes and logging back in:

- [ ] User can access login page
- [ ] User can log in with correct credentials
- [ ] Dashboard loads without errors
- [ ] Browser console shows no 403 errors
- [ ] User profile loads (check DevTools → Application → Local Storage)
- [ ] "Create New Project" dialog opens
- [ ] Form can be filled with valid data
- [ ] Submit button works
- [ ] No 403 or 400 errors in Network tab
- [ ] Success toast notification appears
- [ ] Project appears in projects list
- [ ] User can click project and see details
- [ ] Project has correct company_id (matches user)
- [ ] User is assigned to project in project_users table

## Troubleshooting

### Still Getting 403 After Logout/Login

**Check 1**: Verify database was actually updated
```sql
SELECT id, email, role, company_id, is_active, updated_at
FROM users
WHERE email = 'your-email@example.com';
```

If role is still 'field_employee' or company_id is still NULL:
→ Re-run QUICK_FIX_SQL.sql with correct values

**Check 2**: Test INSERT permission directly
```sql
-- Run in Supabase SQL Editor as authenticated user
INSERT INTO projects (company_id, name, project_number, status, created_by)
VALUES (
  (SELECT company_id FROM users WHERE id = auth.uid()),
  'DB Test Project',
  'TEST-001',
  'planning',
  auth.uid()
) RETURNING id, name, company_id;

-- Clean up
DELETE FROM projects WHERE project_number = 'TEST-001';
```

If this succeeds but frontend fails:
→ Clear browser cache completely, try incognito mode

If this fails:
→ Check RLS policies, apply migrations 046 and 047

**Check 3**: Verify RLS policies exist
```sql
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'projects' AND cmd = 'INSERT';
```

Should show one of:
- "Authenticated users can insert projects" (migration 018)
- "Authenticated users can insert projects in their company" (migration 046 - better)

If no policy shows:
→ Apply migration 018 or 046

### Frontend Shows Old Role After Login

**Symptom**: Dashboard shows "Field Employee" even after database updated

**Cause**: Browser cached the AuthContext state

**Fix**:
1. Open DevTools (F12)
2. Go to Application tab → Local Storage
3. Find key: `sb-<project-id>-auth-token`
4. Delete the key
5. Refresh page
6. Log in again

### Can Create Projects in SQL But Not in UI

**Symptom**: Direct SQL INSERT works, but UI still gives 403

**Cause**: Frontend validation failing before API call

**Debug**:
1. Open DevTools Console
2. Add breakpoint in `useProjectsMutations.ts` line 18
3. Try creating project
4. Inspect `userProfile` object in debugger
5. Check if role/company_id are correct

**Fix**:
- If userProfile is NULL → AuthContext not loading profile
- If userProfile has wrong data → Cache issue, force re-login
- If userProfile is correct → API call issue, check Network tab

### Projects Created But User Not Assigned

**Symptom**: Project appears in database but user can't see it

**Cause**: project_users INSERT failed (line 99-103 in projects.ts)

**Check**:
```sql
SELECT p.id, p.name, pu.user_id
FROM projects p
LEFT JOIN project_users pu ON p.id = pu.project_id AND pu.user_id = auth.uid()
WHERE p.created_by = auth.uid()
ORDER BY p.created_at DESC
LIMIT 10;
```

If user_id is NULL for recent projects:
→ RLS policy on project_users table is blocking INSERT
→ Check policies on project_users table

**Manual Fix**:
```sql
INSERT INTO project_users (project_id, user_id, can_edit)
VALUES ('project-uuid-here', auth.uid(), true);
```

## Files Overview

### Documentation Files
- `ROOT_CAUSE_ANALYSIS_403_ERROR.md` - Detailed technical analysis
- `IMMEDIATE_FIX_INSTRUCTIONS.md` - Step-by-step user guide
- `403_ERROR_COMPLETE_FIX_GUIDE.md` - This file (comprehensive overview)
- `VERIFY_FIX_STATUS.sql` - Diagnostic SQL script

### Migration Files
- `QUICK_FIX_SQL.sql` - Emergency fix to update user record (already applied)
- `supabase/migrations/046_fix_projects_insert_policy.sql` - Permanent INSERT policy fix
- `supabase/migrations/047_fix_users_select_policy_recursion.sql` - Fix recursive SELECT policy

### Source Code Files (Reference)
- `src/lib/auth/AuthContext.tsx` - Authentication state management (user profile caching)
- `src/features/projects/hooks/useProjectsMutations.ts` - Project creation logic (validation)
- `src/lib/api/services/projects.ts` - API service (database operations)
- `src/lib/api/client.ts` - Base API client (Supabase wrapper)
- `supabase/migrations/012_rls_policies.sql` - Original RLS policies
- `supabase/migrations/015_allow_all_authenticated_users_create_projects.sql` - First attempt to fix
- `supabase/migrations/018_simplify_projects_insert_policy.sql` - Second attempt (too permissive)

## Success Criteria

You'll know the fix is working when:

1. **No errors in console** - Check browser DevTools
2. **Success notification** - "Project created successfully" toast
3. **Project in list** - Appears in projects page immediately
4. **Can access project** - Click to view details works
5. **Network tab clean** - No 403 or 400 errors
6. **Correct ownership** - Project.company_id matches your user.company_id
7. **User assigned** - You appear in project_users table for this project

## Prevention (Future)

To prevent this issue from recurring:

### 1. Add Real-Time Profile Updates
Update AuthContext to subscribe to user profile changes:

```typescript
// In AuthContext.tsx
useEffect(() => {
  if (!user) return

  const subscription = supabase
    .channel('user-profile-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'users',
      filter: `id=eq.${user.id}`
    }, (payload) => {
      setUserProfile(payload.new as UserProfile)
    })
    .subscribe()

  return () => subscription.unsubscribe()
}, [user])
```

### 2. Add Profile Refresh Helper
Expose a function to manually refresh profile:

```typescript
// In AuthContext
const refreshProfile = async () => {
  if (!user) return
  await fetchUserProfile(user.id)
}

// In context value
return { ..., refreshProfile }
```

### 3. Add Integration Tests
Test project creation with:
- Fresh user accounts
- Different roles
- NULL company_id (should fail gracefully)
- Invalid company_id (should fail with clear error)
- After role change (should work after refresh)

### 4. Add Better Error Messages
Improve validation errors to guide users:

```typescript
if (!userProfile.company_id) {
  throw new Error(
    'No company assigned to your account. ' +
    'If you just had your account updated, please log out and back in. ' +
    'Otherwise, contact support.'
  )
}
```

### 5. Monitor RLS Policy Performance
Add logging to track:
- RLS policy evaluation time
- Recursive policy detection
- 403 error frequency by table/operation

## Support

If you're still stuck after following this guide:

1. Run VERIFY_FIX_STATUS.sql and save results
2. Take screenshots of:
   - Browser console (all errors)
   - Network tab (filtered to "projects")
   - Create project dialog (with data filled in)
3. Check Supabase Dashboard → Logs for backend errors
4. Provide:
   - Your user email (for database lookup)
   - Timestamp of failed attempt
   - Whether you logged out/in after SQL fix
   - Results from VERIFY_FIX_STATUS.sql

## Summary

The 403 error has **two components**:

1. **Immediate Issue**: Stale cached user profile in browser
   - **Fix**: Log out and back in (REQUIRED)
   - **Why**: AuthContext caches profile on login, doesn't auto-refresh

2. **Underlying Issue**: Weak RLS policies and recursion
   - **Fix**: Apply migrations 046 and 047
   - **Why**: Current policies don't validate properly or cause infinite loops

**Both must be addressed** for a permanent fix. The immediate issue blocks you now, but the underlying issues will cause problems for other users and edge cases.

**Order of operations:**
1. Log out and back in (fixes immediate issue)
2. Verify database state (confirms data is correct)
3. Apply migrations (prevents future issues)
4. Test thoroughly (confirms everything works)
5. Monitor logs (catches any remaining issues)
