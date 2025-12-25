# User Approval System - Deployment Guide

## Overview

This guide will walk you through deploying the user approval system to your Supabase project. The system is ready to deploy - we just need to apply the database migrations and deploy the edge functions.

## Prerequisites

✅ Supabase project created
✅ Migrations 144-146 created locally
✅ Edge functions created with inline email templates
✅ Migration history conflicts resolved

## Deployment Steps

### Step 1: Apply Database Migrations

You have two options for applying the migrations:

#### **Option A: Quick Deploy via SQL Editor (Recommended)**

This is the fastest way to deploy all three migrations at once.

1. **Open Supabase SQL Editor**
   - Go to your [Supabase Dashboard](https://app.supabase.com/project/_/sql)
   - Click on "SQL Editor" in the left sidebar

2. **Copy Combined Migration Script**
   - Open the file: `apply-approval-system-migrations.sql`
   - Copy all contents (Ctrl+A, Ctrl+C)

3. **Execute Migration**
   - Paste into SQL Editor
   - Click "Run" or press Ctrl+Enter
   - Wait for completion

4. **Verify Success**
   You should see NOTICE messages indicating:
   ```
   Migration 144 completed: Added approval system fields
   Migration 145 completed: Updated signup trigger with approval workflow
   Migration 146 completed: Updated RLS policies for pending users
   ALL MIGRATIONS COMPLETED SUCCESSFULLY
   Approval status enum values: 3
   Approval columns added: 6
   RLS policies updated: [count]
   ```

#### **Option B: CLI Deployment**

If you prefer using the command line:

1. **Get Access Token**
   - Go to [Supabase Account → Access Tokens](https://app.supabase.com/account/tokens)
   - Click "Generate New Token"
   - Copy the token

2. **Set Environment Variable**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN="your-token-here"
   ```

3. **Push Migrations**
   ```powershell
   npx supabase db push --include-all
   ```

---

### Step 2: Deploy Edge Functions

1. **Ensure Token is Set** (from Step 1B)
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN="your-token-here"
   ```

2. **Deploy All Three Functions**
   ```powershell
   npx supabase functions deploy get-pending-users
   npx supabase functions deploy approve-user
   npx supabase functions deploy reject-user
   ```

3. **Verify Deployment**
   - Go to [Supabase Dashboard → Edge Functions](https://app.supabase.com/project/_/functions)
   - You should see all three functions listed:
     - ✅ `get-pending-users`
     - ✅ `approve-user`
     - ✅ `reject-user`

---

### Step 3: Verify Database Schema

Run this verification query in SQL Editor:

```sql
-- Check enum type exists
SELECT enumlabel as approval_status_values
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status')
ORDER BY enumsortorder;
-- Expected: pending, approved, rejected

-- Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason')
ORDER BY ordinal_position;
-- Expected: 6 rows

-- Check helper function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'is_active_user';
-- Expected: is_active_user

-- Check trigger is updated
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
-- Expected: on_auth_user_created | users
```

**Expected Results:**
- ✅ 3 enum values (pending, approved, rejected)
- ✅ 6 new columns in users table
- ✅ is_active_user() helper function exists
- ✅ on_auth_user_created trigger exists

---

### Step 4: Test the Approval Workflow

#### Test 1: New Company Registration (Immediate Approval)

1. **Register with a New Company**
   - Use signup form with a unique company name
   - Example: "Test Company XYZ"

2. **Verify in Database**
   ```sql
   SELECT id, email, company_id, role, is_active, approval_status, approved_at
   FROM users
   WHERE email = 'your-test-email@example.com';
   ```

3. **Expected Results:**
   - `role` = `'owner'`
   - `is_active` = `true`
   - `approval_status` = `'approved'`
   - `approved_at` is set
   - `approved_by` = user's own id
   - User can access dashboard immediately

#### Test 2: Existing Company Registration (Requires Approval)

1. **Register with Existing Company**
   - Use signup form with existing company name (from Test 1)
   - Use different email address

2. **Verify in Database**
   ```sql
   SELECT id, email, company_id, role, is_active, approval_status
   FROM users
   WHERE email = 'second-user@example.com';
   ```

3. **Expected Results:**
   - `role` = `'field_employee'`
   - `is_active` = `false`
   - `approval_status` = `'pending'`
   - `approved_at` is `null`
   - User sees "Pending Approval" screen (when frontend is connected)

#### Test 3: Admin Approval via Edge Functions

1. **Get Admin JWT Token**
   - Log in as the owner/admin from Test 1
   - Open browser DevTools → Console
   - Run: `await supabase.auth.getSession()`
   - Copy the `access_token`

2. **Get Pending User ID**
   ```sql
   SELECT id, email FROM users WHERE approval_status = 'pending' LIMIT 1;
   ```

3. **Test get-pending-users**
   ```powershell
   $authToken = "your-admin-jwt-token"
   $supabaseUrl = "https://your-project.supabase.co"

   curl -X POST `
     -H "Authorization: Bearer $authToken" `
     -H "Content-Type: application/json" `
     "$supabaseUrl/functions/v1/get-pending-users"
   ```

   Expected: JSON with pending users array

4. **Test approve-user**
   ```powershell
   $userId = "pending-user-id-from-step-2"

   curl -X POST `
     -H "Authorization: Bearer $authToken" `
     -H "Content-Type: application/json" `
     -d "{`"userId`":`"$userId`"}" `
     "$supabaseUrl/functions/v1/approve-user"
   ```

   Expected: `{"success": true, "message": "User approved successfully"}`

5. **Verify Approval in Database**
   ```sql
   SELECT is_active, approval_status, approved_at, approved_by
   FROM users
   WHERE id = 'pending-user-id';
   ```

   Expected:
   - `is_active` = `true`
   - `approval_status` = `'approved'`
   - `approved_at` is set
   - `approved_by` = admin's user id

6. **Check Email Sent**
   - User should receive approval email with:
     - Welcome message
     - Login link
     - Access details
     - JobSight branding

#### Test 4: Admin Rejection

1. **Create another pending user** (repeat Test 2 with different email)

2. **Test reject-user**
   ```powershell
   $userId = "new-pending-user-id"

   curl -X POST `
     -H "Authorization: Bearer $authToken" `
     -H "Content-Type: application/json" `
     -d "{`"userId`":`"$userId`",`"reason`":`"Test rejection`"}" `
     "$supabaseUrl/functions/v1/reject-user"
   ```

   Expected: `{"success": true, "message": "User rejected successfully"}`

3. **Verify Rejection in Database**
   ```sql
   SELECT is_active, approval_status, rejected_at, rejected_by, rejection_reason
   FROM users
   WHERE id = 'pending-user-id';
   ```

   Expected:
   - `is_active` = `false`
   - `approval_status` = `'rejected'`
   - `rejected_at` is set
   - `rejected_by` = admin's user id
   - `rejection_reason` = `'Test rejection'`

4. **Check Email Sent**
   - User should receive rejection email with:
     - Notification of rejection
     - Reason (if provided)
     - Next steps
     - Support contact info

---

### Step 5: Test RLS Policies

#### As Pending User

Get JWT for pending user and test:

```sql
-- Should succeed (view own profile)
SELECT * FROM users WHERE id = auth.uid();

-- Should succeed (view own company)
SELECT * FROM companies
WHERE id = (SELECT company_id FROM users WHERE id = auth.uid());

-- Should fail (create project) - RLS policy violation expected
INSERT INTO projects (name, company_id)
VALUES ('Test', 'company-id-here');
```

#### As Admin User

```sql
-- Should succeed (view pending users)
SELECT * FROM users
WHERE company_id = 'your-company-id'
  AND approval_status = 'pending';

-- Should succeed (update approval status)
UPDATE users
SET approval_status = 'approved', is_active = true
WHERE id = 'pending-user-id';
```

---

## Verification Checklist

Use this checklist to confirm everything is working:

### Database
- [ ] Migration 144 applied (enum type and columns exist)
- [ ] Migration 145 applied (trigger updated)
- [ ] Migration 146 applied (RLS policies updated)
- [ ] Existing users have `approval_status='approved'`
- [ ] New company signup creates approved owner
- [ ] Existing company signup creates pending field_employee
- [ ] Company name matching is case-insensitive

### Edge Functions
- [ ] get-pending-users deployed and working
- [ ] approve-user deployed and working
- [ ] reject-user deployed and working
- [ ] Email sent on approval
- [ ] Email sent on rejection
- [ ] Emails have correct branding and content

### Security (RLS)
- [ ] Pending users can view own profile
- [ ] Pending users can view own company
- [ ] Pending users cannot create projects
- [ ] Pending users cannot create reports
- [ ] Admins can view pending users in their company
- [ ] Admins can approve/reject users in their company
- [ ] Cross-company approval blocked

---

## Rollback Plan

If you need to rollback the changes:

### Rollback Database

```sql
-- Drop new policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view company users" ON users;
DROP POLICY IF EXISTS "Admins can update user approval" ON users;
-- ... (drop other policies)

-- Drop helper function
DROP FUNCTION IF EXISTS public.is_active_user();

-- Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Remove columns
ALTER TABLE users
  DROP COLUMN IF EXISTS approval_status,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS rejected_by,
  DROP COLUMN IF EXISTS rejected_at,
  DROP COLUMN IF EXISTS rejection_reason;

-- Drop enum type
DROP TYPE IF EXISTS approval_status;

-- Mark migrations as reverted
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN ('144', '145', '146');
```

### Rollback Edge Functions

Delete the functions from Supabase Dashboard or use CLI:

```powershell
npx supabase functions delete get-pending-users
npx supabase functions delete approve-user
npx supabase functions delete reject-user
```

---

## Next Steps After Testing

Once testing is complete and the approval system is working:

1. **Phase 4: Frontend Integration**
   - Update CompanyRegistration.tsx
   - Update PendingApproval.tsx
   - Update AdminApprovalDashboard.tsx
   - Update AuthContext.tsx
   - Update ProtectedRoute.tsx
   - Update App.tsx routing

2. **Phase 5: Email Notifications**
   - Create on-user-created edge function (optional)
   - Set up database webhook (optional)
   - Update notification service (optional)

3. **Production Deployment**
   - Test in staging environment
   - Update production database
   - Deploy edge functions to production
   - Monitor for issues

---

## Troubleshooting

### Migration Issues

**Problem**: Duplicate key violation in schema_migrations
**Solution**: The migration already exists. Check with:
```sql
SELECT * FROM supabase_migrations.schema_migrations WHERE version IN ('144', '145', '146');
```

**Problem**: Enum already exists
**Solution**: Drop and recreate:
```sql
DROP TYPE IF EXISTS approval_status CASCADE;
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
```

### Edge Function Issues

**Problem**: Function deployment fails with auth error
**Solution**: Ensure `SUPABASE_ACCESS_TOKEN` is set correctly

**Problem**: Email not sending
**Solution**: Check send-email function is deployed and Resend API key is configured

### RLS Issues

**Problem**: Pending users can access resources
**Solution**: Verify `is_active = TRUE` checks exist in policies

**Problem**: Admin can't see pending users
**Solution**: Verify admin has `is_active = TRUE` and role is 'admin' or 'owner'

---

## Support

If you encounter any issues:

1. Check the detailed status document: `APPROVAL_SYSTEM_IMPLEMENTATION_STATUS.md`
2. Review the implementation plan: `.claude/plans/typed-drifting-pizza.md`
3. Check Supabase logs in Dashboard → Logs
4. Verify migrations with: `npx supabase migration list`

---

## Summary

You've successfully implemented:
- ✅ Database schema with approval status tracking
- ✅ Signup trigger with company-based approval flow
- ✅ RLS policies for pending user restrictions
- ✅ Edge functions for admin approval/rejection
- ✅ Email notifications with professional templates

The system is ready to deploy and test!
