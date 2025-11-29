// File: /src/lib/offline/sync-manager.test.ts
// Comprehensive tests for Sync Manager
// Phase: Testing - Offline Infrastructure coverage

// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies before importing the module
vi.mock('../api/offline-client', () => ({
  OfflineClient: {
    processSyncQueue: vi.fn(() => Promise.resolve({ success: 0, failed: 0, remaining: 0 })),
  },
}))

vi.mock('@/stores/offline-store', () => ({
  useOfflineStore: {
    getState: vi.fn(() => ({
      isOnline: true,
      pendingSyncs: 5,
    })),
  },
}))

describe('SyncManager', () => {
  let SyncManager: typeof import('./sync-manager').SyncManager
  let initSyncManager: typeof import('./sync-manager').initSyncManager
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    // Spy on window event listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    // Mock ServiceWorkerRegistration (not provided by happy-dom)
    // @ts-ignore
    globalThis.ServiceWorkerRegistration = class MockServiceWorkerRegistration {
      sync = { register: vi.fn() }
    }

    // Setup navigator.serviceWorker mock (happy-dom doesn't provide this)
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          sync: { register: vi.fn() },
        }),
      },
      writable: true,
      configurable: true,
    })

    // Setup Notification mock
    // @ts-ignore - happy-dom may have partial Notification support
    globalThis.Notification = class MockNotification {
      static permission: NotificationPermission = 'granted'
      static requestPermission = vi.fn(() => Promise.resolve('granted' as NotificationPermission))
      constructor() {}
    }

    // Fresh import of the module
    const module = await import('./sync-manager')
    SyncManager = module.SyncManager
    initSyncManager = module.initSyncManager
  })

  afterEach(() => {
    vi.useRealTimers()
    addEventListenerSpy?.mockRestore()
    removeEventListenerSpy?.mockRestore()
  })

  // =============================================
  // INITIALIZATION
  // =============================================

  describe('initialize', () => {
    it('should set up online event listener', () => {
      const cleanup = SyncManager.initialize()

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      cleanup()
    })

    it('should set up periodic sync interval', () => {
      vi.useFakeTimers()
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')

      const cleanup = SyncManager.initialize()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
      cleanup()
      setIntervalSpy.mockRestore()
    })

    it('should return cleanup function that removes listeners', () => {
      const cleanup = SyncManager.initialize()
      cleanup()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    })
  })

  describe('initSyncManager', () => {
    it('should initialize and return cleanup function', () => {
      const cleanup = initSyncManager()

      expect(typeof cleanup).toBe('function')
      cleanup()
    })
  })

  // =============================================
  // STATUS
  // =============================================

  describe('getStatus', () => {
    it('should return current sync status', () => {
      const status = SyncManager.getStatus()

      expect(status).toHaveProperty('syncInProgress')
      expect(status).toHaveProperty('lastSyncAttempt')
      expect(typeof status.syncInProgress).toBe('boolean')
      expect(typeof status.lastSyncAttempt).toBe('number')
    })
  })

  // =============================================
  // NOTIFICATIONS
  // =============================================

  describe('requestNotificationPermission', () => {
    it('should return true when permission already granted', async () => {
      // @ts-ignore
      globalThis.Notification = class {
        static permission: NotificationPermission = 'granted'
        static requestPermission = vi.fn(() => Promise.resolve('granted' as NotificationPermission))
      }

      // Re-import to pick up new Notification
      vi.resetModules()
      const module = await import('./sync-manager')

      const result = await module.SyncManager.requestNotificationPermission()

      expect(result).toBe(true)
    })

    it('should return false when permission denied', async () => {
      // @ts-ignore
      globalThis.Notification = class {
        static permission: NotificationPermission = 'denied'
        static requestPermission = vi.fn(() => Promise.resolve('denied' as NotificationPermission))
      }

      // Re-import to pick up new Notification
      vi.resetModules()
      const module = await import('./sync-manager')

      const result = await module.SyncManager.requestNotificationPermission()

      expect(result).toBe(false)
    })

    it('should return false when Notification API not available', async () => {
      // @ts-ignore
      delete globalThis.Notification

      // Re-import to pick up missing Notification
      vi.resetModules()
      const module = await import('./sync-manager')

      const result = await module.SyncManager.requestNotificationPermission()

      expect(result).toBe(false)
    })

    it('should request permission when not decided', async () => {
      const mockRequestPermission = vi.fn(() => Promise.resolve('granted' as NotificationPermission))
      // @ts-ignore
      globalThis.Notification = class {
        static permission: NotificationPermission = 'default'
        static requestPermission = mockRequestPermission
      }

      // Re-import to pick up new Notification
      vi.resetModules()
      const module = await import('./sync-manager')

      const result = await module.SyncManager.requestNotificationPermission()

      expect(mockRequestPermission).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })
})
