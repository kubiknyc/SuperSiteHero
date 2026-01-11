/**
 * useWebhooks Hook
 *
 * React hook for managing webhook configurations with:
 * - CRUD operations for webhooks
 * - Test webhook functionality
 * - Real-time status updates
 */

import { useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/utils/logger'
import {
  webhookManager,
  webhookService,
  type WebhookConfig,
  type WebhookEventType,
  type WebhookProvider,
  type WebhookDeliveryResult,
} from '@/lib/notifications/webhooks'

// ============================================================================
// Types
// ============================================================================

export interface CreateWebhookInput {
  name: string
  provider: WebhookProvider
  url: string
  secret?: string
  events: WebhookEventType[]
  enabled?: boolean
  headers?: Record<string, string>
  project_ids?: string[]
  min_priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export interface UpdateWebhookInput {
  name?: string
  url?: string
  secret?: string
  events?: WebhookEventType[]
  enabled?: boolean
  headers?: Record<string, string>
  project_ids?: string[]
  min_priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export interface WebhookStats {
  total: number
  enabled: number
  disabled: number
  failing: number
}

// ============================================================================
// Hook
// ============================================================================

export function useWebhooks(options?: {
  organizationId?: string
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch all webhooks for the user
  const {
    data: webhooks = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['webhooks', user?.id, options?.organizationId],
    queryFn: async () => {
      if (!user?.id) {return []}

      if (options?.organizationId) {
        return webhookManager.getOrganizationWebhooks(options.organizationId)
      }

      return webhookManager.getWebhooks(user.id)
    },
    enabled: !!user?.id,
    staleTime: 60000,
  })

  // Calculate stats
  const stats = useMemo<WebhookStats>(() => {
    let enabled = 0
    let disabled = 0
    let failing = 0

    webhooks.forEach(w => {
      if (w.enabled) {
        enabled++
        if (w.failure_count >= 3) {
          failing++
        }
      } else {
        disabled++
      }
    })

    return {
      total: webhooks.length,
      enabled,
      disabled,
      failing,
    }
  }, [webhooks])

  // Create webhook mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateWebhookInput) => {
      if (!user?.id) {throw new Error('User not authenticated')}

      return webhookManager.createWebhook(user.id, {
        ...input,
        organization_id: options?.organizationId,
        enabled: input.enabled ?? true,
      })
    },
    onSuccess: (webhook) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success(`Webhook "${webhook.name}" created successfully`)
    },
    onError: (error) => {
      logger.error('[useWebhooks] Failed to create webhook:', error)
      toast.error('Failed to create webhook')
    },
  })

  // Update webhook mutation
  const updateMutation = useMutation({
    mutationFn: async ({ webhookId, updates }: { webhookId: string; updates: UpdateWebhookInput }) => {
      return webhookManager.updateWebhook(webhookId, updates)
    },
    onSuccess: (webhook) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success(`Webhook "${webhook.name}" updated`)
    },
    onError: (error) => {
      logger.error('[useWebhooks] Failed to update webhook:', error)
      toast.error('Failed to update webhook')
    },
  })

  // Delete webhook mutation
  const deleteMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      await webhookManager.deleteWebhook(webhookId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success('Webhook deleted')
    },
    onError: (error) => {
      logger.error('[useWebhooks] Failed to delete webhook:', error)
      toast.error('Failed to delete webhook')
    },
  })

  // Toggle webhook enabled/disabled
  const toggleMutation = useMutation({
    mutationFn: async ({ webhookId, enabled }: { webhookId: string; enabled: boolean }) => {
      return webhookManager.toggleWebhook(webhookId, enabled)
    },
    onSuccess: (webhook) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success(`Webhook ${webhook.enabled ? 'enabled' : 'disabled'}`)
    },
    onError: (error) => {
      logger.error('[useWebhooks] Failed to toggle webhook:', error)
      toast.error('Failed to update webhook')
    },
  })

  // Test webhook mutation
  const testMutation = useMutation({
    mutationFn: async (webhook: WebhookConfig) => {
      return webhookService.testWebhook(webhook)
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    },
    onError: (error) => {
      logger.error('[useWebhooks] Failed to test webhook:', error)
      toast.error('Failed to test webhook')
    },
  })

  // Reset failure count mutation
  const resetFailureMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      await webhookManager.resetFailureCount(webhookId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success('Failure count reset')
    },
    onError: (error) => {
      logger.error('[useWebhooks] Failed to reset failure count:', error)
      toast.error('Failed to reset failure count')
    },
  })

  // Callback handlers
  const createWebhook = useCallback((input: CreateWebhookInput) => {
    return createMutation.mutateAsync(input)
  }, [createMutation])

  const updateWebhook = useCallback((webhookId: string, updates: UpdateWebhookInput) => {
    return updateMutation.mutateAsync({ webhookId, updates })
  }, [updateMutation])

  const deleteWebhook = useCallback((webhookId: string) => {
    return deleteMutation.mutateAsync(webhookId)
  }, [deleteMutation])

  const toggleWebhook = useCallback((webhookId: string, enabled: boolean) => {
    return toggleMutation.mutateAsync({ webhookId, enabled })
  }, [toggleMutation])

  const testWebhook = useCallback((webhook: WebhookConfig) => {
    return testMutation.mutateAsync(webhook)
  }, [testMutation])

  const resetFailureCount = useCallback((webhookId: string) => {
    return resetFailureMutation.mutateAsync(webhookId)
  }, [resetFailureMutation])

  // Get webhook by ID
  const getWebhook = useCallback((webhookId: string) => {
    return webhooks.find(w => w.id === webhookId)
  }, [webhooks])

  // Get webhooks by provider
  const getWebhooksByProvider = useCallback((provider: WebhookProvider) => {
    return webhooks.filter(w => w.provider === provider)
  }, [webhooks])

  // Get webhooks subscribed to an event
  const getWebhooksForEvent = useCallback((event: WebhookEventType) => {
    return webhooks.filter(w => w.enabled && w.events.includes(event))
  }, [webhooks])

  return useMemo(() => ({
    // Data
    webhooks,
    stats,

    // State
    isLoading,
    error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTesting: testMutation.isPending,

    // Actions
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    testWebhook,
    resetFailureCount,
    refetch,

    // Helpers
    getWebhook,
    getWebhooksByProvider,
    getWebhooksForEvent,
  }), [
    webhooks,
    stats,
    isLoading,
    error,
    createMutation.isPending,
    updateMutation.isPending,
    deleteMutation.isPending,
    testMutation.isPending,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    testWebhook,
    resetFailureCount,
    refetch,
    getWebhook,
    getWebhooksByProvider,
    getWebhooksForEvent,
  ])
}

// ============================================================================
// Provider-specific Helpers
// ============================================================================

export const WEBHOOK_PROVIDERS: {
  id: WebhookProvider
  name: string
  description: string
  icon: string
  urlPlaceholder: string
  docsUrl: string
}[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications to Slack channels via incoming webhooks',
    icon: 'slack',
    urlPlaceholder: 'https://hooks.slack.com/services/...',
    docsUrl: 'https://api.slack.com/messaging/webhooks',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Post notifications to Teams channels',
    icon: 'microsoft',
    urlPlaceholder: 'https://outlook.office.com/webhook/...',
    docsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Send messages to Discord channels',
    icon: 'discord',
    urlPlaceholder: 'https://discord.com/api/webhooks/...',
    docsUrl: 'https://discord.com/developers/docs/resources/webhook',
  },
  {
    id: 'custom',
    name: 'Custom Webhook',
    description: 'Send JSON payloads to any HTTP endpoint',
    icon: 'webhook',
    urlPlaceholder: 'https://your-api.com/webhook',
    docsUrl: '',
  },
]

export const WEBHOOK_EVENTS: {
  id: WebhookEventType
  name: string
  description: string
  category: string
}[] = [
  { id: 'notification.created', name: 'Notification Created', description: 'When a new notification is created', category: 'general' },
  { id: 'notification.batched', name: 'Batch Ready', description: 'When a batch of notifications is ready', category: 'general' },
  { id: 'approval.requested', name: 'Approval Requested', description: 'When approval is requested', category: 'workflow' },
  { id: 'approval.completed', name: 'Approval Completed', description: 'When approval is granted or rejected', category: 'workflow' },
  { id: 'task.assigned', name: 'Task Assigned', description: 'When a task is assigned to someone', category: 'tasks' },
  { id: 'task.completed', name: 'Task Completed', description: 'When a task is marked complete', category: 'tasks' },
  { id: 'rfi.created', name: 'RFI Created', description: 'When a new RFI is created', category: 'rfis' },
  { id: 'rfi.responded', name: 'RFI Responded', description: 'When an RFI receives a response', category: 'rfis' },
  { id: 'submittal.status_changed', name: 'Submittal Status', description: 'When submittal status changes', category: 'submittals' },
  { id: 'incident.reported', name: 'Incident Reported', description: 'When a safety incident is reported', category: 'safety' },
  { id: 'mention.created', name: 'Mention', description: 'When someone is @mentioned', category: 'general' },
  { id: 'daily_report.submitted', name: 'Daily Report', description: 'When a daily report is submitted', category: 'reports' },
  { id: 'punch_item.created', name: 'Punch Item Created', description: 'When a punch item is created', category: 'punch' },
  { id: 'change_order.status_changed', name: 'Change Order Status', description: 'When CO status changes', category: 'finance' },
]

export default useWebhooks
