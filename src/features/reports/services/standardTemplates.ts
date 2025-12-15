/**
 * Standard Report Templates Library
 *
 * Pre-built industry-standard templates for construction project reporting.
 * These templates come out-of-the-box and can be used directly or customized.
 */

import type {
  ReportDataSource,
  ReportOutputFormat,
  ReportTemplateFieldInput,
  ReportTemplateFilterInput,
  ReportTemplateSortingInput,
  ReportTemplateGroupingInput,
  ReportScheduleFrequency,
} from '@/types/report-builder'

// ============================================================================
// Types
// ============================================================================

export type TemplateCategory = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface StandardTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  data_source: ReportDataSource
  icon: string
  tags: string[]

  // Default configuration
  default_format: ReportOutputFormat
  page_orientation: 'portrait' | 'landscape'
  include_charts: boolean
  include_summary: boolean

  // Pre-configured fields, filters, sorting, grouping
  fields: ReportTemplateFieldInput[]
  filters: ReportTemplateFilterInput[]
  sorting: ReportTemplateSortingInput[]
  grouping: ReportTemplateGroupingInput[]

  // Recommended schedule
  recommended_frequency: ReportScheduleFrequency | null
  recommended_day_of_week: number | null // 0-6 for weekly
  recommended_day_of_month: number | null // 1-31 for monthly
}

// ============================================================================
// Daily Templates
// ============================================================================

const DAILY_TEMPLATES: StandardTemplate[] = [
  {
    id: 'daily-field-report-summary',
    name: 'Daily Field Report Summary',
    description: 'Comprehensive daily report with weather, workforce, equipment, and progress for each project day.',
    category: 'daily',
    data_source: 'daily_reports',
    icon: 'Calendar',
    tags: ['field', 'superintendent', 'daily', 'weather', 'workforce'],
    default_format: 'pdf',
    page_orientation: 'portrait',
    include_charts: false,
    include_summary: true,
    fields: [
      { field_name: 'report_date', display_name: 'Date', field_type: 'date', display_order: 1 },
      { field_name: 'weather_condition', display_name: 'Weather', field_type: 'text', display_order: 2 },
      { field_name: 'temperature_high', display_name: 'High Temp', field_type: 'number', display_order: 3 },
      { field_name: 'temperature_low', display_name: 'Low Temp', field_type: 'number', display_order: 4 },
      { field_name: 'total_workers', display_name: 'Total Workers', field_type: 'number', display_order: 5, aggregation: 'sum' },
      { field_name: 'total_hours', display_name: 'Total Hours', field_type: 'number', display_order: 6, aggregation: 'sum' },
      { field_name: 'work_performed', display_name: 'Work Performed', field_type: 'text', display_order: 7 },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 8 },
    ],
    filters: [
      { field_name: 'report_date', operator: 'equals', is_relative_date: true, relative_date_value: 0, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'report_date', direction: 'desc', sort_order: 1 },
    ],
    grouping: [],
    recommended_frequency: 'daily',
    recommended_day_of_week: null,
    recommended_day_of_month: null,
  },
  {
    id: 'daily-safety-summary',
    name: 'Daily Safety Summary',
    description: 'Daily safety metrics including incidents, near misses, and safety observations.',
    category: 'daily',
    data_source: 'safety_incidents',
    icon: 'Shield',
    tags: ['safety', 'incidents', 'daily', 'OSHA', 'compliance'],
    default_format: 'pdf',
    page_orientation: 'portrait',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'incident_date', display_name: 'Date', field_type: 'date', display_order: 1 },
      { field_name: 'incident_type', display_name: 'Type', field_type: 'status', display_order: 2 },
      { field_name: 'severity', display_name: 'Severity', field_type: 'status', display_order: 3 },
      { field_name: 'description', display_name: 'Description', field_type: 'text', display_order: 4 },
      { field_name: 'location', display_name: 'Location', field_type: 'text', display_order: 5 },
      { field_name: 'injured_party', display_name: 'Affected Person', field_type: 'text', display_order: 6 },
      { field_name: 'corrective_action', display_name: 'Corrective Action', field_type: 'text', display_order: 7 },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 8 },
    ],
    filters: [
      { field_name: 'incident_date', operator: 'equals', is_relative_date: true, relative_date_value: 0, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'severity', direction: 'desc', sort_order: 1 },
      { field_name: 'incident_date', direction: 'desc', sort_order: 2 },
    ],
    grouping: [
      { field_name: 'incident_type', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'daily',
    recommended_day_of_week: null,
    recommended_day_of_month: null,
  },
  {
    id: 'daily-equipment-report',
    name: 'Daily Equipment Report',
    description: 'Equipment on-site tracking with utilization hours and operator assignments.',
    category: 'daily',
    data_source: 'equipment',
    icon: 'Truck',
    tags: ['equipment', 'daily', 'utilization', 'assets'],
    default_format: 'excel',
    page_orientation: 'landscape',
    include_charts: false,
    include_summary: true,
    fields: [
      { field_name: 'equipment_name', display_name: 'Equipment', field_type: 'text', display_order: 1 },
      { field_name: 'equipment_number', display_name: 'ID Number', field_type: 'text', display_order: 2 },
      { field_name: 'category', display_name: 'Category', field_type: 'status', display_order: 3 },
      { field_name: 'operator', display_name: 'Operator', field_type: 'user', display_order: 4 },
      { field_name: 'hours_used', display_name: 'Hours', field_type: 'number', display_order: 5, aggregation: 'sum' },
      { field_name: 'fuel_used', display_name: 'Fuel (gal)', field_type: 'number', display_order: 6, aggregation: 'sum' },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 7 },
      { field_name: 'notes', display_name: 'Notes', field_type: 'text', display_order: 8 },
    ],
    filters: [],
    sorting: [
      { field_name: 'category', direction: 'asc', sort_order: 1 },
      { field_name: 'equipment_name', direction: 'asc', sort_order: 2 },
    ],
    grouping: [
      { field_name: 'category', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'daily',
    recommended_day_of_week: null,
    recommended_day_of_month: null,
  },
]

// ============================================================================
// Weekly Templates
// ============================================================================

const WEEKLY_TEMPLATES: StandardTemplate[] = [
  {
    id: 'weekly-progress-report',
    name: 'Weekly Progress Report',
    description: 'Week-over-week progress summary with completed work, upcoming milestones, and issues.',
    category: 'weekly',
    data_source: 'daily_reports',
    icon: 'TrendingUp',
    tags: ['progress', 'weekly', 'milestones', 'PM', 'executive'],
    default_format: 'pdf',
    page_orientation: 'portrait',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'report_date', display_name: 'Date', field_type: 'date', display_order: 1 },
      { field_name: 'total_workers', display_name: 'Workers', field_type: 'number', display_order: 2, aggregation: 'sum' },
      { field_name: 'total_hours', display_name: 'Total Hours', field_type: 'number', display_order: 3, aggregation: 'sum' },
      { field_name: 'work_performed', display_name: 'Work Performed', field_type: 'text', display_order: 4 },
      { field_name: 'weather_delays', display_name: 'Weather Delays', field_type: 'boolean', display_order: 5 },
      { field_name: 'progress_notes', display_name: 'Progress Notes', field_type: 'text', display_order: 6 },
    ],
    filters: [
      { field_name: 'report_date', operator: 'greater_or_equal', is_relative_date: true, relative_date_value: 7, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'report_date', direction: 'asc', sort_order: 1 },
    ],
    grouping: [],
    recommended_frequency: 'weekly',
    recommended_day_of_week: 5, // Friday
    recommended_day_of_month: null,
  },
  {
    id: 'weekly-safety-report',
    name: 'Weekly Safety Report',
    description: 'Weekly safety metrics with incident trends, toolbox talk completion, and safety observations.',
    category: 'weekly',
    data_source: 'safety_incidents',
    icon: 'AlertTriangle',
    tags: ['safety', 'weekly', 'OSHA', 'incidents', 'trends'],
    default_format: 'pdf',
    page_orientation: 'portrait',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'incident_date', display_name: 'Date', field_type: 'date', display_order: 1 },
      { field_name: 'incident_type', display_name: 'Type', field_type: 'status', display_order: 2 },
      { field_name: 'severity', display_name: 'Severity', field_type: 'status', display_order: 3 },
      { field_name: 'description', display_name: 'Description', field_type: 'text', display_order: 4 },
      { field_name: 'root_cause', display_name: 'Root Cause', field_type: 'text', display_order: 5 },
      { field_name: 'corrective_action', display_name: 'Corrective Action', field_type: 'text', display_order: 6 },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 7 },
    ],
    filters: [
      { field_name: 'incident_date', operator: 'greater_or_equal', is_relative_date: true, relative_date_value: 7, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'severity', direction: 'desc', sort_order: 1 },
      { field_name: 'incident_date', direction: 'desc', sort_order: 2 },
    ],
    grouping: [
      { field_name: 'incident_type', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'weekly',
    recommended_day_of_week: 5, // Friday
    recommended_day_of_month: null,
  },
  {
    id: 'weekly-rfi-status',
    name: 'Weekly RFI Status Report',
    description: 'RFI status tracking with aging analysis and response metrics.',
    category: 'weekly',
    data_source: 'rfis',
    icon: 'HelpCircle',
    tags: ['RFI', 'weekly', 'status', 'aging', 'response'],
    default_format: 'excel',
    page_orientation: 'landscape',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'rfi_number', display_name: 'RFI #', field_type: 'text', display_order: 1 },
      { field_name: 'subject', display_name: 'Subject', field_type: 'text', display_order: 2 },
      { field_name: 'submitted_date', display_name: 'Submitted', field_type: 'date', display_order: 3 },
      { field_name: 'due_date', display_name: 'Due Date', field_type: 'date', display_order: 4 },
      { field_name: 'assigned_to', display_name: 'Assigned To', field_type: 'user', display_order: 5 },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 6 },
      { field_name: 'days_open', display_name: 'Days Open', field_type: 'number', display_order: 7 },
      { field_name: 'priority', display_name: 'Priority', field_type: 'status', display_order: 8 },
    ],
    filters: [
      { field_name: 'status', operator: 'not_equals', filter_value: 'closed', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'due_date', direction: 'asc', sort_order: 1 },
    ],
    grouping: [
      { field_name: 'status', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'weekly',
    recommended_day_of_week: 1, // Monday
    recommended_day_of_month: null,
  },
  {
    id: 'weekly-submittal-status',
    name: 'Weekly Submittal Status',
    description: 'Submittal tracking with approval status and lead time analysis.',
    category: 'weekly',
    data_source: 'submittals',
    icon: 'FileCheck',
    tags: ['submittal', 'weekly', 'status', 'approval', 'procurement'],
    default_format: 'excel',
    page_orientation: 'landscape',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'submittal_number', display_name: 'Submittal #', field_type: 'text', display_order: 1 },
      { field_name: 'title', display_name: 'Title', field_type: 'text', display_order: 2 },
      { field_name: 'spec_section', display_name: 'Spec Section', field_type: 'text', display_order: 3 },
      { field_name: 'submitted_date', display_name: 'Submitted', field_type: 'date', display_order: 4 },
      { field_name: 'required_date', display_name: 'Required', field_type: 'date', display_order: 5 },
      { field_name: 'subcontractor', display_name: 'Subcontractor', field_type: 'company', display_order: 6 },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 7 },
      { field_name: 'reviewer', display_name: 'Reviewer', field_type: 'user', display_order: 8 },
    ],
    filters: [],
    sorting: [
      { field_name: 'required_date', direction: 'asc', sort_order: 1 },
    ],
    grouping: [
      { field_name: 'status', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'weekly',
    recommended_day_of_week: 1, // Monday
    recommended_day_of_month: null,
  },
  {
    id: 'weekly-punch-list-report',
    name: 'Weekly Punch List Report',
    description: 'Open punch items by trade with aging and completion tracking.',
    category: 'weekly',
    data_source: 'punch_list',
    icon: 'CheckSquare',
    tags: ['punch', 'weekly', 'closeout', 'trades', 'completion'],
    default_format: 'excel',
    page_orientation: 'landscape',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'item_number', display_name: 'Item #', field_type: 'text', display_order: 1 },
      { field_name: 'description', display_name: 'Description', field_type: 'text', display_order: 2 },
      { field_name: 'location', display_name: 'Location', field_type: 'text', display_order: 3 },
      { field_name: 'trade', display_name: 'Trade', field_type: 'text', display_order: 4 },
      { field_name: 'assigned_to', display_name: 'Assigned To', field_type: 'company', display_order: 5 },
      { field_name: 'created_date', display_name: 'Created', field_type: 'date', display_order: 6 },
      { field_name: 'due_date', display_name: 'Due Date', field_type: 'date', display_order: 7 },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 8 },
      { field_name: 'priority', display_name: 'Priority', field_type: 'status', display_order: 9 },
    ],
    filters: [
      { field_name: 'status', operator: 'not_equals', filter_value: 'completed', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'priority', direction: 'desc', sort_order: 1 },
      { field_name: 'due_date', direction: 'asc', sort_order: 2 },
    ],
    grouping: [
      { field_name: 'trade', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'weekly',
    recommended_day_of_week: 5, // Friday
    recommended_day_of_month: null,
  },
  {
    id: 'weekly-change-order-log',
    name: 'Weekly Change Order Log',
    description: 'Change order status and financial impact summary.',
    category: 'weekly',
    data_source: 'change_orders',
    icon: 'RefreshCw',
    tags: ['change order', 'weekly', 'financial', 'budget', 'contract'],
    default_format: 'excel',
    page_orientation: 'landscape',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'co_number', display_name: 'CO #', field_type: 'text', display_order: 1 },
      { field_name: 'title', display_name: 'Title', field_type: 'text', display_order: 2 },
      { field_name: 'submitted_date', display_name: 'Submitted', field_type: 'date', display_order: 3 },
      { field_name: 'amount', display_name: 'Amount', field_type: 'currency', display_order: 4, aggregation: 'sum' },
      { field_name: 'schedule_impact_days', display_name: 'Schedule Impact', field_type: 'number', display_order: 5, aggregation: 'sum' },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 6 },
      { field_name: 'reason', display_name: 'Reason', field_type: 'text', display_order: 7 },
    ],
    filters: [],
    sorting: [
      { field_name: 'submitted_date', direction: 'desc', sort_order: 1 },
    ],
    grouping: [
      { field_name: 'status', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'weekly',
    recommended_day_of_week: 5, // Friday
    recommended_day_of_month: null,
  },
]

// ============================================================================
// Monthly Templates
// ============================================================================

const MONTHLY_TEMPLATES: StandardTemplate[] = [
  {
    id: 'monthly-executive-summary',
    name: 'Monthly Executive Summary',
    description: 'High-level project status for executives with key metrics, milestones, and financial summary.',
    category: 'monthly',
    data_source: 'daily_reports',
    icon: 'BarChart2',
    tags: ['executive', 'monthly', 'summary', 'KPI', 'dashboard'],
    default_format: 'pdf',
    page_orientation: 'portrait',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'report_date', display_name: 'Week', field_type: 'date', display_order: 1 },
      { field_name: 'total_workers', display_name: 'Avg Workers', field_type: 'number', display_order: 2, aggregation: 'average' },
      { field_name: 'total_hours', display_name: 'Total Hours', field_type: 'number', display_order: 3, aggregation: 'sum' },
      { field_name: 'weather_delays', display_name: 'Weather Delays', field_type: 'number', display_order: 4, aggregation: 'count' },
      { field_name: 'completion_percent', display_name: 'Completion %', field_type: 'number', display_order: 5, aggregation: 'max' },
    ],
    filters: [
      { field_name: 'report_date', operator: 'greater_or_equal', is_relative_date: true, relative_date_value: 30, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'report_date', direction: 'asc', sort_order: 1 },
    ],
    grouping: [],
    recommended_frequency: 'monthly',
    recommended_day_of_week: null,
    recommended_day_of_month: 1, // First of month
  },
  {
    id: 'monthly-safety-analysis',
    name: 'Monthly Safety Analysis',
    description: 'Comprehensive monthly safety analysis with trends, TRIR calculations, and corrective actions.',
    category: 'monthly',
    data_source: 'safety_incidents',
    icon: 'Activity',
    tags: ['safety', 'monthly', 'OSHA', 'TRIR', 'analysis', 'trends'],
    default_format: 'pdf',
    page_orientation: 'portrait',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'incident_date', display_name: 'Date', field_type: 'date', display_order: 1 },
      { field_name: 'incident_type', display_name: 'Type', field_type: 'status', display_order: 2 },
      { field_name: 'severity', display_name: 'Severity', field_type: 'status', display_order: 3 },
      { field_name: 'description', display_name: 'Description', field_type: 'text', display_order: 4 },
      { field_name: 'root_cause', display_name: 'Root Cause', field_type: 'text', display_order: 5 },
      { field_name: 'corrective_action', display_name: 'Corrective Action', field_type: 'text', display_order: 6 },
      { field_name: 'days_lost', display_name: 'Days Lost', field_type: 'number', display_order: 7, aggregation: 'sum' },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 8 },
    ],
    filters: [
      { field_name: 'incident_date', operator: 'greater_or_equal', is_relative_date: true, relative_date_value: 30, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'incident_date', direction: 'desc', sort_order: 1 },
    ],
    grouping: [
      { field_name: 'incident_type', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'monthly',
    recommended_day_of_week: null,
    recommended_day_of_month: 1, // First of month
  },
  {
    id: 'monthly-financial-report',
    name: 'Monthly Financial Report',
    description: 'Budget vs. actual analysis with cost breakdown by category and trend analysis.',
    category: 'monthly',
    data_source: 'payment_applications',
    icon: 'DollarSign',
    tags: ['financial', 'monthly', 'budget', 'cost', 'payment', 'billing'],
    default_format: 'excel',
    page_orientation: 'landscape',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'pay_app_number', display_name: 'Pay App #', field_type: 'text', display_order: 1 },
      { field_name: 'billing_period_end', display_name: 'Period End', field_type: 'date', display_order: 2 },
      { field_name: 'scheduled_value', display_name: 'Scheduled Value', field_type: 'currency', display_order: 3, aggregation: 'sum' },
      { field_name: 'work_completed', display_name: 'Work Completed', field_type: 'currency', display_order: 4, aggregation: 'sum' },
      { field_name: 'stored_materials', display_name: 'Stored Materials', field_type: 'currency', display_order: 5, aggregation: 'sum' },
      { field_name: 'total_earned', display_name: 'Total Earned', field_type: 'currency', display_order: 6, aggregation: 'sum' },
      { field_name: 'retainage', display_name: 'Retainage', field_type: 'currency', display_order: 7, aggregation: 'sum' },
      { field_name: 'current_payment_due', display_name: 'Current Due', field_type: 'currency', display_order: 8, aggregation: 'sum' },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 9 },
    ],
    filters: [
      { field_name: 'billing_period_end', operator: 'greater_or_equal', is_relative_date: true, relative_date_value: 30, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'billing_period_end', direction: 'desc', sort_order: 1 },
    ],
    grouping: [],
    recommended_frequency: 'monthly',
    recommended_day_of_week: null,
    recommended_day_of_month: 25, // Near end of month
  },
  {
    id: 'monthly-inspection-report',
    name: 'Monthly Inspection Report',
    description: 'Monthly inspection summary with pass/fail rates and reinspection tracking.',
    category: 'monthly',
    data_source: 'inspections',
    icon: 'ClipboardCheck',
    tags: ['inspection', 'monthly', 'quality', 'compliance', 'permits'],
    default_format: 'pdf',
    page_orientation: 'portrait',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'inspection_date', display_name: 'Date', field_type: 'date', display_order: 1 },
      { field_name: 'inspection_type', display_name: 'Type', field_type: 'status', display_order: 2 },
      { field_name: 'inspector', display_name: 'Inspector', field_type: 'text', display_order: 3 },
      { field_name: 'location', display_name: 'Location', field_type: 'text', display_order: 4 },
      { field_name: 'result', display_name: 'Result', field_type: 'status', display_order: 5 },
      { field_name: 'deficiencies', display_name: 'Deficiencies', field_type: 'text', display_order: 6 },
      { field_name: 'reinspection_required', display_name: 'Reinspection', field_type: 'boolean', display_order: 7 },
    ],
    filters: [
      { field_name: 'inspection_date', operator: 'greater_or_equal', is_relative_date: true, relative_date_value: 30, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'inspection_date', direction: 'desc', sort_order: 1 },
    ],
    grouping: [
      { field_name: 'inspection_type', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'monthly',
    recommended_day_of_week: null,
    recommended_day_of_month: 1,
  },
  {
    id: 'monthly-document-log',
    name: 'Monthly Document Log',
    description: 'Document submission and approval tracking for the month.',
    category: 'monthly',
    data_source: 'documents',
    icon: 'FileText',
    tags: ['documents', 'monthly', 'tracking', 'submittals', 'records'],
    default_format: 'excel',
    page_orientation: 'landscape',
    include_charts: false,
    include_summary: true,
    fields: [
      { field_name: 'document_number', display_name: 'Doc #', field_type: 'text', display_order: 1 },
      { field_name: 'title', display_name: 'Title', field_type: 'text', display_order: 2 },
      { field_name: 'document_type', display_name: 'Type', field_type: 'status', display_order: 3 },
      { field_name: 'uploaded_date', display_name: 'Uploaded', field_type: 'date', display_order: 4 },
      { field_name: 'uploaded_by', display_name: 'Uploaded By', field_type: 'user', display_order: 5 },
      { field_name: 'revision', display_name: 'Revision', field_type: 'text', display_order: 6 },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 7 },
    ],
    filters: [
      { field_name: 'uploaded_date', operator: 'greater_or_equal', is_relative_date: true, relative_date_value: 30, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'uploaded_date', direction: 'desc', sort_order: 1 },
    ],
    grouping: [
      { field_name: 'document_type', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'monthly',
    recommended_day_of_week: null,
    recommended_day_of_month: 1,
  },
  {
    id: 'monthly-meeting-minutes-log',
    name: 'Monthly Meeting Minutes Log',
    description: 'All meeting minutes and action items for the month.',
    category: 'monthly',
    data_source: 'meetings',
    icon: 'Users',
    tags: ['meetings', 'monthly', 'minutes', 'action items', 'OAC'],
    default_format: 'pdf',
    page_orientation: 'portrait',
    include_charts: false,
    include_summary: true,
    fields: [
      { field_name: 'meeting_date', display_name: 'Date', field_type: 'date', display_order: 1 },
      { field_name: 'meeting_type', display_name: 'Type', field_type: 'status', display_order: 2 },
      { field_name: 'title', display_name: 'Title', field_type: 'text', display_order: 3 },
      { field_name: 'attendees_count', display_name: 'Attendees', field_type: 'number', display_order: 4 },
      { field_name: 'action_items_count', display_name: 'Action Items', field_type: 'number', display_order: 5, aggregation: 'sum' },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 6 },
    ],
    filters: [
      { field_name: 'meeting_date', operator: 'greater_or_equal', is_relative_date: true, relative_date_value: 30, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'meeting_date', direction: 'desc', sort_order: 1 },
    ],
    grouping: [
      { field_name: 'meeting_type', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'monthly',
    recommended_day_of_week: null,
    recommended_day_of_month: 1,
  },
  {
    id: 'monthly-lien-waiver-status',
    name: 'Monthly Lien Waiver Status',
    description: 'Lien waiver collection status by subcontractor for the month.',
    category: 'monthly',
    data_source: 'lien_waivers',
    icon: 'Shield',
    tags: ['lien waiver', 'monthly', 'subcontractor', 'payment', 'closeout'],
    default_format: 'excel',
    page_orientation: 'landscape',
    include_charts: true,
    include_summary: true,
    fields: [
      { field_name: 'waiver_number', display_name: 'Waiver #', field_type: 'text', display_order: 1 },
      { field_name: 'subcontractor', display_name: 'Subcontractor', field_type: 'company', display_order: 2 },
      { field_name: 'waiver_type', display_name: 'Type', field_type: 'status', display_order: 3 },
      { field_name: 'amount', display_name: 'Amount', field_type: 'currency', display_order: 4, aggregation: 'sum' },
      { field_name: 'through_date', display_name: 'Through Date', field_type: 'date', display_order: 5 },
      { field_name: 'received_date', display_name: 'Received', field_type: 'date', display_order: 6 },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 7 },
    ],
    filters: [
      { field_name: 'through_date', operator: 'greater_or_equal', is_relative_date: true, relative_date_value: 30, relative_date_unit: 'days', filter_group: 1 },
    ],
    sorting: [
      { field_name: 'subcontractor', direction: 'asc', sort_order: 1 },
    ],
    grouping: [
      { field_name: 'status', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'monthly',
    recommended_day_of_week: null,
    recommended_day_of_month: 25,
  },
  {
    id: 'monthly-insurance-tracker',
    name: 'Monthly Insurance Certificate Tracker',
    description: 'Insurance certificate expiration tracking and compliance status.',
    category: 'monthly',
    data_source: 'insurance_certificates',
    icon: 'FileText',
    tags: ['insurance', 'monthly', 'compliance', 'certificates', 'expiration'],
    default_format: 'excel',
    page_orientation: 'landscape',
    include_charts: false,
    include_summary: true,
    fields: [
      { field_name: 'certificate_holder', display_name: 'Company', field_type: 'company', display_order: 1 },
      { field_name: 'insurance_type', display_name: 'Type', field_type: 'status', display_order: 2 },
      { field_name: 'policy_number', display_name: 'Policy #', field_type: 'text', display_order: 3 },
      { field_name: 'coverage_amount', display_name: 'Coverage', field_type: 'currency', display_order: 4 },
      { field_name: 'effective_date', display_name: 'Effective', field_type: 'date', display_order: 5 },
      { field_name: 'expiration_date', display_name: 'Expires', field_type: 'date', display_order: 6 },
      { field_name: 'days_to_expiration', display_name: 'Days Left', field_type: 'number', display_order: 7 },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 8 },
    ],
    filters: [],
    sorting: [
      { field_name: 'expiration_date', direction: 'asc', sort_order: 1 },
    ],
    grouping: [
      { field_name: 'status', group_order: 1, include_subtotals: true },
    ],
    recommended_frequency: 'monthly',
    recommended_day_of_week: null,
    recommended_day_of_month: 1,
  },
]

// ============================================================================
// All Templates Combined
// ============================================================================

export const STANDARD_TEMPLATES: StandardTemplate[] = [
  ...DAILY_TEMPLATES,
  ...WEEKLY_TEMPLATES,
  ...MONTHLY_TEMPLATES,
]

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get all standard templates
 */
export function getAllStandardTemplates(): StandardTemplate[] {
  return STANDARD_TEMPLATES
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): StandardTemplate[] {
  return STANDARD_TEMPLATES.filter(t => t.category === category)
}

/**
 * Get templates by data source
 */
export function getTemplatesByDataSource(dataSource: ReportDataSource): StandardTemplate[] {
  return STANDARD_TEMPLATES.filter(t => t.data_source === dataSource)
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): StandardTemplate | undefined {
  return STANDARD_TEMPLATES.find(t => t.id === id)
}

/**
 * Search templates by name or tags
 */
export function searchTemplates(query: string): StandardTemplate[] {
  const lowerQuery = query.toLowerCase()
  return STANDARD_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Get template count by category
 */
export function getTemplateCounts(): Record<TemplateCategory, number> {
  return {
    daily: DAILY_TEMPLATES.length,
    weekly: WEEKLY_TEMPLATES.length,
    monthly: MONTHLY_TEMPLATES.length,
    custom: 0, // Custom templates come from user-created ones
  }
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: TemplateCategory): { label: string; description: string; icon: string } {
  const info: Record<TemplateCategory, { label: string; description: string; icon: string }> = {
    daily: { label: 'Daily', description: 'Reports for daily field operations', icon: 'Calendar' },
    weekly: { label: 'Weekly', description: 'Weekly summary and status reports', icon: 'CalendarDays' },
    monthly: { label: 'Monthly', description: 'Monthly analysis and executive reports', icon: 'CalendarRange' },
    custom: { label: 'Custom', description: 'Your custom report templates', icon: 'Settings' },
  }
  return info[category]
}

/**
 * Get all unique tags from templates
 */
export function getAllTags(): string[] {
  const tagSet = new Set<string>()
  STANDARD_TEMPLATES.forEach(t => t.tags.forEach(tag => tagSet.add(tag)))
  return Array.from(tagSet).sort()
}

/**
 * Filter templates by multiple tags (AND logic)
 */
export function filterByTags(tags: string[]): StandardTemplate[] {
  if (tags.length === 0) {return STANDARD_TEMPLATES}
  return STANDARD_TEMPLATES.filter(t =>
    tags.every(tag => t.tags.includes(tag))
  )
}
