/**
 * Toolbox Talk Types
 *
 * Safety briefing / toolbox talk system types including:
 * - Topic library with talking points
 * - Toolbox talk records with scheduling
 * - Attendance tracking with digital sign-in
 * - Worker certifications per topic
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

/**
 * Topic categories for organization
 */
export type ToolboxTopicCategory =
  | 'fall_protection'
  | 'ppe'
  | 'electrical_safety'
  | 'excavation'
  | 'scaffolding'
  | 'ladder_safety'
  | 'fire_prevention'
  | 'hazmat'
  | 'confined_space'
  | 'lockout_tagout'
  | 'hand_tools'
  | 'power_tools'
  | 'heavy_equipment'
  | 'crane_rigging'
  | 'housekeeping'
  | 'heat_illness'
  | 'cold_stress'
  | 'silica_dust'
  | 'noise_exposure'
  | 'ergonomics'
  | 'first_aid'
  | 'emergency_response'
  | 'site_specific'
  | 'other'

/**
 * Toolbox talk status
 */
export type ToolboxTalkStatus =
  | 'draft'        // Being prepared
  | 'scheduled'    // Scheduled for future
  | 'in_progress'  // Currently being conducted
  | 'completed'    // Finished with attendance recorded
  | 'cancelled'    // Cancelled

/**
 * Attendance status for workers
 */
export type ToolboxAttendanceStatus =
  | 'expected'     // Worker expected to attend
  | 'present'      // Worker attended and signed in
  | 'absent'       // Worker was absent
  | 'excused'      // Worker excused (valid reason)

/**
 * Certification status derived from expiration
 */
export type CertificationStatus = 'valid' | 'expiring_soon' | 'expired'

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Basic user info for display
 */
export interface UserInfo {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
}

/**
 * Device info for audit trail
 */
export interface DeviceInfo {
  user_agent?: string
  platform?: string
  screen_width?: number
  screen_height?: number
}

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Toolbox talk topic (library item)
 */
export interface ToolboxTalkTopic {
  id: string
  company_id: string | null // null for system templates

  // Topic details
  title: string
  description: string | null
  category: ToolboxTopicCategory

  // Content
  talking_points: string[] // JSON array of key points
  discussion_questions: string[] // JSON array of prompts
  resources: TopicResource[] // Links, docs, videos

  // Certification
  requires_certification: boolean
  certification_valid_days: number

  // Duration
  estimated_duration: number // minutes

  // Regulation reference
  osha_standard: string | null
  regulation_references: string | null

  // Flags
  is_system_template: boolean
  is_active: boolean

  // Usage
  times_used: number

  // Timestamps
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Resource attached to a topic
 */
export interface TopicResource {
  type: 'link' | 'document' | 'video' | 'image'
  title: string
  url: string
  description?: string
}

/**
 * Main toolbox talk record
 */
export interface ToolboxTalk {
  id: string
  project_id: string
  company_id: string

  // Identification
  talk_number: string

  // Topic
  topic_id: string | null
  custom_topic_title: string | null
  custom_topic_description: string | null
  category: ToolboxTopicCategory

  // Scheduling
  scheduled_date: string // DATE as ISO string
  scheduled_time: string | null // TIME as string
  actual_start_time: string | null
  actual_end_time: string | null
  duration_minutes: number | null

  // Location
  location: string | null

  // Status
  status: ToolboxTalkStatus

  // Presenter
  presenter_id: string | null
  presenter_name: string | null
  presenter_title: string | null

  // Content
  talking_points_covered: string[] // JSON array
  notes: string | null
  hazards_discussed: string | null

  // Conditions
  weather_conditions: string | null
  site_conditions: string | null

  // Compliance
  osha_compliant: boolean

  // Related incident
  related_incident_id: string | null

  // Timestamps
  created_at: string
  updated_at: string
  created_by: string | null
  completed_at: string | null
  completed_by: string | null
  deleted_at: string | null

  // Joined data (optional)
  topic?: ToolboxTalkTopic
  presenter?: UserInfo
  project?: { id: string; name: string }
  attendees?: ToolboxTalkAttendee[]
  attendance_count?: number
  present_count?: number
}

/**
 * Toolbox talk attendee (digital sign-in)
 */
export interface ToolboxTalkAttendee {
  id: string
  toolbox_talk_id: string

  // Worker identification
  user_id: string | null
  worker_name: string
  worker_company: string | null
  worker_trade: string | null
  worker_badge_number: string | null

  // Attendance
  attendance_status: ToolboxAttendanceStatus

  // Digital signature
  signed_in_at: string | null
  signature_data: string | null // Base64 signature
  signed_via: 'app' | 'tablet' | 'paper'

  // Audit trail
  device_info: DeviceInfo | null
  ip_address: string | null

  // Notes
  notes: string | null

  // Timestamps
  created_at: string
  updated_at: string

  // Joined data
  user?: UserInfo
}

/**
 * Worker certification record
 */
export interface ToolboxTalkCertification {
  id: string
  company_id: string

  // Worker
  user_id: string | null
  worker_name: string
  worker_company: string | null

  // Certification
  topic_id: string
  certified_date: string
  expires_date: string | null
  toolbox_talk_id: string | null

  // Status
  is_current: boolean

  // Timestamps
  created_at: string

  // Joined/computed data
  topic?: ToolboxTalkTopic
  certification_status?: CertificationStatus
}

// ============================================================================
// Populated Types (with relations)
// ============================================================================

/**
 * Toolbox talk with all related data
 */
export interface ToolboxTalkWithDetails extends Omit<ToolboxTalk, 'topic' | 'presenter' | 'project' | 'attendees' | 'attendance_count' | 'present_count'> {
  topic: ToolboxTalkTopic | null
  presenter: UserInfo | null
  project: { id: string; name: string }
  attendees: ToolboxTalkAttendee[]
  attendance_count: number
  present_count: number
}

/**
 * Certification with computed status
 */
export interface CertificationWithStatus extends ToolboxTalkCertification {
  topic: ToolboxTalkTopic
  certification_status: CertificationStatus
  days_until_expiry: number | null
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Toolbox talk statistics for a project
 */
export interface ToolboxTalkStats {
  project_id: string
  total_talks: number
  completed_talks: number
  scheduled_talks: number
  cancelled_talks: number
  avg_duration: number | null
  total_attendees: number
  last_completed_date: string | null
}

/**
 * Compliance summary for a project/company
 */
export interface ComplianceSummary {
  total_workers: number
  workers_with_current_certs: number
  workers_with_expiring_certs: number
  workers_with_expired_certs: number
  compliance_percentage: number
  topics_covered_this_month: number
  talks_this_month: number
}

// ============================================================================
// Input Types (DTOs)
// ============================================================================

/**
 * Input for creating a new topic
 */
export interface CreateToolboxTopicDTO {
  company_id: string
  title: string
  description?: string | null
  category: ToolboxTopicCategory
  talking_points?: string[]
  discussion_questions?: string[]
  resources?: TopicResource[]
  requires_certification?: boolean
  certification_valid_days?: number
  estimated_duration?: number
  osha_standard?: string | null
  regulation_references?: string | null
}

/**
 * Input for updating a topic
 */
export interface UpdateToolboxTopicDTO {
  title?: string
  description?: string | null
  category?: ToolboxTopicCategory
  talking_points?: string[]
  discussion_questions?: string[]
  resources?: TopicResource[]
  requires_certification?: boolean
  certification_valid_days?: number
  estimated_duration?: number
  osha_standard?: string | null
  regulation_references?: string | null
  is_active?: boolean
}

/**
 * Input for creating a new toolbox talk
 */
export interface CreateToolboxTalkDTO {
  project_id: string
  company_id: string
  topic_id?: string | null
  custom_topic_title?: string | null
  custom_topic_description?: string | null
  category: ToolboxTopicCategory
  scheduled_date: string
  scheduled_time?: string | null
  location?: string | null
  presenter_id?: string | null
  presenter_name?: string | null
  presenter_title?: string | null
  related_incident_id?: string | null
}

/**
 * Input for updating a toolbox talk
 */
export interface UpdateToolboxTalkDTO {
  topic_id?: string | null
  custom_topic_title?: string | null
  custom_topic_description?: string | null
  category?: ToolboxTopicCategory
  scheduled_date?: string
  scheduled_time?: string | null
  location?: string | null
  status?: ToolboxTalkStatus
  presenter_id?: string | null
  presenter_name?: string | null
  presenter_title?: string | null
  talking_points_covered?: string[]
  notes?: string | null
  hazards_discussed?: string | null
  weather_conditions?: string | null
  site_conditions?: string | null
  osha_compliant?: boolean
}

/**
 * Input for starting a toolbox talk
 */
export interface StartToolboxTalkDTO {
  actual_start_time?: string
  weather_conditions?: string | null
  site_conditions?: string | null
}

/**
 * Input for completing a toolbox talk
 */
export interface CompleteToolboxTalkDTO {
  actual_end_time?: string
  duration_minutes?: number
  talking_points_covered?: string[]
  notes?: string | null
  hazards_discussed?: string | null
}

/**
 * Input for adding an attendee
 */
export interface CreateToolboxAttendeeDTO {
  toolbox_talk_id: string
  user_id?: string | null
  worker_name: string
  worker_company?: string | null
  worker_trade?: string | null
  worker_badge_number?: string | null
  attendance_status?: ToolboxAttendanceStatus
}

/**
 * Input for signing in an attendee
 */
export interface SignInAttendeeDTO {
  signature_data?: string | null
  signed_via?: 'app' | 'tablet' | 'paper'
  device_info?: DeviceInfo | null
}

/**
 * Input for updating an attendee
 */
export interface UpdateToolboxAttendeeDTO {
  worker_name?: string
  worker_company?: string | null
  worker_trade?: string | null
  worker_badge_number?: string | null
  attendance_status?: ToolboxAttendanceStatus
  notes?: string | null
}

/**
 * Input for bulk adding attendees
 */
export interface BulkAddAttendeesDTO {
  toolbox_talk_id: string
  attendees: Array<{
    user_id?: string | null
    worker_name: string
    worker_company?: string | null
    worker_trade?: string | null
    worker_badge_number?: string | null
  }>
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filters for querying toolbox talks
 */
export interface ToolboxTalkFilters {
  project_id?: string
  company_id?: string
  topic_id?: string
  category?: ToolboxTopicCategory
  status?: ToolboxTalkStatus
  presenter_id?: string
  date_from?: string
  date_to?: string
  search?: string
  include_deleted?: boolean
}

/**
 * Filters for querying topics
 */
export interface ToolboxTopicFilters {
  company_id?: string
  category?: ToolboxTopicCategory
  requires_certification?: boolean
  is_active?: boolean
  include_system_templates?: boolean
  search?: string
}

/**
 * Filters for querying certifications
 */
export interface CertificationFilters {
  company_id?: string
  worker_name?: string
  topic_id?: string
  is_current?: boolean
  status?: CertificationStatus
  expiring_within_days?: number
}

// ============================================================================
// Label Helpers
// ============================================================================

/**
 * Get display label for topic category
 */
export const TOPIC_CATEGORY_LABELS: Record<ToolboxTopicCategory, string> = {
  fall_protection: 'Fall Protection',
  ppe: 'Personal Protective Equipment',
  electrical_safety: 'Electrical Safety',
  excavation: 'Excavation & Trenching',
  scaffolding: 'Scaffolding',
  ladder_safety: 'Ladder Safety',
  fire_prevention: 'Fire Prevention',
  hazmat: 'Hazardous Materials',
  confined_space: 'Confined Space',
  lockout_tagout: 'Lockout/Tagout',
  hand_tools: 'Hand Tools',
  power_tools: 'Power Tools',
  heavy_equipment: 'Heavy Equipment',
  crane_rigging: 'Crane & Rigging',
  housekeeping: 'Housekeeping',
  heat_illness: 'Heat Illness Prevention',
  cold_stress: 'Cold Stress',
  silica_dust: 'Silica Dust',
  noise_exposure: 'Noise Exposure',
  ergonomics: 'Ergonomics',
  first_aid: 'First Aid',
  emergency_response: 'Emergency Response',
  site_specific: 'Site Specific',
  other: 'Other',
}

/**
 * Get display label for talk status
 */
export const TALK_STATUS_LABELS: Record<ToolboxTalkStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/**
 * Get display label for attendance status
 */
export const ATTENDANCE_STATUS_LABELS: Record<ToolboxAttendanceStatus, string> = {
  expected: 'Expected',
  present: 'Present',
  absent: 'Absent',
  excused: 'Excused',
}

/**
 * Get color for talk status (for badges)
 */
export const TALK_STATUS_COLORS: Record<ToolboxTalkStatus, string> = {
  draft: 'gray',
  scheduled: 'blue',
  in_progress: 'yellow',
  completed: 'green',
  cancelled: 'red',
}

/**
 * Get color for attendance status (for badges)
 */
export const ATTENDANCE_STATUS_COLORS: Record<ToolboxAttendanceStatus, string> = {
  expected: 'gray',
  present: 'green',
  absent: 'red',
  excused: 'yellow',
}

/**
 * Get color for certification status
 */
export const CERTIFICATION_STATUS_COLORS: Record<CertificationStatus, string> = {
  valid: 'green',
  expiring_soon: 'yellow',
  expired: 'red',
}

/**
 * Get icon name for topic category
 */
export const TOPIC_CATEGORY_ICONS: Record<ToolboxTopicCategory, string> = {
  fall_protection: 'shield-alert',
  ppe: 'hard-hat',
  electrical_safety: 'zap',
  excavation: 'shovel',
  scaffolding: 'construction',
  ladder_safety: 'ladder',
  fire_prevention: 'flame',
  hazmat: 'flask-conical',
  confined_space: 'box',
  lockout_tagout: 'lock',
  hand_tools: 'wrench',
  power_tools: 'drill',
  heavy_equipment: 'truck',
  crane_rigging: 'crane',
  housekeeping: 'broom',
  heat_illness: 'thermometer',
  cold_stress: 'snowflake',
  silica_dust: 'wind',
  noise_exposure: 'volume-2',
  ergonomics: 'person-standing',
  first_aid: 'heart-pulse',
  emergency_response: 'siren',
  site_specific: 'map-pin',
  other: 'file-text',
}
