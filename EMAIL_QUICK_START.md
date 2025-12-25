# Email Notifications - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Get Resend API Key

1. Go to [resend.com](https://resend.com) and sign up
2. Navigate to **API Keys** → **Create API Key**
3. Copy your API key (starts with `re_`)

### Step 2: Configure Supabase

Run the interactive setup:

```bash
npm run email:setup
```

Or manually set secrets:

```bash
npx supabase secrets set RESEND_API_KEY=re_your_actual_key_here
npx supabase secrets set EMAIL_FROM="JobSight <noreply@yourdomain.com>"
```

### Step 3: Update Environment

In your `.env` file:

```env
VITE_EMAIL_PROVIDER=resend  # Use 'console' for dev testing
VITE_APP_URL=https://yourdomain.com  # Your production URL
```

## ✅ You're Done!

Test your setup:

```bash
npm run test:emails
```

Or use the interactive tool:

```bash
npm run email:setup
# Choose option 2: Test email configuration
```

## 📧 Available Email Templates

Your system automatically sends these notifications:

| Event | Template | Configurable by Users |
|-------|----------|----------------------|
| User Approved | ✅ | No (admin action) |
| User Rejected | ✅ | No (admin action) |
| RFI Assigned | ✅ | Yes |
| RFI Answered | ✅ | Yes |
| Task Assigned | ✅ | Yes |
| Task Due Soon | ✅ | Yes |
| Punch Item Assigned | ✅ | Yes |
| Safety Incident | ✅ | Yes |
| Approval Request | ✅ | Yes |
| Approval Completed | ✅ | Yes |
| Document Comment | ✅ | Yes |
| Daily Digest | ✅ | Yes |

## 🎛️ User Settings

Users can manage their preferences at:

**`/settings/notification-preferences`**

They can configure:
- Which notifications to receive
- Email vs in-app vs push
- Quiet hours (pause notifications)
- Daily digest settings

## 🔧 Commands Reference

```bash
# Interactive email setup
npm run email:setup

# Test emails
npm run test:emails

# View Supabase secrets
npx supabase secrets list

# View Edge Function logs
npx supabase functions logs send-email --tail

# Deploy Edge Function
npx supabase functions deploy send-email
```

## 🐛 Troubleshooting

### Emails not sending?

1. **Check provider mode:**
   ```bash
   # In .env file
   VITE_EMAIL_PROVIDER=resend  # Not 'console'
   ```

2. **Verify secrets:**
   ```bash
   npx supabase secrets list
   # Should show: RESEND_API_KEY, EMAIL_FROM
   ```

3. **Check logs:**
   ```bash
   npx supabase functions logs send-email --tail
   ```

### Emails going to spam?

1. Add custom domain in Resend dashboard
2. Configure SPF, DKIM, DMARC records
3. Verify domain ownership

### Testing locally without sending emails?

```env
# In .env file
VITE_EMAIL_PROVIDER=console
```

Emails will be logged to browser console instead.

## 📚 Documentation

- **Full Guide:** [EMAIL_CONFIGURATION_GUIDE.md](EMAIL_CONFIGURATION_GUIDE.md)
- **Testing Guide:** [EMAIL_NOTIFICATION_TEST_GUIDE.md](EMAIL_NOTIFICATION_TEST_GUIDE.md)
- **Validation Report:** [EMAIL_NOTIFICATION_VALIDATION.md](EMAIL_NOTIFICATION_VALIDATION.md)

## 🆘 Need Help?

1. Check the [full configuration guide](EMAIL_CONFIGURATION_GUIDE.md)
2. Review [Resend documentation](https://resend.com/docs)
3. Check Edge Function logs for errors
4. Verify your Supabase secrets are set correctly

---

**Ready to send emails?** Run `npm run email:setup` to get started!
