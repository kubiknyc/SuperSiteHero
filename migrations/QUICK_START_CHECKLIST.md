# Quick Start Checklist

Use this checklist to set up your database step-by-step.

## ☐ Phase 1: Supabase Setup (10 minutes)

- [ ] Go to https://supabase.com
- [ ] Click "Start your project"
- [ ] Sign up / Log in
- [ ] Click "New Project"
- [ ] Choose organization (or create one)
- [ ] Enter project details:
  - [ ] Name: "construction-management" (or your choice)
  - [ ] Database Password: (save this securely!)
  - [ ] Region: Choose closest to you
- [ ] Click "Create new project"
- [ ] Wait for provisioning (~2 minutes)
- [ ] ✅ Project ready!

## ☐ Phase 2: Save Project Credentials (5 minutes)

Once project is ready:

- [ ] Click "Settings" (gear icon in sidebar)
- [ ] Click "API"
- [ ] Copy and save the following:
  - [ ] Project URL: `https://xxxxx.supabase.co`
  - [ ] `anon` `public` key (for frontend)
  - [ ] `service_role` `secret` key (for backend/admin - **keep secret!**)
- [ ] Click "Database" under Settings
- [ ] Note connection string (for direct PostgreSQL access if needed)
- [ ] ✅ Credentials saved!

## ☐ Phase 3: Run Migrations (20-30 minutes)

### 3.1: Navigate to SQL Editor

- [ ] Click "SQL Editor" in left sidebar
- [ ] Click "New query"

### 3.2: Run Each Migration File

Run these **in order**, one at a time:

#### ☐ Migration 001: Initial Setup
- [ ] Open `001_initial_setup.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click "Run" (or Ctrl+Enter)
- [ ] Wait for: `Migration 001_initial_setup completed successfully`
- [ ] ✅ Migration 001 done!

#### ☐ Migration 002: Core Tables
- [ ] Open `002_core_tables.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Wait for: `Migration 002_core_tables completed successfully`
- [ ] ✅ Migration 002 done!

#### ☐ Migration 003: Contacts & Subcontractors
- [ ] Open `003_contacts_and_subcontractors.sql`
- [ ] Copy → Paste → Run
- [ ] Wait for success message
- [ ] ✅ Migration 003 done!

#### ☐ Migration 004: Document Management
- [ ] Open `004_document_management.sql`
- [ ] Copy → Paste → Run
- [ ] Wait for success message
- [ ] ✅ Migration 004 done!

#### ☐ Migration 005: Daily Reports
- [ ] Open `005_daily_reports.sql`
- [ ] Copy → Paste → Run
- [ ] Wait for success message
- [ ] ✅ Migration 005 done!

#### ☐ Migration 006: Workflows
- [ ] Open `006_workflows.sql`
- [ ] Copy → Paste → Run
- [ ] Wait for success message
- [ ] ✅ Migration 006 done!

#### ☐ Migration 007: Tasks & Checklists
- [ ] Open `007_tasks_and_checklists.sql`
- [ ] Copy → Paste → Run
- [ ] Wait for success message
- [ ] ✅ Migration 007 done!

#### ☐ Migration 008: Punch Lists & Safety
- [ ] Open `008_punch_and_safety.sql`
- [ ] Copy → Paste → Run
- [ ] Wait for success message
- [ ] ✅ Migration 008 done!

#### ☐ Migration 009: Inspections, Permits, Tests
- [ ] Open `009_inspections_permits_tests.sql`
- [ ] Copy → Paste → Run
- [ ] Wait for success message
- [ ] ✅ Migration 009 done!

#### ☐ Migration 010: Additional Features
- [ ] Open `010_additional_features.sql`
- [ ] Copy → Paste → Run
- [ ] Wait for success message
- [ ] ✅ Migration 010 done!

#### ☐ Migration 011: Photos, Takeoff, Communication
- [ ] Open `011_photos_takeoff_communication.sql`
- [ ] Copy → Paste → Run
- [ ] Wait for success message
- [ ] ✅ Migration 011 done!

#### ☐ Migration 012: RLS Policies
- [ ] Open `012_rls_policies.sql`
- [ ] Copy → Paste → Run
- [ ] Wait for success message
- [ ] ✅ Migration 012 done!

### 3.3: Verify All Tables Created

- [ ] In SQL Editor, run this query:
```sql
SELECT count(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
```
- [ ] Result should show: **42 tables**
- [ ] ✅ All tables verified!

## ☐ Phase 4: Set Up Storage Buckets (5 minutes)

- [ ] In SQL Editor, run:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('documents', 'documents', false),
  ('photos', 'photos', false),
  ('drawings', 'drawings', false),
  ('reports', 'reports', false);
```
- [ ] Click "Run"
- [ ] Click "Storage" in sidebar to verify buckets created
- [ ] Should see 4 buckets: documents, photos, drawings, reports
- [ ] ✅ Storage buckets created!

## ☐ Phase 5: Configure Authentication (5 minutes)

- [ ] Click "Authentication" in sidebar
- [ ] Click "Providers"
- [ ] Verify "Email" is enabled (should be by default)
- [ ] Optional: Configure email templates
  - [ ] Click "Email Templates"
  - [ ] Customize confirmation email (optional)
- [ ] Click "URL Configuration"
  - [ ] Set Site URL: `http://localhost:5173` (for development)
  - [ ] Add Redirect URLs: `http://localhost:5173/**`
- [ ] ✅ Auth configured!

## ☐ Phase 6: Test Database Connection (10 minutes)

### Create test script:

- [ ] Create file: `test-db.js`
- [ ] Add this code:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Testing Supabase connection...')

  // Test 1: Check companies table
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .limit(1)

  if (companiesError) {
    console.error('❌ Companies table error:', companiesError)
  } else {
    console.log('✅ Companies table accessible')
  }

  // Test 2: Check projects table
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .limit(1)

  if (projectsError) {
    console.error('❌ Projects table error:', projectsError)
  } else {
    console.log('✅ Projects table accessible')
  }

  console.log('Connection test complete!')
}

testConnection()
```

- [ ] Replace `YOUR_SUPABASE_URL` and `YOUR_ANON_KEY`
- [ ] Run: `npm install @supabase/supabase-js`
- [ ] Run: `node test-db.js`
- [ ] Should see: ✅ messages
- [ ] ✅ Database connection working!

## ☐ Phase 7: Optional - Create Test Company & User (10 minutes)

### In SQL Editor:

- [ ] Run this to create test company:
```sql
INSERT INTO companies (name, slug, email)
VALUES ('Test Construction Co', 'test-construction', 'test@example.com')
RETURNING id;
```
- [ ] Copy the returned ID

- [ ] Create test user via Supabase Auth:
  - [ ] Go to "Authentication" → "Users"
  - [ ] Click "Add user" → "Create new user"
  - [ ] Email: `test@example.com`
  - [ ] Password: `TestPassword123!`
  - [ ] Auto Confirm User: ✅ (checked)
  - [ ] Click "Create user"
  - [ ] Copy the user ID

- [ ] Link user to company (in SQL Editor):
```sql
INSERT INTO users (id, company_id, email, first_name, last_name, role)
VALUES (
  'PASTE_USER_ID_HERE',
  'PASTE_COMPANY_ID_HERE',
  'test@example.com',
  'Test',
  'User',
  'superintendent'
);
```

- [ ] ✅ Test user created!

## ☐ Phase 8: Next Steps

You're now ready to start building the frontend!

- [ ] Review `database-schema.md` for table details
- [ ] Review `masterplan.md` for feature specs
- [ ] Set up React project (if not done)
- [ ] Install Supabase client in React
- [ ] Build authentication flow
- [ ] Start building UI components

---

## 🎉 Congratulations!

Your database is fully set up and ready to use!

**Total Time**: ~60-90 minutes

**What You've Accomplished**:
- ✅ Created Supabase project
- ✅ Ran 12 migrations (42 tables)
- ✅ Set up Row-Level Security
- ✅ Configured Storage buckets
- ✅ Set up Authentication
- ✅ Tested database connection
- ✅ Created test data

**Next**: Start building your Construction Management Platform frontend!

---

## 🆘 Troubleshooting

### ❌ Migration Failed

**Problem**: Error during migration
**Solution**:
1. Check error message in SQL Editor
2. Verify migrations were run in order (001 → 012)
3. Check if table already exists (may need to drop and re-run)
4. Review `migrations/README.md` for common errors

### ❌ Can't Connect to Database

**Problem**: Test script fails
**Solution**:
1. Verify Project URL and API keys are correct
2. Check project is active in Supabase Dashboard
3. Ensure `@supabase/supabase-js` is installed
4. Check network connection

### ❌ Tables Not Created

**Problem**: Count shows fewer than 42 tables
**Solution**:
1. Re-run migrations that show errors
2. Check SQL Editor output for specific errors
3. Verify all 12 migrations were run completely

### Need Help?

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Review `migrations/README.md` for detailed help

---

**Checklist Version**: 1.0
**Last Updated**: 2025-01-19
