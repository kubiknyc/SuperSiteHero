# API Abstraction Layer - Implementation Guide

## Overview

This guide explains how to use the new API abstraction layer that centralizes all Supabase queries and error handling.

## File Structure

```
src/lib/api/
├── index.ts                 # Central exports
├── types.ts                 # Shared types (ApiError, ApiResponse, etc.)
├── client.ts                # Base API client with Supabase integration
├── errors.ts                # Error handling utilities
└── services/
    ├── projects.ts          # Projects API service
    ├── daily-reports.ts     # Daily Reports API service
    └── change-orders.ts     # Change Orders API service

src/lib/hooks/
└── useApiCall.ts            # Custom hook for API calls with error handling

src/features/*/hooks/
├── useProjects.ts           # OLD - Direct Supabase queries
├── useProjects.v2.ts        # NEW - Using API abstraction layer
└── ...                      # Other refactored hooks (v2 versions)
```

## Key Benefits

### 1. **Centralized Error Handling**
All API errors are standardized and converted to user-friendly messages.

```typescript
// Before: Direct Supabase errors
if (error) {
  console.error(error) // Raw Supabase error
}

// After: Standardized error handling
try {
  await projectsApi.getProject(id)
} catch (error) {
  if (error instanceof ApiErrorClass) {
    const userMessage = error.getUserMessage() // User-friendly message
    console.error(error.code) // Error code for logging
  }
}
```

### 2. **Reusable Query Logic**
API methods encapsulate query logic that can be used across multiple components.

```typescript
// Before: Duplicated query logic in hooks
// projects/hooks/useProjects.ts - Project queries
// change-orders/hooks/useChangeOrders.ts - More project queries

// After: Single source of truth
projectsApi.getProject(id)
projectsApi.getProjectsByCompany(companyId)
projectsApi.getUserProjects(userId)
```

### 3. **Type Safety**
Full TypeScript support with proper type inference.

```typescript
const projects = await projectsApi.getProjectsByCompany(companyId)
// projects is typed as Project[]

const updateData = await projectsApi.updateProject(id, updates)
// updateData is typed as Project
```

### 4. **Validation & Error Prevention**
Input validation happens at the API layer.

```typescript
// This will throw an error if projectId is empty
await projectsApi.getProject('')
// ApiErrorClass: PROJECT_ID_REQUIRED

// Prevents invalid Supabase queries
await projectsApi.deleteProject(undefined)
// ApiErrorClass: PROJECT_ID_REQUIRED
```

## API Services Reference

### Projects API

```typescript
import { projectsApi } from '@/lib/api'

// Fetch projects for a company
const projects = await projectsApi.getProjectsByCompany(companyId)

// Fetch user's projects
const myProjects = await projectsApi.getUserProjects(userId)

// Create a project
const newProject = await projectsApi.createProject(companyId, {
  name: 'New Project',
  address: '123 Main St',
  // ... other fields
})

// Update a project
const updated = await projectsApi.updateProject(projectId, {
  name: 'Updated Name'
})

// Delete a project
await projectsApi.deleteProject(projectId)

// Search projects
const results = await projectsApi.searchProjects(companyId, 'query')
```

### Daily Reports API

```typescript
import { dailyReportsApi } from '@/lib/api'

// Fetch reports for a project
const reports = await dailyReportsApi.getProjectReports(projectId)

// Fetch a single report
const report = await dailyReportsApi.getReport(reportId)

// Get reports by date range
const rangeReports = await dailyReportsApi.getReportsByDateRange(
  projectId,
  '2024-01-01',
  '2024-12-31'
)

// Create a report
const newReport = await dailyReportsApi.createReport({
  project_id: projectId,
  report_date: '2024-01-15',
  weather_condition: 'Sunny',
  // ... other fields
})

// Update a report
const updated = await dailyReportsApi.updateReport(reportId, {
  weather_condition: 'Rainy'
})

// Submit/approve/reject workflows
await dailyReportsApi.submitReport(reportId)
await dailyReportsApi.approveReport(reportId)
await dailyReportsApi.rejectReport(reportId, 'Reason for rejection')
```

### Change Orders API

```typescript
import { changeOrdersApi } from '@/lib/api'

// Fetch change orders for a project
const changeOrders = await changeOrdersApi.getProjectChangeOrders(
  projectId,
  companyId
)

// Fetch a single change order
const changeOrder = await changeOrdersApi.getChangeOrder(changeOrderId)

// Create a change order
const newCO = await changeOrdersApi.createChangeOrder(
  projectId,
  workflowTypeId,
  userId,
  {
    title: 'Scope Change',
    description: 'Additional scope',
    priority: 'high',
    cost_impact: 5000,
  }
)

// Update a change order
const updated = await changeOrdersApi.updateChangeOrder(changeOrderId, {
  title: 'Updated Title'
})

// Add a comment
await changeOrdersApi.addComment(changeOrderId, userId, 'My comment')

// Request bids from subcontractors
const bids = await changeOrdersApi.requestBids(
  changeOrderId,
  projectId,
  subcontractorIds,
  userId
)

// Award a bid
await changeOrdersApi.awardBid(bidId, userId)

// Change status
await changeOrdersApi.changeStatus(changeOrderId, 'approved')
```

## Using with React Query

### Old Pattern (Direct Supabase)

```typescript
export function useProjects() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['projects', userProfile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!userProfile?.company_id,
  })
}
```

### New Pattern (API Layer)

```typescript
export function useProjects() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['projects', userProfile?.company_id],
    queryFn: async () => {
      return projectsApi.getProjectsByCompany(userProfile.company_id)
    },
    enabled: !!userProfile?.company_id,
  })
}
```

### Benefits of New Pattern
- ✅ Cleaner, more readable code
- ✅ No direct Supabase imports in hooks
- ✅ Consistent error handling
- ✅ Easier to test (can mock `projectsApi`)
- ✅ Single source of truth for API logic

## Error Handling

### Catching and Handling Errors

```typescript
import { ApiErrorClass, getErrorMessage } from '@/lib/api'

try {
  const project = await projectsApi.getProject(id)
} catch (error) {
  if (error instanceof ApiErrorClass) {
    // Check error type
    if (error.isAuthError()) {
      // Handle auth error
    } else if (error.isNetworkError()) {
      // Handle network error
    } else if (error.isValidationError()) {
      // Handle validation error
    }

    // Get user-friendly message
    console.log(error.getUserMessage())
    // e.g., "The requested resource was not found"

    // Get error code for logging
    console.log(error.code)
    // e.g., "FETCH_PROJECT_ERROR"
  }
}
```

### In React Components

```typescript
function ProjectDetail({ projectId }: { projectId: string }) {
  const { data, error, isLoading } = useProject(projectId)

  if (isLoading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="text-red-600">
        Error: {getErrorMessage(error)}
      </div>
    )
  }

  return <div>{data?.name}</div>
}
```

## Migration Guide

### Step 1: Create v2 version of hooks
- Copy your old hook file to a `.v2.ts` version
- Update imports to use API services instead of direct Supabase
- Keep the same hook interface (same function names and signatures)

### Step 2: Update imports in components
- Change from `useProjects` to use the new v2 version
- Or keep the same name and replace the old file

### Step 3: Test thoroughly
- Verify all queries work
- Test error handling
- Check loading states

### Step 4: Remove old hooks
- Delete `.v2.ts` suffix once confident
- Update any direct Supabase imports

## Example: Refactoring useProjects

### Before (useProjects.ts)
```typescript
export function useProjects() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['projects', userProfile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!userProfile?.company_id,
  })
}
```

### After (useProjects.v2.ts - ready to replace original)
```typescript
import { projectsApi } from '@/lib/api'

export function useProjects() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['projects', userProfile?.company_id],
    queryFn: async () => {
      return projectsApi.getProjectsByCompany(userProfile.company_id)
    },
    enabled: !!userProfile?.company_id,
  })
}
```

## Adding New API Services

If you need to create a new API service (e.g., for Tasks):

### 1. Create the service file
```typescript
// src/lib/api/services/tasks.ts
import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { Task } from '@/types/database'

export const tasksApi = {
  async getProjectTasks(projectId: string): Promise<Task[]> {
    try {
      return await apiClient.select<Task>('tasks', {
        filters: [{ column: 'project_id', operator: 'eq', value: projectId }],
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TASKS_ERROR',
            message: 'Failed to fetch tasks',
          })
    }
  },
  // ... more methods
}
```

### 2. Export from index
```typescript
// src/lib/api/index.ts
export { tasksApi } from './services/tasks'
```

### 3. Use in hooks
```typescript
import { tasksApi } from '@/lib/api'

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.getProjectTasks(projectId),
    enabled: !!projectId,
  })
}
```

## Next Steps

1. **Install and test** - Run the app with the new API layer
2. **Refactor remaining hooks** - Update other hooks to use v2 pattern
3. **Add toast notifications** - Integrate toast notifications for user feedback
4. **Create validators** - Add Zod validators for form inputs
5. **Error boundary** - Add global error boundary for error handling

## Troubleshooting

### "Module not found" errors
- Make sure you're importing from `@/lib/api`
- Check that the service file is exported in `src/lib/api/index.ts`

### "Type not found" errors
- Verify types are imported from `@/types/database`
- Check that type aliases are correct

### API errors not catching
- Make sure to import `ApiErrorClass`
- Check that `catch` block is catching the correct error type

## Questions?

Refer to the examples in the `.v2.ts` files for complete implementation patterns.
