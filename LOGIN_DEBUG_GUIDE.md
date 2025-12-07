# Login Debug Guide

## Problem: "Invalid credentials" error after registration

This issue typically occurs due to one of these reasons:

### 1. **Email Confirmation Required** (Most Common)

Supabase requires email verification by default. After registration, users must:
1. Check their email inbox
2. Click the verification link
3. Only then can they log in

**Quick Fix:**
Disable email confirmation in Supabase (for development):
1. Go to your Supabase Dashboard → Authentication → Providers
2. Scroll to "Email" provider settings
3. **Disable** "Confirm email"
4. Save changes

**OR** check the user's email and click the verification link before attempting login.

---

### 2. **Missing User Profile in Database**

The app requires a user profile in `public.users` table, but Supabase only creates auth records in `auth.users`.

**Check if migration 044 is applied:**
Run this query in Supabase SQL Editor:
```sql
-- Check if the trigger exists
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check user counts
SELECT
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM public.users) AS profile_users_count,
  (SELECT COUNT(*) FROM auth.users au
   LEFT JOIN public.users pu ON au.id = pu.id
   WHERE pu.id IS NULL) AS missing_profiles_count;
```

**If trigger doesn't exist:**
Apply migration 044:
```bash
# Navigate to migrations folder
cd migrations

# Copy and paste the contents of 044_enable_auto_user_creation.sql
# into Supabase SQL Editor and run it
```

**If trigger exists but profiles are missing:**
The trigger creates profiles automatically, but if signup happened before the trigger was created, you need to backfill. The migration has a backfill script - run it manually in SQL Editor.

---

### 3. **No Company Exists**

The trigger assigns users to a company, but if NO companies exist in the database, the user profile gets `company_id = NULL`, which might cause issues.

**Quick Fix:**
Create a default company:
```sql
INSERT INTO public.companies (name, address, phone)
VALUES ('Default Company', '123 Main St', '555-0100')
RETURNING id;
```

Then backfill existing users:
```sql
UPDATE public.users
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL;
```

---

### 4. **Password Doesn't Meet Requirements**

The signup form requires:
- At least 8 characters
- 1 uppercase letter
- 1 lowercase letter
- 1 number
- 1 special character (!@#$%^&*(),.?":{}|<>)

**Check**: Did you meet all password requirements during signup?

---

### 5. **Supabase Auth Session Issues**

Sometimes stale sessions cause issues.

**Quick Fix:**
```javascript
// Open browser console on login page and run:
localStorage.clear()
sessionStorage.clear()
// Then reload page and try again
```

---

## Debugging Steps (In Order)

1. **Check Supabase Auth Settings**
   - Dashboard → Authentication → Providers → Email
   - Ensure "Confirm email" is disabled (for dev)
   - OR check your email for verification link

2. **Verify Migration 044 Applied**
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE trigger_name = 'on_auth_user_created';
   ```
   If empty, apply migration 044

3. **Check if User Profile Exists**
   ```sql
   SELECT au.id, au.email, au.email_confirmed_at, pu.id as profile_id
   FROM auth.users au
   LEFT JOIN public.users pu ON au.id = pu.id
   ORDER BY au.created_at DESC;
   ```
   Look for your email - if `profile_id` is NULL, the profile wasn't created

4. **Check Company Exists**
   ```sql
   SELECT COUNT(*) FROM companies;
   ```
   If 0, create a company first (see fix #3 above)

5. **Try Fresh Signup**
   - Clear browser data (localStorage, cookies)
   - Sign up with a NEW email
   - Check if that user can log in immediately

---

## Manual Fix: Create User Profile

If you already have an auth user but no profile:

```sql
-- Get your auth user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Create profile manually (replace the UUID with your auth user ID)
INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  company_id,
  role,
  is_active
)
VALUES (
  'YOUR_AUTH_USER_ID_HERE',  -- From query above
  'your-email@example.com',
  'Your',
  'Name',
  (SELECT id FROM companies LIMIT 1),  -- Gets first company
  'superintendent',  -- or 'project_manager', 'field_employee', etc.
  true
);
```

---

## Expected Behavior After Fix

1. User signs up → Trigger creates profile in `public.users` automatically
2. If email confirmation disabled: User can log in immediately
3. If email confirmation enabled: User clicks email link, then logs in
4. After login: `AuthContext` fetches user profile and session works properly

---

## Still Having Issues?

Check the browser console for errors:
1. Open DevTools (F12)
2. Go to Console tab
3. Try logging in
4. Look for errors related to:
   - "Failed to fetch user profile"
   - "User profile not found in database"
   - Network errors (400, 401, 403, 500)

Check Network tab:
1. DevTools → Network tab
2. Try logging in
3. Look for the `signInWithPassword` request
4. Check the response - it will tell you the exact error from Supabase
