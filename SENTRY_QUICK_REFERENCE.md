# Sentry Quick Reference Card

Quick copy-paste snippets for common Sentry operations in your construction platform.

## Import Statement

```typescript
import {
  captureException,
  captureMessage,
  addSentryBreadcrumb,
  setSentryTag,
  setSentryContext,
  startSpan,
} from '@/lib/sentry'
```

## Track Errors

```typescript
try {
  await riskyOperation()
} catch (error) {
  captureException(error, {
    module: 'projects',
    action: 'create',
    projectId: project.id,
  })
  throw error // Re-throw if needed
}
```

## Log Messages

```typescript
// Info message
captureMessage('Daily report submitted successfully', 'info', {
  reportId: report.id,
  projectId: project.id,
})

// Warning message
captureMessage('User approaching storage limit', 'warning', {
  userId: user.id,
  storageUsed: '950MB',
})

// Error message
captureMessage('Payment failed - retrying', 'error', {
  userId: user.id,
  paymentId: payment.id,
})
```

## Add Breadcrumbs

```typescript
// User action
addSentryBreadcrumb(
  'User clicked "Create Project" button',
  'user-action',
  'info',
  { buttonId: 'create-project' }
)

// Navigation
addSentryBreadcrumb(
  'Navigated to Daily Reports page',
  'navigation',
  'info',
  { route: '/daily-reports', projectId: '123' }
)

// Data fetch
addSentryBreadcrumb(
  'Fetching project details',
  'http',
  'info',
  { projectId: '123', method: 'GET' }
)
```

## Set Tags (for filtering)

```typescript
// Feature tag
setSentryTag('feature', 'daily-reports')

// User role tag
setSentryTag('user-role', 'superintendent')

// Project type tag
setSentryTag('project-type', 'commercial')

// Environment tag (auto-set, but you can override)
setSentryTag('environment', 'production')
```

## Set Context (extra data)

```typescript
// Project context
setSentryContext('project', {
  id: project.id,
  name: project.name,
  status: project.status,
  address: project.address,
})

// User context (already done in auth, but you can add more)
setSentryContext('user-preferences', {
  theme: 'dark',
  language: 'en',
  timezone: 'America/New_York',
})

// Request context
setSentryContext('request', {
  endpoint: '/api/projects',
  method: 'POST',
  payload: { name: 'New Project' },
})
```

## Performance Monitoring

```typescript
// Track async operation
const result = await startSpan(
  'Load Daily Reports',
  'http.request',
  async () => {
    return await fetchDailyReports(projectId)
  }
)

// Track synchronous operation
const data = startSpan('Process CSV', 'data.processing', () => {
  return processCsvFile(file)
})
```

## Construction-Specific Examples

### Safety Incident

```typescript
function trackSafetyIncident(incident: SafetyIncident) {
  setSentryContext('safety-incident', {
    type: incident.type,
    severity: incident.severity,
    location: incident.location,
    injuriesCount: incident.injuries_count,
  })

  captureMessage(
    `Safety incident reported: ${incident.type}`,
    incident.severity === 'critical' ? 'error' : 'warning',
    { incidentId: incident.id }
  )
}
```

### RFI Workflow

```typescript
async function submitRFI(rfi: RFI) {
  addSentryBreadcrumb('Submitting RFI', 'rfi-workflow', 'info', {
    rfiId: rfi.id,
    projectId: rfi.project_id,
  })

  try {
    const result = await startSpan('Submit RFI', 'rfi.submit', async () => {
      return await supabase.from('rfis').insert(rfi)
    })

    addSentryBreadcrumb('RFI submitted successfully', 'rfi-workflow', 'info')
    return result
  } catch (error) {
    captureException(error, {
      module: 'rfis',
      action: 'submit',
      rfiId: rfi.id,
    })
    throw error
  }
}
```

### Document Upload

```typescript
async function uploadConstructionDocument(file: File, projectId: string) {
  setSentryTag('feature', 'documents')
  setSentryContext('upload', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    projectId,
  })

  return await startSpan('Upload Document', 'document.upload', async () => {
    try {
      addSentryBreadcrumb('Starting document upload', 'upload', 'info', {
        fileName: file.name,
        size: file.size,
      })

      const result = await supabase.storage
        .from('documents')
        .upload(`${projectId}/${file.name}`, file)

      addSentryBreadcrumb('Upload completed', 'upload', 'info')
      return result
    } catch (error) {
      captureException(error, {
        module: 'documents',
        action: 'upload',
        fileName: file.name,
        projectId,
      })
      throw error
    }
  })
}
```

### Change Order Approval

```typescript
async function approveChangeOrder(changeOrderId: string) {
  addSentryBreadcrumb('Approving change order', 'change-order', 'info', {
    changeOrderId,
  })

  try {
    const result = await updateChangeOrder(changeOrderId, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    })

    captureMessage('Change order approved', 'info', {
      changeOrderId,
      amount: result.amount,
    })

    return result
  } catch (error) {
    captureException(error, {
      module: 'change-orders',
      action: 'approve',
      changeOrderId,
    })
    throw error
  }
}
```

### Daily Report Submission

```typescript
async function submitDailyReport(report: DailyReport) {
  setSentryTag('feature', 'daily-reports')
  setSentryContext('daily-report', {
    date: report.date,
    projectId: report.project_id,
    weatherCondition: report.weather_condition,
  })

  return await startSpan('Submit Daily Report', 'report.submit', async () => {
    try {
      addSentryBreadcrumb('Submitting daily report', 'report', 'info', {
        date: report.date,
      })

      const result = await supabase.from('daily_reports').insert(report)

      addSentryBreadcrumb('Daily report submitted', 'report', 'info')
      return result
    } catch (error) {
      captureException(error, {
        module: 'daily-reports',
        action: 'submit',
        date: report.date,
      })
      throw error
    }
  })
}
```

## React Error Boundary

```typescript
import { SentryErrorBoundary } from '@/lib/sentry'

function MyComponent() {
  return (
    <SentryErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="p-4 border border-red-300 rounded">
          <h2 className="text-red-600 font-bold">Something went wrong</h2>
          <p className="text-sm text-gray-600">{error.message}</p>
          <button onClick={resetError} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
            Try Again
          </button>
        </div>
      )}
    >
      <YourComponentThatMightError />
    </SentryErrorBoundary>
  )
}
```

## Testing

```typescript
// Quick test in console
import { captureMessage } from '@/lib/sentry'
captureMessage('Test from console', 'info')

// Or use the test button component
import { SentryTestButton } from '@/components/SentryTestButton'

// Add to any page (dev only)
{import.meta.env.DEV && <SentryTestButton />}
```

## Common Patterns

### Wrap API Calls

```typescript
async function apiCall<T>(
  operation: () => Promise<T>,
  context: { module: string; action: string }
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    captureException(error, context)
    throw error
  }
}

// Usage
const projects = await apiCall(
  () => supabase.from('projects').select('*'),
  { module: 'projects', action: 'fetch' }
)
```

### Track Form Submissions

```typescript
const handleSubmit = async (data: FormData) => {
  addSentryBreadcrumb('Form submission started', 'form', 'info', {
    formType: 'project-creation',
  })

  try {
    await createProject(data)
    addSentryBreadcrumb('Form submitted successfully', 'form', 'info')
  } catch (error) {
    captureException(error, {
      module: 'forms',
      formType: 'project-creation',
    })
    throw error
  }
}
```

### Track Page Views

```typescript
useEffect(() => {
  addSentryBreadcrumb(
    `Viewed ${pageName} page`,
    'navigation',
    'info',
    { path: location.pathname }
  )
}, [pageName, location])
```

## Dashboard Links

- **Issues**: https://sentry.io/organizations/o4510477741785088/issues/
- **Performance**: https://sentry.io/organizations/o4510477741785088/performance/
- **Releases**: https://sentry.io/organizations/o4510477741785088/releases/
- **Alerts**: https://sentry.io/organizations/o4510477741785088/alerts/

## Need Help?

See [SENTRY_SETUP_GUIDE.md](SENTRY_SETUP_GUIDE.md) for detailed documentation.
