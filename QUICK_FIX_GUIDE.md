# Quick Fix Guide - Project Creation Failure

## Problem
User cannot create projects. Getting error: "Failed to create project: ApiError: Failed to create project"

## Quick Solution (5 minutes)

### Step 1: Check if user exists in database

Open Supabase SQL Editor and run:

```sql
SELECT id, email, company_id, role
FROM users
WHERE id = auth.uid();
```

**If no results:** You need to create a user record (go to Step 2)
**If results show null company_id or role:** You need to update (go to Step 3)

### Step 2: Create User Record

First, get your company ID:
```sql
SELECT id, name FROM companies LIMIT 1;
```

Then create user record (replace the placeholders):
```sql
INSERT INTO users (
  id,
  email,
  company_id,
  role,
  is_active
)
SELECT
  auth.uid(),
  auth.email(),
  'YOUR_COMPANY_ID_HERE',  -- Paste company ID from above
  'superintendent',         -- Use: superintendent, project_manager, owner, or admin
  true;
```

### Step 3: Update Existing User

If user exists but missing data:
```sql
UPDATE users
SET
  company_id = 'YOUR_COMPANY_ID_HERE',  -- Get from: SELECT id FROM companies
  role = 'superintendent'                -- Or: project_manager, owner, admin
WHERE id = auth.uid();
```

### Step 4: Verify

```sql
SELECT
  u.id,
  u.email,
  u.company_id,
  u.role,
  c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();
```

**Required fields must be:**
- company_id: NOT NULL
- role: One of: superintendent, project_manager, owner, admin
- company_name: Should show your company name

### Step 5: Test

1. Refresh your browser (Ctrl+Shift+R)
2. Try creating a project again
3. Should work now!

## If You Don't Have a Company

Create one first:
```sql
INSERT INTO companies (name, slug, email)
VALUES (
  'My Construction Company',
  'my-construction-co',
  'admin@mycompany.com'
)
RETURNING id, name;
```

Then use the returned ID in Step 2 or 3 above.

## Allowed Roles for Project Creation

Only these roles can create projects:
- `superintendent`
- `project_manager`
- `owner`
- `admin`

Other roles (`field_employee`, `subcontractor`, `architect`) cannot create projects.

## Common Errors and Fixes

| Error Message | Cause | Fix |
|--------------|-------|-----|
| "User profile not loaded" | No record in users table | Run Step 2 |
| "No company assigned" | users.company_id is null | Run Step 3 |
| "Your role does not have permission" | Wrong role or null | Update role in Step 3 |
| "400 Bad Request" | Missing required data | Verify all fields in Step 4 |

## Automated Solution (For Future Users)

To automatically create user records for all new signups, run this once:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, is_active)
  VALUES (NEW.id, NEW.email, 'field_employee', true)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Note: Default role is `field_employee` which cannot create projects. You'll still need to update role manually for users who need to create projects.

## Still Having Issues?

1. Check browser console for detailed error message
2. Verify you're logged in: `SELECT auth.uid()` should return your user ID
3. Check RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'projects'`
4. See detailed documentation in `PROJECT_CREATION_FIX.md` and `DEBUG_SUMMARY.md`
