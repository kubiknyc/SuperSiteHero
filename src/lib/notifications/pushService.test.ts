/**
 * Push Notification Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the modules before importing
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({ error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Now import the module
import {
  pushService,
  isPushSupported,
  getPushPermissionState,
  type PushSubscriptionData,
} from './pushService'

describe('Push Notification Service', () => {
  // Store original implementations
  const originalNavigator = { ...navigator }
  const originalNotification = (global as any).Notification

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore originals
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
    ;(global as any).Notification = originalNotification
  })

  describe('isPushSupported', () => {
    it('should return true when all required APIs are available', () => {
      // Mock navigator with serviceWorker and PushManager
      Object.defineProperty(global, 'navigator', {
        value: {
          ...navigator,
          serviceWorker: {},
        },
        writable: true,
      })
      ;(global as any).PushManager = class {}
      ;(global as any).Notification = class {
        static permission = 'default'
      }

      expect(isPushSupported()).toBe(true)
    })

    it('should return false when serviceWorker is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      })

      expect(isPushSupported()).toBe(false)
    })

    it('should return false when PushManager is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {},
        },
        writable: true,
      })
      delete (global as any).PushManager

      expect(isPushSupported()).toBe(false)
    })
  })

  describe('getPushPermissionState', () => {
    it('should return "unsupported" when push is not supported', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      })

      expect(getPushPermissionState()).toBe('unsupported')
    })

    it('should return "granted" when permission is granted', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {},
        },
        writable: true,
      })
      ;(global as any).PushManager = class {}
      ;(global as any).Notification = class {
        static permission = 'granted'
      }

      expect(getPushPermissionState()).toBe('granted')
    })

    it('should return "denied" when permission is denied', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {},
        },
        writable: true,
      })
      ;(global as any).PushManager = class {}
      ;(global as any).Notification = class {
        static permission = 'denied'
      }

      expect(getPushPermissionState()).toBe('denied')
    })

    it('should return "default" when permission is not set', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          serviceWorker: {},
        },
        writable: true,
      })
      ;(global as any).PushManager = class {}
      ;(global as any).Notification = class {
        static permission = 'default'
      }

      expect(getPushPermissionState()).toBe('default')
    })
  })

  describe('PushNotificationService', () => {
    describe('initialize', () => {
      it('should return false when not supported', async () => {
        Object.defineProperty(global, 'navigator', {
          value: {},
          writable: true,
        })

        const result = await pushService.initialize()
        expect(result).toBe(false)
      })

      it('should return false when VAPID key is not configured', async () => {
        Object.defineProperty(global, 'navigator', {
          value: {
            serviceWorker: {
              ready: Promise.resolve({
                pushManager: {},
              }),
            },
          },
          writable: true,
        })
        ;(global as any).PushManager = class {}
        ;(global as any).Notification = class {
          static permission = 'default'
        }

        // Ensure VAPID key env var is not set
        const originalEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY
        delete import.meta.env.VITE_VAPID_PUBLIC_KEY

        const result = await pushService.initialize()
        expect(result).toBe(false)

        // Restore
        if (originalEnv) {
          import.meta.env.VITE_VAPID_PUBLIC_KEY = originalEnv
        }
      })
    })

    describe('isSubscribed', () => {
      it('should return false when not initialized', async () => {
        Object.defineProperty(global, 'navigator', {
          value: {},
          writable: true,
        })

        const result = await pushService.isSubscribed()
        expect(result).toBe(false)
      })
    })

    describe('showLocalNotification', () => {
      it('should return false when permission is not granted', async () => {
        Object.defineProperty(global, 'navigator', {
          value: {
            serviceWorker: {},
          },
          writable: true,
        })
        ;(global as any).PushManager = class {}
        ;(global as any).Notification = class {
          static permission = 'denied'
        }

        const result = await pushService.showLocalNotification({
          title: 'Test',
          body: 'Test notification',
        })

        expect(result).toBe(false)
      })

      it('should create a notification when permission is granted', async () => {
        const mockNotification = vi.fn()
        Object.defineProperty(global, 'navigator', {
          value: {
            serviceWorker: {},
          },
          writable: true,
        })
        ;(global as any).PushManager = class {}
        ;(global as any).Notification = class {
          static permission = 'granted'
          constructor(title: string, options: any) {
            mockNotification(title, options)
          }
        }

        const result = await pushService.showLocalNotification({
          title: 'Test Title',
          body: 'Test notification body',
        })

        expect(result).toBe(true)
        expect(mockNotification).toHaveBeenCalledWith(
          'Test Title',
          expect.objectContaining({
            body: 'Test notification body',
          })
        )
      })
    })
  })
})

describe('PushSubscriptionData', () => {
  it('should have correct structure', () => {
    const subscription: PushSubscriptionData = {
      endpoint: 'https://push.example.com/send/abc123',
      keys: {
        p256dh: 'base64-encoded-key',
        auth: 'base64-encoded-auth',
      },
      expirationTime: null,
    }

    expect(subscription.endpoint).toBeDefined()
    expect(subscription.keys.p256dh).toBeDefined()
    expect(subscription.keys.auth).toBeDefined()
  })
})
