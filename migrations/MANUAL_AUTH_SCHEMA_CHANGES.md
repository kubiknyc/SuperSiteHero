# Manual Auth Schema Changes

## ⚠️ IMPORTANT: These changes MUST be run manually

The `auth` schema is protected in Supabase. These SQL statements cannot be executed via the API and must be run directly in the Supabase Dashboard.

## How to Apply

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a **New Query**
4. Copy and paste the SQL below
5. Click **Run** (or press Ctrl/Cmd + Enter)

## SQL to Execute

```sql
-- =====================================================
-- Auth Schema Functions (MANUAL EXECUTION REQUIRED)
-- =====================================================

-- Example: Function to handle user creation hooks
-- (Replace with your actual function needs)

CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_company uuid;
BEGIN
  -- Get user metadata from public schema
  SELECT role, company_id INTO user_role, user_company
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;

  -- Add custom claims to JWT
  event := jsonb_set(
    event,
    '{claims,user_role}',
    to_jsonb(user_role)
  );

  event := jsonb_set(
    event,
    '{claims,company_id}',
    to_jsonb(user_company)
  );

  RETURN event;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO supabase_auth_admin;
```

## Verification

After running the SQL, verify the function exists:

```sql
SELECT routine_name, routine_schema
FROM information_schema.routines
WHERE routine_schema = 'auth'
AND routine_name LIKE '%custom%';
```

## Alternative Approach

Consider using **Database Webhooks** or **Edge Functions** instead of auth schema functions:
- Database Webhooks: For responding to auth events
- Edge Functions: For custom auth logic
- Public schema functions: For helper utilities (see `create_auth_helpers.sql`)

## Need Help?

If you're unsure what auth schema changes you need, most use cases can be solved with:
1. RLS policies in the `public` schema
2. Helper functions in the `public` schema
3. Supabase Auth Hooks (configured in Dashboard > Authentication > Hooks)
