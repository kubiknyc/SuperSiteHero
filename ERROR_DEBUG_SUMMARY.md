# Console Error Debug Summary

## Executive Summary

Three categories of errors identified in the Supabase construction management app:
1. **Storage bucket missing** - "documents" bucket not created
2. **Database query errors** - Malformed query and missing RPC function
3. **500 Internal Server Error** - RLS policy or database function issue

---

## Error 1: Upload Error - Bucket Not Found

### Error Details
```
Upload error: Error: Upload failed: Bucket not found
  at fileUtils.ts:124:13
  at DocumentUpload.tsx:129:29
  at DocumentUpload.tsx:205
```

### Root Cause
The storage bucket "documents" does not exist in the Supabase storage configuration.

**Evidence:**
1. `fileUtils.ts` line 124 throws error when bucket doesn't exist:
   ```typescript
   if (error) {
     throw new Error(`Upload failed: ${error.message}`)
   }
   ```

2. `DocumentUpload.tsx` line 129 calls `uploadFile` with bucket name "documents":
   ```typescript
   const { publicUrl } = await uploadFile(
     selectedFile,
     projectId,
     'documents',  // <- This bucket doesn't exist
     (progress) => setUploadProgress(progress)
   )
   ```

3. Migration analysis shows:
   - Migration `025_checklist_storage_buckets.sql` creates `checklist-photos` and `checklist-signatures` buckets
   - Migration `037_message_attachments_storage.sql` creates `message-attachments` bucket
   - Migration `004_document_management.sql` creates document tables BUT does NOT create storage bucket
   - **No migration creates the "documents" storage bucket**

### Recommended Fix

**Option 1: Create migration to add documents bucket**

Create `c:\Users\Eli\Documents\git\supabase\migrations\055_create_documents_storage_bucket.sql`:

```sql
-- Migration: Create documents storage bucket
-- Created: 2025-12-06
-- Purpose: Create Supabase Storage bucket for document file uploads

-- =====================================================
-- CREATE STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket, access controlled by RLS
  52428800,  -- 50MB file size limit
  ARRAY[
    -- Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- Text files
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS POLICIES FOR DOCUMENTS BUCKET
-- =====================================================

-- Policy 1: Users can upload documents to their projects
CREATE POLICY "Users can upload documents to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id::text = (storage.foldername(name))[1]  -- Project ID is first folder
      AND pu.user_id = auth.uid()
  )
);

-- Policy 2: Users can view documents from their projects
CREATE POLICY "Users can view documents from their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id::text = (storage.foldername(name))[1]
      AND pu.user_id = auth.uid()
  )
);

-- Policy 3: Users can delete documents from their projects
CREATE POLICY "Users can delete documents from their projects"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id::text = (storage.foldername(name))[1]
      AND pu.user_id = auth.uid()
  )
);

-- Policy 4: Users can update documents in their projects
CREATE POLICY "Users can update documents in their projects"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM project_users pu
    WHERE pu.project_id::text = (storage.foldername(name))[1]
      AND pu.user_id = auth.uid()
  )
);
```

**Option 2: Quick fix via Supabase Dashboard**
1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Name: `documents`
4. Public: No (unchecked)
5. File size limit: 50MB
6. Allowed MIME types: Add all document types from above
7. Add RLS policies via SQL editor using policy definitions above

---

## Error 2: 400 Bad Request - Approval Requests Query

### Error Details
```
400 Bad Request
GET /rest/v1/approval_requests?select=*,u1:name%2Cemail%2Cavatar_u...
```

### Root Cause
The query string contains an invalid alias format `u1:name` which is not valid Supabase PostgREST syntax.

**Evidence:**
1. The URL-decoded query appears to be: `select=*,u1:name,email,avatar_u...`
2. This is malformed - should use proper relationship syntax
3. Correct syntax from `approval-requests.ts` lines 41-46:
   ```typescript
   initiator:users!approval_requests_initiated_by_fkey(
     id,
     full_name,
     email,
     avatar_url
   )
   ```

**Analysis:**
The error suggests client-side code is constructing a query with `u1:name` alias, but this syntax is not found in the current codebase. This could be:
- Old cached code in browser
- Third-party library generating queries
- React Query cache with stale query

### Recommended Fix

**Step 1: Clear browser cache and React Query cache**
```typescript
// In your app, temporarily add this to clear React Query cache
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()
queryClient.clear() // Clear all cached queries
```

**Step 2: Verify the query being sent**
Check browser DevTools Network tab to see exact query being sent. If still malformed, search codebase for where approval_requests queries are constructed.

**Step 3: Check if using old API version**
The query format suggests it might be using an older API client. Verify all imports use the current `approval-requests.ts` service.

**Prevention:**
Add request logging in `useApprovalRequests` hook to catch malformed queries:

```typescript
// In src/features/approvals/hooks/useApprovalRequests.ts
export function useApprovalRequests(filters?: ApprovalRequestFilters) {
  return useQuery({
    queryKey: ['approval-requests', filters],
    queryFn: async () => {
      try {
        console.log('[DEBUG] Fetching approval requests with filters:', filters)
        const result = await approvalRequestsApi.getRequests(filters)
        console.log('[DEBUG] Approval requests result:', result)
        return result
      } catch (error) {
        console.error('[DEBUG] Approval requests error:', error)
        return []
      }
    },
    retry: false,
  })
}
```

---

## Error 3: 400 Bad Request - get_total_unread_count RPC

### Error Details
```
400 Bad Request
POST /rest/v1/rpc/get_total_unread_count
```

### Root Cause
The RPC function `get_total_unread_count` exists in migration `029_messaging_system.sql` (line 232) but may not be properly created or granted permissions.

**Evidence:**
1. Function definition exists at `029_messaging_system.sql:232-249`:
   ```sql
   CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID)
   RETURNS INTEGER AS $$
   ...
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. Permission grant exists at line 459:
   ```sql
   GRANT EXECUTE ON FUNCTION get_total_unread_count(UUID) TO authenticated;
   ```

3. Function is called from `messaging.ts:931-934`:
   ```typescript
   const { data: count, error: rpcError } = await db.rpc(
     'get_total_unread_count',
     { p_user_id: userId }
   )
   ```

**Possible Issues:**
- Migration 029 not applied to database
- Function exists but with wrong signature
- Permission not granted properly
- Schema mismatch (function in public schema, call expects different schema)

### Recommended Fix

**Step 1: Verify migration applied**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM supabase_migrations.schema_migrations
WHERE version = '029'
ORDER BY version;
```

**Step 2: Verify function exists**
```sql
-- Check if function exists
SELECT
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_total_unread_count';
```

**Step 3: Verify permissions**
```sql
-- Check function permissions
SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_total_unread_count';
```

**Step 4: Re-create function if needed**
If function doesn't exist, apply migration 029 or manually run:
```sql
CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER := 0;
  v_conv RECORD;
BEGIN
  FOR v_conv IN
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = p_user_id
      AND left_at IS NULL
  LOOP
    v_total := v_total + get_unread_message_count(p_user_id, v_conv.conversation_id);
  END LOOP;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_total_unread_count(UUID) TO authenticated;
```

**Note:** This function also depends on `get_unread_message_count` function existing.

---

## Error 4: 500 Internal Server Error - conversation_participants

### Error Details
```
500 Internal Server Error
GET /rest/v1/conversation_participants?...st_read_at&user_id=eq.b7f15...
```

### Root Cause
A 500 error indicates a server-side database error, likely one of:
1. RLS policy causing infinite recursion
2. Malformed RLS policy query
3. Missing dependent table or function
4. Data type mismatch

**Evidence:**
1. The query is filtering by `user_id=eq.b7f15...` which should be valid
2. Migration 029 creates `conversation_participants` table (lines 54-65)
3. Table has RLS enabled (needs to check migration for policies)

**Analysis:**
The error occurs when fetching conversation participants. Common causes:
- RLS policy with circular reference
- Missing index on user_id causing timeout
- Foreign key constraint violation in data
- Invalid data in conversation_participants table

### Recommended Fix

**Step 1: Check RLS policies**
```sql
-- View all policies on conversation_participants
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'conversation_participants';
```

**Step 2: Check for problematic data**
```sql
-- Look for invalid user_id references
SELECT cp.*, u.id as user_exists
FROM conversation_participants cp
LEFT JOIN users u ON u.id = cp.user_id
WHERE u.id IS NULL
LIMIT 10;

-- Check for invalid conversation_id references
SELECT cp.*, c.id as conversation_exists
FROM conversation_participants cp
LEFT JOIN conversations c ON c.id = cp.conversation_id
WHERE c.id IS NULL
LIMIT 10;
```

**Step 3: Check PostgreSQL logs**
```sql
-- In Supabase Dashboard, go to Database > Logs
-- Look for errors around the timestamp of the 500 error
-- Common issues:
-- - "infinite recursion detected"
-- - "permission denied for table"
-- - "column does not exist"
```

**Step 4: Temporary fix - Disable RLS to test**
```sql
-- TEMPORARY ONLY - for debugging
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;

-- If this fixes the issue, the problem is in RLS policies
-- Re-enable and fix policies:
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
```

**Step 5: Review and fix RLS policies**
Based on migration 029, the table should have policies. Check if they're correctly defined and don't cause recursion. The policies should look like:

```sql
-- Example correct policy
CREATE POLICY "Users can view their own participations"
ON conversation_participants
FOR SELECT
USING (user_id = auth.uid());

-- NOT like this (causes recursion):
CREATE POLICY "Bad policy with recursion"
ON conversation_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.user_id = auth.uid()  -- Circular reference!
  )
);
```

---

## Prevention Recommendations

### 1. Migration Completeness Check
Create a script to verify all required storage buckets exist:

```typescript
// scripts/verify-storage-buckets.ts
import { supabase } from '@/lib/supabase'

const REQUIRED_BUCKETS = [
  'documents',
  'message-attachments',
  'checklist-photos',
  'checklist-signatures'
]

async function verifyBuckets() {
  const { data: buckets, error } = await supabase.storage.listBuckets()

  if (error) {
    console.error('Error listing buckets:', error)
    return
  }

  const existingBucketNames = buckets.map(b => b.name)
  const missingBuckets = REQUIRED_BUCKETS.filter(
    name => !existingBucketNames.includes(name)
  )

  if (missingBuckets.length > 0) {
    console.error('Missing storage buckets:', missingBuckets)
  } else {
    console.log('All required storage buckets exist')
  }
}

verifyBuckets()
```

### 2. Better Error Handling
Update `uploadFile` to provide more specific error messages:

```typescript
// In fileUtils.ts
export async function uploadFile(...) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, ...)

    if (error) {
      // More specific error messages
      if (error.message.includes('not found')) {
        throw new Error(
          `Storage bucket "${bucketName}" does not exist. Please contact support.`
        )
      }
      throw new Error(`Upload failed: ${error.message}`)
    }
    ...
  } catch (error) {
    throw error
  }
}
```

### 3. Add Health Check Endpoint
Create a health check that verifies:
- All storage buckets exist
- All RPC functions are callable
- All tables have proper RLS policies

### 4. Migration Validation
Before deploying, run migration verification:
```bash
# Check all migrations applied
supabase db diff --schema public,storage

# Verify no missing migrations
supabase migration list
```

---

## Summary of Actions Required

### Immediate Actions (High Priority)
1. **Create "documents" storage bucket** - Either via migration or Dashboard
2. **Apply RLS policies for documents bucket** - User must have project access
3. **Verify migration 029 applied** - Check conversation_participants and RPC functions exist
4. **Check RLS policies on conversation_participants** - Look for recursion or errors

### Investigation Required
1. **Find source of malformed approval_requests query** - Check browser cache, old code
2. **Review PostgreSQL logs** - Identify exact cause of 500 error
3. **Verify all migrations applied in correct order** - Run migration verification

### Testing After Fixes
1. Test document upload in app
2. Test approval requests page loads
3. Test messaging unread count displays
4. Test conversation participants query

---

## Files Referenced

### Source Files
- `c:\Users\Eli\Documents\git\src\features\documents\utils\fileUtils.ts` - Line 124
- `c:\Users\Eli\Documents\git\src\features\documents\components\DocumentUpload.tsx` - Lines 129, 205
- `c:\Users\Eli\Documents\git\src\features\approvals\hooks\useApprovalRequests.ts` - Lines 22-33
- `c:\Users\Eli\Documents\git\src\lib\api\services\approval-requests.ts` - Lines 29-99
- `c:\Users\Eli\Documents\git\src\lib\api\services\messaging.ts` - Lines 884-973

### Migration Files
- `c:\Users\Eli\Documents\git\supabase\migrations\004_document_management.sql` - Documents table (no bucket)
- `c:\Users\Eli\Documents\git\supabase\migrations\025_checklist_storage_buckets.sql` - Example bucket creation
- `c:\Users\Eli\Documents\git\supabase\migrations\029_messaging_system.sql` - Messaging tables and RPC functions
- `c:\Users\Eli\Documents\git\supabase\migrations\037_message_attachments_storage.sql` - Example bucket creation
- `c:\Users\Eli\Documents\git\supabase\migrations\040_fix_missing_columns_typescript_errors.sql` - Added full_name column

---

## Next Steps

1. Create and apply migration 055 for documents bucket (see fix above)
2. Run database verification queries to check migration 029 status
3. Review PostgreSQL logs for exact 500 error details
4. Test each fix incrementally and verify resolution
5. Add monitoring/health checks to prevent future issues
