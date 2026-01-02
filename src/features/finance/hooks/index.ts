// Finance Hooks

// ============================================================
// Payment Forecast Hooks (existing)
// ============================================================
export {
  // Query Keys
  paymentForecastKeys,

  // Payment Query Hooks
  useUpcomingPayments,
  usePaymentsByMonth,
  useOverduePayments,

  // Calendar Hooks
  usePaymentCalendarEvents,
  usePaymentForecastCalendar,

  // Cash Flow Hooks
  useCashFlowForecast,
  useProjectCashFlow,

  // Pattern Hooks
  usePaymentPatterns,

  // Mutation Hooks
  useCreatePaymentForecast,
  useUpdatePaymentForecast,
  useDeletePaymentForecast,
  useMarkPaymentCompleted,

  // Combined Hooks
  usePaymentForecastDashboard,

  // Utility Hooks
  usePaymentTypeOptions,
  usePaymentStatusOptions,
} from './usePaymentForecast'

// ============================================================
// Schedule of Values (SOV) Hooks
// ============================================================
export {
  // Query Keys
  sovKeys,

  // SOV Query Hooks
  useScheduleOfValues,
  useSOVLineItems,
  useSOVSummary,

  // SOV Mutation Hooks
  useCreateSOV,
  useUpdateSOV,
  useAddSOVLineItem,
  useUpdateSOVLineItem,
  useUpdateSOVLineItemBilling,
  useDeleteSOVLineItem,
  useReorderSOVLineItems,
  useRollBillingForward,

  // Utility Hooks
  useCSIDivisions,
} from './useScheduleOfValues'

// ============================================================
// Payment Applications (AIA G702/G703) Hooks
// ============================================================
export {
  // Query Keys
  paymentAppKeys,

  // Query Hooks
  usePaymentApplications,
  usePaymentApplication,
  useG703,
  useFilteredApplications,

  // Mutation Hooks
  useCreatePaymentApplication,
  useUpdatePaymentApplication,
  useUpdateG703LineItem,
  useSubmitPaymentApplication,
  useApprovePaymentApplication,
  useMarkApplicationPaid,
  useRejectPaymentApplication,
  useAddSignature,
  useRecalculateG702Totals,
} from './usePaymentApplications'

// ============================================================
// Job Costing Hooks
// ============================================================
export {
  // Query Keys
  jobCostingKeys,

  // Cost Code Hooks
  useCostCodes,
  useFilteredCostCodes,
  useCostCodeDetail,

  // Job Cost Summary Hooks
  useJobCostSummary,
  useVarianceAnalysis,

  // Cost Transaction Hooks
  useCostTransactions,

  // Committed Cost Hooks
  usePurchaseOrders,
  useSubcontracts,
  useCommittedCostSummary,

  // Mutation Hooks
  useCreateCostCode,
  useUpdateCostCode,
  useAddCostTransaction,
  useImportBudgetFromEstimate,
} from './useJobCosting'

// ============================================================
// Cash Flow Projection Hooks
// ============================================================
export {
  // Query Keys
  cashFlowKeys,

  // Projection Hooks
  useCashFlowProjection,
  useSCurve,
  useCashFlowComparison,
  useForecastToComplete,
  useMultiProjectCashFlow,

  // Utility Hooks
  useMonthOptions,
} from './useCashFlow'
