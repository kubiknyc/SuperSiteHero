# CI/CD Commands Reference

Quick command reference for working with the new CI/CD pipelines.

## GitHub Secrets Management

### Add Secrets

```bash
# Add individual secret
gh secret set SECRET_NAME --body "your-value"

# Add all secrets at once
gh secret set SUPABASE_ACCESS_TOKEN --body "token"
gh secret set SUPABASE_PROJECT_ID --body "project-id"
gh secret set SUPABASE_PROJECT_ID_STAGING --body "staging-id"
gh secret set VITE_SUPABASE_URL --body "https://..."
gh secret set VITE_SUPABASE_ANON_KEY --body "key"
gh secret set VERCEL_ORG_ID --body "org-id"
gh secret set VERCEL_PROJECT_ID --body "project-id"
gh secret set VERCEL_TOKEN --body "token"
```

### View Secrets

```bash
# List all secrets
gh secret list

# Check specific repository
gh secret list --repo OWNER/REPO
```

### Delete Secrets

```bash
# Remove a secret
gh secret delete SECRET_NAME

# Remove from specific repo
gh secret delete SECRET_NAME --repo OWNER/REPO
```

---

## Workflow Management

### View Workflow Status

```bash
# List all workflow runs
gh run list --repo OWNER/REPO

# List runs for specific workflow
gh run list --repo OWNER/REPO --workflow deploy-edge-functions.yml

# View latest 10 runs
gh run list --repo OWNER/REPO --limit 10
```

### View Workflow Logs

```bash
# View specific run details
gh run view RUN_ID

# View run logs
gh run view RUN_ID --log

# View logs from specific job
gh run view RUN_ID --job JOB_ID --log
```

### Cancel Workflow Run

```bash
# Cancel running workflow
gh run cancel RUN_ID

# Cancel all runs for a workflow
gh run list --workflow NAME.yml --status in_progress --json databaseId -q '.[].databaseId' | xargs -I {} gh run cancel {}
```

### Download Artifacts

```bash
# List artifacts from a run
gh run view RUN_ID --json artifacts

# Download specific artifact
gh run download RUN_ID --name ARTIFACT_NAME

# Download to specific directory
gh run download RUN_ID --name ARTIFACT_NAME --dir ./output
```

---

## Cache Management

### View Caches

```bash
# List all action caches
gh actions-cache list

# List caches for specific key
gh actions-cache list --key build-cache

# View cache info
gh actions-cache list --repo OWNER/REPO
```

### Clear Cache

```bash
# Delete specific cache
gh actions-cache delete CACHE_KEY

# Delete by key pattern
gh actions-cache delete build-cache-*

# Clear all caches
gh actions-cache list --key "" | awk '{print $1}' | xargs -I {} gh actions-cache delete {}
```

---

## Edge Function Deployment

### Test Locally

```bash
# Check Deno is installed
deno --version

# Validate function syntax
deno check supabase/functions/function-name/index.ts

# Run function locally
deno run --allow-all supabase/functions/function-name/index.ts

# Test with curl
curl -X POST http://localhost:8000 -H "Content-Type: application/json"
```

### Deploy Manually (if needed)

```bash
# Deploy to staging
supabase functions deploy --project-ref STAGING_PROJECT_ID

# Deploy to production
supabase functions deploy --project-ref PROD_PROJECT_ID

# List deployed functions
supabase functions list --project-ref PROJECT_ID
```

### Automated Deployment

```bash
# Create or modify function
mkdir -p supabase/functions/my-function
cat > supabase/functions/my-function/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
serve(async (req) => {
  return new Response(JSON.stringify({ status: "ok" }));
});
EOF

# Commit and push
git add supabase/functions/my-function/
git commit -m "feat: add my-function"
git push origin develop  # Deploys to staging automatically
git push origin main     # Deploys to production automatically
```

---

## Database Migrations

### Create Migration

```bash
# Create migration file
cat > migrations/NNN_description.sql << 'EOF'
BEGIN;

-- Your SQL statements here

COMMIT;
EOF

# Replace NNN with next number (001, 002, etc.)
```

### Test Migration

```bash
# Test locally against Supabase
psql $SUPABASE_DB_URL -f migrations/NNN_description.sql

# Or with dry-run (if supported)
psql $SUPABASE_DB_URL -f migrations/NNN_description.sql --dry-run
```

### Automated Migration

```bash
# Create migration file (see above)

# Commit and push
git add migrations/NNN_description.sql
git commit -m "db: add description"
git push origin develop  # Tests on staging automatically
git push origin main     # Deploys to production automatically
```

### Manual Migration (if needed)

```bash
# Connect to Supabase database
psql "postgresql://user:password@db.supabase.co:5432/postgres"

# Run migration
\i migrations/NNN_description.sql

# Verify
SELECT * FROM your_table;
```

---

## Security Scanning

### View Security Results

```bash
# List code scanning alerts
gh code-scan list --repo OWNER/REPO

# View alert details
gh code-scan view ALERT_ID

# Delete alert
gh code-scan dismiss ALERT_ID
```

### Run Scanners Locally

```bash
# Run Semgrep locally
semgrep --config=p/security-audit --config=p/owasp-top-ten .

# Run npm audit
npm audit

# Run license checker
npx license-checker --production

# Run TruffleHog (if installed)
trufflehog git https://github.com/OWNER/REPO --json
```

### Upload Security Results

```bash
# Upload SARIF report to GitHub
gh code-scan upload semgrep.sarif

# Upload multiple reports
gh code-scan upload *.sarif
```

---

## Build Optimization

### Clear Build Cache

```bash
# Clear npm cache
npm cache clean --force

# Clear Playwright cache
rm -rf ~/.cache/ms-playwright

# Clear Vite cache
rm -rf .vite/

# Clear all GitHub Actions caches
gh actions-cache list | awk '{print $1}' | xargs -I {} gh actions-cache delete {}
```

### Check Cache Status

```bash
# View cache sizes
du -sh node_modules ~/.cache/ms-playwright .vite dist

# List GitHub Actions caches
gh actions-cache list
```

### Build Locally

```bash
# Full build
npm run build

# Check build size
du -sh dist/

# Analyze bundle
npm run analyze
```

---

## Dependency Management

### Update Dependencies

```bash
# Check outdated packages
npm outdated

# Update packages interactively
npm update

# Update to latest major versions (be careful!)
npx npm-check-updates -u

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check licenses
npx license-checker --production
```

### Review Changes

```bash
# See what would change
npm outdated --long

# See dependency tree
npm ls --depth=0

# Find duplicate packages
npm ls --all | grep duplicates
```

---

## Git & GitHub Workflow

### Branch Operations

```bash
# Create feature branch
git checkout -b feature/my-feature

# Create from develop
git checkout -b feature/my-feature origin/develop

# Push to GitHub
git push -u origin feature/my-feature

# Create pull request
gh pr create --title "My PR" --body "Description"
```

### Commit Patterns

```bash
# Edge Function changes
git commit -m "feat: add auth edge function"
git commit -m "fix: handle edge function error"

# Database migration
git commit -m "db: add users table"
git commit -m "db: add index to email column"

# Other changes
git commit -m "chore: update dependencies"
git commit -m "docs: update CI/CD guide"
```

### Push Patterns

```bash
# Push to develop (triggers staging deployment)
git push origin develop

# Push to main (triggers production deployment)
git push origin main

# Force push (rarely needed, be careful!)
git push -f origin branch-name
```

---

## Monitoring & Debugging

### Check Workflow Logs

```bash
# Stream latest logs
gh run list --repo OWNER/REPO --limit 1 | head -1 | awk '{print $7}' | xargs -I {} gh run view {} --log

# Save logs to file
gh run view RUN_ID --log > workflow.log

# View specific step
gh run view RUN_ID --step STEP_NAME --log
```

### Monitor Deployments

```bash
# Watch deployment status
gh deployment-status DEPLOYMENT_ID

# List recent deployments
gh deployment list --repo OWNER/REPO

# View deployment environment
gh deployment status --repo OWNER/REPO --deployment DEPLOYMENT_ID
```

### Check Health

```bash
# Verify all secrets are set
gh secret list

# Check branch protection rules
gh repo view OWNER/REPO --json branchProtectionRules

# View repository settings
gh repo view OWNER/REPO
```

---

## Troubleshooting Commands

### Verify Setup

```bash
# Check GitHub CLI is authenticated
gh auth status

# List repositories
gh repo list

# View current repository
gh repo view
```

### Test Connectivity

```bash
# Test Supabase connectivity
curl https://YOUR_PROJECT.supabase.co/rest/v1/

# Test API key
curl -H "apikey: YOUR_ANON_KEY" https://YOUR_PROJECT.supabase.co/rest/v1/

# Check Vercel deployment
curl https://your-app.vercel.app
```

### Debug Scripts

```bash
# Run scripts with debug output
DEBUG=* npm run build

# Run with verbose npm
npm install --verbose

# Check for permission issues
ls -la .github/workflows/
```

---

## Common Tasks Summary

### Deploy Edge Function
```bash
git add supabase/functions/
git commit -m "feat: add function"
git push origin main
# Automatic deployment to production
```

### Run Database Migration
```bash
git add migrations/
git commit -m "db: add migration"
git push origin main
# Automatic deployment to production with backup
```

### Check Security Scans
```bash
gh run view RUN_ID --log | grep -A 20 "Security"
# Or view in GitHub: Security > Code scanning alerts
```

### Clear Cache
```bash
gh actions-cache list | awk '{print $1}' | xargs -I {} gh actions-cache delete {}
```

### View Deployment Status
```bash
gh run list --repo OWNER/REPO --limit 5
gh run view RUN_ID
```

---

## Environment Variables

### Build Environment

```bash
NODE_OPTIONS="--max-old-space-size=8192"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

### Development Environment

```bash
SUPABASE_PROJECT_ID="your-project-id"
SUPABASE_ACCESS_TOKEN="your-access-token"
VERCEL_TOKEN="your-vercel-token"
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Add secret | `gh secret set NAME --body "value"` |
| View secrets | `gh secret list` |
| View workflows | `gh run list --repo OWNER/REPO` |
| View logs | `gh run view RUN_ID --log` |
| Clear cache | `gh actions-cache delete KEY` |
| Create migration | `cat > migrations/NNN_name.sql << 'EOF'` |
| Deploy function | `git push origin main` |
| Check status | `gh run list --limit 5` |

---

## Resources

- GitHub CLI: `gh help`
- GitHub CLI Docs: https://cli.github.com/manual
- Supabase CLI: `supabase help`
- Deno Docs: https://deno.com/manual
- Vercel CLI: https://vercel.com/docs/cli

---

**Last Updated:** January 9, 2024
**For Questions:** See CI_CD_IMPROVEMENTS.md or check GitHub Actions logs
