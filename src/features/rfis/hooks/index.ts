// File: /src/features/rfis/hooks/index.ts
// Central export for all RFI hooks

// Legacy workflow_items-based hooks (backwards compatibility)
export { useRFI, useRFIs, useRFIWorkflowType, useMyRFIs, useRFIsByStatus } from './useRFIs'
export { useCreateRFIWithNotification, useUpdateRFIWithNotification, useDeleteRFIWithNotification, useChangeRFIStatusWithNotification } from './useRFIMutations'

// NEW: Dedicated RFIs table hooks (Construction Industry Standard)
export {
  // Query hooks
  useProjectRFIs,
  useAllRFIs,
  useRFI as useDedicatedRFI,
  useRFIsByBallInCourt,
  useRFIsByStatus as useDedicatedRFIsByStatus,
  useOverdueRFIs,
  useRFIAttachments as useDedicatedRFIAttachments,
  useRFIComments,
  useRFIHistory,
  // Mutation hooks
  useCreateRFI,
  useUpdateRFI,
  useSubmitRFI,
  useRespondToRFI,
  useUpdateBallInCourt,
  useCloseRFI,
  useDeleteRFI,
  useAddRFIComment,
  // Statistics
  useRFIStats,
  // Utility functions
  generateRFINumber,
  formatRFINumber,
  getRFIStatusColor,
  getRFIPriorityColor,
  getBallInCourtLabel,
  // Constants
  RFI_STATUSES,
  RFI_PRIORITIES,
  BALL_IN_COURT_ROLES,
  // Types
  type RFIWithDetails,
} from './useDedicatedRFIs'

// RFI Response Time Analytics hooks
export {
  // Individual metric hooks
  useAverageResponseTime,
  useResponseTimeByPriority,
  useResponseTimeByAssignee,
  useResponseTimeByResponseType,
  useResponseTimeDistribution,
  useResponseTimeTrends,
  useOnTimePerformance,
  useResponseTimeByDayOfWeek,
  useResponseTimeByMonth,
  useResponseTimeRecords,
  // Complete analytics hook
  useRFIResponseAnalytics,
  // Convenience hooks
  useRFIResponseMetrics,
  useAssigneePerformance,
  useResponseTimeTrendAnalysis,
  // Query keys for cache management
  rfiResponseAnalyticsKeys,
  // Utility
  getDateRangeFromPreset,
} from './useRFIResponseAnalytics'
