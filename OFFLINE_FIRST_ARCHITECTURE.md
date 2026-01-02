# Offline-First Architecture Design
**Project:** SuperSiteHero Construction Management Platform
**Created:** 2025-11-25
**Priority:** P0 - CRITICAL (Without this, field adoption will FAIL)
**Effort:** 3-4 weeks
**Success Metric:** 99.9% sync success, <30 sec sync time

---

## Executive Summary

This document outlines the technical architecture for implementing a robust offline-first system for SuperSiteHero. Construction sites often have poor or no connectivity, making offline capability **the #1 critical feature** for field adoption.

### Current State (Updated January 2026)
- ✅ Basic PWA setup with Vite PWA plugin
- ✅ Workbox-based service worker (auto-generated)
- ✅ Basic network-first caching (5 min cache for API calls)
- ✅ Well-structured API service layer
- ✅ **IndexedDB local storage** (offline-store.ts with Zustand)
- ✅ **Offline indicator UI** (OfflineIndicator component)
- ✅ **User-controlled downloads** (Make Offline button on projects)
- ✅ **Data prefetch system** (useDataPrefetch hook)
- 🚧 **Sync queue for offline mutations** (partial - basic implementation)
- 🚧 **Conflict resolution** (architecture defined, UI pending)

### Architecture Goals
1. **All features work offline** - No degraded experience
2. **Automatic sync** - Queue mutations, sync when online
3. **Conflict resolution** - Last-write-wins with manual override option
4. **User control** - Select which projects/documents to cache
5. **Performance** - <30 sec sync time, <2 sec offline response
6. **Reliability** - 99.9% sync success rate

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Data Flow](#data-flow)
4. [Storage Strategy](#storage-strategy)
5. [Sync Queue Management](#sync-queue-management)
6. [Conflict Resolution](#conflict-resolution)
7. [Service Worker Strategy](#service-worker-strategy)
8. [API Layer Integration](#api-layer-integration)
9. [UI Components](#ui-components)
10. [Implementation Plan](#implementation-plan)
11. [Testing Strategy](#testing-strategy)
12. [Performance Targets](#performance-targets)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  UI Layer    │  │ React Query  │  │ Offline      │    │
│  │  Components  │──│  + Cache     │──│  Indicator   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                            │                               │
│                            ▼                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │          Offline-First Data Layer (New)            │  │
│  │  ┌─────────────────┐  ┌────────────────────────┐  │  │
│  │  │  OfflineManager │  │   SyncQueueManager     │  │  │
│  │  │  - Check online │  │   - Queue mutations    │  │  │
│  │  │  - Route calls  │  │   - Process queue      │  │  │
│  │  └─────────────────┘  │   - Retry logic        │  │  │
│  │                        └────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                            │                               │
│                    ┌───────┴───────┐                      │
│                    │               │                       │
│                    ▼               ▼                       │
│         ┌──────────────┐   ┌──────────────┐              │
│         │  IndexedDB   │   │  API Client  │              │
│         │  Local Store │   │  (Existing)  │              │
│         └──────────────┘   └──────────────┘              │
│                                    │                       │
└────────────────────────────────────┼───────────────────────┘
                                     │
                                     ▼
                            ┌────────────────┐
                            │  Service       │
                            │  Worker        │
                            │  (Workbox)     │
                            └────────────────┘
                                     │
                                     ▼
                            ┌────────────────┐
                            │   Supabase     │
                            │   PostgreSQL   │
                            └────────────────┘
```

### Key Components

1. **OfflineManager** - Central coordinator for offline operations
2. **IndexedDBStore** - Local persistent storage
3. **SyncQueue** - Queue for offline mutations
4. **ConflictResolver** - Handle data conflicts
5. **OfflineIndicator** - UI component showing online/offline status
6. **CacheController** - User-controlled download management

---

## Technology Stack

### Core Libraries

```json
{
  "dependencies": {
    // Existing
    "@tanstack/react-query": "^5.17.19",  // Data fetching & caching
    "@supabase/supabase-js": "^2.39.3",   // API client
    "vite-plugin-pwa": "^0.17.5",         // PWA generation

    // NEW - Add these
    "idb": "^8.0.0",                      // IndexedDB wrapper
    "workbox-window": "^7.0.0",           // Service Worker communication
    "zustand": "^4.5.0"                   // Lightweight state (already installed)
  }
}
```

### Why These Choices?

**idb (Jake Archibald's IndexedDB wrapper)**
- Promise-based API (much better than native IndexedDB)
- Small size (~2KB)
- TypeScript support
- Industry standard

**Workbox**
- Already integrated via vite-plugin-pwa
- Battle-tested by Google
- Excellent caching strategies
- Good developer experience

**Zustand for Offline State**
- Already installed
- Lightweight (3KB)
- Perfect for offline/online state management
- No context provider boilerplate

---

## Data Flow

### Online Mode (Current Behavior)

```
User Action → React Query → API Client → Supabase → Success/Error → UI Update
```

### Offline Mode (New Behavior)

#### Read Operations (Queries)
```
User Action → React Query → OfflineManager
            → Check Online?
            → [Offline] → IndexedDB → Return Cached Data
            → [Online]  → API Client → Supabase → Cache in IndexedDB → Return Data
```

#### Write Operations (Mutations)
```
User Action → React Query → OfflineManager
            → Check Online?
            → [Offline] → Add to SyncQueue → Store in IndexedDB → Optimistic UI Update
            → [Online]  → API Client → Supabase → Success → Update IndexedDB

When Online Again → SyncQueue → Process Queue → Retry Failed → Update UI
```

---

## Storage Strategy

### IndexedDB Schema

```typescript
// Database: supersitehero-offline-v1

// Store 1: Cached Data
interface CachedData {
  key: string;              // Format: "{table}:{id}" or "{table}:list:{filter_hash}"
  table: string;            // projects, daily_reports, rfis, etc.
  data: any;                // The actual record(s)
  timestamp: number;        // When cached
  expiresAt: number;        // TTL timestamp
  version: number;          // For conflict resolution
  syncedAt: number | null;  // Last successful sync
}

// Store 2: Sync Queue
interface QueuedMutation {
  id: string;               // UUID
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  recordId?: string;        // For updates/deletes
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;
  priority: 'high' | 'normal' | 'low';
}

// Store 3: User Downloads
interface UserDownload {
  id: string;
  type: 'project' | 'document' | 'photos';
  resourceId: string;
  status: 'downloading' | 'complete' | 'error';
  progress: number;         // 0-100
  size: number;             // bytes
  downloadedAt: number;
}

// Store 4: Conflict Log
interface Conflict {
  id: string;
  table: string;
  recordId: string;
  localVersion: any;
  remoteVersion: any;
  timestamp: number;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'manual';
}
```

### Cache Expiration Strategy

| Data Type | TTL | Strategy |
|-----------|-----|----------|
| **Projects** | 7 days | User-controlled download, never auto-expire while project active |
| **Daily Reports** | 30 days | Expire oldest first when storage limit reached |
| **Documents** | Permanent | User-controlled, manual deletion only |
| **RFIs/Submittals** | 30 days | Active items: permanent, Closed items: 30 days |
| **Tasks** | 14 days | Active: permanent, Completed: 14 days |
| **Punch Lists** | 30 days | Open: permanent, Closed: 30 days |
| **Photos** | User-controlled | Never auto-delete, compress for storage |
| **User Session** | 7 days | Auth tokens and user data |

### Storage Limits & Management

```typescript
// Storage Quota Management
interface StorageQuota {
  total: number;        // Available storage (from navigator.storage)
  used: number;         // Used by app
  available: number;    // Remaining
  warning: boolean;     // True if <10% remaining
  critical: boolean;    // True if <5% remaining
}

// Cleanup Strategies (when storage low)
1. Remove completed tasks older than 14 days
2. Remove closed punch lists older than 30 days
3. Remove answered RFIs older than 30 days
4. Compress cached photos (reduce quality)
5. Remove daily reports older than 60 days
6. Notify user to manually select what to keep
```

---

## Sync Queue Management

### Queue Processing

```typescript
class SyncQueueManager {
  private db: IDBPDatabase;
  private processing: boolean = false;
  private retryDelay: number = 1000; // Start with 1 second
  private maxRetryDelay: number = 60000; // Max 1 minute
  private maxRetries: number = 5;

  /**
   * Add mutation to queue
   */
  async addToQueue(mutation: QueuedMutation): Promise<void> {
    await this.db.add('syncQueue', {
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    });

    // Trigger immediate sync if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Process all pending mutations
   */
  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const pending = await this.db.getAllFromIndex(
        'syncQueue',
        'status',
        'pending'
      );

      // Sort by priority (high first), then timestamp (oldest first)
      const sorted = pending.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return a.timestamp - b.timestamp;
      });

      for (const mutation of sorted) {
        await this.processMutation(mutation);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process single mutation
   */
  private async processMutation(mutation: QueuedMutation): Promise<void> {
    try {
      // Update status to processing
      await this.db.put('syncQueue', {
        ...mutation,
        status: 'processing',
      });

      // Execute mutation via API client
      let result;
      switch (mutation.type) {
        case 'create':
          result = await apiClient.insert(mutation.table, mutation.data);
          break;
        case 'update':
          result = await apiClient.update(mutation.table, mutation.recordId!, mutation.data);
          break;
        case 'delete':
          result = await apiClient.delete(mutation.table, mutation.recordId!);
          break;
      }

      // Success - remove from queue
      await this.db.delete('syncQueue', mutation.id);

      // Update cached data with server response
      await this.updateCachedData(mutation.table, result);

      // Emit success event
      this.emit('sync:success', { mutation, result });

    } catch (error) {
      // Handle failure
      await this.handleFailure(mutation, error);
    }
  }

  /**
   * Handle failed mutation
   */
  private async handleFailure(mutation: QueuedMutation, error: any): Promise<void> {
    const retryCount = mutation.retryCount + 1;

    if (retryCount >= this.maxRetries) {
      // Max retries exceeded - mark as failed
      await this.db.put('syncQueue', {
        ...mutation,
        status: 'failed',
        retryCount,
        error: error.message,
      });

      // Emit failure event
      this.emit('sync:failed', { mutation, error });

      // Notify user
      this.notifyUser('Sync failed', `Failed to sync ${mutation.type} after ${this.maxRetries} attempts`);

    } else {
      // Retry with exponential backoff
      const delay = Math.min(
        this.retryDelay * Math.pow(2, retryCount),
        this.maxRetryDelay
      );

      await this.db.put('syncQueue', {
        ...mutation,
        status: 'pending',
        retryCount,
        error: error.message,
      });

      // Schedule retry
      setTimeout(() => this.processQueue(), delay);

      // Emit retry event
      this.emit('sync:retry', { mutation, retryCount, delay });
    }
  }

  /**
   * Event emitter for sync events
   */
  private emit(event: string, data: any): void {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  /**
   * Notify user of sync status
   */
  private notifyUser(title: string, message: string): void {
    // Use react-hot-toast for notifications
    // Implemented in UI layer
  }
}
```

### Queue Priority System

| Operation | Priority | Reason |
|-----------|----------|--------|
| Safety Incidents | High | Critical safety data |
| Daily Reports | High | Time-sensitive field documentation |
| RFI Responses | High | Blocks work |
| Task Updates | Normal | General workflow |
| Photo Uploads | Normal | Can wait |
| Document Views | Low | Read-only, low impact |

---

## Conflict Resolution

### Conflict Detection

```typescript
interface ConflictResolutionStrategy {
  /**
   * Detect conflict between local and remote versions
   */
  detectConflict(local: any, remote: any): boolean {
    // Check version numbers
    if (local.version && remote.version) {
      return local.version !== remote.version;
    }

    // Check updated_at timestamps
    if (local.updated_at && remote.updated_at) {
      return new Date(local.updated_at) < new Date(remote.updated_at);
    }

    // No version info - assume no conflict
    return false;
  }

  /**
   * Resolve conflict using strategy
   */
  async resolveConflict(
    conflict: Conflict,
    strategy: 'last-write-wins' | 'manual'
  ): Promise<any> {
    switch (strategy) {
      case 'last-write-wins':
        return this.lastWriteWins(conflict);
      case 'manual':
        return this.promptUser(conflict);
      default:
        return this.lastWriteWins(conflict);
    }
  }

  /**
   * Last-write-wins strategy (default)
   */
  private lastWriteWins(conflict: Conflict): any {
    const localTime = conflict.localVersion.updated_at;
    const remoteTime = conflict.remoteVersion.updated_at;

    // Use most recent version
    return new Date(localTime) > new Date(remoteTime)
      ? conflict.localVersion
      : conflict.remoteVersion;
  }

  /**
   * Manual resolution - prompt user
   */
  private async promptUser(conflict: Conflict): Promise<any> {
    // Store conflict for manual resolution
    await db.add('conflicts', conflict);

    // Emit event to show UI
    window.dispatchEvent(new CustomEvent('conflict:detected', {
      detail: conflict
    }));

    // Wait for user decision
    return new Promise((resolve) => {
      window.addEventListener('conflict:resolved', (e: any) => {
        const { conflictId, resolution } = e.detail;
        if (conflictId === conflict.id) {
          resolve(resolution === 'local'
            ? conflict.localVersion
            : conflict.remoteVersion
          );
        }
      });
    });
  }
}
```

### Conflict Resolution UI

```typescript
// Component to show when conflicts detected
<ConflictResolutionDialog>
  <h2>Data Conflict Detected</h2>
  <p>This record was modified both online and offline:</p>

  <div className="conflict-comparison">
    <div className="local-version">
      <h3>Your Version (Offline)</h3>
      <pre>{JSON.stringify(localVersion, null, 2)}</pre>
      <button onClick={() => resolve('local')}>Use Mine</button>
    </div>

    <div className="remote-version">
      <h3>Server Version (Online)</h3>
      <pre>{JSON.stringify(remoteVersion, null, 2)}</pre>
      <button onClick={() => resolve('remote')}>Use Server</button>
    </div>
  </div>

  <button onClick={() => resolve('merge')}>
    Merge Changes (Advanced)
  </button>
</ConflictResolutionDialog>
```

---

## Service Worker Strategy

### Enhanced Service Worker Configuration

```typescript
// vite.config.ts - Enhanced PWA config

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'prompt', // Changed from 'autoUpdate' to give user control
      strategies: 'injectManifest', // Use custom service worker
      srcDir: 'src',
      filename: 'sw.ts', // Custom service worker
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'SuperSiteHero',
        short_name: 'SSH',
        description: 'Offline-first construction management',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone', // Full-screen app
        orientation: 'any',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          // API calls - Network-first with offline fallback
          {
            urlPattern: /^https:\/\/nxlznnrocrffnbzjaaae\.supabase\.co\/rest\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 10,
              plugins: [
                // Custom plugin for offline handling
                {
                  handlerDidError: async () => {
                    // Return cached data if network fails
                    return Response.json({ offline: true });
                  }
                }
              ]
            },
          },
          // Images - Cache-first
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          // Documents/PDFs - Cache-first
          {
            urlPattern: /\.pdf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'documents',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 90 * 24 * 60 * 60, // 90 days
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: false, // Wait for user approval to update
        clientsClaim: true,
      }
    })
  ]
})
```

### Custom Service Worker (src/sw.ts)

```typescript
/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Background sync for mutations when offline
const bgSyncPlugin = new BackgroundSyncPlugin('mutations-queue', {
  maxRetentionTime: 24 * 60, // Retry for 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
      } catch (error) {
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  }
});

// API calls with background sync
registerRoute(
  ({ url }) => url.origin === 'https://nxlznnrocrffnbzjaaae.supabase.co',
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 5 * 60,
      }),
      bgSyncPlugin,
    ],
  }),
  'POST'
);

// Listen for messages from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_PROJECT') {
    cacheProject(event.data.projectId);
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearCache();
  }
});

/**
 * Cache entire project for offline use
 */
async function cacheProject(projectId: string) {
  const cache = await caches.open('project-data');

  // Cache project data endpoints
  const endpoints = [
    `/rest/v1/projects?id=eq.${projectId}`,
    `/rest/v1/daily_reports?project_id=eq.${projectId}`,
    `/rest/v1/tasks?project_id=eq.${projectId}`,
    `/rest/v1/rfis?project_id=eq.${projectId}`,
    `/rest/v1/documents?project_id=eq.${projectId}`,
  ];

  for (const endpoint of endpoints) {
    const url = `https://nxlznnrocrffnbzjaaae.supabase.co${endpoint}`;
    try {
      const response = await fetch(url);
      await cache.put(url, response);
    } catch (error) {
      console.error(`Failed to cache ${endpoint}:`, error);
    }
  }

  // Notify app that project is cached
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PROJECT_CACHED',
        projectId,
      });
    });
  });
}

/**
 * Clear all caches
 */
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}
```

---

## API Layer Integration

### Offline-Aware API Client

```typescript
// src/lib/api/offline-client.ts

import { openDB, IDBPDatabase } from 'idb';
import { apiClient } from './client';
import type { ApiError } from './types';

class OfflineAPIClient {
  private db: IDBPDatabase | null = null;
  private syncQueue: SyncQueueManager;

  async init() {
    this.db = await openDB('supersitehero-offline-v1', 1, {
      upgrade(db) {
        // Cached Data store
        if (!db.objectStoreNames.contains('cachedData')) {
          const store = db.createObjectStore('cachedData', { keyPath: 'key' });
          store.createIndex('table', 'table');
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('expiresAt', 'expiresAt');
        }

        // Sync Queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('status', 'status');
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('priority', 'priority');
        }

        // User Downloads store
        if (!db.objectStoreNames.contains('downloads')) {
          const store = db.createObjectStore('downloads', { keyPath: 'id' });
          store.createIndex('status', 'status');
          store.createIndex('resourceId', 'resourceId');
        }

        // Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const store = db.createObjectStore('conflicts', { keyPath: 'id' });
          store.createIndex('table', 'table');
          store.createIndex('resolved', 'resolved');
        }
      },
    });

    this.syncQueue = new SyncQueueManager(this.db);
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Fetch with offline support
   */
  async select<T>(table: string, options?: any): Promise<T[]> {
    const cacheKey = this.getCacheKey(table, options);

    if (this.isOnline()) {
      try {
        // Fetch from API
        const data = await apiClient.select<T>(table, options);

        // Cache result
        await this.cacheData(cacheKey, table, data);

        return data;
      } catch (error) {
        // Network error - fallback to cache
        console.warn('Network error, using cached data:', error);
        return await this.getFromCache<T[]>(cacheKey) || [];
      }
    } else {
      // Offline - use cache
      const cached = await this.getFromCache<T[]>(cacheKey);
      if (cached) {
        return cached;
      } else {
        throw new Error(`No cached data available for ${table}`);
      }
    }
  }

  /**
   * Create with offline support
   */
  async insert<T>(table: string, data: any): Promise<T> {
    if (this.isOnline()) {
      try {
        // Create via API
        const result = await apiClient.insert<T>(table, data);

        // Update cache
        await this.invalidateCache(table);

        return result;
      } catch (error) {
        // Network error - queue for later
        await this.syncQueue.addToQueue({
          type: 'create',
          table,
          data,
          priority: this.getPriority(table),
        } as any);

        // Return optimistic response
        return { ...data, id: crypto.randomUUID() } as T;
      }
    } else {
      // Offline - queue mutation
      await this.syncQueue.addToQueue({
        type: 'create',
        table,
        data,
        priority: this.getPriority(table),
      } as any);

      // Return optimistic response
      return { ...data, id: crypto.randomUUID() } as T;
    }
  }

  /**
   * Update with offline support
   */
  async update<T>(table: string, id: string, updates: any): Promise<T> {
    if (this.isOnline()) {
      try {
        // Update via API
        const result = await apiClient.update<T>(table, id, updates);

        // Update cache
        await this.invalidateCache(table);

        return result;
      } catch (error) {
        // Network error - queue for later
        await this.syncQueue.addToQueue({
          type: 'update',
          table,
          recordId: id,
          data: updates,
          priority: this.getPriority(table),
        } as any);

        // Return optimistic response
        return { ...updates, id } as T;
      }
    } else {
      // Offline - queue mutation
      await this.syncQueue.addToQueue({
        type: 'update',
        table,
        recordId: id,
        data: updates,
        priority: this.getPriority(table),
      } as any);

      // Return optimistic response
      return { ...updates, id } as T;
    }
  }

  /**
   * Delete with offline support
   */
  async delete(table: string, id: string): Promise<void> {
    if (this.isOnline()) {
      try {
        // Delete via API
        await apiClient.delete(table, id);

        // Update cache
        await this.invalidateCache(table);
      } catch (error) {
        // Network error - queue for later
        await this.syncQueue.addToQueue({
          type: 'delete',
          table,
          recordId: id,
          priority: this.getPriority(table),
        } as any);
      }
    } else {
      // Offline - queue mutation
      await this.syncQueue.addToQueue({
        type: 'delete',
        table,
        recordId: id,
        priority: this.getPriority(table),
      } as any);
    }
  }

  /**
   * Get cache key for query
   */
  private getCacheKey(table: string, options?: any): string {
    if (!options || Object.keys(options).length === 0) {
      return `${table}:list`;
    }

    // Create stable hash from options
    const hash = JSON.stringify(options);
    return `${table}:list:${this.hashCode(hash)}`;
  }

  /**
   * Simple string hash function
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Cache data
   */
  private async cacheData(key: string, table: string, data: any): Promise<void> {
    if (!this.db) return;

    await this.db.put('cachedData', {
      key,
      table,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.getTTL(table),
      version: 1,
      syncedAt: Date.now(),
    });
  }

  /**
   * Get from cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.db) return null;

    const cached = await this.db.get('cachedData', key);

    if (!cached) return null;

    // Check if expired
    if (cached.expiresAt < Date.now()) {
      await this.db.delete('cachedData', key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Invalidate cache for table
   */
  private async invalidateCache(table: string): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction('cachedData', 'readwrite');
    const index = tx.store.index('table');

    for await (const cursor of index.iterate(table)) {
      cursor.delete();
    }

    await tx.done;
  }

  /**
   * Get TTL for table
   */
  private getTTL(table: string): number {
    const ttls: Record<string, number> = {
      projects: 7 * 24 * 60 * 60 * 1000, // 7 days
      daily_reports: 30 * 24 * 60 * 60 * 1000, // 30 days
      documents: Infinity, // Never expire
      rfis: 30 * 24 * 60 * 60 * 1000,
      tasks: 14 * 24 * 60 * 60 * 1000,
      punch_lists: 30 * 24 * 60 * 60 * 1000,
    };

    return ttls[table] || 24 * 60 * 60 * 1000; // Default 24 hours
  }

  /**
   * Get priority for table
   */
  private getPriority(table: string): 'high' | 'normal' | 'low' {
    const highPriority = ['safety_incidents', 'daily_reports'];
    const lowPriority = ['documents'];

    if (highPriority.includes(table)) return 'high';
    if (lowPriority.includes(table)) return 'low';
    return 'normal';
  }
}

export const offlineAPIClient = new OfflineAPIClient();

// Initialize on app load
offlineAPIClient.init();
```

---

## UI Components

### 1. Offline Indicator

```typescript
// src/components/OfflineIndicator.tsx

import { useEffect, useState } from 'react';
import { useOfflineStore } from '@/stores/offline-store';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, pendingSyncs, isSyncing } = useOfflineStore();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50">
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                You're offline
              </p>
              <p className="text-xs text-yellow-600">
                Changes will sync when you're back online
              </p>
              {pendingSyncs > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  {pendingSyncs} pending sync{pendingSyncs !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isOnline && isSyncing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-blue-800">
              Syncing {pendingSyncs} item{pendingSyncs !== 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. Download Manager

```typescript
// src/components/DownloadManager.tsx

import { useState } from 'react';
import { Download, Check, X } from 'lucide-react';
import { offlineAPIClient } from '@/lib/api/offline-client';

interface DownloadManagerProps {
  projectId: string;
}

export function DownloadManager({ projectId }: DownloadManagerProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setDownloading(true);

    try {
      // Download project data
      await offlineAPIClient.downloadProject(projectId, (progress) => {
        setProgress(progress);
      });

      toast.success('Project downloaded for offline use');
    } catch (error) {
      toast.error('Failed to download project');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-medium mb-2">Offline Access</h3>
      <p className="text-sm text-gray-600 mb-4">
        Download this project to work offline in the field
      </p>

      {!downloading && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          Download for Offline Use
        </button>
      )}

      {downloading && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Downloading... {progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Conflict Resolution Dialog

```typescript
// src/components/ConflictResolutionDialog.tsx

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';

interface ConflictResolutionDialogProps {
  conflict: Conflict;
  onResolve: (resolution: 'local' | 'remote') => void;
  onClose: () => void;
}

export function ConflictResolutionDialog({
  conflict,
  onResolve,
  onClose
}: ConflictResolutionDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState<'local' | 'remote' | null>(null);

  return (
    <Dialog open onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
          <h2 className="text-xl font-bold">Data Conflict Detected</h2>
        </div>

        <p className="text-gray-600 mb-6">
          This record was modified both online and offline.
          Please choose which version to keep:
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition ${
              selectedVersion === 'local'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedVersion('local')}
          >
            <h3 className="font-medium mb-2">Your Version (Offline)</h3>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(conflict.localVersion, null, 2)}
            </pre>
          </div>

          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition ${
              selectedVersion === 'remote'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedVersion('remote')}
          >
            <h3 className="font-medium mb-2">Server Version (Online)</h3>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(conflict.remoteVersion, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedVersion && onResolve(selectedVersion)}
            disabled={!selectedVersion}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use Selected Version
          </button>
        </div>
      </div>
    </Dialog>
  );
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Set up IndexedDB with idb library
- [ ] Create OfflineAPIClient wrapper
- [ ] Implement basic caching for read operations
- [ ] Add online/offline detection
- [ ] Create OfflineIndicator component
- [ ] **Deliverable:** Basic offline read support

### Phase 2: Sync Queue (Week 2)
- [ ] Implement SyncQueueManager
- [ ] Add mutation queuing for offline operations
- [ ] Implement retry logic with exponential backoff
- [ ] Add priority system
- [ ] Create sync progress indicators
- [ ] **Deliverable:** Offline mutations with auto-sync

### Phase 3: Advanced Features (Week 3)
- [ ] Implement conflict detection
- [ ] Add ConflictResolutionDialog
- [ ] Build DownloadManager for user-controlled caching
- [ ] Add storage quota management
- [ ] Implement cache cleanup strategies
- [ ] **Deliverable:** Complete offline-first system

### Phase 4: Testing & Polish (Week 4)
- [ ] Write unit tests for offline logic
- [ ] Integration tests with mock network conditions
- [ ] Load testing with large datasets
- [ ] Performance optimization
- [ ] Documentation and training materials
- [ ] **Deliverable:** Production-ready offline system

---

## Testing Strategy

### Unit Tests

```typescript
// tests/offline-api-client.test.ts

describe('OfflineAPIClient', () => {
  let client: OfflineAPIClient;

  beforeEach(async () => {
    client = new OfflineAPIClient();
    await client.init();
  });

  describe('select', () => {
    it('should fetch from API when online', async () => {
      // Mock online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const data = await client.select('projects', {});
      expect(data).toBeDefined();
    });

    it('should return cached data when offline', async () => {
      // Setup cache
      await client.cacheData('projects:list', 'projects', mockProjects);

      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const data = await client.select('projects', {});
      expect(data).toEqual(mockProjects);
    });
  });

  describe('insert', () => {
    it('should queue mutation when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      await client.insert('projects', mockProject);

      const queue = await client.syncQueue.getPendingMutations();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('create');
    });
  });
});
```

### Integration Tests

```typescript
// tests/offline-flow.test.ts

describe('Offline Flow', () => {
  it('should handle complete offline→online flow', async () => {
    // 1. Go offline
    setOnlineStatus(false);

    // 2. Create record offline
    const project = await createProject({ name: 'Test Project' });
    expect(project.id).toBeDefined(); // Optimistic ID

    // 3. Verify queued
    const queue = await getSyncQueue();
    expect(queue).toHaveLength(1);

    // 4. Go online
    setOnlineStatus(true);

    // 5. Wait for sync
    await waitForSync();

    // 6. Verify synced
    const syncedQueue = await getSyncQueue();
    expect(syncedQueue).toHaveLength(0);

    // 7. Verify record exists on server
    const serverProject = await fetchProjectFromServer(project.id);
    expect(serverProject.name).toBe('Test Project');
  });

  it('should handle conflict resolution', async () => {
    // 1. Create record online
    const project = await createProject({ name: 'Original', status: 'active' });

    // 2. Go offline
    setOnlineStatus(false);

    // 3. Update offline
    await updateProject(project.id, { name: 'Updated Offline' });

    // 4. Simulate server update
    await updateProjectOnServer(project.id, { name: 'Updated Online' });

    // 5. Go online
    setOnlineStatus(true);

    // 6. Wait for conflict detection
    await waitForConflict();

    // 7. Resolve conflict
    await resolveConflict('remote');

    // 8. Verify resolution
    const resolved = await fetchProject(project.id);
    expect(resolved.name).toBe('Updated Online');
  });
});
```

### Performance Tests

```typescript
// tests/performance.test.ts

describe('Offline Performance', () => {
  it('should sync 100 mutations in <30 seconds', async () => {
    const start = Date.now();

    // Queue 100 mutations
    for (let i = 0; i < 100; i++) {
      await client.insert('tasks', { title: `Task ${i}` });
    }

    // Process sync
    await client.syncQueue.processQueue();

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(30000); // 30 seconds
  });

  it('should handle 10,000 cached records', async () => {
    // Cache 10k records
    const projects = generateMockProjects(10000);
    await client.cacheData('projects:list', 'projects', projects);

    // Measure retrieval time
    const start = Date.now();
    const retrieved = await client.select('projects', {});
    const duration = Date.now() - start;

    expect(retrieved).toHaveLength(10000);
    expect(duration).toBeLessThan(2000); // 2 seconds
  });
});
```

---

## Performance Targets

### Success Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Sync Time** | <30 seconds for 100 mutations | <60 seconds |
| **Sync Success Rate** | 99.9% | 99% |
| **Offline Response Time** | <500ms | <2 seconds |
| **Cache Hit Rate** | >80% | >50% |
| **Storage Usage** | <500MB per project | <1GB |
| **Sync Queue Processing** | 5 mutations/second | 2 mutations/second |
| **Conflict Rate** | <1% of syncs | <5% |
| **First Load (Cached)** | <1 second | <3 seconds |
| **Background Sync Impact** | <5% battery drain/hour | <10% |

### Monitoring

```typescript
// Performance monitoring
interface OfflineMetrics {
  syncTime: number;
  syncSuccess: number;
  syncFailed: number;
  cacheHitRate: number;
  averageResponseTime: number;
  storageUsed: number;
  conflictCount: number;
}

// Log to analytics service
analytics.track('offline:sync:complete', {
  duration: syncTime,
  mutations: mutationCount,
  success: true,
});
```

---

## Security Considerations

### Data Security

1. **Encryption at Rest**
   - IndexedDB data is NOT encrypted by default
   - Consider encrypting sensitive fields (SSN, bank info) before storing
   - Use Web Crypto API for client-side encryption

2. **Authentication**
   - Store auth tokens securely in IndexedDB
   - Implement token refresh mechanism
   - Clear tokens on logout

3. **Data Isolation**
   - User can only access their assigned projects
   - Respect RLS policies even offline
   - Clear cache on user switch

### Privacy

1. **User Consent**
   - Ask permission before downloading large datasets
   - Show storage usage
   - Provide clear cache functionality

2. **Data Retention**
   - Follow company data retention policies
   - Auto-delete old data per policy
   - Provide manual deletion

---

## Next Steps

1. **Review & Approve** this architecture
2. **Set up development environment** with IndexedDB browser tools
3. **Start Phase 1 implementation** (Week 1 tasks)
4. **Recruit beta testers** with poor connectivity
5. **Plan field testing** at construction sites

---

## References

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [idb Library](https://github.com/jakearchibald/idb)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Background Sync API](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync/)
- [Service Worker Best Practices](https://web.dev/service-worker-mindset/)

---

**Document Status:** Architecture Complete - Implementation In Progress
**Last Updated:** January 2026
**Owner:** Engineering Team

### Implementation Status (January 2026)
- ✅ Basic PWA setup with Vite PWA plugin
- ✅ Workbox-based service worker
- ✅ IndexedDB local storage (offline-store.ts)
- ✅ Data prefetch for offline use (useDataPrefetch hook)
- ✅ Offline indicator UI (OfflineIndicator component)
- ✅ Project-level offline download (Make Offline button)
- 🚧 Full sync queue implementation (in progress)
- 🚧 Conflict resolution UI (planned)
