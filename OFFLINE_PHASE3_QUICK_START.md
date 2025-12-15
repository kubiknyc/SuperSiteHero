# Phase 3 Offline Enhancements - Quick Start Guide

## Overview
This guide helps you quickly integrate Phase 3 offline enhancements into your construction field management app.

## Prerequisites
- Completed Phase 1 & 2 offline features
- Existing offline stores (`offlineReportStore`, `offlinePunchStore`)
- Supabase database access

## Quick Setup (5 steps)

### Step 1: Run Database Migration
```bash
# Apply sync telemetry table
psql -d your_database < supabase/migrations/121_sync_telemetry.sql

# Or via Supabase CLI
supabase db push
```

### Step 2: Add Sync Status Bar to App Layout
```tsx
// src/components/layout/AppLayout.tsx
import { SyncStatusBar } from '@/components/offline/SyncStatusBar';
import { SyncProgressBar } from '@/components/offline/SyncProgressBar';

export function AppLayout() {
  return (
    <div className="min-h-screen">
      {/* Add at top of layout */}
      <SyncStatusBar position="top" />

      {/* Add before main content */}
      <SyncProgressBar showDetails />

      {/* Your existing layout */}
      <main>{children}</main>
    </div>
  );
}
```

### Step 3: Add Entity Sync Badges to Lists
```tsx
// Example: Daily Reports List
import { EntitySyncBadge } from '@/components/offline/EntitySyncBadge';

function DailyReportListItem({ report }) {
  // Determine sync status from offline store
  const syncStatus = report.synced ? 'synced' : 'queued';

  return (
    <div className="flex items-center justify-between">
      <h3>{report.title}</h3>
      <EntitySyncBadge
        status={syncStatus}
        lastSyncTime={report.lastSyncedAt}
        compact={false}
      />
    </div>
  );
}
```

### Step 4: Enable Proactive Conflict Detection
```tsx
// Example: Edit Daily Report Page
import { useProactiveConflictDetection } from '@/hooks/useConflictResolution';
import { EnhancedConflictResolutionDialog } from '@/components/offline/EnhancedConflictResolutionDialog';

function DailyReportEditPage() {
  const [report, setReport] = useState(null);

  // Enable conflict detection
  const { conflict, checking } = useProactiveConflictDetection(
    'daily_reports',
    report?.id,
    report,
    true // enabled when editing
  );

  const [showConflictDialog, setShowConflictDialog] = useState(false);

  useEffect(() => {
    if (conflict) {
      setShowConflictDialog(true);
    }
  }, [conflict]);

  return (
    <>
      {checking && <div>Checking for conflicts...</div>}

      {/* Your form */}

      <EnhancedConflictResolutionDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflict={conflict}
      />
    </>
  );
}
```

### Step 5: Initialize Priority Queue and Bandwidth Detection
```tsx
// src/main.tsx or App.tsx
import { SyncManager } from '@/lib/offline/sync-manager';
import { initOfflineListeners } from '@/stores/offline-store';

function App() {
  useEffect(() => {
    // Initialize offline listeners
    const cleanupOffline = initOfflineListeners();

    // Initialize sync manager with priority queue and bandwidth detection
    const cleanupSync = SyncManager.initialize();

    // Perform initial bandwidth test
    SyncManager.updateBandwidthConfig();

    return () => {
      cleanupOffline();
      cleanupSync();
    };
  }, []);

  return <YourApp />;
}
```

## Usage Examples

### Example 1: Adding Items to Priority Queue
```tsx
import { SyncManager } from '@/lib/offline/sync-manager';

// Add a punch item to sync queue
const priorityQueue = SyncManager.getPriorityQueue();

priorityQueue.addItem({
  id: crypto.randomUUID(),
  entityType: 'punch_items', // Auto-assigned 'high' priority
  entityId: punchItem.id,
  operation: 'create',
  data: punchItem,
  timestamp: Date.now(),
  retries: 0,
  status: 'pending',
});
```

### Example 2: Manual Conflict Resolution
```tsx
import { useResolveConflict } from '@/hooks/useConflictResolution';
import { ConflictResolver } from '@/lib/offline/conflict-resolver';

function MyComponent() {
  const { resolveConflict, resolving } = useResolveConflict();

  const handleResolve = async (conflict) => {
    // Option 1: Use recommended strategy
    const strategy = ConflictResolver.getRecommendedStrategy(
      conflict.localData,
      conflict.serverData,
      conflict
    );
    await resolveConflict(conflict, strategy);

    // Option 2: Use specific strategy
    await resolveConflict(conflict, 'field-level-merge');

    // Option 3: Manual field selections
    const selections = [
      { field: 'title', source: 'local' },
      { field: 'description', source: 'server' },
    ];
    await resolveConflict(conflict, 'manual', selections);
  };
}
```

### Example 3: Monitoring Sync Progress
```tsx
import { useSyncProgress, useIsSyncing } from '@/stores/offline-store';

function SyncMonitor() {
  const isSyncing = useIsSyncing();
  const progress = useSyncProgress();

  if (!isSyncing || !progress) return null;

  return (
    <div>
      Syncing: {progress.current} / {progress.total} ({progress.percentage}%)
    </div>
  );
}
```

### Example 4: Adaptive Sync Based on Network
```tsx
import { SyncManager } from '@/lib/offline/sync-manager';

// Get adaptive configuration
const bandwidthDetector = SyncManager.getBandwidthDetector();
const config = bandwidthDetector.getAdaptiveSyncConfig();

console.log('Max batch size:', config.maxBatchSize);
console.log('Large uploads enabled:', config.enableLargeUploads);

// Conditionally sync based on network
if (config.enableLargeUploads) {
  // Sync photos/documents
  syncPhotos();
} else {
  // Skip large files on slow connection
  console.log('Skipping photos on slow connection');
}
```

## Component Props Reference

### SyncStatusBar
```tsx
<SyncStatusBar
  position="top" | "bottom"  // Where to place the bar
  className="custom-class"   // Optional styling
/>
```

### EntitySyncBadge
```tsx
<EntitySyncBadge
  status="queued" | "syncing" | "synced" | "error"
  lastSyncTime={timestamp}   // Optional: number | null
  error="error message"      // Optional: string
  compact={false}            // Compact mode for mobile
  className="custom-class"   // Optional styling
/>
```

### SyncProgressBar
```tsx
<SyncProgressBar
  showDetails={true}         // Show time remaining
  onCancel={() => {}}        // Optional cancel handler
  className="custom-class"   // Optional styling
/>
```

### EnhancedConflictResolutionDialog
```tsx
<EnhancedConflictResolutionDialog
  open={boolean}
  onOpenChange={(open) => {}}
  conflict={SyncConflict | null}
/>
```

## Testing Your Integration

### 1. Test Offline Indicators
```bash
# In Chrome DevTools
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Make changes to a daily report
4. Check that SyncStatusBar shows "Working offline"
5. Check that EntitySyncBadge shows "queued" status
```

### 2. Test Conflict Resolution
```bash
# Simulate conflict
1. Open daily report in two browser tabs
2. Edit different fields in each tab
3. Save first tab (goes to server)
4. Save second tab
5. Conflict dialog should appear
6. Choose resolution strategy
7. Verify merged result
```

### 3. Test Priority Sync
```bash
# Verify priority ordering
1. Go offline
2. Create: 1 safety incident, 1 photo, 1 punch item
3. Go back online
4. Watch network tab - safety incident should sync first
```

### 4. Test Bandwidth Adaptation
```bash
# Different network conditions
1. DevTools → Network → Fast 3G
2. Trigger sync
3. Check batch sizes in console (should be smaller)
4. Switch to "No throttling"
5. Trigger sync
6. Check batch sizes (should be larger)
```

## Common Issues & Solutions

### Issue: Conflict Dialog Not Appearing
**Solution:** Ensure you're calling `useProactiveConflictDetection` with enabled=true
```tsx
const { conflict } = useProactiveConflictDetection(
  'daily_reports',
  reportId,
  localData,
  true // ← Must be true
);
```

### Issue: Priority Queue Not Working
**Solution:** Make sure items are added to queue, not just offline store
```tsx
// ❌ Wrong - only updates offline store
offlineStore.addDraft(data);

// ✅ Correct - adds to priority queue
const priorityQueue = SyncManager.getPriorityQueue();
priorityQueue.addItem({...});
```

### Issue: Sync Progress Not Updating
**Solution:** SyncManager needs to update the store
```tsx
// In your sync logic
const { setSyncProgress } = useOfflineStore.getState();

// Update progress during sync
setSyncProgress({
  current: completedItems,
  total: totalItems,
  percentage: Math.round((completedItems / totalItems) * 100),
});

// Clear when done
setSyncProgress(null);
```

### Issue: Bandwidth Detection Failing
**Solution:** Provide fallback for browsers without Network Information API
```tsx
const detector = SyncManager.getBandwidthDetector();

try {
  await detector.performBandwidthTest();
} catch (error) {
  // Fallback to default configuration
  console.warn('Bandwidth test failed, using defaults');
}
```

## Performance Tips

1. **Throttle Conflict Detection**
   - Uses 2-second debounce by default
   - Don't check on every keystroke

2. **Batch Priority Queue Operations**
   ```tsx
   // ❌ Slow - adds one at a time
   items.forEach(item => queue.addItem(item));

   // ✅ Fast - adds in bulk
   queue.addItems(items);
   ```

3. **Use Compact Mode on Mobile**
   ```tsx
   const isMobile = window.innerWidth < 768;

   <EntitySyncBadge compact={isMobile} />
   ```

4. **Limit Telemetry Saves**
   - Telemetry auto-saves after each sync
   - Don't manually save on every operation

## Next Steps

1. ✅ **Integrate components** into your app layout
2. ✅ **Test offline scenarios** thoroughly
3. ✅ **Monitor sync telemetry** in database
4. ✅ **Gather user feedback** on conflict resolution UX
5. ✅ **Optimize batch sizes** based on real-world usage
6. ✅ **Set up analytics** for sync performance

## Resources

- **Full Documentation:** `OFFLINE_PHASE3_IMPLEMENTATION.md`
- **Conflict Resolver:** `src/lib/offline/conflict-resolver.ts`
- **Priority Queue:** `src/lib/offline/priority-queue.ts`
- **Bandwidth Detector:** `src/lib/offline/bandwidth-detector.ts`
- **Hooks:** `src/hooks/useConflictResolution.ts`

## Support

For issues or questions:
1. Check component JSDoc comments
2. Review test files (when available)
3. Examine existing offline patterns
4. Test with network throttling in DevTools

---

**Quick Start Version:** 1.0
**Last Updated:** 2025-12-14
**Compatible With:** Phase 1 & 2 Offline Features
