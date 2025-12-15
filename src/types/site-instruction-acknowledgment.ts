// Types for Site Instruction QR Code Workflow
// Milestone 1.2

/**
 * Acknowledgment record for a site instruction
 */
export interface SiteInstructionAcknowledgment {
  id: string
  site_instruction_id: string
  acknowledged_by: string | null
  acknowledged_by_name: string | null
  acknowledged_at: string
  signature_data: string | null
  location_lat: number | null
  location_lng: number | null
  location_accuracy: number | null
  photo_ids: string[] | null
  notes: string | null
  device_info: DeviceInfo | null
  ip_address: string | null
  is_offline_submission: boolean
  offline_submitted_at: string | null
  synced_at: string | null
  created_at: string
  updated_at: string
  // Relations
  acknowledged_by_user?: {
    id: string
    full_name: string
    email?: string
  } | null
}

/**
 * Device information captured during acknowledgment
 */
export interface DeviceInfo {
  userAgent?: string
  platform?: string
  language?: string
  screenWidth?: number
  screenHeight?: number
  devicePixelRatio?: number
  isTouchDevice?: boolean
  isOnline?: boolean
}

/**
 * Input for creating a new acknowledgment
 */
export interface CreateAcknowledgmentInput {
  site_instruction_id: string
  acknowledged_by?: string
  acknowledged_by_name?: string
  signature_data?: string
  location_lat?: number
  location_lng?: number
  location_accuracy?: number
  photo_ids?: string[]
  notes?: string
  device_info?: DeviceInfo
  is_offline_submission?: boolean
  offline_submitted_at?: string
}

/**
 * QR code data structure
 */
export interface QRCodeData {
  instructionId: string
  token: string
  baseUrl: string
}

/**
 * QR token response from database
 */
export interface QRTokenResponse {
  qr_code_token: string
  qr_code_expires_at: string
}

/**
 * Site instruction with QR code fields
 */
export interface SiteInstructionWithQR {
  id: string
  project_id: string
  reference_number: string | null
  title: string
  description: string
  status: string | null
  priority: string | null
  due_date: string | null
  qr_code_token: string | null
  qr_code_expires_at: string | null
  // Relations
  subcontractor?: {
    id: string
    company_name: string
    contact_name: string | null
  } | null
  project?: {
    id: string
    name: string
  } | null
  acknowledgments?: SiteInstructionAcknowledgment[]
}

/**
 * Offline acknowledgment entry for local storage
 */
export interface OfflineAcknowledgment {
  id: string // Local UUID
  site_instruction_id: string
  server_id?: string // Set after sync
  acknowledged_by?: string
  acknowledged_by_name: string
  acknowledged_at: string
  signature_data?: string
  location_lat?: number
  location_lng?: number
  location_accuracy?: number
  photo_ids?: string[]
  notes?: string
  device_info?: DeviceInfo
  // Offline metadata
  created_at: string
  synced: boolean
  sync_attempts: number
  last_sync_attempt?: string
  sync_error?: string
}

/**
 * Offline photo entry for local storage
 */
export interface OfflinePhoto {
  id: string
  localUrl: string // Blob URL or data URL
  file?: File // Original file for upload
  acknowledgmentId: string
  caption?: string
  createdAt: string
  synced: boolean
  serverId?: string
}

/**
 * GPS location data
 */
export interface GPSLocation {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}
