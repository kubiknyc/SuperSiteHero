/**
 * Safety Incident Types
 *
 * OSHA-compliant safety incident reporting system types including:
 * - Incident records with severity classification
 * - Witness statements
 * - Photo documentation
 * - Corrective actions (linked to tasks)
 * - Automatic notifications for serious incidents
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

/**
 * Incident severity levels (OSHA-aligned)
 */
export type IncidentSeverity =
  | 'near_miss'        // No injury, but could have resulted in one
  | 'first_aid'        // Minor injury requiring first aid only
  | 'medical_treatment' // Required medical treatment beyond first aid
  | 'lost_time'        // Resulted in lost work time
  | 'fatality'         // Fatal incident

/**
 * Types of safety incidents
 */
export type IncidentType =
  | 'injury'           // Personal injury
  | 'illness'          // Occupational illness
  | 'property_damage'  // Damage to property/equipment
  | 'environmental'    // Environmental incident (spill, etc.)
  | 'near_miss'        // Near miss event
  | 'other'            // Other incident type

/**
 * Incident status workflow
 */
export type IncidentStatus =
  | 'reported'           // Initially reported
  | 'under_investigation' // Being investigated
  | 'corrective_actions' // Corrective actions in progress
  | 'closed'             // Incident closed

/**
 * Person involvement type in incident
 */
export type IncidentPersonType =
  | 'injured_party'    // Person who was injured
  | 'witness'          // Witness to the incident
  | 'first_responder'  // First responder on scene
  | 'supervisor'       // Supervisor notified

/**
 * Corrective action status
 */
export type CorrectiveActionStatus =
  | 'pending'      // Not yet started
  | 'in_progress'  // Work in progress
  | 'completed'    // Completed
  | 'overdue'      // Past due date and not completed

/**
 * Root cause categories for analysis
 */
export type RootCauseCategory =
  | 'human_error'       // Worker mistake
  | 'equipment_failure' // Equipment malfunction
  | 'process_failure'   // Inadequate procedures
  | 'environmental'     // Weather/site conditions
  | 'training'          // Lack of training
  | 'communication'     // Poor communication
  | 'ppe'               // PPE issues
  | 'supervision'       // Inadequate supervision
  | 'other'             // Other cause

/**
 * Notification delivery status
 */
export type NotificationDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'

/**
 * Notification type
 */
export type NotificationType = 'email' | 'in_app' | 'sms'

/**
 * OSHA Injury/Illness Type for Form 300
 * Aligned with migration 080_osha_300_log.sql
 */
export type OSHAInjuryIllnessType =
  | 'injury'              // Injury
  | 'skin_disorder'       // Skin disorder
  | 'respiratory'         // Respiratory condition
  | 'poisoning'           // Poisoning
  | 'hearing_loss'        // Hearing loss
  | 'other_illness'       // All other illnesses

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Main safety incident record
 */
export interface SafetyIncident {
  id: string
  project_id: string
  company_id: string

  // Identification
  incident_number: string

  // When and where
  incident_date: string // DATE as ISO string
  incident_time: string | null // TIME as string
  location: string | null
  weather_conditions: string | null

  // Who reported
  reported_by: string | null
  reported_at: string

  // What happened
  description: string

  // Classification
  severity: IncidentSeverity
  incident_type: IncidentType
  status: IncidentStatus

  // Root cause analysis
  root_cause: string | null
  root_cause_category: RootCauseCategory | null
  contributing_factors: string[] // JSONB array
  immediate_actions: string | null
  preventive_measures: string | null

  // OSHA tracking
  osha_recordable: boolean
  osha_report_number: string | null
  days_away_from_work: number
  days_restricted_duty: number

  // OSHA 300 Log fields (migration 080)
  case_number: string | null
  employee_name: string | null
  employee_job_title: string | null
  injury_illness_type: OSHAInjuryIllnessType | null
  body_part_affected: string | null
  object_substance: string | null
  death_date: string | null
  days_away_count: number
  days_transfer_restriction: number
  is_privacy_case: boolean

  // Timestamps
  created_at: string
  updated_at: string
  deleted_at: string | null

  // Joined data (optional)
  reporter: UserInfo | null
  people?: IncidentPerson[]
  photos?: IncidentPhoto[]
  corrective_actions?: IncidentCorrectiveAction[]
  project?: { id: string; name: string }
}

/**
 * Person involved in an incident (witness, injured party, etc.)
 */
export interface IncidentPerson {
  id: string
  incident_id: string

  // Person type
  person_type: IncidentPersonType

  // Person details
  name: string
  company_name: string | null
  job_title: string | null
  contact_phone: string | null
  contact_email: string | null

  // Statement/details
  statement: string | null

  // Injury details (for injured_party type)
  injury_description: string | null
  body_part_affected: string | null
  treatment_provided: string | null
  hospitalized: boolean

  // Timestamps
  created_at: string
}

/**
 * Photo documentation for incident
 */
export interface IncidentPhoto {
  id: string
  incident_id: string

  // Photo details
  photo_url: string
  caption: string | null
  taken_at: string | null

  // Who uploaded
  uploaded_by: string | null

  // Timestamps
  created_at: string

  // Joined data
  uploader?: UserInfo
}

/**
 * Corrective action for incident
 */
export interface IncidentCorrectiveAction {
  id: string
  incident_id: string

  // Action details
  description: string

  // Assignment
  assigned_to: string | null
  assigned_to_name: string | null

  // Dates
  due_date: string | null
  completed_date: string | null

  // Status
  status: CorrectiveActionStatus

  // Notes
  notes: string | null

  // Link to task system (optional)
  linked_task_id: string | null

  // Timestamps
  created_at: string
  updated_at: string

  // Joined data
  assignee?: UserInfo
  linked_task?: { id: string; title: string; status: string }
}

/**
 * Notification record for incident
 */
export interface IncidentNotification {
  id: string
  incident_id: string
  user_id: string

  notification_type: NotificationType
  subject: string | null
  message: string | null

  sent_at: string
  read_at: string | null

  delivery_status: NotificationDeliveryStatus
  error_message: string | null

  created_at: string

  // Joined data
  user?: UserInfo
}

/**
 * Basic user info for display
 */
export interface UserInfo {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
}

// ============================================================================
// Populated Types (with relations)
// ============================================================================

/**
 * Incident with all related data
 */
export interface SafetyIncidentWithDetails extends SafetyIncident {
  reporter: UserInfo | null
  people: IncidentPerson[]
  photos: IncidentPhoto[]
  corrective_actions: IncidentCorrectiveAction[]
  project: { id: string; name: string }
}

// ============================================================================
// Input Types (DTOs)
// ============================================================================

/**
 * Input for creating a new incident
 */
export interface CreateIncidentDTO {
  project_id: string
  company_id: string
  incident_date: string
  incident_time?: string | null
  location?: string | null
  weather_conditions?: string | null
  description: string
  severity: IncidentSeverity
  incident_type: IncidentType
  immediate_actions?: string | null
  osha_recordable?: boolean
}

/**
 * Input for updating an incident
 */
export interface UpdateIncidentDTO {
  incident_date?: string
  incident_time?: string | null
  location?: string | null
  weather_conditions?: string | null
  description?: string
  severity?: IncidentSeverity
  incident_type?: IncidentType
  status?: IncidentStatus
  root_cause?: string | null
  root_cause_category?: RootCauseCategory | null
  contributing_factors?: string[]
  immediate_actions?: string | null
  preventive_measures?: string | null
  osha_recordable?: boolean
  osha_report_number?: string | null
  days_away_from_work?: number
  days_restricted_duty?: number
  // OSHA 300 Log fields
  case_number?: string | null
  employee_name?: string | null
  employee_job_title?: string | null
  injury_illness_type?: OSHAInjuryIllnessType | null
  body_part_affected?: string | null
  object_substance?: string | null
  death_date?: string | null
  days_away_count?: number
  days_transfer_restriction?: number
}

/**
 * Input for adding a person to incident
 */
export interface CreateIncidentPersonDTO {
  incident_id: string
  person_type: IncidentPersonType
  name: string
  company_name?: string | null
  job_title?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  statement?: string | null
  injury_description?: string | null
  body_part_affected?: string | null
  treatment_provided?: string | null
  hospitalized?: boolean
}

/**
 * Input for adding a photo to incident
 */
export interface CreateIncidentPhotoDTO {
  incident_id: string
  photo_url: string
  caption?: string | null
  taken_at?: string | null
}

/**
 * Input for creating a corrective action
 */
export interface CreateCorrectiveActionDTO {
  incident_id: string
  description: string
  assigned_to?: string | null
  assigned_to_name?: string | null
  due_date?: string | null
  linked_task_id?: string | null
}

/**
 * Input for updating a corrective action
 */
export interface UpdateCorrectiveActionDTO {
  description?: string
  assigned_to?: string | null
  assigned_to_name?: string | null
  due_date?: string | null
  status?: CorrectiveActionStatus
  notes?: string | null
  completed_date?: string | null
  linked_task_id?: string | null
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filters for querying incidents
 */
export interface IncidentFilters {
  project_id?: string
  company_id?: string
  severity?: IncidentSeverity | IncidentSeverity[]
  incident_type?: IncidentType | IncidentType[]
  status?: IncidentStatus | IncidentStatus[]
  osha_recordable?: boolean
  date_from?: string
  date_to?: string
  search?: string // Search in description, location
  include_deleted?: boolean
}

/**
 * Filters for corrective actions
 */
export interface CorrectiveActionFilters {
  incident_id?: string
  assigned_to?: string
  status?: CorrectiveActionStatus | CorrectiveActionStatus[]
  overdue?: boolean
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Incident statistics for dashboard
 */
export interface IncidentStats {
  total_incidents: number
  open_incidents: number
  closed_incidents: number
  near_misses: number
  first_aid_incidents: number
  medical_treatment_incidents: number
  lost_time_incidents: number
  fatalities: number
  osha_recordable_count: number
  total_days_away: number
  total_days_restricted: number
  last_incident_date: string | null
  days_since_last_incident: number
  by_severity: Record<IncidentSeverity, number>
  by_type: Record<IncidentType, number>
  by_status: Record<IncidentStatus, number>
  by_month: { month: string; count: number }[]
}

/**
 * Corrective action statistics
 */
export interface CorrectiveActionStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
  completion_rate: number // percentage
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * Severity display configuration
 */
export interface SeverityConfig {
  label: string
  color: 'green' | 'yellow' | 'orange' | 'red' | 'purple'
  description: string
}

/**
 * Map of severity to display configuration
 */
export const SEVERITY_CONFIG: Record<IncidentSeverity, SeverityConfig> = {
  near_miss: {
    label: 'Near Miss',
    color: 'green',
    description: 'No injury, but could have resulted in one',
  },
  first_aid: {
    label: 'First Aid',
    color: 'yellow',
    description: 'Minor injury requiring first aid only',
  },
  medical_treatment: {
    label: 'Medical Treatment',
    color: 'orange',
    description: 'Required medical treatment beyond first aid',
  },
  lost_time: {
    label: 'Lost Time',
    color: 'red',
    description: 'Resulted in lost work time',
  },
  fatality: {
    label: 'Fatality',
    color: 'purple',
    description: 'Fatal incident',
  },
}

/**
 * Incident type display configuration
 */
export const INCIDENT_TYPE_CONFIG: Record<IncidentType, { label: string; icon?: string }> = {
  injury: { label: 'Injury' },
  illness: { label: 'Illness' },
  property_damage: { label: 'Property Damage' },
  environmental: { label: 'Environmental' },
  near_miss: { label: 'Near Miss' },
  other: { label: 'Other' },
}

/**
 * Status display configuration
 */
export const INCIDENT_STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string }> = {
  reported: { label: 'Reported', color: 'blue' },
  under_investigation: { label: 'Under Investigation', color: 'yellow' },
  corrective_actions: { label: 'Corrective Actions', color: 'orange' },
  closed: { label: 'Closed', color: 'green' },
}

/**
 * Root cause category labels
 */
export const ROOT_CAUSE_LABELS: Record<RootCauseCategory, string> = {
  human_error: 'Human Error',
  equipment_failure: 'Equipment Failure',
  process_failure: 'Process Failure',
  environmental: 'Environmental Conditions',
  training: 'Training Deficiency',
  communication: 'Communication Breakdown',
  ppe: 'PPE Issues',
  supervision: 'Inadequate Supervision',
  other: 'Other',
}

/**
 * Root cause category configuration with labels and optional colors
 */
export const ROOT_CAUSE_CATEGORY_CONFIG: Record<RootCauseCategory, { label: string; color?: string }> = {
  human_error: { label: 'Human Error' },
  equipment_failure: { label: 'Equipment Failure' },
  process_failure: { label: 'Process Failure' },
  environmental: { label: 'Environmental Conditions' },
  training: { label: 'Training Deficiency' },
  communication: { label: 'Communication Breakdown' },
  ppe: { label: 'PPE Issues' },
  supervision: { label: 'Inadequate Supervision' },
  other: { label: 'Other' },
}

/**
 * Person type labels
 */
export const PERSON_TYPE_LABELS: Record<IncidentPersonType, string> = {
  injured_party: 'Injured Party',
  witness: 'Witness',
  first_responder: 'First Responder',
  supervisor: 'Supervisor',
}

/**
 * Check if a severity level is considered serious (requires notifications)
 */
export function isSeriousIncident(severity: IncidentSeverity): boolean {
  return ['medical_treatment', 'lost_time', 'fatality'].includes(severity)
}

/**
 * Check if an incident is OSHA recordable based on severity
 */
export function isLikelyOshaRecordable(severity: IncidentSeverity): boolean {
  return ['medical_treatment', 'lost_time', 'fatality'].includes(severity)
}

// ============================================================================
// OSHA 300 Log Types (migration 080)
// ============================================================================

/**
 * OSHA injury/illness type configuration
 */
export const OSHA_INJURY_ILLNESS_TYPES: { value: OSHAInjuryIllnessType; label: string; column: string }[] = [
  { value: 'injury', label: 'Injury', column: 'G' },
  { value: 'skin_disorder', label: 'Skin Disorder', column: 'H' },
  { value: 'respiratory', label: 'Respiratory Condition', column: 'I' },
  { value: 'poisoning', label: 'Poisoning', column: 'J' },
  { value: 'hearing_loss', label: 'Hearing Loss', column: 'K' },
  { value: 'other_illness', label: 'Other Illness', column: 'L' },
]

/**
 * OSHA 300 Log entry (for display in the log)
 * Aligned with database view osha_300_log
 */
export interface OSHA300LogEntry {
  id: string
  project_id: string
  project_name: string
  case_number: string | null
  employee_name: string | null
  job_title: string | null
  incident_date: string
  location: string | null
  description: string
  injury_illness_type: OSHAInjuryIllnessType | null
  body_part: string | null
  object_substance: string | null
  death: boolean
  days_away_from_work: boolean
  job_transfer_restriction: boolean
  other_recordable: boolean
  days_away_count: number
  days_transfer_restriction: number
  severity: IncidentSeverity
}

/**
 * OSHA 300A Annual Summary entry
 * Aligned with database view osha_300a_summary
 */
export interface OSHA300ASummary {
  project_id: string
  project_name: string
  year: number
  total_deaths: number
  total_days_away_cases: number
  total_job_transfer_cases: number
  total_other_recordable_cases: number
  total_injuries: number
  total_skin_disorders: number
  total_respiratory_conditions: number
  total_poisonings: number
  total_hearing_losses: number
  total_other_illnesses: number
  total_days_away: number
  total_days_transfer: number
  total_recordable_cases: number
}

/**
 * OSHA 300 Log filters
 */
export interface OSHA300LogFilters {
  projectId?: string
  year?: number
  injuryIllnessType?: OSHAInjuryIllnessType | OSHAInjuryIllnessType[]
  severity?: IncidentSeverity | IncidentSeverity[]
  dateFrom?: string
  dateTo?: string
}

/**
 * Get OSHA injury/illness type label
 */
export function getOSHAInjuryIllnessTypeLabel(type: OSHAInjuryIllnessType): string {
  const config = OSHA_INJURY_ILLNESS_TYPES.find((t) => t.value === type)
  return config?.label || type
}

/**
 * Calculate OSHA incident rate (per 100 full-time employees)
 * Rate = (Number of incidents × 200,000) / Total hours worked
 */
export function calculateOSHAIncidentRate(incidents: number, hoursWorked: number): number {
  if (hoursWorked === 0) return 0
  return Number(((incidents * 200000) / hoursWorked).toFixed(2))
}

/**
 * Calculate DART rate (Days Away, Restricted, or Transferred)
 * DART = (Cases with days away/restricted/transferred × 200,000) / Total hours worked
 */
export function calculateDARTRate(dartCases: number, hoursWorked: number): number {
  if (hoursWorked === 0) return 0
  return Number(((dartCases * 200000) / hoursWorked).toFixed(2))
}
