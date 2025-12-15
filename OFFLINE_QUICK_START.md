# Offline-First Enhancement - Quick Start Guide

## Installation

**Good news:** All dependencies are already installed! No npm install needed.

---

## Step 1: Add Global Sync Status (5 minutes)

### Update your main App component

```typescript
// src/App.tsx or your root layout
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function App() {
  const { isOnline } = useOnlineStatus();

  // Get sync state from your store
  const pendingSyncs = 0; // Replace with actual count from store
  const isSyncing = false; // Replace with actual state
  const syncError = null; // Replace with actual error

  return (
    <div className="app">
      {/* Global sync status banner */}
      <SyncStatusBanner
        pendingSyncs={pendingSyncs}
        isSyncing={isSyncing}
        syncError={syncError}
        onRetrySync={() => {
          // Trigger manual sync
        }}
      />

      {/* Your existing app content */}
      <YourContent />
    </div>
  );
}
```

**Result:** Users will see a banner when offline, syncing, or if errors occur.

---

## Step 2: Add Sync Badges to Lists (10 minutes)

### Update any list component

```typescript
// Example: src/features/punch-lists/components/PunchListView.tsx
import { SyncBadge } from '@/components/SyncBadge';

function PunchListView({ items }) {
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between p-4 border rounded">
          <div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>

          {/* Add sync badge */}
          <SyncBadge
            status={item.syncStatus} // 'synced' | 'pending' | 'syncing' | 'error' | 'conflict'
            showLabel={true}
            size="md"
          />
        </div>
      ))}
    </div>
  );
}
```

**Result:** Each list item shows its sync status with a colored badge.

---

## Step 3: Add Conflict Resolution (15 minutes)

### Update your sync logic

```typescript
// Example: src/features/punch-lists/hooks/usePunchListSync.ts
import {
  detectConflict,
  resolveConflict,
  createConflictInfo,
} from '@/lib/offline/conflictResolution';
import { ConflictResolutionDialog } from '@/components/ConflictResolutionDialog';
import { useState } from 'react';

function usePunchListSync() {
  const [conflict, setConflict] = useState(null);

  const syncItem = async (localItem) => {
    // Fetch current server version
    const serverItem = await fetchFromServer(localItem.id);

    if (serverItem) {
      // Check for conflicts
      const hasConflict = detectConflict(
        localItem,
        serverItem,
        localItem.updated_at,
        serverItem.updated_at
      );

      if (hasConflict) {
        // Show conflict dialog
        const conflictInfo = createConflictInfo(
          'punch_list_items',
          localItem.id,
          localItem,
          serverItem,
          localItem.updated_at,
          serverItem.updated_at
        );

        setConflict(conflictInfo);
        return; // Pause sync until resolved
      }
    }

    // No conflict - proceed with sync
    await updateOnServer(localItem);
  };

  const handleResolveConflict = async (resolution) => {
    if (!conflict) return;

    // Resolve conflict
    const resolved = await resolveConflict(conflict, resolution);

    // Sync resolved version
    await updateOnServer(resolved);

    // Clear conflict
    setConflict(null);
  };

  return {
    syncItem,
    conflict,
    handleResolveConflict,
  };
}

// In your component:
function PunchListContainer() {
  const { conflict, handleResolveConflict } = usePunchListSync();

  return (
    <>
      {/* Your list */}

      {/* Conflict dialog */}
      <ConflictResolutionDialog
        conflict={conflict}
        open={!!conflict}
        onResolve={handleResolveConflict}
        onClose={() => setConflict(null)}
        entityDisplayName="punch list item"
      />
    </>
  );
}
```

**Result:** Users see a dialog when conflicts occur and can choose how to resolve them.

---

## Step 4: Monitor Network Status (5 minutes)

### Use the hook anywhere

```typescript
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function MyComponent() {
  const { isOnline, networkQuality, lastOfflineAt } = useOnlineStatus();

  // Show warnings for slow connections
  if (networkQuality.type === 'slow') {
    return <SlowConnectionWarning />;
  }

  // Disable certain features offline
  if (!isOnline) {
    return <OfflineMessage />;
  }

  // Normal render
  return <NormalContent />;
}
```

**Result:** Your components can react to network changes.

---

## Testing Your Implementation

### 1. Test Offline Mode (Chrome DevTools)

1. Open DevTools (F12)
2. Go to Network tab
3. Change throttling to "Offline"
4. Create/edit an item
5. Verify:
   - Banner shows "You're offline"
   - Badge shows "pending"
6. Go back online
7. Verify:
   - Auto-sync occurs
   - Badge changes to "synced"
   - Success banner appears

### 2. Test Slow Connection

1. DevTools → Network → "Slow 3G"
2. Verify orange warning banner
3. Attempt sync
4. Verify progress indicator

### 3. Test Conflicts

**Option A: Manual simulation**
```typescript
// In your component
const simulateConflict = () => {
  const conflict = createConflictInfo(
    'test_entity',
    'test-id',
    { name: 'Local Version', updated_at: 1000 },
    { name: 'Server Version', updated_at: 2000 },
    1000,
    2000
  );
  setConflict(conflict);
};
```

**Option B: Real scenario**
1. Create item online
2. Go offline
3. Edit the item
4. Manually update server (different browser/user)
5. Go online
6. Verify conflict dialog appears

---

## Run Automated Tests

```bash
# Test network detection
npm test -- useOnlineStatus --run

# Test conflict resolution
npm test -- conflictResolution --run

# Test UI components
npm test -- SyncBadge SyncStatusBanner --run

# All tests
npm test --run
```

**Expected:** All tests pass ✅

---

## Common Patterns

### Pattern 1: Optimistic Updates

```typescript
const updateItem = async (item) => {
  // Update UI immediately
  setItems(prev => prev.map(i => i.id === item.id ? { ...item, syncStatus: 'syncing' } : i));

  if (!isOnline) {
    // Queue for later
    setItems(prev => prev.map(i => i.id === item.id ? { ...item, syncStatus: 'pending' } : i));
    queueForSync(item);
    return;
  }

  try {
    // Sync to server
    await api.update(item);
    setItems(prev => prev.map(i => i.id === item.id ? { ...item, syncStatus: 'synced' } : i));
  } catch (error) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...item, syncStatus: 'error' } : i));
  }
};
```

### Pattern 2: Auto-Sync on Reconnect

```typescript
const { isOnline } = useOnlineStatus();

useEffect(() => {
  if (isOnline && hasPendingItems) {
    // Wait 1 second then sync
    const timer = setTimeout(() => {
      processSyncQueue();
    }, 1000);

    return () => clearTimeout(timer);
  }
}, [isOnline, hasPendingItems]);
```

### Pattern 3: Conflict Auto-Resolution

```typescript
// Auto-resolve with last-write-wins
const syncWithAutoResolve = async (item) => {
  const serverItem = await fetch(item.id);

  if (detectConflict(item, serverItem, item.updated_at, serverItem.updated_at)) {
    // Auto-resolve: server always wins for system fields
    const resolved = await resolveConflict(conflict, 'last-write-wins');
    await api.update(resolved);
  } else {
    await api.update(item);
  }
};
```

---

## Integration with Existing Code

### Daily Reports (Already Implemented)
The daily reports feature already has offline support. Use it as a reference:

```typescript
// Reference implementation
import { useOfflineReportStore } from '@/features/daily-reports/store/offlineReportStore';
import { useOfflineSync } from '@/features/daily-reports/hooks/useOfflineSync';

// Your new features can follow the same pattern
```

### Sync Manager (Already Exists)
The sync manager already handles background sync:

```typescript
import { SyncManager } from '@/lib/offline/sync-manager';

// Initialize in your app
useEffect(() => {
  const cleanup = SyncManager.initialize();
  return cleanup;
}, []);
```

---

## Troubleshooting

### Issue: Banner not showing

**Check:**
1. Is `SyncStatusBanner` added to your root component?
2. Are you passing the correct props?
3. Check console for errors

**Fix:**
```typescript
// Verify props are correct
console.log({ pendingSyncs, isSyncing, syncError });
```

### Issue: Sync badges not updating

**Check:**
1. Is `syncStatus` field present on items?
2. Is it one of the valid values?
3. Are items re-rendering?

**Fix:**
```typescript
// Ensure syncStatus is typed correctly
interface Item {
  syncStatus: 'synced' | 'pending' | 'syncing' | 'error' | 'conflict';
}
```

### Issue: Conflicts not detected

**Check:**
1. Are timestamps being tracked?
2. Is server returning `updated_at`?
3. Is conflict detection being called?

**Fix:**
```typescript
// Add logging
const hasConflict = detectConflict(local, server, localTs, serverTs);
console.log('Conflict detected:', hasConflict);
```

---

## Performance Tips

1. **Batch syncs** - Don't sync each item individually
   ```typescript
   // Bad
   items.forEach(item => syncItem(item));

   // Good
   await syncBatch(items);
   ```

2. **Throttle status updates** - Prevent excessive re-renders
   ```typescript
   const debouncedSync = useMemo(
     () => debounce(syncItem, 1000),
     []
   );
   ```

3. **Use memoization** - For expensive conflict checks
   ```typescript
   const conflicts = useMemo(
     () => items.filter(item => item.syncStatus === 'conflict'),
     [items]
   );
   ```

---

## Next Steps

### Phase 1: Basic Integration (Done!)
- [x] Add `SyncStatusBanner`
- [x] Add `SyncBadge` to lists
- [x] Handle conflicts

### Phase 2: Entity-Specific Stores
- [ ] Create `punchListStore.ts`
- [ ] Create `rfiStore.ts`
- [ ] Create `submittalStore.ts`

### Phase 3: Advanced Features
- [ ] Manual merge UI
- [ ] Offline photo optimization
- [ ] Background file uploads

---

## Resources

- **Full documentation:** `OFFLINE_ENHANCEMENT_IMPLEMENTATION.md`
- **File manifest:** `OFFLINE_ENHANCEMENT_FILES.md`
- **Working example:** `examples/offline-integration-example.tsx`
- **Existing reference:** `src/features/daily-reports/`

---

## Need Help?

1. Check the working example: `examples/offline-integration-example.tsx`
2. Look at test files for usage examples
3. Review existing daily reports implementation
4. Check browser console for logs
5. Run tests: `npm test`

---

**Time to complete:** ~30 minutes
**Difficulty:** Easy to Medium
**Impact:** High - Critical for field operations

**Happy coding!** 🚀
