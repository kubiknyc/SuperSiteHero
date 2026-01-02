// File: /src/features/submittals/hooks/index.ts
// Central export for all submittal hooks

// ============================================================
// LEGACY HOOKS (workflow_items-based) - DEPRECATED
// These hooks use the generic workflow_items table approach.
// For new code, use the dedicated submittal hooks below instead.
// Legacy hooks will be removed in a future major version.
// ============================================================
/** @deprecated Use useCreateSubmittal from dedicated hooks instead */
export { useCreateSubmittalWithNotification, useUpdateSubmittalWithNotification, useDeleteSubmittalWithNotification, useUpdateSubmittalStatusWithNotification, useUpdateSubmittalProcurementStatusWithNotification } from './useSubmittalMutations'
/** @deprecated Use useDedicatedSubmittal instead */
export { useSubmittal, useSubmittals, useSubmittalWorkflowType, useMySubmittals, useSubmittalsByStatus, useSubmittalComments, useSubmittalProcurement } from './useSubmittals'

// ============================================================
// RECOMMENDED: Dedicated submittals table hooks (Construction Industry Standard)
// These hooks use the purpose-built submittals table with:
// - Ball-in-court tracking
// - Spec section organization
// - Construction review statuses (Approved, Approved as Noted, etc.)
// - Lead time tracking
// - Submittal item management
// ============================================================
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

// Lead Time Tracking hooks
export {
  useSubmittalLeadTime,
  useSingleSubmittalLeadTime,
  type SubmittalWithLeadTime,
  type LeadTimeMetrics,
  type LeadTimeStats,
  type LeadTimeFilters,
} from './useSubmittalLeadTime'

// Submittal Reminders hooks
export {
  useSubmittalsWithReminders,
  useSubmittalReminderStats,
  useAllSubmittalReminders,
  useRecordSubmittalReminder,
  useSnoozeSubmittalReminder,
  DEFAULT_REMINDER_CONFIG,
  type ReminderConfig,
  type SubmittalWithReminder,
  type ReminderStats,
} from './useSubmittalReminders'
