/**
 * Push Notification Types
 *
 * Type definitions for push notifications, subscriptions, and preferences.
 */

// ============================================================================
// Push Subscription Types
// ============================================================================

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  expiration_time?: string | null
  user_agent?: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface CreatePushSubscription {
  user_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  expiration_time?: string | null
  user_agent?: string
}

// ============================================================================
// Push Notification Types
// ============================================================================

/**
 * Notification types that can trigger push notifications
 */
export type PushNotificationType =
  | 'rfi_response'
  | 'rfi_assigned'
  | 'submittal_approved'
  | 'submittal_rejected'
  | 'submittal_assigned'
  | 'daily_report_submitted'
  | 'punch_item_assigned'
  | 'safety_incident'
  | 'payment_approved'
  | 'payment_application'
  | 'schedule_change'
  | 'approval_request'
  | 'approval_completed'
  | 'task_assigned'
  | 'task_due'
  | 'mention'
  | 'comment'
  | 'general'

/**
 * Push notification payload structure
 */
export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  data?: PushNotificationData
  actions?: PushNotificationAction[]
  requireInteraction?: boolean
  renotify?: boolean
  silent?: boolean
  vibrate?: number[]
}

export interface PushNotificationData {
  type: PushNotificationType
  id?: string
  url?: string
  notificationId?: string
  projectId?: string
  projectName?: string
  [key: string]: unknown
}

export interface PushNotificationAction {
  action: string
  title: string
  icon?: string
}

// ============================================================================
// Push Notification Preferences
// ============================================================================

export interface PushNotificationPreferences {
  /** Enable push notifications globally */
  enabled: boolean

  /** Individual notification type preferences */
  types: {
    /** RFI responses received */
    rfiResponses: boolean

    /** Submittal approvals/rejections */
    submittalDecisions: boolean

    /** Daily report submissions */
    dailyReports: boolean

    /** Punch list assignments */
    punchItems: boolean

    /** Safety incident alerts (always on for serious incidents) */
    safetyIncidents: boolean

    /** Payment application approvals */
    paymentApprovals: boolean

    /** Schedule changes */
    scheduleChanges: boolean

    /** Approval requests */
    approvalRequests: boolean

    /** Task assignments and due dates */
    tasks: boolean

    /** Mentions in comments */
    mentions: boolean
  }

  /** Sound settings */
  sound: {
    enabled: boolean
    volume: number // 0-100
  }

  /** Vibration settings (mobile) */
  vibration: {
    enabled: boolean
    pattern: 'short' | 'medium' | 'long' | 'custom'
    customPattern?: number[]
  }

  /** Quiet hours - no push notifications during these times */
  quietHours: {
    enabled: boolean
    start: string // HH:mm format
    end: string // HH:mm format
    timezone: string
    /** Override for critical notifications (safety incidents) */
    allowCritical: boolean
  }
}

/**
 * Default push notification preferences
 */
export const DEFAULT_PUSH_PREFERENCES: PushNotificationPreferences = {
  enabled: false, // Opt-in by default
  types: {
    rfiResponses: true,
    submittalDecisions: true,
    dailyReports: false,
    punchItems: true,
    safetyIncidents: true,
    paymentApprovals: true,
    scheduleChanges: true,
    approvalRequests: true,
    tasks: true,
    mentions: true,
  },
  sound: {
    enabled: true,
    volume: 80,
  },
  vibration: {
    enabled: true,
    pattern: 'short',
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    allowCritical: true,
  },
}

// ============================================================================
// Push Notification Type Labels and Descriptions
// ============================================================================

export const PUSH_TYPE_LABELS: Record<keyof PushNotificationPreferences['types'], string> = {
  rfiResponses: 'RFI Responses',
  submittalDecisions: 'Submittal Decisions',
  dailyReports: 'Daily Reports',
  punchItems: 'Punch List Items',
  safetyIncidents: 'Safety Incidents',
  paymentApprovals: 'Payment Approvals',
  scheduleChanges: 'Schedule Changes',
  approvalRequests: 'Approval Requests',
  tasks: 'Task Assignments',
  mentions: 'Mentions',
}

export const PUSH_TYPE_DESCRIPTIONS: Record<keyof PushNotificationPreferences['types'], string> = {
  rfiResponses: 'Get notified when someone responds to your RFI',
  submittalDecisions: 'Get notified when submittals are approved or rejected',
  dailyReports: 'Get notified when daily reports are submitted',
  punchItems: 'Get notified when punch list items are assigned to you',
  safetyIncidents: 'Get alerted immediately for safety incidents (critical alerts always enabled)',
  paymentApprovals: 'Get notified when payment applications are approved',
  scheduleChanges: 'Get notified when project schedules change',
  approvalRequests: 'Get notified when items need your approval',
  tasks: 'Get notified about task assignments and due dates',
  mentions: 'Get notified when someone mentions you in a comment',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a notification type should send a push notification
 */
export function shouldSendPush(
  preferences: PushNotificationPreferences,
  type: keyof PushNotificationPreferences['types'],
  isCritical = false
): boolean {
  // Push disabled globally
  if (!preferences.enabled) {
    return false
  }

  // Check quiet hours
  if (preferences.quietHours.enabled && !isCritical) {
    if (isInQuietHours(preferences.quietHours)) {
      // Critical notifications can override quiet hours
      if (isCritical && preferences.quietHours.allowCritical) {
        return true
      }
      return false
    }
  }

  // Safety incidents always send if critical
  if (type === 'safetyIncidents' && isCritical) {
    return true
  }

  // Check individual type preference
  return preferences.types[type]
}

/**
 * Check if current time is within quiet hours
 */
export function isInQuietHours(quietHours: PushNotificationPreferences['quietHours']): boolean {
  if (!quietHours.enabled) {
    return false
  }

  const now = new Date()
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: quietHours.timezone,
  })

  const start = quietHours.start
  const end = quietHours.end

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end
  }

  // Normal range (e.g., 01:00 - 06:00)
  return currentTime >= start && currentTime <= end
}

/**
 * Get vibration pattern based on preference
 */
export function getVibrationPattern(
  vibration: PushNotificationPreferences['vibration']
): number[] | undefined {
  if (!vibration.enabled) {
    return undefined
  }

  switch (vibration.pattern) {
    case 'short':
      return [100]
    case 'medium':
      return [100, 50, 100]
    case 'long':
      return [200, 100, 200, 100, 200]
    case 'custom':
      return vibration.customPattern || [100, 50, 100]
    default:
      return [100, 50, 100]
  }
}

/**
 * Map notification type to push preference key
 */
export function mapNotificationTypeToPushPref(
  notificationType: PushNotificationType
): keyof PushNotificationPreferences['types'] | null {
  const mapping: Record<PushNotificationType, keyof PushNotificationPreferences['types'] | null> = {
    rfi_response: 'rfiResponses',
    rfi_assigned: 'rfiResponses',
    submittal_approved: 'submittalDecisions',
    submittal_rejected: 'submittalDecisions',
    submittal_assigned: 'submittalDecisions',
    daily_report_submitted: 'dailyReports',
    punch_item_assigned: 'punchItems',
    safety_incident: 'safetyIncidents',
    payment_approved: 'paymentApprovals',
    payment_application: 'paymentApprovals',
    schedule_change: 'scheduleChanges',
    approval_request: 'approvalRequests',
    approval_completed: 'approvalRequests',
    task_assigned: 'tasks',
    task_due: 'tasks',
    mention: 'mentions',
    comment: 'mentions',
    general: null,
  }

  return mapping[notificationType] || null
}
