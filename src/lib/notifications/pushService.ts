/**
 * Push Notification Service
 *
 * Web Push API integration for browser push notifications.
 * Handles subscription management, permission requests, and push notification sending.
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  expirationTime?: number | null
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  data?: {
    url?: string
    type?: string
    id?: string
    [key: string]: unknown
  }
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  requireInteraction?: boolean
  renotify?: boolean
  silent?: boolean
  vibrate?: number[]
}

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

// ============================================================================
// Push Notification Service
// ============================================================================

class PushNotificationService {
  private vapidPublicKey: string | null = null
  private swRegistration: ServiceWorkerRegistration | null = null

  /**
   * Initialize the push notification service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if push notifications are supported
      if (!this.isSupported()) {
        logger.warn('[PushService] Push notifications not supported in this browser')
        return false
      }

      // Get VAPID public key from environment
      this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || null

      if (!this.vapidPublicKey) {
        logger.warn('[PushService] VAPID public key not configured')
        return false
      }

      // Get service worker registration
      if ('serviceWorker' in navigator) {
        this.swRegistration = await navigator.serviceWorker.ready
        logger.info('[PushService] Service worker ready for push notifications')
        return true
      }

      return false
    } catch (error) {
      logger.error('[PushService] Initialization failed:', error)
      return false
    }
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  /**
   * Get current permission state
   */
  getPermissionState(): PushPermissionState {
    if (!this.isSupported()) {
      return 'unsupported'
    }
    return Notification.permission as PushPermissionState
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<PushPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported'
    }

    try {
      const permission = await Notification.requestPermission()
      logger.info('[PushService] Permission request result:', permission)
      return permission as PushPermissionState
    } catch (error) {
      logger.error('[PushService] Permission request failed:', error)
      return 'denied'
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(userId: string): Promise<PushSubscriptionData | null> {
    try {
      // Check permission
      if (Notification.permission !== 'granted') {
        const permission = await this.requestPermission()
        if (permission !== 'granted') {
          logger.warn('[PushService] Notification permission not granted')
          return null
        }
      }

      // Ensure service worker is ready
      if (!this.swRegistration) {
        await this.initialize()
      }

      if (!this.swRegistration || !this.vapidPublicKey) {
        logger.error('[PushService] Service worker or VAPID key not available')
        return null
      }

      // Check for existing subscription
      let subscription = await this.swRegistration.pushManager.getSubscription()

      // Create new subscription if needed
      if (!subscription) {
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey)

        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })

        logger.info('[PushService] New push subscription created')
      }

      // Extract subscription data
      const subscriptionData = this.extractSubscriptionData(subscription)

      // Store subscription in database
      await this.storeSubscription(userId, subscriptionData)

      return subscriptionData
    } catch (error) {
      logger.error('[PushService] Subscription failed:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      if (!this.swRegistration) {
        await this.initialize()
      }

      if (!this.swRegistration) {
        return false
      }

      // Get current subscription
      const subscription = await this.swRegistration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe()
        logger.info('[PushService] Unsubscribed from push notifications')
      }

      // Remove subscription from database
      await this.removeSubscription(userId)

      return true
    } catch (error) {
      logger.error('[PushService] Unsubscribe failed:', error)
      return false
    }
  }

  /**
   * Check if user is currently subscribed
   */
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.swRegistration) {
        await this.initialize()
      }

      if (!this.swRegistration) {
        return false
      }

      const subscription = await this.swRegistration.pushManager.getSubscription()
      return subscription !== null
    } catch (error) {
      logger.error('[PushService] Subscription check failed:', error)
      return false
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    try {
      if (!this.swRegistration) {
        await this.initialize()
      }

      if (!this.swRegistration) {
        return null
      }

      return await this.swRegistration.pushManager.getSubscription()
    } catch (error) {
      logger.error('[PushService] Get subscription failed:', error)
      return null
    }
  }

  /**
   * Show a local notification (for testing or immediate display)
   */
  async showLocalNotification(payload: PushNotificationPayload): Promise<boolean> {
    try {
      if (Notification.permission !== 'granted') {
        return false
      }

      if (!this.swRegistration) {
        await this.initialize()
      }

      if (!this.swRegistration) {
        // Fallback to basic Notification API
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/badge-72x72.png',
          tag: payload.tag,
          data: payload.data,
          requireInteraction: payload.requireInteraction,
          silent: payload.silent,
        })
        return true
      }

      // Use service worker for rich notifications
      await this.swRegistration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        image: payload.image,
        tag: payload.tag,
        data: payload.data,
        actions: payload.actions,
        requireInteraction: payload.requireInteraction,
        renotify: payload.renotify,
        silent: payload.silent,
        vibrate: payload.vibrate,
      })

      return true
    } catch (error) {
      logger.error('[PushService] Show notification failed:', error)
      return false
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Extract subscription data from PushSubscription
   */
  private extractSubscriptionData(subscription: PushSubscription): PushSubscriptionData {
    const json = subscription.toJSON()
    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: json.keys?.p256dh || '',
        auth: json.keys?.auth || '',
      },
      expirationTime: subscription.expirationTime,
    }
  }

  /**
   * Store subscription in database
   */
  private async storeSubscription(
    userId: string,
    subscriptionData: PushSubscriptionData
  ): Promise<void> {
    try {
      // Upsert subscription (update if endpoint exists, insert if new)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            endpoint: subscriptionData.endpoint,
            p256dh_key: subscriptionData.keys.p256dh,
            auth_key: subscriptionData.keys.auth,
            expiration_time: subscriptionData.expirationTime
              ? new Date(subscriptionData.expirationTime).toISOString()
              : null,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,endpoint',
          }
        )

      if (error) {
        logger.error('[PushService] Failed to store subscription:', error)
        throw error
      }

      logger.info('[PushService] Subscription stored successfully')
    } catch (error) {
      logger.error('[PushService] Store subscription error:', error)
      throw error
    }
  }

  /**
   * Remove subscription from database
   */
  private async removeSubscription(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)

      if (error) {
        logger.error('[PushService] Failed to remove subscription:', error)
        throw error
      }

      logger.info('[PushService] Subscription removed successfully')
    } catch (error) {
      logger.error('[PushService] Remove subscription error:', error)
      throw error
    }
  }

  /**
   * Convert base64 URL to Uint8Array for applicationServerKey
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const pushService = new PushNotificationService()

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Initialize push notifications
 */
export async function initializePushNotifications(): Promise<boolean> {
  return pushService.initialize()
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(userId: string): Promise<PushSubscriptionData | null> {
  return pushService.subscribe(userId)
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  return pushService.unsubscribe(userId)
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return pushService.isSupported()
}

/**
 * Get current push permission state
 */
export function getPushPermissionState(): PushPermissionState {
  return pushService.getPermissionState()
}

/**
 * Request push notification permission
 */
export async function requestPushPermission(): Promise<PushPermissionState> {
  return pushService.requestPermission()
}

/**
 * Check if currently subscribed to push
 */
export async function isPushSubscribed(): Promise<boolean> {
  return pushService.isSubscribed()
}

/**
 * Show a local notification
 */
export async function showPushNotification(
  payload: PushNotificationPayload
): Promise<boolean> {
  return pushService.showLocalNotification(payload)
}
