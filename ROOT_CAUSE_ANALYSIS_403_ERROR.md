# ROOT CAUSE ANALYSIS: Persistent 403 Error on Project Creation

## Executive Summary

After applying the SQL fix (QUICK_FIX_SQL.sql), the 403 Forbidden error PERSISTS. The root cause is NOT just the INSERT policy - there are MULTIPLE issues creating a cascading failure:

### Critical Finding
The user has NOT logged out and back in after applying the SQL fix. The AuthContext fetches the user profile on login and caches it. Without a fresh login, the application still has stale user data in memory.

## Error Signature from Screenshot

```
Console Errors:
1. GET 400 (Bad Request) - Supabase REST API
2. GET 403 (Forbidden) - Supabase REST API
3. "Failed to create project: ApiError: Failed to create project at Object.createProject (projects.ts:113:11)"
4. "Boolean index query failed, falling back to manual filtering" (UNRELATED - offline store issue)
```

## Root Cause Chain Analysis

### Issue 1: Stale Session (MOST CRITICAL)
**File**: `src/lib/auth/AuthContext.tsx`
**Lines**: 28-60, 100-111

**Problem**:
- User profile is fetched from database on login and cached in React state
- Changes to the database (role, company_id) are NOT reflected until re-login
- The current session still contains old user data

**Evidence**:
```typescript
// AuthContext.tsx - Lines 28-60
const fetchUserProfile = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    // ...
    setUserProfile(data)  // Cached in React state
    return true
  }
}

// Only called on:
// 1. Initial session load (line 71)
// 2. Sign in (line 107)
// 3. Auth state change (line 90)
```

**Impact**: Even if the database has correct role/company_id, the frontend still has stale data.

### Issue 2: RLS Policy on INSERT
**File**: `supabase/migrations/018_simplify_projects_insert_policy.sql`

**Current Policy**:
```sql
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

**Problem**: This policy is TOO PERMISSIVE and doesn't validate company_id.

**Better Policy** (not yet applied):
```sql
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND company_id = projects.company_id
    )
  );
```

### Issue 3: RLS Policy on SELECT (users table)
**File**: `supabase/migrations/012_rls_policies.sql`
**Lines**: 19-21

**Current Policy**:
```sql
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
```

**Problem**: This creates a RECURSIVE query:
- To check if user can SELECT from users table, Postgres executes the subquery `SELECT company_id FROM users WHERE id = auth.uid()`
- This subquery ITSELF requires permission to SELECT from users table
- This causes infinite recursion (mitigated by later migrations but may still cause issues)

**Evidence from migrations**:
- Migration 016: `fix_users_rls_infinite_recursion.sql`
- Migration 017: `remove_recursive_policy.sql`

### Issue 4: Validation Query in Frontend
**File**: `src/features/projects/hooks/useProjectsMutations.ts`
**Lines**: 18-40

**Code Flow**:
```typescript
mutationFn: async (project) => {
  // VALIDATION CHECKS - Lines 20-34
  if (!user) {
    throw new Error('You must be logged in to create a project')
  }

  if (!userProfile) {  // Checking CACHED profile
    throw new Error('User profile not loaded. Please ensure you have a user record in the database.')
  }

  if (!userProfile.company_id) {  // Checking CACHED company_id
    throw new Error('No company assigned to your user account. Please contact support.')
  }

  if (!userProfile.role) {  // Checking CACHED role
    throw new Error('No role assigned to your user account. Please contact support.')
  }

  // Call API with CACHED company_id
  return projectsApi.createProject(userProfile.company_id, project, userProfile.id)
}
```

**Problem**: All validation uses CACHED userProfile from AuthContext, not fresh database data.

### Issue 5: API Insert Logic
**File**: `src/lib/api/services/projects.ts`
**Lines**: 78-117

**Flow**:
```typescript
async createProject(
  companyId: string,
  data: Omit<Project, 'id' | 'created_at' | 'updated_at'>,
  userId?: string
): Promise<Project> {
  // Line 91-94: INSERT project
  const project = await apiClient.insert<Project>('projects', {
    ...data,
    company_id: companyId,  // Using companyId from CACHED userProfile
  })

  // Lines 97-103: INSERT into project_users (optional)
  if (userId) {
    try {
      await apiClient.insert('project_users', {
        project_id: project.id,
        user_id: userId,
      })
    } catch (error) {
      logger.error('Failed to assign user to project:', error)
      // Don't throw - project was created successfully
    }
  }

  return project
}
```

**Problem**: The project_users INSERT might also fail if there's an RLS policy issue.

### Issue 6: Unrelated Console Warning
**File**: `src/stores/offline-store.ts`
**Lines**: 89-100

The "Boolean index query failed, falling back to manual filtering" error is UNRELATED to project creation. It's from the offline store trying to query IndexedDB with a boolean index.

**Not a blocker** - just noise in the console.

## Why the 403 Still Occurs After SQL Fix

The QUICK_FIX_SQL.sql was intended to:
1. Update user role to 'superintendent'
2. Update user company_id to valid UUID
3. Set is_active = true

**However**:
1. User did NOT log out and back in (CRITICAL)
2. AuthContext still has old userProfile in memory
3. Frontend validation might pass/fail based on stale data
4. Backend RLS policy now says "any authenticated user can insert" but might still fail on:
   - Invalid company_id (if stale cached value is wrong)
   - SELECT policy blocking validation queries
   - Foreign key constraint failures

## Verification Steps Needed

### Step 1: Check Database State
Run in Supabase SQL Editor:
```sql
SELECT
  u.id,
  u.email,
  u.role,
  u.company_id,
  u.is_active,
  c.name as company_name,
  au.email as auth_email,
  u.updated_at
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.email = 'your-email@example.com';
```

**Expected**:
- role: 'superintendent' (or similar)
- company_id: valid UUID (not NULL)
- is_active: true
- company_name: actual company name (not NULL)

### Step 2: Check Current RLS Policies
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;
```

**Expected**:
- INSERT policy: "Authenticated users can insert projects"
- SELECT policy: "Users can view assigned projects"
- UPDATE policy: "Assigned users can update projects"

### Step 3: Test INSERT Permission
Run as the logged-in user in Supabase SQL Editor:
```sql
-- This should return your user ID
SELECT auth.uid();

-- This should return your user profile
SELECT * FROM users WHERE id = auth.uid();

-- This should succeed (test insert)
INSERT INTO projects (
  company_id,
  name,
  project_number,
  status
) VALUES (
  (SELECT company_id FROM users WHERE id = auth.uid()),
  'Test Project',
  'TEST-001',
  'planning'
) RETURNING id, name, company_id;

-- Clean up test
DELETE FROM projects WHERE project_number = 'TEST-001';
```

## The Real Fix

### IMMEDIATE (Required for user to proceed):

1. **FORCE USER TO LOG OUT AND BACK IN**
   - This is NON-NEGOTIABLE
   - Without this, the cached userProfile will never update
   - Clear browser cache if needed

2. **Verify Database State** (use queries above)

3. **Check RLS Policies** (use queries above)

### SHORT-TERM (Fix the INSERT policy):

Update migration 018 or create new migration:
```sql
-- File: supabase/migrations/046_fix_projects_insert_policy.sql

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

-- Create a proper policy that validates company_id
CREATE POLICY "Authenticated users can insert projects in their company"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

COMMENT ON POLICY "Authenticated users can insert projects in their company" ON projects IS
  'Allows authenticated users to create projects, ensuring they belong to the user company.
   Validates company_id matches the user company_id.';
```

### MEDIUM-TERM (Fix the SELECT policy recursion):

The SELECT policy on users table needs to avoid recursion:

```sql
-- File: supabase/migrations/047_fix_users_select_policy.sql

-- Drop potentially recursive policy
DROP POLICY IF EXISTS "Users can view company users" ON users;

-- Create non-recursive policy using auth.jwt()
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (
    -- Allow users to see other users in their company
    company_id = (auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid
    -- Or if company_id is in app_metadata:
    -- company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Alternative: Use a security definer function
CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- Then use it in policy
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  USING (company_id = auth.user_company_id());
```

### LONG-TERM (Improve frontend validation):

**Option A**: Force fresh profile fetch before critical operations
```typescript
// In useCreateProjectWithNotification
mutationFn: async (project) => {
  // Force fresh profile fetch
  const { data: freshProfile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !freshProfile) {
    throw new Error('Failed to load current user profile')
  }

  // Use fresh data
  return projectsApi.createProject(freshProfile.company_id, project, freshProfile.id)
}
```

**Option B**: Add real-time subscription to user profile changes
```typescript
// In AuthContext
useEffect(() => {
  if (!user) return

  const subscription = supabase
    .channel('user-profile-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'users',
      filter: `id=eq.${user.id}`
    }, (payload) => {
      setUserProfile(payload.new as UserProfile)
    })
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [user])
```

## Testing Checklist

After applying fixes:

- [ ] User logs out and back in
- [ ] Verify fresh userProfile has correct role and company_id
- [ ] Test project creation with valid data
- [ ] Check Supabase logs for any RLS policy errors
- [ ] Verify project appears in projects list
- [ ] Verify user is assigned to project in project_users table
- [ ] Test with different user roles (if applicable)
- [ ] Test with user without company_id (should fail gracefully)
- [ ] Test with user without role (should fail gracefully)

## Summary

**The 403 error persists because**:
1. User has NOT logged out and back in (stale cached profile)
2. The current INSERT policy is too permissive and doesn't validate company_id properly
3. There may be SELECT policy issues blocking validation queries
4. Frontend uses cached data that may be out of sync with database

**The fix requires**:
1. IMMEDIATE: Force logout/login to refresh session
2. SHORT-TERM: Update INSERT policy to validate company_id
3. MEDIUM-TERM: Fix SELECT policy recursion on users table
4. LONG-TERM: Improve frontend validation with fresh data or real-time updates

**Files to modify**:
- `supabase/migrations/046_fix_projects_insert_policy.sql` (NEW)
- `supabase/migrations/047_fix_users_select_policy.sql` (NEW)
- `src/features/projects/hooks/useProjectsMutations.ts` (optional improvement)
- `src/lib/auth/AuthContext.tsx` (optional real-time subscription)
