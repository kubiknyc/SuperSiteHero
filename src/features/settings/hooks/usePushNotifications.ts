/**
 * Push Notifications Hook
 *
 * React hook for managing push notification subscription and preferences.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import {
  pushService,
  type PushPermissionState,
} from '@/lib/notifications/pushService'
import {
  type PushNotificationPreferences,
  DEFAULT_PUSH_PREFERENCES,
} from '@/types/push-notifications'
import { toast } from 'sonner'

// ============================================================================
// Types
// ============================================================================

interface UsePushNotificationsReturn {
  /** Whether push notifications are supported in this browser */
  isSupported: boolean
  /** Current permission state */
  permissionState: PushPermissionState
  /** Whether the user is currently subscribed */
  isSubscribed: boolean
  /** Loading state for async operations */
  isLoading: boolean
  /** Current push notification preferences */
  pushPreferences: PushNotificationPreferences | null
  /** Subscribe to push notifications */
  subscribe: () => Promise<boolean>
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>
  /** Request notification permission */
  requestPermission: () => Promise<PushPermissionState>
  /** Update push notification preferences */
  updatePushPreferences: (prefs: PushNotificationPreferences) => Promise<void>
  /** Send a test notification */
  testNotification: () => Promise<void>
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth()
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState<PushPermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pushPreferences, setPushPreferences] = useState<PushNotificationPreferences | null>(null)

  // Initialize and check subscription status
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)

        // Check if push is supported
        const supported = pushService.isSupported()
        setIsSupported(supported)

        if (!supported) {
          setIsLoading(false)
          return
        }

        // Initialize push service
        await pushService.initialize()

        // Get current permission state
        const permission = pushService.getPermissionState()
        setPermissionState(permission)

        // Check if currently subscribed
        const subscribed = await pushService.isSubscribed()
        setIsSubscribed(subscribed)

        // Load preferences from database
        if (user?.id) {
          await loadPreferences(user.id)
        }
      } catch (error) {
        logger.error('[usePushNotifications] Initialization error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [user?.id])

  // Load preferences from database
  const loadPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('push_notification_preferences')
        .eq('id', userId)
        .single()

      if (error) {
        logger.error('[usePushNotifications] Failed to load preferences:', error)
        setPushPreferences(DEFAULT_PUSH_PREFERENCES)
        return
      }

      const prefs = data?.push_notification_preferences as PushNotificationPreferences | null
      setPushPreferences(prefs ? { ...DEFAULT_PUSH_PREFERENCES, ...prefs } : DEFAULT_PUSH_PREFERENCES)
    } catch (error) {
      logger.error('[usePushNotifications] Load preferences error:', error)
      setPushPreferences(DEFAULT_PUSH_PREFERENCES)
    }
  }

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      toast.error('You must be logged in to enable push notifications')
      return false
    }

    try {
      setIsLoading(true)

      // Request permission if needed
      if (permissionState !== 'granted') {
        const permission = await pushService.requestPermission()
        setPermissionState(permission)

        if (permission !== 'granted') {
          toast.error('Please allow notifications in your browser settings')
          return false
        }
      }

      // Subscribe
      const subscription = await pushService.subscribe(user.id)

      if (subscription) {
        setIsSubscribed(true)

        // Update preferences to enabled
        const newPrefs = {
          ...(pushPreferences || DEFAULT_PUSH_PREFERENCES),
          enabled: true,
        }
        await updatePushPreferences(newPrefs)

        toast.success('Push notifications enabled')
        return true
      }

      toast.error('Failed to enable push notifications')
      return false
    } catch (error) {
      logger.error('[usePushNotifications] Subscribe error:', error)
      toast.error('Failed to enable push notifications')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, permissionState, pushPreferences])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      return false
    }

    try {
      setIsLoading(true)

      const success = await pushService.unsubscribe(user.id)

      if (success) {
        setIsSubscribed(false)

        // Update preferences to disabled
        const newPrefs = {
          ...(pushPreferences || DEFAULT_PUSH_PREFERENCES),
          enabled: false,
        }
        await updatePushPreferences(newPrefs)

        toast.success('Push notifications disabled')
        return true
      }

      toast.error('Failed to disable push notifications')
      return false
    } catch (error) {
      logger.error('[usePushNotifications] Unsubscribe error:', error)
      toast.error('Failed to disable push notifications')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, pushPreferences])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<PushPermissionState> => {
    try {
      const permission = await pushService.requestPermission()
      setPermissionState(permission)
      return permission
    } catch (error) {
      logger.error('[usePushNotifications] Request permission error:', error)
      return 'denied'
    }
  }, [])

  // Update push notification preferences
  const updatePushPreferences = useCallback(
    async (prefs: PushNotificationPreferences): Promise<void> => {
      if (!user?.id) {
        return
      }

      try {
        setPushPreferences(prefs)

        const { error } = await supabase
          .from('users')
          .update({ push_notification_preferences: prefs })
          .eq('id', user.id)

        if (error) {
          logger.error('[usePushNotifications] Failed to update preferences:', error)
          toast.error('Failed to save preferences')
          return
        }

        logger.info('[usePushNotifications] Preferences updated')
      } catch (error) {
        logger.error('[usePushNotifications] Update preferences error:', error)
        toast.error('Failed to save preferences')
      }
    },
    [user?.id]
  )

  // Send a test notification
  const testNotification = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)

      const success = await pushService.showLocalNotification({
        title: 'Test Notification',
        body: 'Push notifications are working correctly!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'test-notification',
        data: {
          type: 'general',
          url: '/settings/notifications',
        },
        actions: [
          { action: 'view', title: 'View Settings' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      })

      if (success) {
        toast.success('Test notification sent')
      } else {
        toast.error('Failed to send test notification')
      }
    } catch (error) {
      logger.error('[usePushNotifications] Test notification error:', error)
      toast.error('Failed to send test notification')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isSupported,
    permissionState,
    isSubscribed,
    isLoading,
    pushPreferences,
    subscribe,
    unsubscribe,
    requestPermission,
    updatePushPreferences,
    testNotification,
  }
}
