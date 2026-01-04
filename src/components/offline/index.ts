/**
 * Offline Components
 * Export all offline-related components
 */

// Legacy components
export {
  EnhancedOfflineIndicator,
  OfflineBadge,
  SyncStatusBadge,
} from './EnhancedOfflineIndicator'
export type {
  SyncStatus,
  EnhancedOfflineIndicatorProps,
} from './EnhancedOfflineIndicator'

// Phase 3 components
export { EnhancedConflictResolutionDialog } from './EnhancedConflictResolutionDialog';
export { SyncStatusBar } from './SyncStatusBar';
export { EntitySyncBadge } from './EntitySyncBadge';
export { SyncProgressBar } from './SyncProgressBar';
export type { EntitySyncStatus } from './EntitySyncBadge';

// Comprehensive Sync Status Panels
export { SyncStatusPanel } from './SyncStatusPanel';
export { GlobalSyncStatusPanel } from './GlobalSyncStatusPanel';
export { UploadQueuePanel } from './UploadQueuePanel';
export { ProjectCacheSettings } from './ProjectCacheSettings';
export { ConflictResolutionDialog } from './ConflictResolutionDialog';
export { OfflineIndicator } from './OfflineIndicator';

// Sync Retry Manager
export { SyncRetryManager, useSyncRetry } from './SyncRetryManager';
export type { SyncItem, SyncRetryManagerProps, UseSyncRetryOptions } from './SyncRetryManager';
