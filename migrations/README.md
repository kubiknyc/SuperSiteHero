# Database Migrations

This directory contains SQL migration files to set up the complete database schema for the Construction Management Platform.

## Overview

The migrations are organized into 12 sequential files that must be run in order:

1. **001_initial_setup.sql** - Extensions and utility functions
2. **002_core_tables.sql** - Companies, users, projects, project_users
3. **003_contacts_and_subcontractors.sql** - Contacts and subcontractors
4. **004_document_management.sql** - Folders, documents, document_markups
5. **005_daily_reports.sql** - Daily reports and related tables
6. **006_workflows.sql** - Workflow system (RFIs, COs, Submittals, etc.)
7. **007_tasks_and_checklists.sql** - Tasks, schedule, checklists
8. **008_punch_and_safety.sql** - Punch lists and safety management
9. **009_inspections_permits_tests.sql** - Inspections, permits, testing
10. **010_additional_features.sql** - Site instructions, materials, meetings, notices, site conditions, closeout
11. **011_photos_takeoff_communication.sql** - Photos, takeoff, assemblies, notifications, messages
12. **012_rls_policies.sql** - Row-Level Security policies

## Running Migrations in Supabase

### Option 1: Supabase Dashboard (SQL Editor)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of each migration file **in order**
5. Click **Run** to execute
6. Wait for success message before proceeding to next migration
7. Repeat for all 12 migrations

### Option 2: Supabase CLI (Recommended for Production)

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations in order
supabase db push --dry-run  # Preview changes
supabase db push            # Apply changes
```

### Option 3: Direct PostgreSQL Connection

If you have direct access to the PostgreSQL database:

```bash
# Run each migration in order
psql -h db.your-project.supabase.co -U postgres -d postgres -f 001_initial_setup.sql
psql -h db.your-project.supabase.co -U postgres -d postgres -f 002_core_tables.sql
# ... continue for all migrations
```

## Pre-Migration Checklist

Before running migrations:

- [ ] Create a Supabase account at https://supabase.com
- [ ] Create a new project in Supabase
- [ ] Note your project URL and anon/service keys
- [ ] Enable necessary Supabase features:
  - [ ] Authentication (Settings → Authentication)
  - [ ] Storage (Settings → Storage)
  - [ ] Realtime (optional, Settings → Realtime)
- [ ] Backup any existing data (if applicable)

## Post-Migration Steps

After running all migrations:

### 1. Verify Tables

Check that all tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see 42 tables.

### 2. Verify RLS Policies

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

### 3. Set Up Supabase Storage Buckets

Create storage buckets for files:

```sql
-- Run in Supabase SQL Editor or via Dashboard → Storage

-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('documents', 'documents', false),
  ('photos', 'photos', false),
  ('drawings', 'drawings', false),
  ('reports', 'reports', false);

-- Set up storage policies (example for photos bucket)
CREATE POLICY "Users can upload photos to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects
    WHERE id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can view photos from their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects
    WHERE id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
  )
);
```

### 4. Seed Initial Data (Optional)

You can populate default workflow types, checklist templates, and assemblies. See the `seeds/` directory (to be created separately).

### 5. Test Database Connection

Create a simple test script:

```javascript
// test-connection.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

async function testConnection() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Connection successful!')
    console.log('Data:', data)
  }
}

testConnection()
```

## Troubleshooting

### Error: "relation does not exist"

- Ensure migrations are run in the correct order (001 → 012)
- Check that previous migrations completed successfully

### Error: "permission denied"

- Verify you're using the correct credentials
- Check Supabase project settings
- Ensure RLS policies allow the operation

### Error: "column does not exist"

- Migration order issue - verify you ran all previous migrations
- Check for typos in column names

### Error: "duplicate key value violates unique constraint"

- Data already exists - check if migrations were partially run
- May need to clean up and re-run from start

## Rolling Back Migrations

If you need to undo migrations:

```sql
-- Drop all tables (CAUTION: This deletes all data!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run migrations from 001
```

For production, consider creating proper down migrations for each file.

## Migration File Structure

Each migration file follows this pattern:

```sql
-- Migration: XXX_description.sql
-- Description: What this migration does
-- Date: YYYY-MM-DD

-- Create tables with:
-- - Primary keys (UUID)
-- - Foreign keys (relationships)
-- - Indexes (performance)
-- - Triggers (updated_at automation)
-- - RLS enabled

-- Success message at end
DO $$
BEGIN
  RAISE NOTICE 'Migration XXX completed successfully';
END $$;
```

## Database Statistics

After all migrations:

- **Total Tables**: 42
- **Core Tables**: 6 (companies, users, projects, project_users, contacts, subcontractors)
- **Feature Tables**: 36 (documents, daily reports, workflows, tasks, checklists, punch lists, safety, inspections, permits, tests, site instructions, materials, meetings, notices, site conditions, closeout, photos, takeoff, assemblies, notifications, messages, etc.)
- **Junction Tables**: 3 (project_users, daily_report_safety_incidents, etc.)
- **Utility Functions**: 1 (update_updated_at_column)

## Support

If you encounter issues:

1. Check the Supabase logs (Dashboard → Logs)
2. Review the database-schema.md file for detailed table documentation
3. Consult Supabase documentation: https://supabase.com/docs
4. Check PostgreSQL documentation for SQL syntax

## Next Steps

After successfully running migrations:

1. ✅ Set up Supabase Storage buckets
2. ✅ Create seed data (workflow types, checklists, assemblies)
3. ✅ Test database connection from your app
4. ✅ Configure Supabase Auth settings
5. ✅ Set up your React frontend to connect to Supabase
6. ✅ Start building your application features!

---

**Last Updated**: 2025-01-19
**Database Version**: 1.0
**PostgreSQL Version**: 15+ (Supabase default)
