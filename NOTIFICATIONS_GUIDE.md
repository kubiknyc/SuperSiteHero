# Notifications Guide - Toast System

## Overview

Your construction management platform now has a complete **toast notification system** that integrates seamlessly with your API layer to provide real-time user feedback.

### Key Features
- ✅ Built-in Tailwind CSS styling (no extra dependencies)
- ✅ Automatic error/success notifications for API calls
- ✅ Type-safe with full TypeScript support
- ✅ Auto-dismiss with configurable durations
- ✅ Dismissible notifications
- ✅ Custom actions on notifications

## Files Created

### Core Components
```
src/lib/notifications/
├── types.ts                    # Toast type definitions
├── ToastContext.tsx            # Toast provider and context
└── useNotifications.ts         # Custom hook for notifications

src/components/notifications/
└── ToastContainer.tsx          # Toast display component

src/components/errors/
└── ErrorBoundary.tsx           # Global error boundary

src/lib/hooks/
└── useMutationWithNotification.ts  # React Query wrapper
```

### Example Implementations
```
src/features/projects/
├── hooks/useProjectsMutations.ts   # Example mutation hooks with notifications
└── components/CreateProjectDialog.enhanced.tsx  # Example form with notifications
```

## Setup Instructions

### Step 1: Wrap Your App with Providers

Update `src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth/AuthContext'
import { ToastProvider } from './lib/notifications/ToastContext'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import { ToastContainer } from './components/notifications/ToastContainer'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

// ... your route imports

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            {/* Your routes */}
            <Routes>
              {/* ... routes ... */}
            </Routes>

            {/* Toast notification container */}
            <ToastContainer />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
```

### Step 2: Use in Your Components

That's it! Now you can use notifications throughout your app.

## Usage Patterns

### Pattern 1: Basic Notifications

```typescript
import { useNotifications } from '@/lib/notifications/useNotifications'

export function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications()

  return (
    <div>
      <button onClick={() => showSuccess('Success', 'Operation completed!')}>
        Show Success
      </button>

      <button onClick={() => showError('Error', 'Something went wrong')}>
        Show Error
      </button>

      <button onClick={() => showWarning('Warning', 'Please be careful')}>
        Show Warning
      </button>

      <button onClick={() => showInfo('Info', 'Here is some information')}>
        Show Info
      </button>
    </div>
  )
}
```

### Pattern 2: With API Calls

```typescript
import { useNotifications } from '@/lib/notifications/useNotifications'
import { projectsApi } from '@/lib/api'

export function ProjectsList() {
  const { withNotification, showError } = useNotifications()

  async function handleDelete(projectId: string) {
    await withNotification(
      () => projectsApi.deleteProject(projectId),
      {
        successMessage: 'Project deleted successfully',
        errorMessage: 'Failed to delete project',
      }
    )
  }

  return (
    <button onClick={() => handleDelete('123')}>
      Delete Project
    </button>
  )
}
```

### Pattern 3: Mutation Hooks with Notifications

```typescript
import { useCreateProjectWithNotification } from '@/features/projects/hooks/useProjectsMutations'

export function CreateProjectForm() {
  const createProject = useCreateProjectWithNotification()

  const handleSubmit = async (formData: ProjectFormData) => {
    // Mutation automatically shows success/error toasts
    await createProject.mutateAsync({
      name: formData.name,
      address: formData.address,
      // ... other fields
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={createProject.isPending}>
        {createProject.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

### Pattern 4: Custom Notification Actions

```typescript
import { useToast } from '@/lib/notifications/ToastContext'

export function ImportantAction() {
  const { addToast } = useToast()

  function handleConfirmation() {
    addToast('warning', 'Confirmation Required', 'Are you sure?', {
      action: {
        label: 'Yes, proceed',
        onClick: () => {
          console.log('User confirmed')
        },
      },
    })
  }

  return <button onClick={handleConfirmation}>Confirm Action</button>
}
```

## Available Methods

### useNotifications()

```typescript
const {
  withNotification,    // Execute async operation with notifications
  handleError,         // Handle and display errors
  showSuccess,         // Show success notification
  showError,           // Show error notification
  showWarning,         // Show warning notification
  showInfo,            // Show info notification
  // ... plus all methods from useToast()
} = useNotifications()
```

### useToast()

```typescript
const {
  toasts,             // Array of current toasts
  addToast,           // Add custom toast
  removeToast,        // Remove specific toast
  clearAll,           // Clear all toasts
  success,            // Add success toast
  error,              // Add error toast
  warning,            // Add warning toast
  info,               // Add info toast
} = useToast()
```

### useMutationWithNotification()

```typescript
const mutation = useMutationWithNotification({
  mutationFn: async (variables) => {
    // Your async operation
  },
  successMessage: 'Operation succeeded!',     // Auto-shown on success
  errorMessage: 'Operation failed!',          // Auto-shown on error
  onSuccess: (data) => {                      // Custom success callback
    // Handle success
  },
  onError: (error) => {                       // Custom error callback
    // Handle error
  },
})
```

## Toast Types and Styling

### Success (Green)
```typescript
showSuccess('Operation successful', 'Your changes have been saved')
```
- Duration: 3 seconds
- Icon: CheckCircle
- Color: Green

### Error (Red)
```typescript
showError('Operation failed', 'Please try again')
```
- Duration: 5 seconds
- Icon: AlertCircle
- Color: Red

### Warning (Yellow)
```typescript
showWarning('Please note', 'This action cannot be undone')
```
- Duration: 4 seconds
- Icon: AlertTriangle
- Color: Yellow

### Info (Blue)
```typescript
showInfo('Information', 'Here is some important info')
```
- Duration: 3 seconds
- Icon: Info
- Color: Blue

## Examples

### Example 1: Delete with Confirmation

```typescript
function DeleteButton({ projectId }: { projectId: string }) {
  const deleteProject = useDeleteProjectWithNotification()
  const { addToast } = useToast()

  const handleDelete = () => {
    addToast('warning', 'Confirm Delete', 'Are you sure you want to delete this project?', {
      action: {
        label: 'Yes, delete',
        onClick: async () => {
          await deleteProject.mutateAsync(projectId)
        },
      },
    })
  }

  return (
    <button onClick={handleDelete} className="text-red-600">
      Delete
    </button>
  )
}
```

### Example 2: Form with Validation

```typescript
function CreateProjectForm() {
  const createProject = useCreateProjectWithNotification()
  const { showError } = useNotifications()
  const [formData, setFormData] = useState({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    if (!formData.name) {
      showError('Validation Error', 'Project name is required')
      return
    }

    // Submit with automatic notifications
    await createProject.mutateAsync(formData)
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>
}
```

### Example 3: Error Handling with Custom Messages

```typescript
async function fetchAndDisplay() {
  const { withNotification } = useNotifications()

  const data = await withNotification(
    async () => {
      return await projectsApi.getProject('123')
    },
    {
      successMessage: 'Project loaded successfully',
      errorMessage: (error) => {
        // Custom error message based on error type
        if (error.message.includes('not found')) {
          return 'Project not found'
        }
        return 'Failed to load project'
      },
      onSuccess: (project) => {
        // Handle successful load
        console.log('Loaded project:', project)
      },
    }
  )

  return data
}
```

### Example 4: Multiple Notifications

```typescript
import { useNotifications } from '@/lib/notifications/useNotifications'

export function DataImportWizard() {
  const { showInfo, showSuccess, showWarning } = useNotifications()

  const handleImport = async () => {
    showInfo('Processing', 'Importing your data...')

    // Simulate import
    await new Promise(r => setTimeout(r, 2000))

    showWarning('Review', 'Please review the imported data before confirming')

    // User reviews...
    await new Promise(r => setTimeout(r, 3000))

    showSuccess('Complete', '500 records imported successfully')
  }

  return <button onClick={handleImport}>Start Import</button>
}
```

## Error Boundary

The app-level error boundary catches unexpected React errors:

```typescript
<ErrorBoundary
  fallback={(error, retry) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={retry}>Try Again</button>
    </div>
  )}
>
  <YourApp />
</ErrorBoundary>
```

Default behavior:
- Shows friendly error message
- Provides "Try Again" and "Go Home" buttons
- In development: Shows error details
- Prevents white screen of death

## Customization

### Changing Toast Duration

```typescript
const { addToast } = useToast()

addToast('success', 'Done!', undefined, {
  duration: 10000 // 10 seconds
})

// Persistent notification
addToast('info', 'Important', 'This stays until dismissed', {
  duration: 0 // Never auto-dismiss
})
```

### Styling Toasts

Edit `src/components/notifications/ToastContainer.tsx` to customize:
- Colors (change Tailwind classes)
- Position (move from bottom-right)
- Animation (modify Tailwind animations)
- Icons (import different icons)

Example - move to top-right:

```typescript
<div className="fixed top-0 right-0 z-50 flex flex-col gap-2 p-4">
  {/* toasts... */}
</div>
```

## Common Patterns

### Success with Action

```typescript
showSuccess('File uploaded', 'View your file', {
  action: {
    label: 'Open',
    onClick: () => window.open(fileUrl),
  },
})
```

### Persistent Warnings

```typescript
addToast('warning', 'Attention Required', 'Please review your settings', {
  duration: 0, // Never auto-dismiss
})
```

### Grouped Operations

```typescript
const { withNotification } = useNotifications()

for (const item of items) {
  await withNotification(
    () => processItem(item),
    { successMessage: `Processed ${item.name}` }
  )
}
```

## API Integration

Notifications automatically integrate with your API layer:

```typescript
// Errors from projectsApi automatically show user-friendly messages
const { withNotification } = useNotifications()

await withNotification(
  () => projectsApi.getProject(id),
  // Shows: "The requested resource was not found" (converted from error code)
)
```

## Migration Guide

### From Old Toast System to New System

**Before:**
```typescript
const { addToast } = useToast()
try {
  await api.call()
  addToast({ title: 'Success', description: 'Done' })
} catch (error) {
  addToast({ title: 'Error', description: error.message })
}
```

**After:**
```typescript
const { withNotification } = useNotifications()
await withNotification(
  () => api.call(),
  { successMessage: 'Done' }
)
```

## Troubleshooting

### Notifications Not Showing
- ✓ Make sure `<ToastContainer />` is in your App component
- ✓ Make sure app is wrapped with `<ToastProvider>`
- ✓ Check browser console for errors

### Wrong Position
- Edit `ToastContainer.tsx` and change the positioning classes

### Custom Styling Not Applying
- Update the `bgColor`, `textColor`, and `iconColor` mappings in `ToastContainer.tsx`

## Performance

- Notifications are lightweight (using Tailwind CSS)
- Auto-dismiss prevents memory leaks
- All notifications cleared when app unmounts

## Next Steps

1. **Integrate into your pages** - Update existing forms and API calls
2. **Customize styling** - Match your brand colors if desired
3. **Add error logging** - Log errors to external service (Sentry, etc.)
4. **Create notification presets** - For common operations

## See Also

- [API_ABSTRACTION_GUIDE.md](./API_ABSTRACTION_GUIDE.md) - API layer documentation
- [CreateProjectDialog.enhanced.tsx](./src/features/projects/components/CreateProjectDialog.enhanced.tsx) - Full example implementation
