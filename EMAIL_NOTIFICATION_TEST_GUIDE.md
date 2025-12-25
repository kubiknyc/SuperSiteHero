# Email Notification Testing Guide

## Current Test Setup

### Test User Created
- **User ID**: `793d4755-559b-4e2e-b215-dd739b8fd20a`
- **Email**: `browser-test-1766128036597@example.com`
- **Name**: Eli Vidyaev
- **Status**: Set to `pending` for testing
- **Company**: Default Company

### What's Been Deployed
✅ **approve-user** Edge Function (v2) - ACTIVE
- Generates professional HTML approval email
- Includes welcome message and login link
- Sends plain text fallback

✅ **reject-user** Edge Function (v2) - ACTIVE
- Generates HTML rejection email
- Supports optional rejection reason
- Sends plain text fallback

## Testing Prerequisites

⚠️ **Admin User Required**: The Edge Functions require an admin or owner role to execute.

### Option 1: Promote Existing User to Admin (Recommended for Testing)

```sql
-- Temporarily promote a user to admin for testing
UPDATE users
SET role = 'admin'
WHERE email = 'evidyaev@gdc.nyc';
```

### Option 2: Manual Testing via UI

1. Log in as an admin user at `/settings/user-approvals`
2. The pending user should appear in the dashboard
3. Click "Approve" or "Reject" to trigger email notifications

## Automated Testing Script

```bash
#!/bin/bash

# Email Notification Test Script
# Requires: Admin user credentials

echo "Email Notification Test"
echo "======================="

# Get your auth token by logging in and checking browser DevTools > Application > Local Storage
# Look for the supabase auth token
AUTH_TOKEN="YOUR_JWT_TOKEN_HERE"
SUPABASE_URL="YOUR_SUPABASE_URL"
TEST_USER_ID="793d4755-559b-4e2e-b215-dd739b8fd20a"

# Test 1: Approval Email
echo -e "\n✅ Testing Approval Email..."
curl -X POST "${SUPABASE_URL}/functions/v1/approve-user" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"${TEST_USER_ID}\"}"

# Wait for email to process
sleep 3

# Check if email was sent successfully
echo -e "\n📧 Check the test email inbox for: browser-test-1766128036597@example.com"

# Test 2: Reset for Rejection Test
echo -e "\n🔄 Resetting user to pending for rejection test..."
# You'll need to run SQL to reset the user to pending again

# Test 3: Rejection Email with Reason
echo -e "\n❌ Testing Rejection Email..."
curl -X POST "${SUPABASE_URL}/functions/v1/reject-user" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"${TEST_USER_ID}\",
    \"reason\": \"This is a test rejection. Please contact HR to verify your employment status.\"
  }"

echo -e "\n✅ Test complete! Check logs and email inbox."
```

## Manual Testing Steps

### Test Approval Email

1. **Prepare Admin Access**:
   ```sql
   -- Promote user to admin if needed
   UPDATE users SET role = 'admin' WHERE email = 'evidyaev@gdc.nyc';
   ```

2. **Access Admin Dashboard**:
   - Navigate to `/settings/user-approvals`
   - Log in as admin user

3. **Approve Test User**:
   - Find the pending user: `browser-test-1766128036597@example.com`
   - Click "Approve" button
   - Email should be sent immediately

4. **Verify Email Sent**:
   ```sql
   -- Check user was approved
   SELECT
     approval_status,
     approved_by,
     approved_at,
     is_active
   FROM users
   WHERE id = '793d4755-559b-4e2e-b215-dd739b8fd20a';
   ```

5. **Check Edge Function Logs**:
   ```bash
   npx supabase functions logs approve-user --tail
   ```

### Test Rejection Email

1. **Reset User to Pending**:
   ```sql
   UPDATE users
   SET
     approval_status = 'pending',
     is_active = false,
     approved_by = NULL,
     approved_at = NULL,
     rejected_by = NULL,
     rejected_at = NULL,
     rejection_reason = NULL
   WHERE id = '793d4755-559b-4e2e-b215-dd739b8fd20a';
   ```

2. **Reject with Reason**:
   - Access `/settings/user-approvals`
   - Click "Reject" on the test user
   - Enter rejection reason: "Test rejection - please contact HR for verification"
   - Confirm rejection

3. **Verify Rejection**:
   ```sql
   SELECT
     approval_status,
     rejected_by,
     rejected_at,
     rejection_reason,
     is_active
   FROM users
   WHERE id = '793d4755-559b-4e2e-b215-dd739b8fd20a';
   ```

## Email Template Verification

### Approval Email Should Contain:
- ✉️ Subject: "Access Approved - Welcome to Default Company"
- 🎨 JobSight branded header (blue background)
- ✅ Green success box with "Your access request has been approved!"
- 📝 Personalized welcome message
- 🔗 Login button/link
- 📋 List of features they can now access

### Rejection Email Should Contain:
- ✉️ Subject: "Access Request Update - Default Company"
- 🎨 JobSight branded header
- ❌ Notification of rejection
- 📝 Rejection reason (if provided)
- 💡 Next steps and support contact info
- 📧 Support email: support@jobsightapp.com

## Checking Logs

### View Edge Function Logs:
```bash
# Approval function logs
npx supabase functions logs approve-user --limit 10

# Rejection function logs
npx supabase functions logs reject-user --limit 10

# Send-email function logs
npx supabase functions logs send-email --limit 10
```

### Expected Log Entries:
- User profile retrieved successfully
- Company information fetched
- Email content generated
- send-email function invoked
- User status updated in database

## Cleanup After Testing

```sql
-- Option 1: Restore user to approved status
UPDATE users
SET
  approval_status = 'approved',
  is_active = true,
  approved_by = '3895c065-36a2-4f2d-9bee-759f1ca039bf',
  approved_at = now()
WHERE id = '793d4755-559b-4e2e-b215-dd739b8fd20a';

-- Option 2: Delete test user
UPDATE users
SET deleted_at = now()
WHERE id = '793d4755-559b-4e2e-b215-dd739b8fd20a';

-- Restore original user role if changed
UPDATE users
SET role = 'field_employee'
WHERE email = 'evidyaev@gdc.nyc';
```

## Troubleshooting

### Email Not Received
1. Check Edge Function logs for errors
2. Verify `send-email` function is working
3. Check email service provider status
4. Verify recipient email is valid
5. Check spam/junk folder

### Permission Denied
- Ensure user has `admin` or `owner` role
- Verify JWT token is valid and not expired
- Check RLS policies on users table

### Function Errors
```bash
# View detailed logs
npx supabase functions logs approve-user --tail

# Check function status
npx supabase functions list
```

## Success Criteria

✅ Approval email sends with correct content and formatting
✅ Rejection email sends with optional reason
✅ User status updates correctly in database
✅ Edge Function logs show successful execution
✅ No errors in email delivery
✅ Professional HTML rendering in email clients
✅ Plain text fallback works

## Additional Test Scenarios

### Test Email with Special Characters
- User name with accents: José García
- Company name with symbols: Tech & Innovation Co.

### Test Different Rejection Reasons
- Short reason: "Duplicate registration"
- Long reason: Multiple paragraphs explaining next steps
- No reason: Test optional parameter

### Test Error Handling
- Invalid user ID
- Non-existent company
- Email service unavailable (should log error but not fail approval/rejection)
