/**
 * Webhook Integration Service
 */

import { logger } from '@/lib/utils/logger'

export type WebhookProvider = 'slack' | 'teams' | 'email' | 'discord' | 'custom'

export type WebhookEventType =
  | 'notification.created'
  | 'approval.requested'
  | 'approval.completed'
  | 'incident.reported'
  | 'task.assigned'
  | 'rfi.created'
  | 'submittal.status_changed'
  | 'mention.created'

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
  min_priority?: string
  created_at: string
  updated_at: string
  failure_count: number
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
}

const MAX_RETRIES = 3
const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  normal: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
}

export const webhookService = {
  async sendToWebhooks(
    notification: WebhookNotification,
    event: WebhookEventType,
    webhooks: WebhookConfig[]
  ): Promise<void> {
    const enabled = webhooks.filter(w => w.enabled && w.events.includes(event))
    await Promise.allSettled(enabled.map(w => this.sendToWebhook(notification, event, w)))
  },

  async sendToWebhook(
    notification: WebhookNotification,
    event: WebhookEventType,
    webhook: WebhookConfig
  ): Promise<boolean> {
    const payload = this.buildPayload(notification, event, webhook)
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...webhook.headers },
          body: JSON.stringify(payload),
        })
        if (res.ok) return true
      } catch (e) {
        logger.error('[Webhook] Error:', e)
      }
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
    return false
  },

  buildPayload(n: WebhookNotification, event: WebhookEventType, w: WebhookConfig): Record<string, unknown> {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jobsight.app'
    
    if (w.provider === 'slack') {
      return {
        text: n.title,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: n.title } },
          { type: 'section', text: { type: 'mrkdwn', text: n.message || '' } },
        ],
        attachments: [{ color: PRIORITY_COLORS[n.priority], footer: 'JobSight' }],
      }
    }
    
    if (w.provider === 'teams') {
      return {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: PRIORITY_COLORS[n.priority].replace('#', ''),
        summary: n.title,
        sections: [{ activityTitle: n.title, text: n.message }],
      }
    }
    
    if (w.provider === 'discord') {
      return {
        embeds: [{
          title: n.title,
          description: n.message,
          color: parseInt(PRIORITY_COLORS[n.priority].replace('#', ''), 16),
          timestamp: n.created_at,
        }],
      }
    }
    
    return { event, timestamp: new Date().toISOString(), data: { notification: n } }
  },

  async testWebhook(webhook: WebhookConfig): Promise<{ success: boolean; message: string }> {
    const test: WebhookNotification = {
      id: 'test', type: 'test', category: 'general', title: 'Test',
      message: 'Test notification', priority: 'normal', created_at: new Date().toISOString(),
    }
    const ok = await this.sendToWebhook(test, 'notification.created', webhook)
    return ok ? { success: true, message: 'Sent!' } : { success: false, message: 'Failed' }
  },
}

export default webhookService
