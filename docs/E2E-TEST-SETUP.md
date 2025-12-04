# E2E Test Setup Guide

## Problem Summary

The E2E tests are failing because the test user (`kubiknyc@gmail.com`) has **no projects assigned**. Without projects, most of the application features cannot be tested.

## Root Cause Analysis

1. **Authentication**: ✅ Working correctly
2. **User Profile**: ✅ Exists in `users` table with valid `company_id`
3. **Company**: ✅ Exists and is accessible
4. **Projects**: ❌ **NO PROJECTS ASSIGNED TO USER**
5. **Test Data**: ❌ Missing sample data for testing

### Why Tests Are Failing

| Module | Reason for Failure |
|--------|-------------------|
| Projects | User has no projects → empty state shown → "New Project" dialog tests fail |
| Inspections | Requires project selection → No projects available → UI elements not rendered |
| Punch Lists | Filter dropdowns show "All Projects" but list is empty → Option tests fail |
| Daily Reports | Project selector empty → Tests looking for project options fail |
| Change Orders | No projects → No change orders → Filter controls may not render |
| Drawing Markup | No projects → No drawings → All markup functionality unavailable |

## Solution Options

### Option 1: Create Projects Through UI (Recommended for Now)

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173 in browser

3. Log in with test credentials:
   - Email: `kubiknyc@gmail.com`
   - Password: `Alfa1346!`

4. Navigate to Projects page

5. Click "New Project" and create at least 2-3 test projects:
   - **Project 1**: "Downtown Office Building"
     - Project Number: `2024-001`
     - Status: Active
     - Address: 456 Main Street, New York, NY 10001

   - **Project 2**: "Residential Tower"
     - Project Number: `2024-002`
     - Status: Active
     - Address: 789 Park Avenue, New York, NY 10021

   - **Project 3**: "Shopping Mall Renovation"
     - Project Number: `2024-003`
     - Status: Planning
     - Address: 321 Commerce Drive, Brooklyn, NY 11201

### Option 2: Fix Database RLS Policies (Proper Solution)

The automated seeding script fails because of RLS policies on the `client_portal_settings` table. There's likely a database trigger that creates portal settings when a project is created, but RLS prevents it.

**Fix in Supabase Dashboard SQL Editor:**

```sql
-- Check existing RLS policies on client_portal_settings
SELECT * FROM pg_policies WHERE tablename = 'client_portal_settings';

-- Option A: Add policy to allow INSERT for authenticated users
CREATE POLICY "Allow insert for authenticated users"
ON client_portal_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Option B: Disable RLS temporarily (NOT recommended for production)
ALTER TABLE client_portal_settings DISABLE ROW LEVEL SECURITY;
```

After fixing RLS, run the seeding script:
```bash
npm run seed:test
```

### Option 3: Manual SQL Insert (Quick Fix)

Run this SQL in Supabase SQL Editor to create projects directly:

```sql
-- Get your user ID and company ID
SELECT id as user_id, company_id FROM users WHERE email = 'kubiknyc@gmail.com';

-- Replace <user-id> and <company-id> below with values from above query

-- Insert Project 1
INSERT INTO projects (
  name, project_number, description, address, city, state, zip,
  start_date, end_date, status, company_id, budget, weather_units
) VALUES (
  'Downtown Office Building',
  '2024-001',
  'Modern office complex in downtown district',
  '456 Main Street',
  'New York',
  'NY',
  '10001',
  '2024-01-15',
  '2025-06-30',
  'active',
  '<company-id>',  -- Replace this
  5000000,
  'imperial'
) RETURNING id;

-- Assign user to project (replace <project-id> with ID from above)
INSERT INTO project_users (project_id, user_id)
VALUES ('<project-id>', '<user-id>');

-- Repeat for other projects...
```

## Verification

After creating projects, verify the setup:

```bash
npm run check:test-user
```

You should see:
```
✅ Found N assigned projects:
   - Downtown Office Building (2024-001) - active
   - Residential Tower (2024-002) - active
   - Shopping Mall Renovation (2024-003) - planning
```

## Running Tests

Once projects are created:

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e:chromium -- projects.spec.ts

# Run with UI for debugging
npm run test:e2e:ui
```

## Test Data Requirements

### Minimum Data for Tests to Pass

| Feature | Required Data |
|---------|--------------|
| Projects | 2-3 active projects assigned to test user |
| Inspections | At least 1 project (inspections are optional) |
| Punch Lists | At least 1 project (punch items are optional) |
| Daily Reports | At least 1 project (reports are optional) |
| Change Orders | At least 1 project (change orders are optional) |
| Contacts | 2-3 sample contacts (automatically created by seed script) |
| RFIs | At least 1 project (RFIs are optional) |

### Why Empty State Tests Still Work

Tests are designed to handle both:
- **Empty state**: "No items yet" messages
- **Data state**: Actual items displayed

However, some tests specifically look for:
- Filter dropdowns populated with options
- Project selectors showing available projects
- Dialog opening functionality (which may be disabled when no projects exist)

## Common Issues

### Issue: "No project selector found"
**Cause**: User has no projects assigned
**Fix**: Create at least 1 project

### Issue: "Dialog not opening"
**Cause**: Button may be disabled when no prerequisite data exists
**Fix**: Ensure user has projects assigned

### Issue: "All Projects option not visible"
**Cause**: Select dropdown not rendering because no projects exist
**Fix**: Create projects first

### Issue: Tests pass locally but fail in CI
**Cause**: CI database is empty
**Fix**: Add seeding step to CI pipeline or use separate test database

## Scripts Reference

```bash
# Check test user status and diagnose issues
npm run check:test-user

# Seed test data (requires RLS fix)
npm run seed:test

# Run E2E tests with fresh seeding
npm run test:e2e:seed

# Debug specific test
npm run test:e2e:debug -- projects.spec.ts
```

## Next Steps

1. **Immediate**: Create 2-3 projects through UI (Option 1)
2. **Short-term**: Fix RLS policies to enable automated seeding (Option 2)
3. **Long-term**: Create comprehensive test fixtures and database snapshots for CI/CD

## Test User Credentials

```
Email: kubiknyc@gmail.com
Password: Alfa1346!
Company: My Construction Company (ID: 3c146527-62a9-4f4d-97db-c7546da9dfed)
User ID: ee8b7ed6-b1af-4b46-8ba1-4ea764dcdb45
```

**Security Note**: These are test credentials only. Never commit real passwords to version control.
