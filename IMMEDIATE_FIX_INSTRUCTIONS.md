# IMMEDIATE FIX INSTRUCTIONS - 403 Project Creation Error

## CRITICAL: You MUST Log Out and Back In

The SQL fix updated your user record in the database, but your browser session still has **cached (stale) data**.

### Why This Matters
- Your browser cached your user profile when you logged in
- The cache contains old role/company_id data
- Changes to the database are NOT reflected until you refresh your session
- Logging out and back in forces a fresh profile fetch

### Steps to Fix NOW

1. **Log Out**
   - Click your profile/user menu in the top right
   - Click "Log Out"
   - Wait for redirect to login page

2. **Clear Browser Cache** (Optional but recommended)
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files"
   - Click "Clear data"

3. **Log Back In**
   - Enter your email and password
   - Wait for the dashboard to load completely

4. **Verify Your Session**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Type: `localStorage.getItem('supabase.auth.token')`
   - You should see a fresh JWT token

5. **Try Creating a Project Again**
   - Navigate to Projects page
   - Click "Create New Project"
   - Fill in the form
   - Submit

## What to Check If Still Not Working

### Check 1: Verify Database Was Updated
Open Supabase SQL Editor and run:

```sql
SELECT
  u.id,
  u.email,
  u.role,
  u.company_id,
  u.is_active,
  c.name as company_name,
  u.updated_at
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- Replace with your email
```

**Expected Results:**
- `role`: should be 'superintendent' (or another allowed role)
- `company_id`: should be a valid UUID (not NULL)
- `is_active`: should be true
- `company_name`: should show your company name (not NULL)
- `updated_at`: should be recent (shows the update was applied)

If any of these are wrong, re-run the QUICK_FIX_SQL.sql with correct values.

### Check 2: Test INSERT Permission Directly
Run this in Supabase SQL Editor:

```sql
-- This should return your user ID
SELECT auth.uid();

-- This should return your profile
SELECT id, email, role, company_id, is_active
FROM users
WHERE id = auth.uid();

-- Try a test insert (will create a real project!)
INSERT INTO projects (
  company_id,
  name,
  project_number,
  status,
  created_by
) VALUES (
  (SELECT company_id FROM users WHERE id = auth.uid()),
  'Database Test Project',
  'TEST-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
  'planning',
  auth.uid()
) RETURNING id, name, company_id, created_by;
```

**If this succeeds:**
- The database permissions are correct
- The issue is in the frontend cached data
- MUST log out and back in

**If this fails:**
- Note the error message
- There's a database policy or constraint issue
- See "Advanced Troubleshooting" below

### Check 3: Browser Console Errors
After logging back in and trying to create a project:

1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors
4. Take a screenshot
5. Share with developer

**Common error patterns:**

- **"User profile not loaded"** → Database query failed, check RLS policies
- **"No company assigned"** → company_id is NULL in database
- **"No role assigned"** → role is NULL in database
- **403 Forbidden** → RLS policy blocking the INSERT
- **400 Bad Request** → Invalid data being sent (check form values)

## Advanced Troubleshooting

### If You Still Get 403 After Logout/Login

Run this diagnostic query:

```sql
-- Check current RLS policies on projects table
SELECT
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'INSERT';
```

**Expected Result:**
- Should show a policy allowing INSERT for authenticated users

**If no policy shows up:**
- The INSERT policy wasn't created
- Run the migration: `supabase/migrations/018_simplify_projects_insert_policy.sql`

### If SELECT FROM users Fails

The issue might be recursive RLS policies. Test with:

```sql
-- This should work (shows your own user record)
SELECT id, email, role, company_id
FROM users
WHERE id = auth.uid();

-- This might fail (recursive policy issue)
SELECT id, email, role, company_id
FROM users
WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid());
```

**If the second query fails:**
- There's a recursive policy issue
- Apply migration 046 (see ROOT_CAUSE_ANALYSIS_403_ERROR.md)

### If project_users INSERT Fails

After project creation succeeds, check if user was assigned:

```sql
SELECT
  pu.*,
  p.name as project_name,
  u.email as user_email
FROM project_users pu
JOIN projects p ON pu.project_id = p.id
JOIN users u ON pu.user_id = u.id
WHERE u.id = auth.uid()
ORDER BY pu.created_at DESC
LIMIT 5;
```

**If no records:**
- The project was created but user wasn't assigned
- Check RLS policy on project_users table
- The error is logged but doesn't block project creation

## Success Indicators

You'll know it's working when:

1. No errors in browser console
2. Success toast notification appears
3. Project appears in projects list
4. You can click on the project and see details
5. No 403 or 400 errors in Network tab

## Still Stuck?

If none of this works:

1. Take screenshots of:
   - Browser console errors
   - Network tab (filter by "projects")
   - The create project form with data filled in
   - Results of SQL queries above

2. Share:
   - Screenshots
   - Your user email (for database lookup)
   - Whether you logged out and back in
   - Results of verification queries

3. Check Supabase Dashboard:
   - Go to Authentication > Users
   - Find your user
   - Check metadata
   - Verify email is confirmed

## Next Steps After Fix Works

Once project creation succeeds:

1. Apply permanent fixes (migrations 046 and 047)
2. Test with other users
3. Test with different roles
4. Test edge cases (invalid data, missing fields)
5. Add integration tests to prevent regression

## Files Referenced

- `ROOT_CAUSE_ANALYSIS_403_ERROR.md` - Detailed technical analysis
- `QUICK_FIX_SQL.sql` - Initial SQL fix (already applied)
- `supabase/migrations/046_fix_projects_insert_policy.sql` - Permanent INSERT policy fix
- `supabase/migrations/047_fix_users_select_policy.sql` - Fix recursive SELECT policy
- `src/lib/auth/AuthContext.tsx` - Frontend auth state management
- `src/features/projects/hooks/useProjectsMutations.ts` - Project creation logic
