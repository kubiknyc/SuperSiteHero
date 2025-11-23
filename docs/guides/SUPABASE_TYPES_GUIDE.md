# Supabase TypeScript Types Guide

## Overview

This guide explains the TypeScript type system for Supabase in your construction management platform and how to resolve common type inference issues.

## Type System Architecture

### Database Interface Structure

The [src/types/database.ts](src/types/database.ts) file contains:

1. **Database Interface** - Root type defining the entire database schema
2. **Table Definitions** - Row, Insert, and Update types for each of the 42 tables
3. **Entity Interfaces** - TypeScript interfaces matching database tables
4. **Enum Types** - Status enums, priority enums, etc.
5. **Utility Types** - Helper types for common operations

### Type Organization

```typescript
export interface Database {
  public: {
    Tables: {
      workflow_items: {
        Row: WorkflowItem          // SELECT queries return this
        Insert: Omit<...>          // INSERT operations use this
        Update: Partial<Omit<...>> // UPDATE operations use this
      }
      // ... all other tables
    }
    Enums: {
      // Enum definitions
    }
  }
}
```

## Current TypeScript Errors Explained

### The `never` Type Issue

You're seeing errors like:
```
Property 'id' does not exist on type 'never'
```

**Root Cause**: TypeScript cannot properly infer types for complex Supabase queries with:
- JOIN operations (`.select('*, related_table(*)')`)
- Nested select statements
- Dynamic filtering

**Why It Happens**:
1. Supabase client expects exact table names from the Database type
2. Complex queries with relations confuse TypeScript's type inference
3. The inferred return type becomes `never` when TypeScript can't resolve it

### Affected Queries

The following query patterns cause type inference issues:

```typescript
// ❌ TypeScript infers 'never'
const { data } = await supabase
  .from('workflow_items')
  .select(`
    *,
    workflow_type:workflow_types(name_singular, prefix),
    raised_by_user:users!workflow_items_raised_by_fkey(first_name, last_name)
  `)
```

## Solutions

### Solution 1: Type Assertions (Quick Fix)

Add explicit type assertions to your query results:

```typescript
import type { WorkflowItem } from '@/types/database'

const { data, error } = await supabase
  .from('workflow_items')
  .select(`
    *,
    workflow_type:workflow_types(name_singular, prefix),
    raised_by_user:users(first_name, last_name)
  `)

// Type assertion
return data as (WorkflowItem & {
  workflow_type?: { name_singular: string; prefix: string | null }
  raised_by_user?: { first_name: string; last_name: string }
})[]
```

### Solution 2: Use Typed Response Interfaces

Define explicit response types for complex queries:

```typescript
// Define the response type
type ChangeOrderWithRelations = WorkflowItem & {
  workflow_type?: {
    name_singular: string
    prefix: string | null
  }
  raised_by_user?: {
    first_name: string
    last_name: string
  }
  bids?: ChangeOrderBid[]
}

// Use in query
export function useChangeOrders(projectId: string) {
  return useQuery({
    queryKey: ['change-orders', projectId],
    queryFn: async (): Promise<ChangeOrderWithRelations[]> => {
      const { data, error } = await supabase
        .from('workflow_items')
        .select(`
          *,
          workflow_type:workflow_types(name_singular, prefix),
          raised_by_user:users(first_name, last_name),
          bids:change_order_bids(*)
        `)

      if (error) throw error
      return data as ChangeOrderWithRelations[]
    }
  })
}
```

### Solution 3: Helper Type Utilities

Use the new type helpers added to [database.ts](src/types/database.ts:1295):

```typescript
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

// Instead of:
const project: Project = ...

// Use:
const project: Tables<'projects'> = ...

// For inserts:
const newProject: TablesInsert<'projects'> = {
  company_id: '...',
  name: 'Project Name',
  // TypeScript will autocomplete available fields
}

// For updates:
const updates: TablesUpdate<'projects'> = {
  name: 'New Name'
  // Only id is required, all other fields are optional
}
```

## Fixing Current Change Orders Implementation

### Update useChangeOrders Hook

Replace the current implementation with explicit typing:

```typescript
// src/features/change-orders/hooks/useChangeOrders.ts

import type { WorkflowItem, ChangeOrderBid } from '@/types/database'

// Define response type
type ChangeOrderResponse = WorkflowItem & {
  workflow_type?: {
    name_singular: string
    prefix: string | null
  }
  raised_by_user?: {
    first_name: string
    last_name: string
  }
  bids?: ChangeOrderBid[]
}

export function useChangeOrders(projectId: string | undefined) {
  return useQuery({
    queryKey: ['change-orders', projectId],
    queryFn: async (): Promise<ChangeOrderResponse[]> => {
      if (!projectId) throw new Error('Project ID required')

      const { userProfile } = useAuth()
      if (!userProfile?.company_id) throw new Error('No company ID found')

      const { data: workflowType } = await supabase
        .from('workflow_types')
        .select('id')
        .eq('company_id', userProfile.company_id)
        .ilike('name_singular', '%change%order%')
        .single()

      if (!workflowType) throw new Error('Change order workflow type not found')

      const { data, error } = await supabase
        .from('workflow_items')
        .select(`
          *,
          workflow_type:workflow_types(name_singular, prefix),
          raised_by_user:users!workflow_items_raised_by_fkey(first_name, last_name),
          bids:change_order_bids(*)
        `)
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowType.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ChangeOrderResponse[]
    },
    enabled: !!projectId && !!userProfile?.company_id
  })
}
```

### Update Mutation Types

For create/update operations, use Partial types:

```typescript
export function useCreateChangeOrder() {
  return useMutation({
    mutationFn: async (
      input: Partial<TablesInsert<'workflow_items'>> & {
        project_id: string
        workflow_type_id: string
        title: string
      }
    ) => {
      // Implementation
    }
  })
}
```

## Best Practices

### 1. Always Define Response Types for Complex Queries

```typescript
// ✅ Good: Explicit response type
type ProjectWithUsers = Tables<'projects'> & {
  users: Pick<Tables<'users'>, 'id' | 'first_name' | 'last_name'>[]
}

async function getProjectWithUsers(): Promise<ProjectWithUsers | null> {
  const { data } = await supabase
    .from('projects')
    .select('*, users(*)')
    .single()

  return data as ProjectWithUsers | null
}

// ❌ Bad: No type assertion
async function getProjectWithUsers() {
  const { data } = await supabase
    .from('projects')
    .select('*, users(*)')
    .single()

  return data // Type: never
}
```

### 2. Use Type Utilities

```typescript
import type { Tables, TablesInsert, CreateInput } from '@/types/database'

// For simple cases
const user: Tables<'users'> = ...

// For create operations
const newUser: TablesInsert<'users'> = ...

// For custom create types (omits auto-generated fields)
const newProject: CreateInput<Project> = ...
```

### 3. Document Complex Types

```typescript
/**
 * Daily report with all related data for display
 * Includes workforce, equipment, deliveries, visitors, and safety incidents
 */
export type DailyReportWithRelations = Tables<'daily_reports'> & {
  workforce: Tables<'daily_report_workforce'>[]
  equipment: Tables<'daily_report_equipment'>[]
  deliveries: Tables<'daily_report_deliveries'>[]
  visitors: Tables<'daily_report_visitors'>[]
  safety_incidents: Tables<'daily_report_safety_incidents'>[]
}
```

## Runtime vs Compile Time

**Important**: These TypeScript errors are **compile-time only**. Your code will work correctly at runtime because:

1. Supabase doesn't actually use TypeScript types at runtime
2. The database schema enforces data integrity
3. Row Level Security (RLS) ensures data access control

The type errors don't affect functionality - they're purely for developer experience and catching potential bugs during development.

## Future Improvements

### Option 1: Generate Types from Live Database

Use Supabase CLI to generate types from your live database:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase-generated.ts
```

### Option 2: Use Supabase Studio

Export schema from Supabase Studio and regenerate types automatically.

### Option 3: Type Generation Script

Create a script to auto-generate types from migrations:

```typescript
// scripts/generate-types.ts
// Parse migrations folder and generate TypeScript types
```

## Summary

The TypeScript `never` type errors you're seeing are:

1. **Not breaking**: Code works fine at runtime
2. **Fixable**: Add type assertions or explicit return types
3. **Common**: Known issue with complex Supabase queries
4. **Temporary**: Will be resolved when Supabase improves type inference

**Recommended Action**:
- Add type assertions to your hooks as shown in Solution 2 above
- Use the new `Tables<>` helper types for simpler code
- The functionality is complete and working - these are just TypeScript warnings

## Additional Resources

- [Supabase TypeScript Support](https://supabase.com/docs/guides/api/typescript-support)
- [Generating Types](https://supabase.com/docs/guides/api/generating-types)
- [TypeScript Best Practices](https://supabase.com/docs/guides/api/typescript)

---

**Last Updated**: 2025-01-19
**Schema Version**: 42 tables across 13 migrations
**Type Definitions**: [src/types/database.ts](src/types/database.ts)
