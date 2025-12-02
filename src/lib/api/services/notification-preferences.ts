/**
 * Notification Preferences API Service
 *
 * CRUD operations for user notification preferences.
 * Preferences are stored in the users.notification_preferences JSON field.
 */

import { supabase } from '@/lib/supabase'
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  mergeWithDefaults,
} from '@/types/notification-preferences'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// API Functions
// ============================================================================

export const notificationPreferencesApi = {
  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('users')
      .select('notification_preferences')
      .eq('id', userId)
      .single()

    if (error) {
      logger.error('[NotificationPreferencesApi] Failed to fetch preferences:', error)
      // Return defaults if fetch fails
      return DEFAULT_NOTIFICATION_PREFERENCES
    }

    // Merge with defaults to fill in any missing keys
    return mergeWithDefaults(data?.notification_preferences as Partial<NotificationPreferences>)
  },

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    // First get existing preferences
    const existing = await this.getPreferences(userId)

    // Merge with new preferences
    const updated: NotificationPreferences = {
      email: {
        ...existing.email,
        ...preferences.email,
      },
      inApp: {
        ...existing.inApp,
        ...preferences.inApp,
      },
      quietHours: preferences.quietHours !== undefined
        ? preferences.quietHours
        : existing.quietHours,
    }

    // Save to database
    const { error } = await supabase
      .from('users')
      .update({ notification_preferences: updated })
      .eq('id', userId)

    if (error) {
      logger.error('[NotificationPreferencesApi] Failed to update preferences:', error)
      throw error
    }

    return updated
  },

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(userId: string): Promise<NotificationPreferences> {
    const { error } = await supabase
      .from('users')
      .update({ notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES })
      .eq('id', userId)

    if (error) {
      logger.error('[NotificationPreferencesApi] Failed to reset preferences:', error)
      throw error
    }

    return DEFAULT_NOTIFICATION_PREFERENCES
  },

  /**
   * Enable all email notifications
   */
  async enableAllEmail(userId: string): Promise<NotificationPreferences> {
    const existing = await this.getPreferences(userId)

    const updated: NotificationPreferences = {
      ...existing,
      email: {
        approvalRequests: true,
        approvalCompleted: true,
        safetyIncidents: true,
        rfiAssigned: true,
        rfiAnswered: true,
        taskAssigned: true,
        taskDueReminder: true,
        punchItemAssigned: true,
        documentComments: true,
        dailyDigest: true,
      },
    }

    const { error } = await supabase
      .from('users')
      .update({ notification_preferences: updated })
      .eq('id', userId)

    if (error) {
      throw error
    }

    return updated
  },

  /**
   * Disable all email notifications
   */
  async disableAllEmail(userId: string): Promise<NotificationPreferences> {
    const existing = await this.getPreferences(userId)

    const updated: NotificationPreferences = {
      ...existing,
      email: {
        approvalRequests: false,
        approvalCompleted: false,
        safetyIncidents: false,
        rfiAssigned: false,
        rfiAnswered: false,
        taskAssigned: false,
        taskDueReminder: false,
        punchItemAssigned: false,
        documentComments: false,
        dailyDigest: false,
      },
    }

    const { error } = await supabase
      .from('users')
      .update({ notification_preferences: updated })
      .eq('id', userId)

    if (error) {
      throw error
    }

    return updated
  },

  /**
   * Update quiet hours settings
   */
  async updateQuietHours(
    userId: string,
    quietHours: NotificationPreferences['quietHours']
  ): Promise<NotificationPreferences> {
    return this.updatePreferences(userId, { quietHours })
  },

  /**
   * Disable quiet hours
   */
  async disableQuietHours(userId: string): Promise<NotificationPreferences> {
    return this.updatePreferences(userId, { quietHours: undefined })
  },
}

export default notificationPreferencesApi
