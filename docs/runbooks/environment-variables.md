# Environment Variables Reference

**Last Updated:** December 7, 2025

This document lists all required environment variables for SuperSiteHero across different environments.

---

## Quick Reference

| Variable | Required | Where Used |
|----------|----------|------------|
| `VITE_SUPABASE_URL` | Yes | All environments |
| `VITE_SUPABASE_ANON_KEY` | Yes | All environments |
| `VITE_SENTRY_DSN` | Production | Error monitoring |
| `VITE_SENTRY_ENVIRONMENT` | Production | Error context |
| `VERCEL_TOKEN` | CI/CD | Deployment |
| `VERCEL_ORG_ID` | CI/CD | Deployment |
| `VERCEL_PROJECT_ID` | CI/CD | Deployment |
| `TEST_USER_EMAIL` | CI/CD | E2E tests |
| `TEST_USER_PASSWORD` | CI/CD | E2E tests |

---

## Application Variables

### Supabase Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOiJI...` |

**Where to find:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings > API**
4. Copy "Project URL" and "anon public" key

### Error Monitoring (Sentry)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SENTRY_DSN` | Sentry Data Source Name | `https://xxx@xxx.ingest.sentry.io/xxx` |
| `VITE_SENTRY_ENVIRONMENT` | Environment identifier | `production`, `staging`, `development` |

**Where to find:**
1. Go to [Sentry Dashboard](https://sentry.io)
2. Select your project
3. Navigate to **Settings > Client Keys (DSN)**
4. Copy the DSN value

---

## CI/CD Variables (GitHub Secrets)

### Vercel Deployment

| Secret | Description | How to Get |
|--------|-------------|------------|
| `VERCEL_TOKEN` | Vercel API token | Vercel Dashboard > Settings > Tokens |
| `VERCEL_ORG_ID` | Vercel organization ID | Run `vercel link` then check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel project ID | Run `vercel link` then check `.vercel/project.json` |

**Setup Steps:**
```bash
# Install Vercel CLI
npm i -g vercel

# Link project (creates .vercel/project.json)
vercel link

# View IDs
cat .vercel/project.json
# Output: { "orgId": "xxx", "projectId": "yyy" }

# Create API token at:
# https://vercel.com/account/tokens
```

### E2E Testing

| Secret | Description | Notes |
|--------|-------------|-------|
| `TEST_USER_EMAIL` | Test user email address | Create a dedicated test user in Supabase |
| `TEST_USER_PASSWORD` | Test user password | Use a strong password |

**Setup Steps:**
1. Create a test user in your Supabase project:
   - Go to Supabase Dashboard > Authentication > Users
   - Click "Add user" > "Create new user"
   - Use a dedicated email (e.g., `test@yourcompany.com`)
2. Add credentials as GitHub secrets

---

## Environment Files

### Local Development (`.env.local`)

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Sentry (optional for local)
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=development
```

### Staging (Vercel Environment Variables)

```env
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=staging
```

### Production (Vercel Environment Variables)

```env
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=production
```

---

## GitHub Secrets Setup

1. Go to your GitHub repository
2. Navigate to **Settings > Secrets and variables > Actions**
3. Click **New repository secret** for each secret

### Required Secrets for CI

| Secret Name | Required For |
|-------------|--------------|
| `VITE_SUPABASE_URL` | Build, E2E tests |
| `VITE_SUPABASE_ANON_KEY` | Build, E2E tests |
| `TEST_USER_EMAIL` | E2E tests |
| `TEST_USER_PASSWORD` | E2E tests |

### Required Secrets for Deployment

| Secret Name | Required For |
|-------------|--------------|
| `VERCEL_TOKEN` | Preview & Production deploys |
| `VERCEL_ORG_ID` | Preview & Production deploys |
| `VERCEL_PROJECT_ID` | Preview & Production deploys |

---

## Vercel Environment Variables Setup

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Navigate to **Settings > Environment Variables**
4. Add variables for each environment (Production, Preview, Development)

### Recommended Configuration

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `VITE_SUPABASE_URL` | Prod URL | Staging URL | - |
| `VITE_SUPABASE_ANON_KEY` | Prod Key | Staging Key | - |
| `VITE_SENTRY_DSN` | Your DSN | Your DSN | - |
| `VITE_SENTRY_ENVIRONMENT` | `production` | `staging` | - |

---

## Security Notes

1. **Never commit secrets** - Use `.env.local` for local development (gitignored)
2. **Rotate tokens regularly** - Update Vercel tokens every 90 days
3. **Use separate Supabase projects** - Production and staging should be isolated
4. **Limit test user permissions** - Test user should only have necessary access
5. **Monitor for leaked secrets** - Enable GitHub secret scanning

---

## Troubleshooting

### "Missing environment variable" errors

1. Check if variable is set in correct environment (local vs Vercel)
2. Ensure variable name starts with `VITE_` for client-side access
3. Restart dev server after adding new variables

### CI/CD deployment fails

1. Verify all GitHub secrets are set correctly
2. Check Vercel token hasn't expired
3. Confirm project is linked (`vercel link`)

### E2E tests fail with auth errors

1. Verify test user exists in Supabase
2. Check email/password are correct
3. Ensure test user's email is confirmed

---

**Document Owner:** DevOps Team
**Review Cycle:** Monthly
