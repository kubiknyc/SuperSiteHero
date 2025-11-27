# Offline-First Architecture - Developer Guide

**Last Updated:** 2025-11-25

This document provides comprehensive guidance for developers working with the offline-first architecture in SuperSiteHero.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Using the OfflineClient](#using-the-offlineclient)
4. [State Management](#state-management)
5. [Background Sync](#background-sync)
6. [Testing Offline Functionality](#testing-offline-functionality)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

SuperSiteHero implements a comprehensive offline-first architecture that allows users to continue working even without network connectivity. Changes made offline are automatically queued and synced when connectivity is restored.

### Key Features

- **Automatic Caching**: API responses are cached in IndexedDB with configurable TTL
- **Mutation Queuing**: Create, update, and delete operations are queued when offline
- **Background Sync**: Automatic synchronization when network is restored
- **Conflict Detection**: Identifies and helps resolve data conflicts
- **Storage Management**: Intelligent quota monitoring and cleanup
- **PWA Support**: Service Worker integration for enhanced offline capabilities

---

## Architecture Components

### 1. IndexedDB Layer

**File:** `src/lib/offline/indexeddb.ts`

Four object stores for offline data:

```typescript
// Store Types
{
  cachedData: {      // API response caching
    key: string      // Format: "table:id" or "table:list:hash"
    table: string
    data: any
    timestamp: number
    expiresAt: number
    version: number
    syncedAt: number | null
  },

  syncQueue: {       // Pending mutations
    id: string       // UUID
    type: 'create' | 'update' | 'delete'
    table: string
    data?: any
    recordId?: string
    timestamp: number
    retryCount: number
    status: 'pending' | 'processing' | 'failed' | 'completed'
    priority: 'high' | 'normal' | 'low'
  },

  downloads: {       // User-controlled downloads
    id: string
    type: 'project' | 'document' | 'photos'
    resourceId: string
    status: 'downloading' | 'complete' | 'error'
    progress: number
    size: number
  },

  conflicts: {       // Data conflicts
    id: string
    table: string
    recordId: string
    localVersion: any
    remoteVersion: any
    timestamp: number
    resolved: boolean
  }
}
```

### 2. Storage Manager

**File:** `src/lib/offline/storage-manager.ts`

Manages caching strategies and storage optimization:

```typescript
// Cache strategies by table
const CACHE_STRATEGIES = {
  projects: { ttl: 7 * 24 * 60 * 60 * 1000 },      // 7 days
  daily_reports: { ttl: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  documents: { ttl: Infinity },                      // Never expire
  // ... more tables
}

// Usage
await StorageManager.cacheData(key, table, data)
const cached = await StorageManager.getCachedData<T>(key)
await StorageManager.invalidateTable('projects')
const quota = await StorageManager.getQuota()
```

### 3. Offline API Client

**File:** `src/lib/api/offline-client.ts`

Wraps Supabase calls with offline support:

```typescript
// Fetch with offline support
const projects = await OfflineClient.fetch<Project>('projects')

// Create with queuing
const newProject = await OfflineClient.create('projects', {
  name: 'New Project',
  // ... other fields
}, { priority: 'high' })

// Update with queuing
await OfflineClient.update('projects', projectId, {
  name: 'Updated Name'
})

// Delete with queuing
await OfflineClient.delete('projects', projectId)

// Process sync queue manually
const result = await OfflineClient.processSyncQueue()
// result: { success: 5, failed: 0, remaining: 0 }
```

### 4. Sync Manager

**File:** `src/lib/offline/sync-manager.ts`

Handles background synchronization:

```typescript
// Automatically initialized in App.tsx
// Triggers sync on:
// - Network restoration
// - Every 30 seconds (if pending syncs exist)
// - Manual trigger via OfflineIndicator

// Force sync manually
await SyncManager.forceSyncNow()

// Get sync status
const status = SyncManager.getStatus()
// status: { syncInProgress: boolean, lastSyncAttempt: number }
```

### 5. Zustand Offline Store

**File:** `src/stores/offline-store.ts`

Global offline state management:

```typescript
// In components
const isOnline = useIsOnline()
const pendingSyncs = usePendingSyncs()
const isSyncing = useIsSyncing()
const lastSyncTime = useLastSyncTime()
const conflictCount = useConflictCount()
const storageQuota = useStorageQuota()

// Update manually
useOfflineStore.getState().updatePendingSyncs()
useOfflineStore.getState().updateStorageQuota()
```

---

## Using the OfflineClient

### Basic Pattern

Replace direct Supabase calls with OfflineClient calls:

**Before (Direct Supabase):**
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', companyId)

if (error) throw error
return data
```

**After (With Offline Support):**
```typescript
import { OfflineClient } from '@/lib/api/offline-client'

const projects = await OfflineClient.fetch<Project>(
  'projects',
  { company_id: companyId }
)
return projects
```

### CRUD Operations

#### Create
```typescript
const newProject = await OfflineClient.create<Project>(
  'projects',
  {
    name: 'My Project',
    company_id: companyId,
    status: 'active'
  },
  { priority: 'high' } // Optional: prioritize this mutation
)

// When offline: Returns optimistic result with temp ID
// When online: Creates immediately and returns server result
```

#### Read (Fetch)
```typescript
// Fetch all with filters
const projects = await OfflineClient.fetch<Project>(
  'projects',
  { company_id: companyId },
  { forceRefresh: false } // Use cache if available
)

// Fetch single record
const project = await OfflineClient.fetchOne<Project>(
  'projects',
  projectId,
  { forceRefresh: true } // Skip cache
)
```

#### Update
```typescript
const updated = await OfflineClient.update<Project>(
  'projects',
  projectId,
  { name: 'Updated Name', status: 'completed' },
  { priority: 'normal' }
)

// When offline: Queues mutation, returns optimistic result
// When online: Updates immediately and returns server result
```

#### Delete
```typescript
await OfflineClient.delete(
  'projects',
  projectId,
  { priority: 'high' }
)

// When offline: Queues mutation, removes from cache optimistically
// When online: Deletes immediately
```

### React Query Integration

Integrate OfflineClient with React Query hooks:

```typescript
// src/features/projects/hooks/useProjects.ts
import { useQuery } from '@tanstack/react-query'
import { OfflineClient } from '@/lib/api/offline-client'

export function useProjects(companyId: string) {
  return useQuery({
    queryKey: ['projects', companyId],
    queryFn: () => OfflineClient.fetch<Project>(
      'projects',
      { company_id: companyId }
    ),
    // Cache forever - OfflineClient handles caching
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProjectInput) =>
      OfflineClient.create<Project>('projects', data, { priority: 'high' }),
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
```

---

## State Management

### Monitoring Offline State

Use the provided hooks to monitor offline state in your components:

```typescript
import {
  useIsOnline,
  usePendingSyncs,
  useIsSyncing,
  useLastSyncTime,
  useStorageQuota,
} from '@/stores/offline-store'

function MyComponent() {
  const isOnline = useIsOnline()
  const pendingSyncs = usePendingSyncs()
  const isSyncing = useIsSyncing()
  const lastSyncTime = useLastSyncTime()
  const storageQuota = useStorageQuota()

  return (
    <div>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      <p>Pending: {pendingSyncs} changes</p>
      <p>Syncing: {isSyncing ? 'Yes' : 'No'}</p>
      {storageQuota && (
        <p>Storage: {storageQuota.used} / {storageQuota.total} bytes</p>
      )}
    </div>
  )
}
```

### Offline Indicator

The `OfflineIndicator` component displays sync status in the app sidebar:

**File:** `src/components/OfflineIndicator.tsx`

Features:
- Visual status indicator (Online/Offline/Syncing/Conflicts)
- Pending syncs count badge
- Manual sync button
- Storage quota visualization
- Last sync time display

---

## Background Sync

### How It Works

1. **Network Detection**: Listens for `window.online` event
2. **Periodic Check**: Every 30 seconds when online with pending syncs
3. **Automatic Sync**: Processes queue when network is restored
4. **Retry Logic**: Failed syncs are retried with exponential backoff

### Sync Priority

Mutations are processed in priority order:

1. **High Priority**: Critical updates (user-initiated actions)
2. **Normal Priority**: Standard CRUD operations (default)
3. **Low Priority**: Background updates, analytics

Within each priority, oldest mutations are processed first.

### Manual Sync

Users can trigger sync manually via the OfflineIndicator dialog:

```typescript
// Programmatic trigger
import { SyncManager } from '@/lib/offline/sync-manager'

await SyncManager.forceSyncNow()
```

### Sync Events

Monitor sync progress:

```typescript
import { useOfflineStore } from '@/stores/offline-store'

const isSyncing = useIsSyncing()
const pendingSyncs = usePendingSyncs()
const lastSyncTime = useLastSyncTime()

useEffect(() => {
  if (!isSyncing && pendingSyncs === 0) {
    console.log('All synced!')
  }
}, [isSyncing, pendingSyncs])
```

---

## Testing Offline Functionality

### Browser DevTools

1. **Open DevTools** (F12)
2. **Network Tab** → Set throttling to "Offline"
3. **Application Tab** → IndexedDB → `supersitehero-offline`
   - Inspect `cachedData`, `syncQueue`, `downloads`, `conflicts` stores

### Testing Workflow

```bash
# 1. Start dev server
npm run dev

# 2. Open browser DevTools → Network tab
# 3. Set to "Offline" mode
# 4. Try creating/updating data
# 5. Check IndexedDB → syncQueue for queued mutations
# 6. Set back to "Online"
# 7. Watch OfflineIndicator for automatic sync
# 8. Verify data in database
```

### Manual Testing Checklist

- [ ] Create record offline → queued → syncs on reconnect
- [ ] Update record offline → queued → syncs with latest data
- [ ] Delete record offline → queued → deleted on sync
- [ ] Fetch data offline → returns cached data
- [ ] Storage quota warning appears at 90% usage
- [ ] Conflict resolution works for simultaneous edits
- [ ] Manual sync button works
- [ ] Persistent storage requested on first load

---

## Best Practices

### 1. Always Use OfflineClient for Data Mutations

❌ **Don't:**
```typescript
await supabase.from('projects').insert(data)
```

✅ **Do:**
```typescript
await OfflineClient.create('projects', data)
```

### 2. Handle Optimistic Updates

When offline, OfflineClient returns optimistic results:

```typescript
const project = await OfflineClient.create('projects', {
  name: 'New Project'
})

// project.id may be a temporary UUID
// It will be replaced with the real ID after sync
console.log(project.id) // "temp-uuid-123"
```

### 3. Invalidate Caches After Mutations

```typescript
const { mutate } = useCreateProject()

mutate(data, {
  onSuccess: () => {
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['projects'] })

    // Or invalidate table cache
    await StorageManager.invalidateTable('projects')
  }
})
```

### 4. Set Appropriate Priorities

```typescript
// High priority: User-initiated actions
await OfflineClient.create('daily_reports', data, { priority: 'high' })

// Normal priority: Standard operations (default)
await OfflineClient.update('tasks', id, data)

// Low priority: Background updates
await OfflineClient.create('analytics_events', data, { priority: 'low' })
```

### 5. Monitor Storage Quota

```typescript
const quota = await StorageManager.getQuota()

if (quota.warning) {
  // Show warning to user
  toast.warning('Storage running low. Consider clearing old data.')
}

if (quota.critical) {
  // Take action
  await StorageManager.freeSpace(10 * 1024 * 1024) // Free 10MB
}
```

### 6. Handle Conflicts Gracefully

```typescript
const conflictCount = useConflictCount()

if (conflictCount > 0) {
  // Show conflict resolution UI
  // User can choose: Keep Local, Keep Remote, or Manual Merge
}
```

---

## Troubleshooting

### Sync Queue Not Processing

**Symptoms:** Pending syncs remain after going online

**Solutions:**
1. Check browser console for errors
2. Verify network connectivity
3. Check DevTools → Application → IndexedDB → syncQueue
4. Try manual sync via OfflineIndicator

### Data Not Caching

**Symptoms:** Offline mode throws "No cached data" error

**Solutions:**
1. Ensure you've fetched data while online first
2. Check cache TTL hasn't expired
3. Verify IndexedDB → cachedData has entries
4. Check for browser storage restrictions

### Storage Quota Exceeded

**Symptoms:** "QuotaExceededError" in console

**Solutions:**
```typescript
// Check quota
const quota = await StorageManager.getQuota()
console.log(`Used: ${quota.used}, Available: ${quota.available}`)

// Free space
await StorageManager.freeSpace(50 * 1024 * 1024) // Free 50MB

// Clean up manually
await StorageManager.cleanupExpired()
await StorageManager.invalidateTable('old_table')
```

### Conflicts Not Detected

**Symptoms:** Concurrent edits overwrite each other

**Solutions:**
1. Check that versioning is enabled
2. Verify conflict detection logic
3. Implement optimistic locking if needed

---

## API Reference

### OfflineClient

```typescript
class OfflineClient {
  // Fetch with offline support
  static async fetch<T>(
    table: string,
    filters?: Record<string, any>,
    options?: { forceRefresh?: boolean }
  ): Promise<T[]>

  // Fetch single record
  static async fetchOne<T>(
    table: string,
    id: string,
    options?: { forceRefresh?: boolean }
  ): Promise<T | null>

  // Create record
  static async create<T>(
    table: string,
    data: Partial<T>,
    options?: { priority?: 'high' | 'normal' | 'low' }
  ): Promise<T>

  // Update record
  static async update<T>(
    table: string,
    id: string,
    data: Partial<T>,
    options?: { priority?: 'high' | 'normal' | 'low' }
  ): Promise<T>

  // Delete record
  static async delete(
    table: string,
    id: string,
    options?: { priority?: 'high' | 'normal' | 'low' }
  ): Promise<void>

  // Process sync queue
  static async processSyncQueue(): Promise<{
    success: number
    failed: number
    remaining: number
  }>
}
```

### StorageManager

```typescript
class StorageManager {
  static async cacheData(key: string, table: string, data: any): Promise<void>
  static async getCachedData<T>(key: string): Promise<T | null>
  static async invalidateTable(table: string): Promise<void>
  static async invalidateKey(key: string): Promise<void>
  static async cleanupExpired(): Promise<number>
  static async getQuota(): Promise<StorageQuota>
  static async freeSpace(targetBytes: number): Promise<number>
  static async getCacheHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    message: string
    quota: StorageQuota
    stats: CacheStats
  }>
}
```

### SyncManager

```typescript
class SyncManager {
  static initialize(): () => void
  static async triggerSync(): Promise<void>
  static async forceSyncNow(): Promise<void>
  static async requestNotificationPermission(): Promise<boolean>
  static getStatus(): {
    syncInProgress: boolean
    lastSyncAttempt: number
  }
}
```

---

## Support

For issues or questions:

1. Check [GitHub Issues](https://github.com/yourusername/supersitehero/issues)
2. Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Contact the development team

---

**Last Updated:** 2025-11-25
**Version:** 1.0.0
**Maintainer:** SuperSiteHero Development Team
