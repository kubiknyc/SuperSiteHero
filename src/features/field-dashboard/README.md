# Field Dashboard Feature

## Overview

The Field Dashboard provides field personnel with a comprehensive morning briefing and quick access to daily tasks. It aggregates real-time data from multiple sources and displays it in a mobile-optimized, touch-friendly interface.

## Features

### 1. Morning Briefing Card

**Location:** `src/features/field-dashboard/components/MorningBriefingCard.tsx`

Displays:
- **Weather Summary**: Current conditions, temperature range, precipitation, and wind speed
- **Punch Items**: Count of open and in-progress items with priority breakdown
- **Scheduled Inspections**: List of today's inspections with times
- **Safety Alerts**: Recent safety observations requiring attention
- **Schedule Milestones**: Upcoming project milestones

Features:
- Pull-to-refresh gesture support
- Real-time updates via Supabase channels
- Skeleton loading states
- Mobile-optimized responsive design
- 44px minimum tap targets for touch interactions

### 2. Field Dashboard Hook

**Location:** `src/features/field-dashboard/hooks/useFieldDashboard.ts`

Aggregates data from:
- Punch items (from `usePunchItems`)
- Inspections (from `useInspections`)
- Safety observations (from `useObservations`)
- Weather (from `useWeatherForDate`)
- Schedule activities (from `useLookAheadActivities`)

Features:
- React Query caching with 5-minute stale time
- Automatic refetching on data changes
- Real-time subscriptions to relevant tables
- Optimistic updates for better UX
- Automatic cleanup of subscriptions

### 3. Enhanced Offline Indicator

**Location:** `src/components/offline/EnhancedOfflineIndicator.tsx`

Features:
- Network status badge (online/offline/slow/syncing)
- Pending sync count indicator
- Last sync timestamp
- Sync progress bar when syncing
- Detailed sync status in popover
- Mobile: bottom toast, Desktop: top-right badge

### 4. Field Dashboard Page

**Location:** `src/pages/field-dashboard/FieldDashboardPage.tsx`

Routes:
- `/field-dashboard` - Global dashboard
- `/projects/:projectId/field-dashboard` - Project-specific dashboard

Features:
- Morning briefing card
- Quick action buttons (Create Punch, Log Safety Observation, etc.)
- Enhanced offline indicator
- Project context integration
- Responsive layout for mobile and desktop

## Usage

### Accessing the Field Dashboard

Navigate to:
```
/field-dashboard
```

Or for a specific project:
```
/projects/:projectId/field-dashboard
```

### Using the Hook

```typescript
import { useFieldDashboard } from '@/features/field-dashboard'

function MyComponent({ projectId }: { projectId: string }) {
  const { data, isLoading, refetch } = useFieldDashboard({ projectId })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Today's Summary</h1>
      <p>Open Punch Items: {data?.punchItems.open}</p>
      <p>Scheduled Inspections: {data?.inspections.total}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  )
}
```

### Using the Components

```typescript
import { MorningBriefingCard } from '@/features/field-dashboard'

function Dashboard({ projectId }: { projectId: string }) {
  return (
    <div className="container">
      <MorningBriefingCard projectId={projectId} />
    </div>
  )
}
```

### Enhanced Offline Indicator

```typescript
import { EnhancedOfflineIndicator } from '@/components/offline'

function App() {
  const [syncStatus] = useState({
    isSyncing: false,
    pendingCount: 5,
    lastSyncAt: Date.now(),
  })

  return (
    <>
      <EnhancedOfflineIndicator
        syncStatus={syncStatus}
        position="top-right"
        showDetails={true}
        onSyncClick={() => console.log('Sync clicked')}
      />
      {/* Your app content */}
    </>
  )
}
```

## Real-time Updates

The dashboard automatically subscribes to real-time changes for:

1. **Punch Items**: INSERT, UPDATE, DELETE events
2. **Inspections**: INSERT, UPDATE events
3. **Safety Observations**: INSERT, UPDATE events

Subscriptions are automatically cleaned up when the component unmounts.

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   useFieldDashboard Hook                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ usePunchItems│  │useInspections│  │useObservations│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
│                    Aggregate Data                           │
│                           │                                 │
│         ┌─────────────────┴─────────────────┐              │
│         ↓                                   ↓              │
│  MorningBriefingCard              FieldDashboardPage       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
                  Supabase Realtime
              (Live updates via channels)
```

## File Structure

```
src/features/field-dashboard/
├── components/
│   ├── MorningBriefingCard.tsx    # Main briefing card component
│   └── index.ts                    # Component exports
├── hooks/
│   ├── useFieldDashboard.ts        # Main dashboard data hook
│   └── index.ts                    # Hook exports
├── index.ts                        # Feature public API
└── README.md                       # This file

src/pages/field-dashboard/
└── FieldDashboardPage.tsx          # Main dashboard page

src/components/offline/
├── EnhancedOfflineIndicator.tsx    # Offline status component
└── index.ts                        # Component exports
```

## TypeScript Types

### FieldDashboardData

```typescript
interface FieldDashboardData {
  punchItems: {
    total: number
    open: number
    inProgress: number
    byPriority: {
      critical: number
      high: number
      medium: number
      low: number
    }
    items: PunchItem[]
  }
  inspections: {
    total: number
    scheduled: Inspection[]
  }
  safetyAlerts: {
    total: number
    recent: SafetyObservation[]
  }
  weather: ExtendedWeatherData | null
  schedule: {
    activitiesToday: LookAheadActivity[]
    milestones: LookAheadActivity[]
  }
}
```

### SyncStatus

```typescript
interface SyncStatus {
  isSyncing: boolean
  pendingCount: number
  lastSyncAt: number | null
  failedCount?: number
  syncProgress?: {
    current: number
    total: number
  }
}
```

## Performance Considerations

1. **Lazy Loading**: Dashboard page is code-split and loaded on demand
2. **Query Caching**: React Query caches data with 5-minute stale time
3. **Optimistic Updates**: Immediate UI updates before server confirmation
4. **Selective Subscriptions**: Only subscribes when component is mounted
5. **Memoization**: Heavy computations are memoized to prevent re-renders

## Mobile Optimizations

1. **Pull-to-Refresh**: Native-like refresh gesture
2. **Touch Targets**: Minimum 44px height for all interactive elements
3. **Responsive Layout**: Adapts to mobile, tablet, and desktop screens
4. **Skeleton Loading**: Smooth loading experience
5. **Offline Support**: Works offline with pending sync indicator

## Testing

### Manual Testing Checklist

- [ ] Dashboard loads with correct data
- [ ] Pull-to-refresh works
- [ ] Real-time updates appear immediately
- [ ] Weather data displays correctly
- [ ] Punch items show correct counts
- [ ] Inspections list is accurate
- [ ] Safety alerts are visible
- [ ] Quick actions navigate correctly
- [ ] Offline indicator appears when offline
- [ ] Sync status updates correctly

### Integration Points

The field dashboard integrates with:
- Punch Lists feature
- Inspections feature
- Safety Observations feature
- Weather API
- Look-Ahead Planning feature
- Offline sync manager

## Future Enhancements

1. **Customizable Dashboard**: Allow users to configure what data to display
2. **Push Notifications**: Real-time alerts for critical items
3. **Voice Commands**: Hands-free operation for field use
4. **Offline Queue**: Show pending offline actions
5. **Historical Trends**: Show week-over-week comparisons
6. **Export to PDF**: Generate daily briefing reports

## Troubleshooting

### Dashboard not loading data

1. Check network connection
2. Verify project ID is valid
3. Check user permissions
4. Inspect browser console for errors

### Real-time updates not working

1. Verify Supabase Realtime is enabled
2. Check network connectivity
3. Verify subscriptions in browser dev tools
4. Check for console errors

### Weather data not showing

1. Verify project has coordinates set
2. Check weather API key is configured
3. Verify weather_history table exists
4. Check console for API errors

## Related Documentation

- [React Query Documentation](https://tanstack.com/query/latest)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Project Architecture](../../CLAUDE.md)
- [Offline Support](../../lib/offline/README.md)
