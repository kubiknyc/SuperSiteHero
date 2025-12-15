/**
 * Outlook Calendar Integration Types
 *
 * Types for Microsoft Graph OAuth, calendar sync, and event mapping.
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type OutlookSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'skipped'
export type OutlookSyncDirection = 'to_outlook' | 'from_outlook' | 'bidirectional'
export type OutlookEntityType = 'meeting' | 'inspection' | 'task' | 'milestone' | 'schedule_activity'

export const OUTLOOK_SYNC_STATUSES: { value: OutlookSyncStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'syncing', label: 'Syncing', color: 'blue' },
  { value: 'synced', label: 'Synced', color: 'green' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'skipped', label: 'Skipped', color: 'yellow' },
]

export const OUTLOOK_ENTITY_TYPES: { value: OutlookEntityType; label: string; icon: string }[] = [
  { value: 'meeting', label: 'Meetings', icon: 'Users' },
  { value: 'inspection', label: 'Inspections', icon: 'ClipboardCheck' },
  { value: 'task', label: 'Tasks', icon: 'CheckSquare' },
  { value: 'milestone', label: 'Milestones', icon: 'Flag' },
  { value: 'schedule_activity', label: 'Schedule Activities', icon: 'Calendar' },
]

export const OUTLOOK_SYNC_DIRECTIONS: { value: OutlookSyncDirection; label: string; description: string }[] = [
  { value: 'to_outlook', label: 'To Outlook', description: 'Only push changes to Outlook' },
  { value: 'from_outlook', label: 'From Outlook', description: 'Only pull changes from Outlook' },
  { value: 'bidirectional', label: 'Two-way Sync', description: 'Sync changes in both directions' },
]

// ============================================================================
// Core Database Types
// ============================================================================

/**
 * Outlook calendar connection record
 */
export interface OutlookCalendarConnection {
  id: string
  user_id: string
  company_id: string
  microsoft_user_id: string | null
  email: string | null
  display_name: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  calendar_id: string
  calendar_name: string | null
  is_active: boolean
  last_connected_at: string | null
  last_sync_at: string | null
  connection_error: string | null
  auto_sync_enabled: boolean
  sync_frequency_minutes: number
  sync_direction: OutlookSyncDirection
  sync_meetings: boolean
  sync_inspections: boolean
  sync_tasks: boolean
  sync_milestones: boolean
  webhook_subscription_id: string | null
  webhook_expiration: string | null
  created_at: string
  updated_at: string
}

/**
 * Event mapping between local entities and Outlook events
 */
export interface OutlookEventMapping {
  id: string
  connection_id: string
  user_id: string
  local_entity_type: OutlookEntityType
  local_entity_id: string
  project_id: string | null
  outlook_event_id: string
  outlook_calendar_id: string | null
  outlook_change_key: string | null
  sync_status: OutlookSyncStatus
  sync_direction: OutlookSyncDirection
  last_synced_at: string | null
  last_local_update: string | null
  last_outlook_update: string | null
  last_sync_error: string | null
  cached_title: string | null
  cached_start: string | null
  cached_end: string | null
  cached_location: string | null
  created_at: string
  updated_at: string
}

/**
 * Sync operation log
 */
export interface OutlookSyncLog {
  id: string
  connection_id: string
  user_id: string
  sync_type: 'manual' | 'scheduled' | 'webhook' | 'initial'
  direction: OutlookSyncDirection
  entity_type: OutlookEntityType | null
  status: OutlookSyncStatus
  events_processed: number
  events_created: number
  events_updated: number
  events_deleted: number
  events_failed: number
  conflicts_detected: number
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  error_message: string | null
  error_details: Record<string, unknown> | null
  delta_token: string | null
  created_at: string
}

/**
 * Microsoft Graph calendar
 */
export interface OutlookCalendar {
  id: string
  name: string
  color?: string
  isDefaultCalendar?: boolean
  canEdit?: boolean
  canShare?: boolean
  owner?: {
    name: string
    address: string
  }
}

// ============================================================================
// DTO Types (Input/Output)
// ============================================================================

/**
 * Complete OAuth callback
 */
export interface CompleteOutlookOAuthDTO {
  code: string
  state: string
}

/**
 * Update connection settings
 */
export interface UpdateOutlookConnectionDTO {
  auto_sync_enabled?: boolean
  sync_frequency_minutes?: number
  sync_direction?: OutlookSyncDirection
  sync_meetings?: boolean
  sync_inspections?: boolean
  sync_tasks?: boolean
  sync_milestones?: boolean
  calendar_id?: string
  calendar_name?: string
}

/**
 * Sync single event
 */
export interface SyncOutlookEventDTO {
  entityType: OutlookEntityType
  entityId: string
  direction?: OutlookSyncDirection
  action?: 'create' | 'update' | 'delete'
}

/**
 * Bulk sync request
 */
export interface BulkOutlookSyncDTO {
  entityType: OutlookEntityType
  entityIds?: string[]
  direction?: OutlookSyncDirection
  projectId?: string
}

// ============================================================================
// Dashboard/Stats Types
// ============================================================================

/**
 * Connection status for display
 */
export interface OutlookConnectionStatus {
  isConnected: boolean
  connectionId: string | null
  email: string | null
  displayName: string | null
  calendarName: string | null
  lastSyncAt: string | null
  tokenExpiresAt: string | null
  isTokenExpired: boolean
  needsReauth: boolean
  connectionError: string | null
  autoSyncEnabled: boolean
  syncFrequencyMinutes: number
  syncDirection: OutlookSyncDirection
  syncSettings: {
    meetings: boolean
    inspections: boolean
    tasks: boolean
    milestones: boolean
  }
}

/**
 * Sync statistics
 */
export interface OutlookSyncStats {
  totalMappedEvents: number
  pendingSyncs: number
  failedSyncs: number
  lastSyncAt: string | null
  syncsByEntityType: Record<OutlookEntityType, {
    total: number
    synced: number
    pending: number
    failed: number
  }>
}

/**
 * Dashboard data
 */
export interface OutlookSyncDashboard {
  connection: OutlookConnectionStatus
  stats: OutlookSyncStats
  recentLogs: OutlookSyncLog[]
  upcomingSyncEvents: OutlookEventMapping[]
  availableCalendars: OutlookCalendar[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get sync status config
 */
export function getOutlookSyncStatusConfig(status: OutlookSyncStatus) {
  return OUTLOOK_SYNC_STATUSES.find(s => s.value === status) || OUTLOOK_SYNC_STATUSES[0]
}

/**
 * Get entity type config
 */
export function getOutlookEntityTypeConfig(entityType: OutlookEntityType) {
  return OUTLOOK_ENTITY_TYPES.find(e => e.value === entityType)
}

/**
 * Check if connection needs token refresh
 */
export function outlookConnectionNeedsRefresh(connection: OutlookCalendarConnection): boolean {
  if (!connection.token_expires_at) return true
  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()
  // Refresh if expires within 5 minutes
  return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000
}

/**
 * Check if connection needs re-authentication
 * (Microsoft refresh tokens can expire after extended inactivity)
 */
export function outlookConnectionNeedsReauth(connection: OutlookCalendarConnection): boolean {
  // If there's a connection error mentioning expired or invalid
  if (connection.connection_error?.toLowerCase().includes('expired')) return true
  if (connection.connection_error?.toLowerCase().includes('invalid')) return true
  if (!connection.refresh_token) return true
  return false
}

/**
 * Format last sync time
 */
export function formatLastSyncTime(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Never'

  const syncDate = new Date(lastSyncAt)
  const now = new Date()
  const diffMs = now.getTime() - syncDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

// ============================================================================
// Microsoft Graph API URL Helpers
// ============================================================================

export const MS_GRAPH_URLS = {
  oauth: {
    authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  },
  api: {
    base: 'https://graph.microsoft.com/v1.0',
  },
  scopes: 'Calendars.ReadWrite offline_access User.Read',
}
