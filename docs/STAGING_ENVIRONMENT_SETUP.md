# Staging Environment Setup Guide

This guide walks through setting up a staging environment for SuperSiteHero.

## Prerequisites

- Supabase account
- Vercel account (or other hosting platform)
- Access to production Supabase project

## Step 1: Create Staging Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Configure:
   - **Name:** `supersitehero-staging`
   - **Database Password:** Generate a strong password
   - **Region:** Same as production
   - **Pricing Plan:** Free tier is sufficient for staging

4. Wait for project to be created (~2 minutes)

## Step 2: Clone Schema to Staging

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to production project
supabase link --project-ref YOUR_PRODUCTION_PROJECT_REF

# Generate migration from production
supabase db dump -f production_schema.sql

# Link to staging project
supabase link --project-ref YOUR_STAGING_PROJECT_REF

# Apply schema to staging
supabase db push
```

### Option B: Manual SQL Migration

1. Go to Production Supabase → SQL Editor
2. Run: `pg_dump` to export schema
3. Go to Staging Supabase → SQL Editor
4. Run the exported SQL

### Option C: Apply All Migrations

```bash
# From project root
cd supabase/migrations

# Apply each migration in order to staging
# Use Supabase Dashboard SQL Editor or CLI
supabase db reset --linked
```

## Step 3: Configure Environment Variables

Create `.env.staging` file:

```env
# Staging Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_STAGING_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key

# Environment
VITE_APP_ENV=staging

# Email Configuration (use console for staging to avoid sending real emails)
VITE_EMAIL_PROVIDER=console

# App URL
VITE_APP_URL=https://staging.supersitehero.com

# Sentry (use staging environment)
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=staging
VITE_APP_VERSION=1.0.0-staging
```

## Step 4: Create Staging Test Users

Run in Staging Supabase SQL Editor:

```sql
-- Create test company
INSERT INTO companies (id, name, created_at)
VALUES (
  'staging-company-001',
  'Staging Test Company',
  NOW()
);

-- Note: Create users via Supabase Auth dashboard or signUp API
-- Then associate them with the company in the users table
```

## Step 5: Deploy to Staging

### Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your repository (if not already)
3. Create a new deployment branch:
   - Go to Settings → Git
   - Add "staging" as a production branch

4. Configure Environment Variables:
   - Go to Settings → Environment Variables
   - Add all variables from `.env.staging`
   - Set environment to "Preview" or create staging-specific

5. Deploy:
```bash
git checkout -b staging
git push origin staging
```

### Manual Deployment

```bash
# Build for staging
VITE_APP_ENV=staging npm run build

# Deploy to your hosting provider
# Example for Vercel CLI:
vercel --env-file .env.staging
```

## Step 6: Configure GitHub Secrets for CI/CD

Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

Add staging-specific secrets:

| Secret | Description |
|--------|-------------|
| `STAGING_SUPABASE_URL` | Staging Supabase URL |
| `STAGING_SUPABASE_ANON_KEY` | Staging Supabase anon key |
| `STAGING_TEST_USER_EMAIL` | Test user for staging E2E |
| `STAGING_TEST_USER_PASSWORD` | Test user password |

## Step 7: Update CI/CD Workflow

Add staging deployment job to `.github/workflows/deploy.yml`:

```yaml
deploy-staging:
  name: Deploy to Staging
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/staging'

  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build for staging
      run: npm run build
      env:
        VITE_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
        VITE_APP_ENV: staging
        VITE_SENTRY_ENVIRONMENT: staging

    - name: Deploy to Vercel (Staging)
      run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Step 8: Verify Staging Environment

### Checklist

- [ ] Staging URL accessible (e.g., https://staging.supersitehero.com)
- [ ] Login works with test credentials
- [ ] Data is isolated from production
- [ ] Error monitoring (Sentry) shows "staging" environment
- [ ] All features functional
- [ ] API calls go to staging Supabase

### Test Commands

```bash
# Run E2E tests against staging
PLAYWRIGHT_BASE_URL=https://staging.supersitehero.com npm run test:e2e

# Verify environment
curl https://staging.supersitehero.com/api/health
```

## Maintenance

### Sync Schema Changes

When production schema changes:

```bash
# Generate diff
supabase db diff --linked -f new_migration.sql

# Apply to staging
supabase db push --linked
```

### Reset Staging Data

```bash
# Reset staging database (WARNING: deletes all data)
supabase db reset --linked

# Or selectively clear test data
psql $STAGING_DATABASE_URL -c "TRUNCATE projects, rfis, submittals CASCADE;"
```

## Troubleshooting

### Common Issues

1. **RLS Policies Blocking Access**
   - Check that test users have proper company/project associations
   - Verify RLS policies are applied correctly

2. **Auth Issues**
   - Ensure staging users are created in Supabase Auth
   - Check JWT configuration matches staging project

3. **CORS Errors**
   - Update allowed origins in Supabase settings
   - Verify API URL configuration

### Debug Mode

Enable verbose logging:

```env
VITE_SENTRY_DEBUG=true
VITE_APP_ENV=staging
```

## Security Notes

- Never use production data in staging
- Use different API keys for staging
- Enable 2FA for staging Supabase project
- Restrict staging access to team members only
- Consider IP whitelisting for staging environment
