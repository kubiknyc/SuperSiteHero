// File: /src/lib/api/services/quickbooks.ts
// QuickBooks Online Integration API service

import { ApiErrorClass } from '../errors'
import { supabase, supabaseUntyped } from '@/lib/supabase'
import {
  connectionNeedsRefresh,
  connectionNeedsReauth,
} from '@/types/quickbooks'
import type {
  QBConnection,
  QBAccountMapping,
  QBEntityMapping,
  QBSyncLog,
  QBPendingSync,
  QBConnectionStatus,
  QBSyncStats,
  QBSyncDashboard,
  QBAccount,
  CompleteQBConnectionDTO,
  UpdateQBConnectionDTO,
  CreateQBAccountMappingDTO,
  SyncEntityDTO,
  BulkSyncDTO,
  QBEntityType,
} from '@/types/quickbooks'

export const quickbooksApi = {
  // =============================================
  // CONNECTION MANAGEMENT
  // =============================================

  /**
   * Get connection status for a company
   */
  async getConnectionStatus(companyId: string): Promise<QBConnectionStatus> {
    try {
      const { data, error } = await supabaseUntyped
        .from('qb_connections')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {throw error}

      if (!data) {
        return {
          isConnected: false,
          connectionId: null,
          companyName: null,
          realmId: null,
          isSandbox: false,
          lastSyncAt: null,
          tokenExpiresAt: null,
          isTokenExpired: false,
          needsReauth: false,
          connectionError: null,
          autoSyncEnabled: false,
          syncFrequencyHours: 24,
        }
      }

      const connection = data as QBConnection
      return {
        isConnected: true,
        connectionId: connection.id,
        companyName: connection.company_name,
        realmId: connection.realm_id,
        isSandbox: connection.is_sandbox,
        lastSyncAt: connection.last_sync_at,
        tokenExpiresAt: connection.token_expires_at,
        isTokenExpired: connectionNeedsRefresh(connection),
        needsReauth: connectionNeedsReauth(connection),
        connectionError: connection.connection_error,
        autoSyncEnabled: connection.auto_sync_enabled,
        syncFrequencyHours: connection.sync_frequency_hours,
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_CONNECTION_STATUS_ERROR',
            message: 'Failed to get QuickBooks connection status',
          })
    }
  },

  /**
   * Get raw connection record
   */
  async getConnection(companyId: string): Promise<QBConnection | null> {
    try {
      const { data, error } = await supabaseUntyped
        .from('qb_connections')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {throw error}
      return data as QBConnection | null
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_GET_CONNECTION_ERROR',
            message: 'Failed to get QuickBooks connection',
          })
    }
  },

  /**
   * Initiate OAuth flow - get authorization URL
   */
  async getAuthUrl(companyId: string, isSandbox: boolean = false): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('qb-get-auth-url', {
        body: { companyId, isSandbox },
      })

      if (error) {throw error}
      return data.authUrl
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_AUTH_URL_ERROR',
            message: 'Failed to generate QuickBooks authorization URL',
          })
    }
  },

  /**
   * Complete OAuth flow - exchange code for tokens
   */
  async completeConnection(
    companyId: string,
    dto: CompleteQBConnectionDTO
  ): Promise<QBConnection> {
    try {
      const { data, error } = await supabase.functions.invoke('qb-complete-oauth', {
        body: { companyId, ...dto },
      })

      if (error) {throw error}
      return data.connection as QBConnection
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_COMPLETE_AUTH_ERROR',
            message: 'Failed to complete QuickBooks authorization',
          })
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(connectionId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('qb-refresh-token', {
        body: { connectionId },
      })

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_REFRESH_TOKEN_ERROR',
            message: 'Failed to refresh QuickBooks token',
          })
    }
  },

  /**
   * Update connection settings
   */
  async updateConnection(
    connectionId: string,
    updates: UpdateQBConnectionDTO
  ): Promise<QBConnection> {
    try {
      const { data, error } = await supabaseUntyped
        .from('qb_connections')
        .update(updates)
        .eq('id', connectionId)
        .select()
        .single()

      if (error) {throw error}
      return data as QBConnection
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_UPDATE_CONNECTION_ERROR',
            message: 'Failed to update QuickBooks connection settings',
          })
    }
  },

  /**
   * Disconnect from QuickBooks
   */
  async disconnect(connectionId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('qb-disconnect', {
        body: { connectionId },
      })

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_DISCONNECT_ERROR',
            message: 'Failed to disconnect from QuickBooks',
          })
    }
  },

  // =============================================
  // ACCOUNT MAPPINGS
  // =============================================

  /**
   * Get all account mappings for a company
   */
  async getAccountMappings(
    companyId: string,
    connectionId?: string
  ): Promise<QBAccountMapping[]> {
    try {
      let query = supabaseUntyped
        .from('qb_account_mappings')
        .select(`
          *,
          cost_code_details:cost_codes(id, code, name, division)
        `)
        .eq('company_id', companyId)

      if (connectionId) {
        query = query.eq('connection_id', connectionId)
      }

      const { data, error } = await query.order('cost_code', { ascending: true })

      if (error) {throw error}
      return data as QBAccountMapping[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_GET_MAPPINGS_ERROR',
            message: 'Failed to get account mappings',
          })
    }
  },

  /**
   * Create an account mapping
   */
  async createAccountMapping(
    companyId: string,
    connectionId: string,
    mapping: CreateQBAccountMappingDTO
  ): Promise<QBAccountMapping> {
    try {
      const { data, error } = await supabaseUntyped
        .from('qb_account_mappings')
        .insert({
          company_id: companyId,
          connection_id: connectionId,
          ...mapping,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as QBAccountMapping
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_CREATE_MAPPING_ERROR',
            message: 'Failed to create account mapping',
          })
    }
  },

  /**
   * Update an account mapping
   */
  async updateAccountMapping(
    mappingId: string,
    updates: Partial<CreateQBAccountMappingDTO>
  ): Promise<QBAccountMapping> {
    try {
      const { data, error } = await supabaseUntyped
        .from('qb_account_mappings')
        .update(updates)
        .eq('id', mappingId)
        .select()
        .single()

      if (error) {throw error}
      return data as QBAccountMapping
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_UPDATE_MAPPING_ERROR',
            message: 'Failed to update account mapping',
          })
    }
  },

  /**
   * Delete an account mapping
   */
  async deleteAccountMapping(mappingId: string): Promise<void> {
    try {
      const { error } = await supabaseUntyped
        .from('qb_account_mappings')
        .delete()
        .eq('id', mappingId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_DELETE_MAPPING_ERROR',
            message: 'Failed to delete account mapping',
          })
    }
  },

  /**
   * Set a mapping as the default for unmapped cost codes
   */
  async setDefaultMapping(mappingId: string, connectionId: string): Promise<void> {
    try {
      // First, clear any existing default
      await supabaseUntyped
        .from('qb_account_mappings')
        .update({ is_default: false })
        .eq('connection_id', connectionId)
        .eq('is_default', true)

      // Set the new default
      const { error } = await supabaseUntyped
        .from('qb_account_mappings')
        .update({ is_default: true })
        .eq('id', mappingId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_SET_DEFAULT_MAPPING_ERROR',
            message: 'Failed to set default mapping',
          })
    }
  },

  // =============================================
  // ENTITY MAPPINGS
  // =============================================

  /**
   * Get entity mapping by local entity
   */
  async getEntityMapping(
    companyId: string,
    localEntityType: string,
    localEntityId: string
  ): Promise<QBEntityMapping | null> {
    try {
      const { data, error } = await supabaseUntyped
        .from('qb_entity_mappings')
        .select('*')
        .eq('company_id', companyId)
        .eq('local_entity_type', localEntityType)
        .eq('local_entity_id', localEntityId)
        .maybeSingle()

      if (error) {throw error}
      return data as QBEntityMapping | null
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_GET_ENTITY_MAPPING_ERROR',
            message: 'Failed to get entity mapping',
          })
    }
  },

  /**
   * Get all entity mappings for a company
   */
  async getEntityMappings(
    companyId: string,
    options?: {
      entityType?: string
      status?: string
      limit?: number
    }
  ): Promise<QBEntityMapping[]> {
    try {
      let query = supabaseUntyped
        .from('qb_entity_mappings')
        .select('*')
        .eq('company_id', companyId)

      if (options?.entityType) {
        query = query.eq('local_entity_type', options.entityType)
      }
      if (options?.status) {
        query = query.eq('sync_status', options.status)
      }

      query = query.order('updated_at', { ascending: false })

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {throw error}
      return data as QBEntityMapping[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_GET_ENTITY_MAPPINGS_ERROR',
            message: 'Failed to get entity mappings',
          })
    }
  },

  // =============================================
  // SYNC OPERATIONS
  // =============================================

  /**
   * Fetch QuickBooks accounts (Chart of Accounts)
   */
  async getQBAccounts(connectionId: string): Promise<QBAccount[]> {
    try {
      const { data, error } = await supabase.functions.invoke('qb-get-accounts', {
        body: { connectionId },
      })

      if (error) {throw error}
      return data.accounts as QBAccount[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_GET_ACCOUNTS_ERROR',
            message: 'Failed to fetch QuickBooks accounts',
          })
    }
  },

  /**
   * Sync a single entity to/from QuickBooks
   */
  async syncEntity(connectionId: string, dto: SyncEntityDTO): Promise<QBEntityMapping> {
    try {
      const { data, error } = await supabase.functions.invoke('qb-sync-entity', {
        body: { connectionId, ...dto },
      })

      if (error) {throw error}
      return data.mapping as QBEntityMapping
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_SYNC_ENTITY_ERROR',
            message: 'Failed to sync entity to QuickBooks',
          })
    }
  },

  /**
   * Bulk sync entities
   */
  async bulkSync(
    connectionId: string,
    dto: BulkSyncDTO
  ): Promise<{ success: number; failed: number; logId: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('qb-bulk-sync', {
        body: { connectionId, ...dto },
      })

      if (error) {throw error}
      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_BULK_SYNC_ERROR',
            message: 'Failed to bulk sync entities',
          })
    }
  },

  /**
   * Queue entity for sync
   */
  async queueForSync(
    companyId: string,
    connectionId: string,
    localEntityType: string,
    localEntityId: string,
    priority: number = 5
  ): Promise<QBPendingSync> {
    try {
      const { data, error } = await supabaseUntyped
        .from('qb_pending_syncs')
        .insert({
          company_id: companyId,
          connection_id: connectionId,
          local_entity_type: localEntityType,
          local_entity_id: localEntityId,
          direction: 'to_quickbooks',
          priority,
          status: 'pending',
        })
        .select()
        .single()

      if (error) {throw error}
      return data as QBPendingSync
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_QUEUE_SYNC_ERROR',
            message: 'Failed to queue entity for sync',
          })
    }
  },

  /**
   * Retry a failed sync
   */
  async retrySync(pendingSyncId: string): Promise<void> {
    try {
      const { error } = await supabaseUntyped
        .from('qb_pending_syncs')
        .update({
          status: 'pending',
          last_error: null,
        })
        .eq('id', pendingSyncId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_RETRY_SYNC_ERROR',
            message: 'Failed to retry sync',
          })
    }
  },

  /**
   * Cancel a pending sync
   */
  async cancelPendingSync(pendingSyncId: string): Promise<void> {
    try {
      const { error } = await supabaseUntyped
        .from('qb_pending_syncs')
        .delete()
        .eq('id', pendingSyncId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_CANCEL_SYNC_ERROR',
            message: 'Failed to cancel pending sync',
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
    companyId: string,
    options?: {
      connectionId?: string
      entityType?: QBEntityType
      status?: string
      limit?: number
    }
  ): Promise<QBSyncLog[]> {
    try {
      let query = supabaseUntyped
        .from('qb_sync_logs')
        .select('*')
        .eq('company_id', companyId)

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
      return data as QBSyncLog[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_GET_LOGS_ERROR',
            message: 'Failed to get sync logs',
          })
    }
  },

  /**
   * Get a single sync log with details
   */
  async getSyncLog(logId: string): Promise<QBSyncLog> {
    try {
      const { data, error } = await supabaseUntyped
        .from('qb_sync_logs')
        .select('*')
        .eq('id', logId)
        .single()

      if (error) {throw error}
      return data as QBSyncLog
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_GET_LOG_ERROR',
            message: 'Failed to get sync log',
          })
    }
  },

  // =============================================
  // PENDING SYNCS
  // =============================================

  /**
   * Get pending syncs
   */
  async getPendingSyncs(
    companyId: string,
    options?: {
      status?: string
      entityType?: string
      limit?: number
    }
  ): Promise<QBPendingSync[]> {
    try {
      let query = supabaseUntyped
        .from('qb_pending_syncs')
        .select('*')
        .eq('company_id', companyId)

      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.entityType) {
        query = query.eq('local_entity_type', options.entityType)
      }

      query = query.order('priority', { ascending: false })
               .order('created_at', { ascending: true })

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {throw error}
      return data as QBPendingSync[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_GET_PENDING_SYNCS_ERROR',
            message: 'Failed to get pending syncs',
          })
    }
  },

  // =============================================
  // DASHBOARD STATS
  // =============================================

  /**
   * Get sync statistics
   */
  async getSyncStats(companyId: string): Promise<QBSyncStats> {
    try {
      // Get total mapped entities count
      const { count: totalMapped, error: mappedError } = await supabaseUntyped
        .from('qb_entity_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      if (mappedError) {throw mappedError}

      // Get pending syncs count
      const { count: pendingCount, error: pendingError } = await supabaseUntyped
        .from('qb_pending_syncs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending')

      if (pendingError) {throw pendingError}

      // Get failed syncs count
      const { count: failedCount, error: failedError } = await supabaseUntyped
        .from('qb_entity_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('sync_status', 'failed')

      if (failedError) {throw failedError}

      // Get last sync time
      const { data: lastLog, error: logError } = await supabaseUntyped
        .from('qb_sync_logs')
        .select('completed_at')
        .eq('company_id', companyId)
        .eq('status', 'synced')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (logError) {throw logError}

      // Get counts by entity type
      const { data: entityCounts, error: entityError } = await supabaseUntyped
        .from('qb_entity_mappings')
        .select('qb_entity_type, sync_status')
        .eq('company_id', companyId)

      if (entityError) {throw entityError}

      // Aggregate by entity type
      const syncsByEntityType: QBSyncStats['syncsByEntityType'] = {} as QBSyncStats['syncsByEntityType']
      const entityTypes: QBEntityType[] = ['vendor', 'customer', 'invoice', 'bill', 'payment', 'expense', 'account', 'journal_entry']

      entityTypes.forEach(type => {
        const items = (entityCounts as Array<{ qb_entity_type: string; sync_status: string }>)?.filter(
          (e) => e.qb_entity_type === type
        ) || []
        syncsByEntityType[type] = {
          total: items.length,
          synced: items.filter(e => e.sync_status === 'synced').length,
          pending: items.filter(e => e.sync_status === 'pending').length,
          failed: items.filter(e => e.sync_status === 'failed').length,
        }
      })

      return {
        totalMappedEntities: totalMapped || 0,
        pendingSyncs: pendingCount || 0,
        failedSyncs: failedCount || 0,
        lastSyncAt: lastLog?.completed_at || null,
        syncsByEntityType,
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_GET_STATS_ERROR',
            message: 'Failed to get sync statistics',
          })
    }
  },

  /**
   * Get full dashboard data
   */
  async getDashboard(companyId: string): Promise<QBSyncDashboard> {
    try {
      const [connection, stats, recentLogs, pendingItems] = await Promise.all([
        this.getConnectionStatus(companyId),
        this.getSyncStats(companyId),
        this.getSyncLogs(companyId, { limit: 10 }),
        this.getPendingSyncs(companyId, { limit: 20 }),
      ])

      return {
        connection,
        stats,
        recentLogs,
        pendingItems,
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'QB_GET_DASHBOARD_ERROR',
            message: 'Failed to get QuickBooks dashboard data',
          })
    }
  },
}
