// File: /src/types/offline.ts
// TypeScript types for offline-first functionality

/**
 * Cached data stored in IndexedDB
 */
export interface CachedData {
  key: string;              // Format: "{table}:{id}" or "{table}:list:{filter_hash}"
  table: string;            // projects, daily_reports, rfis, etc.
  data: any;                // The actual record(s)
  timestamp: number;        // When cached (Date.now())
  expiresAt: number;        // TTL timestamp
  version: number;          // For conflict resolution
  syncedAt: number | null;  // Last successful sync with server
}

/**
 * Mutation queued for sync when online
 */
export interface QueuedMutation {
  id: string;               // UUID
  type: 'create' | 'update' | 'delete';
  table: string;            // Database table
  data?: any;               // Data for create/update
  recordId?: string;        // Record ID for updates/deletes
  timestamp: number;        // When queued
  retryCount: number;       // Number of retry attempts
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;           // Error message if failed
  priority: 'high' | 'normal' | 'low';
}

/**
 * User-controlled download
 */
export interface UserDownload {
  id: string;               // UUID
  type: 'project' | 'document' | 'photos';
  resourceId: string;       // ID of the resource being downloaded
  status: 'downloading' | 'complete' | 'error';
  progress: number;         // 0-100
  size: number;             // bytes
  downloadedAt: number;     // Timestamp
  error?: string;           // Error message if failed
}

/**
 * Data conflict detected during sync
 */
export interface Conflict {
  id: string;               // UUID
  table: string;            // Database table
  recordId: string;         // Record ID
  localVersion: any;        // Local version of the data
  remoteVersion: any;       // Remote version from server
  timestamp: number;        // When conflict detected
  resolved: boolean;        // Whether conflict has been resolved
  resolution?: 'local' | 'remote' | 'manual'; // How it was resolved
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  total: number;            // Total available storage
  used: number;             // Used by app
  available: number;        // Remaining
  warning: boolean;         // True if <10% remaining
  critical: boolean;        // True if <5% remaining
}

/**
 * Offline state for Zustand store
 */
export interface OfflineState {
  isOnline: boolean;
  pendingSyncs: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
  conflictCount: number;
  storageQuota: StorageQuota | null;
}

/**
 * Offline state actions
 */
export interface OfflineActions {
  setOnline: (online: boolean) => void;
  setPendingSyncs: (count: number) => void;
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setConflictCount: (count: number) => void;
  updateStorageQuota: () => Promise<void>;
  updatePendingSyncs: () => Promise<void>;
  updateConflictCount: () => Promise<void>;
}

/**
 * Complete offline store type
 */
export type OfflineStore = OfflineState & OfflineActions;

/**
 * Cache strategy for different data types
 */
export interface CacheStrategy {
  table: string;
  ttl: number;              // Time to live in milliseconds
  priority: 'high' | 'normal' | 'low';
  maxEntries?: number;      // Max number of entries to cache
}

/**
 * Sync event types
 */
export type SyncEventType =
  | 'sync:started'
  | 'sync:progress'
  | 'sync:success'
  | 'sync:failed'
  | 'sync:retry'
  | 'conflict:detected'
  | 'conflict:resolved';

/**
 * Sync event data
 */
export interface SyncEvent {
  type: SyncEventType;
  mutation?: QueuedMutation;
  conflict?: Conflict;
  error?: Error;
  timestamp: number;
}