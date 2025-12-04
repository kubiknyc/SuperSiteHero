# Login Issue Fix - Instructions

## Problem
Users can successfully sign in with Supabase Auth but get immediately logged out because their user profile doesn't exist in the `public.users` table.

## Root Cause
The `handle_new_user()` database trigger that auto-creates user profiles was commented out and never enabled.

## Solution
Run the migration file that enables automatic user profile creation:

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `migrations/044_enable_auto_user_creation.sql`
6. Click **Run** (or press Ctrl+Enter)
7. Check the results - you should see:
   - Trigger created successfully
   - User counts showing auth users and profile users match

### Option 2: Via Supabase CLI (if installed)
```bash
# Make sure you're in the project root
cd c:\Users\Eli\Documents\git

# Run the migration
supabase db push

# Or run directly
supabase db execute -f migrations/044_enable_auto_user_creation.sql
```

## What This Migration Does

1. **Creates the trigger function** (`handle_new_user`)
   - Automatically runs when someone signs up via Supabase Auth
   - Creates a profile record in `public.users` table
   - Extracts first_name and last_name from signup metadata
   - Assigns default role of 'field_employee'
   - Assigns user to the most recent company (or NULL if no companies exist)

2. **Enables the trigger** (`on_auth_user_created`)
   - Fires after INSERT on `auth.users` table
   - Calls `handle_new_user()` function

3. **Backfills existing users**
   - Finds any auth users without profiles
   - Creates profiles for them automatically
   - Logs which users were fixed

4. **Verification queries**
   - Shows trigger details
   - Shows user counts (auth vs profiles)
   - Shows if any profiles are still missing

## Testing After Migration

### Test 1: Verify Trigger is Active
Run this query in Supabase SQL Editor:
```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

You should see the trigger listed.

### Test 2: Check User Counts
```sql
SELECT
  (SELECT COUNT(*) FROM auth.users) AS auth_users,
  (SELECT COUNT(*) FROM public.users) AS profile_users,
  (SELECT COUNT(*) FROM auth.users au
   LEFT JOIN public.users pu ON au.id = pu.id
   WHERE pu.id IS NULL) AS missing_profiles;
```

All counts should match (missing_profiles should be 0).

### Test 3: Try Logging In
1. Go to http://localhost:5174/login (or wherever your app is running)
2. Try logging in with an existing account
3. You should be redirected to the dashboard successfully
4. Check browser console - no more "User profile not found" errors

### Test 4: Test New Signup
1. Go to http://localhost:5174/signup
2. Create a new account with:
   - First name: Test
   - Last name: User
   - Email: test@example.com
   - Password: (strong password)
3. After signup, check if user profile was created:
```sql
SELECT id, email, first_name, last_name, role, company_id
FROM public.users
WHERE email = 'test@example.com';
```

## Important Notes

### Company Assignment
The migration assigns users to the most recent company in the database. If you want different logic (e.g., users create their own companies on signup), you'll need to:

1. Update the signup flow to create a company first
2. Modify the trigger to use the company from signup metadata

### User Roles
Default role is `field_employee`. To change a user's role:
```sql
UPDATE users
SET role = 'superintendent'  -- or project_manager, office_admin, etc.
WHERE email = 'user@example.com';
```

### If No Companies Exist
Users will be created with `company_id = NULL`. You'll need to:
1. Create a company first:
```sql
INSERT INTO companies (name, type) VALUES ('My Company', 'general_contractor');
```

2. Assign users to it:
```sql
UPDATE users
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL;
```

## Rollback (if needed)
If something goes wrong, you can disable the trigger:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
```

## Next Steps After Fix

1. **Verify RLS policies** are working correctly for the `users` table
2. **Test all auth flows**: signup, login, logout, password reset
3. **Update signup form** if you want to capture company information
4. **Consider adding email verification** before allowing login
5. **Add proper error handling** for edge cases (no companies, etc.)
