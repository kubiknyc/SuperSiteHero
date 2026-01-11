/**
 * useNotificationBatching Hook
 *
 * Batches similar notifications together to reduce notification fatigue.
 * Features:
 * - Batch similar notifications (e.g., "5 new comments on RFI #123")
 * - Configurable batch window (5 min, 15 min, 1 hour)
 * - Digest mode for email notifications
 * - Real-time vs batched toggle
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export type BatchWindow = '5min' | '15min' | '1hour' | '4hours' | 'daily'
export type DeliveryMode = 'realtime' | 'batched' | 'digest'

export interface NotificationBatchConfig {
  enabled: boolean
  batchWindow: BatchWindow
  deliveryMode: DeliveryMode
  groupBy: ('type' | 'project' | 'sender')[]
  digestTime?: string // HH:mm format for daily digest
  excludeUrgent: boolean // Always deliver urgent notifications immediately
}

export interface BatchedNotification {
  id: string
  batchKey: string
  type: string
  title: string
  message: string | null
  count: number
  notifications: RawNotification[]
  created_at: string
  updated_at: string
  project_id?: string | null
  project_name?: string | null
  sender_id?: string | null
  sender_name?: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export interface RawNotification {
  id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  created_at: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  project_id?: string | null
  project_name?: string | null
  sender_id?: string | null
  sender_name?: string | null
  related_to_id?: string | null
  related_to_type?: string | null
}

export interface DigestSummary {
  totalCount: number
  unreadCount: number
  byType: Record<string, number>
  byProject: Record<string, { name: string; count: number }>
  highPriorityCount: number
  batches: BatchedNotification[]
  generatedAt: string
}

// ============================================================================
// Constants
// ============================================================================

const BATCH_WINDOW_MS: Record<BatchWindow, number> = {
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '4hours': 4 * 60 * 60 * 1000,
  'daily': 24 * 60 * 60 * 1000,
}

const DEFAULT_CONFIG: NotificationBatchConfig = {
  enabled: true,
  batchWindow: '15min',
  deliveryMode: 'batched',
  groupBy: ['type', 'project'],
  excludeUrgent: true,
}

// ============================================================================
// Hook
// ============================================================================

export function useNotificationBatching(options?: {
  initialConfig?: Partial<NotificationBatchConfig>
  onBatchReady?: (batch: BatchedNotification) => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingNotificationsRef = useRef<RawNotification[]>([])

  // Configuration state
  const [config, setConfig] = useState<NotificationBatchConfig>({
    ...DEFAULT_CONFIG,
    ...options?.initialConfig,
  })

  // Load user preferences from database
  const { data: savedConfig } = useQuery({
    queryKey: ['notification-batch-config', user?.id],
    queryFn: async () => {
      if (!user?.id) {return null}

      const { data, error } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()

      if (error) {
        logger.error('[useNotificationBatching] Failed to load config:', error)
        return null
      }

      return data?.notification_preferences?.batching as NotificationBatchConfig | undefined
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  // Merge saved config with defaults
  useEffect(() => {
    if (savedConfig) {
      setConfig(prev => ({ ...prev, ...savedConfig }))
    }
  }, [savedConfig])

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: NotificationBatchConfig) => {
      if (!user?.id) {throw new Error('User not authenticated')}

      const { error } = await supabase
        .from('users')
        .update({
          notification_preferences: {
            batching: newConfig,
          },
        })
        .eq('id', user.id)

      if (error) {throw error}
      return newConfig
    },
    onSuccess: (newConfig) => {
      setConfig(newConfig)
      queryClient.invalidateQueries({ queryKey: ['notification-batch-config'] })
    },
    onError: (error) => {
      logger.error('[useNotificationBatching] Failed to save config:', error)
    },
  })

  /**
   * Generate a batch key for grouping notifications
   */
  const generateBatchKey = useCallback((notification: RawNotification): string => {
    const parts: string[] = []

    if (config.groupBy.includes('type')) {
      parts.push(notification.type || 'unknown')
    }
    if (config.groupBy.includes('project') && notification.project_id) {
      parts.push(`project:${notification.project_id}`)
    }
    if (config.groupBy.includes('sender') && notification.sender_id) {
      parts.push(`sender:${notification.sender_id}`)
    }

    // Add related entity for more specific batching
    if (notification.related_to_type && notification.related_to_id) {
      parts.push(`${notification.related_to_type}:${notification.related_to_id}`)
    }

    return parts.join('|') || notification.id
  }, [config.groupBy])

  /**
   * Create batched notifications from raw notifications
   */
  const createBatches = useCallback((notifications: RawNotification[]): BatchedNotification[] => {
    const batchMap = new Map<string, BatchedNotification>()

    notifications.forEach(notification => {
      // Skip urgent notifications if configured
      if (config.excludeUrgent && notification.priority === 'urgent') {
        // Deliver urgent notifications immediately (handled separately)
        return
      }

      const batchKey = generateBatchKey(notification)
      const existing = batchMap.get(batchKey)

      if (existing) {
        existing.notifications.push(notification)
        existing.count++
        existing.updated_at = notification.created_at
        // Upgrade priority if any notification has higher priority
        if (getPriorityOrder(notification.priority) > getPriorityOrder(existing.priority)) {
          existing.priority = notification.priority || 'normal'
        }
      } else {
        batchMap.set(batchKey, {
          id: `batch-${batchKey}-${Date.now()}`,
          batchKey,
          type: notification.type || 'unknown',
          title: notification.title,
          message: notification.message,
          count: 1,
          notifications: [notification],
          created_at: notification.created_at,
          updated_at: notification.created_at,
          project_id: notification.project_id,
          project_name: notification.project_name,
          sender_id: notification.sender_id,
          sender_name: notification.sender_name,
          priority: notification.priority || 'normal',
        })
      }
    })

    // Generate batch titles
    const batches = Array.from(batchMap.values()).map(batch => {
      if (batch.count > 1) {
        batch.title = generateBatchTitle(batch)
        batch.message = generateBatchMessage(batch)
      }
      return batch
    })

    // Sort by priority and recency
    return batches.sort((a, b) => {
      const priorityDiff = getPriorityOrder(b.priority) - getPriorityOrder(a.priority)
      if (priorityDiff !== 0) {return priorityDiff}
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [config.excludeUrgent, generateBatchKey])

  /**
   * Add a notification to the pending batch
   */
  const addToBatch = useCallback((notification: RawNotification) => {
    // If batching is disabled or it's urgent, handle immediately
    if (!config.enabled || (config.excludeUrgent && notification.priority === 'urgent')) {
      options?.onBatchReady?.({
        id: notification.id,
        batchKey: notification.id,
        type: notification.type || 'unknown',
        title: notification.title,
        message: notification.message,
        count: 1,
        notifications: [notification],
        created_at: notification.created_at,
        updated_at: notification.created_at,
        project_id: notification.project_id,
        project_name: notification.project_name,
        sender_id: notification.sender_id,
        sender_name: notification.sender_name,
        priority: notification.priority || 'normal',
      })
      return
    }

    pendingNotificationsRef.current.push(notification)

    // Start or reset the batch timer
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current)
    }

    const windowMs = BATCH_WINDOW_MS[config.batchWindow]
    batchTimerRef.current = setTimeout(() => {
      flushBatch()
    }, windowMs)
  }, [config.enabled, config.excludeUrgent, config.batchWindow, options])

  /**
   * Flush pending notifications as batches
   */
  const flushBatch = useCallback(() => {
    const notifications = pendingNotificationsRef.current
    if (notifications.length === 0) {return}

    const batches = createBatches(notifications)
    batches.forEach(batch => {
      options?.onBatchReady?.(batch)
    })

    pendingNotificationsRef.current = []

    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current)
      batchTimerRef.current = null
    }
  }, [createBatches, options])

  /**
   * Generate a digest summary
   */
  const generateDigest = useCallback((notifications: RawNotification[]): DigestSummary => {
    const batches = createBatches(notifications)

    const byType: Record<string, number> = {}
    const byProject: Record<string, { name: string; count: number }> = {}
    let highPriorityCount = 0
    let unreadCount = 0

    notifications.forEach(n => {
      // By type
      const type = n.type || 'unknown'
      byType[type] = (byType[type] || 0) + 1

      // By project
      if (n.project_id) {
        if (!byProject[n.project_id]) {
          byProject[n.project_id] = { name: n.project_name || 'Unknown', count: 0 }
        }
        byProject[n.project_id].count++
      }

      // High priority
      if (n.priority === 'high' || n.priority === 'urgent') {
        highPriorityCount++
      }

      // Unread
      if (!n.is_read) {
        unreadCount++
      }
    })

    return {
      totalCount: notifications.length,
      unreadCount,
      byType,
      byProject,
      highPriorityCount,
      batches,
      generatedAt: new Date().toISOString(),
    }
  }, [createBatches])

  /**
   * Toggle between real-time and batched mode
   */
  const toggleDeliveryMode = useCallback((mode: DeliveryMode) => {
    const newConfig = { ...config, deliveryMode: mode }
    saveConfigMutation.mutate(newConfig)
  }, [config, saveConfigMutation])

  /**
   * Update batch window
   */
  const setBatchWindow = useCallback((window: BatchWindow) => {
    const newConfig = { ...config, batchWindow: window }
    saveConfigMutation.mutate(newConfig)
  }, [config, saveConfigMutation])

  /**
   * Update configuration
   */
  const updateConfig = useCallback((updates: Partial<NotificationBatchConfig>) => {
    const newConfig = { ...config, ...updates }
    saveConfigMutation.mutate(newConfig)
  }, [config, saveConfigMutation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
      }
    }
  }, [])

  // Memoize return value
  return useMemo(() => ({
    config,
    isLoading: saveConfigMutation.isPending,
    addToBatch,
    flushBatch,
    createBatches,
    generateDigest,
    toggleDeliveryMode,
    setBatchWindow,
    updateConfig,
    pendingCount: pendingNotificationsRef.current.length,
  }), [
    config,
    saveConfigMutation.isPending,
    addToBatch,
    flushBatch,
    createBatches,
    generateDigest,
    toggleDeliveryMode,
    setBatchWindow,
    updateConfig,
  ])
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPriorityOrder(priority?: string): number {
  const order: Record<string, number> = {
    low: 0,
    normal: 1,
    high: 2,
    urgent: 3,
  }
  return order[priority || 'normal'] || 1
}

function generateBatchTitle(batch: BatchedNotification): string {
  const typeLabels: Record<string, string> = {
    rfi: 'RFI',
    task: 'task',
    comment: 'comment',
    approval: 'approval',
    submittal: 'submittal',
    mention: 'mention',
    safety: 'safety alert',
    incident: 'incident',
    daily_report: 'daily report',
  }

  const typeLabel = typeLabels[batch.type.split('_')[0]] || 'notification'

  if (batch.project_name) {
    return `${batch.count} new ${typeLabel}${batch.count > 1 ? 's' : ''} in ${batch.project_name}`
  }

  if (batch.sender_name && batch.count <= 3) {
    return `${batch.sender_name} and ${batch.count - 1} other${batch.count > 2 ? 's' : ''}`
  }

  return `${batch.count} new ${typeLabel}${batch.count > 1 ? 's' : ''}`
}

function generateBatchMessage(batch: BatchedNotification): string {
  const messages: string[] = []

  // Take first few notification messages
  batch.notifications.slice(0, 3).forEach(n => {
    if (n.message) {
      messages.push(n.message.length > 50 ? n.message.slice(0, 50) + '...' : n.message)
    }
  })

  if (batch.notifications.length > 3) {
    messages.push(`...and ${batch.notifications.length - 3} more`)
  }

  return messages.join('\n')
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  BatchWindow as NotificationBatchWindow,
  DeliveryMode as NotificationDeliveryMode,
}

export default useNotificationBatching
