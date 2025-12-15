# Phase 3: Offline Sync & Conflict Resolution - Implementation Summary

## Overview

This document outlines the implementation of Phase 3 enhancements for the offline-first construction field management platform. Phase 3 focuses on advanced conflict resolution, selective sync prioritization, and improved user experience indicators.

## Milestone 3.1: Better Conflict Resolution UI

### 1. Conflict Resolver Utility
**File:** `src/lib/offline/conflict-resolver.ts`

**Features:**
- **Field-level diff detection** - Identifies exact fields that differ between local and server versions
- **Auto-merge strategies** - Implements last-write-wins, field-level merge, and manual resolution
- **Conflict history tracking** - Records all conflict resolutions for audit trail
- **Merge preview** - Shows the result before committing changes

**Key Classes:**
```typescript
class ConflictResolver {
  static detectFieldDiffs(localData, serverData): FieldDiff[]
  static applyLastWriteWins(localData, serverData, timestamps): MergedData
  static applyFieldLevelMerge(localData, serverData, diffs): MergedData
  static generateMergePreview(data, strategy): MergePreview
  static recordResolution(entityType, entityId, strategy): void
  static getRecommendedStrategy(data, metadata): ResolutionStrategy
}
```

**Auto-merge rules:**
- Server priority fields: `id`, `created_at`, `company_id`, `project_id` (security)
- Local priority fields: `updated_at`
- Null value merging: Use non-null value when available
- Conflict fields: Require manual resolution or strategy selection

### 2. Enhanced Conflict Resolution Dialog
**File:** `src/components/offline/EnhancedConflictResolutionDialog.tsx`

**UI Features:**
- **Side-by-side diff view** - Local vs server comparison with color coding
- **Field-level selection** - Radio buttons for choosing which value to keep per field
- **Preview pane** - Shows merged result before applying
- **Conflict metadata** - Displays timestamps, users, and change details
- **Strategy selector** - Bulk resolution options (Smart Merge, Last Write Wins, Keep Local, Keep Server, Manual)
- **Mobile-responsive** - Optimized layout for field workers on tablets/phones

**Resolution Strategies:**
1. **Smart Merge** - Auto-merges non-conflicting fields, prefers local for conflicts
2. **Last Write Wins** - Uses version with most recent timestamp
3. **Keep Local** - Discards all server changes
4. **Keep Server** - Discards all local changes
5. **Manual** - User selects value for each conflicting field

### 3. Conflict Resolution Hook
**File:** `src/hooks/useConflictResolution.ts`

**Hooks provided:**
```typescript
useDetectConflicts() → { detectConflict: (entityType, entityId, data) => ConflictDetectionResult }
useResolveConflict() → { resolveConflict: (conflict, strategy) => Promise<void>, resolving, error }
useConflictHistory(entityType?, entityId?) → { history, clearHistory }
useProactiveConflictDetection(entityType, entityId, localData) → { conflict, checking }
useAutoResolveConflicts(enabled) → { autoResolved, totalConflicts }
```

**Features:**
- Proactive conflict detection on data changes (debounced)
- Auto-resolution for simple conflicts with user override capability
- Conflict history viewing and auditing
- Error handling and retry logic

## Milestone 3.2: Selective Sync Prioritization

### 1. Priority Queue Manager
**File:** `src/lib/offline/priority-queue.ts`

**Priority Levels:**
- **Critical** - Safety incidents, JSAs, emergency contacts
- **High** - Punch items, daily reports, site instructions, inspections
- **Normal** - Tasks, RFIs, submittals, change orders, meetings
- **Low** - Photos, documents, drawings, attachments

**Features:**
- Priority-based ordering (critical items sync first)
- Size-based batching (small items sync before large for quick wins)
- Exponential backoff for failed items
- Resumable sync state (persists queue across app restarts)
- Queue statistics and filtering

**Key Methods:**
```typescript
class PriorityQueueManager {
  addItem(item): void
  getNextBatch(maxSize, maxItems): SyncBatch | null
  updateItemStatus(itemId, status, error?): void
  getStats(): QueueStatistics
  clearCompleted(): number
  getResumeState(): SerializableState
  restoreFromState(state): void
}
```

**Batch Creation Logic:**
1. Filter pending items (exclude failed with active backoff)
2. Separate small (<100KB) and large items
3. Fill batch with small items first for quick wins
4. Add large items if space remains
5. Respect maxSize and maxItems limits

### 2. Bandwidth Detector
**File:** `src/lib/offline/bandwidth-detector.ts`

**Features:**
- Network speed estimation using Navigator.connection API or fetch timing
- Adaptive batch sizes based on connection speed
- Different strategies for WiFi vs cellular
- Data saver mode detection and restrictions

**Speed Categories:**
- **Fast** - >5 Mbps upload, <100ms latency → 10MB batches (WiFi) / 5MB (cellular)
- **Medium** - 1-5 Mbps, 100-300ms latency → 2MB batches
- **Slow** - <1 Mbps or >300ms latency → 500KB batches
- **Offline** - No sync

**Adaptive Sync Config:**
```typescript
interface AdaptiveSyncConfig {
  maxBatchSize: number;        // Bytes per batch
  maxBatchItems: number;       // Items per batch
  retryDelay: number;          // ms between retries
  timeout: number;             // Request timeout
  enableBackgroundSync: boolean;
  enableLargeUploads: boolean; // Photos/documents
}
```

**Key Methods:**
```typescript
class BandwidthDetector {
  performBandwidthTest(): Promise<BandwidthMeasurement>
  measureDownloadSpeed(): Promise<number>
  measureUploadSpeed(): Promise<number>
  measureLatency(): Promise<number>
  getAdaptiveSyncConfig(): AdaptiveSyncConfig
  categorizeSpeed(bandwidth): NetworkSpeed
}
```

### 3. Enhanced Sync Manager
**File:** `src/lib/offline/sync-manager.ts` (updated)

**New Features:**
- Integrated priority queue for selective sync
- Bandwidth-adaptive batching
- Sync telemetry tracking (saves to database)
- Resumable batch operations
- Progress reporting

**Telemetry Tracked:**
```typescript
interface SyncTelemetry {
  user_id: string;
  sync_started_at: timestamp;
  sync_completed_at: timestamp;
  items_synced: number;
  total_bytes: number;
  duration_ms: number;
  network_type: 'wifi' | 'cellular' | etc;
  network_speed: 'fast' | 'medium' | 'slow';
  batch_count: number;
  errors: number;
}
```

**Enhanced Methods:**
```typescript
class SyncManager {
  updateBandwidthConfig(): Promise<void>
  processNextBatch(): Promise<SyncResult>
  saveSyncTelemetry(telemetry): Promise<void>
  getPriorityQueue(): PriorityQueueManager
  getBandwidthDetector(): BandwidthDetector
}
```

### 4. Sync Telemetry Table
**Migration:** `supabase/migrations/121_sync_telemetry.sql`

**Schema:**
```sql
CREATE TABLE sync_telemetry (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id),
  sync_started_at TIMESTAMPTZ,
  sync_completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  items_synced INTEGER,
  total_bytes BIGINT,
  batch_count INTEGER,
  errors INTEGER,
  network_type TEXT,
  network_speed TEXT
);
```

**Usage:**
- Analytics on sync performance
- Network quality trends
- Identify sync bottlenecks
- Company-wide sync health monitoring

## Milestone 3.3: Improved Offline Indicators

### 1. Sync Status Bar
**File:** `src/components/offline/SyncStatusBar.tsx`

**Features:**
- Persistent status bar (top or bottom of screen)
- Network badge: Online (green), Offline (red), Syncing (blue with animation)
- Pending items count
- Last sync time (relative: "2 min ago")
- Click to expand detailed sync information
- Progress bar during active sync
- Manual sync trigger button

**States:**
```typescript
// Network Status
isOnline + !isSyncing + pendingSyncs === 0 → "All synced" (green)
isOnline + !isSyncing + pendingSyncs > 0 → "N pending" (amber)
isOnline + isSyncing → "Syncing X of Y items..." (blue, animated)
!isOnline → "Working offline" (red)
```

**Popover Details:**
- Current network status
- Pending items count
- Last sync timestamp
- Sync progress (if active)
- Manual sync button
- Offline mode information

### 2. Entity Sync Badge
**File:** `src/components/offline/EntitySyncBadge.tsx`

**Features:**
- Small badge/indicator on list items
- Color-coded status:
  - **Yellow** - Queued for sync
  - **Blue** - Currently syncing (animated pulse)
  - **Green** - Synced successfully
  - **Red** - Sync failed (with error tooltip)
- Compact mode (2px dot) for mobile
- Full mode (badge with icon + label) for desktop
- Tooltip with sync details

**Usage:**
```tsx
<EntitySyncBadge
  status={item.syncStatus}
  lastSyncTime={item.lastSynced}
  error={item.syncError}
  compact={isMobile}
/>
```

### 3. Sync Progress Bar
**File:** `src/components/offline/SyncProgressBar.tsx`

**Features:**
- Linear progress bar during sync
- Current item / total items counter
- Percentage complete indicator
- Estimated time remaining
- Pause/Resume buttons (prepared for future implementation)
- Cancel button (optional)
- Auto-hides when not syncing

**Display:**
```
┌─────────────────────────────────────────┐
│ 🔄 Syncing Changes              [X] [■] │
│ ████████████████░░░░░░░░ 65%            │
│ 13 of 20 items          ~30s remaining  │
└─────────────────────────────────────────┘
```

### 4. Updated Offline Store
**File:** `src/stores/offline-store.ts` (updated)

**New State:**
```typescript
interface OfflineStore {
  // ... existing state
  syncProgress: SyncProgress | null;
  networkQuality: NetworkQuality | null;
  syncPreferences: SyncPreferences;
}

interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
}

interface NetworkQuality {
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  latency: number; // ms
  connectionType: string;
  lastMeasured: number;
}

interface SyncPreferences {
  autoSync: boolean;
  syncOnCellular: boolean;
  syncPhotosOnCellular: boolean;
  maxBatchSize: number;
  notifyOnSync: boolean;
}
```

**New Hooks:**
```typescript
useSyncProgress() → SyncProgress | null
useNetworkQuality() → NetworkQuality | null
useSyncPreferences() → SyncPreferences
```

## Testing Requirements

### Unit Tests
- [ ] ConflictResolver field diff detection
- [ ] ConflictResolver merge strategies
- [ ] PriorityQueue ordering and batching
- [ ] BandwidthDetector speed categorization
- [ ] SyncManager telemetry tracking

### Integration Tests
- [ ] End-to-end conflict resolution flow
- [ ] Priority queue with sync manager integration
- [ ] Bandwidth-adaptive sync configuration
- [ ] Telemetry saving to database

### UI Tests
- [ ] EnhancedConflictResolutionDialog rendering
- [ ] Field selection and merge preview
- [ ] SyncStatusBar state changes
- [ ] EntitySyncBadge status colors
- [ ] SyncProgressBar updates

### Offline Scenario Tests
- [ ] Conflict detection on update
- [ ] Priority queue FIFO ordering
- [ ] Bandwidth detection on different connections
- [ ] All indicators update correctly on offline → online transition
- [ ] Sync resumes after interruption
- [ ] Telemetry captures correct metrics

## Integration with Existing Code

### Daily Reports
```typescript
// In DailyReportEditPage or similar
import { useProactiveConflictDetection } from '@/hooks/useConflictResolution';
import { EntitySyncBadge } from '@/components/offline/EntitySyncBadge';

// Detect conflicts while editing
const { conflict } = useProactiveConflictDetection(
  'daily_reports',
  reportId,
  draftReport,
  true // enabled
);

// Show sync status
<EntitySyncBadge status={report.syncStatus} lastSyncTime={report.lastSynced} />
```

### Punch Lists
```typescript
// Add priority queue items for punch items
import { SyncManager } from '@/lib/offline/sync-manager';

const priorityQueue = SyncManager.getPriorityQueue();
priorityQueue.addItem({
  id: generateId(),
  entityType: 'punch_items',
  entityId: punchItem.id,
  operation: 'create',
  data: punchItem,
  timestamp: Date.now(),
  retries: 0,
  status: 'pending',
});
```

### App Layout
```typescript
// Add sync status bar to main layout
import { SyncStatusBar } from '@/components/offline/SyncStatusBar';
import { SyncProgressBar } from '@/components/offline/SyncProgressBar';

function AppLayout() {
  return (
    <>
      <SyncStatusBar position="top" />
      <SyncProgressBar />
      {/* rest of app */}
    </>
  );
}
```

## Performance Considerations

### Bandwidth Detection
- Runs automatically on network change
- Cached for 5 minutes to avoid excessive testing
- Uses lightweight test files (<100KB)
- Falls back to Navigator.connection API when available

### Priority Queue
- O(n log n) sorting on insertion
- O(1) status updates
- Periodic cleanup of completed items
- Persistent state in IndexedDB

### Conflict Resolution
- Field diffs calculated on-demand
- Merge previews cached per strategy
- History limited to 100 entries

### UI Performance
- SyncStatusBar updates throttled to 500ms
- Progress bar uses CSS transitions
- Entity badges use memo/shouldComponentUpdate
- Compact mode reduces DOM complexity

## Future Enhancements

### Conflict Resolution
- [ ] Visual diff highlighting (like Git diff)
- [ ] Three-way merge support
- [ ] Conflict resolution templates
- [ ] AI-suggested resolutions

### Sync Prioritization
- [ ] User-configurable priorities
- [ ] Smart prediction based on usage patterns
- [ ] Sync scheduling (sync during off-hours)
- [ ] Differential sync (only changed fields)

### Indicators
- [ ] Sync history timeline
- [ ] Network quality chart
- [ ] Sync performance analytics dashboard
- [ ] Push notifications for sync events

## Security Considerations

### Data Integrity
- Company_id and project_id never auto-merged (server always wins)
- User_id verified on all sync operations
- RLS policies enforced on telemetry table

### Conflict Resolution
- Audit trail of all resolutions
- User attribution for manual selections
- Timestamp verification to prevent replay attacks

### Bandwidth Detection
- No PII in test requests
- Rate-limited to prevent abuse
- Falls back gracefully on error

## Files Created/Modified

### New Files
```
src/lib/offline/conflict-resolver.ts
src/lib/offline/priority-queue.ts
src/lib/offline/bandwidth-detector.ts
src/components/offline/EnhancedConflictResolutionDialog.tsx
src/components/offline/SyncStatusBar.tsx
src/components/offline/EntitySyncBadge.tsx
src/components/offline/SyncProgressBar.tsx
src/hooks/useConflictResolution.ts
supabase/migrations/121_sync_telemetry.sql
```

### Modified Files
```
src/lib/offline/sync-manager.ts (enhanced with priority queue and bandwidth)
src/stores/offline-store.ts (added sync progress, network quality, preferences)
```

## Deployment Checklist

- [ ] Run database migration (121_sync_telemetry.sql)
- [ ] Update environment variables (if any new configs needed)
- [ ] Test on WiFi connection
- [ ] Test on cellular connection
- [ ] Test offline → online transition
- [ ] Verify telemetry data collection
- [ ] Monitor conflict resolution usage
- [ ] Check sync performance metrics

## Support & Documentation

For questions or issues:
1. Check this implementation guide
2. Review individual component documentation
3. Examine existing offline patterns in `offlineReportStore.ts` and `offlinePunchStore.ts`
4. Test locally with network throttling in DevTools

---

**Implementation Date:** 2025-12-14
**Phase:** 3 - Offline Sync & Conflict Resolution
**Status:** Complete - Ready for Testing
