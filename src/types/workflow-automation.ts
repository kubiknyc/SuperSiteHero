/**
 * Workflow Automation Types
 * Phase 5: Field Workflow Automation
 */

// =============================================
// Escalation Rule Types
// =============================================

export type EscalationSourceType =
  | 'inspection'
  | 'checklist'
  | 'safety_observation'
  | 'punch_item'
  | 'rfi'
  | 'submittal'
  | 'task'
  | 'equipment_inspection';

export type EscalationActionType =
  | 'create_punch_item'
  | 'create_task'
  | 'send_notification'
  | 'create_rfi'
  | 'assign_user'
  | 'change_status'
  | 'create_inspection';

export type EscalationEventStatus = 'pending' | 'executed' | 'failed' | 'skipped';

export type ConditionOperator =
  | 'equals'
  | 'eq'
  | 'not_equals'
  | 'neq'
  | 'greater_than'
  | 'gt'
  | 'greater_or_equal'
  | 'gte'
  | 'less_than'
  | 'lt'
  | 'less_or_equal'
  | 'lte'
  | 'contains'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null';

// Simple condition
export interface SimpleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

// Complex condition with AND/OR
export interface ComplexCondition {
  and?: TriggerCondition[];
  or?: TriggerCondition[];
}

export type TriggerCondition = SimpleCondition | ComplexCondition;

// Action configurations for different action types
export interface CreatePunchItemActionConfig {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  trade?: string;
  assignee_type?: 'project_manager' | 'inspector' | 'specific_user';
  assignee_user_id?: string;
  title_template?: string;
  description_template?: string;
  due_days?: number;
}

export interface CreateTaskActionConfig {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assignee_type?: 'project_manager' | 'inspector' | 'specific_user';
  assignee_user_id?: string;
  title_template?: string;
  description_template?: string;
  due_days?: number;
}

export interface SendNotificationActionConfig {
  recipients: string[]; // Can be 'role:project_manager', 'role:admin', or user IDs
  template?: string;
  subject_template?: string;
  body_template?: string;
  channels?: ('email' | 'in_app' | 'push')[];
}

export interface ChangeStatusActionConfig {
  new_status: string;
}

export interface AssignUserActionConfig {
  assignee_type: 'project_manager' | 'inspector' | 'specific_user';
  assignee_user_id?: string;
}

export type ActionConfig =
  | CreatePunchItemActionConfig
  | CreateTaskActionConfig
  | SendNotificationActionConfig
  | ChangeStatusActionConfig
  | AssignUserActionConfig;

/**
 * Escalation Rule - Database schema
 */
export interface EscalationRule {
  id: string;
  project_id: string | null;
  company_id: string | null;
  name: string;
  description: string | null;
  source_type: EscalationSourceType;
  trigger_condition: TriggerCondition;
  action_type: EscalationActionType;
  action_config: ActionConfig;
  is_active: boolean;
  priority: number;
  execution_delay_minutes: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Escalation Event - Database schema
 */
export interface EscalationEvent {
  id: string;
  rule_id: string | null;
  source_type: string;
  source_id: string;
  source_data: Record<string, unknown> | null;
  result_type: string | null;
  result_id: string | null;
  status: EscalationEventStatus;
  error_message: string | null;
  triggered_at: string;
  scheduled_for: string | null;
  executed_at: string | null;
  project_id: string | null;
  triggered_by: string | null;
  created_at: string;
}

// DTOs
export interface CreateEscalationRuleInput {
  project_id?: string | null;
  company_id?: string | null;
  name: string;
  description?: string;
  source_type: EscalationSourceType;
  trigger_condition: TriggerCondition;
  action_type: EscalationActionType;
  action_config: ActionConfig;
  is_active?: boolean;
  priority?: number;
  execution_delay_minutes?: number;
}

export interface UpdateEscalationRuleInput {
  name?: string;
  description?: string;
  trigger_condition?: TriggerCondition;
  action_type?: EscalationActionType;
  action_config?: ActionConfig;
  is_active?: boolean;
  priority?: number;
  execution_delay_minutes?: number;
}

export interface EscalationEventFilters {
  project_id?: string;
  rule_id?: string;
  source_type?: EscalationSourceType;
  source_id?: string;
  status?: EscalationEventStatus;
  from_date?: string;
  to_date?: string;
}

// =============================================
// Equipment Maintenance Schedule Types
// =============================================

export type MaintenanceAlertType = 'upcoming' | 'due' | 'overdue' | 'critical';

/**
 * Equipment Maintenance Schedule - Database schema
 */
export interface EquipmentMaintenanceSchedule {
  id: string;
  equipment_id: string;
  maintenance_type: string;
  description: string | null;
  frequency_hours: number | null;
  frequency_days: number | null;
  last_performed_at: string | null;
  last_performed_hours: number | null;
  next_due_at: string | null;
  next_due_hours: number | null;
  block_usage_when_overdue: boolean;
  warning_threshold_hours: number;
  warning_threshold_days: number;
  default_assignee_id: string | null;
  service_provider: string | null;
  notify_on_due: boolean;
  notify_on_overdue: boolean;
  notification_recipients: string[] | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Equipment Maintenance Alert - Database schema
 */
export interface EquipmentMaintenanceAlert {
  id: string;
  equipment_id: string;
  schedule_id: string | null;
  alert_type: MaintenanceAlertType;
  message: string | null;
  triggered_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  dismissed_by: string | null;
  dismissed_at: string | null;
  dismiss_until: string | null;
  resolved_at: string | null;
  resolved_by_maintenance_id: string | null;
  created_at: string;
}

// Extended types with relations
export interface EquipmentMaintenanceScheduleWithDetails extends EquipmentMaintenanceSchedule {
  equipment?: {
    id: string;
    equipment_number: string;
    name: string;
    current_hours: number;
  };
  default_assignee?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface EquipmentMaintenanceAlertWithDetails extends EquipmentMaintenanceAlert {
  equipment?: {
    id: string;
    equipment_number: string;
    name: string;
  };
  schedule?: {
    id: string;
    maintenance_type: string;
  };
  acknowledged_by_user?: {
    id: string;
    full_name: string;
  };
}

// DTOs
export interface CreateMaintenanceScheduleInput {
  equipment_id: string;
  maintenance_type: string;
  description?: string;
  frequency_hours?: number;
  frequency_days?: number;
  block_usage_when_overdue?: boolean;
  warning_threshold_hours?: number;
  warning_threshold_days?: number;
  default_assignee_id?: string;
  service_provider?: string;
  notify_on_due?: boolean;
  notify_on_overdue?: boolean;
  notification_recipients?: string[];
}

export interface UpdateMaintenanceScheduleInput {
  maintenance_type?: string;
  description?: string;
  frequency_hours?: number | null;
  frequency_days?: number | null;
  block_usage_when_overdue?: boolean;
  warning_threshold_hours?: number;
  warning_threshold_days?: number;
  default_assignee_id?: string | null;
  service_provider?: string | null;
  notify_on_due?: boolean;
  notify_on_overdue?: boolean;
  notification_recipients?: string[];
  is_active?: boolean;
}

export interface RecordMaintenanceInput {
  schedule_id: string;
  performed_at: string;
  performed_hours?: number;
  notes?: string;
}

export interface MaintenanceStatus {
  schedule_id: string;
  maintenance_type: string;
  alert_type: MaintenanceAlertType;
  is_blocked: boolean;
}

// =============================================
// Scheduled Field Report Types
// =============================================

export type FieldReportType =
  | 'daily_summary'
  | 'weekly_progress'
  | 'safety_summary'
  | 'quality_metrics'
  | 'equipment_status'
  | 'client_report'
  | 'custom';

export type ReportFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type ReportOutputFormat = 'pdf' | 'excel' | 'html';

export type ReportSection =
  | 'summary'
  | 'safety'
  | 'quality'
  | 'schedule'
  | 'photos'
  | 'weather'
  | 'manpower'
  | 'equipment'
  | 'deliveries'
  | 'visitors'
  | 'inspections'
  | 'punch_items';

export interface ReportContentConfig {
  sections: ReportSection[];
  include_charts?: boolean;
  date_range?: 'period' | 'custom';
  custom_date_from?: string;
  custom_date_to?: string;
  include_photos?: boolean;
  max_photos?: number;
  include_signatures?: boolean;
}

/**
 * Scheduled Field Report - Database schema
 */
export interface ScheduledFieldReport {
  id: string;
  project_id: string | null;
  company_id: string | null;
  name: string;
  description: string | null;
  report_type: FieldReportType;
  frequency: ReportFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  timezone: string;
  content_config: ReportContentConfig;
  distribution_list_id: string | null;
  recipient_emails: string[] | null;
  recipient_user_ids: string[] | null;
  email_subject_template: string | null;
  email_body_template: string | null;
  include_pdf_attachment: boolean;
  output_format: ReportOutputFormat;
  is_active: boolean;
  last_generated_at: string | null;
  next_scheduled_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type GeneratedReportStatus = 'generating' | 'completed' | 'failed' | 'sent';

/**
 * Generated Field Report - Database schema
 */
export interface GeneratedFieldReport {
  id: string;
  scheduled_report_id: string | null;
  project_id: string | null;
  report_name: string;
  report_type: string;
  period_start: string | null;
  period_end: string | null;
  report_data: Record<string, unknown> | null;
  file_url: string | null;
  file_size_bytes: number | null;
  recipients_sent: string[] | null;
  sent_at: string | null;
  status: GeneratedReportStatus;
  error_message: string | null;
  generated_by: string | null;
  created_at: string;
}

// Extended types with relations
export interface ScheduledFieldReportWithDetails extends ScheduledFieldReport {
  project?: {
    id: string;
    name: string;
    number: string | null;
  };
  distribution_list?: {
    id: string;
    name: string;
  };
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface GeneratedFieldReportWithDetails extends GeneratedFieldReport {
  scheduled_report?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
    number: string | null;
  };
}

// DTOs
export interface CreateScheduledFieldReportInput {
  project_id?: string;
  company_id?: string;
  name: string;
  description?: string;
  report_type: FieldReportType;
  frequency: ReportFrequency;
  day_of_week?: number;
  day_of_month?: number;
  time_of_day?: string;
  timezone?: string;
  content_config?: ReportContentConfig;
  distribution_list_id?: string;
  recipient_emails?: string[];
  recipient_user_ids?: string[];
  email_subject_template?: string;
  email_body_template?: string;
  include_pdf_attachment?: boolean;
  output_format?: ReportOutputFormat;
}

export interface UpdateScheduledFieldReportInput {
  name?: string;
  description?: string;
  report_type?: FieldReportType;
  frequency?: ReportFrequency;
  day_of_week?: number | null;
  day_of_month?: number | null;
  time_of_day?: string;
  timezone?: string;
  content_config?: ReportContentConfig;
  distribution_list_id?: string | null;
  recipient_emails?: string[];
  recipient_user_ids?: string[];
  email_subject_template?: string | null;
  email_body_template?: string | null;
  include_pdf_attachment?: boolean;
  output_format?: ReportOutputFormat;
  is_active?: boolean;
}

export interface GenerateReportInput {
  scheduled_report_id?: string;
  project_id: string;
  report_type: FieldReportType;
  period_start: string;
  period_end: string;
  content_config?: ReportContentConfig;
}

// =============================================
// Report Data Types (for compilation)
// =============================================

export interface DailySummaryData {
  date: string;
  weather: {
    high_temp: number | null;
    low_temp: number | null;
    conditions: string | null;
    precipitation: number | null;
  } | null;
  manpower: {
    total_workers: number;
    by_trade: Record<string, number>;
  };
  safety: {
    incidents_count: number;
    near_misses_count: number;
    observations_count: number;
  };
  quality: {
    inspections_passed: number;
    inspections_failed: number;
    punch_items_created: number;
    punch_items_completed: number;
  };
  schedule: {
    activities_in_progress: number;
    activities_completed: number;
    variance_days: number | null;
  };
  equipment: {
    total_hours_used: number;
    equipment_in_use: number;
  };
  photos: {
    url: string;
    caption: string | null;
    taken_at: string;
  }[];
}

export interface WeeklyProgressData {
  period_start: string;
  period_end: string;
  daily_summaries: DailySummaryData[];
  schedule_progress: {
    percent_complete: number;
    planned_percent: number;
    variance: number;
  };
  cost_progress: {
    budget: number;
    actual: number;
    variance: number;
  } | null;
  highlights: string[];
  concerns: string[];
  upcoming_milestones: {
    name: string;
    date: string;
    status: string;
  }[];
}

// =============================================
// Constants
// =============================================

export const ESCALATION_SOURCE_TYPES: { value: EscalationSourceType; label: string }[] = [
  { value: 'inspection', label: 'Inspection' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'safety_observation', label: 'Safety Observation' },
  { value: 'punch_item', label: 'Punch Item' },
  { value: 'rfi', label: 'RFI' },
  { value: 'submittal', label: 'Submittal' },
  { value: 'task', label: 'Task' },
  { value: 'equipment_inspection', label: 'Equipment Inspection' },
];

export const ESCALATION_ACTION_TYPES: { value: EscalationActionType; label: string }[] = [
  { value: 'create_punch_item', label: 'Create Punch Item' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'create_rfi', label: 'Create RFI' },
  { value: 'assign_user', label: 'Assign User' },
  { value: 'change_status', label: 'Change Status' },
  { value: 'create_inspection', label: 'Create Follow-up Inspection' },
];

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does Not Equal' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'greater_or_equal', label: 'Greater Than or Equal' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'less_or_equal', label: 'Less Than or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'in', label: 'Is One Of' },
  { value: 'not_in', label: 'Is Not One Of' },
  { value: 'is_null', label: 'Is Empty' },
  { value: 'is_not_null', label: 'Is Not Empty' },
];

export const FIELD_REPORT_TYPES: { value: FieldReportType; label: string }[] = [
  { value: 'daily_summary', label: 'Daily Summary' },
  { value: 'weekly_progress', label: 'Weekly Progress' },
  { value: 'safety_summary', label: 'Safety Summary' },
  { value: 'quality_metrics', label: 'Quality Metrics' },
  { value: 'equipment_status', label: 'Equipment Status' },
  { value: 'client_report', label: 'Client Report' },
  { value: 'custom', label: 'Custom Report' },
];

export const REPORT_FREQUENCIES: { value: ReportFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export const REPORT_SECTIONS: { value: ReportSection; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'safety', label: 'Safety' },
  { value: 'quality', label: 'Quality' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'photos', label: 'Photos' },
  { value: 'weather', label: 'Weather' },
  { value: 'manpower', label: 'Manpower' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'deliveries', label: 'Deliveries' },
  { value: 'visitors', label: 'Visitors' },
  { value: 'inspections', label: 'Inspections' },
  { value: 'punch_items', label: 'Punch Items' },
];

export const MAINTENANCE_ALERT_TYPES: { value: MaintenanceAlertType; label: string; color: string }[] = [
  { value: 'upcoming', label: 'Upcoming', color: 'blue' },
  { value: 'due', label: 'Due', color: 'yellow' },
  { value: 'overdue', label: 'Overdue', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
];

export const DAYS_OF_WEEK: { value: number; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
