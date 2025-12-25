# Email Notification Configuration Guide

## Overview

This guide will help you configure email notifications for your JobSight application. The system uses **Resend** as the email provider via Supabase Edge Functions for secure, reliable email delivery.

## Current Status

✅ Email service infrastructure is ready
✅ Notification preferences UI is implemented
✅ Email templates are created
⚠️ Needs: Resend API key configuration

## Quick Start

### 1. Get a Resend API Key

1. Go to [resend.com](https://resend.com)
2. Create an account or sign in
3. Navigate to **API Keys** in the dashboard
4. Click **Create API Key**
5. Name it (e.g., "JobSight Production")
6. Copy the API key (starts with `re_`)

### 2. Configure Domain (Optional but Recommended)

For production emails, configure your own domain in Resend:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `jobsightapp.com`)
4. Add the DNS records to your domain provider
5. Verify the domain

**Recommended sender email:** `noreply@yourdomain.com` or `notifications@yourdomain.com`

### 3. Set Supabase Secrets

Store your API key securely as a Supabase secret (NOT in `.env` file):

```bash
# Set Resend API key
npx supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here

# Set sender email address
npx supabase secrets set EMAIL_FROM="JobSight <noreply@yourdomain.com>"

# Verify secrets are set
npx supabase secrets list
```

### 4. Deploy Edge Function (if not already deployed)

```bash
# Deploy the send-email function
npx supabase functions deploy send-email

# Check deployment status
npx supabase functions list
```

### 5. Update Environment Variables

Your `.env` file should have:

```env
# Email Configuration
VITE_EMAIL_PROVIDER=resend  # Use 'console' for development testing

# App URL (used in email links)
VITE_APP_URL=https://yourdomain.com  # Update for production
```

## Testing

### Development Testing (Console Mode)

For local development without sending real emails:

1. Set `VITE_EMAIL_PROVIDER=console` in `.env`
2. Emails will be logged to browser console
3. Perfect for testing email content and flow

### Production Testing (Resend)

1. Set `VITE_EMAIL_PROVIDER=resend` in `.env`
2. Configure Resend API key (see above)
3. Test with a real email address:

```bash
# Option 1: Use the automated test script
npm run test:emails

# Option 2: Manually test via UI
# - Navigate to /settings/notification-preferences
# - Configure your notification settings
# - Trigger notifications by performing actions
```

### Test Scenarios

| Notification Type | How to Test |
|------------------|-------------|
| **Approval Requests** | Admin approves/rejects a pending user |
| **RFI Assigned** | Create an RFI and assign it to someone |
| **Task Assigned** | Create a task and assign it |
| **Punch Item** | Create a punch list item and assign |
| **Safety Incident** | Create a safety incident report |
| **Document Comments** | Comment on a document |
| **Daily Digest** | Automated (runs daily via cron) |

## Email Templates Available

Your system includes these email templates:

- ✅ **User Approval** - Welcome email when user is approved ([email-notification-validation](EMAIL_NOTIFICATION_VALIDATION.md))
- ✅ **User Rejection** - Notification when user is rejected
- ✅ **RFI Assigned** - When an RFI is assigned to someone
- ✅ **RFI Answered** - When an RFI receives an answer
- ✅ **Task Assigned** - When a task is assigned
- ✅ **Approval Request** - When approval is requested
- ✅ **Approval Completed** - When approval is granted/denied
- ✅ **Punch Item Assigned** - When a punch list item is assigned
- ✅ **Document Comment** - When someone comments on a document
- ✅ **Change Order Status** - When a change order status changes
- ✅ **Action Item Notification** - When action items are created
- ✅ **Drawing Package Notification** - When drawing packages are shared
- ✅ **Safety Observation** - When safety observations are made
- ✅ **Site Instructions** - For site instruction acknowledgments

All templates are located in: [src/lib/email/templates/](src/lib/email/templates/)

## User Notification Preferences

Users can configure their notification preferences at:

**URL:** `/settings/notification-preferences`

**Available Settings:**

### Email Notifications
- Approval requests
- Approval completed
- Safety incidents
- RFI assigned/answered
- Tasks assigned/due
- Punch items assigned
- Document comments
- Daily digest

### In-App Notifications
- Toggle all in-app notifications

### Push Notifications
- Enable/disable push notifications
- Configure notification types
- Sound and vibration settings
- Quiet hours

### Quiet Hours
- Set time range to pause email notifications
- Timezone configuration

## Email Service Architecture

```
┌─────────────────┐
│  Frontend App   │
│  (React/Vite)   │
└────────┬────────┘
         │ Call emailService.send()
         ▼
┌─────────────────┐
│  Email Service  │
│ (email-service) │
└────────┬────────┘
         │ Invoke Edge Function
         ▼
┌──────────────────────┐
│ Supabase Edge Fn     │
│ (send-email)         │
│ - Validates auth     │
│ - Uses RESEND_API_KEY│
└────────┬─────────────┘
         │ API Call
         ▼
┌─────────────────┐
│  Resend API     │
│  (Email Sent)   │
└─────────────────┘
```

## Troubleshooting

### Emails Not Sending

1. **Check provider setting:**
   ```bash
   # In .env file
   VITE_EMAIL_PROVIDER=resend  # Make sure it's not 'console'
   ```

2. **Verify Supabase secrets:**
   ```bash
   npx supabase secrets list
   # Should show: RESEND_API_KEY and EMAIL_FROM
   ```

3. **Check Edge Function logs:**
   ```bash
   npx supabase functions logs send-email --tail
   ```

4. **Test Edge Function directly:**
   ```bash
   curl -X POST "https://nxlznnrocrffnbzjaaae.supabase.co/functions/v1/send-email" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "to": [{"email": "test@example.com", "name": "Test User"}],
       "subject": "Test Email",
       "html": "<h1>Test</h1><p>This is a test email.</p>",
       "text": "This is a test email."
     }'
   ```

### Emails Going to Spam

1. **Configure SPF, DKIM, and DMARC records** for your domain in Resend
2. **Use a verified domain** instead of default Resend domain
3. **Warm up your domain** by sending gradually increasing volumes
4. **Avoid spam trigger words** in subject lines

### Permission Errors

1. **Check Edge Function has required secrets:**
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Verify auth header is being sent** from client

### Rate Limiting

Resend has different rate limits based on plan:
- **Free:** 100 emails/day
- **Pro:** Higher limits

Monitor usage in Resend dashboard.

## Production Checklist

Before going to production:

- [ ] Resend account created and verified
- [ ] Custom domain configured and verified in Resend
- [ ] DNS records (SPF, DKIM, DMARC) added
- [ ] Resend API key set as Supabase secret
- [ ] `EMAIL_FROM` configured with your domain
- [ ] `VITE_APP_URL` set to production domain
- [ ] `VITE_EMAIL_PROVIDER` set to `resend`
- [ ] Edge Function deployed to production
- [ ] Test emails sent and received successfully
- [ ] Check emails in multiple clients (Gmail, Outlook, Apple Mail)
- [ ] Verify links work correctly
- [ ] Monitor spam folder placement
- [ ] Set up email logging/monitoring in Resend dashboard

## Support & Resources

- **Resend Documentation:** https://resend.com/docs
- **Email Templates:** [src/lib/email/templates/](src/lib/email/templates/)
- **Email Service Code:** [src/lib/email/email-service.ts](src/lib/email/email-service.ts)
- **Edge Function:** [supabase/functions/send-email/index.ts](supabase/functions/send-email/index.ts)
- **Test Guide:** [EMAIL_NOTIFICATION_TEST_GUIDE.md](EMAIL_NOTIFICATION_TEST_GUIDE.md)

## Advanced Configuration

### Custom Email Templates

To customize email templates, edit files in [src/lib/email/templates/](src/lib/email/templates/)

Example template structure:
```typescript
export function generateMyEmail(data: MyEmailData) {
  return {
    subject: `My Subject - ${data.companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
          <!-- Your HTML content -->
        </body>
      </html>
    `,
    text: `Plain text fallback`
  }
}
```

### Email Logging

All emails are automatically logged to the `email_logs` table with:
- Recipient email and user ID
- Template name
- Subject
- Status (sent/failed)
- Resend message ID
- Metadata (recipients count, attachments, tags)

Query email logs:
```sql
SELECT * FROM email_logs
WHERE recipient_email = 'user@example.com'
ORDER BY created_at DESC
LIMIT 10;
```

### Notification Scheduling

Daily digest emails are sent via cron job. Configure in Supabase:

```sql
-- Cron job configuration in Supabase SQL Editor
SELECT cron.schedule(
  'daily-digest-emails',
  '0 8 * * *',  -- 8 AM daily
  $$
  SELECT net.http_post(
    url := 'https://nxlznnrocrffnbzjaaae.supabase.co/functions/v1/send-daily-digest',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  )
  $$
);
```

## Next Steps

1. **Set up Resend account** and get API key
2. **Configure Supabase secrets** with your credentials
3. **Test in development** with console mode
4. **Test with real emails** using resend mode
5. **Configure user preferences** via UI
6. **Monitor email delivery** in Resend dashboard
7. **Go to production** with confidence!

---

**Need Help?** Check the [EMAIL_NOTIFICATION_TEST_GUIDE.md](EMAIL_NOTIFICATION_TEST_GUIDE.md) for detailed testing instructions.
