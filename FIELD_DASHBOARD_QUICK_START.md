# Field Dashboard - Quick Start Guide

## Quick Access

Navigate to the field dashboard:
```
/field-dashboard
```

Or for a specific project:
```
/projects/:projectId/field-dashboard
```

## What You'll See

### Morning Briefing Card
- **Weather**: Today's forecast with temperature, precipitation, and wind
- **Punch Items**: Open and in-progress items with priority counts
- **Inspections**: Today's scheduled inspections
- **Safety Alerts**: Recent safety observations requiring attention
- **Milestones**: Upcoming project milestones

### Quick Actions
- Create Punch Item
- Log Safety Observation
- Take Photo
- Start Daily Report

### Offline Indicator
- Shows network status (online/offline/slow)
- Displays pending sync count
- Shows sync progress when syncing
- Click for detailed sync information

## Using the Components

### In Your Code

```typescript
import { MorningBriefingCard } from '@/features/field-dashboard'

function MyPage() {
  return <MorningBriefingCard projectId="project-id" />
}
```

### Using the Hook

```typescript
import { useFieldDashboard } from '@/features/field-dashboard'

function MyComponent({ projectId }: { projectId: string }) {
  const { data, isLoading, refetch } = useFieldDashboard({ projectId })

  // Access aggregated data
  console.log(data?.punchItems.open)
  console.log(data?.inspections.total)
  console.log(data?.weather)

  return <div>{/* Your UI */}</div>
}
```

## Key Features

### Real-time Updates
- Changes to punch items, inspections, and safety observations appear automatically
- No manual refresh needed (but pull-to-refresh is available)

### Mobile Optimized
- Pull down to refresh
- Large touch targets (44px minimum)
- Responsive layout for all screen sizes

### Offline Support
- Works offline with cached data
- Shows sync status when back online
- Pending changes sync automatically

## File Locations

### Components
- `src/features/field-dashboard/components/MorningBriefingCard.tsx`
- `src/components/offline/EnhancedOfflineIndicator.tsx`

### Hooks
- `src/features/field-dashboard/hooks/useFieldDashboard.ts`

### Pages
- `src/pages/field-dashboard/FieldDashboardPage.tsx`

### Routes (in App.tsx)
```typescript
<Route path="/field-dashboard" element={<FieldDashboardPage />} />
<Route path="/projects/:projectId/field-dashboard" element={<FieldDashboardPage />} />
```

## Customization Examples

### Custom Refresh Callback

```typescript
<MorningBriefingCard
  projectId={projectId}
  onRefresh={async () => {
    // Custom logic before/after refresh
    await someCustomLogic()
  }}
/>
```

### Custom Offline Indicator Position

```typescript
<EnhancedOfflineIndicator
  position="top-left"  // or "top-right" or "bottom"
  showDetails={true}
  onSyncClick={() => triggerManualSync()}
/>
```

## Troubleshooting

### No data showing?
1. Check that you're passing a valid `projectId`
2. Verify the project has data (punch items, inspections, etc.)
3. Check browser console for errors

### Real-time updates not working?
1. Verify Supabase Realtime is enabled
2. Check network connection
3. Look for WebSocket errors in console

### Weather not displaying?
1. Ensure project has latitude/longitude set
2. Verify weather API is configured
3. Check if weather_history table exists

## Performance Tips

1. The dashboard uses React Query caching - data stays fresh for 5 minutes
2. Real-time subscriptions are cleaned up automatically on unmount
3. Pull-to-refresh forces a fresh fetch
4. Use the dashboard as the main entry point for field personnel

## Integration with Existing Features

The dashboard seamlessly integrates with:
- **Punch Lists**: Click punch item counts to navigate to full list
- **Inspections**: Click inspection items to view details
- **Safety**: Click safety alerts to view observations
- **Weather**: Uses same weather API as daily reports
- **Schedule**: Shows activities from look-ahead planning

## Common Use Cases

### Daily Site Check-in
1. Open field dashboard
2. Review weather conditions
3. Check punch items assigned to you
4. Review scheduled inspections
5. Check safety alerts
6. Use quick actions to log updates

### Quick Status Update
1. Pull to refresh for latest data
2. Review counts and priorities
3. Navigate to specific items as needed

### Offline Work
1. Dashboard works offline with cached data
2. Create punch items/observations offline
3. Check sync status in offline indicator
4. Data syncs when back online

## API Reference

### useFieldDashboard Hook

```typescript
function useFieldDashboard(options: {
  projectId: string | undefined
  enabled?: boolean
}): {
  data: FieldDashboardData | null
  isLoading: boolean
  refetch: () => void
}
```

### FieldDashboardData Type

```typescript
interface FieldDashboardData {
  punchItems: {
    total: number
    open: number
    inProgress: number
    byPriority: { critical: number; high: number; medium: number; low: number }
    items: PunchItem[]
  }
  inspections: { total: number; scheduled: Inspection[] }
  safetyAlerts: { total: number; recent: SafetyObservation[] }
  weather: ExtendedWeatherData | null
  schedule: {
    activitiesToday: LookAheadActivity[]
    milestones: LookAheadActivity[]
  }
}
```

## Best Practices

1. **Use as Landing Page**: Set as default page for field users
2. **Pull to Refresh**: Train users to pull down for updates
3. **Check Offline Status**: Monitor sync indicator for offline work
4. **Quick Actions**: Use quick action buttons for common tasks
5. **Navigate Naturally**: Click on cards/items to drill into details

## Next Steps

- Review full documentation in `src/features/field-dashboard/README.md`
- Customize dashboard for your workflow
- Add custom quick actions as needed
- Configure project coordinates for weather
- Set up real-time notifications

## Support

For issues or questions:
1. Check the comprehensive README
2. Review existing hook implementations
3. Check browser console for errors
4. Verify project setup and permissions
