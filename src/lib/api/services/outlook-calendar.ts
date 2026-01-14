/**
 * Outlook Calendar Integration API Service
 *
 * Client-side API for Microsoft Graph calendar integration via Supabase Edge Functions.
 */

import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import {
  outlookConnectionNeedsRefresh,
  outlookConnectionNeedsReauth,
} from '@/types/outlook-calendar'
import type {
  OutlookCalendarConnection,
  OutlookEventMapping,
  OutlookSyncLog,
  OutlookConnectionStatus,
  OutlookSyncStats,
  OutlookSyncDashboard,
  OutlookCalendar,
  CompleteOutlookOAuthDTO,
  UpdateOutlookConnectionDTO,
  SyncOutlookEventDTO,
  BulkOutlookSyncDTO,
  OutlookEntityType,
  OutlookSyncStatus,
} from '@/types/outlook-calendar'

export const outlookCalendarApi = {
  // =============================================
  // CONNECTION MANAGEMENT
  // =============================================

  /**
   * Get connection status for current user
   */
  async getConnectionStatus(userId: string): Promise<OutlookConnectionStatus> {
    try {
      const { data, error } = await supabase
        .from('outlook_calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {throw error}

      if (!data) {
        return {
          isConnected: false,
          connectionId: null,
          email: null,
          displayName: null,
          calendarName: null,
          lastSyncAt: null,
          tokenExpiresAt: null,
          isTokenExpired: false,
          needsReauth: false,
          connectionError: null,
          autoSyncEnabled: true,
          syncFrequencyMinutes: 15,
          syncDirection: 'bidirectional',
          syncSettings: {
            meetings: true,
            inspections: true,
            tasks: false,
            milestones: true,
          },
        }
      }

      const connection = data as OutlookCalendarConnection
      return {
        isConnected: true,
        connectionId: connection.id,
        email: connection.email,
        displayName: connection.display_name,
        calendarName: connection.calendar_name,
        lastSyncAt: connection.last_sync_at,
        tokenExpiresAt: connection.token_expires_at,
        isTokenExpired: outlookConnectionNeedsRefresh(connection),
        needsReauth: outlookConnectionNeedsReauth(connection),
        connectionError: connection.connection_error,
        autoSyncEnabled: connection.auto_sync_enabled,
        syncFrequencyMinutes: connection.sync_frequency_minutes,
        syncDirection: connection.sync_direction,
        syncSettings: {
          meetings: connection.sync_meetings,
          inspections: connection.sync_inspections,
          tasks: connection.sync_tasks,
          milestones: connection.sync_milestones,
        },
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_CONNECTION_STATUS_ERROR',
            message: 'Failed to get Outlook connection status',
          })
    }
  },

  /**
   * Get raw connection record
   */
  async getConnection(userId: string): Promise<OutlookCalendarConnection | null> {
    try {
      const { data, error } = await supabase
        .from('outlook_calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {throw error}
      return data as OutlookCalendarConnection | null
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_GET_CONNECTION_ERROR',
            message: 'Failed to get Outlook connection',
          })
    }
  },

  /**
   * Initiate OAuth flow - get authorization URL
   */
  async getAuthUrl(companyId: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('outlook-get-auth-url', {
        body: { companyId },
      })

      if (error) {throw error}
      return data.authUrl
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_AUTH_URL_ERROR',
            message: 'Failed to generate Outlook authorization URL',
          })
    }
  },

  /**
   * Complete OAuth flow - exchange code for tokens
   */
  async completeConnection(dto: CompleteOutlookOAuthDTO): Promise<{
    connection: OutlookCalendarConnection
    calendars: OutlookCalendar[]
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('outlook-complete-oauth', {
        body: dto,
      })

      if (error) {throw error}
      return {
        connection: data.connection as OutlookCalendarConnection,
        calendars: data.calendars as OutlookCalendar[],
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_COMPLETE_AUTH_ERROR',
            message: 'Failed to complete Outlook authorization',
          })
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(connectionId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('outlook-refresh-token', {
        body: { connectionId },
      })

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_REFRESH_TOKEN_ERROR',
            message: 'Failed to refresh Outlook token',
          })
    }
  },

  /**
   * Update connection settings
   */
  async updateConnection(
    connectionId: string,
    updates: UpdateOutlookConnectionDTO
  ): Promise<OutlookCalendarConnection> {
    try {
      const { data, error } = await supabase
        .from('outlook_calendar_connections')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .select()
        .single()

      if (error) {throw error}
      return data as OutlookCalendarConnection
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_UPDATE_CONNECTION_ERROR',
            message: 'Failed to update Outlook connection settings',
          })
    }
  },

  /**
   * Disconnect from Outlook
   */
  async disconnect(connectionId: string): Promise<void> {
    try {
      // Soft delete - mark as inactive
      const { error } = await supabase
        .from('outlook_calendar_connections')
        .update({
          is_active: false,
          access_token: null,
          refresh_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_DISCONNECT_ERROR',
            message: 'Failed to disconnect from Outlook',
          })
    }
  },

  // =============================================
  // EVENT MAPPINGS
  // =============================================

  /**
   * Get event mapping for a specific local entity
   */
  async getEventMapping(
    userId: string,
    localEntityType: string,
    localEntityId: string
  ): Promise<OutlookEventMapping | null> {
    try {
      const { data, error } = await supabase
        .from('outlook_event_mappings')
        .select('*')
        .eq('user_id', userId)
        .eq('local_entity_type', localEntityType)
        .eq('local_entity_id', localEntityId)
        .maybeSingle()

      if (error) {throw error}
      return data as OutlookEventMapping | null
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_GET_MAPPING_ERROR',
            message: 'Failed to get event mapping',
          })
    }
  },

  /**
   * Get all event mappings for a user
   */
  async getEventMappings(
    userId: string,
    options?: {
      entityType?: OutlookEntityType
      status?: OutlookSyncStatus
      projectId?: string
      limit?: number
    }
  ): Promise<OutlookEventMapping[]> {
    try {
      let query = supabase
        .from('outlook_event_mappings')
        .select('*')
        .eq('user_id', userId)

      if (options?.entityType) {
        query = query.eq('local_entity_type', options.entityType)
      }
      if (options?.status) {
        query = query.eq('sync_status', options.status)
      }
      if (options?.projectId) {
        query = query.eq('project_id', options.projectId)
      }

      query = query.order('updated_at', { ascending: false })

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {throw error}
      return data as OutlookEventMapping[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_GET_MAPPINGS_ERROR',
            message: 'Failed to get event mappings',
          })
    }
  },

  // =============================================
  // SYNC OPERATIONS
  // =============================================

  /**
   * Sync a single event to/from Outlook
   */
  async syncEvent(
    connectionId: string,
    dto: SyncOutlookEventDTO
  ): Promise<OutlookEventMapping> {
    try {
      const { data, error } = await supabase.functions.invoke('outlook-sync-event', {
        body: { connectionId, ...dto },
      })

      if (error) {throw error}
      return data.mapping as OutlookEventMapping
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_SYNC_EVENT_ERROR',
            message: 'Failed to sync event to Outlook',
          })
    }
  },

  /**
   * Bulk sync events
   */
  async bulkSync(
    connectionId: string,
    dto: BulkOutlookSyncDTO
  ): Promise<{ success: number; failed: number; logId: string }> {
    try {
      // Get entities to sync based on type and optional IDs/project
      const entityIds = dto.entityIds || []

      if (!entityIds.length && dto.projectId) {
        // Get all entities of type for project
        const tableMap: Record<OutlookEntityType, string> = {
          meeting: 'meetings',
          inspection: 'inspections',
          task: 'tasks',
          milestone: 'schedule_activities',
          schedule_activity: 'schedule_activities',
        }

        const { data: entities } = await supabase
          .from(tableMap[dto.entityType])
          .select('id')
          .eq('project_id', dto.projectId)
          .limit(100)

        if (entities) {
          entityIds.push(...entities.map((e: { id: string }) => e.id))
        }
      }

      let success = 0
      let failed = 0

      // Sync each entity
      for (const entityId of entityIds) {
        try {
          await this.syncEvent(connectionId, {
            entityType: dto.entityType,
            entityId,
            direction: dto.direction,
          })
          success++
        } catch {
          failed++
        }
      }

      return { success, failed, logId: '' }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_BULK_SYNC_ERROR',
            message: 'Failed to bulk sync events',
          })
    }
  },

  /**
   * Delete event mapping and optionally the Outlook event
   */
  async deleteEventMapping(
    connectionId: string,
    entityType: OutlookEntityType,
    entityId: string,
    deleteOutlookEvent: boolean = true
  ): Promise<void> {
    try {
      if (deleteOutlookEvent) {
        await this.syncEvent(connectionId, {
          entityType,
          entityId,
          action: 'delete',
        })
      } else {
        // Just remove the mapping
        await supabase
          .from('outlook_event_mappings')
          .delete()
          .eq('connection_id', connectionId)
          .eq('local_entity_type', entityType)
          .eq('local_entity_id', entityId)
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_DELETE_MAPPING_ERROR',
            message: 'Failed to delete event mapping',
          })
    }
  },

  // =============================================
  // SYNC LOGS
  // =============================================

  /**
   * Get sync logs
   */
  async getSyncLogs(
    userId: string,
    options?: {
      connectionId?: string
      entityType?: OutlookEntityType
      status?: OutlookSyncStatus
      limit?: number
    }
  ): Promise<OutlookSyncLog[]> {
    try {
      let query = supabase
        .from('outlook_sync_logs')
        .select('*')
        .eq('user_id', userId)

      if (options?.connectionId) {
        query = query.eq('connection_id', options.connectionId)
      }
      if (options?.entityType) {
        query = query.eq('entity_type', options.entityType)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }

      query = query.order('started_at', { ascending: false })

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {throw error}
      return data as OutlookSyncLog[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_GET_LOGS_ERROR',
            message: 'Failed to get sync logs',
          })
    }
  },

  // =============================================
  // DASHBOARD STATS
  // =============================================

  /**
   * Get sync statistics
   */
  async getSyncStats(userId: string): Promise<OutlookSyncStats> {
    try {
      // Get total mapped events count
      const { count: totalMapped, error: mappedError } = await supabase
        .from('outlook_event_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (mappedError) {throw mappedError}

      // Get pending syncs count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('outlook_event_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('sync_status', 'pending')

      if (pendingError) {throw pendingError}

      // Get failed syncs count
      const { count: failedCount, error: failedError } = await supabase
        .from('outlook_event_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('sync_status', 'failed')

      if (failedError) {throw failedError}

      // Get last sync time
      const { data: lastLog, error: logError } = await supabase
        .from('outlook_sync_logs')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('status', 'synced')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (logError) {throw logError}

      // Get counts by entity type
      const { data: entityCounts, error: entityError } = await supabase
        .from('outlook_event_mappings')
        .select('local_entity_type, sync_status')
        .eq('user_id', userId)

      if (entityError) {throw entityError}

      // Aggregate by entity type
      const syncsByEntityType: OutlookSyncStats['syncsByEntityType'] = {
        meeting: { total: 0, synced: 0, pending: 0, failed: 0 },
        inspection: { total: 0, synced: 0, pending: 0, failed: 0 },
        task: { total: 0, synced: 0, pending: 0, failed: 0 },
        milestone: { total: 0, synced: 0, pending: 0, failed: 0 },
        schedule_activity: { total: 0, synced: 0, pending: 0, failed: 0 },
      }

      const entityTypes: OutlookEntityType[] = ['meeting', 'inspection', 'task', 'milestone', 'schedule_activity']

      entityTypes.forEach(type => {
        const items = (entityCounts as Array<{ local_entity_type: string; sync_status: string }>)?.filter(
          (e) => e.local_entity_type === type
        ) || []
        syncsByEntityType[type] = {
          total: items.length,
          synced: items.filter(e => e.sync_status === 'synced').length,
          pending: items.filter(e => e.sync_status === 'pending').length,
          failed: items.filter(e => e.sync_status === 'failed').length,
        }
      })

      return {
        totalMappedEvents: totalMapped || 0,
        pendingSyncs: pendingCount || 0,
        failedSyncs: failedCount || 0,
        lastSyncAt: lastLog?.completed_at || null,
        syncsByEntityType,
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_GET_STATS_ERROR',
            message: 'Failed to get sync statistics',
          })
    }
  },

  /**
   * Get full dashboard data
   */
  async getDashboard(userId: string, _companyId: string): Promise<OutlookSyncDashboard> {
    try {
      const [connection, stats, recentLogs, mappings] = await Promise.all([
        this.getConnectionStatus(userId),
        this.getSyncStats(userId),
        this.getSyncLogs(userId, { limit: 10 }),
        this.getEventMappings(userId, { limit: 20 }),
      ])

      return {
        connection,
        stats,
        recentLogs,
        upcomingSyncEvents: mappings,
        availableCalendars: [], // Would need to fetch from connection
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'OUTLOOK_GET_DASHBOARD_ERROR',
            message: 'Failed to get Outlook dashboard data',
          })
    }
  },
}
