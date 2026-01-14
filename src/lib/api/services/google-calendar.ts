/**
 * Google Calendar Integration API Service
 */

import { ApiErrorClass } from '../errors';
import { supabase } from '@/lib/supabase';
import type {
  GoogleCalendarConnection,
  GoogleCalendarConnectionStatus,
  GoogleCalendar,
  CalendarEventMapping,
  CalendarSyncQueueItem,
  CalendarSyncLog,
  CalendarSyncStats,
  CompleteGCalConnectionDTO,
  UpdateGCalConnectionDTO,
  SyncEventDTO,
} from '@/types/google-calendar';
import { logger } from '../../utils/logger';


export const googleCalendarApi = {
  // =============================================
  // CONNECTION MANAGEMENT
  // =============================================

  /**
   * Get connection status for current user
   */
  async getConnectionStatus(userId: string): Promise<GoogleCalendarConnectionStatus> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {throw error;}

      if (!data) {
        return {
          isConnected: false,
          connectionId: null,
          googleAccountEmail: null,
          googleAccountName: null,
          calendarId: null,
          calendarName: null,
          syncEnabled: false,
          syncDirection: 'bidirectional',
          lastSyncAt: null,
          isTokenExpired: false,
          needsReconnect: false,
          connectionError: null,
        };
      }

      const connection = data as GoogleCalendarConnection;
      const tokenExpiresAt = new Date(connection.token_expires_at);
      const isTokenExpired = Date.now() + 5 * 60 * 1000 >= tokenExpiresAt.getTime();

      return {
        isConnected: true,
        connectionId: connection.id,
        googleAccountEmail: connection.google_account_email,
        googleAccountName: connection.google_account_name,
        calendarId: connection.calendar_id,
        calendarName: connection.calendar_name,
        syncEnabled: connection.sync_enabled,
        syncDirection: connection.sync_direction,
        lastSyncAt: connection.last_sync_at,
        isTokenExpired,
        needsReconnect: !!connection.connection_error?.includes('reconnect'),
        connectionError: connection.connection_error,
      };
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_CONNECTION_STATUS_ERROR',
            message: 'Failed to get Google Calendar connection status',
          });
    }
  },

  /**
   * Get raw connection record
   */
  async getConnection(userId: string): Promise<GoogleCalendarConnection | null> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {throw error;}
      return data as GoogleCalendarConnection | null;
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_GET_CONNECTION_ERROR',
            message: 'Failed to get Google Calendar connection',
          });
    }
  },

  /**
   * Initiate OAuth flow - get authorization URL
   */
  async getAuthUrl(companyId: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('gcal-get-auth-url', {
        body: { companyId },
      });

      if (error) {throw error;}
      return data.authUrl;
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_AUTH_URL_ERROR',
            message: 'Failed to generate Google Calendar authorization URL',
          });
    }
  },

  /**
   * Complete OAuth flow - exchange code for tokens
   */
  async completeConnection(
    companyId: string,
    dto: CompleteGCalConnectionDTO
  ): Promise<{ connection: GoogleCalendarConnection; calendars: GoogleCalendar[] }> {
    try {
      const { data, error } = await supabase.functions.invoke('gcal-complete-oauth', {
        body: { companyId, ...dto },
      });

      if (error) {throw error;}
      return {
        connection: data.connection as GoogleCalendarConnection,
        calendars: data.calendars as GoogleCalendar[],
      };
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_COMPLETE_AUTH_ERROR',
            message: 'Failed to complete Google Calendar authorization',
          });
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(connectionId: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('gcal-refresh-token', {
        body: { connectionId },
      });

      if (error) {throw error;}

      if (data.requiresReconnect) {
        throw new ApiErrorClass({
          code: 'GCAL_REQUIRES_RECONNECT',
          message: data.error || 'Please reconnect to Google Calendar',
        });
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_REFRESH_TOKEN_ERROR',
            message: 'Failed to refresh Google Calendar token',
          });
    }
  },

  /**
   * Update connection settings
   */
  async updateConnection(
    connectionId: string,
    updates: UpdateGCalConnectionDTO
  ): Promise<GoogleCalendarConnection> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_connections')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .select()
        .single();

      if (error) {throw error;}
      return data as GoogleCalendarConnection;
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_UPDATE_CONNECTION_ERROR',
            message: 'Failed to update Google Calendar connection settings',
          });
    }
  },

  /**
   * Disconnect from Google Calendar
   */
  async disconnect(connectionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('google_calendar_connections')
        .update({
          is_active: false,
          sync_enabled: false,
          connection_error: 'Disconnected by user',
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);

      if (error) {throw error;}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_DISCONNECT_ERROR',
            message: 'Failed to disconnect from Google Calendar',
          });
    }
  },

  // =============================================
  // EVENT SYNC OPERATIONS
  // =============================================

  /**
   * Sync a meeting to Google Calendar
   */
  async syncMeeting(connectionId: string, dto: SyncEventDTO): Promise<{
    success: boolean;
    googleEventId?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('gcal-sync-event', {
        body: { connectionId, ...dto },
      });

      if (error) {throw error;}
      return {
        success: data.success,
        googleEventId: data.googleEventId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  },

  /**
   * Create Google Calendar event for a meeting
   */
  async createEventForMeeting(
    connectionId: string,
    meetingId: string,
    meetingData: SyncEventDTO['meetingData'],
    sendNotifications = true
  ): Promise<string | null> {
    try {
      const result = await this.syncMeeting(connectionId, {
        operation: 'create',
        meetingId,
        meetingData,
        sendNotifications,
      });

      return result.googleEventId || null;
    } catch (error) {
      logger.error('Error creating Google Calendar event:', error);
      return null;
    }
  },

  /**
   * Update Google Calendar event for a meeting
   */
  async updateEventForMeeting(
    connectionId: string,
    meetingId: string,
    googleEventId: string,
    meetingData: SyncEventDTO['meetingData'],
    sendNotifications = true
  ): Promise<boolean> {
    try {
      const result = await this.syncMeeting(connectionId, {
        operation: 'update',
        meetingId,
        googleEventId,
        meetingData,
        sendNotifications,
      });

      return result.success;
    } catch (error) {
      logger.error('Error updating Google Calendar event:', error);
      return false;
    }
  },

  /**
   * Delete Google Calendar event for a meeting
   */
  async deleteEventForMeeting(
    connectionId: string,
    meetingId: string,
    googleEventId: string,
    sendNotifications = true
  ): Promise<boolean> {
    try {
      const result = await this.syncMeeting(connectionId, {
        operation: 'delete',
        meetingId,
        googleEventId,
        sendNotifications,
      });

      return result.success;
    } catch (error) {
      logger.error('Error deleting Google Calendar event:', error);
      return false;
    }
  },

  // =============================================
  // EVENT MAPPINGS
  // =============================================

  /**
   * Get event mapping for a meeting
   */
  async getMeetingMapping(meetingId: string): Promise<CalendarEventMapping | null> {
    try {
      const { data, error } = await supabase
        .from('calendar_event_mappings')
        .select('*')
        .eq('local_entity_type', 'meeting')
        .eq('local_entity_id', meetingId)
        .maybeSingle();

      if (error) {throw error;}
      return data as CalendarEventMapping | null;
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_GET_MAPPING_ERROR',
            message: 'Failed to get event mapping',
          });
    }
  },

  /**
   * Get all event mappings for a connection
   */
  async getEventMappings(
    connectionId: string,
    options?: {
      entityType?: string;
      status?: string;
      limit?: number;
    }
  ): Promise<CalendarEventMapping[]> {
    try {
      let query = supabase
        .from('calendar_event_mappings')
        .select('*')
        .eq('connection_id', connectionId);

      if (options?.entityType) {
        query = query.eq('local_entity_type', options.entityType);
      }
      if (options?.status) {
        query = query.eq('sync_status', options.status);
      }

      query = query.order('updated_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {throw error;}
      return data as CalendarEventMapping[];
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_GET_MAPPINGS_ERROR',
            message: 'Failed to get event mappings',
          });
    }
  },

  // =============================================
  // SYNC QUEUE
  // =============================================

  /**
   * Get pending sync items
   */
  async getPendingSyncs(
    connectionId: string,
    options?: {
      status?: string;
      limit?: number;
    }
  ): Promise<CalendarSyncQueueItem[]> {
    try {
      let query = supabase
        .from('calendar_sync_queue')
        .select('*')
        .eq('connection_id', connectionId);

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      query = query
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {throw error;}
      return data as CalendarSyncQueueItem[];
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_GET_PENDING_SYNCS_ERROR',
            message: 'Failed to get pending syncs',
          });
    }
  },

  /**
   * Cancel a pending sync
   */
  async cancelPendingSync(syncId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calendar_sync_queue')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', syncId);

      if (error) {throw error;}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_CANCEL_SYNC_ERROR',
            message: 'Failed to cancel sync',
          });
    }
  },

  // =============================================
  // SYNC LOGS
  // =============================================

  /**
   * Get sync logs
   */
  async getSyncLogs(
    connectionId: string,
    options?: {
      status?: string;
      entityType?: string;
      limit?: number;
    }
  ): Promise<CalendarSyncLog[]> {
    try {
      let query = supabase
        .from('calendar_sync_logs')
        .select('*')
        .eq('connection_id', connectionId);

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.entityType) {
        query = query.eq('entity_type', options.entityType);
      }

      query = query.order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {throw error;}
      return data as CalendarSyncLog[];
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_GET_LOGS_ERROR',
            message: 'Failed to get sync logs',
          });
    }
  },

  // =============================================
  // STATISTICS
  // =============================================

  /**
   * Get sync statistics
   */
  async getSyncStats(connectionId: string): Promise<CalendarSyncStats> {
    try {
      // Get synced meetings count
      const { count: syncedCount, error: syncedError } = await supabase
        .from('calendar_event_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('connection_id', connectionId)
        .eq('sync_status', 'synced');

      if (syncedError) {throw syncedError;}

      // Get pending syncs count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('calendar_sync_queue')
        .select('*', { count: 'exact', head: true })
        .eq('connection_id', connectionId)
        .eq('status', 'pending');

      if (pendingError) {throw pendingError;}

      // Get failed syncs count
      const { count: failedCount, error: failedError } = await supabase
        .from('calendar_event_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('connection_id', connectionId)
        .eq('sync_status', 'failed');

      if (failedError) {throw failedError;}

      // Get last sync time
      const { data: lastLog, error: logError } = await supabase
        .from('calendar_sync_logs')
        .select('created_at, direction')
        .eq('connection_id', connectionId)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logError) {throw logError;}

      // Get syncs by direction
      const { data: directionCounts, error: dirError } = await supabase
        .from('calendar_sync_logs')
        .select('direction')
        .eq('connection_id', connectionId)
        .eq('status', 'success');

      if (dirError) {throw dirError;}

      const toGoogle = (directionCounts || []).filter(
        (d: { direction: string }) => d.direction === 'to_google'
      ).length;
      const fromGoogle = (directionCounts || []).filter(
        (d: { direction: string }) => d.direction === 'from_google'
      ).length;

      return {
        totalSyncedMeetings: syncedCount || 0,
        pendingSyncs: pendingCount || 0,
        failedSyncs: failedCount || 0,
        lastSyncAt: lastLog?.created_at || null,
        syncsByDirection: {
          to_google: toGoogle,
          from_google: fromGoogle,
        },
      };
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'GCAL_GET_STATS_ERROR',
            message: 'Failed to get sync statistics',
          });
    }
  },
};
