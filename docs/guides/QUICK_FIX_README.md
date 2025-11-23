# QUICK FIX: Run Migrations in Correct Order

## Problem
You got error: `relation "project_users" does not exist`

This means your Supabase database doesn't have the base tables created yet.

## Solution: Run All Migrations in Order

### Step 1: Check Current Database State

In Supabase SQL Editor, run:
```sql
-- Check if project_users table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'project_users';
```

**If it returns 0 rows**, you need to run the base migrations first.

### Step 2: Run Migrations in Order

**Option A: Run All-in-One Combined Migration (RECOMMENDED)**

I'll create a combined migration file that includes everything. Use this if you're starting fresh.

**Option B: Run Each Migration Individually**

Run these files in Supabase SQL Editor in this exact order:

1. ✅ [migrations/001_initial_setup.sql](migrations/001_initial_setup.sql)
2. ✅ [migrations/002_core_tables.sql](migrations/002_core_tables.sql) ← Creates `project_users`
3. ✅ [migrations/003_contacts_and_subcontractors.sql](migrations/003_contacts_and_subcontractors.sql)
4. ✅ [migrations/004_document_management.sql](migrations/004_document_management.sql)
5. ✅ [migrations/005_daily_reports.sql](migrations/005_daily_reports.sql)
6. ✅ [migrations/006_workflows.sql](migrations/006_workflows.sql)
7. ✅ [migrations/007_tasks_and_checklists.sql](migrations/007_tasks_and_checklists.sql)
8. ✅ [migrations/008_punch_and_safety.sql](migrations/008_punch_and_safety.sql)
9. ✅ [migrations/009_inspections_permits_tests.sql](migrations/009_inspections_permits_tests.sql)
10. ✅ [migrations/010_additional_features.sql](migrations/010_additional_features.sql)
11. ✅ [migrations/011_photos_takeoff_communication.sql](migrations/011_photos_takeoff_communication.sql)
12. ✅ [migrations/012_rls_policies.sql](migrations/012_rls_policies.sql)
13. ✅ [migrations/013_critical_security_and_performance_fixes.sql](migrations/013_critical_security_and_performance_fixes.sql) ← New security fixes

### Step 3: Verify Success

After running all migrations:

```sql
-- Check that all core tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'companies', 'users', 'projects', 'project_users',
  'workflow_items', 'change_order_bids', 'safety_incidents'
)
ORDER BY table_name;

-- Should return 7 rows

-- Check that RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'project_users';

-- Should show rowsecurity = true

-- Check that the critical index exists
SELECT indexname
FROM pg_indexes
WHERE tablename = 'project_users'
AND indexname = 'idx_project_users_user_project';

-- Should return 1 row (after running migration 013)
```

## Expected Timeline

- **Fresh database**: Run all 13 migrations → ~5 minutes
- **Existing database with tables**: Just run migration 013 → ~1 minute

## What Each Migration Does

- **001**: Helper functions (update_updated_at_column)
- **002**: Core tables (companies, users, projects, **project_users**)
- **003**: Contacts & subcontractors
- **004**: Documents & folders
- **005**: Daily reports
- **006**: Workflows (RFIs, COs, Submittals)
- **007**: Tasks & checklists
- **008**: Punch lists & safety
- **009**: Inspections, permits, tests
- **010**: Site instructions, materials, meetings
- **011**: Photos, takeoff, messages
- **012**: Basic RLS policies (incomplete - only 14 tables)
- **013**: **CRITICAL** - Complete RLS policies + performance indexes

## Next Step

Tell me:
1. **Are you starting with a fresh Supabase database?** (no tables yet)
2. **Or do you have some tables already created?** (which ones?)

Based on your answer, I'll tell you exactly which migrations to run.
