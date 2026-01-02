/**
 * Reports Hooks Index
 *
 * Export all report-related hooks.
 */

// Report data hooks
export {
  useExecutiveSummary,
  useProjectHealthReport,
  useDailyReportAnalytics,
  useWorkflowSummary,
  usePunchListReport,
  useSafetyIncidentReport,
  useFinancialSummary,
  useDocumentSummary,
} from './useReports'

export type {
  ExecutiveSummary,
  ReportHighlight,
  ReportConcern,
} from './useReports'

// Report builder hooks
export {
  reportBuilderKeys,
  useReportTemplates,
  useReportTemplate,
  useCreateReportTemplate,
  useUpdateReportTemplate,
  useDeleteReportTemplate,
  useDuplicateReportTemplate,
  useSetTemplateFields,
  useSetTemplateFilters,
  useSetTemplateSorting,
  useSetTemplateGrouping,
  useSaveTemplateConfiguration,
  useScheduledReports,
  useScheduledReport,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useToggleScheduledReportActive,
  useGeneratedReports,
  useGeneratedReport,
  useGenerateReport,
  useFieldDefinitions,
  useAllFieldDefinitions,
  useDefaultFields,
  useExportReport,
} from './useReportBuilder'

// Standard templates hooks
export {
  useStandardTemplates,
  useTemplateFilters,
  useTemplateSelection,
  useTemplatePreview,
} from './useStandardTemplates'
export type {
  UseStandardTemplatesOptions,
  UseStandardTemplatesResult,
  UseTemplateSelectionResult,
  UseTemplateFiltersResult,
  UseTemplatePreviewResult,
} from './useStandardTemplates'

// Weather delay suggestion hooks
export {
  weatherKeys,
  useWeatherForecast,
  useWeatherSuggestions,
  useCachedWeather,
  useWeatherHistory,
  useWeatherDelayAnalytics,
  useSaveWeather,
  useCurrentWeather,
  useGenerateSuggestions,
  getDelayTemplate,
  formatWeatherDisplay,
  shouldSuggestDelay,
  getWeatherSeverity,
  WEATHER_THRESHOLDS,
  WEATHER_DELAY_TEMPLATES,
} from './useWeatherSuggestions'
export type {
  WeatherData,
  WeatherForecast,
  WeatherDelaySuggestion,
  WeatherDelayType,
  WeatherDelayAnalytics,
} from './useWeatherSuggestions'

// Chart data hooks
export { useChartData } from './useChartData'
export type { ChartDataPoint } from './useChartData'

// Report sharing hooks
export {
  reportSharingKeys,
  useReportShares,
  useReportShare,
  usePublicSharedReport,
  useCompanySharedReports,
  useCreateReportShare,
  useUpdateReportShare,
  useDeleteReportShare,
  useRegenerateShareToken,
  useShareUrl,
  useEmbedCode,
  useCopyToClipboard,
} from './useReportSharing'

// Template cloning hooks
export {
  useCloneTemplate,
  useBulkCloneTemplates,
} from './useCloneTemplate'
export type {
  CloneTemplateOptions,
  ClonedTemplate,
  UseCloneTemplateResult,
} from './useCloneTemplate'
