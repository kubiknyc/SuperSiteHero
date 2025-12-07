# Sync TypeScript Types from Supabase Schema

Automatically generate and update TypeScript types from your Supabase database schema.

## Task

Update the `src/types/database.ts` file to match the current Supabase database schema.

## Instructions

1. **Generate Types from Supabase**
   ```bash
   # Using Supabase CLI (if installed)
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database-generated.ts

   # Or use Supabase Studio SQL Editor to export schema
   ```

2. **Review Generated Types**
   - Check for any new tables
   - Verify enum types match database constraints
   - Ensure all columns are included
   - Check nullable vs non-nullable fields

3. **Update Helper Types**
   - Ensure `CreateInput<T>` omits: id, created_at, updated_at
   - Ensure `UpdateInput<T>` makes all fields optional except id
   - Add `WithRelations<T, R>` if not present

4. **Add Missing Enums**
   Extract enum types from database and define them in TypeScript:
   ```typescript
   export type UserRole =
     | 'superintendent'
     | 'project_manager'
     | 'office_admin'
     | 'field_employee'
     | 'subcontractor'
     | 'architect'

   export type ProjectStatus =
     | 'planning'
     | 'active'
     | 'on_hold'
     | 'completed'
     | 'cancelled'
   ```

5. **Verify Database Interface Structure**
   ```typescript
   export interface Database {
     public: {
       Tables: {
         table_name: {
           Row: TableType
           Insert: Omit<TableType, 'id' | 'created_at' | 'updated_at'>
           Update: Partial<Omit<TableType, 'id'>>
         }
       }
     }
   }
   ```

6. **Run Type Check**
   ```bash
   npm run type-check
   ```

7. **Fix Type Errors**
   - Update any hooks using outdated types
   - Fix component props
   - Update API calls

## Common Issues

### Missing company_id
Every table should have `company_id` for multi-tenant isolation:
```typescript
export interface TableName {
  id: string
  company_id: string  // ← Ensure this exists
  // ... other fields
}
```

### Incorrect Nullable Types
Check database schema for NULL constraints:
```typescript
// If database allows NULL
field: string | null

// If database has NOT NULL constraint
field: string
```

### JSON Types
For JSON/JSONB columns:
```typescript
settings: Json  // Use the Json helper type
preferences: { [key: string]: any }  // Or specific interface
```

## After Syncing Types

1. **Update Existing Features**
   - Check if any hooks need type updates
   - Verify mutations use correct Insert/Update types
   - Update component props

2. **Test CRUD Operations**
   - Create operations use correct fields
   - Update operations handle optional fields
   - Queries return expected types

3. **Document Changes**
   - Note any breaking changes
   - Update CLAUDE.md if type patterns change
   - Update inline comments for complex types

## Automation (Future)

Consider adding a pre-commit hook to check for type drift:
```json
// package.json
{
  "scripts": {
    "sync-types": "supabase gen types typescript --project-id $PROJECT_ID > src/types/database.ts",
    "precommit": "npm run sync-types && npm run type-check"
  }
}
```

## Manual Sync Checklist

When manually updating types:
- [ ] Check Supabase dashboard for schema changes
- [ ] Copy table definitions
- [ ] Add to Database['public']['Tables']
- [ ] Define Row interface
- [ ] Add Insert/Update types
- [ ] Extract enums
- [ ] Update helper types if needed
- [ ] Run type-check
- [ ] Fix any errors in consuming code
- [ ] Test affected features
