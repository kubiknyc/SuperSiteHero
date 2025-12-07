# Project Creation Permission Fix

## Problem Summary

**Error**: "Failed to create project: Error: Your role (field_employee) does not have permission to create projects"

This document provides a comprehensive analysis and step-by-step fix for the permission issue preventing project creation.

---

## Root Cause Analysis

### 1. Role-Based Permission System

The application uses a multi-layered permission system:

- **Frontend validation** (`src/features/projects/hooks/useProjectsMutations.ts`)
- **Backend RLS policies** (`migrations/012_rls_policies.sql`)

Both layers restrict project creation to these roles:
- `superintendent`
- `project_manager`
- `owner`
- `admin`

### 2. Default Role Assignment

When users are automatically created (via auth trigger), they're assigned the role `field_employee`:

**Location**: `migrations/044_enable_auto_user_creation.sql` (line 36)
```sql
'field_employee',     -- Default role, can be updated later
```

This default role does NOT have permission to create projects.

---

## Solution: Update User Role

### Step 1: Find Your User ID

Run this SQL in Supabase SQL Editor:

```sql
-- Find your authenticated user
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

Copy the `id` value (this is your user UUID).

### Step 2: Check Current User Record

```sql
-- Check your current user record
SELECT
  u.id,
  u.email,
  u.role,
  u.company_id,
  u.is_active,
  c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'your-email@example.com';
```

**Expected Issues:**
- `role` is `field_employee` (needs to be updated)
- `company_id` might be `NULL` (also needs to be set)

### Step 3: Find or Create a Company

```sql
-- List existing companies
SELECT id, name, slug FROM companies;
```

**If no company exists**, create one:

```sql
-- Create a new company
INSERT INTO companies (name, slug, email)
VALUES (
  'Your Company Name',
  'your-company-slug',
  'admin@yourcompany.com'
)
RETURNING id, name, slug;
```

Copy the company `id`.

### Step 4: Update Your User Role and Company

```sql
-- Update user with correct role and company
UPDATE users
SET
  role = 'superintendent',  -- Can also use: project_manager, owner, or admin
  company_id = 'YOUR_COMPANY_ID_FROM_STEP_3',
  is_active = true,
  updated_at = NOW()
WHERE id = 'YOUR_USER_ID_FROM_STEP_1';
```

### Step 5: Verify the Fix

```sql
-- Verify everything is correct
SELECT
  u.id,
  u.email,
  u.role,
  u.company_id,
  u.is_active,
  c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'your-email@example.com';
```

**Expected Result:**
- `role`: `superintendent` (or another allowed role)
- `company_id`: valid UUID (not NULL)
- `is_active`: `true`
- `company_name`: your company name (not NULL)

### Step 6: Refresh Your Browser

After updating the database:
1. Log out of the application
2. Log back in
3. Try creating a project again

---

## Alternative: Quick Setup Script

If you prefer, run this all-in-one script (update the values first):

```sql
DO $$
DECLARE
  v_user_id UUID := 'YOUR_AUTH_USER_ID';  -- From auth.users
  v_email TEXT := 'your-email@example.com';
  v_company_id UUID;
BEGIN
  -- Find or create company
  SELECT id INTO v_company_id FROM companies LIMIT 1;

  IF v_company_id IS NULL THEN
    INSERT INTO companies (name, slug, email)
    VALUES ('My Construction Company', 'my-construction-co', 'admin@mycompany.com')
    RETURNING id INTO v_company_id;
    RAISE NOTICE 'Created new company with ID: %', v_company_id;
  ELSE
    RAISE NOTICE 'Using existing company with ID: %', v_company_id;
  END IF;

  -- Update user record
  UPDATE users
  SET
    role = 'superintendent',
    company_id = v_company_id,
    is_active = true,
    updated_at = NOW()
  WHERE id = v_user_id;

  RAISE NOTICE 'User updated successfully';
END $$;
```

---

## Code Changes Made

### 1. Better Error Message (`useProjectsMutations.ts`)

**Before:**
```typescript
throw new Error(`Your role (${userProfile.role}) does not have permission to create projects`)
```

**After:**
```typescript
throw new Error(
  `Your role (${userProfile.role}) does not have permission to create projects. ` +
  `Please contact your administrator to update your role to one of: ${allowedRoles.join(', ')}`
)
```

### 2. Defensive IndexedDB Checks (`offline-store.ts`)

Added checks to prevent console errors when IndexedDB is unavailable:

```typescript
// Check if IndexedDB is available
if (typeof indexedDB === 'undefined') {
  logger.warn('IndexedDB not available, skipping conflict count update');
  set({ conflictCount: 0 });
  return;
}
```

### 3. Reduced Polling Noise (`OfflineIndicator.tsx`)

Modified to only poll when online:

```typescript
// Only poll when online to reduce noise
if (isOnline) {
  useOfflineStore.getState().updatePendingSyncs();
  useOfflineStore.getState().updateConflictCount();
}
```

---

## Understanding the Permission System

### Allowed Roles for Creating Projects

| Role | Can Create Projects | Description |
|------|---------------------|-------------|
| `superintendent` | Yes | Site superintendent with full project access |
| `project_manager` | Yes | Project manager role |
| `owner` | Yes | Company owner |
| `admin` | Yes | System administrator |
| `office_admin` | No | Office administrative staff |
| `field_employee` | No | Field worker (default role) |
| `subcontractor` | No | External subcontractor |
| `architect` | No | Design professional |

### Where Permissions Are Enforced

1. **Frontend** (`src/features/projects/hooks/useProjectsMutations.ts`):
   - Provides immediate feedback to users
   - Prevents unnecessary API calls
   - Shows helpful error messages

2. **Backend RLS** (`migrations/012_rls_policies.sql`):
   - True security enforcement
   - Cannot be bypassed by frontend manipulation
   - Policy: "Authorized users can create projects"

```sql
CREATE POLICY "Authorized users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid())
    IN ('superintendent', 'project_manager', 'owner', 'admin')
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
```

---

## Prevention: Avoid This in Future

### For Development/Testing

Update the default role in the auto-creation trigger:

**File**: `migrations/044_enable_auto_user_creation.sql` (line 36)

```sql
-- Change from:
'field_employee',

-- To:
'superintendent',  -- or 'admin' for testing
```

### For Production

Keep `field_employee` as the default (most secure), but:

1. Create an admin user manually first
2. Have admins promote users via UI (future feature)
3. Or manually update roles via SQL for each new user

---

## Troubleshooting

### Issue: "User profile not found"

**Solution**: User record doesn't exist in `users` table
```sql
-- Create user record
INSERT INTO users (id, email, role, company_id, is_active)
VALUES (
  'YOUR_AUTH_USER_ID',
  'your-email@example.com',
  'superintendent',
  'YOUR_COMPANY_ID',
  true
);
```

### Issue: "No company assigned"

**Solution**: `company_id` is NULL
```sql
UPDATE users
SET company_id = 'YOUR_COMPANY_ID'
WHERE id = 'YOUR_USER_ID';
```

### Issue: Changes don't take effect

**Solutions**:
1. **Log out and back in** (session needs to refresh)
2. **Clear browser cache**
3. **Check Supabase logs** for RLS policy errors

### Issue: Still seeing "field_employee" after update

**Check**:
1. Did you update the correct user ID?
2. Did you log out and back in?
3. Is `AuthContext` fetching the profile correctly?

```sql
-- Verify the update actually worked
SELECT id, email, role, updated_at
FROM users
WHERE email = 'your-email@example.com';
```

---

## Files Modified

1. **`src/features/projects/hooks/useProjectsMutations.ts`**
   - Improved error message with guidance

2. **`src/stores/offline-store.ts`**
   - Added IndexedDB availability checks
   - Prevents repeated console errors

3. **`src/components/OfflineIndicator.tsx`**
   - Only polls when online
   - Reduces console noise

---

## Next Steps

1. Run the SQL queries above to update your user role
2. Log out and log back in
3. Try creating a project
4. If still seeing errors, check the Supabase logs for RLS policy issues

---

## Questions?

If you continue to have issues:

1. Check the browser console for the exact error
2. Check Supabase logs (Dashboard > Logs)
3. Verify your user record with the SQL queries above
4. Ensure you're logged in with the correct email
