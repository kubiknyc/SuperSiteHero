/**
 * Quality Control Hooks Index
 *
 * Export all Quality Control React Query hooks.
 */

export {
  // Query Keys
  qualityControlKeys,

  // NCR Query Hooks
  useNCRs,
  useNCR,
  useNCRHistory,

  // NCR Mutation Hooks - CRUD
  useCreateNCR,
  useUpdateNCR,
  useDeleteNCR,

  // NCR Mutation Hooks - Workflow
  useTransitionNCRStatus,
  useStartNCRInvestigation,
  useStartCorrectiveAction,
  useSubmitNCRForVerification,
  useVerifyNCR,
  useCloseNCR,
  useReopenNCR,

  // Inspection Query Hooks
  useInspections,
  useInspection,
  useInspectionChecklistItems,

  // Inspection Mutation Hooks - CRUD
  useCreateInspection,
  useUpdateInspection,
  useDeleteInspection,

  // Inspection Mutation Hooks - Workflow
  useStartInspection,
  useCompleteInspection,
  useCancelInspection,

  // Checklist Item Mutations
  useUpdateChecklistItem,
  useBatchUpdateChecklistItems,

  // Statistics Hooks
  useProjectQCStats,
  useNCRSummaryByStatus,
  useNCRSummaryBySeverity,
} from './useQualityControl';
