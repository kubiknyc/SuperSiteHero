/**
 * Notification Preferences Types
 *
 * Defines the structure for user notification preferences.
 * Stored in the users.notification_preferences JSON field.
 */

// ============================================================================
// Email Notification Preferences
// ============================================================================

export interface EmailNotificationPreferences {
  /** Receive emails when approval is requested */
  approvalRequests: boolean

  /** Receive emails when approval is completed */
  approvalCompleted: boolean

  /** Receive emails for safety incidents */
  safetyIncidents: boolean

  /** Receive emails when assigned to an RFI */
  rfiAssigned: boolean

  /** Receive emails when an RFI you created is answered */
  rfiAnswered: boolean

  /** Receive emails when assigned to a task */
  taskAssigned: boolean

  /** Receive reminder emails for tasks due soon (24h before) */
  taskDueReminder: boolean

  /** Receive emails when assigned to a punch item */
  punchItemAssigned: boolean

  /** Receive emails for document comments */
  documentComments: boolean

  /** Receive daily digest email summarizing activity */
  dailyDigest: boolean

  /** Receive emails for action item due date alerts (7, 3, 1 days before and overdue) */
  actionItemAlerts: boolean

  /** Receive emails when meeting minutes are distributed */
  meetingMinutes: boolean
}

// ============================================================================
// In-App Notification Preferences
// ============================================================================

export interface InAppNotificationPreferences {
  /** Enable all in-app notifications */
  all: boolean
}

// ============================================================================
// Quiet Hours Settings
// ============================================================================

export interface QuietHoursSettings {
  /** Whether quiet hours are enabled */
  enabled: boolean

  /** Start time in 24h format (e.g., "22:00") */
  start: string

  /** End time in 24h format (e.g., "07:00") */
  end: string

  /** User's timezone (e.g., "America/New_York") */
  timezone: string
}

// ============================================================================
// Combined Notification Preferences
// ============================================================================

export interface NotificationPreferences {
  /** Email notification settings */
  email: EmailNotificationPreferences

  /** In-app notification settings */
  inApp: InAppNotificationPreferences

  /** Quiet hours (no notifications during these times) */
  quietHours?: QuietHoursSettings

  /** Index signature for Supabase Json compatibility */
  [key: string]: any
}

// ============================================================================
// Default Preferences
// ============================================================================

export const DEFAULT_EMAIL_PREFERENCES: EmailNotificationPreferences = {
  approvalRequests: true,
  approvalCompleted: true,
  safetyIncidents: true,
  rfiAssigned: true,
  rfiAnswered: true,
  taskAssigned: true,
  taskDueReminder: true,
  punchItemAssigned: true,
  documentComments: true,
  dailyDigest: false,
  actionItemAlerts: true,
  meetingMinutes: true,
}

export const DEFAULT_INAPP_PREFERENCES: InAppNotificationPreferences = {
  all: true,
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: DEFAULT_EMAIL_PREFERENCES,
  inApp: DEFAULT_INAPP_PREFERENCES,
  quietHours: undefined,
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Merge user preferences with defaults (for missing keys)
 */
export function mergeWithDefaults(
  preferences: Partial<NotificationPreferences> | null | undefined
): NotificationPreferences {
  if (!preferences) {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }

  return {
    email: {
      ...DEFAULT_EMAIL_PREFERENCES,
      ...preferences.email,
    },
    inApp: {
      ...DEFAULT_INAPP_PREFERENCES,
      ...preferences.inApp,
    },
    quietHours: preferences.quietHours,
  }
}

/**
 * Check if notifications should be sent based on preferences
 */
export function shouldSendEmail(
  preferences: NotificationPreferences,
  notificationType: keyof EmailNotificationPreferences
): boolean {
  // Check if this notification type is enabled
  if (!preferences.email[notificationType]) {
    return false
  }

  // Check quiet hours
  if (preferences.quietHours?.enabled) {
    const now = new Date()
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: preferences.quietHours.timezone,
    })

    const start = preferences.quietHours.start
    const end = preferences.quietHours.end

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (start > end) {
      // If current time is after start OR before end, we're in quiet hours
      if (currentTime >= start || currentTime <= end) {
        return false
      }
    } else {
      // Normal range (e.g., 01:00 - 06:00)
      if (currentTime >= start && currentTime <= end) {
        return false
      }
    }
  }

  return true
}

/**
 * Check if in-app notifications should be shown
 */
export function shouldShowInApp(preferences: NotificationPreferences): boolean {
  return preferences.inApp.all
}

// ============================================================================
// Notification Type Labels (for UI)
// ============================================================================

export const NOTIFICATION_TYPE_LABELS: Record<keyof EmailNotificationPreferences, string> = {
  approvalRequests: 'Approval Requests',
  approvalCompleted: 'Approval Decisions',
  safetyIncidents: 'Safety Incidents',
  rfiAssigned: 'RFI Assignments',
  rfiAnswered: 'RFI Answers',
  taskAssigned: 'Task Assignments',
  taskDueReminder: 'Task Due Reminders',
  punchItemAssigned: 'Punch Item Assignments',
  documentComments: 'Document Comments',
  dailyDigest: 'Daily Digest',
  actionItemAlerts: 'Action Item Alerts',
  meetingMinutes: 'Meeting Minutes',
}

export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<keyof EmailNotificationPreferences, string> = {
  approvalRequests: 'Get notified when items need your approval',
  approvalCompleted: 'Get notified when your submissions are approved or rejected',
  safetyIncidents: 'Get notified about safety incidents on your projects',
  rfiAssigned: 'Get notified when you are assigned to an RFI',
  rfiAnswered: 'Get notified when someone answers your RFI',
  taskAssigned: 'Get notified when a task is assigned to you',
  taskDueReminder: 'Get reminded 24 hours before a task is due',
  punchItemAssigned: 'Get notified when a punch item is assigned to you',
  documentComments: 'Get notified when someone comments on your documents',
  dailyDigest: 'Receive a daily summary of all activity',
  actionItemAlerts: 'Get alerts when action items are due soon or overdue (7, 3, 1 days before)',
  meetingMinutes: 'Get notified when meeting minutes are distributed to you',
}
