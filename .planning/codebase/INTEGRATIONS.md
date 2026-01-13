# External Integrations

> Generated: 2026-01-13 | Project: JobSight (SuperSiteHero)

## Database: Supabase (PostgreSQL)

### Configuration
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  }
)
```

### Environment Variables
```env
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Type Generation
```bash
# Generate types from Supabase
supabase gen types typescript --project-id <id> > src/types/database.generated.ts
```

### Offline-Synced Tables
| Table | Priority | Description |
|-------|----------|-------------|
| projects | 100 | Project data |
| safety_incidents | 95 | Safety records |
| daily_reports | 90 | Daily reports |
| workflow_items | 85 | RFIs, submittals |
| tasks | 80 | Task management |
| punch_items | 75 | Punch lists |
| documents | 70 | Documents |
| checklists | 65 | Checklists |
| meetings | 60 | Meeting records |
| contacts | 50 | Contacts |

## Authentication: Supabase Auth

### Features
- Email/password authentication
- OAuth flow support
- Session persistence (localStorage)
- Auto-refresh of JWT tokens
- Multi-factor authentication (TOTP)
- Session hijack detection

### Implementation
```typescript
// src/lib/auth/AuthContext.tsx
export function AuthProvider({ children }) {
  // Session management
  // User profile fetching
  // Transient error retry (max 2)
  // Online/offline detection
}
```

### Security Features
- Device fingerprinting
- Activity monitoring
- Sentry security event logging
- Session timeout handling

## Error Tracking: Sentry

### Configuration
```typescript
// src/lib/sentry.ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  release: import.meta.env.VITE_APP_VERSION,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllMedia: true,
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

### Environment Variables
```env
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_SENTRY_ENVIRONMENT=production
VITE_APP_VERSION=1.0.0
```

### Features
- Browser tracing
- Session replay
- Error filtering
- Sensitive data redaction
- User context tracking

## Analytics

### Vercel Analytics
```typescript
// src/main.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

<Analytics />
<SpeedInsights />
```

### Web Vitals
```typescript
// src/lib/performance/web-vitals.ts
import { onCLS, onFID, onLCP, onINP } from 'web-vitals'

// Core Web Vitals reporting
```

## File Storage: Supabase Storage

### Implementation
- S3-compatible storage
- Bucket management
- File validation
- Progress tracking
- Retry logic

### Files
- `src/lib/storage/upload.ts`
- `src/features/documents/utils/fileUtils.ts`
- `src/lib/storage/message-uploads.ts`
- `src/lib/storage/punch-item-uploads.ts`

## Realtime: Supabase Realtime

### Configuration
```typescript
// src/lib/supabase.ts
export function subscribeToTableChanges(
  tableName: string,
  projectId: string,
  callback: (payload) => void
) {
  return supabase
    .channel(`${tableName}-${projectId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: tableName, filter: `project_id=eq.${projectId}` },
      callback
    )
    .subscribe()
}
```

### Features
- PostgreSQL change subscriptions
- Project-filtered (multi-tenant)
- Event types: INSERT, UPDATE, DELETE
- React Query cache invalidation
- Automatic channel cleanup

## Email: Resend / Console

### Configuration
```env
# Production
VITE_EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx  # Supabase secret
EMAIL_FROM=noreply@jobsight.com  # Supabase secret

# Development
VITE_EMAIL_PROVIDER=console
```

### Implementation
- Edge Functions for delivery
- HTML template support
- Test utilities in browser console

## Push Notifications

### VAPID Keys
```env
VITE_VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx  # Supabase secret
```

### Features
- Web Push API
- Browser-based notifications
- Service Worker integration

## Security: Cloudflare Turnstile

### Configuration
```env
VITE_TURNSTILE_SITE_KEY=xxx
TURNSTILE_SECRET_KEY=xxx  # Supabase secret
```

### Usage
- CAPTCHA protection
- Rate limiting
- Bot prevention

## Optional: Google Drive MCP

### Configuration
```env
GDRIVE_CLIENT_ID=xxx
GDRIVE_CLIENT_SECRET=xxx
# OAuth callback: http://localhost:3000/oauth/callback
```

## Mobile: Capacitor Plugins

### Available Plugins
| Plugin | Version | Purpose |
|--------|---------|---------|
| @capacitor/camera | 7.x | Photo capture |
| @capacitor/geolocation | 7.x | GPS location |
| @capacitor/device | 7.x | Device info |
| @capacitor/network | 7.x | Network status |
| @capacitor/keyboard | 7.x | Keyboard events |
| @capacitor/app | 7.x | App lifecycle |
| @capacitor/haptics | 7.x | Haptic feedback |

## API Service Layer

### Location
`src/lib/api/services/` (100+ services)

### Examples
- `daily-reports.ts` - Daily report CRUD
- `tasks.ts` - Task management
- `projects.ts` - Project operations
- `change-orders.ts` - Change order workflows
- `rfis.ts` - RFI management
- `documents.ts` - Document handling

### Pattern
```typescript
// Each service exports typed functions
export async function getDailyReports(projectId: string) {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('project_id', projectId)
  if (error) throw error
  return data
}
```

## Offline Infrastructure

### Components
| File | Purpose |
|------|---------|
| sync-manager.ts | Background sync orchestration |
| conflict-resolver.ts | Concurrent edit handling |
| indexeddb.ts | IndexedDB wrapper |
| priority-queue.ts | Sync prioritization |
| bandwidth-detector.ts | Network quality detection |
| storage-manager.ts | Storage quota management |
| message-queue.ts | Message queuing |
| photo-queue.ts | Photo upload optimization |

### Sync Strategy
- Exponential backoff: 5s → 15s → 30s → 1min → 5min
- Priority-based sync queue
- Network-aware batch sizing
- Conflict resolution (last-write-wins default)

## Performance Testing

### Lighthouse CI
- Automated performance testing
- PageSpeed insights integration

### K6 Load Testing
```
tests/load/
├── auth-scenarios.js
├── project-loading.js
├── document-processing.js
└── api-stress.js
```

## Environment Variables Summary

### Required
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Optional (Production)
```env
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=
VITE_APP_VERSION=
VITE_TURNSTILE_SITE_KEY=
VITE_VAPID_PUBLIC_KEY=
VITE_EMAIL_PROVIDER=
```

### Supabase Secrets
```
RESEND_API_KEY
EMAIL_FROM
TURNSTILE_SECRET_KEY
VAPID_PRIVATE_KEY
```

### Testing
```env
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
TEST_ADMIN_EMAIL=
TEST_ADMIN_PASSWORD=
```
