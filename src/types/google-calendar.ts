/**
 * Google Calendar Integration Types
 */

// =============================================================================
// CONNECTION TYPES
// =============================================================================

export interface GoogleCalendarConnection {
  id: string;
  company_id: string;
  user_id: string;

  // Google account info
  google_account_email: string;
  google_account_name: string | null;

  // Selected calendar
  calendar_id: string;
  calendar_name: string | null;
  calendar_timezone: string | null;

  // Sync settings
  sync_enabled: boolean;
  sync_direction: 'to_google' | 'from_google' | 'bidirectional';
  auto_sync_meetings: boolean;
  auto_sync_inspections: boolean;
  auto_sync_deadlines: boolean;

  // Push notification channel
  webhook_channel_id: string | null;
  webhook_resource_id: string | null;
  webhook_expiration: string | null;

  // Status
  is_active: boolean;
  connection_error: string | null;
  last_sync_at: string | null;

  // Token info (not exposed to client)
  token_expires_at: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarConnectionStatus {
  isConnected: boolean;
  connectionId: string | null;
  googleAccountEmail: string | null;
  googleAccountName: string | null;
  calendarId: string | null;
  calendarName: string | null;
  syncEnabled: boolean;
  syncDirection: 'to_google' | 'from_google' | 'bidirectional';
  lastSyncAt: string | null;
  isTokenExpired: boolean;
  needsReconnect: boolean;
  connectionError: string | null;
}

// =============================================================================
// CALENDAR TYPES
// =============================================================================

export interface GoogleCalendar {
  id: string;
  name: string;
  description?: string;
  timeZone?: string;
  primary?: boolean;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
}

// =============================================================================
// EVENT MAPPING TYPES
// =============================================================================

export type LocalEntityType = 'meeting' | 'inspection' | 'deadline' | 'milestone' | 'task';
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'conflict';

export interface CalendarEventMapping {
  id: string;
  connection_id: string;
  company_id: string;

  // Local entity reference
  local_entity_type: LocalEntityType;
  local_entity_id: string;

  // Google Calendar event reference
  google_event_id: string;
  google_calendar_id: string;

  // Sync tracking
  sync_status: SyncStatus;
  last_synced_at: string | null;
  last_sync_error: string | null;

  // Version tracking
  local_version: number;
  google_etag: string | null;
  last_local_update: string | null;
  last_google_update: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

// =============================================================================
// SYNC QUEUE TYPES
// =============================================================================

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncDirection = 'to_google' | 'from_google';
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface CalendarSyncQueueItem {
  id: string;
  connection_id: string;
  company_id: string;

  // Operation details
  operation: SyncOperation;
  direction: SyncDirection;

  // Entity reference
  local_entity_type: LocalEntityType;
  local_entity_id: string;
  google_event_id: string | null;

  // Payload
  payload: unknown;

  // Queue management
  status: QueueStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  last_error: string | null;

  // Scheduling
  scheduled_for: string;

  // Metadata
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// =============================================================================
// SYNC LOG TYPES
// =============================================================================

export type SyncLogStatus = 'success' | 'failed' | 'skipped';

export interface CalendarSyncLog {
  id: string;
  connection_id: string;
  company_id: string;

  // Operation details
  operation: string;
  direction: SyncDirection;
  entity_type: LocalEntityType;
  entity_id: string;
  google_event_id: string | null;

  // Result
  status: SyncLogStatus;
  error_message: string | null;
  error_details: unknown;

  // Duration
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;

  // Metadata
  created_at: string;
}

// =============================================================================
// DTOs
// =============================================================================

export interface CompleteGCalConnectionDTO {
  code: string;
  state: string;
}

export interface UpdateGCalConnectionDTO {
  calendar_id?: string;
  sync_enabled?: boolean;
  sync_direction?: 'to_google' | 'from_google' | 'bidirectional';
  auto_sync_meetings?: boolean;
  auto_sync_inspections?: boolean;
  auto_sync_deadlines?: boolean;
}

export interface SyncEventDTO {
  operation: 'create' | 'update' | 'delete' | 'sync_from_google';
  meetingId?: string;
  googleEventId?: string;
  meetingData?: {
    title: string;
    description?: string | null;
    location?: string | null;
    virtual_meeting_link?: string | null;
    meeting_date: string;
    start_time?: string | null;
    end_time?: string | null;
    duration_minutes?: number | null;
    attendees?: Array<{ email?: string; name: string }> | null;
  };
  sendNotifications?: boolean;
}

// =============================================================================
// STATISTICS
// =============================================================================

export interface CalendarSyncStats {
  totalSyncedMeetings: number;
  pendingSyncs: number;
  failedSyncs: number;
  lastSyncAt: string | null;
  syncsByDirection: {
    to_google: number;
    from_google: number;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if connection needs token refresh
 */
export function connectionNeedsRefresh(connection: GoogleCalendarConnection): boolean {
  if (!connection.token_expires_at) {return true;}
  const expiresAt = new Date(connection.token_expires_at);
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return Date.now() + bufferMs >= expiresAt.getTime();
}

/**
 * Check if connection needs full re-authorization
 */
export function connectionNeedsReconnect(connection: GoogleCalendarConnection): boolean {
  return !connection.is_active || !!connection.connection_error?.includes('reconnect');
}

/**
 * Get sync direction display label
 */
export function getSyncDirectionLabel(direction: 'to_google' | 'from_google' | 'bidirectional'): string {
  const labels: Record<string, string> = {
    to_google: 'App to Google',
    from_google: 'Google to App',
    bidirectional: 'Two-way sync',
  };
  return labels[direction] || direction;
}

/**
 * Get sync status color
 */
export function getSyncStatusColor(status: SyncStatus): string {
  const colors: Record<SyncStatus, string> = {
    synced: 'text-success bg-success-light',
    pending: 'text-warning bg-warning-light',
    failed: 'text-error bg-error-light',
    conflict: 'text-orange-600 bg-orange-100',
  };
  return colors[status] || 'text-secondary bg-muted';
}

/**
 * Get sync status display label
 */
export function getSyncStatusLabel(status: SyncStatus): string {
  const labels: Record<SyncStatus, string> = {
    synced: 'Synced',
    pending: 'Pending',
    failed: 'Failed',
    conflict: 'Conflict',
  };
  return labels[status] || status;
}
