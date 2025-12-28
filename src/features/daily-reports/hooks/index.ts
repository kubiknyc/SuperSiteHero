// File: /src/features/daily-reports/hooks/index.ts
// Central export for all daily report hooks

// Core CRUD hooks
export {
  useDailyReports,
  useDailyReport,
  useCreateDailyReport,
  useUpdateDailyReport,
  useDeleteDailyReport,
  // Copy from Previous feature
  usePreviousDayReport,
  extractCopyableFields,
} from './useDailyReports'

// Offline sync hooks
export { useOfflineSync } from './useOfflineSync'

// Related data hooks
export { useDailyReportFullData } from './useDailyReportRelatedData'

// V2 hooks
export { useOfflineSyncV2 } from './useOfflineSyncV2'
export { useGeolocation, formatCoordinates, calculateDistance } from './useGeolocation'

// Template sharing hooks
export {
  // Query keys
  templateKeys,
  // Query hooks
  useTemplates,
  useProjectTemplates,
  useCompanyTemplates,
  useTemplate,
  useTemplateWithStats,
  usePopularTemplates,
  useRecentTemplates,
  useTemplateTags,
  useTemplateSearch,
  // Mutation hooks
  useCreateTemplate,
  useCreateTemplateFromReport,
  useUpdateTemplate,
  useDeleteTemplate,
  useCopyTemplate,
  useApplyTemplate,
  useExportTemplate,
  useImportTemplate,
  // Utility hooks
  useTemplateFilters,
} from './useDailyReportTemplates'

// Cost aggregation hooks
export {
  // Query keys
  dailyReportCostKeys,
  // Labor hooks
  useLaborByCostCode,
  useLaborByCostCodeWithTotals,
  // Equipment hooks
  useEquipmentByCostCode,
  useEquipmentByCostCodeWithTotals,
  // Progress hooks
  useProgressByCostCode,
  useProgressByCostCodeWithTotals,
  // Work performed (combined) hooks
  useWorkPerformedByCostCode,
  useWorkPerformedGroupedByCostCode,
  // Cost summary hooks
  useDailyReportCostSummary,
  useDailyReportCostSummaryByDivision,
  // RPC function hooks
  useProjectCostByDateRange,
  useDailyCostTrend,
  // Stats hooks
  useProjectCostStats,
  useCostCodePeriodSummary,
  // Combined hooks
  useAllCostData,
  useCostTrendData,
} from './useDailyReportCosts'
