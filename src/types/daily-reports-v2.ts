/**
 * Daily Reports V2 Types
 * Complete redesign for 10/10 construction industry compliance
 */

// =============================================
// ENUMS
// =============================================

export type ShiftType = 'regular' | 'overtime' | 'double_time' | 'weekend';

export type DelayType =
  | 'owner'
  | 'contractor'
  | 'subcontractor'
  | 'weather'
  | 'material'
  | 'inspection'
  | 'permit'
  | 'design'
  | 'unforeseen'
  | 'labor'
  | 'equipment'
  | 'other';

export type DelayCategory =
  | 'excusable_compensable'
  | 'excusable_non_compensable'
  | 'non_excusable';

export type IncidentType = 'near_miss' | 'first_aid' | 'recordable' | 'lost_time' | 'fatality';

export type IncidentCategory =
  | 'fall'
  | 'struck_by'
  | 'caught_in'
  | 'electrical'
  | 'heat_stress'
  | 'chemical'
  | 'ergonomic'
  | 'vehicle'
  | 'other';

export type InspectionCategory = 'building_official' | 'owner' | 'third_party' | 'internal';

export type InspectionResult =
  | 'pass'
  | 'fail'
  | 'conditional'
  | 'scheduled'
  | 'cancelled'
  | 'rescheduled';

export type ReportStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'locked'
  | 'voided'; // For cancelled reports with audit trail

export type FormMode = 'quick' | 'detailed';

export type ScheduleStatus = 'on_schedule' | 'ahead' | 'behind';

export type WorkforceEntryType = 'company_crew' | 'individual';

export type EquipmentOwnerType = 'owned' | 'rented' | 'subcontractor';

export type PhotoCategory =
  | 'progress'
  | 'safety'
  | 'quality'
  | 'delivery'
  | 'weather'
  | 'issue'
  | 'inspection'
  | 'general';

export type DeliveryInspectionStatus =
  | 'pending_inspection'
  | 'accepted'
  | 'rejected'
  | 'partial';

export type CompletionStatus = 'pending' | 'in_progress' | 'completed';

// Employee status for OSHA 300 log scope determination
export type EmployeeStatus = 'direct_employee' | 'contractor' | 'temp_worker' | 'visitor';

// =============================================
// BASE INTERFACES
// =============================================

export interface DailyReportV2 {
  id: string;
  project_id: string;
  report_date: string;
  report_number?: string;
  reporter_id: string;
  reviewer_id?: string;

  // Shift/Time tracking
  shift_start_time?: string;
  shift_end_time?: string;
  shift_type: ShiftType;
  total_hours?: number;

  // Weather
  weather_condition?: string;
  temperature_high?: number;
  temperature_low?: number;
  precipitation?: number;
  wind_speed?: number;
  wind_direction?: string;
  humidity_percentage?: number;
  weather_source?: 'api' | 'manual';
  weather_fetched_at?: string;
  weather_delays?: boolean;
  weather_delay_hours?: number;
  weather_delay_notes?: string;

  // Work narrative
  work_summary?: string;
  work_completed?: string;
  work_planned_tomorrow?: string;
  production_data?: Record<string, unknown>;

  // Issues
  issues?: string;
  observations?: string;
  comments?: string;

  // Progress tracking
  overall_progress_percentage?: number;
  schedule_status?: ScheduleStatus;
  schedule_variance_days?: number;

  // Signatures
  submitted_by_signature?: string;
  submitted_by_name?: string;
  submitted_at?: string;
  approved_by_signature?: string;
  approved_by_name?: string;
  approved_at?: string;
  approved_by?: string;
  approval_comments?: string;
  rejection_reason?: string;
  locked_at?: string;

  // Void metadata (P0 audit trail)
  void_reason?: string;
  voided_at?: string;
  voided_by?: string;

  // Status
  status: ReportStatus;
  mode: FormMode;

  // PDF
  pdf_url?: string;
  pdf_generated_at?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  deleted_at?: string;

  // Aggregated counts (computed)
  total_workers?: number;

  // Relations (when fetched with joins)
  project?: {
    id: string;
    name: string;
  };
  workforce?: WorkforceEntryV2[];
  equipment?: EquipmentEntryV2[];
  delays?: DelayEntry[];
  safety_incidents?: SafetyIncident[];
  inspections?: InspectionEntry[];
  tm_work?: TMWorkEntry[];
  progress?: ProgressEntry[];
  deliveries?: DeliveryEntryV2[];
  visitors?: VisitorEntryV2[];
  photos?: PhotoEntryV2[];
}

// =============================================
// WORKFORCE
// =============================================

export interface WorkforceEntryV2 {
  id: string;
  daily_report_id: string;
  entry_type: WorkforceEntryType;
  subcontractor_id?: string;

  // Company crew fields
  company_name?: string;
  team_name?: string;
  foreman_name?: string;
  worker_count?: number;
  apprentice_count?: number;

  // Individual fields
  worker_name?: string;
  worker_id?: string;

  // Common fields
  trade?: string;
  activity?: string;

  // Location/Cost tracking
  work_area?: string;
  cost_code?: string;
  phase_code?: string;

  // Time tracking
  start_time?: string;
  end_time?: string;
  hours_worked?: number;
  hours_regular?: number;
  hours_overtime?: number;
  hours_double_time?: number;
  break_duration_minutes?: number;

  // Progress
  work_completed_percentage?: number;

  // Metadata
  created_at: string;
}

// =============================================
// EQUIPMENT
// =============================================

export interface EquipmentEntryV2 {
  id: string;
  daily_report_id: string;
  equipment_type: string;
  equipment_id?: string;
  equipment_description?: string;
  quantity: number;
  owner_type: EquipmentOwnerType;
  owner?: string;
  rental_company?: string;

  // Usage tracking
  hours_used?: number;
  hours_idle?: number;
  hours_breakdown?: number;
  fuel_used?: number;

  // Location/Cost
  work_area?: string;
  cost_code?: string;
  operator_name?: string;
  notes?: string;

  // Metadata
  created_at: string;
}

// =============================================
// DELAYS (Critical for claims)
// =============================================

export interface DelayEntry {
  id: string;
  daily_report_id: string;

  // Classification
  delay_type: DelayType;
  delay_category?: DelayCategory;

  // Details
  description: string;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  duration_days?: number;

  // Impact
  affected_areas?: string[];
  affected_trades?: string[];
  affected_activities?: string;
  schedule_impact_days?: number;
  cost_impact_estimate?: number;

  // Responsibility
  responsible_party?: string;
  responsible_company?: string;

  // Notifications
  notified_parties?: string[];
  notification_method?: string;
  notification_date?: string;

  // Links
  rfi_id?: string;
  change_order_id?: string;
  supporting_photo_ids?: string[];

  // P2 Enhancement: Concurrent delays for claims apportionment
  concurrent_delays?: boolean; // Multiple parties causing delay simultaneously
  owner_directive_reference?: string; // Reference to owner directive (email, letter)

  // Metadata
  created_at: string;
  updated_at: string;
}

// =============================================
// SAFETY INCIDENTS
// =============================================

export interface SafetyIncident {
  id: string;
  daily_report_id: string;

  // Classification
  incident_type: IncidentType;
  incident_category?: string;
  osha_reportable: boolean;
  osha_case_number?: string;

  // OSHA Compliance Fields (P1 Enhancement)
  privacy_case?: boolean; // OSHA allows name redaction for certain injuries
  days_away_from_work?: number; // Required for DART rate calculation
  days_on_restricted_duty?: number; // Required for DART rate calculation
  date_of_death?: string; // Required for fatalities (OSHA 301)
  employee_status?: EmployeeStatus; // Determines OSHA 300 log scope

  // Fatality/Hospitalization Tracking (P0 OSHA Compliance)
  hospitalized?: boolean; // Whether injury resulted in hospitalization
  hospitalization_count?: number; // Number hospitalized (24-hour reporting if 3+)
  amputation?: boolean; // Whether injury involved amputation (24-hour reporting)
  osha_notification_timestamp?: string; // When OSHA was notified
  osha_notified_by?: string; // Who notified OSHA
  osha_notification_method?: 'phone' | 'online' | 'in_person'; // How OSHA was notified

  // Details
  incident_time?: string;
  incident_location?: string;
  description: string;
  immediate_cause?: string;
  root_cause?: string;

  // Injured party
  injured_party_name?: string;
  injured_party_company?: string;
  injured_party_trade?: string;
  injury_type?: string;
  body_part_affected?: string;
  treatment_provided?: string;
  medical_facility?: string;
  returned_to_work?: boolean;
  return_date?: string;

  // Corrective actions
  immediate_actions?: string;
  corrective_actions?: string;
  preventive_measures?: string;
  responsible_party?: string;
  completion_due_date?: string;
  completion_status: CompletionStatus;

  // Notifications
  reported_to?: string[];
  reported_by?: string;
  reported_at?: string;
  client_notified: boolean;
  insurance_notified: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

// =============================================
// INSPECTIONS
// =============================================

export interface InspectionEntry {
  id: string;
  daily_report_id: string;

  // Info
  inspection_type: string;
  inspection_category?: InspectionCategory;
  inspector_name?: string;
  inspector_company?: string;
  inspection_time?: string;

  // Results
  result?: InspectionResult;
  pass_with_conditions?: string;
  deficiencies_noted?: string;
  corrective_actions_required?: string;
  reinspection_required: boolean;
  reinspection_date?: string;

  // Permit
  permit_number?: string;
  permit_type?: string;

  // Notes
  notes?: string;
  supporting_photo_ids?: string[];

  // Metadata
  created_at: string;
  updated_at: string;
}

// =============================================
// T&M WORK
// =============================================

export interface LaborEntry {
  trade: string;
  hours: number;
  rate?: number;
  cost?: number;
}

export interface MaterialEntry {
  item: string;
  quantity: number;
  unit: string;
  unit_cost?: number;
  total?: number;
}

export interface EquipmentUsageEntry {
  type: string;
  hours: number;
  rate?: number;
  cost?: number;
}

export interface TMWorkEntry {
  id: string;
  daily_report_id: string;

  // Reference
  work_order_number?: string;
  change_order_id?: string;
  description: string;

  // Labor
  labor_entries: LaborEntry[];
  total_labor_hours?: number;
  total_labor_cost?: number;

  // Materials
  materials_used: MaterialEntry[];
  total_materials_cost?: number;

  // Equipment
  equipment_used: EquipmentUsageEntry[];
  total_equipment_cost?: number;

  // Total
  total_cost?: number;

  // Authorization
  authorized_by?: string;
  authorization_signature?: string;
  authorization_date?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

// =============================================
// PROGRESS TRACKING
// =============================================

export interface ProgressEntry {
  id: string;
  daily_report_id: string;

  // Activity
  activity_id?: string;
  activity_name: string;
  cost_code?: string;
  work_area?: string;

  // Schedule
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;

  // Progress
  planned_percentage_today?: number;
  actual_percentage_today?: number;
  cumulative_percentage?: number;
  variance_percentage?: number;

  // Quantities
  unit_of_measure?: string;
  planned_quantity_today?: number;
  actual_quantity_today?: number;
  cumulative_quantity?: number;
  total_planned_quantity?: number;

  // Variance
  variance_reason?: string;
  corrective_action?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

// =============================================
// DELIVERIES (Enhanced)
// =============================================

export interface DeliveryEntryV2 {
  id: string;
  daily_report_id: string;

  // Delivery info
  material_description: string;
  quantity?: string;
  vendor?: string;
  delivery_ticket_number?: string;
  delivery_time?: string;
  po_number?: string;

  // Receiving
  receiving_employee?: string;
  inspection_status: DeliveryInspectionStatus;
  rejection_reason?: string;
  storage_location?: string;
  cost_code?: string;

  notes?: string;

  // Metadata
  created_at: string;
}

// =============================================
// VISITORS (Enhanced)
// =============================================

export interface VisitorEntryV2 {
  id: string;
  daily_report_id: string;

  // Info
  visitor_name: string;
  company?: string;
  purpose?: string;
  badge_number?: string;

  // Time
  arrival_time?: string;
  departure_time?: string;

  // Safety
  safety_orientation_completed: boolean;
  escort_required: boolean;
  escort_name?: string;

  // Access
  areas_accessed?: string[];
  photos_taken: boolean;
  nda_signed: boolean;

  // Metadata
  created_at: string;
}

// =============================================
// PHOTOS (Enhanced)
// =============================================

export interface PhotoEntryV2 {
  id: string;
  daily_report_id: string;

  // File
  file_url: string;
  thumbnail_url?: string;
  file_size?: number;

  // Categorization
  caption?: string;
  category: PhotoCategory;

  // Location/Cost
  work_area?: string;
  cost_code?: string;

  // GPS
  gps_latitude?: number;
  gps_longitude?: number;
  compass_heading?: number;

  // Timestamps
  taken_at?: string;
  taken_by?: string;

  // Linking
  linked_to_type?: string;
  linked_to_id?: string;

  // Status
  upload_status: 'pending' | 'uploading' | 'uploaded' | 'failed';

  // Metadata
  created_at: string;
}

// =============================================
// TEMPLATES
// =============================================

export interface DailyReportTemplate {
  id: string;
  project_id?: string;
  user_id: string;

  name: string;
  description?: string;
  is_default: boolean;

  workforce_template: Partial<WorkforceEntryV2>[];
  equipment_template: Partial<EquipmentEntryV2>[];

  created_at: string;
  updated_at: string;
}

// =============================================
// FORM DATA TYPES
// =============================================

export interface DailyReportFormDataV2 {
  // Basic info
  project_id: string;
  report_date: string;
  mode: FormMode;

  // Shift
  shift_start_time?: string;
  shift_end_time?: string;
  shift_type: ShiftType;

  // Weather
  weather: {
    weather_condition: string;
    temperature_high?: number;
    temperature_low?: number;
    precipitation?: number;
    wind_speed?: number;
    wind_direction?: string;
    humidity_percentage?: number;
    weather_delays: boolean;
    weather_delay_hours?: number;
    weather_delay_notes?: string;
  };

  // Work
  work: {
    work_summary: string;
    work_completed?: string;
    work_planned_tomorrow?: string;
  };

  // Progress (optional in quick mode)
  progress?: {
    overall_progress_percentage?: number;
    schedule_status?: ScheduleStatus;
  };

  // Collections
  workforce: WorkforceEntryV2[];
  equipment: EquipmentEntryV2[];
  delays: DelayEntry[];
  safety_incidents: SafetyIncident[];
  inspections: InspectionEntry[];
  tm_work: TMWorkEntry[];
  progress_entries: ProgressEntry[];
  deliveries: DeliveryEntryV2[];
  visitors: VisitorEntryV2[];
  photos: PhotoEntryV2[];

  // Signatures (for submission)
  submitted_by_signature?: string;
  submitted_by_name?: string;
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

export interface CreateDailyReportV2Request {
  project_id: string;
  report_date: string;
  mode?: FormMode;
  shift_start_time?: string;
  shift_end_time?: string;
  shift_type?: ShiftType;
}

export interface UpdateDailyReportV2Request {
  id: string;
  updates: Partial<DailyReportV2>;
}

export interface CopyFromPreviousDayRequest {
  project_id: string;
  source_date: string;
  target_date: string;
  copy_workforce?: boolean;
  copy_equipment?: boolean;
}

export interface SubmitReportRequest {
  report_id: string;
  submitted_by_signature: string;
  submitted_by_name: string;
}

export interface ApproveReportRequest {
  report_id: string;
  approved_by_signature: string;
  approved_by_name: string;
  approval_comments?: string;
}

export interface RequestChangesRequest {
  report_id: string;
  reason: string;
}

// =============================================
// QUICK LOG ENTRY (for Quick Mode)
// =============================================

export type QuickLogType = 'delay' | 'delivery' | 'visitor' | 'issue' | 'inspection' | 'safety';

export interface QuickLogEntry {
  type: QuickLogType;
  description: string;
  duration_hours?: number; // for delays
  time?: string; // for deliveries, visitors
}

// =============================================
// WEATHER API TYPES
// =============================================

export interface WeatherApiResponse {
  condition: string;
  temperature_high: number;
  temperature_low: number;
  precipitation: number;
  wind_speed: number;
  wind_direction: string;
  humidity: number;
  fetched_at: string;
}
