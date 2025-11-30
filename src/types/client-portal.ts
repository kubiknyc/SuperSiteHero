/**
 * Client Portal Types
 *
 * Type definitions for the client portal feature.
 */

/**
 * Client Portal Settings
 * Per-project configuration for what clients can see
 */
export interface ClientPortalSettings {
  id: string
  project_id: string
  show_budget: boolean
  show_contract_value: boolean
  show_schedule: boolean
  show_daily_reports: boolean
  show_documents: boolean
  show_photos: boolean
  show_rfis: boolean
  show_change_orders: boolean
  show_punch_lists: boolean
  welcome_message: string | null
  custom_logo_url: string | null
  created_at: string
  updated_at: string
}

/**
 * Client Project View
 * Filtered project data for client portal (hides sensitive fields based on settings)
 */
export interface ClientProjectView {
  id: string
  name: string
  project_number: string | null
  description: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  latitude: number | null
  longitude: number | null
  start_date: string | null
  end_date: string | null
  substantial_completion_date: string | null
  final_completion_date: string | null
  status: string | null
  // Budget fields - null if not enabled in settings
  budget: number | null
  contract_value: number | null
  // Portal settings (what sections are visible)
  show_schedule: boolean
  show_documents: boolean
  show_photos: boolean
  show_rfis: boolean
  show_change_orders: boolean
  show_daily_reports: boolean
  show_punch_lists: boolean
  welcome_message: string | null
  custom_logo_url: string | null
}

/**
 * Client Dashboard Stats
 */
export interface ClientDashboardStats {
  total_projects: number
  active_projects: number
  completed_projects: number
  open_rfis: number
  pending_change_orders: number
  upcoming_milestones: number
}

/**
 * Client RFI View
 * Simplified RFI data for clients
 */
export interface ClientRFIView {
  id: string
  number: number
  title: string
  description: string | null
  status: string
  priority: string | null
  created_at: string
  due_date: string | null
  resolution: string | null
  resolved_at: string | null
}

/**
 * Client Change Order View
 */
export interface ClientChangeOrderView {
  id: string
  number: number
  title: string
  description: string | null
  status: string
  cost_impact: number | null
  schedule_impact_days: number | null
  created_at: string
  approved_at: string | null
}

/**
 * Client Document View
 */
export interface ClientDocumentView {
  id: string
  name: string
  document_number: string | null
  category: string | null
  file_url: string
  file_type: string | null
  file_size: number | null
  version: string | null
  uploaded_at: string
}

/**
 * Client Photo View
 */
export interface ClientPhotoView {
  id: string
  photo_url: string
  thumbnail_url: string | null
  caption: string | null
  taken_at: string | null
  latitude: number | null
  longitude: number | null
  category: string | null
}

/**
 * Client Schedule Item View
 */
export interface ClientScheduleItemView {
  id: string
  task_name: string
  start_date: string
  finish_date: string
  duration_days: number
  percent_complete: number
  is_milestone: boolean
  is_critical: boolean
  status: string | null
}

/**
 * Client Activity Item
 * For the activity feed on dashboard
 */
export interface ClientActivityItem {
  id: string
  type: 'rfi_update' | 'co_update' | 'milestone' | 'document' | 'photo'
  title: string
  description: string
  timestamp: string
  project_id: string
  project_name: string
  link?: string
}

/**
 * DTOs for updating settings
 */
export interface UpdateClientPortalSettingsDTO {
  show_budget?: boolean
  show_contract_value?: boolean
  show_schedule?: boolean
  show_daily_reports?: boolean
  show_documents?: boolean
  show_photos?: boolean
  show_rfis?: boolean
  show_change_orders?: boolean
  show_punch_lists?: boolean
  welcome_message?: string | null
  custom_logo_url?: string | null
}

/**
 * Client Invitation
 */
export interface ClientInvitation {
  email: string
  project_ids: string[]
  message?: string
}

/**
 * User role type including client
 */
export type UserRole =
  | 'superintendent'
  | 'project_manager'
  | 'office_admin'
  | 'field_employee'
  | 'subcontractor'
  | 'architect'
  | 'client'

/**
 * Check if a role is a client role
 */
export function isClientRole(role: string | null | undefined): boolean {
  return role === 'client'
}

/**
 * Default portal settings
 */
export const DEFAULT_CLIENT_PORTAL_SETTINGS: Omit<ClientPortalSettings, 'id' | 'project_id' | 'created_at' | 'updated_at'> = {
  show_budget: false,
  show_contract_value: false,
  show_schedule: true,
  show_daily_reports: false,
  show_documents: true,
  show_photos: true,
  show_rfis: true,
  show_change_orders: true,
  show_punch_lists: false,
  welcome_message: null,
  custom_logo_url: null,
}
