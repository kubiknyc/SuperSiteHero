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

// Lien Waivers (P0 - Critical for construction compliance)
export {
  lienWaiverKeys,
  useSubcontractorLienWaivers,
  usePendingLienWaivers,
  useLienWaiverSummary,
  useSignLienWaiver,
  getWaiverTypeLabel,
  getWaiverTypeDescription,
  isConditionalWaiver,
  isFinalWaiver,
  getWaiverStatusLabel,
  getWaiverStatusBadgeVariant,
  getWaiverStatusColor,
  waiverNeedsAction,
  isWaiverOverdue,
  getDaysUntilDue,
  formatWaiverAmount,
} from './useSubcontractorLienWaivers'

// Retainage Tracking (P0 - Critical for financial management)
export {
  retainageKeys,
  useRetainageInfo,
  useRetainageReleases,
  useRetainageSummary,
  getContractStatusLabel,
  getContractStatusBadgeVariant,
  getReleaseTypeLabel,
  getReleaseStatusLabel,
  getReleaseStatusBadgeVariant,
  formatRetainageAmount,
  formatRetainagePercent,
  calculateSubstantialCompletionRelease,
  isEligibleForSubstantialRelease,
  isEligibleForFinalRelease,
  getMilestoneStatus,
  getRetainageHealth,
} from './useSubcontractorRetainage'

// Insurance Endorsement Verification (P0-3 - Critical for compliance)
export {
  insuranceKeys,
  useSubcontractorInsuranceCertificates,
  useSubcontractorInsuranceRequirements,
  useInsuranceComplianceSummary,
  getInsuranceTypeLabel,
  getInsuranceTypeShortLabel,
  getEndorsementTypeLabel,
  getEndorsementTypeShortLabel,
  getEndorsementStatusBadgeVariant,
  getEndorsementStatusLabel,
  getCertificateStatusBadgeVariant,
  getCertificateStatusLabel,
  formatCoverageAmount,
  isCertificateExpiringSoon,
  isCertificateExpired,
  // getDaysUntilExpiration already exported from useComplianceDocuments
  // getComplianceScoreColor and getComplianceScoreBgColor are exported from useSubcontractorSafety
} from './useSubcontractorInsurance'

// Pay Applications with Line Items (P1 - Important for billing visibility)
export {
  payApplicationKeys,
  useSubcontractorPayApplications,
  useSubcontractorPayApplication,
  usePayApplicationSummary,
  getPayAppStatusVariant,
  getPayAppStatusLabel,
  getPayAppStatusColor,
  formatCurrency,
  formatPercent,
  calculateLineItemsTotals,
  groupPayApplicationsByProject,
  isAwaitingAction,
  isComplete,
} from './useSubcontractorPayApplications'

export type {
  SubcontractorPayApplication,
  SubcontractorPayAppLineItem,
  PayApplicationSummary,
  PayApplicationStatus,
} from './useSubcontractorPayApplications'

// Change Order Impact Display (P1-2 - Important for contract visibility)
export {
  changeOrderKeys,
  useSubcontractorChangeOrders,
  useChangeOrderItems,
  useChangeOrderSummary,
  getChangeOrderStatusVariant,
  getChangeOrderStatusLabel,
  getChangeOrderStatusColor,
  getChangeOrderTypeLabel,
  getChangeOrderTypeColor,
  isPending,
  isFinalized,
  getDisplayNumber,
  formatAmount,
  formatDaysImpact,
  groupChangeOrdersByProject,
  calculateItemsTotals,
} from './useSubcontractorChangeOrders'

export type {
  SubcontractorChangeOrder,
  SubcontractorChangeOrderItem,
  ChangeOrderSummary,
  ChangeOrderStatus,
  ChangeOrderType,
} from './useSubcontractorChangeOrders'

// Schedule View & Notifications (P1-3 - Important for project visibility)
export {
  scheduleKeys,
  useSubcontractorScheduleActivities,
  useScheduleChangeNotifications,
  useScheduleSummary,
  useMarkScheduleNotificationRead,
  getActivityStatusVariant,
  getActivityStatusLabel,
  getActivityStatusColor,
  formatVariance,
  getVarianceColor,
  getChangeTypeLabel,
  getChangeTypeColor,
  groupActivitiesByProject,
  filterActivitiesByStatus,
  formatScheduleDate,
  getDaysUntil,
} from './useSubcontractorSchedule'

export type {
  SubcontractorScheduleActivity,
  ScheduleChangeNotification,
  ScheduleSummary,
  ScheduleActivityStatus,
} from './useSubcontractorSchedule'

// Safety Compliance Dashboard (P1-4 - Important for safety visibility)
export {
  safetyKeys,
  useSubcontractorSafetyIncidents,
  useSubcontractorCorrectiveActions,
  useSubcontractorToolboxTalks,
  useSubcontractorSafetyMetrics,
  useSafetyComplianceSummary,
  getSeverityBadgeVariant,
  getSeverityLabel,
  getSeverityColor,
  getIncidentStatusBadgeVariant,
  getIncidentStatusLabel,
  getActionStatusVariant,
  getActionStatusLabel,
  getPriorityBadgeVariant,
  getPriorityLabel,
  getComplianceScoreColor,
  getComplianceScoreBgColor,
  getComplianceScoreLabel,
  formatSafetyDate,
  formatDaysSince,
  filterIncidentsByStatus,
  filterActionsByStatus,
  groupIncidentsByProject,
} from './useSubcontractorSafety'

export type {
  SubcontractorSafetyIncident,
  SubcontractorCorrectiveAction,
  SubcontractorToolboxTalk,
  SubcontractorSafetyMetrics,
  SafetyComplianceSummary,
  SafetyIncidentSeverity,
  SafetyIncidentStatus,
} from './useSubcontractorSafety'
