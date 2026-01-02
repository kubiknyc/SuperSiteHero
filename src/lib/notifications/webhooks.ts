/**
 * Webhook Integration Service
 *
 * Features:
 * - WebhookConfig type with url, events, secret
 * - sendWebhook function with HMAC signature
 * - WebhookManager for CRUD operations
 * - Support for Slack, Teams, Discord, and custom formats
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export type WebhookProvider = 'slack' | 'teams' | 'discord' | 'email' | 'custom'

export type WebhookEventType =
  | 'notification.created'
  | 'notification.batched'
  | 'approval.requested'
  | 'approval.completed'
  | 'incident.reported'
  | 'task.assigned'
  | 'task.completed'
  | 'rfi.created'
  | 'rfi.responded'
  | 'submittal.status_changed'
  | 'mention.created'
  | 'daily_report.submitted'
  | 'punch_item.created'
  | 'change_order.status_changed'

export interface WebhookConfig {
  id: string
  user_id: string
  organization_id?: string
  provider: WebhookProvider
  name: string
  url: string
  secret?: string
  enabled: boolean
  events: WebhookEventType[]
  headers?: Record<string, string>
  notification_types?: string[]
  project_ids?: string[]
  min_priority?: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  failure_count: number
  last_failure_at?: string
  last_success_at?: string
}

export interface WebhookNotification {
  id: string
  type: string
  category: string
  title: string
  message: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  project_id?: string | null
  project_name?: string | null
  link?: string | null
  actor?: { id: string; name: string; avatar_url?: string }
  metadata?: Record<string, unknown>
}

export interface WebhookDeliveryResult {
  success: boolean
  statusCode?: number
  error?: string
  responseBody?: string
  duration?: number
}

export interface WebhookPayload {
  event: WebhookEventType
  timestamp: string
  notification: WebhookNotification
  signature?: string
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  normal: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
}

const PRIORITY_EMOJIS: Record<string, string> = {
  low: ':white_circle:',
  normal: ':large_blue_circle:',
  high: ':large_orange_circle:',
  urgent: ':red_circle:',
}

// ============================================================================
// HMAC Signature Generation
// ============================================================================

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  // Use Web Crypto API for HMAC
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(payload)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return `sha256=${hashHex}`
}

// ============================================================================
// Payload Builders
// ============================================================================

function buildSlackPayload(
  notification: WebhookNotification,
  event: WebhookEventType
): Record<string, unknown> {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jobsight.app'
  const color = PRIORITY_COLORS[notification.priority]
  const emoji = PRIORITY_EMOJIS[notification.priority]

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: notification.title,
        emoji: true,
      },
    },
  ]

  if (notification.message) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: notification.message,
      },
    })
  }

  // Context block with metadata
  const contextElements: Record<string, unknown>[] = []

  if (notification.project_name) {
    contextElements.push({
      type: 'mrkdwn',
      text: `*Project:* ${notification.project_name}`,
    })
  }

  if (notification.actor) {
    contextElements.push({
      type: 'mrkdwn',
      text: `*From:* ${notification.actor.name}`,
    })
  }

  contextElements.push({
    type: 'mrkdwn',
    text: `${emoji} *Priority:* ${notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}`,
  })

  if (contextElements.length > 0) {
    blocks.push({
      type: 'context',
      elements: contextElements,
    })
  }

  // Action button if link available
  if (notification.link) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View in JobSight',
            emoji: true,
          },
          url: notification.link.startsWith('http') ? notification.link : `${appUrl}${notification.link}`,
          action_id: `view-${notification.id}`,
        },
      ],
    })
  }

  return {
    text: notification.title,
    blocks,
    attachments: [
      {
        color,
        footer: 'JobSight',
        footer_icon: `${appUrl}/favicon.ico`,
        ts: Math.floor(new Date(notification.created_at).getTime() / 1000),
      },
    ],
  }
}

function buildTeamsPayload(
  notification: WebhookNotification,
  event: WebhookEventType
): Record<string, unknown> {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jobsight.app'
  const color = PRIORITY_COLORS[notification.priority].replace('#', '')

  const facts: { name: string; value: string }[] = []

  if (notification.project_name) {
    facts.push({ name: 'Project', value: notification.project_name })
  }
  if (notification.actor) {
    facts.push({ name: 'From', value: notification.actor.name })
  }
  facts.push({
    name: 'Priority',
    value: notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1),
  })

  const potentialAction: Record<string, unknown>[] = []
  if (notification.link) {
    potentialAction.push({
      '@type': 'OpenUri',
      name: 'View in JobSight',
      targets: [
        {
          os: 'default',
          uri: notification.link.startsWith('http') ? notification.link : `${appUrl}${notification.link}`,
        },
      ],
    })
  }

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: color,
    summary: notification.title,
    sections: [
      {
        activityTitle: notification.title,
        activitySubtitle: notification.category,
        activityImage: notification.actor?.avatar_url,
        text: notification.message,
        facts,
        markdown: true,
      },
    ],
    potentialAction,
  }
}

function buildDiscordPayload(
  notification: WebhookNotification,
  event: WebhookEventType
): Record<string, unknown> {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jobsight.app'
  const color = parseInt(PRIORITY_COLORS[notification.priority].replace('#', ''), 16)

  const fields: { name: string; value: string; inline: boolean }[] = []

  if (notification.project_name) {
    fields.push({ name: 'Project', value: notification.project_name, inline: true })
  }
  if (notification.actor) {
    fields.push({ name: 'From', value: notification.actor.name, inline: true })
  }
  fields.push({
    name: 'Priority',
    value: notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1),
    inline: true,
  })

  return {
    embeds: [
      {
        title: notification.title,
        description: notification.message,
        url: notification.link?.startsWith('http') ? notification.link : `${appUrl}${notification.link}`,
        color,
        fields,
        timestamp: notification.created_at,
        footer: {
          text: 'JobSight',
          icon_url: `${appUrl}/favicon.ico`,
        },
        author: notification.actor
          ? {
              name: notification.actor.name,
              icon_url: notification.actor.avatar_url,
            }
          : undefined,
      },
    ],
  }
}

function buildCustomPayload(
  notification: WebhookNotification,
  event: WebhookEventType
): WebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    notification,
  }
}

// ============================================================================
// Webhook Service
// ============================================================================

export const webhookService = {
  /**
   * Build payload based on provider
   */
  buildPayload(
    notification: WebhookNotification,
    event: WebhookEventType,
    webhook: WebhookConfig
  ): Record<string, unknown> {
    switch (webhook.provider) {
      case 'slack':
        return buildSlackPayload(notification, event)
      case 'teams':
        return buildTeamsPayload(notification, event)
      case 'discord':
        return buildDiscordPayload(notification, event)
      case 'custom':
      default:
        return buildCustomPayload(notification, event) as unknown as Record<string, unknown>
    }
  },

  /**
   * Send webhook with HMAC signature and retry logic
   */
  async sendWebhook(
    notification: WebhookNotification,
    event: WebhookEventType,
    webhook: WebhookConfig
  ): Promise<WebhookDeliveryResult> {
    const payload = this.buildPayload(notification, event, webhook)
    const payloadString = JSON.stringify(payload)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JobSight-Webhook/1.0',
      'X-Webhook-Event': event,
      'X-Webhook-Timestamp': new Date().toISOString(),
      ...webhook.headers,
    }

    // Add HMAC signature if secret is configured
    if (webhook.secret) {
      try {
        const signature = await generateSignature(payloadString, webhook.secret)
        headers['X-Webhook-Signature'] = signature
        headers['X-Hub-Signature-256'] = signature // GitHub-style header
      } catch (error) {
        logger.error('[Webhook] Failed to generate signature:', error)
      }
    }

    // Retry loop
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const startTime = Date.now()

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: payloadString,
        })

        const duration = Date.now() - startTime
        const responseBody = await response.text().catch(() => '')

        if (response.ok) {
          logger.info(`[Webhook] Delivered successfully to ${webhook.name}`, {
            webhookId: webhook.id,
            event,
            statusCode: response.status,
            duration,
          })

          return {
            success: true,
            statusCode: response.status,
            responseBody,
            duration,
          }
        }

        // Non-retryable errors (4xx except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          logger.warn(`[Webhook] Non-retryable error for ${webhook.name}`, {
            webhookId: webhook.id,
            statusCode: response.status,
            responseBody,
          })

          return {
            success: false,
            statusCode: response.status,
            error: `HTTP ${response.status}: ${response.statusText}`,
            responseBody,
            duration,
          }
        }

        // Retryable error - wait and continue
        logger.warn(`[Webhook] Retryable error for ${webhook.name}, attempt ${attempt + 1}/${MAX_RETRIES}`, {
          statusCode: response.status,
        })
      } catch (error) {
        logger.error(`[Webhook] Network error for ${webhook.name}, attempt ${attempt + 1}/${MAX_RETRIES}`, error)
      }

      // Wait before retry (unless last attempt)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]))
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
    }
  },

  /**
   * Send to multiple webhooks
   */
  async sendToWebhooks(
    notification: WebhookNotification,
    event: WebhookEventType,
    webhooks: WebhookConfig[]
  ): Promise<Map<string, WebhookDeliveryResult>> {
    const results = new Map<string, WebhookDeliveryResult>()

    const eligibleWebhooks = webhooks.filter(w => {
      // Check if webhook is enabled
      if (!w.enabled) return false

      // Check if webhook subscribes to this event
      if (!w.events.includes(event)) return false

      // Check project filter
      if (w.project_ids?.length && notification.project_id) {
        if (!w.project_ids.includes(notification.project_id)) return false
      }

      // Check priority filter
      if (w.min_priority) {
        const priorityOrder = { low: 0, normal: 1, high: 2, urgent: 3 }
        if (priorityOrder[notification.priority] < priorityOrder[w.min_priority]) {
          return false
        }
      }

      return true
    })

    const deliveries = await Promise.allSettled(
      eligibleWebhooks.map(async webhook => {
        const result = await this.sendWebhook(notification, event, webhook)
        results.set(webhook.id, result)

        // Update webhook status in database
        await this.updateWebhookStatus(webhook.id, result.success)

        return { webhookId: webhook.id, result }
      })
    )

    return results
  },

  /**
   * Update webhook delivery status in database
   */
  async updateWebhookStatus(webhookId: string, success: boolean): Promise<void> {
    try {
      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (success) {
        update.last_success_at = new Date().toISOString()
        update.failure_count = 0
      } else {
        update.last_failure_at = new Date().toISOString()
        // Increment failure count using raw SQL
        const { error } = await supabase.rpc('increment_webhook_failure', {
          webhook_id: webhookId,
        })
        if (error) {
          // Fallback if RPC doesn't exist
          await supabase
            .from('webhook_configs')
            .update({ ...update, failure_count: supabase.rpc('increment', { x: 1 }) as unknown as number })
            .eq('id', webhookId)
        }
        return
      }

      await supabase
        .from('webhook_configs')
        .update(update)
        .eq('id', webhookId)
    } catch (error) {
      logger.error('[Webhook] Failed to update status:', error)
    }
  },

  /**
   * Test a webhook configuration
   */
  async testWebhook(webhook: WebhookConfig): Promise<WebhookDeliveryResult & { message: string }> {
    const testNotification: WebhookNotification = {
      id: 'test-' + Date.now(),
      type: 'test',
      category: 'general',
      title: 'Test Notification from JobSight',
      message: 'This is a test notification to verify your webhook configuration is working correctly.',
      priority: 'normal',
      created_at: new Date().toISOString(),
      project_name: 'Test Project',
      actor: {
        id: 'test-user',
        name: 'JobSight Test',
      },
    }

    const result = await this.sendWebhook(testNotification, 'notification.created', webhook)

    return {
      ...result,
      message: result.success
        ? 'Webhook test successful! Your integration is configured correctly.'
        : `Webhook test failed: ${result.error || 'Unknown error'}`,
    }
  },
}

// ============================================================================
// Webhook Manager (CRUD Operations)
// ============================================================================

export const webhookManager = {
  /**
   * Get all webhooks for a user
   */
  async getWebhooks(userId: string): Promise<WebhookConfig[]> {
    const { data, error } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[WebhookManager] Failed to fetch webhooks:', error)
      throw error
    }

    return data as WebhookConfig[]
  },

  /**
   * Get a single webhook by ID
   */
  async getWebhook(webhookId: string): Promise<WebhookConfig | null> {
    const { data, error } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('id', webhookId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      logger.error('[WebhookManager] Failed to fetch webhook:', error)
      throw error
    }

    return data as WebhookConfig
  },

  /**
   * Create a new webhook configuration
   */
  async createWebhook(
    userId: string,
    config: Omit<WebhookConfig, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'failure_count'>
  ): Promise<WebhookConfig> {
    const { data, error } = await supabase
      .from('webhook_configs')
      .insert({
        user_id: userId,
        ...config,
        failure_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      logger.error('[WebhookManager] Failed to create webhook:', error)
      throw error
    }

    return data as WebhookConfig
  },

  /**
   * Update a webhook configuration
   */
  async updateWebhook(
    webhookId: string,
    updates: Partial<Omit<WebhookConfig, 'id' | 'user_id' | 'created_at'>>
  ): Promise<WebhookConfig> {
    const { data, error } = await supabase
      .from('webhook_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhookId)
      .select()
      .single()

    if (error) {
      logger.error('[WebhookManager] Failed to update webhook:', error)
      throw error
    }

    return data as WebhookConfig
  },

  /**
   * Delete a webhook configuration
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const { error } = await supabase
      .from('webhook_configs')
      .delete()
      .eq('id', webhookId)

    if (error) {
      logger.error('[WebhookManager] Failed to delete webhook:', error)
      throw error
    }
  },

  /**
   * Toggle webhook enabled status
   */
  async toggleWebhook(webhookId: string, enabled: boolean): Promise<WebhookConfig> {
    return this.updateWebhook(webhookId, { enabled })
  },

  /**
   * Get webhooks by organization
   */
  async getOrganizationWebhooks(organizationId: string): Promise<WebhookConfig[]> {
    const { data, error } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[WebhookManager] Failed to fetch org webhooks:', error)
      throw error
    }

    return data as WebhookConfig[]
  },

  /**
   * Get webhooks subscribed to a specific event
   */
  async getWebhooksForEvent(
    event: WebhookEventType,
    organizationId?: string
  ): Promise<WebhookConfig[]> {
    let query = supabase
      .from('webhook_configs')
      .select('*')
      .eq('enabled', true)
      .contains('events', [event])

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('[WebhookManager] Failed to fetch event webhooks:', error)
      throw error
    }

    return data as WebhookConfig[]
  },

  /**
   * Reset webhook failure count
   */
  async resetFailureCount(webhookId: string): Promise<void> {
    const { error } = await supabase
      .from('webhook_configs')
      .update({
        failure_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhookId)

    if (error) {
      logger.error('[WebhookManager] Failed to reset failure count:', error)
      throw error
    }
  },
}

export default webhookService
