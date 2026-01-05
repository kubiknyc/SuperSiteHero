# JobSight Environment Setup Guide

This guide documents the required configuration for email notifications, push notifications, and other services.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Configure Supabase secrets (see sections below)

# 4. Start development server
npm run dev
```

---

## Email Notifications (Resend)

### Get Resend API Key
1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys → Create API Key
3. Copy the key (starts with `re_`)

### Configure Email Domain (Production)
1. In Resend dashboard, go to Domains
2. Add your domain (e.g., `JobSight.com`)
3. Follow DNS verification steps
4. Wait for domain verification

### Set Supabase Secrets
```bash
# Set the API key
supabase secrets set RESEND_API_KEY=re_your_api_key_here

# Set the from address (must be verified domain in production)
supabase secrets set EMAIL_FROM="JobSight <noreply@JobSight.com>"

# Verify secrets are set
supabase secrets list
```

### Deploy Edge Function
```bash
# Deploy the send-email function
supabase functions deploy send-email
```

### Test Email Delivery
```bash
# Test the function
supabase functions invoke send-email --body '{
  "to": { "email": "test@example.com" },
  "subject": "Test Email",
  "html": "<h1>Hello!</h1><p>This is a test email.</p>"
}'
```

---

## Push Notifications (Web Push/VAPID)

### Generate VAPID Keys
```bash
# Install web-push globally (one-time)
npm install -g web-push

# Generate VAPID keys
npx web-push generate-vapid-keys
```

This will output:
```
=======================================
Public Key:
BLc-...your-public-key...

Private Key:
your-private-key
=======================================
```

### Configure VAPID Keys

1. **Public Key (Client-side)**
   Add to your `.env.local`:
   ```
   VITE_VAPID_PUBLIC_KEY=BLc-...your-public-key...
   ```

2. **Private Key (Server-side)**
   ```bash
   supabase secrets set VAPID_PRIVATE_KEY=your-private-key
   ```

### Deploy Push Notification Function
```bash
supabase functions deploy send-push-notification
```

---

## OAuth Integration (Optional)

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - `http://localhost:5173/oauth/callback` (development)
   - `https://yourdomain.com/oauth/callback` (production)
4. In Supabase Dashboard → Authentication → Providers → Google:
   - Enable Google provider
   - Add Client ID and Client Secret

### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com) → App registrations
2. Register new application
3. Add redirect URIs
4. In Supabase Dashboard → Authentication → Providers → Azure:
   - Enable Azure provider
   - Add Client ID and Client Secret

---

## Environment Variables Reference

### Client-side (.env.local)
```bash
# Supabase (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# App Configuration
VITE_APP_URL=http://localhost:5173
VITE_APP_ENV=development

# Push Notifications (Required for push)
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key

# Error Monitoring (Optional)
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=development
```

### Server-side (Supabase Secrets)
```bash
# Email (Required for email notifications)
RESEND_API_KEY=re_your_key
EMAIL_FROM=JobSight <noreply@yourdomain.com>

# Push Notifications (Required for push)
VAPID_PRIVATE_KEY=your-private-key

# Other (Optional)
# These are auto-configured by Supabase:
# SUPABASE_URL
# SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

---

## Verifying Configuration

### Check Email Configuration
```bash
# List deployed functions
supabase functions list

# Check secrets are set (names only)
supabase secrets list

# View function logs
supabase functions logs send-email
```

### Check Database Status
```bash
# Run migrations status
supabase db status

# Test database connection
supabase db ping
```

### Test Notifications in App
1. Create an RFI with distribution list recipients
2. Check:
   - In-app notification appears for recipients
   - Email is received (check spam folder)
   - Check Supabase → Edge Functions → Logs for any errors

---

## Troubleshooting

### Emails Not Sending

1. **Check secrets are set:**
   ```bash
   supabase secrets list
   # Should show RESEND_API_KEY and EMAIL_FROM
   ```

2. **Check function is deployed:**
   ```bash
   supabase functions list
   # Should show send-email
   ```

3. **Check function logs:**
   ```bash
   supabase functions logs send-email --tail
   ```

4. **Common issues:**
   - Domain not verified in Resend (production)
   - API key invalid or expired
   - Rate limits exceeded

### Push Notifications Not Working

1. **Check browser console for errors**

2. **Verify VAPID public key matches:**
   - The public key in `.env.local` must match the private key in Supabase secrets

3. **Check service worker registration:**
   - Open DevTools → Application → Service Workers

4. **Ensure HTTPS in production:**
   - Push notifications require HTTPS (except localhost)

### Database Connection Issues

1. **Check Supabase project status:**
   - Go to Supabase Dashboard → Check if project is paused

2. **Verify RLS policies:**
   - Some queries may fail if RLS policies don't allow access

3. **Check connection pooler:**
   - In heavy load, may need to use connection pooler URL

---

## Production Deployment Checklist

- [ ] Set production environment variables
- [ ] Deploy all Edge Functions
- [ ] Verify domain is added in Resend
- [ ] Verify OAuth redirect URIs include production domain
- [ ] Set up Sentry for error monitoring
- [ ] Configure CDN for static assets
- [ ] Set up database backups
- [ ] Run security audit: `npm audit`

