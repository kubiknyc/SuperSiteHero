// File: /src/types/offline.ts
// TypeScript types for offline-first functionality

/**
 * Cached data stored in IndexedDB
 * @template T The type of data being cached (defaults to Record<string, unknown>)
 */
export interface CachedData<T = Record<string, unknown>> {
  key: string;              // Format: "{table}:{id}" or "{table}:list:{filter_hash}"
  table: string;            // projects, daily_reports, rfis, etc.
  data: T | T[];            // The actual record(s) - typed instead of any
  timestamp: number;        // When cached (Date.now())
  expiresAt: number;        // TTL timestamp
  version: number;          // For conflict resolution
  syncedAt: number | null;  // Last successful sync with server
}

/**
 * Mutation queued for sync when online
 * @template T The type of data being mutated (defaults to Record<string, unknown>)
 */
export interface QueuedMutation<T = Record<string, unknown>> {
  id: string;               // UUID
  type: 'create' | 'update' | 'delete';
  table: string;            // Database table
  data?: Partial<T>;        // Data for create/update - typed instead of any
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
 * @template T The type of data in conflict (defaults to Record<string, unknown>)
 */
export interface Conflict<T = Record<string, unknown>> {
  id: string;               // UUID
  table: string;            // Database table
  recordId: string;         // Record ID
  localVersion: T;          // Local version of the data - typed instead of any
  remoteVersion: T;         // Remote version from server - typed instead of any
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

/**
 * Photo metadata extracted from EXIF
 */
export interface PhotoMetadata {
  latitude?: number;        // GPS latitude
  longitude?: number;       // GPS longitude
  altitude?: number;        // GPS altitude in meters
  timestamp?: Date;         // Photo capture timestamp
  make?: string;            // Camera make
  model?: string;           // Camera model
  orientation?: number;     // Image orientation (1-8)
  width?: number;           // Image width in pixels
  height?: number;          // Image height in pixels
  focalLength?: number;     // Focal length in mm
  exposureTime?: number;    // Exposure time in seconds
  fNumber?: number;         // F-number/aperture
  iso?: number;             // ISO speed
}

/**
 * Photo queued for upload when online
 */
export interface QueuedPhoto {
  id: string;               // UUID
  checklistId: string;      // Checklist ID
  responseId: string;       // Response ID
  file: Blob;               // Photo file data
  fileName: string;         // Original file name
  fileSize: number;         // File size in bytes
  mimeType: string;         // MIME type (image/jpeg, etc.)
  timestamp: number;        // When queued
  retryCount: number;       // Number of upload attempts
  status: 'pending' | 'uploading' | 'failed' | 'uploaded';
  error?: string;           // Error message if failed
  uploadedUrl?: string;     // URL after successful upload
  metadata?: PhotoMetadata; // EXIF metadata
}