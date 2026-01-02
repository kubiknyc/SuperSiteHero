/**
 * Subcontractors Hooks
 * Re-export all hooks for easy importing
 */

// Bid Leveling
export {
  bidLevelingKeys,
  useBidLevelingMatrix,
  useBidRecommendation,
  useExportBidLeveling,
  useLineItemAnalysis,
  useNormalizeBids,
  calculateScopeGapScore,
  getPriceVarianceStatus,
  formatBidCurrency,
} from './useBidLeveling'

// Pre-Qualification
export {
  preQualKeys,
  usePreQualQuestionnaires,
  usePreQualQuestionnaire,
  usePreQualSubmissions,
  usePreQualSubmission,
  usePreQualifiedVendors,
  usePreQualStats,
  useCreatePreQualSubmission,
  useReviewPreQualSubmission,
  useScorePreQualSubmission,
  useRequestPreQualInfo,
  useDeletePreQualSubmission,
  calculatePreQualScore,
} from './usePreQualification'

// Insurance Compliance
export {
  insuranceComplianceKeys,
  useInsuranceComplianceList,
  useSubcontractorCompliance,
  useExpiringCertificates,
  useExpirationCalendar,
  useInsuranceComplianceDashboard,
  useReminderSettings,
  useUpdateReminderSettings,
  useSendBulkReminders,
  useSendReminder,
  useUploadCertificate,
  useVerifyCertificate,
  getInsuranceTypeName,
  getComplianceStatusColor,
  getExpiryText,
} from './useInsuranceCompliance'

// Scope Templates
export {
  scopeTemplateKeys,
  useScopeTemplates,
  useScopeTemplate,
  useScopeTemplateLibrary,
  useScopeTemplatesByTrade,
  useCreateScopeTemplate,
  useUpdateScopeTemplate,
  useDeleteScopeTemplate,
  useDuplicateScopeTemplate,
  useApplyScopeTemplate,
  useAddTemplateItem,
  useUpdateTemplateItem,
  useDeleteTemplateItem,
  useReorderTemplateItems,
  getTradeLabel,
  getTradeDivision,
  formatTemplateForExport,
} from './useScopeTemplates'

// Subcontracts
export {
  subcontractKeys,
  useSubcontracts,
  useSubcontract,
  useSubcontractsByProject,
  useSubcontractSummary,
  useSubcontractAmendments,
  useSubcontractPayments,
  useSubcontractChangeOrders,
  useCreateSubcontract,
  useCreateSubcontractFromBid,
  useUpdateSubcontract,
  useUpdateSubcontractStatus,
  useCreateAmendment,
  useExecuteAmendment,
  useDeleteSubcontract,
  getSubcontractStatusVariant,
  formatContractValue,
  calculatePercentComplete,
} from './useSubcontracts'
