# Quick Reference Card - Full Stack Architecture

## 📦 Imports Cheat Sheet

### Validation
```typescript
import { useFormValidation, projectCreateSchema } from '@/lib/validation'
import { InputWithError, TextareaWithError, SelectWithError } from '@/components/form/ValidationError'
```

### API
```typescript
import { projectsApi, dailyReportsApi, changeOrdersApi } from '@/lib/api'
import { ApiErrorClass } from '@/lib/api'
```

### Notifications
```typescript
import { useNotifications } from '@/lib/notifications/useNotifications'
import { useToast } from '@/lib/notifications/ToastContext'
import { useMutationWithNotification } from '@/lib/hooks/useMutationWithNotification'
```

### Mutations with Notifications
```typescript
import {
  useCreateProjectWithNotification,
  useUpdateProjectWithNotification,
  useDeleteProjectWithNotification,
} from '@/features/projects/hooks/useProjectsMutations'
```

---

## 🎯 Common Patterns

### Pattern 1: Form with Validation Only
```typescript
import { useFormValidation, projectCreateSchema } from '@/lib/validation'
import { InputWithError } from '@/components/form/ValidationError'

const { validate, getFieldError } = useFormValidation(projectCreateSchema)

const handleSubmit = (e) => {
  e.preventDefault()
  const result = validate(formData)
  if (!result.success) return
  // ... do something with result.data
}

<InputWithError
  error={getFieldError('name')}
  {...props}
/>
```

### Pattern 2: API Call with Notifications
```typescript
import { useNotifications } from '@/lib/notifications/useNotifications'
import { projectsApi } from '@/lib/api'

const { withNotification } = useNotifications()

const handleDelete = async (id) => {
  await withNotification(
    () => projectsApi.deleteProject(id),
    { successMessage: 'Project deleted!' }
  )
}
```

### Pattern 3: Form + Validation + API + Notifications (FULL STACK)
```typescript
import { useFormValidation, projectCreateSchema } from '@/lib/validation'
import { useCreateProjectWithNotification } from '@/features/projects/hooks/useProjectsMutations'
import { InputWithError } from '@/components/form/ValidationError'

const { validate, getFieldError } = useFormValidation(projectCreateSchema)
const createProject = useCreateProjectWithNotification()

const handleSubmit = async (e) => {
  e.preventDefault()

  // Step 1: Validate
  const result = validate(formData)
  if (!result.success) return

  // Step 2: Call API (with notifications)
  await createProject.mutateAsync(result.data)

  // Step 3: Success toast shown automatically!
}

<InputWithError error={getFieldError('name')} {...props} />
```

### Pattern 4: Manual Notifications
```typescript
import { useNotifications } from '@/lib/notifications/useNotifications'

const {
  showSuccess,
  showError,
  showWarning,
  showInfo
} = useNotifications()

showSuccess('Done!', 'Project created successfully')
showError('Oops!', 'Something went wrong')
showWarning('Wait!', 'This action cannot be undone')
showInfo('Note', 'Here is some information')
```

### Pattern 5: Delete with Confirmation
```typescript
import { useToast } from '@/lib/notifications/ToastContext'
import { useDeleteProjectWithNotification } from '@/features/projects/hooks/useProjectsMutations'

const { addToast } = useToast()
const deleteProject = useDeleteProjectWithNotification()

const handleDelete = () => {
  addToast('warning', 'Confirm Delete', 'Are you sure?', {
    action: {
      label: 'Yes, delete',
      onClick: async () => {
        await deleteProject.mutateAsync(id)
      },
    },
  })
}
```

### Pattern 6: Complex API with Custom Error
```typescript
import { useNotifications } from '@/lib/notifications/useNotifications'
import { projectsApi } from '@/lib/api'

const { withNotification } = useNotifications()

const handleBulkImport = async (file) => {
  await withNotification(
    async () => {
      const data = await parseFile(file)
      return await projectsApi.bulkCreateProjects(data)
    },
    {
      successMessage: (data) => `Imported ${data.count} projects!`,
      errorMessage: (error) => {
        if (error.message.includes('limit')) {
          return 'Too many projects in file (max 100)'
        }
        return 'Failed to import projects'
      },
      onSuccess: () => {
        // Refresh list after import
        refetchProjects()
      },
    }
  )
}
```

---

## 🔄 API Services Quick Reference

### Projects API
```typescript
import { projectsApi } from '@/lib/api'

// Get
projectsApi.getProjectsByCompany(companyId)
projectsApi.getProject(projectId)
projectsApi.getUserProjects()
projectsApi.searchProjects(query, filters)

// Create
projectsApi.createProject(companyId, data) // Returns id

// Update
projectsApi.updateProject(projectId, updates)

// Delete
projectsApi.deleteProject(projectId)
```

### Daily Reports API
```typescript
import { dailyReportsApi } from '@/lib/api'

// Get
dailyReportsApi.getProjectReports(projectId)
dailyReportsApi.getReport(reportId)
dailyReportsApi.getReportsByDateRange(projectId, startDate, endDate)

// Create
dailyReportsApi.createReport(projectId, data)

// Update
dailyReportsApi.updateReport(reportId, updates)

// Status
dailyReportsApi.submitReport(reportId)
dailyReportsApi.approveReport(reportId)
dailyReportsApi.rejectReport(reportId, reason)
```

### Change Orders API
```typescript
import { changeOrdersApi } from '@/lib/api'

// Get
changeOrdersApi.getProjectChangeOrders(projectId)
changeOrdersApi.getChangeOrder(coId)

// Create
changeOrdersApi.createChangeOrder(projectId, data)

// Update
changeOrdersApi.addComment(coId, comment)
changeOrdersApi.requestBids(coId)
changeOrdersApi.awardBid(coId, bidId)
changeOrdersApi.changeStatus(coId, newStatus)
```

---

## ✅ Validation Schemas Quick Reference

### Available Schemas
```typescript
import {
  projectCreateSchema,
  projectUpdateSchema,
  dailyReportCreateSchema,
  dailyReportUpdateSchema,
  changeOrderCreateSchema,
  changeOrderUpdateSchema,
  changeOrderCommentSchema,
  workflowItemCreateSchema,
  workflowItemUpdateSchema,
} from '@/lib/validation'
```

### Type Inference
```typescript
import { projectCreateSchema } from '@/lib/validation'

// Get TypeScript types from schemas
type ProjectCreate = typeof projectCreateSchema._output

// Or use Zod's utility
import { z } from 'zod'
type ProjectCreate = z.infer<typeof projectCreateSchema>
```

### Field Validation Rules
```typescript
// Project
schema.shape.name      // string, min 3, max 200
schema.shape.status    // enum: planning | active | on_hold | completed | archived
schema.shape.address   // string, optional

// Daily Report
schema.shape.report_date  // string, cannot be future date
schema.shape.total_workers // number, 0-10000, optional

// Change Order
schema.shape.title     // string, min 5, max 255
schema.shape.priority  // enum: low | normal | high, optional
schema.shape.cost_impact // number, 0-10M, optional
```

---

## 🎨 Notification Types

### Toast Types
```typescript
// Each has different color, icon, and duration

showSuccess(title, description?)   // Green, ✓, 3 seconds
showError(title, description?)     // Red, ⚠, 5 seconds
showWarning(title, description?)   // Yellow, ⚠, 4 seconds
showInfo(title, description?)      // Blue, ⓘ, 3 seconds
```

### Custom Toast Options
```typescript
addToast('success', 'Title', 'Description', {
  duration: 5000,  // milliseconds (0 = no auto-dismiss)
  action: {
    label: 'Click me',
    onClick: () => { /* handler */ },
  },
})
```

---

## 🐛 Debugging Checklist

### Toast not showing?
```
□ Is <ToastContainer /> in App.tsx?
□ Is app wrapped with <ToastProvider>?
□ Check browser DevTools → Elements (look for toast-container)
□ Check console for errors
```

### Validation not working?
```
□ Is schema imported correctly?
□ Is useFormValidation hook called?
□ Are InputWithError components used?
□ Check getFieldError() has correct field name
□ Look in console: errors should show Zod validation messages
```

### API calls not working?
```
□ Is API service imported from @/lib/api?
□ Check browser DevTools → Network tab
□ Look in DevTools → Console for error messages
□ Check Supabase dashboard for table/permission errors
□ Verify authentication (auth token in headers)
```

### Error boundary not catching errors?
```
□ Is <ErrorBoundary> wrapping app in App.tsx?
□ Error boundary only catches React render errors
□ Event handlers (like onClick) need try-catch
□ Check browser console for error stack
```

---

## 📊 Component State Management

### Form with Validation
```typescript
const [formData, setFormData] = useState({ name: '', ... })
const { errors, validate, getFieldError } = useFormValidation(schema)

// Validate entire form before submit
const result = validate(formData)
if (!result.success) return // Errors shown automatically

// Submit with validated data
await api.create(result.data)
```

### Loading State
```typescript
const createProject = useCreateProjectWithNotification()

<Button disabled={createProject.isPending}>
  {createProject.isPending ? 'Creating...' : 'Create'}
</Button>
```

### Success/Error State from Mutation
```typescript
const mutation = useCreateProjectWithNotification()

if (mutation.isSuccess) {
  // Handle success
}

if (mutation.isError) {
  // Handle error
  console.log(mutation.error)
}
```

---

## 🔧 Common Customizations

### Change Toast Position
Edit: `src/components/notifications/ToastContainer.tsx` line ~40
```typescript
// Change from bottom-right
<div className="fixed bottom-0 right-0 ...">

// To top-right
<div className="fixed top-0 right-0 ...">
```

### Change Toast Duration
```typescript
const { addToast } = useToast()

// 10 second toast
addToast('success', 'Done', undefined, { duration: 10000 })

// Persistent (no auto-dismiss)
addToast('info', 'Important', 'Until dismissed', { duration: 0 })
```

### Customize Error Messages
```typescript
const customSchema = projectCreateSchema.extend({
  name: z.string()
    .min(3, 'Project name must be at least 3 characters')
    .max(200, 'Project name cannot exceed 200 characters'),
})
```

### Add Custom Validation
```typescript
const schema = projectCreateSchema.refine(
  (data) => data.start_date < data.end_date,
  { message: 'Start date must be before end date', path: ['start_date'] }
)
```

---

## 🚀 Quick Integration Steps

### Step 1: Update App.tsx (Already Done!)
```typescript
<ErrorBoundary>
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <Routes>{/* ... */}</Routes>
        <ToastContainer />
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
</ErrorBoundary>
```

### Step 2: Pick a Form
Any form (CreateProject, EditProject, CreateDailyReport, etc.)

### Step 3: Add Three Hooks
```typescript
const createProject = useCreateProjectWithNotification()
const { validate, getFieldError } = useFormValidation(projectCreateSchema)
const { showError } = useNotifications()
```

### Step 4: Update handleSubmit
```typescript
const result = validate(formData)
if (!result.success) return
await createProject.mutateAsync(result.data)
```

### Step 5: Add Error Display
```typescript
<InputWithError error={getFieldError('name')} {...props} />
```

---

## 📚 Document Map

| Document | Purpose | When to Use |
|----------|---------|------------|
| QUICK_REFERENCE_CARD.md | This file - fast lookup | Need quick syntax |
| QUICK_START_INTEGRATION.md | 3 options (test/integrate/migrate) | First time setup |
| INTEGRATION_TESTING_GUIDE.md | Complete step-by-step | Full integration |
| EXAMPLE_INTEGRATED_FORM.tsx | Working code example | Copy/paste template |
| API_ABSTRACTION_GUIDE.md | API layer deep dive | Understand API system |
| NOTIFICATIONS_GUIDE.md | Toast system deep dive | Understand notifications |
| VALIDATION_GUIDE.md | Validation deep dive | Understand validation |
| FULL_STACK_COMPLETION.md | Architecture overview | Big picture view |

---

## 💡 Pro Tips

1. **Always validate before API** - Saves server resources and provides instant feedback
2. **Use mutation hooks** - They handle notifications automatically
3. **Preserve form on error** - Users can adjust and retry without re-entering everything
4. **Show loading state** - Prevents double-submission and reassures user
5. **Use user-friendly errors** - Convert API errors to plain English
6. **Test validation first** - Before testing API integration

---

## ✨ Success Checklist

After integrating one form, verify:

- [ ] Validation errors show in form fields (red border + text)
- [ ] Success toast appears (green background)
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Error toast shows user-friendly message
- [ ] Form data preserved on error
- [ ] Loading button disabled during submission
- [ ] No console errors

**If all checked:** Ready to apply to other forms! 🎉

---

**Last Updated:** $(date)
**Full Stack Architecture v1.0**
