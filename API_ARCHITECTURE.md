# API Abstraction Layer - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REACT COMPONENTS                              │
│  (Pages, Feature Components, Dialog Components)                      │
│                                                                      │
│  ProjectsPage.tsx    DailyReportsPage.tsx    ChangeOrdersPage.tsx   │
└────────────┬──────────────────┬──────────────────┬──────────────────┘
             │                  │                  │
             └──────────────────┼──────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│              REACT QUERY HOOKS (v2 VERSIONS)                          │
│                                                                      │
│  useProjects.v2.ts      useDailyReports.v2.ts   useChangeOrders.v2  │
│  ├─ useProjects()       ├─ useDailyReports()    ├─ useChangeOrders()│
│  ├─ useProject()        ├─ useDailyReport()     ├─ useChangeOrder() │
│  ├─ useMyProjects()     ├─ useCreateDailyReport()      ...          │
│  ├─ useCreateProject()  ├─ useUpdateDailyReport()      ...          │
│  └─ ...                 └─ ...                   └─ ...              │
│                                                                      │
│  Each hook wraps an API service method with React Query             │
└────────────┬──────────────────┬──────────────────┬──────────────────┘
             │                  │                  │
             └──────────────────┼──────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                   API SERVICES (Single Source of Truth)               │
│                                                                      │
│  projectsApi              dailyReportsApi      changeOrdersApi      │
│  ├─ getProjectsByCompany()  ├─ getProjectReports()  ├─ getProjectCOs()│
│  ├─ getProject()            ├─ getReport()          ├─ getChangeOrder() │
│  ├─ createProject()         ├─ createReport()       ├─ createCO()      │
│  ├─ updateProject()         ├─ updateReport()       ├─ addComment()     │
│  ├─ deleteProject()         ├─ submitReport()       ├─ requestBids()    │
│  └─ searchProjects()        ├─ approveReport()      ├─ awardBid()       │
│                             └─ rejectReport()       └─ changeStatus()   │
│                                                                      │
│  Contains business logic, validation, and error handling            │
└────────────┬──────────────────┬──────────────────┬──────────────────┘
             │                  │                  │
             └──────────────────┼──────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                        BASE API CLIENT                                │
│                         (apiClient)                                   │
│                                                                      │
│  ├─ select(table, options)     [Fetch with filtering]               │
│  ├─ selectOne(table, id)       [Fetch single]                       │
│  ├─ insert(table, record)      [Create]                             │
│  ├─ insertMany(table, records) [Create multiple]                    │
│  ├─ update(table, id, updates) [Update]                             │
│  ├─ delete(table, id)          [Delete]                             │
│  └─ query(table, callback)     [Custom queries]                     │
│                                                                      │
│  Provides filter builder, pagination, and error handling            │
└────────────┬──────────────────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────────────────┐
│                      ERROR HANDLING LAYER                              │
│                        (ApiErrorClass)                                 │
│                                                                      │
│  ├─ getUserMessage()    [Get user-friendly message]                 │
│  ├─ isAuthError()       [Check if auth error]                       │
│  ├─ isNetworkError()    [Check if network error]                    │
│  ├─ isValidationError() [Check if validation error]                 │
│  └─ code, message, status, details [Error properties]               │
│                                                                      │
│  Converts Supabase errors to standardized, user-friendly errors     │
└────────────┬──────────────────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────────────────┐
│                         SUPABASE CLIENT                                │
│                     (supabase.from().select()...)                      │
│                                                                      │
│  Direct Supabase database queries - abstracted behind API layer     │
└────────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Fetching Projects

```
1. Component renders
   └─> Component calls useProjects()

2. useProjects() hook (React Query)
   └─> Returns { data, isLoading, error }
   └─> Wraps projectsApi.getProjectsByCompany()

3. projectsApi service
   └─> Contains business logic
   └─> Calls apiClient.select('projects', options)

4. apiClient (Base client)
   └─> Builds Supabase query with filters
   └─> Executes: supabase.from('projects').select().eq()...
   └─> Catches errors → converts to ApiErrorClass

5. Error handling
   └─> ApiErrorClass wraps error
   └─> Provides getUserMessage() for UI

6. Result flows back up
   └─> Hook: { data: projects }
   └─> Component: Renders project list

7. On error
   └─> Hook: { error: ApiErrorClass }
   └─> Component: Can check error.code or error.getUserMessage()
```

## Example: Creating a Project

```
User clicks "New Project" button
         │
         ▼
Component renders CreateProjectDialog
         │
         ▼
User fills form and submits
         │
         ▼
Component calls:  createProject.mutate(formData)
         │
         ▼
useCreateProject() hook (React Query mutation)
         │
         ▼
Calls: projectsApi.createProject(companyId, data)
         │
         ▼
API Service validates input:
  - Check companyId exists
  - Call apiClient.insert('projects', {...data, company_id})
         │
         ▼
Base Client:
  - Builds insert query
  - Executes: supabase.from('projects').insert().select().single()
         │
         ▼
Error Handling:
  - If error: Convert to ApiErrorClass
  - If success: Return new project
         │
         ▼
React Query:
  - On success: Invalidates 'projects' query cache
  - Updates UI with new project
  - Shows loading/success states
         │
         ▼
Component receives result
  - isLoading: false
  - data: new project created
  - error: null
         │
         ▼
Component:
  - Hides dialog
  - Shows success message
  - Refreshes list
```

## File Organization

```
src/
├── lib/
│   ├── api/
│   │   ├── types.ts              [Type definitions]
│   │   ├── client.ts             [Base API client]
│   │   ├── errors.ts             [Error handling]
│   │   ├── index.ts              [Central exports]
│   │   └── services/
│   │       ├── projects.ts       [Projects API]
│   │       ├── daily-reports.ts  [Daily Reports API]
│   │       └── change-orders.ts  [Change Orders API]
│   ├── hooks/
│   │   └── useApiCall.ts         [API call hook]
│   ├── auth/
│   │   └── AuthContext.tsx       [Existing auth]
│   └── supabase.ts               [Existing Supabase client]
│
├── features/
│   ├── projects/
│   │   ├── hooks/
│   │   │   ├── useProjects.ts    [OLD - Direct Supabase]
│   │   │   └── useProjects.v2.ts [NEW - Using API layer]
│   │   └── components/
│   ├── daily-reports/
│   │   ├── hooks/
│   │   │   ├── useDailyReports.ts    [OLD]
│   │   │   └── useDailyReports.v2.ts [NEW]
│   │   └── components/
│   └── change-orders/
│       ├── hooks/
│       │   ├── useChangeOrders.ts    [OLD]
│       │   └── useChangeOrders.v2.ts [NEW]
│       └── components/
│
└── pages/
    ├── ProjectsPage.tsx
    ├── DailyReportsPage.tsx
    └── ChangeOrdersPage.tsx
```

## Dependency Layers

```
┌─────────────────────────────────────────┐
│ Layer 5: UI Components                  │
│ (ProjectsPage, CreateProjectDialog)     │
└────────────────┬────────────────────────┘
                 │ uses
┌────────────────▼────────────────────────┐
│ Layer 4: React Query Hooks (v2)         │
│ (useProjects, useCreateProject)         │
└────────────────┬────────────────────────┘
                 │ wraps
┌────────────────▼────────────────────────┐
│ Layer 3: API Services                   │
│ (projectsApi, dailyReportsApi)          │
└────────────────┬────────────────────────┘
                 │ uses
┌────────────────▼────────────────────────┐
│ Layer 2: Base API Client                │
│ (apiClient.select, insert, update)      │
└────────────────┬────────────────────────┘
                 │ uses
┌────────────────▼────────────────────────┐
│ Layer 1: Supabase Client                │
│ (supabase.from().select()...)           │
└─────────────────────────────────────────┘

✓ Clean separation of concerns
✓ Each layer has single responsibility
✓ Easy to test (can mock any layer)
✓ Easy to maintain (changes isolated)
```

## Error Handling Flow

```
Supabase Error occurs
         │
         ▼
apiClient catches error
         │
         ▼
Converts to ApiErrorClass
         │
         ├─ code: "FETCH_PROJECTS_ERROR"
         ├─ message: "Raw error message"
         ├─ status: 500
         └─ details: {...}
         │
         ▼
API Service throws ApiErrorClass
         │
         ▼
React Query mutation/query catches it
         │
         ├─ Updates { error } state
         ├─ Triggers onError callback
         └─ Invalidates cache on retry
         │
         ▼
Component receives error
         │
         ├─ Check error instanceof ApiErrorClass
         ├─ Call error.getUserMessage() for display
         ├─ Check error.isAuthError() for auth flows
         └─ Check error.isNetworkError() for retries
         │
         ▼
Display user-friendly message to user
```

## Cache Invalidation Strategy

```
Create Project:
  useCreateProject.mutate(data)
        │
        ▼
  projectsApi.createProject()
        │
        ▼
  Success
        │
        ▼
  React Query onSuccess:
    queryClient.invalidateQueries({ queryKey: ['projects'] })
        │
        ▼
  All queries with key ['projects', *] are refetched
        │
        ├─ ['projects', companyId] ← Refeches
        ├─ ['my-projects', userId] ← Refetches
        └─ ['projects-search', ...] ← Refetches
        │
        ▼
  UI automatically updates with fresh data
```

## Type Flow

```
Database Schema
    ↓
@/types/database.ts
    ↓ (Types like Project, DailyReport)
    ↓
API Services
    ├─ Arguments: Omit<Project, 'id' | 'created_at' | 'updated_at'>
    └─ Returns: Project | Project[]
    ↓
React Query Hooks
    ├─ Returns: useQuery<Project[]>
    └─ Returns: useQuery<Project | null>
    ↓
Components
    ├─ data: Project[]
    ├─ project: Project
    └─ Full type safety throughout
```

## Migration Path Visualization

```
Current State (Before):
┌─ ProjectsPage
│   └─ useProjects() ──► Direct Supabase calls
│       ├─ Raw error handling
│       └─ Query logic in hook
│
├─ DailyReportsPage
│   └─ useDailyReports() ──► Direct Supabase calls
│       └─ Repeated query patterns
│
└─ ChangeOrdersPage
    └─ useChangeOrders() ──► Direct Supabase calls
        └─ Complex join logic scattered

Next State (After Migration):
┌─ ProjectsPage
│   └─ useProjects.v2() ──► projectsApi ──► apiClient ──► supabase
│       └─ Standardized error handling
│
├─ DailyReportsPage
│   └─ useDailyReports.v2() ──► dailyReportsApi ──► apiClient ──► supabase
│       └─ Reusable query logic
│
└─ ChangeOrdersPage
    └─ useChangeOrders.v2() ──► changeOrdersApi ──► apiClient ──► supabase
        └─ Centralized join logic

Migrations happen gradually:
Week 1: ProjectsPage uses v2
Week 2: DailyReportsPage uses v2
Week 3: ChangeOrdersPage uses v2
Week 4: Delete old hooks, improve remaining features
```

## Summary

- **5 Layers**: UI → Hooks → Services → Client → Supabase
- **Single Responsibility**: Each file has one job
- **Type Safety**: End-to-end TypeScript
- **Error Handling**: Standardized ApiErrorClass
- **Testability**: Can mock any layer
- **Maintainability**: Changes in one place affect whole system
- **Gradual Migration**: Old and new coexist safely
