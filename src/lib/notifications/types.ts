// File: /src/lib/notifications/types.ts
// Toast notification types

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number // milliseconds, 0 = persistent
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
}

export interface ToastOptions {
  duration?: number
  action?: Toast['action']
}

// Extended notification types for the notification system

export type NotificationType =
  | 'rfi'
  | 'submittal'
  | 'task'
  | 'approval_request'
  | 'approval_completed'
  | 'mention'
  | 'comment'
  | 'change_order'
  | 'daily_report'
  | 'punch_list'
  | 'safety_incident'
  | 'document'
  | 'general'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms'

export interface NotificationAction {
  type: 'approve' | 'reject' | 'snooze' | 'reply' | 'view' | 'dismiss'
  label: string
  variant?: 'default' | 'destructive' | 'outline'
}

export interface NotificationMetadata {
  entityType?: string
  entityId?: string
  projectId?: string
  projectName?: string
  actionUrl?: string
  mentionedUsers?: string[]
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
  [key: string]: unknown
}

export interface EnhancedNotification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  read: boolean
  snoozedUntil?: string | null
  createdAt: string
  updatedAt?: string
  senderId?: string
  senderName?: string
  senderAvatar?: string
  recipientId: string
  channels: NotificationChannel[]
  metadata?: NotificationMetadata
  actions?: NotificationAction[]
  requiresAction?: boolean
  expiresAt?: string | null
  groupKey?: string // For batching similar notifications
}

export interface NotificationPreferences {
  userId: string
  enabled: boolean
  channels: {
    inApp: boolean
    email: boolean
    push: boolean
    sms: boolean
  }
  digestMode: 'immediate' | 'daily' | 'weekly' | 'none'
  digestTime?: string // HH:mm format
  digestDay?: number // 0-6 for weekly digest
  quietHoursEnabled: boolean
  quietHoursStart?: string // HH:mm format
  quietHoursEnd?: string // HH:mm format
  typePreferences: Partial<Record<NotificationType, {
    enabled: boolean
    channels: NotificationChannel[]
  }>>
  projectPreferences: Record<string, {
    enabled: boolean
    channels: NotificationChannel[]
  }>
}

export interface NotificationBatch {
  id: string
  userId: string
  type: 'daily' | 'weekly'
  notifications: EnhancedNotification[]
  createdAt: string
  sentAt?: string
  status: 'pending' | 'sent' | 'failed'
}

export interface MentionMatch {
  userId: string
  displayName: string
  startIndex: number
  endIndex: number
  raw: string
}
