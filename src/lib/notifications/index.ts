/**
 * Notifications Module
 *
 * Centralized exports for notification-related services and hooks.
 */

// Notification Service (in-app and email)
export {
  notificationService,
  sendApprovalRequestNotification,
  sendApprovalCompletedNotification,
  sendIncidentNotification,
  sendNotification,
  sendNoticeResponseDueNotification,
  sendNoticeOverdueNotification,
  sendTaskAssignedNotification,
  sendRfiAssignedNotification,
  sendChangeOrderStatusNotification,
  sendBidSubmittedNotification,
  sendPortalInvitationNotification,
  type NotificationRecipient,
  type NotificationOptions,
} from './notification-service'

// Push Notification Service
export {
  pushService,
  initializePushNotifications,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSupported,
  getPushPermissionState,
  requestPushPermission,
  isPushSubscribed,
  showPushNotification,
  type PushSubscriptionData,
  type PushNotificationPayload,
  type PushPermissionState,
} from './pushService'

// Toast Context and Hooks
export { ToastProvider, useToast, toast } from './ToastContext'
export { useNotifications } from './useNotifications'

// Types
export type {
  Toast,
  ToastType,
  ToastOptions,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationAction,
  NotificationMetadata,
  EnhancedNotification,
  NotificationPreferences,
  NotificationBatch,
  MentionMatch,
} from './types'

// Webhook Service
export {
  webhookService,
  type WebhookProvider,
  type WebhookEventType,
  type WebhookConfig,
  type WebhookNotification,
} from './webhooks'

// Batching Service
export { batchingService } from './batchingService'
