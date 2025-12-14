/**
 * Look-Ahead Planning Hooks
 * Re-export all hooks for easier imports
 */

export {
  // Query Keys
  lookAheadKeys,
  // Activity Queries
  useLookAheadActivities,
  useActivitiesForWeek,
  useActivitiesByWeek,
  useLookAheadActivity,
  // Activity Mutations
  useCreateActivity,
  useUpdateActivity,
  useMoveActivityToWeek,
  useUpdateActivityStatus,
  useDeleteActivity,
  // Constraint Queries
  useActivityConstraints,
  useProjectOpenConstraints,
  // Constraint Mutations
  useCreateConstraint,
  useUpdateConstraint,
  useDeleteConstraint,
  // Snapshot & PPC Queries
  useLookAheadSnapshots,
  usePPCMetrics,
  useCreateSnapshot,
  // Template Queries
  useLookAheadTemplates,
  useCreateActivityFromTemplate,
  // Dashboard Query
  useLookAheadDashboardStats,
} from './useLookAhead'

// Sync hooks for Daily Report integration
export {
  lookAheadSyncKeys,
  useProgressSummaries,
  useSyncStatus,
  useSyncActivity,
  useBatchSync,
  useLinkProgress,
  useUnlinkProgress,
  useAutoLinkProgress,
} from './useLookAheadSync'
