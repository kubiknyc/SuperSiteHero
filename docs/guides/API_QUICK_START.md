# API Abstraction Layer - Quick Start Guide

## 5-Minute Setup

### 1. Use in Your Component

```typescript
import { useProjects } from '@/features/projects/hooks/useProjects.v2'

export function MyComponent() {
  const { data: projects, isLoading, error } = useProjects()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {projects?.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  )
}
```

### 2. Direct API Usage

```typescript
import { projectsApi, ApiErrorClass } from '@/lib/api'

async function loadProjects() {
  try {
    const projects = await projectsApi.getProjectsByCompany(companyId)
    console.log(projects)
  } catch (error) {
    if (error instanceof ApiErrorClass) {
      console.error(error.getUserMessage()) // "An unexpected error occurred"
      console.error(error.code) // "FETCH_PROJECTS_ERROR"
    }
  }
}
```

## Common Patterns

### Loading & Error States

```typescript
export function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects()

  return (
    <div>
      {isLoading && <LoadingSpinner />}
      {error && <ErrorAlert message={error.message} />}
      {projects && <ProjectsList projects={projects} />}
    </div>
  )
}
```

### Creating Data

```typescript
export function NewProjectForm() {
  const createProject = useCreateProject()

  async function handleSubmit(data: ProjectFormData) {
    try {
      const result = await createProject.mutateAsync({
        name: data.name,
        address: data.address,
        // ... other fields
      })
      console.log('Created:', result)
    } catch (error) {
      console.error('Failed to create:', error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  )
}
```

### Updating Data

```typescript
export function EditProjectDialog({ projectId }: { projectId: string }) {
  const updateProject = useUpdateProject()

  async function handleSave(updates: Partial<Project>) {
    await updateProject.mutateAsync({
      id: projectId,
      updates
    })
  }

  return (
    <dialog>
      {updateProject.isPending && <span>Saving...</span>}
      {/* form fields */}
    </dialog>
  )
}
```

### Deleting Data

```typescript
function DeleteButton({ projectId }: { projectId: string }) {
  const deleteProject = useDeleteProject()

  return (
    <button
      onClick={() => deleteProject.mutate(projectId)}
      disabled={deleteProject.isPending}
    >
      {deleteProject.isPending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
```

## Available Hooks

### Projects
```typescript
useProjects()              // Get all projects
useProject(id)             // Get single project
useMyProjects()            // Get user's projects
useCreateProject()         // Create mutation
useUpdateProject()         // Update mutation
useDeleteProject()         // Delete mutation
useSearchProjects(query)   // Search
```

### Daily Reports
```typescript
useDailyReports(projectId)              // Get all reports
useDailyReport(reportId)                // Get single report
useDailyReportsByDateRange(...)         // Get by date range
useCreateDailyReport()                  // Create mutation
useUpdateDailyReport()                  // Update mutation
useDeleteDailyReport()                  // Delete mutation
useSubmitDailyReport()                  // Submit mutation
useApproveDailyReport()                 // Approve mutation
useRejectDailyReport()                  // Reject mutation
```

### Change Orders
```typescript
useChangeOrders(projectId)              // Get all
useChangeOrder(id)                      // Get single
useCreateChangeOrder()                  // Create mutation
useUpdateChangeOrder()                  // Update mutation
useDeleteChangeOrder()                  // Delete mutation
useAddChangeOrderComment()              // Add comment mutation
useRequestBids()                        // Request bids mutation
useAwardBid()                           // Award bid mutation
useChangeOrderStatus()                  // Change status mutation
```

## API Services

### Direct Usage (Not in React Components)

```typescript
import { projectsApi, dailyReportsApi, changeOrdersApi } from '@/lib/api'

// Projects
await projectsApi.getProjectsByCompany(companyId)
await projectsApi.getProject(projectId)
await projectsApi.createProject(companyId, data)
await projectsApi.updateProject(projectId, updates)
await projectsApi.deleteProject(projectId)

// Daily Reports
await dailyReportsApi.getProjectReports(projectId)
await dailyReportsApi.getReport(reportId)
await dailyReportsApi.createReport(data)
await dailyReportsApi.updateReport(reportId, updates)

// Change Orders
await changeOrdersApi.getProjectChangeOrders(projectId, companyId)
await changeOrdersApi.getChangeOrder(changeOrderId)
await changeOrdersApi.createChangeOrder(...)
await changeOrdersApi.addComment(...)
await changeOrdersApi.awardBid(...)
```

## Error Handling

### Check Error Type

```typescript
import { ApiErrorClass } from '@/lib/api'

try {
  await projectsApi.getProject(id)
} catch (error) {
  if (error instanceof ApiErrorClass) {
    if (error.isAuthError()) {
      // User not logged in
    } else if (error.isNetworkError()) {
      // Network error
    } else if (error.isValidationError()) {
      // Input validation error
    }

    console.log(error.getUserMessage()) // User-friendly message
    console.log(error.code)             // Error code
  }
}
```

### In React Components

```typescript
const { data, error } = useProject(id)

if (error) {
  return (
    <div className="bg-red-100 text-red-800 p-4">
      ❌ {error.message}
    </div>
  )
}
```

## Examples

### Fetch and Display Projects

```typescript
export function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects()

  return (
    <div>
      <h1>Projects</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {projects && (
        <ul>
          {projects.map(project => (
            <li key={project.id}>{project.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

### Create a Project Form

```typescript
export function CreateProjectDialog({ open, onOpenChange }: DialogProps) {
  const createProject = useCreateProject()
  const { userProfile } = useAuth()

  async function handleSubmit(formData: FormData) {
    try {
      await createProject.mutateAsync({
        name: formData.get('name') as string,
        address: formData.get('address') as string,
        // ... other fields
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={(e) => {
        e.preventDefault()
        handleSubmit(new FormData(e.currentTarget))
      }}>
        <input name="name" placeholder="Project name" required />
        <input name="address" placeholder="Address" required />
        <button type="submit" disabled={createProject.isPending}>
          {createProject.isPending ? 'Creating...' : 'Create'}
        </button>
      </form>
    </Dialog>
  )
}
```

### Fetch with Filtering

```typescript
export function DailyReportsPage({ projectId }: { projectId: string }) {
  const { data: reports } = useDailyReports(projectId)
  const [dateFilter, setDateFilter] = useState('')

  const filtered = reports?.filter(
    r => !dateFilter || r.report_date === dateFilter
  )

  return (
    <div>
      <input
        type="date"
        value={dateFilter}
        onChange={e => setDateFilter(e.target.value)}
      />
      <table>
        <tbody>
          {filtered?.map(report => (
            <tr key={report.id}>
              <td>{report.report_date}</td>
              <td>{report.weather_condition}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## Migration Checklist

- [ ] Import new hook instead of old one
- [ ] Update component to use new hook (same interface)
- [ ] Test loading state
- [ ] Test error state
- [ ] Test success case
- [ ] Run in browser to verify
- [ ] Delete `.v2` suffix when confident

## Performance Tips

### 1. Reuse Queries
```typescript
// DON'T: Query twice
const projects1 = useProjects()
const projects2 = useProjects()

// DO: Reuse the same query
const projects = useProjects()
```

### 2. Memoize Computed Values
```typescript
// DO: Memoize expensive calculations
const activeProjects = useMemo(
  () => projects?.filter(p => p.status === 'active'),
  [projects]
)
```

### 3. Use Select for Pagination
```typescript
// DO: Use pagination in API for large datasets
const reports = useDailyReports(projectId)

// Filter in memory for small datasets only
const filtered = reports?.filter(...)
```

## Troubleshooting

### "Cannot read property 'map' of undefined"
```typescript
// WRONG: Accessing before checking
{projects.map(...)}

// RIGHT: Check first
{projects && projects.map(...)}
{projects?.map(...)}
```

### Stale Data After Create/Update
```typescript
// This is automatic with React Query mutations
const create = useCreateProject()

// After mutateAsync completes, React Query
// automatically invalidates ['projects'] query
await create.mutateAsync(data)
```

### Loading State Not Showing
```typescript
// DO: Check isPending for mutations
const create = useCreateProject()
{create.isPending && <span>Creating...</span>}

// DO: Check isLoading for queries
const { isLoading } = useProjects()
{isLoading && <span>Loading...</span>}
```

## Need Help?

1. Check [API_ABSTRACTION_GUIDE.md](./API_ABSTRACTION_GUIDE.md) for detailed docs
2. Look at the `.v2.ts` files for complete examples
3. Review the API service files in `src/lib/api/services/`
4. Check existing components in `src/pages/` and `src/features/`

## Next Steps

After successfully using the new API layer:

1. **Add Toast Notifications** - Integrate notifications for user feedback
2. **Add Input Validation** - Use Zod for form validation
3. **Create Error Boundary** - Global error handling component
4. **Add Retry Logic** - Automatic retry on network errors
