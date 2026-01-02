/**
 * Change Order Audit Log Hook
 *
 * Provides comprehensive audit trail for all change order modifications.
 * Tracks who made changes, when, and what was modified.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'amount_changed'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_removed'
  | 'assigned'
  | 'unassigned'
  | 'deleted'
  | 'restored'

export interface AuditLogEntry {
  id: string
  changeOrderId: string
  action: AuditAction
  performedBy: string
  performedByName?: string
  performedAt: string
  previousValue?: any
  newValue?: any
  fieldName?: string
  description: string
  metadata?: Record<string, any>
  ipAddress?: string
}

export interface AuditLogFilters {
  action?: AuditAction
  userId?: string
  startDate?: Date
  endDate?: Date
}

// ============================================================================
// Helper Functions
// ============================================================================

function getActionDescription(action: AuditAction, fieldName?: string, newValue?: any): string {
  switch (action) {
    case 'created':
      return 'Created change order'
    case 'updated':
      return fieldName ? `Updated ${formatFieldName(fieldName)}` : 'Updated change order'
    case 'status_changed':
      return `Changed status to ${formatStatus(newValue)}`
    case 'amount_changed':
      return `Changed amount to ${formatCurrency(newValue)}`
    case 'approved':
      return 'Approved change order'
    case 'rejected':
      return 'Rejected change order'
    case 'escalated':
      return 'Escalated for higher approval'
    case 'comment_added':
      return 'Added a comment'
    case 'attachment_added':
      return 'Added attachment'
    case 'attachment_removed':
      return 'Removed attachment'
    case 'assigned':
      return 'Assigned reviewer'
    case 'unassigned':
      return 'Removed reviewer'
    case 'deleted':
      return 'Deleted change order'
    case 'restored':
      return 'Restored change order'
    default:
      return 'Modified change order'
  }
}

function formatFieldName(field: string): string {
  const fieldLabels: Record<string, string> = {
    title: 'Title',
    description: 'Description',
    proposed_amount: 'Proposed Amount',
    approved_amount: 'Approved Amount',
    change_type: 'Change Type',
    justification: 'Justification',
    scope_description: 'Scope Description',
    date_submitted: 'Submit Date',
    date_required: 'Required Date',
    priority: 'Priority',
  }
  return fieldLabels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    pending_estimate: 'Pending Estimate',
    estimate_complete: 'Estimate Complete',
    pending_internal_approval: 'Pending Internal Approval',
    internally_approved: 'Internally Approved',
    pending_owner_review: 'Pending Owner Review',
    owner_approved: 'Owner Approved',
    approved: 'Approved',
    rejected: 'Rejected',
    void: 'Void',
  }
  return statusLabels[status] || status
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch audit log for a change order
 */
export function useChangeOrderAuditLog(
  changeOrderId: string | undefined,
  filters?: AuditLogFilters
) {
  return useQuery({
    queryKey: ['change-order-audit-log', changeOrderId, filters],
    queryFn: async () => {
      if (!changeOrderId) throw new Error('Change Order ID required')

      // First, get the change order with its metadata
      const { data: co, error: coError } = await supabase
        .from('change_orders')
        .select('metadata, created_at, created_by')
        .eq('id', changeOrderId)
        .single()

      if (coError) throw coError

      // Extract audit log from metadata
      const auditHistory = ((co.metadata as any)?.auditLog || []) as AuditLogEntry[]

      // Add creation entry if not in audit log
      if (!auditHistory.find(e => e.action === 'created')) {
        auditHistory.unshift({
          id: `${changeOrderId}-created`,
          changeOrderId,
          action: 'created',
          performedBy: co.created_by || 'unknown',
          performedAt: co.created_at,
          description: 'Created change order',
        })
      }

      // Apply filters
      let filteredLog = auditHistory

      if (filters?.action) {
        filteredLog = filteredLog.filter(e => e.action === filters.action)
      }
      if (filters?.userId) {
        filteredLog = filteredLog.filter(e => e.performedBy === filters.userId)
      }
      if (filters?.startDate) {
        filteredLog = filteredLog.filter(
          e => new Date(e.performedAt) >= filters.startDate!
        )
      }
      if (filters?.endDate) {
        filteredLog = filteredLog.filter(
          e => new Date(e.performedAt) <= filters.endDate!
        )
      }

      // Sort by date descending
      return filteredLog.sort(
        (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      )
    },
    enabled: !!changeOrderId,
  })
}

/**
 * Get audit log summary statistics
 */
export function useAuditLogStats(changeOrderId: string | undefined) {
  const { data: auditLog } = useChangeOrderAuditLog(changeOrderId)

  return {
    totalEntries: auditLog?.length || 0,
    approvals: auditLog?.filter(e => e.action === 'approved').length || 0,
    statusChanges: auditLog?.filter(e => e.action === 'status_changed').length || 0,
    amountChanges: auditLog?.filter(e => e.action === 'amount_changed').length || 0,
    comments: auditLog?.filter(e => e.action === 'comment_added').length || 0,
    uniqueUsers: new Set(auditLog?.map(e => e.performedBy) || []).size,
    lastModified: auditLog?.[0]?.performedAt,
  }
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Add entry to audit log
 */
export function useAddAuditLogEntry() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      changeOrderId,
      action,
      fieldName,
      previousValue,
      newValue,
      description,
      metadata,
    }: {
      changeOrderId: string
      action: AuditAction
      fieldName?: string
      previousValue?: any
      newValue?: any
      description?: string
      metadata?: Record<string, any>
    }) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated')
      }

      // Get current metadata
      const { data: co, error: fetchError } = await supabase
        .from('change_orders')
        .select('metadata')
        .eq('id', changeOrderId)
        .single()

      if (fetchError) throw fetchError

      const now = new Date().toISOString()
      const entryId = `${changeOrderId}-${now}-${Math.random().toString(36).substr(2, 9)}`

      const newEntry: AuditLogEntry = {
        id: entryId,
        changeOrderId,
        action,
        performedBy: userProfile.id,
        performedByName: `${userProfile.first_name} ${userProfile.last_name}`,
        performedAt: now,
        previousValue,
        newValue,
        fieldName,
        description: description || getActionDescription(action, fieldName, newValue),
        metadata,
      }

      const existingLog = ((co.metadata as any)?.auditLog || []) as AuditLogEntry[]

      const updatedMetadata = {
        ...(co.metadata || {}),
        auditLog: [...existingLog, newEntry],
        lastModifiedAt: now,
        lastModifiedBy: userProfile.id,
      }

      const { error } = await supabase
        .from('change_orders')
        .update({ metadata: updatedMetadata })
        .eq('id', changeOrderId)

      if (error) throw error

      return newEntry
    },
    onSuccess: (_, { changeOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ['change-order-audit-log', changeOrderId] })
      queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] })
    },
  })
}

/**
 * Record a field change with before/after values
 */
export function useRecordFieldChange() {
  const addAuditEntry = useAddAuditLogEntry()

  return useMutation({
    mutationFn: async ({
      changeOrderId,
      fieldName,
      previousValue,
      newValue,
    }: {
      changeOrderId: string
      fieldName: string
      previousValue: any
      newValue: any
    }) => {
      // Determine if this is an amount change for special handling
      const isAmountChange = fieldName.includes('amount')

      return addAuditEntry.mutateAsync({
        changeOrderId,
        action: isAmountChange ? 'amount_changed' : 'updated',
        fieldName,
        previousValue,
        newValue,
        description: isAmountChange
          ? `Changed ${formatFieldName(fieldName)} from ${formatCurrency(previousValue)} to ${formatCurrency(newValue)}`
          : `Changed ${formatFieldName(fieldName)}`,
      })
    },
  })
}

/**
 * Record a status change
 */
export function useRecordStatusChange() {
  const addAuditEntry = useAddAuditLogEntry()

  return useMutation({
    mutationFn: async ({
      changeOrderId,
      previousStatus,
      newStatus,
      reason,
    }: {
      changeOrderId: string
      previousStatus: string
      newStatus: string
      reason?: string
    }) => {
      return addAuditEntry.mutateAsync({
        changeOrderId,
        action: 'status_changed',
        fieldName: 'status',
        previousValue: previousStatus,
        newValue: newStatus,
        description: reason || `Status changed from ${formatStatus(previousStatus)} to ${formatStatus(newStatus)}`,
      })
    },
  })
}

// ============================================================================
// Exports
// ============================================================================

export {
  getActionDescription,
  formatFieldName,
  formatStatus,
  formatCurrency,
}
