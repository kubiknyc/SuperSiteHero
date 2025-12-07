# 403 Project Creation Error - Complete Fix Summary

## ✅ Root Cause Identified

**Your application code is 100% correct!**

The issue is in the **Supabase database RLS policies**. Two migration files exist to fix this but haven't been applied yet.

## 🎯 The Fix (Choose One Method)

### Option 1: Quick Fix (Recommended - 5 minutes)

Follow the step-by-step instructions in:
**→ [FIX_403_ERROR_INSTRUCTIONS.md](FIX_403_ERROR_INSTRUCTIONS.md)**

This file contains:
- ✅ Copy-paste SQL for both migrations
- ✅ Verification queries
- ✅ Step-by-step instructions
- ✅ Troubleshooting tips

### Option 2: Apply Migration Files Directly

Apply these two files in Supabase SQL Editor:
1. `supabase/migrations/046_fix_projects_insert_policy.sql`
2. `supabase/migrations/047_fix_users_select_policy_recursion.sql`

### Option 3: Diagnostic First (If unsure)

Run the diagnostic script to check your database state:
1. Open `scripts/diagnose-403-error.sql`
2. Replace `'your-email@example.com'` with your email
3. Run in Supabase SQL Editor
4. Review the diagnostic output
5. Follow recommended fixes

## 📝 What's Wrong?

### Problem 1: Overly Permissive INSERT Policy
Current policy (from migration 018):
```sql
CREATE POLICY "Authenticated users can insert projects"
  WITH CHECK (auth.uid() IS NOT NULL);
```

**Issues**:
- ❌ Allows inserting ANY company_id (breaks multi-tenant isolation)
- ❌ Doesn't validate company_id matches user's company
- ❌ Causes 403 when validation fails

**Fix** (Migration 046):
- ✅ Validates user is authenticated
- ✅ Validates company_id is not NULL
- ✅ Validates company_id matches user's company
- ✅ Enforces proper multi-tenant isolation

### Problem 2: RLS Recursion
Current users SELECT policy:
```sql
USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
```

**Issues**:
- ❌ Subquery causes infinite recursion
- ❌ Performance problems
- ❌ Unpredictable 403 errors

**Fix** (Migration 047):
- ✅ Creates SECURITY DEFINER function to bypass RLS
- ✅ No more recursion
- ✅ Better performance
- ✅ Reliable policy evaluation

## 🔧 What the Migrations Do

### Migration 046: Fix Projects INSERT Policy
1. Drops the overly permissive policy
2. Creates new policy that validates:
   - User is authenticated
   - company_id is provided
   - company_id matches user's company
3. Enforces multi-tenant isolation

### Migration 047: Fix Users SELECT Recursion
1. Creates `auth.user_company_id()` function (bypasses RLS)
2. Creates `auth.user_role()` function (for role checks)
3. Updates users SELECT policy to use function instead of subquery
4. Allows users to always see their own record

## ⚡ Quick Start

**If you just want to fix it fast:**

1. Open: [FIX_403_ERROR_INSTRUCTIONS.md](FIX_403_ERROR_INSTRUCTIONS.md)
2. Follow the copy-paste instructions
3. Total time: **5 minutes**

**If you want to understand the issue first:**

1. Open: `scripts/diagnose-403-error.sql`
2. Run the diagnostic
3. Review the output
4. Apply the recommended fix

## 📊 Before vs After

### Before (Current State)
- ❌ 403 Forbidden on project creation
- ❌ RLS policy blocks valid inserts
- ❌ RLS recursion causes performance issues
- ❌ Multi-tenant isolation is weak

### After (With Migrations Applied)
- ✅ Projects create successfully
- ✅ Proper multi-tenant isolation
- ✅ No RLS recursion
- ✅ Better performance
- ✅ Users can only create projects for their company

## 🎯 Success Checklist

After applying the fix:
- [ ] Migration 046 applied successfully
- [ ] Migration 047 applied successfully
- [ ] Verified policies with verification query
- [ ] Logged out and logged back in
- [ ] Tested project creation - **works!**
- [ ] No 403 error

## 📁 File Reference

**Fix Instructions**:
- `FIX_403_ERROR_INSTRUCTIONS.md` ← **START HERE**

**Migration Files**:
- `supabase/migrations/046_fix_projects_insert_policy.sql`
- `supabase/migrations/047_fix_users_select_policy_recursion.sql`

**Diagnostic**:
- `scripts/diagnose-403-error.sql`

**Application Code** (no changes needed):
- `src/features/projects/components/CreateProjectDialog.tsx` ✅
- `src/features/projects/hooks/useProjectsMutations.ts` ✅
- `src/lib/api/services/projects.ts` ✅

## 💡 Key Insight

The 403 error is NOT a code bug - it's a database configuration issue. Your application correctly includes `company_id` in every project creation request. The database RLS policies just need to be updated to properly validate and allow these inserts.

## ⏱️ Timeline

- **Read this file**: 2 minutes
- **Apply migrations**: 3 minutes
- **Test fix**: 1 minute
- **Total**: ~6 minutes

## 🚀 Next Steps

1. **Read**: [FIX_403_ERROR_INSTRUCTIONS.md](FIX_403_ERROR_INSTRUCTIONS.md)
2. **Apply**: The two SQL migrations
3. **Test**: Create a project
4. **Success!** 🎉

---

**Need Help?**
- Check the troubleshooting section in `FIX_403_ERROR_INSTRUCTIONS.md`
- Run the diagnostic script to see what's missing
- Verify your user has a `company_id` assigned

---

**Last Updated**: 2025-12-04
**Status**: Solution Ready
**Impact**: High Priority (blocks project creation)
**Difficulty**: Easy (copy-paste SQL)
**Time**: 5-6 minutes
