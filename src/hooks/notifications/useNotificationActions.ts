/**
 * useNotificationActions Hook
 * 
 * Handles inline notification actions like approve/reject, snooze, quick reply
 */

import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

export type ActionType = 'approve' | 'reject' | 'approve_with_conditions' | 'reply' | 'snooze' | 'dismiss'

export interface NotificationAction {
  id: string
  type: ActionType
  label: string
  variant?: 'default' | 'primary' | 'secondary' | 'destructive'
  payload?: Record<string, unknown>
}

export interface ActionResult {
  success: boolean
  message?: string
  data?: Record<string, unknown>
}

export function useNotificationActions() {
  const queryClient = useQueryClient()
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set())

  const executeApproval = useMutation({
    mutationFn: async ({ notificationId, entityType, entityId, status, conditions }: {
      notificationId: string
      entityType: string
      entityId: string
      status: 'approved' | 'rejected' | 'approved_with_conditions'
      conditions?: string
    }): Promise<ActionResult> => {
      let tableName = ''
      switch (entityType) {
        case 'submittal': tableName = 'submittals'; break
        case 'change_order': tableName = 'change_orders'; break
        case 'rfi': tableName = 'rfis'; break
        case 'daily_report': tableName = 'daily_reports'; break
        default: throw new Error('Unknown entity type: ' + entityType)
      }

      const { error } = await supabase
        .from(tableName)
        .update({
          status,
          approval_notes: conditions,
          approved_at: new Date().toISOString(),
        })
        .eq('id', entityId)

      if (error) {throw error}

      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      return { success: true, message: 'Action completed successfully' }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success(variables.status === 'approved' ? 'Approved successfully' : 'Action completed')
    },
    onError: (error) => {
      logger.error('[useNotificationActions] Approval failed:', error)
      toast.error('Failed to process approval')
    },
  })

  const snoozeNotification = useMutation({
    mutationFn: async ({ notificationId, durationMinutes }: {
      notificationId: string
      durationMinutes: number
    }): Promise<ActionResult> => {
      const snoozeUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()

      const { error } = await supabase
        .from('notifications')
        .update({ snoozed_until: snoozeUntil })
        .eq('id', notificationId)

      if (error) {throw error}
      return { success: true, message: 'Notification snoozed' }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notification snoozed')
    },
    onError: (error) => {
      logger.error('[useNotificationActions] Snooze failed:', error)
      toast.error('Failed to snooze notification')
    },
  })

  const handleAction = useCallback(async (
    notificationId: string,
    action: NotificationAction,
    metadata?: { entityType?: string; entityId?: string }
  ): Promise<ActionResult> => {
    if (pendingActions.has(notificationId)) {
      return { success: false, message: 'Action already in progress' }
    }

    setPendingActions(prev => new Set(prev).add(notificationId))

    try {
      switch (action.type) {
        case 'approve':
        case 'reject':
        case 'approve_with_conditions':
          if (!metadata?.entityType || !metadata?.entityId) {
            throw new Error('Entity type and ID required for approval actions')
          }
          return await executeApproval.mutateAsync({
            notificationId,
            entityType: metadata.entityType,
            entityId: metadata.entityId,
            status: action.type === 'approve' ? 'approved' 
                  : action.type === 'reject' ? 'rejected' 
                  : 'approved_with_conditions',
            conditions: action.payload?.conditions as string,
          })

        case 'snooze':
          const duration = (action.payload?.durationMinutes as number) || 60
          return await snoozeNotification.mutateAsync({
            notificationId,
            durationMinutes: duration,
          })

        case 'dismiss':
          await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          return { success: true, message: 'Dismissed' }

        default:
          return { success: false, message: 'Unknown action type' }
      }
    } catch (error) {
      logger.error('[useNotificationActions] Action failed:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Action failed' }
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev)
        next.delete(notificationId)
        return next
      })
    }
  }, [executeApproval, snoozeNotification, pendingActions, queryClient])

  return {
    handleAction,
    isActionPending: (id: string) => pendingActions.has(id),
    pendingCount: pendingActions.size,
  }
}

export default useNotificationActions
