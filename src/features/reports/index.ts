/**
 * Reports Feature
 *
 * Comprehensive reporting system with:
 * - Pre-built industry-standard templates (daily, weekly, monthly)
 * - Custom report builder
 * - Multiple export formats (PDF, Excel, CSV)
 * - Scheduled report delivery
 */

// Components
export {
  DataSourceSelector,
  DataSourceBadge,
  FieldPicker,
  FilterBuilder,
  ReportTemplateCard,
  ReportTemplateCardSkeleton,
  TemplateLibrary,
  ProjectHealthReport,
  SafetyIncidentReport,
  FinancialSummaryReport,
  PunchListReport,
  // Weather delay suggestion components
  WeatherDelayAutoSuggest,
  WeatherIcon,
  SeverityBadge,
  SuggestionCard,
  WeatherSummary,
} from './components'
export type { TemplateLibraryProps, WeatherDelayAutoSuggestProps } from './components'

// Hooks
export {
  useProjectHealthReport,
  useDailyReportAnalytics,
  useWorkflowSummary,
  usePunchListReport,
  useSafetyIncidentReport,
  useFinancialSummary,
  useDocumentSummary,
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
  useStandardTemplates,
  useTemplateFilters,
  useTemplateSelection,
  useTemplatePreview,
  // Weather delay suggestion hooks
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
} from './hooks'
export type {
  WeatherData,
  WeatherForecast,
  WeatherDelaySuggestion,
  WeatherDelayType,
  WeatherDelayAnalytics,
} from './hooks'

// Services
export {
  reportExportService,
  getAllStandardTemplates,
  getTemplatesByCategory,
  getTemplatesByDataSource,
  getTemplateById,
  searchTemplates,
  getTemplateCounts,
  getCategoryInfo,
  getAllTags,
  filterByTags,
  STANDARD_TEMPLATES,
} from './services'
export type {
  ReportExportOptions,
  ReportExportResult,
  StandardTemplate,
  TemplateCategory,
} from './services'
