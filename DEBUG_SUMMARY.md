# Project Creation Bug - Debug Summary

## Executive Summary

Fixed critical project creation failure caused by **missing user profile data** in the database. The authenticated user existed in Supabase Auth but not in the application's `users` table, causing API calls to fail and RLS policies to block access.

## Error Symptoms

### 1. Main Error
```
Failed to create project: ApiError: Failed to create project
Location: CreateProjectDialog.tsx:113
```

### 2. HTTP Errors
```
400 Bad Request to Supabase endpoint
Status: Forbidden
```

### 3. IndexedDB Error
```
Failed to update conflict count: DataError: Failed to execute 'count' on 'IDBIndex':
The parameter is not a valid key
Location: offline-store.ts:73
```

## Root Cause Analysis

### Primary Issue: Missing User Profile
**Problem:** User authenticated via Supabase Auth but no corresponding record in `users` table

**Impact Chain:**
1. `AuthContext.fetchUserProfile()` queries `users` table
2. No record found, `userProfile` remains `null`
3. `userProfile.company_id` is undefined
4. API call to create project fails validation
5. RLS policy blocks insert because user role cannot be determined

**Evidence:**
- Line 30-34 in `src/lib/auth/AuthContext.tsx`: Query using `.single()` expects exactly one record
- If no record exists, query throws error and `userProfile` stays null
- Line 19-22 in `src/features/projects/hooks/useProjectsMutations.ts`: No validation before accessing `userProfile.company_id`

### Secondary Issue: RLS Policy Enforcement
**Problem:** Row-Level Security policy requires authenticated user to:
1. Exist in `users` table
2. Have a valid `role` field
3. Role must be in: `['superintendent', 'project_manager', 'owner', 'admin']`
4. Have a `company_id` assigned

**Policy Definition (migrations/012_rls_policies.sql:43-48):**
```sql
CREATE POLICY "Authorized users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superintendent', 'project_manager', 'owner', 'admin')
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
```

**Why It Failed:**
- Query `SELECT role FROM users WHERE id = auth.uid()` returns NULL (no record)
- Policy check fails
- Supabase returns 403 Forbidden (shown as 400 Bad Request)

### Tertiary Issue: IndexedDB Boolean Key
**Problem:** Passing raw boolean `false` as index key to IndexedDB

**Error Location:** `src/stores/offline-store.ts:73`
```typescript
await countByIndex(STORES.CONFLICTS, 'resolved', false)
```

**Why It Failed:**
- While booleans are technically valid IndexedDB keys, some browser implementations are strict
- Should use `IDBKeyRange.only(false)` for compatibility

## Solutions Implemented

### Fix 1: Auth Context - Graceful Handling of Missing Users
**File:** `c:\Users\Eli\Documents\git\src\lib\auth\AuthContext.tsx`

**Changes:**
```typescript
// BEFORE
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()  // Throws error if no record

// AFTER
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .maybeSingle()  // Returns null if no record

if (!data) {
  logger.warn('User profile not found in database. User may need to be created in users table.')
  setUserProfile(null)
  return
}
```

**Benefits:**
- No crash when user record missing
- Clear warning in console
- User sees meaningful error message instead of generic failure

### Fix 2: Mutation Hook - Comprehensive Validation
**File:** `c:\Users\Eli\Documents\git\src\features\projects\hooks\useProjectsMutations.ts`

**Changes:**
```typescript
mutationFn: async (project) => {
  // Step-by-step validation with clear error messages
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

**Benefits:**
- Clear, actionable error messages
- Identifies exactly what's missing
- Prevents cryptic 400/403 errors
- Matches RLS policy requirements

### Fix 3: IndexedDB - Proper Key Range Usage
**File:** `c:\Users\Eli\Documents\git\src\stores\offline-store.ts`

**Changes:**
```typescript
// BEFORE
const conflictCount = await countByIndex(STORES.CONFLICTS, 'resolved', false);

// AFTER
const conflictCount = await countByIndex(STORES.CONFLICTS, 'resolved', IDBKeyRange.only(false));

// Added error handling
catch (error) {
  logger.error('Failed to update conflict count:', error);
  set({ conflictCount: 0 }); // Fallback instead of crash
}
```

**Benefits:**
- Cross-browser compatibility
- No app crash on IndexedDB errors
- Graceful degradation

## Database Setup Required

### For Existing Users

Run this SQL in Supabase SQL Editor:

```sql
-- 1. Find your auth user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 2. Find or create company
SELECT id, name FROM companies;
-- If no company exists:
INSERT INTO companies (name, slug, email)
VALUES ('My Company', 'my-company', 'admin@mycompany.com')
RETURNING id;

-- 3. Create user record
INSERT INTO users (
  id,
  email,
  company_id,
  role,
  first_name,
  last_name,
  is_active
) VALUES (
  'YOUR_AUTH_USER_ID',     -- From step 1
  'your@email.com',
  'YOUR_COMPANY_ID',       -- From step 2
  'superintendent',        -- Or: project_manager, owner, admin
  'First',
  'Last',
  true
)
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  role = EXCLUDED.role;

-- 4. Verify setup
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

### For Future Users (Automated)

Create a trigger to auto-create user records on signup:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    'field_employee',  -- Default role
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Testing Steps

1. **Verify Database Setup**
   ```sql
   SELECT * FROM users WHERE id = auth.uid();
   ```
   Must return:
   - `company_id`: not null
   - `role`: one of: superintendent, project_manager, owner, admin
   - `is_active`: true

2. **Refresh Application**
   - Hard refresh browser (Ctrl+Shift+R)
   - Auth context will reload user profile
   - Check console for "User profile not found" warning

3. **Test Project Creation**
   - Navigate to Projects page
   - Click "New Project" button
   - Fill in form:
     - Project Name: "Test Project" (required)
     - Project Number: "2024-001" (optional)
     - Status: "Active" (or planning, on_hold, completed)
   - Click "Create Project"

4. **Expected Success Result**
   - Success toast: "Project 'Test Project' created successfully"
   - Project appears in list
   - No console errors
   - Dialog closes automatically

5. **Expected Failure Result (if setup incomplete)**
   - Error toast with specific message:
     - "User profile not loaded..." = No users table record
     - "No company assigned..." = users.company_id is null
     - "Your role does not have permission..." = Wrong role
   - Console shows detailed error
   - Dialog stays open for correction

## Files Modified

### Production Code
1. `src/lib/auth/AuthContext.tsx` - Auth context with graceful error handling
2. `src/features/projects/hooks/useProjectsMutations.ts` - Enhanced validation
3. `src/stores/offline-store.ts` - IndexedDB boolean key fix

### Documentation
1. `PROJECT_CREATION_FIX.md` - Detailed fix documentation
2. `DEBUG_SUMMARY.md` - This file
3. `migrations/999_setup_test_user.sql` - Helper SQL script

## Prevention Strategies

### 1. Signup Flow
- Update signup to create `users` table record immediately after auth
- OR use the trigger-based auto-creation (recommended)

### 2. Onboarding Flow
- Add company creation/selection during user onboarding
- Assign company_id immediately after company creation
- Set appropriate role based on invite/signup context

### 3. UI/UX Improvements
- Show loading state while userProfile loads
- Disable "Create Project" button if:
  ```typescript
  !userProfile?.company_id ||
  !userProfile?.role ||
  !['superintendent', 'project_manager', 'owner', 'admin'].includes(userProfile.role)
  ```
- Add tooltip explaining why button is disabled

### 4. Error Boundaries
- Implement React Error Boundary for auth failures
- Show user-friendly message with support contact
- Log detailed error for debugging

### 5. Monitoring
- Track auth failures in production
- Alert on high rate of "User profile not found" errors
- Dashboard for user/company assignment status

## Architecture Notes

### Multi-Tenant Data Model
```
companies (tenant root)
  └── users (tenant members)
      └── project_users (project assignments)
          └── projects (scoped to company)
```

### RLS Policy Pattern
All project-scoped tables follow this pattern:
1. **SELECT**: User in project_users for that project
2. **INSERT**: User role + company match
3. **UPDATE**: User in project_users with can_edit=true
4. **DELETE**: User in project_users with can_delete=true

### Auth Flow
```
1. User signs up/logs in → Supabase Auth (auth.users)
2. Trigger creates record → App Database (users table)
3. Admin assigns company → users.company_id updated
4. Admin sets role → users.role updated
5. User assigned to projects → project_users records
6. User can now create/view projects ✓
```

## Related Issues

### Issue: User created but no company
**Symptom:** "No company assigned to your user account"
**Fix:** `UPDATE users SET company_id = 'COMPANY_ID' WHERE id = 'USER_ID'`

### Issue: User has wrong role
**Symptom:** "Your role does not have permission to create projects"
**Fix:** `UPDATE users SET role = 'superintendent' WHERE id = 'USER_ID'`

### Issue: Company doesn't exist
**Symptom:** Foreign key violation on company_id
**Fix:** Create company first: `INSERT INTO companies (name, slug) VALUES ('Co', 'co')`

### Issue: RLS blocking even with correct data
**Symptom:** Still getting 403 Forbidden
**Debug:**
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'projects';

-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'projects';

-- Test policy manually
SELECT
  (SELECT role FROM users WHERE id = auth.uid()) as user_role,
  (SELECT company_id FROM users WHERE id = auth.uid()) as user_company,
  auth.uid() as auth_user_id;
```

## Performance Considerations

### Auth Context Loading
- User profile fetched on every page load
- Consider caching in localStorage with expiration
- Implement optimistic updates for profile changes

### RLS Policy Performance
- Policies run on every query
- Subqueries can be slow with many users
- Consider materialized views for complex permission checks
- Index on project_users(user_id, project_id)

### IndexedDB Operations
- Background sync should not block UI
- Use debouncing for count updates
- Consider Web Workers for heavy IndexedDB operations

## Success Metrics

After fix deployment, verify:
- [ ] Project creation success rate > 95%
- [ ] "User profile not found" errors < 5% of requests
- [ ] IndexedDB errors < 0.1% of operations
- [ ] User time-to-first-project < 2 minutes
- [ ] Support tickets for "can't create project" decrease

## Next Steps

1. **Immediate** (before testing):
   - Run SQL to create user records for all auth users
   - Assign companies and roles
   - Verify with test accounts

2. **Short-term** (next sprint):
   - Implement auto-creation trigger
   - Add onboarding flow for new users
   - Improve error messages in UI

3. **Medium-term** (next month):
   - Add admin panel for user management
   - Implement role-based UI hiding
   - Add monitoring/alerting

4. **Long-term** (future):
   - Consider alternative auth patterns (e.g., JWT with role claims)
   - Optimize RLS policies for performance
   - Implement user invitation system

## Contact

For questions about this fix:
- Check console logs for specific error messages
- Review RLS policies in migrations/012_rls_policies.sql
- Verify database state with SQL queries above
- Check Supabase dashboard for auth issues
