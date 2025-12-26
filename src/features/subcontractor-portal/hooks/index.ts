/**
 * Subcontractor Portal Hooks
 * Re-export all hooks for easy importing
 */

// Dashboard & Stats
export {
  subcontractorKeys,
  useSubcontractorDashboard,
  useSubcontractorStats,
  useSubcontractorProjects,
  useSubcontractorScope,
} from './useSubcontractorDashboard'

// Bids
export {
  bidKeys,
  useSubcontractorBids,
  usePendingBids,
  useSubcontractorBid,
  useSubmitBid,
  useDeclineBid,
} from './useSubcontractorBids'

// Punch Items & Tasks
export {
  itemKeys,
  useSubcontractorPunchItems,
  useOpenPunchItems,
  useUpdatePunchItemStatus,
  useSubcontractorTasks,
  useOpenTasks,
  useUpdateTaskStatus,
  useSubcontractorWorkItems,
} from './useSubcontractorItems'

// Compliance Documents
export {
  complianceKeys,
  useComplianceDocuments,
  useInsuranceCertificates,
  useLicenses,
  useExpiringDocuments,
  useUploadComplianceDocument,
  getDocumentTypeLabel,
  getDocumentStatusColor,
  getDaysUntilExpiration,
  isExpiringSoon,
  isExpired,
} from './useComplianceDocuments'

// Invitations & Portal Access (GC-side)
export {
  useProjectPortalAccess,
  useCreateInvitation,
  useUpdatePortalAccess,
  useRevokePortalAccess,
  useValidateInvitation,
  useAcceptInvitation,
} from './useInvitations'

// Daily Reports (read-only access)
export {
  dailyReportKeys,
  useCanViewDailyReports,
  useSubcontractorDailyReports,
  useSubcontractorDailyReportDetail,
  useSubcontractorDailyReportWorkforce,
  useSubcontractorDailyReportEquipment,
  useSubcontractorDailyReportPhotos,
  useSubcontractorDailyReportFull,
} from './useSubcontractorDailyReports'

// Punch Item Updates with Photo Proof (Milestone 4.2)
export {
  subPunchKeys,
  useMyPunchItems,
  useProofPhotos,
  useRequestCompletion,
  useUploadProofPhotos,
  useAddSubcontractorNote,
  useSubcontractorPunchUpdates,
} from './useSubcontractorPunchUpdates'

// Assignment Counts (for MyAssignments tabs)
export {
  assignmentCountsKey,
  useSubcontractorAssignmentCounts,
} from './useSubcontractorAssignmentCounts'

// Subcontractor Assignments: RFIs, Documents, Payments (Milestone 4.1)
export {
  subcontractorAssignmentKeys,
  useSubcontractorRFIs,
  useSubcontractorDocuments,
  useSubcontractorPayments,
} from './useSubcontractorAssignments'
