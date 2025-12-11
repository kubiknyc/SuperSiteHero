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
