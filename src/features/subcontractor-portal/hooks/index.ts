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
