/**
 * Custom Report Builder Types
 *
 * Types for the report template system supporting:
 * - Multiple data sources (RFIs, Submittals, Daily Reports, etc.)
 * - Field selection with drag-drop ordering
 * - Filtering, sorting, and grouping options
 * - Scheduled report delivery
 * - Export to PDF, Excel, CSV
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

/**
 * Available data sources for reports
 */
export type ReportDataSource =
  | 'rfis'
  | 'submittals'
  | 'daily_reports'
  | 'change_orders'
  | 'payment_applications'
  | 'safety_incidents'
  | 'inspections'
  | 'punch_list'
  | 'tasks'
  | 'meetings'
  | 'documents'
  | 'equipment'
  | 'lien_waivers'
  | 'insurance_certificates'
  | 'toolbox_talks'

/**
 * Report output formats
 */
export type ReportOutputFormat = 'pdf' | 'excel' | 'csv'

/**
 * Report schedule frequency
 */
export type ReportScheduleFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'

/**
 * Report field data types
 */
export type ReportFieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'status'
  | 'user'
  | 'project'
  | 'company'

/**
 * Aggregation types for numeric fields in grouped reports
 */
export type ReportAggregationType =
  | 'none'
  | 'sum'
  | 'average'
  | 'count'
  | 'min'
  | 'max'

/**
 * Filter operators for report conditions
 */
export type ReportFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'

/**
 * Sort direction
 */
export type ReportSortDirection = 'asc' | 'desc'

/**
 * Generated report status
 */
export type GeneratedReportStatus = 'pending' | 'generating' | 'completed' | 'failed'

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Report template - saved configuration for generating reports
 */
export interface ReportTemplate {
  id: string
  company_id: string

  // Template info
  name: string
  description: string | null
  data_source: ReportDataSource

  // Ownership
  created_by: string | null
  is_system_template: boolean
  is_shared: boolean

  // Configuration (JSONB)
  configuration: ReportConfiguration

  // Default output settings
  default_format: ReportOutputFormat
  page_orientation: 'portrait' | 'landscape'
  include_charts: boolean
  include_summary: boolean

  // Timestamps
  created_at: string
  updated_at: string
  deleted_at: string | null

  // Joined data (optional)
  creator?: UserInfo
  fields?: ReportTemplateField[]
  filters?: ReportTemplateFilter[]
  sorting?: ReportTemplateSorting[]
  grouping?: ReportTemplateGrouping[]
}

/**
 * Report configuration stored as JSONB
 */
export interface ReportConfiguration {
  // UI state for field picker
  selectedFieldIds?: string[]

  // Charting options
  chartConfig?: {
    type: 'bar' | 'pie' | 'line' | 'area'
    groupByField?: string
    valueField?: string
    showLegend?: boolean
  }

  // Summary row options
  summaryFields?: {
    fieldName: string
    aggregation: ReportAggregationType
  }[]

  // Custom styling
  headerColor?: string
  alternateRowColor?: boolean
  fontSize?: 'small' | 'medium' | 'large'
}

/**
 * Selected field for a report template
 */
export interface ReportTemplateField {
  id: string
  template_id: string

  // Field configuration
  field_name: string
  display_name: string
  field_type: ReportFieldType

  // Display options
  display_order: number
  column_width: number | null
  is_visible: boolean

  // Aggregation
  aggregation: ReportAggregationType

  // Formatting
  format_string: string | null

  created_at: string
}

/**
 * Filter condition for a report template
 */
export interface ReportTemplateFilter {
  id: string
  template_id: string

  // Filter configuration
  field_name: string
  operator: ReportFilterOperator
  filter_value: unknown // JSONB

  // Relative date support
  is_relative_date: boolean
  relative_date_value: number | null
  relative_date_unit: 'days' | 'weeks' | 'months' | null

  // Filter grouping (AND/OR)
  filter_group: number

  display_order: number
  created_at: string
}

/**
 * Sort configuration for a report template
 */
export interface ReportTemplateSorting {
  id: string
  template_id: string

  field_name: string
  direction: ReportSortDirection
  sort_order: number

  created_at: string
}

/**
 * Grouping configuration for a report template
 */
export interface ReportTemplateGrouping {
  id: string
  template_id: string

  field_name: string
  group_order: number
  include_subtotals: boolean

  created_at: string
}

/**
 * Scheduled report configuration
 */
export interface ScheduledReport {
  id: string
  template_id: string
  company_id: string

  // Schedule name
  name: string
  description: string | null

  // Schedule configuration
  frequency: ReportScheduleFrequency
  day_of_week: number | null // 0-6 for weekly
  day_of_month: number | null // 1-31 for monthly
  time_of_day: string // TIME as string
  timezone: string

  // Output settings
  output_format: ReportOutputFormat

  // Recipients
  recipients: string[] // Email addresses

  // Email settings
  email_subject: string | null
  email_body: string | null

  // Project filter
  project_id: string | null

  // Status
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null

  // Ownership
  created_by: string | null

  // Timestamps
  created_at: string
  updated_at: string

  // Joined data
  template?: ReportTemplate
  project?: { id: string; name: string }
  creator?: UserInfo
}

/**
 * Generated report history entry
 */
export interface GeneratedReport {
  id: string
  template_id: string | null
  scheduled_report_id: string | null
  company_id: string

  // Report info
  report_name: string
  data_source: ReportDataSource

  // Generated by
  generated_by: string | null
  is_scheduled: boolean

  // Output
  output_format: ReportOutputFormat
  file_url: string | null
  file_size_bytes: number | null

  // Execution details
  row_count: number | null
  execution_time_ms: number | null

  // Filters snapshot
  filters_applied: Record<string, unknown>

  // Project scope
  project_id: string | null

  // Date range
  date_from: string | null
  date_to: string | null

  // Status
  status: GeneratedReportStatus
  error_message: string | null

  // Timestamps
  created_at: string
  expires_at: string | null

  // Joined data
  template?: ReportTemplate
  project?: { id: string; name: string }
  generator?: UserInfo
}

/**
 * Field definition for the field picker
 */
export interface ReportFieldDefinition {
  id: string
  data_source: ReportDataSource
  field_name: string
  display_name: string
  field_type: ReportFieldType

  // Metadata
  description: string | null
  category: string | null
  is_default: boolean
  is_sortable: boolean
  is_filterable: boolean
  is_groupable: boolean

  // Source info
  source_table: string | null
  source_column: string | null
  join_path: string | null

  display_order: number
  created_at: string
}

/**
 * Basic user info
 */
export interface UserInfo {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
}

// ============================================================================
// Input Types (DTOs)
// ============================================================================

/**
 * Input for creating a report template
 */
export interface CreateReportTemplateDTO {
  company_id: string
  name: string
  description?: string | null
  data_source: ReportDataSource
  is_shared?: boolean
  configuration?: ReportConfiguration
  default_format?: ReportOutputFormat
  page_orientation?: 'portrait' | 'landscape'
  include_charts?: boolean
  include_summary?: boolean
}

/**
 * Input for updating a report template
 */
export interface UpdateReportTemplateDTO {
  name?: string
  description?: string | null
  is_shared?: boolean
  configuration?: ReportConfiguration
  default_format?: ReportOutputFormat
  page_orientation?: 'portrait' | 'landscape'
  include_charts?: boolean
  include_summary?: boolean
}

/**
 * Input for adding/updating template fields
 */
export interface ReportTemplateFieldInput {
  field_name: string
  display_name: string
  field_type: ReportFieldType
  display_order: number
  column_width?: number | null
  is_visible?: boolean
  aggregation?: ReportAggregationType
  format_string?: string | null
}

/**
 * Input for adding/updating template filters
 */
export interface ReportTemplateFilterInput {
  field_name: string
  operator: ReportFilterOperator
  filter_value?: unknown
  is_relative_date?: boolean
  relative_date_value?: number | null
  relative_date_unit?: 'days' | 'weeks' | 'months' | null
  filter_group?: number
  display_order?: number
}

/**
 * Input for adding/updating template sorting
 */
export interface ReportTemplateSortingInput {
  field_name: string
  direction: ReportSortDirection
  sort_order: number
}

/**
 * Input for adding/updating template grouping
 */
export interface ReportTemplateGroupingInput {
  field_name: string
  group_order: number
  include_subtotals?: boolean
}

/**
 * Input for creating a scheduled report
 */
export interface CreateScheduledReportDTO {
  template_id: string
  company_id: string
  name: string
  description?: string | null
  frequency: ReportScheduleFrequency
  day_of_week?: number | null
  day_of_month?: number | null
  time_of_day?: string
  timezone?: string
  output_format?: ReportOutputFormat
  recipients: string[]
  email_subject?: string | null
  email_body?: string | null
  project_id?: string | null
  is_active?: boolean
}

/**
 * Input for updating a scheduled report
 */
export interface UpdateScheduledReportDTO {
  name?: string
  description?: string | null
  frequency?: ReportScheduleFrequency
  day_of_week?: number | null
  day_of_month?: number | null
  time_of_day?: string
  timezone?: string
  output_format?: ReportOutputFormat
  recipients?: string[]
  email_subject?: string | null
  email_body?: string | null
  project_id?: string | null
  is_active?: boolean
}

/**
 * Input for generating a report
 */
export interface GenerateReportDTO {
  template_id?: string
  company_id: string
  data_source: ReportDataSource
  output_format: ReportOutputFormat
  project_id?: string | null
  date_from?: string | null
  date_to?: string | null
  fields: ReportTemplateFieldInput[]
  filters?: ReportTemplateFilterInput[]
  sorting?: ReportTemplateSortingInput[]
  grouping?: ReportTemplateGroupingInput[]
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filters for querying report templates
 */
export interface ReportTemplateFilters {
  company_id?: string
  data_source?: ReportDataSource
  is_shared?: boolean
  is_system_template?: boolean
  created_by?: string
  search?: string
  include_deleted?: boolean
}

/**
 * Filters for querying scheduled reports
 */
export interface ScheduledReportFilters {
  company_id?: string
  template_id?: string
  project_id?: string
  is_active?: boolean
  frequency?: ReportScheduleFrequency
}

/**
 * Filters for querying generated reports
 */
export interface GeneratedReportFilters {
  company_id?: string
  template_id?: string
  project_id?: string
  data_source?: ReportDataSource
  generated_by?: string
  is_scheduled?: boolean
  status?: GeneratedReportStatus
  date_from?: string
  date_to?: string
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * Data source configuration for UI
 */
export interface DataSourceConfig {
  value: ReportDataSource
  label: string
  icon: string
  description: string
  color: string
}

/**
 * Data source configurations
 */
export const DATA_SOURCE_CONFIG: DataSourceConfig[] = [
  { value: 'rfis', label: 'RFIs', icon: 'HelpCircle', description: 'Requests for Information', color: 'blue' },
  { value: 'submittals', label: 'Submittals', icon: 'FileCheck', description: 'Submittal tracking', color: 'green' },
  { value: 'daily_reports', label: 'Daily Reports', icon: 'Calendar', description: 'Daily field reports', color: 'orange' },
  { value: 'change_orders', label: 'Change Orders', icon: 'RefreshCw', description: 'Contract changes', color: 'purple' },
  { value: 'payment_applications', label: 'Pay Applications', icon: 'DollarSign', description: 'Payment applications', color: 'emerald' },
  { value: 'safety_incidents', label: 'Safety Incidents', icon: 'AlertTriangle', description: 'Safety reporting', color: 'red' },
  { value: 'inspections', label: 'Inspections', icon: 'ClipboardCheck', description: 'Quality inspections', color: 'cyan' },
  { value: 'punch_list', label: 'Punch List', icon: 'CheckSquare', description: 'Punch list items', color: 'yellow' },
  { value: 'tasks', label: 'Tasks', icon: 'CheckCircle', description: 'Task tracking', color: 'indigo' },
  { value: 'meetings', label: 'Meetings', icon: 'Users', description: 'Meeting minutes', color: 'slate' },
  { value: 'documents', label: 'Documents', icon: 'File', description: 'Document library', color: 'gray' },
  { value: 'equipment', label: 'Equipment', icon: 'Truck', description: 'Equipment tracking', color: 'amber' },
  { value: 'lien_waivers', label: 'Lien Waivers', icon: 'Shield', description: 'Lien waiver tracking', color: 'teal' },
  { value: 'insurance_certificates', label: 'Insurance', icon: 'FileText', description: 'Insurance certificates', color: 'sky' },
  { value: 'toolbox_talks', label: 'Toolbox Talks', icon: 'MessageSquare', description: 'Safety meetings', color: 'rose' },
]

/**
 * Filter operator configurations
 */
export const FILTER_OPERATOR_CONFIG: { value: ReportFilterOperator; label: string; applicableTo: ReportFieldType[] }[] = [
  { value: 'equals', label: 'Equals', applicableTo: ['text', 'number', 'currency', 'date', 'datetime', 'boolean', 'status', 'user', 'project', 'company'] },
  { value: 'not_equals', label: 'Not equals', applicableTo: ['text', 'number', 'currency', 'date', 'datetime', 'boolean', 'status', 'user', 'project', 'company'] },
  { value: 'contains', label: 'Contains', applicableTo: ['text'] },
  { value: 'not_contains', label: 'Does not contain', applicableTo: ['text'] },
  { value: 'starts_with', label: 'Starts with', applicableTo: ['text'] },
  { value: 'ends_with', label: 'Ends with', applicableTo: ['text'] },
  { value: 'greater_than', label: 'Greater than', applicableTo: ['number', 'currency', 'date', 'datetime'] },
  { value: 'less_than', label: 'Less than', applicableTo: ['number', 'currency', 'date', 'datetime'] },
  { value: 'greater_or_equal', label: 'Greater or equal', applicableTo: ['number', 'currency', 'date', 'datetime'] },
  { value: 'less_or_equal', label: 'Less or equal', applicableTo: ['number', 'currency', 'date', 'datetime'] },
  { value: 'between', label: 'Between', applicableTo: ['number', 'currency', 'date', 'datetime'] },
  { value: 'in', label: 'Is one of', applicableTo: ['text', 'status', 'user', 'project', 'company'] },
  { value: 'not_in', label: 'Is not one of', applicableTo: ['text', 'status', 'user', 'project', 'company'] },
  { value: 'is_null', label: 'Is empty', applicableTo: ['text', 'number', 'currency', 'date', 'datetime', 'user', 'project', 'company'] },
  { value: 'is_not_null', label: 'Is not empty', applicableTo: ['text', 'number', 'currency', 'date', 'datetime', 'user', 'project', 'company'] },
]

/**
 * Schedule frequency configurations
 */
export const SCHEDULE_FREQUENCY_CONFIG: { value: ReportScheduleFrequency; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Run every day' },
  { value: 'weekly', label: 'Weekly', description: 'Run once per week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Run every two weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Run once per month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Run every three months' },
]

/**
 * Output format configurations
 */
export const OUTPUT_FORMAT_CONFIG: { value: ReportOutputFormat; label: string; icon: string; mimeType: string }[] = [
  { value: 'pdf', label: 'PDF', icon: 'FileText', mimeType: 'application/pdf' },
  { value: 'excel', label: 'Excel', icon: 'Table', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { value: 'csv', label: 'CSV', icon: 'FileSpreadsheet', mimeType: 'text/csv' },
]

/**
 * Aggregation type configurations
 */
export const AGGREGATION_CONFIG: { value: ReportAggregationType; label: string; applicableTo: ReportFieldType[] }[] = [
  { value: 'none', label: 'None', applicableTo: ['text', 'number', 'currency', 'date', 'datetime', 'boolean', 'status', 'user', 'project', 'company'] },
  { value: 'sum', label: 'Sum', applicableTo: ['number', 'currency'] },
  { value: 'average', label: 'Average', applicableTo: ['number', 'currency'] },
  { value: 'count', label: 'Count', applicableTo: ['text', 'number', 'currency', 'date', 'datetime', 'boolean', 'status', 'user', 'project', 'company'] },
  { value: 'min', label: 'Minimum', applicableTo: ['number', 'currency', 'date', 'datetime'] },
  { value: 'max', label: 'Maximum', applicableTo: ['number', 'currency', 'date', 'datetime'] },
]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get data source configuration by value
 */
export function getDataSourceConfig(source: ReportDataSource): DataSourceConfig | undefined {
  return DATA_SOURCE_CONFIG.find(c => c.value === source)
}

/**
 * Get data source label
 */
export function getDataSourceLabel(source: ReportDataSource): string {
  return getDataSourceConfig(source)?.label || source
}

/**
 * Get filter operators applicable to a field type
 */
export function getApplicableFilterOperators(fieldType: ReportFieldType): typeof FILTER_OPERATOR_CONFIG {
  return FILTER_OPERATOR_CONFIG.filter(op => op.applicableTo.includes(fieldType))
}

/**
 * Get aggregation options applicable to a field type
 */
export function getApplicableAggregations(fieldType: ReportFieldType): typeof AGGREGATION_CONFIG {
  return AGGREGATION_CONFIG.filter(agg => agg.applicableTo.includes(fieldType))
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get schedule frequency label
 */
export function getScheduleFrequencyLabel(frequency: ReportScheduleFrequency): string {
  return SCHEDULE_FREQUENCY_CONFIG.find(f => f.value === frequency)?.label || frequency
}

/**
 * Get output format label
 */
export function getOutputFormatLabel(format: ReportOutputFormat): string {
  return OUTPUT_FORMAT_CONFIG.find(f => f.value === format)?.label || format
}

/**
 * Get day of week label
 */
export function getDayOfWeekLabel(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[day] || ''
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generate default template name
 */
export function generateDefaultTemplateName(dataSource: ReportDataSource): string {
  const label = getDataSourceLabel(dataSource)
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${label} Report - ${date}`
}

/**
 * Alias for ReportFieldDefinition for backwards compatibility
 */
export type FieldDefinition = ReportFieldDefinition
