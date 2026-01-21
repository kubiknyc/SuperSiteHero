// File: /src/lib/audit/audit-logger.ts
// Client-side audit logging utility for tracking sensitive operations

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  // Authentication
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'password_reset'
  | 'password_change'
  | 'session_refresh'
  | 'session_expired'
  // Authorization
  | 'role_change'
  | 'permission_grant'
  | 'permission_revoke'
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_rejected'
  // Data Access
  | 'view'
  | 'download'
  | 'export'
  | 'print'
  | 'share'
  | 'search'
  // Data Modification
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'archive'
  | 'bulk_update'
  | 'bulk_delete'
  // Critical Operations
  | 'project_delete'
  | 'user_delete'
  | 'company_delete'
  | 'settings_change'
  | 'integration_connect'
  | 'integration_disconnect'
  // Security Events
  | 'security_warning'
  | 'suspicious_activity'
  | 'rate_limit_exceeded'

export type AuditResourceType =
  | 'user'
  | 'company'
  | 'project'
  | 'document'
  | 'rfi'
  | 'submittal'
  | 'change_order'
  | 'payment_application'
  | 'lien_waiver'
  | 'daily_report'
  | 'safety_incident'
  | 'meeting'
  | 'task'
  | 'punch_item'
  | 'notification'
  | 'settings'
  | 'integration'
  | 'report'
  | 'session'
  | 'authentication'

export interface AuditLogEntry {
  /** The action that was performed */
  action: AuditAction
  /** The type of resource affected */
  resourceType: AuditResourceType
  /** The specific resource ID (optional) */
  resourceId?: string
  /** Previous state for updates/deletes */
  oldValues?: Record<string, unknown>
  /** New state for creates/updates */
  newValues?: Record<string, unknown>
  /** Additional context */
  metadata?: Record<string, unknown>
}

export interface AuditLogResult {
  success: boolean
  logId?: string
  error?: string
}

// ============================================================================
// Audit Logger Class
// ============================================================================

class AuditLogger {
  private queue: AuditLogEntry[] = []
  private isProcessing = false
  private batchTimeout: ReturnType<typeof setTimeout> | null = null
  private readonly BATCH_SIZE = 10
  private readonly BATCH_DELAY_MS = 1000

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<AuditLogResult> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          old_values: entry.oldValues,
          new_values: entry.newValues,
          ip_address: null, // Will be set server-side if needed
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          metadata: {
            ...entry.metadata,
            client_timestamp: new Date().toISOString(),
            client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        })
        .select('id')
        .single()

      if (error) {
        logger.error('[AuditLogger] Failed to log audit event:', error)
        return { success: false, error: error.message }
      }

      logger.debug('[AuditLogger] Logged:', entry.action, entry.resourceType)
      return { success: true, logId: data?.id }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error('[AuditLogger] Error logging audit event:', message)
      return { success: false, error: message }
    }
  }

  /**
   * Queue an audit event for batch processing
   * Use this for high-frequency events to reduce database writes
   */
  queueLog(entry: AuditLogEntry): void {
    this.queue.push(entry)

    // Process immediately if we've hit batch size
    if (this.queue.length >= this.BATCH_SIZE) {
      this.processBatch()
      return
    }

    // Otherwise, set a timeout to process the batch
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatch()
      }, this.BATCH_DELAY_MS)
    }
  }

  /**
   * Process queued audit events
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    if (this.queue.length === 0 || this.isProcessing) {
      return
    }

    this.isProcessing = true
    const batch = this.queue.splice(0, this.BATCH_SIZE)

    try {
      const entries = batch.map((entry) => ({
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        old_values: entry.oldValues,
        new_values: entry.newValues,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        metadata: {
          ...entry.metadata,
          client_timestamp: new Date().toISOString(),
          batched: true,
        },
      }))

      const { error } = await supabase.from('audit_logs').insert(entries)

      if (error) {
        logger.error('[AuditLogger] Batch insert failed:', error)
        // Re-queue failed entries
        this.queue.unshift(...batch)
      } else {
        logger.debug(`[AuditLogger] Batch processed: ${entries.length} entries`)
      }
    } catch (error) {
      logger.error('[AuditLogger] Batch processing error:', error)
      // Re-queue on error
      this.queue.unshift(...batch)
    } finally {
      this.isProcessing = false

      // Process remaining items if any
      if (this.queue.length > 0) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch()
        }, this.BATCH_DELAY_MS)
      }
    }
  }

  /**
   * Flush all queued events immediately
   */
  async flush(): Promise<void> {
    while (this.queue.length > 0) {
      await this.processBatch()
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger()

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Log an authentication event
 */
export async function logAuthEvent(
  action: 'login' | 'logout' | 'failed_login' | 'password_reset' | 'password_change',
  metadata?: Record<string, unknown>
): Promise<AuditLogResult> {
  return auditLogger.log({
    action,
    resourceType: 'authentication',
    metadata: {
      ...metadata,
      event_category: 'authentication',
    },
  })
}

/**
 * Log a data access event (view, download, export)
 */
export async function logDataAccess(
  action: 'view' | 'download' | 'export' | 'print' | 'share',
  resourceType: AuditResourceType,
  resourceId?: string,
  metadata?: Record<string, unknown>
): Promise<AuditLogResult> {
  return auditLogger.log({
    action,
    resourceType,
    resourceId,
    metadata: {
      ...metadata,
      event_category: 'data_access',
    },
  })
}

/**
 * Log a data modification event
 */
export async function logDataChange(
  action: 'create' | 'update' | 'delete' | 'restore' | 'archive',
  resourceType: AuditResourceType,
  resourceId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<AuditLogResult> {
  return auditLogger.log({
    action,
    resourceType,
    resourceId,
    oldValues,
    newValues,
    metadata: {
      ...metadata,
      event_category: 'data_modification',
    },
  })
}

/**
 * Log a security event
 */
export async function logSecurityEvent(
  action: 'security_warning' | 'suspicious_activity' | 'rate_limit_exceeded',
  metadata: Record<string, unknown>
): Promise<AuditLogResult> {
  return auditLogger.log({
    action,
    resourceType: 'session',
    metadata: {
      ...metadata,
      event_category: 'security',
      severity: action === 'suspicious_activity' ? 'high' : 'medium',
    },
  })
}

/**
 * Log a critical operation (requires extra context)
 */
export async function logCriticalOperation(
  action: 'project_delete' | 'user_delete' | 'company_delete' | 'bulk_delete' | 'settings_change',
  resourceType: AuditResourceType,
  resourceId?: string,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<AuditLogResult> {
  return auditLogger.log({
    action,
    resourceType,
    resourceId,
    metadata: {
      ...metadata,
      reason,
      event_category: 'critical',
      requires_review: true,
    },
  })
}

// ============================================================================
// React Hook for Audit Logging
// ============================================================================

import { useCallback } from 'react'

export function useAuditLogger() {
  const log = useCallback(async (entry: AuditLogEntry) => {
    return auditLogger.log(entry)
  }, [])

  const logAuth = useCallback(
    async (
      action: 'login' | 'logout' | 'failed_login' | 'password_reset' | 'password_change',
      metadata?: Record<string, unknown>
    ) => {
      return logAuthEvent(action, metadata)
    },
    []
  )

  const logAccess = useCallback(
    async (
      action: 'view' | 'download' | 'export' | 'print' | 'share',
      resourceType: AuditResourceType,
      resourceId?: string,
      metadata?: Record<string, unknown>
    ) => {
      return logDataAccess(action, resourceType, resourceId, metadata)
    },
    []
  )

  const logChange = useCallback(
    async (
      action: 'create' | 'update' | 'delete' | 'restore' | 'archive',
      resourceType: AuditResourceType,
      resourceId?: string,
      oldValues?: Record<string, unknown>,
      newValues?: Record<string, unknown>,
      metadata?: Record<string, unknown>
    ) => {
      return logDataChange(action, resourceType, resourceId, oldValues, newValues, metadata)
    },
    []
  )

  return {
    log,
    logAuth,
    logAccess,
    logChange,
  }
}
