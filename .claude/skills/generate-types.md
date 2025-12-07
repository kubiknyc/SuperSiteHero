# Generate Types Skill

Generate or update TypeScript types from the Supabase database schema.

## Usage

Invoke this skill when you need to:
- Update types after database changes
- Generate types for new tables
- Sync types with database
- Fix type mismatches

## Examples

**Full type generation**:
```
Use generate-types skill to regenerate all database types
```

**Specific table**:
```
Use generate-types skill to add types for the equipment_tracking table
```

**After migration**:
```
Use generate-types skill to update types after running migration 015
```

## Execution Process

### Step 1: Generate from Supabase

**Method 1: Supabase CLI** (Preferred)
```bash
# Generate types from Supabase
npx supabase gen types typescript --project-id nxlznnrocrffnbzjaaae > src/types/database-new.ts
```

**Method 2: Use supabase-type-generator command**
```bash
# If available in your project
/supabase-type-generator --all-tables
```

### Step 2: Review Generated Types

Check the generated file:
- All tables present?
- Column types correct?
- Relationships included?
- Enums defined?

### Step 3: Merge with Existing

**Important**: Don't overwrite helper types at bottom of file!

The database.ts file has two sections:
1. Generated types (top) - Replace these
2. Helper types (bottom) - Keep these!

**Helper types to preserve**:
```typescript
// Helper types (at bottom of file)
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInput<T> = Partial<Omit<T, 'id'>>;
export type WithRelations<T, R> = T & R;
```

### Step 4: Update database.ts

1. Backup current file
2. Replace generated portion
3. Keep helper types at bottom
4. Verify imports still work

### Step 5: Verify Types

Run type check:
```bash
npm run type-check
```

Fix any errors:
- Import paths
- Type mismatches
- Missing tables

### Step 6: Update Hook Types

If table structure changed, update hooks:

```typescript
// Before
type Project = {
  id: string;
  name: string;
};

// After (use generated types)
import type { Database } from '@/types/database';
type Project = Database['public']['Tables']['projects']['Row'];
```

## Common Scenarios

### Scenario 1: New Table Added

After creating new table in migration:

1. Run type generation
2. Add new table types to database.ts
3. Create hooks using new types
4. Verify type-check passes

### Scenario 2: Column Added/Removed

After altering table structure:

1. Regenerate types
2. Update database.ts
3. Fix TypeScript errors in hooks
4. Update forms/components using affected types

### Scenario 3: Relationship Changed

After modifying foreign keys:

1. Regenerate types
2. Update join types in queries
3. Fix WithRelations usage
4. Update components displaying related data

## Type Structure

Generated database.ts structure:

```typescript
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          company_id: string;
          created_at: string;
          // ...
        };
        Insert: {
          id?: string;
          name: string;
          company_id: string;
          created_at?: string;
          // ...
        };
        Update: {
          id?: string;
          name?: string;
          company_id?: string;
          // ...
        };
      };
      // ... other tables
    };
    Views: {
      // ...
    };
    Functions: {
      // ...
    };
    Enums: {
      user_role: 'superintendent' | 'project_manager' | 'office_admin' | 'field_employee';
      project_status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
      // ...
    };
  };
}

// Helper types (preserve these!)
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInput<T> = Partial<Omit<T, 'id'>>;
export type WithRelations<T, R> = T & R;
```

## Usage in Code

### Basic Types
```typescript
import type { Database } from '@/types/database';

type Project = Database['public']['Tables']['projects']['Row'];
type InsertProject = Database['public']['Tables']['projects']['Insert'];
type UpdateProject = Database['public']['Tables']['projects']['Update'];
```

### With Helper Types
```typescript
import type { Database, CreateInput, UpdateInput } from '@/types/database';

type Project = Database['public']['Tables']['projects']['Row'];
type CreateProject = CreateInput<Project>;
type EditProject = UpdateInput<Project>;
```

### With Relations
```typescript
import type { Database, WithRelations } from '@/types/database';

type Project = Database['public']['Tables']['projects']['Row'];
type User = Database['public']['Tables']['users']['Row'];

type ProjectWithOwner = WithRelations<Project, {
  owner: User;
}>;
```

### Enum Types
```typescript
import type { Database } from '@/types/database';

type UserRole = Database['public']['Enums']['user_role'];
type ProjectStatus = Database['public']['Enums']['project_status'];
```

## Troubleshooting

### Issue: Type Generation Fails

**Solution**:
```bash
# Check Supabase CLI installed
npx supabase --version

# Verify project ID
echo $VITE_SUPABASE_URL

# Try with explicit project ID
npx supabase gen types typescript --project-id nxlznnrocrffnbzjaaae
```

### Issue: Types Don't Match Database

**Solution**:
1. Check migration was applied
2. Verify table exists in Supabase Dashboard
3. Regenerate types
4. Clear npm cache: `npm cache clean --force`

### Issue: Import Errors After Update

**Solution**:
1. Check import paths still correct
2. Verify helper types preserved
3. Update imports to use Database type
4. Run `npm run type-check`

### Issue: Old Types Cached

**Solution**:
```bash
# Restart TypeScript server
# In VS Code: Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"

# Or restart dev server
npm run dev
```

## Best Practices

1. **Always backup** before replacing database.ts
2. **Preserve helper types** at bottom of file
3. **Run type-check** after changes
4. **Update incrementally** - one table at a time if needed
5. **Document changes** - note what tables changed
6. **Test thoroughly** - verify hooks still work
7. **Commit separately** - type updates in own commit

## Automation

Consider automating with a script:

```bash
#!/bin/bash
# scripts/update-types.sh

echo "Generating types from Supabase..."
npx supabase gen types typescript --project-id nxlznnrocrffnbzjaaae > temp-types.ts

echo "Backing up current types..."
cp src/types/database.ts src/types/database.backup.ts

echo "Updating types..."
# Merge logic here

echo "Type checking..."
npm run type-check

echo "Done!"
```

## After Type Update

Checklist:
- [ ] Type generation successful
- [ ] database.ts updated
- [ ] Helper types preserved
- [ ] Type check passes
- [ ] No import errors
- [ ] Hooks still work
- [ ] Dev server runs
- [ ] Build succeeds

## Related Commands

```bash
# Type check only
npm run type-check

# Type check with details
npm run type-check -- --extendedDiagnostics

# Generate types
npx supabase gen types typescript --project-id nxlznnrocrffnbzjaaae

# Use project slash command (if available)
/supabase-type-generator --all-tables
```
