# Sentry Error Tracking Setup Guide

Sentry has been installed and configured for your construction field management platform. This guide will help you complete the setup.

## What Was Installed

- ✅ `@sentry/react` - Sentry React SDK
- ✅ `src/lib/sentry.ts` - Sentry configuration and utilities
- ✅ Environment variables added to `.env.mcp.example`

## Setup Steps

### 1. Create a Sentry Account

1. Go to [https://sentry.io/signup/](https://sentry.io/signup/)
2. Sign up for a free account (supports up to 5,000 errors/month)
3. Create a new organization

### 2. Create a React Project

1. In Sentry dashboard, click "Projects" → "Create Project"
2. Select **React** as the platform
3. Name it: `SuperSiteHero` (or your project name)
4. Choose an alert frequency
5. Click "Create Project"

### 3. Get Your DSN

After creating the project:
1. Go to **Settings** → **Projects** → Select your project
2. Click **Client Keys (DSN)**
3. Copy the DSN (looks like: `https://abc123@o123456.ingest.sentry.io/456789`)

### 4. Configure Environment Variables

Add to your `.env.local` file:

```bash
# Sentry Error Tracking (Application)
VITE_SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_DEBUG=false
VITE_APP_VERSION=1.0.0
```

For production (`.env.production`):
```bash
VITE_SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_DEBUG=false
VITE_APP_VERSION=1.0.0
```

### 5. Initialize Sentry in Your App

Update your `src/main.tsx` or `src/App.tsx`:

```typescript
import { initSentry } from './lib/sentry';

// Initialize Sentry before React renders
initSentry();

// Rest of your app initialization...
```

### 6. Integrate with Authentication

In your auth context (`src/lib/auth/AuthContext.tsx`), add:

```typescript
import { setSentryUser, clearSentryUser } from '../sentry';

// After successful login:
setSentryUser(user.id, user.company_id);

// On logout:
clearSentryUser();
```

### 7. Add Error Boundaries (Optional but Recommended)

Wrap critical parts of your app:

```typescript
import { SentryErrorBoundary } from './lib/sentry';

function App() {
  return (
    <SentryErrorBoundary
      fallback={({ error }) => (
        <div>An error occurred: {error.message}</div>
      )}
    >
      <YourApp />
    </SentryErrorBoundary>
  );
}
```

## Usage Examples

### Track Errors Manually

```typescript
import { captureException, captureMessage } from './lib/sentry';

try {
  // Your code
} catch (error) {
  captureException(error, {
    module: 'projects',
    action: 'create',
    projectId: project.id,
  });
}
```

### Add Breadcrumbs

```typescript
import { addSentryBreadcrumb } from './lib/sentry';

addSentryBreadcrumb(
  'User started creating daily report',
  'user-action',
  'info',
  { projectId: '123', date: '2025-12-04' }
);
```

### Set Custom Tags

```typescript
import { setSentryTag, setSentryContext } from './lib/sentry';

// Tag for filtering in Sentry dashboard
setSentryTag('feature', 'daily-reports');
setSentryTag('user-role', 'superintendent');

// Context for additional debugging
setSentryContext('project', {
  id: project.id,
  name: project.name,
  status: project.status,
});
```

### Performance Monitoring

```typescript
import { startTransaction } from './lib/sentry';

const transaction = startTransaction('Load Daily Reports', 'http.request');
try {
  const reports = await fetchDailyReports();
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('error');
  throw error;
} finally {
  transaction.finish();
}
```

## Construction-Specific Use Cases

### Track Safety Incidents

```typescript
import { captureMessage, setSentryContext } from './lib/sentry';

function reportSafetyIncident(incident: SafetyIncident) {
  setSentryContext('safety-incident', {
    type: incident.type,
    severity: incident.severity,
    projectId: incident.project_id,
    location: incident.location,
  });

  captureMessage(
    `Safety incident reported: ${incident.type}`,
    'warning',
    { incident }
  );
}
```

### Monitor RFI Processing

```typescript
import { addSentryBreadcrumb, captureException } from './lib/sentry';

async function processRFI(rfi: RFI) {
  addSentryBreadcrumb('Started RFI processing', 'rfi', 'info', {
    rfiId: rfi.id,
    status: rfi.status,
  });

  try {
    // Process RFI
    await updateRFIStatus(rfi.id, 'reviewed');

    addSentryBreadcrumb('RFI processed successfully', 'rfi', 'info');
  } catch (error) {
    captureException(error, {
      module: 'rfis',
      rfiId: rfi.id,
      projectId: rfi.project_id,
    });
    throw error;
  }
}
```

### Track Document Uploads

```typescript
import { startTransaction, captureException } from './lib/sentry';

async function uploadDocument(file: File, projectId: string) {
  const transaction = startTransaction('Upload Document', 'document.upload');

  transaction.setData({
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    projectId,
  });

  try {
    const result = await supabase.storage
      .from('documents')
      .upload(`${projectId}/${file.name}`, file);

    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('error');
    captureException(error, {
      module: 'documents',
      fileName: file.name,
      projectId,
    });
    throw error;
  } finally {
    transaction.finish();
  }
}
```

## Sentry Dashboard Features

### Error Tracking
- View all errors grouped by type
- See stack traces and context
- Track error frequency and trends
- Set up alerts for critical errors

### Performance Monitoring
- Track slow database queries
- Monitor API response times
- Identify performance bottlenecks
- View user transaction traces

### Session Replay
- Watch user sessions leading to errors
- See exactly what the user did
- Debug UI issues visually
- Understand user behavior

### Releases
- Track errors by app version
- See which release introduced an error
- Monitor deployment health
- Set up release notifications

## Best Practices

### 1. Don't Send PII
The configuration already filters out:
- Email addresses
- Authorization headers
- Cookies
- IP addresses

### 2. Use Environments
- `development` - For local testing
- `staging` - For QA testing
- `production` - For live application

### 3. Set Up Alerts
Configure alerts for:
- High error rates
- New error types
- Performance degradation
- Critical errors

### 4. Use Source Maps (Production)
Add to your `vite.config.ts`:

```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    sentryVitePlugin({
      org: 'your-org',
      project: 'supersitehero',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

### 5. Monitor Key Metrics
For construction projects, track:
- Daily report submission success rate
- Document upload failures
- RFI response times
- Safety incident reporting accuracy
- Offline sync success rate

## Getting the MCP Server Auth Token

For the Sentry MCP server (to query errors from Claude Code):

1. Go to [https://sentry.io/](https://sentry.io/)
2. Click your avatar → **User settings**
3. Go to **Auth Tokens**
4. Click **Create New Token**
5. Name: "Claude Code MCP"
6. Scopes: `project:read`, `org:read`
7. Click **Create Token**
8. Copy the token and add to environment variables:
   ```bash
   SENTRY_AUTH_TOKEN=your_token_here
   ```

## Testing Your Setup

### 1. Test Error Tracking

Add a test button to your app:

```typescript
import { captureException } from './lib/sentry';

function TestSentry() {
  return (
    <button
      onClick={() => {
        try {
          throw new Error('Test error from SuperSiteHero');
        } catch (error) {
          captureException(error);
        }
      }}
    >
      Test Sentry
    </button>
  );
}
```

### 2. Check Sentry Dashboard

1. Click the button
2. Go to Sentry dashboard
3. You should see the error appear within seconds

### 3. Verify User Context

After login, check that user ID is attached to errors in Sentry.

## Cost Information

**Free Tier:**
- 5,000 errors/month
- 10,000 performance units/month
- 30 days data retention
- Unlimited projects

**Paid Plans:**
- Developer: $26/month (50k errors)
- Team: $80/month (100k errors)
- Business: Custom pricing

For most construction projects, the free tier is sufficient to start.

## Support

- **Documentation**: [https://docs.sentry.io/platforms/javascript/guides/react/](https://docs.sentry.io/platforms/javascript/guides/react/)
- **Status**: [https://status.sentry.io/](https://status.sentry.io/)
- **Community**: [https://github.com/getsentry/sentry](https://github.com/getsentry/sentry)

## Next Steps

1. ✅ Create Sentry account
2. ✅ Create React project in Sentry
3. ✅ Get DSN and add to `.env.local`
4. ✅ Initialize Sentry in `src/main.tsx`
5. ✅ Integrate with auth context
6. ✅ Add error boundaries
7. ✅ Test error tracking
8. ✅ Set up alerts
9. ✅ Configure source maps for production
10. ✅ Train team on Sentry dashboard

---

**Your construction platform now has enterprise-grade error tracking!** 🎉
