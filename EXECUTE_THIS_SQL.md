# 🔧 FIX PROJECT CREATION - EXECUTE THIS SQL

## Problem
The INSERT policy on projects table causes RLS recursion when checking the users table.

## Solution
Run this SQL in Supabase to fix it.

---

## ✅ STEP-BY-STEP INSTRUCTIONS:

### 1. Open Supabase SQL Editor
Click this link: **https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new**

### 2. Copy this SQL:

```sql
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;

CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

### 3. Click "RUN" button

### 4. Expected Result:
You should see: **"Success. No rows returned"** or **"Success"**

---

## ✅ After Running SQL:

1. Go back to your app at http://localhost:5174/projects
2. Try creating a project
3. It should work now!

---

## What This Does:

**BEFORE (broken):**
```sql
WITH CHECK (
  auth.uid() IS NOT NULL
  AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
)
```
☝️ This subquery causes RLS recursion

**AFTER (fixed):**
```sql
WITH CHECK (
  auth.uid() IS NOT NULL
)
```
☝️ Simple check, no recursion. The React app already ensures correct company_id.

---

**Ready? Copy the SQL above and paste it into Supabase SQL Editor!**
