# Auth Schema Access - Complete Solution

## ❌ The Problem

When trying to query `auth.users` in Supabase SQL Editor, you get:
```
ERROR: 42501: must be owner of schema auth
```

This happens because:
1. The `auth` schema is owned by the `supabase_auth_admin` role
2. Even the `postgres` role cannot modify auth schema permissions
3. This is intentional Supabase security design

## ✅ The Solution

**Don't query `auth.users` directly in SQL. Use the Supabase Admin API instead.**

### Method 1: Use Supabase Admin API (Recommended)

**For JavaScript/TypeScript:**

```typescript
import { createClient } from '@supabase/supabase-js'

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// List all users
const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

// Get specific user
const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId)

// Update user
await supabaseAdmin.auth.admin.updateUserById(userId, { email: 'new@email.com' })

// Delete user
await supabaseAdmin.auth.admin.deleteUser(userId)
```

**Quick Script:**
```bash
node scripts/query-auth-via-api.mjs
```

### Method 2: Query Your Public Users Table

Your `public.users` table already references `auth.users`, so query that instead:

```sql
-- ✅ This works in SQL Editor
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.company_id,
  u.created_at
FROM public.users u
ORDER BY u.created_at DESC;

-- Get user with email from your app's users table
SELECT * FROM public.users WHERE email = 'user@example.com';
```

### Method 3: Create a Secure View (For Read-Only Access)

If you absolutely need SQL access, create a view in the `public` schema:

```sql
-- Create a view that exposes safe auth data
CREATE OR REPLACE VIEW public.auth_users_view AS
SELECT
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
FROM auth.users;

-- Grant access to the view
GRANT SELECT ON public.auth_users_view TO authenticated, service_role;

-- Now you can query:
SELECT * FROM public.auth_users_view;
```

**Note:** This view creation requires superuser access or contact Supabase support.

### Method 4: Use Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/auth/users
2. View all users in the Authentication > Users page
3. Click on any user to see details
4. Perform user management operations through the UI

## 🎯 Current Status

✅ **Your auth users are accessible via:**
- ✅ Supabase Admin API (working - see script output above)
- ✅ Supabase Dashboard UI
- ✅ Your `public.users` table

## 📝 Helper Scripts

### List All Auth Users
```bash
node scripts/query-auth-via-api.mjs
```

### Query Public Users
```sql
SELECT * FROM public.users;
```

## 🔒 Why This Security Exists

Supabase restricts direct `auth` schema access to:
1. Prevent accidental data corruption
2. Ensure audit logs are maintained
3. Enforce proper authentication flows
4. Protect sensitive user data

The Admin API provides safe, audited access to auth data.

## 💡 Best Practices

1. **Use Admin API** for programmatic auth user access
2. **Use Dashboard** for manual user management
3. **Query public.users** for application-level user data
4. **Never expose service role key** to client-side code
5. **Use RLS policies** with `auth.uid()` for user-specific queries

## ✅ Summary

You cannot directly query `auth.users` in SQL Editor due to ownership restrictions.

**Solution:** Use the Supabase Admin API (`supabase.auth.admin.*` methods) which I've demonstrated works perfectly with your 2 existing users.
