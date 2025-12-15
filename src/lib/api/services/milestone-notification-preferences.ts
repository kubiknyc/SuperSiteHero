/**
 * Milestone Notification Preferences API Service
 *
 * CRUD operations for client milestone notification preferences.
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import {
  MilestoneNotificationPreference,
  CreateMilestoneNotificationPreferenceDTO,
  UpdateMilestoneNotificationPreferenceDTO,
  BulkUpdateMilestonePreferencesDTO,
  MilestoneEventType,
  DEFAULT_MILESTONE_PREFERENCES,
  getDefaultPreference,
} from '@/types/milestone-notification-preferences'

// ============================================================================
// API Functions
// ============================================================================

export const milestoneNotificationPreferencesApi = {
  /**
   * Get all notification preferences for a user
   */
  async getPreferences(
    userId: string,
    projectId?: string | null
  ): Promise<MilestoneNotificationPreference[]> {
    try {
      let query = supabase
        .from('milestone_notification_preferences')
        .select('*')
        .eq('user_id', userId)

      if (projectId !== undefined) {
        if (projectId === null) {
          query = query.is('project_id', null)
        } else {
          query = query.eq('project_id', projectId)
        }
      }

      const { data, error } = await query.order('event_type')

      if (error) {
        logger.error('[MilestoneNotificationPreferencesApi] Failed to fetch preferences:', error)
        throw error
      }

      return data || []
    } catch (error) {
      logger.error('[MilestoneNotificationPreferencesApi] Error in getPreferences:', error)
      throw error
    }
  },

  /**
   * Get preference for a specific event type
   */
  async getPreference(
    userId: string,
    eventType: MilestoneEventType,
    projectId?: string | null
  ): Promise<MilestoneNotificationPreference | null> {
    try {
      let query = supabase
        .from('milestone_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('event_type', eventType)

      if (projectId === null) {
        query = query.is('project_id', null)
      } else if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) {
        logger.error('[MilestoneNotificationPreferencesApi] Failed to fetch preference:', error)
        throw error
      }

      return data
    } catch (error) {
      logger.error('[MilestoneNotificationPreferencesApi] Error in getPreference:', error)
      throw error
    }
  },

  /**
   * Get or create preference with defaults
   */
  async getOrCreatePreference(
    userId: string,
    eventType: MilestoneEventType,
    projectId?: string | null
  ): Promise<MilestoneNotificationPreference> {
    try {
      // Try to get existing preference
      const existing = await this.getPreference(userId, eventType, projectId)

      if (existing) {
        return existing
      }

      // Create with defaults
      const defaultPref = getDefaultPreference(userId, eventType, projectId)
      return await this.createPreference(defaultPref)
    } catch (error) {
      logger.error('[MilestoneNotificationPreferencesApi] Error in getOrCreatePreference:', error)
      throw error
    }
  },

  /**
   * Create a new notification preference
   */
  async createPreference(
    preference: CreateMilestoneNotificationPreferenceDTO
  ): Promise<MilestoneNotificationPreference> {
    try {
      const { data, error } = await supabase
        .from('milestone_notification_preferences')
        .insert({
          user_id: preference.user_id,
          project_id: preference.project_id ?? null,
          event_type: preference.event_type,
          email_enabled: preference.email_enabled ?? true,
          in_app_enabled: preference.in_app_enabled ?? true,
          sms_enabled: preference.sms_enabled ?? false,
          push_enabled: preference.push_enabled ?? false,
        })
        .select()
        .single()

      if (error) {
        logger.error('[MilestoneNotificationPreferencesApi] Failed to create preference:', error)
        throw error
      }

      return data
    } catch (error) {
      logger.error('[MilestoneNotificationPreferencesApi] Error in createPreference:', error)
      throw error
    }
  },

  /**
   * Update an existing notification preference
   */
  async updatePreference(
    id: string,
    updates: UpdateMilestoneNotificationPreferenceDTO
  ): Promise<MilestoneNotificationPreference> {
    try {
      const { data, error } = await supabase
        .from('milestone_notification_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error('[MilestoneNotificationPreferencesApi] Failed to update preference:', error)
        throw error
      }

      return data
    } catch (error) {
      logger.error('[MilestoneNotificationPreferencesApi] Error in updatePreference:', error)
      throw error
    }
  },

  /**
   * Update or create preference for a specific event type
   */
  async upsertPreference(
    userId: string,
    eventType: MilestoneEventType,
    updates: UpdateMilestoneNotificationPreferenceDTO,
    projectId?: string | null
  ): Promise<MilestoneNotificationPreference> {
    try {
      // Check if preference exists
      const existing = await this.getPreference(userId, eventType, projectId)

      if (existing) {
        return await this.updatePreference(existing.id, updates)
      } else {
        const defaultPref = getDefaultPreference(userId, eventType, projectId)
        return await this.createPreference({
          ...defaultPref,
          ...updates,
        })
      }
    } catch (error) {
      logger.error('[MilestoneNotificationPreferencesApi] Error in upsertPreference:', error)
      throw error
    }
  },

  /**
   * Bulk update multiple preferences
   */
  async bulkUpdatePreferences(
    data: BulkUpdateMilestonePreferencesDTO
  ): Promise<MilestoneNotificationPreference[]> {
    try {
      const results: MilestoneNotificationPreference[] = []

      // Process each preference update
      for (const pref of data.preferences) {
        const result = await this.upsertPreference(
          data.user_id,
          pref.event_type,
          {
            email_enabled: pref.email_enabled,
            in_app_enabled: pref.in_app_enabled,
            sms_enabled: pref.sms_enabled,
            push_enabled: pref.push_enabled,
          },
          data.project_id
        )
        results.push(result)
      }

      return results
    } catch (error) {
      logger.error('[MilestoneNotificationPreferencesApi] Error in bulkUpdatePreferences:', error)
      throw error
    }
  },

  /**
   * Reset preferences to defaults for a user
   */
  async resetToDefaults(userId: string, projectId?: string | null): Promise<void> {
    try {
      // Delete existing preferences
      let deleteQuery = supabase
        .from('milestone_notification_preferences')
        .delete()
        .eq('user_id', userId)

      if (projectId === null) {
        deleteQuery = deleteQuery.is('project_id', null)
      } else if (projectId) {
        deleteQuery = deleteQuery.eq('project_id', projectId)
      }

      const { error: deleteError } = await deleteQuery

      if (deleteError) {
        logger.error('[MilestoneNotificationPreferencesApi] Failed to delete preferences:', deleteError)
        throw deleteError
      }

      // Create default preferences
      const eventTypes = Object.keys(DEFAULT_MILESTONE_PREFERENCES) as MilestoneEventType[]
      const defaultPrefs = eventTypes.map((eventType) =>
        getDefaultPreference(userId, eventType, projectId)
      )

      const { error: insertError } = await supabase
        .from('milestone_notification_preferences')
        .insert(defaultPrefs)

      if (insertError) {
        logger.error('[MilestoneNotificationPreferencesApi] Failed to create default preferences:', insertError)
        throw insertError
      }
    } catch (error) {
      logger.error('[MilestoneNotificationPreferencesApi] Error in resetToDefaults:', error)
      throw error
    }
  },

  /**
   * Check if user should be notified for an event
   */
  async shouldNotify(
    userId: string,
    eventType: MilestoneEventType,
    channel: 'email' | 'in_app' | 'sms' | 'push',
    projectId?: string | null
  ): Promise<boolean> {
    try {
      const preference = await this.getPreference(userId, eventType, projectId)

      // If no preference exists, use defaults
      if (!preference) {
        const defaults = DEFAULT_MILESTONE_PREFERENCES[eventType]
        return defaults[`${channel}_enabled`] ?? false
      }

      return preference[`${channel}_enabled`] ?? false
    } catch (error) {
      logger.error('[MilestoneNotificationPreferencesApi] Error in shouldNotify:', error)
      // Default to not sending on error
      return false
    }
  },

  /**
   * Initialize default preferences for a new user
   */
  async initializeDefaults(userId: string, projectId?: string | null): Promise<void> {
    try {
      // Check if preferences already exist
      const existing = await this.getPreferences(userId, projectId)

      if (existing.length > 0) {
        logger.info('[MilestoneNotificationPreferencesApi] Preferences already exist for user')
        return
      }

      // Create default preferences
      const eventTypes = Object.keys(DEFAULT_MILESTONE_PREFERENCES) as MilestoneEventType[]
      const defaultPrefs = eventTypes.map((eventType) =>
        getDefaultPreference(userId, eventType, projectId)
      )

      const { error } = await supabase
        .from('milestone_notification_preferences')
        .insert(defaultPrefs)

      if (error) {
        logger.error('[MilestoneNotificationPreferencesApi] Failed to initialize defaults:', error)
        throw error
      }

      logger.info('[MilestoneNotificationPreferencesApi] Initialized default preferences for user')
    } catch (error) {
      logger.error('[MilestoneNotificationPreferencesApi] Error in initializeDefaults:', error)
      throw error
    }
  },
}

export default milestoneNotificationPreferencesApi
