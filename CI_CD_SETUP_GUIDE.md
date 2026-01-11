# CI/CD Setup Guide

This guide walks through setting up all new CI/CD workflows for JobSight.

## Prerequisites

- GitHub repository with Actions enabled
- Supabase project (production + staging)
- Vercel project for frontend deployment
- GitHub CLI (`gh`) installed (optional but recommended)

## Step 1: Gather Required Secrets

### Supabase Secrets

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings > API
4. Copy:
   - **Project URL**: `VITE_SUPABASE_URL`
   - **Anon Key**: `VITE_SUPABASE_ANON_KEY`
5. Go to Settings > Access Tokens
6. Create new token with all scopes
7. Copy: **Access Token**: `SUPABASE_ACCESS_TOKEN`
8. Go to Settings > General
9. Copy: **Project Reference ID**: `SUPABASE_PROJECT_ID`

Repeat for staging environment:
- `SUPABASE_PROJECT_ID_STAGING`

### Vercel Secrets

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Settings > General
4. Copy:
   - **Project ID**: `VERCEL_PROJECT_ID`
5. Go to Account Settings > Tokens
6. Create new token for CI/CD
7. Copy: **Token**: `VERCEL_TOKEN`
8. Go back to project Settings > General
9. Copy: **Team ID**: `VERCEL_ORG_ID` (or use `VERCEL_ORG_ID` from settings)

## Step 2: Add GitHub Secrets

### Via GitHub CLI (Recommended)

```bash
cd /path/to/JobSight

# Supabase Secrets
gh secret set SUPABASE_ACCESS_TOKEN --body "your-supabase-token"
gh secret set SUPABASE_PROJECT_ID --body "your-production-project-id"
gh secret set SUPABASE_PROJECT_ID_STAGING --body "your-staging-project-id"
gh secret set VITE_SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set VITE_SUPABASE_ANON_KEY --body "your-anon-key"

# Vercel Secrets
gh secret set VERCEL_ORG_ID --body "your-vercel-org-id"
gh secret set VERCEL_PROJECT_ID --body "your-vercel-project-id"
gh secret set VERCEL_TOKEN --body "your-vercel-token"
```

### Via GitHub Web UI

1. Go to your GitHub repository
2. Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret from the list above

### Secrets Checklist

```
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_ID
SUPABASE_PROJECT_ID_STAGING
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VERCEL_TOKEN
```

## Step 3: Prepare Supabase Configuration

### Import Map (if using npm packages in functions)

If your Edge Functions use npm packages, create:

```bash
# supabase/functions/import_map.json
{
  "imports": {
    "https://deno.land/std@0.208.0/": "https://deno.land/std@0.208.0/"
  }
}
```

### Edge Functions Structure

Verify all functions follow this structure:

```
supabase/functions/
├── function-name/
│   ├── index.ts
│   ├── deno.json (optional)
│   └── test.ts (optional)
└── import_map.json
```

Example function:

```typescript
// supabase/functions/health-check/index.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    return new Response(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

## Step 4: Prepare Database Migrations

### Migration File Structure

Create migrations in the `migrations/` directory:

```bash
mkdir -p migrations
```

### Migration Naming Convention

```
migrations/
├── 001_initial_setup.sql         (already exists)
├── 002_core_tables.sql           (already exists)
├── ...
└── 0XX_your_new_migration.sql    (add new ones here)
```

### Migration Template

```sql
-- Migration: NNN_description
-- Date: 2024-01-09
-- Author: Your Name
-- Description: What this migration does

BEGIN;

-- Table: Example table creation
CREATE TABLE IF NOT EXISTS example_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index: For performance
CREATE INDEX IF NOT EXISTS idx_example_table_name ON example_table(name);

-- RLS Policy: Row-level security
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own records"
    ON example_table FOR ALL
    USING (auth.uid() = user_id);

COMMIT;
```

### Validation Before Commit

```bash
# Verify migration syntax
psql -d postgres -f migrations/XXX_your_migration.sql --dry-run

# Check file naming
ls migrations/ | grep "^[0-9]\{3\}_.*\.sql$"
```

## Step 5: Enable GitHub Features

### Set up Branch Protection Rules

1. Go to Settings > Branches
2. Add rule for `main` and `develop`:
   - Require pull request reviews before merging (1 reviewer)
   - Require status checks to pass:
     - ci: quick-checks
     - ci: unit-tests
     - ci: e2e-tests
     - security: security

3. Add rule for `main` only:
   - Require administrators to follow rules
   - Restrict who can dismiss pull request reviews
   - Require status checks to pass before merging

### Enable GitHub Actions

1. Settings > Actions > General
2. Allow all actions and reusable workflows
3. Workflow permissions:
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

### Set up Environments

For production deployments with manual approval:

1. Settings > Environments
2. Click "New environment"
3. Name: `production`
4. Add deployment branches: `main`
5. Add required reviewers (team members who approve prod deployments)
6. Add environment secrets (optional - can use repo secrets instead)

## Step 6: Configure Workflow Files

### Verify Workflow Paths

All new workflows should be in `.github/workflows/`:

```bash
ls -la .github/workflows/
```

Expected files:
- `deploy-edge-functions.yml`
- `database-migrations.yml`
- `security-scanning.yml`
- `build-optimization.yml`
- `dependency-management.yml`
- `ci.yml` (existing, enhanced)
- `deploy.yml` (existing, enhanced)
- `test.yml` (existing)

### Test Workflows Locally (Optional)

Using `act` to test workflows locally:

```bash
# Install act
brew install act  # macOS
# or: choco install act-cli  # Windows

# Test a workflow
act -j validate -s SUPABASE_ACCESS_TOKEN=test-token
```

## Step 7: Create Test Changes

### Test Edge Function Workflow

1. Create a test Edge Function:

```bash
mkdir -p supabase/functions/test-health-check
cat > supabase/functions/test-health-check/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req) => {
  return new Response(
    JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
});
EOF
```

2. Commit and push to `develop`:

```bash
git add supabase/functions/test-health-check/
git commit -m "test: add test health check edge function"
git push origin develop
```

3. Watch the workflow: Actions > Deploy Supabase Edge Functions

### Test Migration Workflow

1. Create a test migration:

```bash
# Find next number
ls migrations/ | tail -1  # Shows current highest

# Create new one (adjust number as needed)
cat > migrations/011_test_migration.sql << 'EOF'
BEGIN;

-- Test: Create a test table
CREATE TABLE IF NOT EXISTS test_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE test_table ENABLE ROW LEVEL SECURITY;

COMMIT;
EOF
```

2. Commit and push:

```bash
git add migrations/011_test_migration.sql
git commit -m "test: add test migration"
git push origin develop
```

3. Watch the workflow: Actions > Database Migrations

### Test Security Scanning

1. Make any normal commit to develop/main
2. Watch the workflow: Actions > Security Scanning
3. Check Results: Security > Code scanning alerts

## Step 8: Verify All Workflows

### Check Workflow Status

```bash
# List recent workflow runs
gh run list --repo YOUR_OWNER/YOUR_REPO

# View specific workflow
gh run view RUN_ID --log
```

### Verify Secrets Are Used

1. Go to Actions in GitHub UI
2. Click on any workflow run
3. Expand "Deploy Edge Functions" or other jobs
4. Look for "***" indicating secret usage
5. No secrets should be printed in logs

## Step 9: Document Team Procedures

### Deployment Procedures

Create a team runbook:

```markdown
# Deployment Runbook

## Deploying to Production

### Manual Triggers
- Edge Functions: Actions > Deploy Supabase Edge Functions > Run workflow > Select "production"
- Migrations: Handled automatically when merge to main
- Frontend: Automatic on push to main

### Status Checks
1. All CI checks pass on PR
2. Get approval from 1+ team member
3. Merge to main
4. Monitor Actions tab for deployment completion
5. Verify in production environment

## Rollback Procedures

### Edge Functions
- Manual rollback available via Git (revert commit)
- Automatic rollback on deployment failure

### Database Migrations
- Supabase keeps automatic daily backups
- Contact team for manual restore if needed

### Frontend
- Vercel keeps deployment history
- Instant rollback via Vercel dashboard
```

### Add to Team Wiki/Documentation

Update your team's documentation with:
- Where to find the CI/CD dashboard
- How to check deployment status
- Rollback procedures
- Emergency contacts

## Step 10: Optional Enhancements

### Slack Notifications

Add to `.github/workflows/deploy.yml`:

```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Deployment ${{ job.status }}: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
      }
```

### Email Notifications

GitHub has built-in email notifications for:
- Workflow failures
- Required reviewer notifications
- Deployment status

Configure in: Settings > Notifications

### Dashboard/Monitoring

Create a status page dashboard showing:
- Recent deployments
- Build times
- Security scan results
- Dependency updates

Use: GitHub's built-in insights or third-party tools

## Troubleshooting

### Secrets Not Found

```bash
# Verify secrets are set
gh secret list

# Check secret is used in workflow
grep "secrets.YOUR_SECRET" .github/workflows/*.yml
```

### Workflow Not Triggering

Check:
1. Workflow file syntax: `github.com/yourrepo/actions`
2. Branch filters match your branch name
3. Path filters match changed files (if set)
4. Workflow is not disabled

### Deploy Failures

1. Check the workflow logs: Actions > [Workflow] > [Run] > [Job]
2. Look for error messages
3. Verify secrets are correct
4. Check branch protection rules aren't blocking

### Cache Issues

```bash
# Clear caches
gh actions-cache delete $(gh actions-cache list --key workflow-caches | awk '{print $1}')

# Or via UI
Settings > Actions > Caches > Delete
```

## Next Steps

1. Commit this setup
2. Create a team meeting to review workflows
3. Document team-specific procedures
4. Monitor first few deployments
5. Gather feedback and iterate

## Support Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Semgrep Rules Database](https://semgrep.dev/r)

---

**Setup Complete!**

Your CI/CD pipeline is now ready for automated deployments. Monitor the Actions tab for the first few runs and adjust as needed.
