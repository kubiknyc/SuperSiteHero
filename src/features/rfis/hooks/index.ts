// File: /src/features/rfis/hooks/index.ts
// Central export for all RFI hooks

// ============================================================
// LEGACY HOOKS (workflow_items-based) - DEPRECATED
// These hooks use the generic workflow_items table approach.
// For new code, use the dedicated RFI hooks below instead.
// Legacy hooks will be removed in a future major version.
// ============================================================
/** @deprecated Use useDedicatedRFI instead */
export { useRFI, useRFIs, useRFIWorkflowType, useMyRFIs, useRFIsByStatus } from './useRFIs'
/** @deprecated Use useCreateRFI from dedicated hooks instead */
export { useCreateRFIWithNotification, useUpdateRFIWithNotification, useDeleteRFIWithNotification, useChangeRFIStatusWithNotification } from './useRFIMutations'

// ============================================================
// RECOMMENDED: Dedicated RFIs table hooks (Construction Industry Standard)
// These hooks use the purpose-built rfis table with:
// - Ball-in-court tracking
// - Construction-specific statuses
// - Automatic RFI numbering
// - Response time analytics
// ============================================================
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

// RFI Escalation hooks
export {
  useOverdueRFIs as useOverdueRFIsEscalation,
  useEscalationStats,
  useEscalateRFIPriority,
  useBatchEscalateRFIs,
  useRecordReminderSent,
  DEFAULT_ESCALATION_CONFIG,
  type EscalationConfig,
  type EscalationResult,
  type OverdueRFI,
} from './useRFIEscalation'

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

// RFI Response History hooks
export {
  // Query hooks
  useRFIResponses,
  useRFIResponseHistory,
  useCurrentOfficialResponse,
  useResponseRevisionHistory,
  // Mutation hooks
  useAddRFIResponse,
  useReviseRFIResponse,
  // Query keys
  rfiResponseKeys,
  // Utility functions
  getResponseTypeLabel,
  getResponseTypeColor,
  getActionTypeLabel,
  getActionTypeColor,
  isSuperseded,
  getVersionLabel,
  // Types
  type RFIResponse,
  type ResponseType,
  type ResponseActionType,
  type CreateRFIResponseInput,
  type UpdateRFIResponseInput,
} from './useRFIResponseHistory'

// RFI Drawing Links hooks
export {
  // Query hooks
  useRFIDrawingLinks,
  useRFIsByDrawing,
  // Mutation hooks
  useAddRFIDrawingLink,
  useUpdateRFIDrawingLink,
  useRemoveRFIDrawingLink,
  // Query keys
  rfiDrawingLinkKeys,
  // Utility functions
  pixelToNormalized,
  normalizedToPixel,
  getPinColorForPriority,
  // Types
  type RFIDrawingLink,
  type CreateRFIDrawingLinkInput,
  type UpdateRFIDrawingLinkInput,
} from './useRFIDrawingLinks'

// RFI Cost Rollup hooks
export {
  // Query hooks
  useRFICostRollup,
  useRFIsWithCostImpact,
  useRFICostByMonth,
  // Mutation hooks
  useUpdateCostImpactStatus,
  // Query keys
  rfiCostRollupKeys,
  // Export functions
  exportCostImpactToCSV,
  downloadCostImpactReport,
  // Utility functions
  getCostImpactStatusColor,
  getCostImpactStatusLabel,
  formatCurrency,
  calculatePercentage,
  // Types
  type CostImpactStatus,
  type RFICostRollup,
  type RFICostImpactItem,
  type CostImpactFilters,
} from './useRFICostRollup'
