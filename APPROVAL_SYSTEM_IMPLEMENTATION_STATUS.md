# User Approval System - Implementation Status

**Date**: December 24, 2025
**Status**: Phase 1 & 2 Complete (Ready for Testing)

## ✅ Completed Work

### Phase 1: Database Schema & Triggers

#### Migration 144: Add Approval Status Fields
**File**: `supabase/migrations/144_add_user_approval_system.sql`

**Changes**:
- Created `approval_status` enum type with values: `pending`, `approved`, `rejected`
- Added columns to `users` table:
  - `approval_status` (enum, default 'approved')
  - `approved_by` (UUID reference to users)
  - `approved_at` (timestamp)
  - `rejected_by` (UUID reference to users)
  - `rejected_at` (timestamp)
  - `rejection_reason` (text)
- Created performance indexes:
  - `idx_users_approval_status_pending` - For querying pending users
  - `idx_users_approval_status` - For all approval statuses
  - `idx_users_approved_by` - For admin audit queries
- Added check constraint `check_approval_consistency` to ensure data integrity
- Backfilled existing users with 'approved' status

**Status**: ✅ Created, ⏳ Not pushed to remote yet

---

#### Migration 145: Update Signup Trigger
**File**: `supabase/migrations/145_update_signup_trigger_for_approval.sql`

**Changes**:
- Updated `handle_new_user()` trigger function with approval workflow logic:
  - **New company**: Creates company, sets user as 'owner', `approval_status='approved'`, `is_active=true`
  - **Existing company**: User gets `approval_status='pending'`, `is_active=false`, `role='field_employee'`
- Improved company name matching: case-insensitive and trimmed
- Sets `approved_by` and `approved_at` for auto-approved users (new company owners)

**Logic Flow**:
```
User Signs Up
    ↓
Extract company_name from metadata
    ↓
Check if company exists (LOWER(TRIM(name)) match)
    ↓
    ├─ Company NOT found → Create company
    │                      → Set: approved, active, owner role
    │                      → Grant immediate access
    │
    └─ Company found → Set: pending, inactive, field_employee role
                       → Requires admin approval
```

**Status**: ✅ Created, ⏳ Not pushed to remote yet

---

#### Migration 146: Update RLS Policies
**File**: `supabase/migrations/146_update_rls_for_pending_users.sql`

**Changes**:
- **Pending users CAN**:
  - View their own profile
  - View their company info
  - Update their own profile (non-approval fields)

- **Pending users CANNOT**:
  - Create projects, daily reports, tasks, documents
  - View other users' data
  - Access most protected resources

- **Admin/Owner users CAN**:
  - View all users in their company (including pending)
  - Update approval status of users in their company

- Created helper function `is_active_user()` for reusable active user checks

**Updated Policies**:
- `users` table: Own profile view, admin company-wide view, admin approval updates
- `companies` table: Own company view (including pending users)
- `projects` table: Requires active users
- `daily_reports` table: Requires active users
- `tasks` table: Requires active users
- `documents` table: Requires active users

**Status**: ✅ Created, ⏳ Not pushed to remote yet

---

### Phase 2: Backend API (Edge Functions)

#### Edge Function: get-pending-users
**File**: `supabase/functions/get-pending-users/index.ts`

**Purpose**: Fetch pending users for admin approval dashboard

**Authorization**: Admin or Owner role required

**Features**:
- Validates user is active and has admin/owner role
- Returns pending users for caller's company only
- Returns: id, email, first_name, last_name, role, created_at, approval_status
- Orders by created_at (newest first)
- CORS enabled

**Response Format**:
```json
{
  "pendingUsers": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "field_employee",
      "created_at": "2025-12-24T...",
      "approval_status": "pending"
    }
  ]
}
```

**Status**: ✅ Created, ⏳ Not deployed yet

---

#### Edge Function: approve-user
**File**: `supabase/functions/approve-user/index.ts`

**Purpose**: Approve a pending user and grant system access

**Authorization**: Admin or Owner role required

**Features**:
- Validates admin is active and has permission
- Verifies user is in same company
- Verifies user is in 'pending' status
- Updates user:
  - `approval_status='approved'`
  - `is_active=true`
  - `approved_by=<admin_id>`
  - `approved_at=<current_timestamp>`
- Sends email notification to user (via send-email function)
- Email template: 'user-approved'

**Request Format**:
```json
{
  "userId": "uuid-of-user-to-approve"
}
```

**Response Format**:
```json
{
  "success": true,
  "message": "User approved successfully",
  "userId": "uuid"
}
```

**Status**: ✅ Created, ⏳ Not deployed yet

---

#### Edge Function: reject-user
**File**: `supabase/functions/reject-user/index.ts`

**Purpose**: Reject a pending user and deny system access

**Authorization**: Admin or Owner role required

**Features**:
- Same validation as approve-user
- Updates user:
  - `approval_status='rejected'`
  - `is_active=false`
  - `rejected_by=<admin_id>`
  - `rejected_at=<current_timestamp>`
  - `rejection_reason=<optional_reason>`
- Sends email notification to user (via send-email function)
- Email template: 'user-rejected'
- User remains in database for audit trail

**Request Format**:
```json
{
  "userId": "uuid-of-user-to-reject",
  "reason": "Optional rejection reason"
}
```

**Response Format**:
```json
{
  "success": true,
  "message": "User rejected successfully",
  "userId": "uuid"
}
```

**Status**: ✅ Created, ⏳ Not deployed yet

---

## ⏳ Remaining Work

### Phase 3: Email Templates
- [x] ✅ `user-approved` template - Embedded in approve-user edge function
- [x] ✅ `user-rejected` template - Embedded in reject-user edge function
- [ ] `user-approval-request` template - Email to admin when user requests to join (optional)

**Note**: Email templates have been implemented directly within the edge functions using inline HTML/text generators. This approach is more maintainable and keeps template logic close to the sending logic.

### Phase 4: Frontend Components
- [ ] Update `CompanyRegistration.tsx` - Connect to real API
- [ ] Update `PendingApproval.tsx` - Real data and auto-refresh
- [ ] Update `AdminApprovalDashboard.tsx` - Real API integration
- [ ] Update `AuthContext.tsx` - Add `isPending` status
- [ ] Update `ProtectedRoute.tsx` - Handle pending user routing
- [ ] Update `App.tsx` - Update routing configuration
- [ ] Create `user-approvals.ts` API service

### Phase 5: Email Notifications
- [ ] Create `on-user-created` edge function - Trigger emails on signup
- [ ] Set up database webhook for user creation
- [ ] Update `notification-service.ts` - Add approval notification methods

---

## 🧪 Testing Instructions

### Prerequisites
1. Supabase project with migrations up to 143 applied
2. Docker Desktop running (for local testing) OR access to remote Supabase database
3. At least one existing company in the database

### Step 1: Apply Migrations

**Option A: Remote Database (Recommended)**
```bash
# First, resolve migration history conflicts
npx supabase migration repair --status reverted 20251219054835
npx supabase migration repair --status reverted 20251219065909

# Then push our new migrations
npx supabase db push
```

**Option B: Local Database** (if Docker Desktop is running)
```bash
npx supabase db reset
```

### Step 2: Verify Database Schema

Run test query to verify approval columns exist:
```sql
-- Check enum type
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status')
ORDER BY enumsortorder;
-- Expected: pending, approved, rejected

-- Check columns in users table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason');
-- Expected: All 6 columns present

-- Check helper function
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'is_active_user';
-- Expected: is_active_user
```

### Step 3: Deploy Edge Functions

```bash
# Deploy all three functions
npx supabase functions deploy get-pending-users
npx supabase functions deploy approve-user
npx supabase functions deploy reject-user
```

### Step 4: Test New Company Registration

**Test Case 1: New Company (Should get immediate approval)**

1. Sign up with a new company name (e.g., "Test Company ABC")
2. Check user record in database:
```sql
SELECT id, email, company_id, role, is_active, approval_status, approved_at
FROM users
WHERE email = 'your-test-email@example.com';
```

**Expected Results**:
- `role` = 'owner'
- `is_active` = true
- `approval_status` = 'approved'
- `approved_at` is set
- `approved_by` = user's own id
- User can access dashboard immediately

### Step 5: Test Existing Company Registration

**Test Case 2: Existing Company (Should require approval)**

1. Sign up with an existing company name (use exact name from previous test)
2. Check user record in database:
```sql
SELECT id, email, company_id, role, is_active, approval_status
FROM users
WHERE email = 'second-user@example.com';
```

**Expected Results**:
- `role` = 'field_employee'
- `is_active` = false
- `approval_status` = 'pending'
- `approved_at` is null
- User should see pending approval screen (when frontend is connected)

### Step 6: Test Edge Functions

**Set up environment variables**:
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export AUTH_TOKEN="your-jwt-token"  # Get from Supabase auth
```

**Test get-pending-users**:
```bash
curl -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/functions/v1/get-pending-users"
```

Expected: JSON with pending users array

**Test approve-user**:
```bash
curl -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<pending-user-id>"}' \
  "$SUPABASE_URL/functions/v1/approve-user"
```

Expected: `{"success": true, "message": "User approved successfully"}`

Verify in database:
```sql
SELECT is_active, approval_status, approved_at, approved_by
FROM users
WHERE id = '<pending-user-id>';
```
Expected: `is_active=true`, `approval_status='approved'`

**Test reject-user**:
```bash
curl -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<pending-user-id>", "reason":"Test rejection"}' \
  "$SUPABASE_URL/functions/v1/reject-user"
```

Expected: `{"success": true, "message": "User rejected successfully"}`

Verify in database:
```sql
SELECT is_active, approval_status, rejected_at, rejected_by, rejection_reason
FROM users
WHERE id = '<pending-user-id>';
```
Expected: `is_active=false`, `approval_status='rejected'`, `rejection_reason='Test rejection'`

### Step 7: Test RLS Policies

**As pending user** (get JWT for pending user):
```sql
-- Should succeed (view own profile)
SELECT * FROM users WHERE id = auth.uid();

-- Should succeed (view own company)
SELECT * FROM companies WHERE id = (SELECT company_id FROM users WHERE id = auth.uid());

-- Should fail (create project)
INSERT INTO projects (name, company_id) VALUES ('Test', '<company-id>');
-- Expected error: RLS policy violation
```

**As admin user**:
```sql
-- Should succeed (view pending users)
SELECT * FROM users WHERE company_id = '<my-company-id>' AND approval_status = 'pending';

-- Should succeed (update approval status)
UPDATE users SET approval_status = 'approved', is_active = true WHERE id = '<pending-user-id>';
```

---

## 🔍 Verification Checklist

- [ ] Migration 144 applied successfully
- [ ] Migration 145 applied successfully
- [ ] Migration 146 applied successfully
- [ ] `approval_status` enum exists with 3 values
- [ ] Users table has 6 new approval columns
- [ ] `is_active_user()` function exists
- [ ] New company signup creates 'approved' owner
- [ ] Existing company signup creates 'pending' field_employee
- [ ] Pending users can view own profile
- [ ] Pending users cannot create projects/reports
- [ ] Admins can view pending users in their company
- [ ] get-pending-users edge function works
- [ ] approve-user edge function works
- [ ] reject-user edge function works
- [ ] Email notifications triggered (after Phase 3)

---

## 📊 Migration Status

| Migration | Description | Local | Remote | Status |
|-----------|-------------|-------|--------|--------|
| 144 | Add approval status fields | ✅ | ❌ | Ready to push |
| 145 | Update signup trigger | ✅ | ❌ | Ready to push |
| 146 | Update RLS policies | ✅ | ❌ | Ready to push |

## 🚀 Next Steps

### Completed:
- ✅ Migration history conflicts repaired (migrations 20251219054835 and 20251219065909 marked as reverted)

### Immediate Actions Required:

#### 1. Manual Migration Application (Required)
Since automated push is encountering conflicts, apply migrations manually through Supabase SQL Editor:

**Method A: Via Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → SQL Editor
2. Open and execute each migration file in order:
   - [supabase/migrations/144_add_user_approval_system.sql](supabase/migrations/144_add_user_approval_system.sql)
   - [supabase/migrations/145_update_signup_trigger_for_approval.sql](supabase/migrations/145_update_signup_trigger_for_approval.sql)
   - [supabase/migrations/146_update_rls_for_pending_users.sql](supabase/migrations/146_update_rls_for_pending_users.sql)
3. After applying each migration, mark it in schema_migrations:
   ```sql
   INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
   VALUES('144', '144_add_user_approval_system.sql', ARRAY[]::text[]);

   INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
   VALUES('145', '145_update_signup_trigger_for_approval.sql', ARRAY[]::text[]);

   INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
   VALUES('146', '146_update_rls_for_pending_users.sql', ARRAY[]::text[]);
   ```

**Method B: Via CLI with Token**
```bash
# Set your Supabase access token (get from https://app.supabase.com/account/tokens)
$env:SUPABASE_ACCESS_TOKEN="your-token-here"

# Then try push again
npx supabase db push --include-all
```

#### 2. Login to Supabase CLI
```bash
# Interactive login (open terminal manually)
npx supabase login

# OR set access token (get from https://app.supabase.com/account/tokens)
$env:SUPABASE_ACCESS_TOKEN="your-token-here"
```

#### 3. Deploy Edge Functions
```bash
npx supabase functions deploy get-pending-users
npx supabase functions deploy approve-user
npx supabase functions deploy reject-user
```

#### 4. Verify Schema Applied
Run verification query in Supabase SQL Editor:
```sql
-- Should return: pending, approved, rejected
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status')
ORDER BY enumsortorder;

-- Should return 6 columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_reason');
```

#### 5. Test Approval Workflow
Follow testing instructions in Step 4-7 below

### Long-term Actions:

5. **Continue with Phase 3** (Email templates)
6. **Continue with Phase 4** (Frontend components)
7. **Continue with Phase 5** (Email notifications)

---

## 📝 Notes

- All existing users have been backfilled with `approval_status='approved'` for backward compatibility
- Rejected users remain in the database for audit trail (not soft-deleted)
- Edge functions include comprehensive error handling and logging
- RLS policies ensure pending users have minimal access until approved
- Company name matching is case-insensitive and whitespace-trimmed to prevent duplicates
