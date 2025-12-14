/**
 * Safety Observation Types
 *
 * Types for the Safety Observation Cards feature which enables:
 * - Safe behavior observations (positive reinforcement)
 * - Unsafe condition observations (proactive hazard identification)
 * - Near-miss observations (close calls)
 * - Best practice observations (recognize excellence)
 *
 * Includes gamification points and recognition system.
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

/**
 * Types of safety observations
 */
export type SafetyObservationType =
  | 'safe_behavior'      // Positive reinforcement for safe actions
  | 'unsafe_condition'   // Proactive hazard identification
  | 'near_miss'          // Close calls that didn't result in incident
  | 'best_practice'      // Recognition of excellence

/**
 * Observation categories for classification
 */
export type SafetyObservationCategory =
  | 'ppe'                // Personal Protective Equipment
  | 'housekeeping'       // Site cleanliness and organization
  | 'equipment'          // Tools and equipment usage
  | 'procedures'         // Following proper procedures
  | 'ergonomics'         // Proper lifting, posture
  | 'fall_protection'    // Fall hazards and prevention
  | 'electrical'         // Electrical safety
  | 'excavation'         // Trenching and excavation
  | 'confined_space'     // Confined space entry
  | 'fire_prevention'    // Fire hazards and prevention
  | 'traffic_control'    // Vehicle and pedestrian safety
  | 'chemical_handling'  // Hazardous materials
  | 'communication'      // Safety communication
  | 'training'           // Training and competency
  | 'leadership'         // Safety leadership
  | 'other'              // Other categories

/**
 * Observation status workflow
 */
export type SafetyObservationStatus =
  | 'submitted'          // Initially submitted
  | 'acknowledged'       // Reviewed and acknowledged
  | 'action_required'    // Requires corrective action
  | 'in_progress'        // Action being taken
  | 'resolved'           // Corrective action completed
  | 'closed'             // Observation closed

/**
 * Severity rating for observations
 */
export type ObservationSeverity =
  | 'low'                // Minor observation
  | 'medium'             // Moderate concern
  | 'high'               // Significant hazard
  | 'critical'           // Immediate danger

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Basic user info for display
 */
export interface ObserverInfo {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
}

/**
 * Location coordinates for GPS tracking
 */
export interface LocationCoordinates {
  lat: number
  lng: number
}

/**
 * Points calculation breakdown
 */
export interface PointsCalculationDetails {
  base_type_points: number
  severity_bonus: number
  photo_bonus: number
  corrective_action_bonus: number
}

/**
 * Main safety observation record
 */
export interface SafetyObservation {
  id: string
  project_id: string
  company_id: string
  observer_id: string

  // Identification
  observation_number: string

  // Classification
  observation_type: SafetyObservationType
  category: SafetyObservationCategory
  severity: ObservationSeverity

  // Description and location
  title: string
  description: string
  location: string | null
  location_coordinates: LocationCoordinates | null

  // Photo attachments
  photo_urls: string[]

  // Status and workflow
  status: SafetyObservationStatus

  // Corrective action (for unsafe conditions)
  corrective_action: string | null
  assigned_to: string | null
  due_date: string | null
  resolution_notes: string | null
  resolved_at: string | null
  resolved_by: string | null

  // Recognition (for positive observations)
  recognized_person: string | null
  recognized_company: string | null
  recognition_message: string | null

  // Gamification
  points_awarded: number
  points_calculation_details: PointsCalculationDetails | null

  // Metadata
  weather_conditions: string | null
  shift: string | null
  work_area: string | null

  // Timestamps
  observed_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null

  // Joined data (optional)
  observer?: ObserverInfo
  assignee?: ObserverInfo
  resolver?: ObserverInfo
  project?: { id: string; name: string }
}

/**
 * Photo attachment for observation
 */
export interface ObservationPhoto {
  id: string
  observation_id: string
  photo_url: string
  thumbnail_url: string | null
  caption: string | null
  taken_at: string | null
  uploaded_by: string | null
  created_at: string
  uploader?: ObserverInfo
}

/**
 * Comment/activity log entry
 */
export interface ObservationComment {
  id: string
  observation_id: string
  user_id: string
  comment: string
  is_system_message: boolean
  created_at: string
  user?: ObserverInfo
}

/**
 * Notification record
 */
export interface ObservationNotification {
  id: string
  observation_id: string
  user_id: string
  notification_type: 'email' | 'in_app' | 'sms'
  subject: string | null
  message: string | null
  sent_at: string
  read_at: string | null
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed'
  error_message: string | null
}

/**
 * Observer points/leaderboard record
 */
export interface ObserverPoints {
  id: string
  user_id: string
  project_id: string | null
  company_id: string

  // Points
  total_points: number
  monthly_points: number
  yearly_points: number

  // Observation counts
  total_observations: number
  safe_behavior_count: number
  unsafe_condition_count: number
  near_miss_count: number
  best_practice_count: number

  // Streak tracking
  current_streak: number
  longest_streak: number
  last_observation_date: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Leaderboard entry with user info
 */
export interface LeaderboardEntry extends ObserverPoints {
  observer_name: string | null
  observer_email: string
  project_name: string | null
  company_rank: number
  project_rank: number
  monthly_company_rank: number
  monthly_project_rank: number
}

/**
 * Observation with all related data
 */
export interface SafetyObservationWithDetails extends SafetyObservation {
  observer: ObserverInfo
  photos: ObservationPhoto[]
  comments: ObservationComment[]
}

// ============================================================================
// Input Types (DTOs)
// ============================================================================

/**
 * Input for creating a new observation
 */
export interface CreateObservationDTO {
  project_id: string
  company_id: string
  observation_type: SafetyObservationType
  category: SafetyObservationCategory
  severity?: ObservationSeverity
  title: string
  description: string
  location?: string | null
  location_coordinates?: LocationCoordinates | null
  photo_urls?: string[]
  corrective_action?: string | null
  assigned_to?: string | null
  due_date?: string | null
  recognized_person?: string | null
  recognized_company?: string | null
  recognition_message?: string | null
  weather_conditions?: string | null
  shift?: string | null
  work_area?: string | null
  observed_at?: string
}

/**
 * Input for updating an observation
 */
export interface UpdateObservationDTO {
  observation_type?: SafetyObservationType
  category?: SafetyObservationCategory
  severity?: ObservationSeverity
  title?: string
  description?: string
  location?: string | null
  location_coordinates?: LocationCoordinates | null
  photo_urls?: string[]
  status?: SafetyObservationStatus
  corrective_action?: string | null
  assigned_to?: string | null
  due_date?: string | null
  resolution_notes?: string | null
  recognized_person?: string | null
  recognized_company?: string | null
  recognition_message?: string | null
  weather_conditions?: string | null
  shift?: string | null
  work_area?: string | null
}

/**
 * Input for adding a photo
 */
export interface CreateObservationPhotoDTO {
  observation_id: string
  photo_url: string
  thumbnail_url?: string | null
  caption?: string | null
  taken_at?: string | null
}

/**
 * Input for adding a comment
 */
export interface CreateObservationCommentDTO {
  observation_id: string
  comment: string
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filters for querying observations
 */
export interface ObservationFilters {
  project_id?: string
  company_id?: string
  observer_id?: string
  observation_type?: SafetyObservationType | SafetyObservationType[]
  category?: SafetyObservationCategory | SafetyObservationCategory[]
  status?: SafetyObservationStatus | SafetyObservationStatus[]
  severity?: ObservationSeverity | ObservationSeverity[]
  assigned_to?: string
  date_from?: string
  date_to?: string
  search?: string
  include_deleted?: boolean
}

/**
 * Filters for leaderboard
 */
export interface LeaderboardFilters {
  project_id?: string
  company_id?: string
  time_period?: 'all_time' | 'yearly' | 'monthly' | 'weekly'
  limit?: number
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Observation statistics
 */
export interface ObservationStats {
  total_observations: number
  safe_behavior_count: number
  unsafe_condition_count: number
  near_miss_count: number
  best_practice_count: number
  pending_count: number
  action_required_count: number
  resolved_count: number
  critical_count: number
  high_severity_count: number
  last_7_days: number
  last_30_days: number
  total_points_awarded: number
  by_category: Record<SafetyObservationCategory, number>
  by_type: Record<SafetyObservationType, number>
  by_status: Record<SafetyObservationStatus, number>
  trends: { date: string; count: number }[]
}

/**
 * Leading indicator metrics (proactive safety measures)
 */
export interface LeadingIndicators {
  observation_rate: number           // Observations per worker per month
  positive_observation_ratio: number // Percentage of positive vs negative
  corrective_action_closure_rate: number // % of actions closed on time
  average_resolution_time: number    // Days to resolve unsafe conditions
  participation_rate: number         // % of workers submitting observations
  category_breakdown: { category: SafetyObservationCategory; count: number; trend: 'up' | 'down' | 'stable' }[]
}

// ============================================================================
// UI Configuration Types
// ============================================================================

/**
 * Observation type configuration
 */
export interface ObservationTypeConfig {
  label: string
  description: string
  color: 'green' | 'yellow' | 'orange' | 'blue'
  icon: string
  pointsBase: number
}

/**
 * Category configuration
 */
export interface CategoryConfig {
  label: string
  description: string
  icon?: string
}

/**
 * Severity configuration
 */
export interface SeverityConfig {
  label: string
  color: 'gray' | 'yellow' | 'orange' | 'red'
  description: string
}

/**
 * Status configuration
 */
export interface StatusConfig {
  label: string
  color: string
}

// ============================================================================
// UI Configuration Constants
// ============================================================================

export const OBSERVATION_TYPE_CONFIG: Record<SafetyObservationType, ObservationTypeConfig> = {
  safe_behavior: {
    label: 'Safe Behavior',
    description: 'Recognize someone following safety protocols',
    color: 'green',
    icon: 'ThumbsUp',
    pointsBase: 10,
  },
  unsafe_condition: {
    label: 'Unsafe Condition',
    description: 'Report a hazard that needs attention',
    color: 'orange',
    icon: 'AlertTriangle',
    pointsBase: 15,
  },
  near_miss: {
    label: 'Near Miss',
    description: 'Report a close call that could have caused harm',
    color: 'yellow',
    icon: 'AlertCircle',
    pointsBase: 20,
  },
  best_practice: {
    label: 'Best Practice',
    description: 'Share an excellent safety practice',
    color: 'blue',
    icon: 'Award',
    pointsBase: 25,
  },
}

export const CATEGORY_CONFIG: Record<SafetyObservationCategory, CategoryConfig> = {
  ppe: { label: 'PPE', description: 'Personal Protective Equipment' },
  housekeeping: { label: 'Housekeeping', description: 'Site cleanliness and organization' },
  equipment: { label: 'Equipment', description: 'Tools and equipment usage' },
  procedures: { label: 'Procedures', description: 'Following proper procedures' },
  ergonomics: { label: 'Ergonomics', description: 'Proper lifting, posture' },
  fall_protection: { label: 'Fall Protection', description: 'Fall hazards and prevention' },
  electrical: { label: 'Electrical', description: 'Electrical safety' },
  excavation: { label: 'Excavation', description: 'Trenching and excavation' },
  confined_space: { label: 'Confined Space', description: 'Confined space entry' },
  fire_prevention: { label: 'Fire Prevention', description: 'Fire hazards and prevention' },
  traffic_control: { label: 'Traffic Control', description: 'Vehicle and pedestrian safety' },
  chemical_handling: { label: 'Chemical Handling', description: 'Hazardous materials' },
  communication: { label: 'Communication', description: 'Safety communication' },
  training: { label: 'Training', description: 'Training and competency' },
  leadership: { label: 'Leadership', description: 'Safety leadership' },
  other: { label: 'Other', description: 'Other categories' },
}

export const SEVERITY_CONFIG: Record<ObservationSeverity, SeverityConfig> = {
  low: {
    label: 'Low',
    color: 'gray',
    description: 'Minor observation with minimal risk',
  },
  medium: {
    label: 'Medium',
    color: 'yellow',
    description: 'Moderate concern that should be addressed',
  },
  high: {
    label: 'High',
    color: 'orange',
    description: 'Significant hazard requiring prompt action',
  },
  critical: {
    label: 'Critical',
    color: 'red',
    description: 'Immediate danger - stop work required',
  },
}

export const STATUS_CONFIG: Record<SafetyObservationStatus, StatusConfig> = {
  submitted: { label: 'Submitted', color: 'blue' },
  acknowledged: { label: 'Acknowledged', color: 'cyan' },
  action_required: { label: 'Action Required', color: 'orange' },
  in_progress: { label: 'In Progress', color: 'yellow' },
  resolved: { label: 'Resolved', color: 'green' },
  closed: { label: 'Closed', color: 'gray' },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if observation type is positive (recognition)
 */
export function isPositiveObservation(type: SafetyObservationType): boolean {
  return ['safe_behavior', 'best_practice'].includes(type)
}

/**
 * Check if observation requires corrective action
 */
export function requiresCorrectiveAction(type: SafetyObservationType): boolean {
  return ['unsafe_condition', 'near_miss'].includes(type)
}

/**
 * Check if severity is critical (needs immediate notification)
 */
export function isCriticalSeverity(severity: ObservationSeverity): boolean {
  return ['high', 'critical'].includes(severity)
}

/**
 * Calculate base points for an observation type
 */
export function getBasePoints(type: SafetyObservationType): number {
  return OBSERVATION_TYPE_CONFIG[type].pointsBase
}

/**
 * Get display label for observation type
 */
export function getObservationTypeLabel(type: SafetyObservationType): string {
  return OBSERVATION_TYPE_CONFIG[type].label
}

/**
 * Get display label for category
 */
export function getCategoryLabel(category: SafetyObservationCategory): string {
  return CATEGORY_CONFIG[category].label
}

/**
 * Get display label for severity
 */
export function getSeverityLabel(severity: ObservationSeverity): string {
  return SEVERITY_CONFIG[severity].label
}

/**
 * Get display label for status
 */
export function getStatusLabel(status: SafetyObservationStatus): string {
  return STATUS_CONFIG[status].label
}
