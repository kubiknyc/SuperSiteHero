# Rollback Procedures

**Last Updated:** December 7, 2025

This document outlines rollback procedures for JobSight when issues are detected in production.

---

## Quick Reference

| Scenario | Rollback Method | Time to Complete |
|----------|-----------------|------------------|
| Bad deployment | Vercel instant rollback | < 1 minute |
| Database migration issue | SQL rollback script | 5-30 minutes |
| Configuration error | Vercel env update + redeploy | 2-5 minutes |
| Complete system failure | Full restore from backup | 30-60 minutes |

---

## Application Rollback (Vercel)

### Instant Rollback via Dashboard

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select the **JobSight** project
3. Navigate to **Deployments**
4. Find the last known good deployment
5. Click the **...** menu
6. Select **Promote to Production**
7. Confirm the promotion

**The rollback takes effect immediately.**

### Rollback via CLI

```bash
# List recent deployments
vercel ls JobSight

# Get deployment URL of last good version
# Format: JobSight-xxxxx.vercel.app

# Promote specific deployment to production
vercel promote [deployment-url] --yes

# Or by deployment ID
vercel promote dpl_xxxxxxxxxxxxx --yes
```

### Rollback via GitHub

If the issue was introduced by a specific commit:

```bash
# Revert the problematic commit
git revert [commit-hash]

# Push the revert
git push origin main

# This triggers automatic deployment of the reverted code
```

---

## Database Rollback

### Migration Rollback

Each migration should have a corresponding rollback script.

**Location:** `supabase/migrations/rollback/`

#### Example: Rollback Migration 068

```sql
-- File: supabase/migrations/rollback/068_payment_applications_rollback.sql

-- Drop new tables (in reverse order of dependencies)
DROP TABLE IF EXISTS payment_application_items CASCADE;
DROP TABLE IF EXISTS payment_applications CASCADE;

-- Drop new types
DROP TYPE IF EXISTS payment_application_status CASCADE;

-- Remove any functions added
DROP FUNCTION IF EXISTS calculate_payment_retention CASCADE;
```

#### Execute Rollback

```bash
# Connect to database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Run rollback script
\i supabase/migrations/rollback/068_payment_applications_rollback.sql

# Verify rollback
\dt  -- List tables to confirm removal
```

### Partial Data Rollback

For rolling back specific data changes:

```sql
-- Example: Revert status changes made today
UPDATE projects
SET status = 'active'
WHERE updated_at >= CURRENT_DATE
  AND status = 'archived';

-- Example: Restore deleted records from audit log
INSERT INTO projects (id, name, ...)
SELECT id, name, ...
FROM audit_log
WHERE table_name = 'projects'
  AND action = 'DELETE'
  AND created_at >= NOW() - INTERVAL '1 hour';
```

### Full Database Rollback

For critical issues requiring complete database restore:

```bash
# 1. Put application in maintenance mode
# (Update Vercel env or deploy maintenance page)

# 2. Create backup of current state (for investigation)
supabase db dump -f pre_rollback_$(date +%Y%m%d_%H%M%S).sql --linked

# 3. Restore from last known good backup
gunzip -c backups/backup_20251206_020000.sql.gz | \
  psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 4. Verify data integrity
psql "postgresql://..." -c "SELECT COUNT(*) FROM projects;"
psql "postgresql://..." -c "SELECT COUNT(*) FROM users;"

# 5. Remove maintenance mode
# (Revert Vercel env or redeploy)
```

---

## Configuration Rollback

### Environment Variables (Vercel)

1. Go to Vercel Dashboard > Project > Settings > Environment Variables
2. Edit the problematic variable
3. Change value back to previous (check Git history or documentation)
4. Save changes
5. Redeploy:
   ```bash
   vercel --prod
   ```

### Feature Flag Rollback

If using feature flags:

```typescript
// Disable problematic feature immediately
// In your feature flag service or Supabase

UPDATE feature_flags
SET enabled = false
WHERE flag_name = 'new_problematic_feature';
```

---

## Rollback Decision Tree

```
Issue Detected
     │
     ├── Is it a UI/frontend bug?
     │   └── YES → Vercel instant rollback
     │
     ├── Is it a database schema issue?
     │   └── YES → Run migration rollback SQL
     │
     ├── Is it a data corruption issue?
     │   └── YES → Restore from backup
     │
     ├── Is it a configuration issue?
     │   └── YES → Revert env vars, redeploy
     │
     └── Is it a feature behavior issue?
         └── YES → Disable feature flag OR rollback code
```

---

## Pre-Rollback Checklist

Before rolling back, complete this checklist:

- [ ] **Identify the issue** - What exactly is broken?
- [ ] **Identify the cause** - Which deployment/change caused it?
- [ ] **Assess impact** - How many users affected?
- [ ] **Notify stakeholders** - Alert team, update status page
- [ ] **Document current state** - Screenshot errors, save logs
- [ ] **Choose rollback strategy** - Code, database, or both?
- [ ] **Prepare verification** - How will you confirm rollback worked?

---

## Post-Rollback Checklist

After rolling back:

- [ ] **Verify fix** - Confirm the issue is resolved
- [ ] **Monitor closely** - Watch error rates for 30 minutes
- [ ] **Update status page** - Mark incident as resolved
- [ ] **Notify stakeholders** - Confirm resolution
- [ ] **Create incident report** - Document what happened
- [ ] **Schedule post-mortem** - Plan follow-up meeting
- [ ] **Create fix branch** - Start working on proper fix

---

## Rollback Scripts Repository

Maintain rollback scripts for each migration:

```
supabase/migrations/rollback/
├── 001_initial_rollback.sql
├── 002_users_rollback.sql
├── ...
├── 068_payment_applications_rollback.sql
├── 069_lien_waivers_rollback.sql
└── 070_fix_cost_estimates_security_rollback.sql
```

### Creating Rollback Scripts

For every new migration, create a corresponding rollback:

```sql
-- Migration: 071_new_feature.sql
CREATE TABLE new_feature (...);
ALTER TABLE existing_table ADD COLUMN new_col TEXT;

-- Rollback: rollback/071_new_feature_rollback.sql
ALTER TABLE existing_table DROP COLUMN IF EXISTS new_col;
DROP TABLE IF EXISTS new_feature CASCADE;
```

---

## Emergency Contacts

| Role | Contact | When to Escalate |
|------|---------|------------------|
| On-call Engineer | oncall@company.com | First response |
| Tech Lead | techlead@company.com | Complex issues |
| Database Admin | dba@company.com | Data issues |
| CTO | cto@company.com | Major outages |

---

## Incident Severity Levels

| Level | Description | Response Time | Rollback? |
|-------|-------------|---------------|-----------|
| P1 | System down, all users affected | < 15 min | Immediate |
| P2 | Major feature broken, many users | < 1 hour | Yes |
| P3 | Minor feature broken, few users | < 4 hours | Consider |
| P4 | Cosmetic issue | Next business day | No |

---

## Common Rollback Scenarios

### Scenario 1: New Feature Breaks Login

```bash
# 1. Identify last working deployment
vercel ls JobSight | head -5

# 2. Rollback immediately
vercel promote [last-good-deployment-url] --yes

# 3. Verify login works
curl -I https://JobSight.com/login
```

### Scenario 2: Migration Causes Data Issues

```bash
# 1. Stop new writes (maintenance mode)
# 2. Document affected data
psql "..." -c "SELECT * FROM affected_table WHERE condition LIMIT 100" > affected_data.csv

# 3. Run rollback migration
psql "..." -f supabase/migrations/rollback/070_rollback.sql

# 4. Verify schema is correct
psql "..." -c "\d affected_table"

# 5. Resume operations
```

### Scenario 3: Environment Variable Misconfigured

```bash
# 1. Identify correct value (check git history, docs)
git log -p -- .env.example | grep VITE_SUPABASE_URL

# 2. Update in Vercel dashboard
# Or via CLI:
vercel env rm VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_URL production

# 3. Redeploy
vercel --prod
```

---

**Document Owner:** DevOps Team
**Review Cycle:** Quarterly
**Last Drill:** [Date of last rollback drill]
