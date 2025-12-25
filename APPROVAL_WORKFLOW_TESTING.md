# User Approval Workflow Testing Guide

This guide explains how to test the company-based user registration with admin approval system.

## Quick Start

### Prerequisites
- Node.js installed
- Supabase project configured
- Environment variables set (`.env` file)

### Required Environment Variables
```bash
# Required for all tests
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Required for E2E and email tests
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required for email notifications (Supabase secrets)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=YourApp <noreply@yourdomain.com>
APP_URL=https://yourdomain.com
```

## Available Test Scripts

### 1. Database Schema Verification
**Script:** `scripts/test-approval-workflow.mjs`
**Purpose:** Verifies database structure and configuration
**Usage:**
```bash
node scripts/test-approval-workflow.mjs
```

**Tests:**
- ✓ Trigger function exists and has approval logic
- ✓ Helper functions configured
- ✓ Approval status enum values
- ✓ Check constraints active
- ✓ User approval statuses in database
- ✓ RLS policies configured
- ✓ Performance indexes created

### 2. End-to-End Workflow Test
**Script:** `scripts/test-registration-workflow.mjs`
**Purpose:** Complete user registration and approval flow
**Usage:**
```bash
# Requires SUPABASE_SERVICE_ROLE_KEY
node scripts/test-registration-workflow.mjs
```

**Tests:**
1. **New Company Registration**
   - Creates user with new company name
   - Verifies user becomes owner
   - Verifies immediate approval
   - Verifies user is active
   - Verifies company created

2. **Existing Company Registration**
   - Creates user with existing company name
   - Verifies user enters pending state
   - Verifies user is inactive
   - Verifies assigned to correct company
   - Verifies role set to field_employee

3. **Admin Approval Workflow**
   - Signs in as owner
   - Fetches pending users
   - Approves pending user
   - Verifies approval metadata
   - Verifies user becomes active

4. **Admin Rejection Workflow**
   - Resets user to pending
   - Rejects user with reason
   - Verifies rejection metadata
   - Verifies rejection reason saved

### 3. Email Notification Tests
**Script:** `scripts/test-email-notifications.mjs`
**Purpose:** Tests email sending for approvals and rejections
**Usage:**
```bash
# Requires SUPABASE_SERVICE_ROLE_KEY and Resend API configured
node scripts/test-email-notifications.mjs
```

**Tests:**
- ✓ Approval email sent and user database updated
- ✓ Rejection email sent with reason
- ✓ Email service integration working

**Email Templates Tested:**
- Welcome/approval email (with login link)
- Rejection email (with optional reason)

## Test Execution Order

For first-time setup verification:

```bash
# 1. Verify database schema
node scripts/test-approval-workflow.mjs

# 2. Test end-to-end workflow
node scripts/test-registration-workflow.mjs

# 3. Test email notifications (requires Resend API)
node scripts/test-email-notifications.mjs
```

## Manual Testing Checklist

### Frontend Testing

#### 1. New Company Registration Flow
- [ ] Navigate to `/register`
- [ ] Select "Create New Company"
- [ ] Enter company name (e.g., "Acme Construction")
- [ ] Enter user details
- [ ] Submit registration
- [ ] Verify redirect to `/dashboard` (immediate access)
- [ ] Verify user role is "owner"
- [ ] Verify company appears in database

#### 2. Existing Company Registration Flow
- [ ] Navigate to `/register`
- [ ] Select "Join Existing Company"
- [ ] Search for existing company
- [ ] Select company from list
- [ ] Enter user details
- [ ] Submit registration
- [ ] Verify redirect to `/pending-approval`
- [ ] Verify message displays correct company name
- [ ] Verify logout button works

#### 3. Pending Approval Page
- [ ] As pending user, log in
- [ ] Verify redirect to `/pending-approval`
- [ ] Verify cannot access other routes
- [ ] Wait 30 seconds, verify auto-refresh
- [ ] Have admin approve user
- [ ] Verify auto-redirect to dashboard after approval

#### 4. Admin Approval Dashboard
- [ ] Log in as admin/owner
- [ ] Navigate to `/settings/user-approvals`
- [ ] Verify pending users list loads
- [ ] Click "Approve" on a user
- [ ] Verify user disappears from list
- [ ] Verify success message
- [ ] Click "Reject" with reason
- [ ] Verify user disappears from list
- [ ] Verify rejection reason saved

### Protected Route Testing

#### 1. Unauthenticated Access
- [ ] Navigate to `/dashboard` without login → Redirect to `/login`
- [ ] Navigate to `/pending-approval` without login → Redirect to `/login`

#### 2. Pending User Access
- [ ] As pending user, navigate to `/dashboard` → Redirect to `/pending-approval`
- [ ] As pending user, navigate to `/projects` → Redirect to `/pending-approval`
- [ ] As pending user, access `/pending-approval` → Allow access

#### 3. Approved User Access
- [ ] As approved user, navigate to `/dashboard` → Allow access
- [ ] As approved user, navigate to `/pending-approval` → Allow access (don't block)

### Email Notification Testing

#### 1. Verify Email Configuration
```bash
# Check Supabase secrets
npx supabase secrets list

# Should show:
# - RESEND_API_KEY
# - EMAIL_FROM
```

#### 2. Test Approval Email
- [ ] Admin approves pending user
- [ ] Check user's email inbox
- [ ] Verify email received with:
  - [ ] JobSight branding
  - [ ] Welcome message
  - [ ] Company name
  - [ ] Login link
  - [ ] Admin name who approved
  - [ ] Feature list
- [ ] Click login link, verify works

#### 3. Test Rejection Email
- [ ] Admin rejects pending user with reason
- [ ] Check user's email inbox
- [ ] Verify email received with:
  - [ ] JobSight branding
  - [ ] Respectful rejection message
  - [ ] Company name
  - [ ] Optional rejection reason
  - [ ] Support contact info
- [ ] Verify reason displays correctly

## Common Issues & Solutions

### Issue: Type check runs out of memory
**Solution:** Skip full type check or run in separate terminal with increased memory:
```bash
export NODE_OPTIONS="--max-old-space-size=8192"
npm run type-check
```

### Issue: Edge functions not found
**Solution:** Deploy edge functions:
```bash
npx supabase functions deploy get-pending-users
npx supabase functions deploy approve-user
npx supabase functions deploy reject-user
```

### Issue: Emails not sending
**Solutions:**
1. Verify Resend API key in Supabase secrets
2. Verify EMAIL_FROM is configured
3. Check edge function logs:
   ```bash
   npx supabase functions logs approve-user --limit 10
   npx supabase functions logs reject-user --limit 10
   npx supabase functions logs send-email --limit 10
   ```

### Issue: RLS policies blocking access
**Solution:** Verify you're using service role key for admin operations:
```bash
# Check your .env file has:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Issue: Test users already exist
**Solution:** Clean up test data:
```sql
-- Delete test users
DELETE FROM auth.users WHERE email LIKE '%@example.com';

-- Delete test companies
DELETE FROM companies WHERE name LIKE 'Test Company%';
```

## Success Criteria

All tests should pass with these results:

✅ **Database Tests**
- All 7 database schema tests pass
- Trigger function has approval logic
- RLS policies configured correctly

✅ **E2E Tests**
- Test 1: New company registration → Owner with immediate access
- Test 2: Existing company registration → Pending state
- Test 3: Admin approval → User becomes active
- Test 4: Admin rejection → User rejected with reason

✅ **Email Tests**
- Approval email sent successfully
- Rejection email sent successfully
- Database updated correctly for both

✅ **Frontend Tests**
- Registration flow works for both scenarios
- Pending users see correct page
- Auto-refresh detects approval
- Admin dashboard shows pending users
- Approve/reject actions work

## Next Steps After Testing

1. **Production Deployment**
   - Deploy all edge functions to production
   - Configure Resend API in production Supabase
   - Test with real email addresses
   - Monitor edge function logs

2. **User Acceptance Testing**
   - Have stakeholders test registration flow
   - Verify email delivery to real inboxes
   - Test on multiple devices/browsers
   - Verify mobile experience

3. **Monitoring**
   - Set up alerts for failed approvals
   - Monitor edge function errors
   - Track email delivery rates
   - Monitor pending user metrics

## Support

If you encounter issues:
1. Check the [EMAIL_CONFIGURATION_GUIDE.md](./EMAIL_CONFIGURATION_GUIDE.md)
2. Review edge function logs
3. Verify environment variables
4. Check database triggers and RLS policies
