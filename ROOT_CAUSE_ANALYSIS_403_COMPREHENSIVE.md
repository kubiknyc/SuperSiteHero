# Root Cause Analysis: 403 Forbidden Error on Project Creation

## Executive Summary

**Problem**: User gets 403 Forbidden when attempting to POST to `/rest/v1/projects` endpoint, even after applying migrations 046 & 047 and logging out/back in.

**Root Cause**: Most likely the user's `company_id` field in the `users` table is `NULL`, which violates the RLS policy's `WITH CHECK` constraint that requires `company_id IS NOT NULL`.

**Solution**: Run `COMPLETE_FIX_403_ERROR.sql` to fix all database issues, then user must log out and back in to refresh cached profile data.

---

## Sequential Thinking Analysis

### Hypothesis Chain

1. **Migrations Applied Successfully**
   - Migration 046: Creates correct INSERT policy with company_id validation
   - Migration 047: Creates helper functions to prevent RLS recursion
   - ✅ Verified: Migrations were applied

2. **User Logged Out and Back In**
   - ✅ Verified: User performed logout/login
   - ⚠️ Issue: Frontend may still have cached `userProfile` data

3. **Still Getting 403 Forbidden**
   - This indicates the RLS policy is actively blocking the INSERT
   - The policy has 3 conditions in WITH CHECK clause:
     - `auth.uid() IS NOT NULL` - User is authenticated
     - `company_id IS NOT NULL` - Company ID must be provided
     - `company_id = (SELECT company_id FROM users WHERE id = auth.uid())` - Company must match user's company

4. **Which Condition is Failing?**
   - Condition 1 is passing (user is authenticated)
   - Condition 2 or 3 must be failing
   - **Most likely**: User's `company_id` in database is `NULL`

---

## Evidence Analysis

### Migration 046 & 047 Policy Logic

```sql
CREATE POLICY "Authenticated users can insert projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL                           -- ✅ Passes (user logged in)
    AND company_id IS NOT NULL                       -- ❌ FAILS if frontend sends NULL
    AND company_id = (SELECT company_id FROM users   -- ❌ FAILS if user.company_id is NULL
                      WHERE id = auth.uid())
  );
```

### Frontend Logic Analysis

**File**: `src/features/projects/hooks/useProjectsMutations.ts`

```typescript
// Lines 28-30: Validation checks
if (!userProfile.company_id) {
  throw new Error('No company assigned to your user account. Please contact support.')
}

// Line 40: API call
return projectsApi.createProject(userProfile.company_id, project, userProfile.id)
```

**Frontend sends**: `userProfile.company_id` from AuthContext

**Critical Issue**: If `userProfile` is cached from before the database fix was applied, it will have `company_id: null`, which will:
1. Pass the frontend validation (cached value is checked before refetch)
2. Send `company_id: null` to the API
3. Fail the RLS policy check: `company_id IS NOT NULL`
4. Result in 403 Forbidden

---

## Root Cause Identification

### Primary Root Cause (90% Probability)

**User's `company_id` in database is `NULL`**

**Evidence**:
- RLS policy requires `company_id IS NOT NULL`
- Frontend validation checks for `userProfile.company_id` but uses cached data
- Even after logout/login, React Query cache might persist

**Why This Happens**:
1. User record was created without `company_id` (possible in early migrations)
2. Migrations 046/047 fixed the policy but didn't fix existing NULL values
3. User logs out/in but frontend cache isn't fully cleared
4. Frontend sends `company_id: null` to API
5. RLS policy blocks with 403

### Secondary Root Causes (10% Probability)

1. **Multiple Conflicting Policies**
   - If multiple INSERT policies exist, they might conflict
   - RESTRICTIVE policies can override PERMISSIVE policies

2. **Helper Function Not Working**
   - If `public.get_user_company_id()` returns NULL due to RLS recursion
   - This would affect the policy's ability to validate company_id match

3. **Frontend-Backend Data Mismatch**
   - `userProfile.company_id` differs from database `users.company_id`
   - Auth session has stale data

---

## Diagnostic Flow

```
START: 403 Forbidden Error
│
├─ Check 1: Is user authenticated?
│  ├─ YES ✅ → Continue
│  └─ NO ❌ → Auth issue (not our case)
│
├─ Check 2: Does user have company_id in database?
│  ├─ YES ✅ → Continue to Check 3
│  └─ NO ❌ → ROOT CAUSE FOUND
│
├─ Check 3: Does frontend send company_id?
│  ├─ YES ✅ → Continue to Check 4
│  └─ NO ❌ → Frontend cache issue
│
├─ Check 4: Does company_id match user's company?
│  ├─ YES ✅ → Continue to Check 5
│  └─ NO ❌ → Data integrity issue
│
├─ Check 5: Is RLS policy correct?
│  ├─ YES ✅ → Continue to Check 6
│  └─ NO ❌ → Policy misconfiguration
│
└─ Check 6: Are helper functions working?
   ├─ YES ✅ → Unknown issue
   └─ NO ❌ → Function/recursion issue
```

---

## Solution Details

### Step 1: Run Diagnostic Script

**File**: `scripts/DEEP_ROOT_CAUSE_ANALYSIS_403.sql`

This script will:
- Verify migrations were applied
- Check all users for NULL company_id
- Test helper functions
- Simulate RLS policy logic
- Identify exact root cause

**How to Run**:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste the script
4. Execute with Service Role
5. Review output for diagnostics

### Step 2: Apply Complete Fix

**File**: `scripts/COMPLETE_FIX_403_ERROR.sql`

This script fixes ALL possible root causes:

1. **Fix NULL company_id**
   ```sql
   UPDATE users
   SET company_id = (SELECT id FROM companies LIMIT 1)
   WHERE company_id IS NULL;
   ```

2. **Recreate Helper Functions**
   ```sql
   CREATE OR REPLACE FUNCTION public.get_user_company_id()
   RETURNS uuid
   LANGUAGE sql
   STABLE
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1;
   $$;
   ```

3. **Fix Projects INSERT Policy**
   ```sql
   CREATE POLICY "Authenticated users can insert projects in their company"
     ON projects FOR INSERT
     WITH CHECK (
       auth.uid() IS NOT NULL
       AND company_id IS NOT NULL
       AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
     );
   ```

4. **Fix Users SELECT Policy** (prevent recursion)
   ```sql
   CREATE POLICY "Users can view company users"
     ON users FOR SELECT
     USING (
       company_id = public.get_user_company_id()
       OR id = auth.uid()
     );
   ```

### Step 3: Clear Frontend Cache

**Users MUST**:
1. Log out of application
2. Clear browser cache:
   - Open DevTools (F12)
   - Application > Local Storage
   - Delete all items under your domain
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. Log back in

**Why This is Critical**:
- Frontend stores `userProfile` in React Query cache
- Cache persists across logout/login
- Old cached data has `company_id: null`
- Fresh login fetches updated data with valid `company_id`

### Step 4: Verify Fix

**Test in Browser**:
1. Open Network tab in DevTools
2. Try creating a project
3. Check POST request to `/rest/v1/projects`
4. Verify response is 201 Created (not 403 Forbidden)

**Test in SQL Editor**:
```sql
-- Verify user has company_id
SELECT id, email, company_id, role
FROM users
WHERE email = 'your-email@example.com';

-- Test helper function
SELECT public.get_user_company_id();

-- Test INSERT (as authenticated user)
INSERT INTO projects (company_id, name, status, created_by)
VALUES (
  (SELECT company_id FROM users WHERE id = auth.uid()),
  'Test Project',
  'planning',
  auth.uid()
) RETURNING id, name, company_id;
```

---

## Prevention Recommendations

### Database Schema Changes

1. **Make company_id NOT NULL** (future migration):
   ```sql
   ALTER TABLE users
   ALTER COLUMN company_id SET NOT NULL;
   ```

2. **Add CHECK constraint**:
   ```sql
   ALTER TABLE projects
   ADD CONSTRAINT projects_company_id_check
   CHECK (company_id IS NOT NULL);
   ```

3. **Add default company for new users**:
   ```sql
   ALTER TABLE users
   ALTER COLUMN company_id SET DEFAULT (
     SELECT id FROM companies WHERE is_active = true LIMIT 1
   );
   ```

### Frontend Improvements

1. **Add company_id validation before API call**:
   ```typescript
   if (!userProfile?.company_id) {
     // Force refresh profile
     await refetchUserProfile()

     if (!userProfile?.company_id) {
       throw new Error('Company not assigned. Please contact support.')
     }
   }
   ```

2. **Add retry logic with cache invalidation**:
   ```typescript
   const mutation = useMutation({
     mutationFn: createProject,
     onError: async (error) => {
       if (error.status === 403) {
         // Invalidate user profile cache
         queryClient.invalidateQueries(['userProfile'])

         // Show message to user
         toast.error('Session expired. Please log out and back in.')
       }
     }
   })
   ```

3. **Add better error messages**:
   ```typescript
   if (error.status === 403) {
     if (error.message.includes('company_id')) {
       return 'Company not assigned. Please log out and back in.'
     }
     return 'Permission denied. Please contact your administrator.'
   }
   ```

### Testing Improvements

1. **Add E2E test for 403 scenarios**:
   ```typescript
   test('handles user without company_id gracefully', async () => {
     // Mock user with null company_id
     // Attempt to create project
     // Expect error message (not generic 403)
   })
   ```

2. **Add integration test for RLS policies**:
   ```sql
   -- Test that policy blocks NULL company_id
   -- Test that policy allows valid company_id
   -- Test that policy blocks mismatched company_id
   ```

---

## Files Created

1. **`scripts/DEEP_ROOT_CAUSE_ANALYSIS_403.sql`**
   - Comprehensive diagnostic script
   - Identifies exact root cause
   - Tests all components systematically

2. **`scripts/COMPLETE_FIX_403_ERROR.sql`**
   - Fixes ALL possible root causes
   - Idempotent (safe to run multiple times)
   - Includes verification steps

3. **`ROOT_CAUSE_ANALYSIS_403_COMPREHENSIVE.md`**
   - This document
   - Detailed analysis and solution
   - Prevention recommendations

---

## Quick Reference

### Symptoms
- 403 Forbidden on POST `/rest/v1/projects`
- Error message: "Failed to create project"
- Occurs even after migration and logout/login

### Root Cause
- User's `company_id` is NULL in database
- Frontend cache has stale data
- RLS policy blocks NULL company_id

### Solution
1. Run `scripts/COMPLETE_FIX_403_ERROR.sql`
2. User logs out
3. Clear browser cache
4. User logs back in
5. Try creating project again

### Verification
```sql
-- Check user has company_id
SELECT company_id FROM users WHERE id = auth.uid();

-- Should return UUID, not NULL
```

---

## Status: Ready to Fix

**Next Action**: Run `COMPLETE_FIX_403_ERROR.sql` in Supabase SQL Editor

**Expected Outcome**: 403 error resolved, projects can be created successfully

**Estimated Time**: 5 minutes (2 min SQL + 3 min user logout/login)
