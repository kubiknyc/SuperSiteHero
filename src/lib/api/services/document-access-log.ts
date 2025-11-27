// File: /src/lib/api/services/document-access-log.ts
// API service for document access logging

import { supabase } from '@/lib/supabase'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// Define types locally since document_access_log table may not be in generated types yet
export interface DocumentAccessLog {
  id: string
  document_id: string
  user_id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
  project_id: string
}

export interface DocumentAccessLogInsert {
  id?: string
  document_id: string
  user_id: string
  action: string
  details?: Record<string, unknown> | null
  created_at?: string
  project_id: string
}

export type AccessAction = 'view' | 'download' | 'print' | 'share' | 'edit' | 'revert'

export interface AccessLogEntry extends DocumentAccessLog {
  user?: {
    id: string
    full_name: string | null
    email: string | null
  }
}

export interface LogAccessInput {
  documentId: string
  projectId: string
  action: AccessAction
  details?: {
    versionId?: string
    versionNumber?: string
    ipAddress?: string
    userAgent?: string
    [key: string]: unknown
  }
}

/**
 * Document Access Log API
 *
 * Tracks and retrieves document access history for audit purposes.
 */
export const documentAccessLogApi = {
  /**
   * Log an access event for a document
   *
   * @param input - Access log input
   * @returns The created log entry
   *
   * Usage:
   * ```ts
   * await documentAccessLogApi.logAccess({
   *   documentId: 'doc-123',
   *   projectId: 'proj-456',
   *   action: 'view',
   *   details: { versionId: 'v-789' }
   * })
   * ```
   */
  async logAccess(input: LogAccessInput): Promise<DocumentAccessLog | null> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('Cannot log access: User not authenticated')
      return null
    }

    const { data, error} = await db
      .from('document_access_log')
      .insert({
        document_id: input.documentId,
        project_id: input.projectId,
        user_id: user.id,
        action: input.action,
        details: (input.details as any) || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging document access:', error)
      // Don't throw - access logging shouldn't break the app
      return null
    }

    return data
  },

  /**
   * Get access log for a document
   *
   * @param documentId - The document ID
   * @param options - Optional filters
   * @returns Array of access log entries
   *
   * Usage:
   * ```ts
   * const logs = await documentAccessLogApi.getAccessLog('doc-123', {
   *   limit: 50,
   *   action: 'download'
   * })
   * ```
   */
  async getAccessLog(
    documentId: string,
    options?: {
      limit?: number
      offset?: number
      action?: AccessAction
      userId?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<AccessLogEntry[]> {
    let query = db
      .from('document_access_log')
      .select(`
        *,
        user:users!document_access_log_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (options?.action) {
      query = query.eq('action', options.action)
    }

    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate)
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching access log:', error)
      throw error
    }

    return (data || []) as unknown as AccessLogEntry[]
  },

  /**
   * Get access statistics for a document
   *
   * @param documentId - The document ID
   * @returns Access statistics
   *
   * Usage:
   * ```ts
   * const stats = await documentAccessLogApi.getAccessStats('doc-123')
   * // { totalViews: 42, uniqueViewers: 8, lastAccessed: '2025-11-25T...' }
   * ```
   */
  async getAccessStats(documentId: string): Promise<{
    totalViews: number
    totalDownloads: number
    uniqueViewers: number
    lastAccessed: string | null
    accessByAction: Record<string, number>
  }> {
    const { data, error } = await db
      .from('document_access_log')
      .select('action, user_id, created_at')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching access stats:', error)
      throw error
    }

    const logs = (data || []) as Array<{ action: string; user_id: string; created_at: string }>
    const uniqueUsers = new Set(logs.map((l) => l.user_id))
    const accessByAction: Record<string, number> = {}

    logs.forEach((log) => {
      accessByAction[log.action] = (accessByAction[log.action] || 0) + 1
    })

    return {
      totalViews: accessByAction['view'] || 0,
      totalDownloads: accessByAction['download'] || 0,
      uniqueViewers: uniqueUsers.size,
      lastAccessed: logs[0]?.created_at || null,
      accessByAction,
    }
  },

  /**
   * Get recent activity across all documents in a project
   *
   * @param projectId - The project ID
   * @param limit - Maximum entries to return
   * @returns Array of recent access log entries
   */
  async getProjectActivity(
    projectId: string,
    limit: number = 50
  ): Promise<AccessLogEntry[]> {
    const { data, error } = await db
      .from('document_access_log')
      .select(`
        *,
        user:users!document_access_log_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching project activity:', error)
      throw error
    }

    return (data || []) as unknown as AccessLogEntry[]
  },
}

export default documentAccessLogApi
