/**
 * Field Dashboard Hooks
 * Export all hooks for easy importing
 */

export {
  useFieldDashboard,
  useTodaysPunchItems,
  useTodaysInspections,
  fieldDashboardKeys,
} from './useFieldDashboard'
export type {
  FieldDashboardData,
  UseFieldDashboardOptions,
} from './useFieldDashboard'

export {
  useDashboardLayouts,
  useDefaultLayout,
  useLayoutById,
  useSharedLayouts,
  useWidgetPreferences,
  useCreateLayout,
  useUpdateLayout,
  useDeleteLayout,
  useSetDefaultLayout,
  useCloneLayout,
  useSaveWidgetPositions,
  useAddWidget,
  useRemoveWidget,
  useUpdateWidgetConfig,
  dashboardKeys,
} from './useDashboardLayout'
