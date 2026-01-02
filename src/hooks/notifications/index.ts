/**
 * Notification Hooks
 *
 * Re-exports all notification-related hooks for easy importing
 */

// Core notification hooks
export { useNotifications } from './useNotifications'
export type { Notification, NotificationFilters, NotificationStats } from './useNotifications'

export { useNotificationGroups } from './useNotificationGroups'
export type {
  GroupByType,
  GroupedNotification,
  NotificationGroup,
} from './useNotificationGroups'

export { useNotificationActions } from './useNotificationActions'
export type {
  ActionType,
  NotificationAction,
  ActionResult,
} from './useNotificationActions'

// Mention support
export { useMentions } from './useMentions'
export type {
  MentionUser,
  MentionSuggestion,
  ParsedMention,
  MentionContext,
} from './useMentions'

// Batching support
export { useNotificationBatching } from './useNotificationBatching'
export type {
  BatchWindow,
  NotificationBatchWindow,
  DeliveryMode,
  NotificationDeliveryMode,
  NotificationBatchConfig,
  BatchedNotification,
  RawNotification,
  DigestSummary,
} from './useNotificationBatching'

// Webhook support
export { useWebhooks, WEBHOOK_PROVIDERS, WEBHOOK_EVENTS } from './useWebhooks'
export type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookStats,
} from './useWebhooks'
