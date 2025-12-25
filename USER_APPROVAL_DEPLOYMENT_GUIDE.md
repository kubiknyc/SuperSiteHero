# User Approval System - Deployment Guide

This guide walks you through deploying and testing the complete user approval system.

## ✅ What Was Completed

### 1. Database Migrations (Applied ✓)
- ✅ Migration 144: Approval system fields
- ✅ Migration 145: Signup trigger with approval workflow
- ✅ Migration 146: RLS policies for pending users

### 2. Edge Functions (Ready to Deploy)
- ✅ `approve-user` - Approves pending users
- ✅ `reject-user` - Rejects pending users with optional reason
- ✅ `get-pending-users` - Fetches all pending users

### 3. Frontend Components (Deployed ✓)
- ✅ API Service: `src/lib/api/services/user-approval.ts`
- ✅ React Hook: `src/features/user-management/hooks/usePendingUsers.ts`
- ✅ Admin UI: Updated `src/features/registration/AdminApprovalDashboard.tsx`
- ✅ Route: Already available at `/settings/user-approvals`

---

## 🚀 Deployment Steps

### Step 1: Deploy Edge Functions

You need to deploy the three Edge Functions to Supabase. First, log into Supabase CLI:

```bash
npx supabase login
```

Follow the prompts to authenticate.

Then deploy all three functions:

```bash
# Deploy approve-user function
npx supabase functions deploy approve-user

# Deploy reject-user function
npx supabase functions deploy reject-user

# Deploy get-pending-users function
npx supabase functions deploy get-pending-users
```

**Expected output for each:**
```
Deploying function approve-user...
Function deployed successfully!
Function URL: https://[your-project-ref].supabase.co/functions/v1/approve-user
```

### Step 2: Create Email Templates

The Edge Functions send email notifications to users when they are approved or rejected. You need to create these email templates.

#### Option A: Create Template Files

Create the following templates in `src/lib/email/templates/`:

**user-approved.ts:**
```typescript
import type { EmailTemplate } from '@/types/email';

export const userApprovedTemplate: EmailTemplate = {
  subject: 'Welcome to {{companyName}} - Your Access Has Been Approved!',
  html: `
    <h2>Welcome to {{companyName}}!</h2>
    <p>Hi {{recipientName}},</p>
    <p>Good news! {{adminName}} has approved your access request.</p>
    <p>You can now log in and start using the platform:</p>
    <p><a href="{{loginUrl}}" style="background-color: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Log In Now</a></p>
    <p>If you have any questions, please don't hesitate to reach out.</p>
    <p>Best regards,<br>The {{companyName}} Team</p>
  `,
};
```

**user-rejected.ts:**
```typescript
import type { EmailTemplate } from '@/types/email';

export const userRejectedTemplate: EmailTemplate = {
  subject: 'Update on Your {{companyName}} Access Request',
  html: `
    <h2>Access Request Update</h2>
    <p>Hi {{recipientName}},</p>
    <p>We wanted to inform you that your access request to join {{companyName}} was not approved at this time.</p>
    {{#if reason}}
    <p><strong>Reason:</strong> {{reason}}</p>
    {{/if}}
    <p>If you believe this is an error or have questions, please contact your company administrator.</p>
    <p>Best regards,<br>The {{companyName}} Team</p>
  `,
};
```

#### Option B: Use Existing send-email Function

If you already have a `send-email` Edge Function that handles templates, ensure it supports the `user-approved` and `user-rejected` template types.

### Step 3: Test the Workflow

#### Test Scenario 1: New Company Registration (Auto-Approve)

1. **Sign out** of the application
2. **Navigate to** `/signup`
3. **Register** with a new email using a unique company name
   ```
   Email: test@newcompany.com
   Company: New Test Company 2024
   ```
4. **Expected Result:**
   - User is automatically approved
   - `approval_status` = 'approved'
   - `is_active` = true
   - `role` = 'owner'
   - Can access the dashboard immediately

#### Test Scenario 2: Existing Company Registration (Pending Approval)

1. **Sign out** of the application
2. **Navigate to** `/signup`
3. **Register** with a new email using an existing company name
   ```
   Email: newuser@existingcompany.com
   Company: [Use same company name from Test 1]
   ```
4. **Expected Result:**
   - User is created with pending status
   - `approval_status` = 'pending'
   - `is_active` = false
   - `role` = 'field_employee'
   - Redirected to `/pending-approval` page

#### Test Scenario 3: Admin Approves User

1. **Log in** as the owner/admin from Test 1
2. **Navigate to** `/settings/user-approvals`
3. **Verify** you see the pending user from Test 2
4. **Click** the "Approve" button
5. **Expected Result:**
   - User is approved
   - User receives approval email
   - User can now log in
   - Pending list updates automatically

#### Test Scenario 4: Admin Rejects User

1. **Repeat** Test Scenario 2 with a different email
2. **Log in** as admin
3. **Navigate to** `/settings/user-approvals`
4. **Click** "Reject" button
5. **Enter** a rejection reason (optional)
6. **Confirm** rejection
7. **Expected Result:**
   - User is rejected
   - User receives rejection email with reason
   - User cannot log in
   - User removed from pending list

---

## 🔍 Verification Checklist

Use this checklist to verify everything is working:

### Database Verification

```sql
-- Check approval status enum
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status');
-- Expected: pending, approved, rejected

-- Check approval columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name LIKE '%approval%' OR column_name LIKE '%approved%' OR column_name LIKE '%rejected%';
-- Expected: approval_status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason

-- Check RLS policies
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
  AND policyname LIKE '%approval%';
-- Expected: Admins can update user approval, Admins can view company users

-- Verify existing users are approved
SELECT email, approval_status, is_active FROM users WHERE deleted_at IS NULL;
-- Expected: All existing users should have approval_status = 'approved' and is_active = true
```

### Edge Function Verification

```bash
# Test get-pending-users (requires authentication)
curl -X POST \
  https://[your-project-ref].supabase.co/functions/v1/get-pending-users \
  -H "Authorization: Bearer [your-jwt-token]" \
  -H "Content-Type: application/json"

# Expected: {"pendingUsers": [...]}
```

### Frontend Verification

1. ✅ Navigate to `/settings/user-approvals`
2. ✅ Page loads without errors
3. ✅ Shows "No pending users" if none exist
4. ✅ Real-time updates when users are approved/rejected
5. ✅ Toast notifications appear on success/error
6. ✅ Rejection dialog works correctly

---

## 🐛 Troubleshooting

### Edge Functions Not Deploying

**Error:** `Access token not provided`

**Solution:**
```bash
npx supabase login
```

### Users Not Appearing in Pending List

**Check:**
1. User has `approval_status = 'pending'`
2. User is in the same company as the admin
3. Edge Function is deployed
4. Check browser console for errors

**Debug Query:**
```sql
SELECT id, email, approval_status, is_active, company_id
FROM users
WHERE approval_status = 'pending' AND deleted_at IS NULL;
```

### Approval/Rejection Not Working

**Check:**
1. Edge Functions are deployed
2. Admin user has correct role (`owner` or `admin`)
3. Admin user has `is_active = true`
4. Check Supabase Edge Function logs

**View Logs:**
```bash
npx supabase functions logs approve-user
npx supabase functions logs reject-user
```

### Email Notifications Not Sending

**Check:**
1. `send-email` Edge Function exists and is deployed
2. Email templates are configured
3. SMTP settings are configured in Supabase
4. Check Edge Function logs for email errors

---

## 📝 Next Steps (Optional Enhancements)

### 1. Add User Approval Notifications

Create a real-time notification system that alerts admins when new users request approval:

```typescript
// In your admin dashboard component
useEffect(() => {
  const channel = supabase
    .channel('user-approvals')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'users',
        filter: 'approval_status=eq.pending',
      },
      (payload) => {
        // Show notification
        showToast({
          type: 'info',
          message: `New user approval request from ${payload.new.email}`,
        });
        // Refetch pending users
        queryClient.invalidateQueries(['pending-users']);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### 2. Add Approval History Log

Track all approval/rejection actions in a separate table:

```sql
CREATE TABLE user_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'approved', 'rejected'
  performed_by UUID REFERENCES users(id) NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Add Email Notifications for Admins

Notify admins when new users request approval:

```typescript
// In the signup trigger function
if (company_exists) {
  // Send notification to company admins
  const { data: admins } = await supabaseClient
    .from('users')
    .select('email')
    .eq('company_id', default_company_id)
    .in('role', ['owner', 'admin'])
    .eq('is_active', true);

  for (const admin of admins || []) {
    await supabaseClient.functions.invoke('send-email', {
      body: {
        to: admin.email,
        template: 'user-pending-approval',
        data: { /* ... */ },
      },
    });
  }
}
```

---

## 🎯 Summary

You now have a complete user approval system with:

- ✅ Automatic approval for new company owners
- ✅ Manual approval required for joining existing companies
- ✅ Admin dashboard at `/settings/user-approvals`
- ✅ Email notifications for approved/rejected users
- ✅ Secure RLS policies preventing unauthorized access
- ✅ Real-time updates in the admin UI

The system is production-ready after deploying the Edge Functions and configuring email templates!
