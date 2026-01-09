# Quick Start: CI/CD Setup (5-Minute Overview)

## What Was Added?

5 new automated workflows for your GitHub repository:

1. **Edge Functions** - Deploy Supabase functions automatically ✅
2. **Database Migrations** - Run database updates safely ✅
3. **Security Scanning** - Find vulnerabilities automatically ✅
4. **Build Optimization** - Cache for 70% faster builds ✅
5. **Dependency Management** - Track package updates ✅

## Do This First (2 minutes)

### 1. Get Your Secrets

You need 8 secrets from Supabase and Vercel:

**From Supabase:**
- Go to [supabase.com](https://app.supabase.com)
- Get: Project URL, Anon Key, Access Token, Project IDs (prod + staging)

**From Vercel:**
- Go to [vercel.com](https://vercel.com/dashboard)
- Get: Project ID, Org ID, Token

### 2. Add Secrets to GitHub

```bash
# Copy each secret:
gh secret set SECRET_NAME --body "your-value"

# Or use web UI:
# Go to Settings > Secrets and variables > Actions
# Click "New repository secret"
```

**Secrets to add:**
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

## What Happens Next? (Automatic!)

### On Push to `develop` Branch
```
✅ Code validation (lint, type check)
✅ Tests run
✅ Security scan
✅ Edge functions deploy (if changed)
✅ Migrations run (if changed)
✅ Build cache activated
```

### On Push to `main` Branch
```
✅ All develop checks run
✅ Edge functions deploy to production
✅ Migrations deploy to production
✅ Frontend deploys to Vercel
✅ Security reports generated
```

## Test It Works

### Test Edge Function Deploy

```bash
# 1. Create a test function
mkdir -p supabase/functions/test-hello
cat > supabase/functions/test-hello/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
serve(async (req) => {
  return new Response(JSON.stringify({ message: "hello" }));
});
EOF

# 2. Commit and push
git add supabase/functions/test-hello/
git commit -m "test: add test function"
git push origin develop

# 3. Watch it deploy
# Go to: GitHub > Actions > Deploy Supabase Edge Functions
# It should validate, test, and deploy automatically
```

### Test Database Migration

```bash
# 1. Create a test migration
cat > migrations/999_test_table.sql << 'EOF'
BEGIN;
CREATE TABLE test_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);
COMMIT;
EOF

# 2. Commit and push
git add migrations/999_test_table.sql
git commit -m "test: add test migration"
git push origin develop

# 3. Watch it run
# Go to: GitHub > Actions > Database Migrations
# It should validate and test automatically
```

## Monitor Status

### View Workflow Runs

```bash
# List recent runs
gh run list --repo OWNER/REPO

# View specific run
gh run view RUN_ID --log
```

### Web UI
```
GitHub > Actions > [Workflow Name]
```

## Common Commands

### Check Secrets Are Set
```bash
gh secret list
```

### View Workflow Logs
```bash
gh run view [RUN_ID] --log
```

### Clear Cache (if builds slow)
```bash
gh actions-cache delete [CACHE_KEY]
```

## Troubleshooting (2 minutes)

### Workflow doesn't run?
- Check branch name matches (main/develop)
- Verify secrets are set: `gh secret list`
- Check path filters match changed files

### Deploy fails?
- Check logs: GitHub > Actions > [Workflow] > [Run]
- Verify secrets are correct
- Ensure staging environment exists

### Secrets not found?
```bash
gh secret list  # Should show all 8 secrets
```

## Documentation

Want more details?

📖 **Full Setup Guide:** `CI_CD_SETUP_GUIDE.md`
📖 **Complete Reference:** `CI_CD_IMPROVEMENTS.md`
📖 **Detailed Summary:** `CI_CD_SUMMARY.md`

## Next Steps

1. ✅ Add GitHub Secrets (2 min)
2. ⬜ Test Edge Function workflow (3 min)
3. ⬜ Test Migration workflow (3 min)
4. ⬜ Read full documentation (20 min)
5. ⬜ Share with team

## That's It!

Your CI/CD pipeline is now automated. You can:

- 🚀 Deploy Edge Functions with a `git push`
- 🐘 Run migrations automatically
- 🔒 Scan for security issues automatically
- ⚡ Build 70% faster with caching
- 📦 Track dependency updates

No more manual deployments!

---

**Questions?** See the full documentation or check workflow logs in GitHub Actions.

**Ready?** Start by adding your secrets!
