# Backup and Restore Procedures

**Last Updated:** December 7, 2025

This document outlines backup and restore procedures for JobSight.

---

## Overview

JobSight uses:
- **Supabase** for database and file storage
- **Vercel** for application hosting
- **GitHub** for source code

---

## Database Backup

### Automatic Backups (Supabase)

Supabase provides automatic daily backups on Pro plans and above.

**Retention:**
- Pro plan: 7 days
- Team plan: 14 days
- Enterprise: Custom

**To view backups:**
1. Go to Supabase Dashboard
2. Select your project
3. Navigate to **Settings > Database > Backups**

### Manual Database Backup

#### Using Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Create backup (dumps to local file)
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql --linked

# For data only (no schema)
supabase db dump -f data_backup_$(date +%Y%m%d).sql --data-only --linked

# For schema only (no data)
supabase db dump -f schema_backup_$(date +%Y%m%d).sql --schema-only --linked
```

#### Using pg_dump directly

```bash
# Get connection string from Supabase Dashboard > Settings > Database
# Use the "Connection string" (URI format)

pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Scheduled Backup Script

Create `scripts/backup-database.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/path/to/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Create backup
supabase db dump -f "$BACKUP_DIR/backup_$DATE.sql" --linked

# Compress backup
gzip "$BACKUP_DIR/backup_$DATE.sql"

# Remove backups older than retention period
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

**Schedule with cron (daily at 2 AM):**
```bash
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

---

## Storage Backup

### Supabase Storage Buckets

Supabase Storage doesn't have automatic backups. Use these methods:

#### Using Supabase CLI

```bash
# List buckets
supabase storage ls --linked

# Download all files from a bucket
supabase storage cp -r "ss://bucket-name/*" ./backup/storage/ --linked
```

#### Using S3-compatible tools

```bash
# Supabase Storage is S3-compatible
# Get credentials from Supabase Dashboard > Settings > API

# Using AWS CLI
aws s3 sync s3://your-bucket ./backup/storage/ \
  --endpoint-url https://[PROJECT-REF].supabase.co/storage/v1/s3

# Using rclone
rclone sync supabase:bucket-name ./backup/storage/
```

---

## Application Backup

### Source Code

Source code is backed up via Git:

```bash
# Clone full repository with all branches
git clone --mirror https://github.com/your-org/JobSight.git backup-repo.git

# Or create a bundle
git bundle create JobSight_$(date +%Y%m%d).bundle --all
```

### Vercel Configuration

Export Vercel project settings:

```bash
# Install Vercel CLI
npm i -g vercel

# Export project configuration
vercel project ls --json > vercel_projects_backup.json
vercel env ls --json > vercel_env_backup.json
```

---

## Database Restore

### From Supabase Backup (Pro+ plans)

1. Go to Supabase Dashboard
2. Navigate to **Settings > Database > Backups**
3. Click **Restore** next to desired backup
4. Confirm restoration

**Warning:** This replaces all current data!

### From Manual Backup

#### Full Restore (Schema + Data)

```bash
# Connect to database and restore
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  < backup_20251207.sql

# If compressed
gunzip -c backup_20251207.sql.gz | psql "postgresql://..."
```

#### Data Only Restore

```bash
# First, truncate existing data (careful!)
psql "postgresql://..." -c "TRUNCATE table1, table2, table3 CASCADE;"

# Then restore data
psql "postgresql://..." < data_backup_20251207.sql
```

#### Selective Table Restore

```bash
# Extract specific table from backup
grep -A 9999 "COPY public.projects" backup.sql | \
  grep -B 9999 "^\\\\.$" > projects_only.sql

# Restore single table
psql "postgresql://..." < projects_only.sql
```

### Using Supabase CLI

```bash
# Reset database to backup state
supabase db reset --linked

# Apply backup
psql "$(supabase db url --linked)" < backup_20251207.sql
```

---

## Storage Restore

### From Local Backup

```bash
# Upload files back to Supabase Storage
supabase storage cp -r ./backup/storage/* "ss://bucket-name/" --linked
```

### Using S3 tools

```bash
aws s3 sync ./backup/storage/ s3://your-bucket/ \
  --endpoint-url https://[PROJECT-REF].supabase.co/storage/v1/s3
```

---

## Application Restore

### Revert to Previous Deployment (Vercel)

1. Go to Vercel Dashboard
2. Select your project
3. Navigate to **Deployments**
4. Find the deployment to restore
5. Click **...** > **Promote to Production**

### Restore from Git Bundle

```bash
# Clone from bundle
git clone JobSight_20251207.bundle restored-repo

# Or restore mirror
git clone --mirror backup-repo.git restored-repo.git
```

---

## Disaster Recovery Procedures

### Complete System Recovery

1. **Restore Database**
   ```bash
   # Get latest backup
   LATEST_BACKUP=$(ls -t backups/*.sql.gz | head -1)

   # Restore to Supabase
   gunzip -c $LATEST_BACKUP | psql "postgresql://..."
   ```

2. **Restore Storage**
   ```bash
   supabase storage cp -r ./backup/storage/* "ss://bucket-name/" --linked
   ```

3. **Verify Application**
   - Check Vercel deployment status
   - Run smoke tests
   - Verify critical flows

4. **DNS Verification**
   - Ensure DNS points to Vercel
   - Check SSL certificate validity

### Partial Data Recovery

For recovering specific records accidentally deleted:

1. **Identify affected records** from backup
2. **Extract specific data:**
   ```bash
   # Extract INSERT statements for specific table
   grep "INSERT INTO public.projects" backup.sql > projects_inserts.sql
   ```
3. **Review and apply** selectively

---

## Backup Verification

### Weekly Verification Checklist

- [ ] Verify automatic backup ran (check Supabase Dashboard)
- [ ] Test download of latest backup
- [ ] Verify backup file integrity (not corrupted)
- [ ] Check backup file size (shouldn't decrease significantly)

### Monthly Restore Test

1. Create a test Supabase project
2. Restore latest backup to test project
3. Run verification queries:
   ```sql
   SELECT COUNT(*) FROM projects;
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM daily_reports;
   -- Compare with production counts
   ```
4. Document results

---

## Backup Monitoring

### Alerts to Configure

1. **Backup job failed** - If scheduled backup doesn't complete
2. **Backup size anomaly** - If backup size changes >20%
3. **Storage quota** - If backup storage exceeds 80%

### Monitoring Script

```bash
#!/bin/bash
# Check backup health

BACKUP_DIR="/path/to/backups"
MIN_SIZE_MB=100  # Expected minimum backup size

# Check latest backup exists
LATEST=$(ls -t $BACKUP_DIR/*.sql.gz | head -1)
if [ -z "$LATEST" ]; then
    echo "ALERT: No backup found!"
    exit 1
fi

# Check backup age
AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST")) / 3600 ))
if [ $AGE_HOURS -gt 25 ]; then
    echo "ALERT: Latest backup is $AGE_HOURS hours old!"
    exit 1
fi

# Check backup size
SIZE_MB=$(( $(stat -c %s "$LATEST") / 1048576 ))
if [ $SIZE_MB -lt $MIN_SIZE_MB ]; then
    echo "ALERT: Backup size ($SIZE_MB MB) below minimum ($MIN_SIZE_MB MB)!"
    exit 1
fi

echo "OK: Backup healthy - $LATEST ($SIZE_MB MB, $AGE_HOURS hours old)"
```

---

## Contact Information

| Role | Contact | Responsibility |
|------|---------|----------------|
| Database Admin | dba@company.com | Database backups, restores |
| DevOps | devops@company.com | Infrastructure, automation |
| On-call | oncall@company.com | Emergency response |

---

**Document Owner:** DevOps Team
**Review Cycle:** Quarterly
**Last Tested:** [Date of last restore test]
