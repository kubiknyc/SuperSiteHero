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

// Comprehensive Sync Status Panel
export { SyncStatusPanel } from './SyncStatusPanel';
