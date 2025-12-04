# Migration Instructions

This document explains how to apply pending database migrations to fix critical blockers in SuperSiteHero.

## Prerequisites

1. **Supabase CLI installed**: `npx supabase --version` should return a version
2. **Project linked**: Your local project should be linked to your Supabase project
3. **Environment variables**: `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

---

## Step 1: Check Current Migration Status

Run the diagnostic script to see which tables are missing:

```bash
npx tsx scripts/check-migration-status.ts
```

This will show you:
- Which tables exist
- Which tables are missing
- If there's a schema mismatch (e.g., `chat_*` vs `conversations` tables)

---

## Step 2: Link Your Supabase Project (if not already linked)

```bash
# Get your project ref from Supabase Dashboard > Project Settings > General
npx supabase link --project-ref <your-project-ref>
```

You'll be prompted for your database password.

---

## Step 3: Apply Migrations

### Option A: Push All Migrations (Recommended)

This applies all migrations in `supabase/migrations/` that haven't been applied:

```bash
npx supabase db push
```

### Option B: Apply Specific Migrations via SQL Editor

If you prefer to apply migrations one at a time, open your Supabase Dashboard:

1. Go to **SQL Editor**
2. Copy the contents of each migration file and run it:

**Critical migrations to apply:**

| Migration | Feature | File |
|-----------|---------|------|
| 023 | Approvals | `supabase/migrations/023_approval_workflows.sql` |
| 024 | Checklists | `supabase/migrations/024_enhanced_inspection_checklists.sql` |
| 029 | Messages | `supabase/migrations/029_messaging_system.sql` |
| 039 | Messages Enhanced | `supabase/migrations/039_enhance_messaging_system.sql` |

---

## Step 4: Regenerate TypeScript Types

After migrations are applied, regenerate the database types:

### Windows (PowerShell):
```powershell
npx supabase gen types typescript --project-id <your-project-ref> | Out-File -FilePath src/types/database.ts -Encoding utf8
```

### Mac/Linux:
```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

Or use the provided script:
```bash
# Windows
scripts\regenerate-types.bat

# Mac/Linux
chmod +x scripts/regenerate-types.sh && ./scripts/regenerate-types.sh
```

---

## Step 5: Verify the Fix

Run the check script again to verify all tables exist:

```bash
npx tsx scripts/check-migration-status.ts
```

Then run type checking:

```bash
npm run type-check
```

---

## Troubleshooting

### "relation does not exist" errors

This means a migration hasn't been applied. Check which table is missing and apply the corresponding migration.

### Schema mismatch (chat_* vs conversations)

If the check script shows:
- `conversations` - MISSING
- `chat_channels` - EXISTS (old schema)

This means an old schema is in place. The migrations (029, 039) will create the correct `conversations` model. Apply them and the code will work.

### Type errors after regeneration

After regenerating types, you may need to:

1. Restart your TypeScript server (in VS Code: Ctrl+Shift+P > "TypeScript: Restart TS Server")
2. Check if `src/types/database-extensions.ts` exists - it's a workaround that can be deleted once proper types are generated
3. Update any imports that reference the old types

---

## Migration Order

If applying manually, apply in this order:

1. `001_initial_setup.sql` through `022_complete_rls_policies.sql` (if not already applied)
2. `023_approval_workflows.sql` - Approvals feature
3. `024_enhanced_inspection_checklists.sql` - Checklists feature
4. `025_checklist_storage_buckets.sql` - Checklist photo storage
5. `026_task_dependencies.sql` through `028_safety_incidents.sql`
6. `029_messaging_system.sql` - Messaging feature
7. `030_document_ai_processing.sql` through `038_subcontractor_portal.sql`
8. `039_enhance_messaging_system.sql` - Enhanced messaging

---

## Quick Reference

```bash
# Check status
npx tsx scripts/check-migration-status.ts

# Link project
npx supabase link --project-ref <ref>

# Push all migrations
npx supabase db push

# Regenerate types
npx supabase gen types typescript --project-id <ref> > src/types/database.ts

# Verify types
npm run type-check
```

---

## Getting Your Project Reference

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Under **General**, find **Reference ID**
5. It looks like: `abcdefghijklmnop`

---

## Need Help?

If migrations fail:
1. Check the Supabase Dashboard > Logs for errors
2. Some migrations may conflict with existing data - check for constraint violations
3. You can run migrations in a transaction and rollback if needed

For schema conflicts:
1. Back up any data in the conflicting tables
2. Drop the old tables if they have no data you need
3. Apply the new migrations
