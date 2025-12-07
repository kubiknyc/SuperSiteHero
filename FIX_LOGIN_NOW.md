# 🔧 Fix Login Issue - Quick Steps

## Problem
After registering, you get "Invalid credentials" error when trying to log in.

## Root Cause
✅ **CONFIRMED**: The auto-create trigger is missing from your database.

When you sign up:
- ✅ Supabase creates the auth user
- ❌ No profile is created in `public.users` table
- ❌ Login fails because app expects a profile

---

## 🚀 Solution: Apply Migration 044

### **Option 1: Automated (Windows)**
```bash
scripts\apply-migration-044.bat
```
This will:
1. Copy the SQL to your clipboard
2. Open Supabase SQL Editor
3. You paste and click "Run"

### **Option 2: Manual Steps**

1. **Copy the migration SQL**
   - Open: `migrations\044_enable_auto_user_creation.sql`
   - Copy all contents (Ctrl+A, Ctrl+C)

2. **Go to Supabase SQL Editor**
   - Dashboard → SQL Editor
   - Click "New query"

3. **Paste and run**
   - Paste the SQL (Ctrl+V)
   - Click **"Run"** button

4. **Verify success**
   Look for output showing:
   ```
   ✓ trigger created
   ✓ user counts displayed
   ```

---

## 📝 What This Migration Does

1. **Creates a trigger function** (`handle_new_user`)
   - Automatically creates user profile when someone signs up
   - Assigns them to your existing company
   - Sets default role as 'field_employee'

2. **Creates the trigger** (`on_auth_user_created`)
   - Fires after INSERT on `auth.users`
   - Calls the function above

3. **Backfills existing users**
   - If you already registered, it creates your profile retroactively
   - You'll see: "Created profile for user: your@email.com"

---

## ✅ After Migration

### Test It:

**Option A: Try logging in with existing account**
If you already registered, the backfill script created your profile, so try logging in now.

**Option B: Register fresh account**
1. Clear browser data (localStorage)
2. Sign up with a NEW email
3. Try logging in immediately
4. Should work! 🎉

---

## 🚨 Still Not Working?

### Check Email Confirmation

Supabase might require email verification:

1. Go to: **Supabase Dashboard → Authentication → Providers**
2. Click **Email** provider
3. **Disable "Confirm email"** (for development)
4. Save

Then try logging in again.

### Alternative: Check Your Email

If email confirmation is enabled:
- Check your inbox for Supabase verification email
- Click the verification link
- Then try logging in

---

## 🔍 Verify It Worked

Run diagnostic again:
```bash
npx tsx scripts/diagnose-auth-issue.ts
```

Should show:
```
✅ Trigger exists
📊 Public users count: 1 (or more)
```

---

## 📞 Need More Help?

See [LOGIN_DEBUG_GUIDE.md](LOGIN_DEBUG_GUIDE.md) for comprehensive troubleshooting.
