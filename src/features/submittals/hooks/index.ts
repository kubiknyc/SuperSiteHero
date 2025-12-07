// File: /src/features/submittals/hooks/index.ts
// Central export for all submittal hooks

// Legacy workflow_items-based hooks (backwards compatibility)
export { useCreateSubmittalWithNotification, useUpdateSubmittalWithNotification, useDeleteSubmittalWithNotification, useUpdateSubmittalStatusWithNotification, useUpdateSubmittalProcurementStatusWithNotification } from './useSubmittalMutations'
export { useSubmittal, useSubmittals, useSubmittalWorkflowType, useMySubmittals, useSubmittalsByStatus, useSubmittalComments, useSubmittalProcurement } from './useSubmittals'

// NEW: Dedicated submittals table hooks (Construction Industry Standard)
export {
  // Query hooks
  useProjectSubmittals,
  useAllSubmittals,
  useSubmittal as useDedicatedSubmittal,
  useSubmittalsByBallInCourt,
  useSubmittalsByStatus as useDedicatedSubmittalsByStatus,
  useSubmittalsBySpecSection,
  useSubmittalItems,
  useSubmittalAttachments,
  useSubmittalReviews,
  useSubmittalHistory,
  // Mutation hooks
  useCreateSubmittal,
  useUpdateSubmittal,
  useDeleteSubmittal,
  useAddSubmittalReview,
  useSubmitForReview,
  // Statistics
  useSubmittalStats,
  // Utility functions
  generateSubmittalNumber,
  // Constants
  SUBMITTAL_TYPES,
  REVIEW_STATUSES,
  BALL_IN_COURT_ENTITIES,
  // Types
  type SubmittalWithDetails,
} from './useDedicatedSubmittals'
