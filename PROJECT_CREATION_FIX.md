# Project Creation Bug Fix

## Summary
Fixed critical bug preventing project creation due to missing user profile data and IndexedDB errors.

## Issues Identified

### 1. Missing User Profile Data (CRITICAL)
**Root Cause:** Users authenticated via Supabase Auth but not yet inserted into the `users` table.

**Impact:**
- `userProfile.company_id` is null/undefined
- API call fails with 400 Bad Request
- RLS policy blocks insert because user role cannot be determined

**Files Affected:**
- `src/lib/auth/AuthContext.tsx`
- `src/features/projects/hooks/useProjectsMutations.ts`

### 2. RLS Policy Enforcement
**Root Cause:** Row-Level Security policy requires user to exist in `users` table with valid role.

**Policy (from migrations/012_rls_policies.sql):**
```sql
CREATE POLICY "Authorized users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superintendent', 'project_manager', 'owner', 'admin')
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
```

**Allowed Roles:**
- `superintendent`
- `project_manager`
- `owner`
- `admin`

### 3. IndexedDB Boolean Key Error
**Root Cause:** Passing raw boolean `false` to IndexedDB index query.

**Error:** "Failed to execute 'count' on 'IDBIndex': The parameter is not a valid key"

**Files Affected:**
- `src/stores/offline-store.ts` (line 73)

## Fixes Applied

### Fix 1: Enhanced Auth Context Error Handling
**File:** `c:\Users\Eli\Documents\git\src\lib\auth\AuthContext.tsx`

**Changes:**
- Changed `.single()` to `.maybeSingle()` to handle missing user records gracefully
- Added warning log when user profile not found
- Prevents crash when user doesn't exist in database

**Code:**
```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .maybeSingle()  // Changed from .single()

if (!data) {
  logger.warn('User profile not found in database. User may need to be created in users table.')
  setUserProfile(null)
  return
}
```

### Fix 2: Enhanced Mutation Validation
**File:** `c:\Users\Eli\Documents\git\src\features\projects\hooks\useProjectsMutations.ts`

**Changes:**
- Added comprehensive validation before API call
- Clear error messages for each failure scenario
- Role permission check

**Code:**
```typescript
mutationFn: async (project) => {
  if (!user) {
    throw new Error('You must be logged in to create a project')
  }

  if (!userProfile) {
    throw new Error('User profile not loaded. Please ensure you have a user record in the database.')
  }

  if (!userProfile.company_id) {
    throw new Error('No company assigned to your user account. Please contact support.')
  }

  if (!userProfile.role) {
    throw new Error('No role assigned to your user account. Please contact support.')
  }

  const allowedRoles = ['superintendent', 'project_manager', 'owner', 'admin']
  if (!allowedRoles.includes(userProfile.role)) {
    throw new Error(`Your role (${userProfile.role}) does not have permission to create projects`)
  }

  return projectsApi.createProject(userProfile.company_id, project, userProfile.id)
}
```

### Fix 3: IndexedDB Boolean Key Handling
**File:** `c:\Users\Eli\Documents\git\src\stores\offline-store.ts`

**Changes:**
- Use `IDBKeyRange.only(false)` instead of raw boolean
- Added fallback to set count to 0 on error
- Prevents app crash from IndexedDB errors

**Code:**
```typescript
updateConflictCount: async () => {
  try {
    const conflictCount = await countByIndex(STORES.CONFLICTS, 'resolved', IDBKeyRange.only(false));
    set({ conflictCount });
  } catch (error) {
    logger.error('Failed to update conflict count:', error);
    set({ conflictCount: 0 });
  }
},
```

## Required Database Setup

### Step 1: Ensure User Record Exists

For each authenticated user, you need a corresponding record in the `users` table.

**Option A: Manual SQL (for existing users)**

Run this SQL in Supabase SQL Editor to create a user record:

```sql
-- Replace these values with actual user data
INSERT INTO users (
  id,
  email,
  company_id,
  role,
  first_name,
  last_name,
  is_active
) VALUES (
  'YOUR_AUTH_USER_ID',        -- Get from auth.users table
  'user@example.com',
  'YOUR_COMPANY_ID',          -- Get from companies table
  'superintendent',           -- Or: project_manager, owner, admin
  'John',
  'Doe',
  true
)
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
```

**Option B: Trigger-Based Auto-Creation (recommended)**

Create a trigger to automatically insert user records when auth users are created:

```sql
-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    'field_employee',  -- Default role, can be updated by admin
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 2: Assign Company to Users

If users don't have a company_id assigned:

```sql
-- Update user with company assignment
UPDATE users
SET company_id = 'YOUR_COMPANY_ID'
WHERE id = 'YOUR_USER_ID';
```

### Step 3: Verify Setup

Check that user has all required fields:

```sql
SELECT
  u.id,
  u.email,
  u.company_id,
  u.role,
  u.is_active,
  c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();
```

Required fields for project creation:
- `id` (must match auth.users.id)
- `email`
- `company_id` (must exist in companies table)
- `role` (must be: superintendent, project_manager, owner, or admin)
- `is_active` = true

## Testing the Fix

1. Ensure you have a user record in the `users` table with proper company_id and role
2. Refresh the application to reload auth context
3. Open the Create Project dialog
4. Fill in the form:
   - Project Name: "Test Project"
   - Project Number: "2024-TEST"
   - Status: "Active"
   - Other fields optional
5. Click "Create Project"

**Expected Result:**
- Project created successfully
- Success toast notification
- Project appears in project list
- No console errors

**If Still Failing:**
1. Check browser console for the specific error message
2. Verify user record exists: `SELECT * FROM users WHERE id = auth.uid()`
3. Verify company exists: `SELECT * FROM companies WHERE id = 'YOUR_COMPANY_ID'`
4. Check RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'projects'`

## Prevention Recommendations

### 1. User Creation Flow
Ensure users are created in the `users` table during signup:
- Implement the trigger-based auto-creation (Option B above)
- OR update signup flow to insert user record after auth creation

### 2. Company Assignment Flow
- During signup, assign users to a company
- For multi-tenant SaaS, company should be created first
- Then users are invited/created with company_id

### 3. Error Boundary
Add an error boundary component to catch and display auth-related errors gracefully.

### 4. Loading States
Show loading indicator while user profile is being fetched to prevent premature form submissions.

### 5. Validation
Add frontend validation to disable "Create Project" button if:
```typescript
const canCreateProject = userProfile?.company_id &&
  userProfile?.role &&
  ['superintendent', 'project_manager', 'owner', 'admin'].includes(userProfile.role)
```

## Files Modified

1. `c:\Users\Eli\Documents\git\src\lib\auth\AuthContext.tsx` - Auth context with better error handling
2. `c:\Users\Eli\Documents\git\src\features\projects\hooks\useProjectsMutations.ts` - Enhanced validation
3. `c:\Users\Eli\Documents\git\src\stores\offline-store.ts` - IndexedDB boolean key fix

## Related Files (No Changes Required)

- `src/features/projects\components\CreateProjectDialog.tsx` - Form component (working correctly)
- `src/lib/api/services/projects.ts` - API layer (working correctly)
- `src/lib/api/client.ts` - Supabase client (working correctly)
- `src/types/database.ts` - Type definitions (correct)
- `migrations/012_rls_policies.sql` - RLS policies (correct, just need data)

## Additional Notes

### Project Status Values
The form currently uses these status values:
- `planning`
- `active`
- `on_hold`
- `completed`

These are stored as strings and match the database schema.

### Features Enabled
The form sets default features_enabled:
```json
{
  "daily_reports": true,
  "documents": true,
  "workflows": true,
  "tasks": true,
  "checklists": true,
  "punch_lists": true,
  "safety": true,
  "inspections": true,
  "material_tracking": true,
  "photos": true,
  "takeoff": true
}
```

These are JSONB fields and fully supported.
