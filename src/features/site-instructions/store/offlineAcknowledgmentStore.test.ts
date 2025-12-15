// File: /src/features/site-instructions/store/offlineAcknowledgmentStore.test.ts
// Tests for the offline acknowledgment store
// Milestone 1.2: Site Instructions QR Code Workflow

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useOfflineAcknowledgmentStore,
  captureDeviceInfo,
  usePendingAcknowledgmentCount,
  usePendingAcknowledgments,
} from './offlineAcknowledgmentStore'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('offlineAcknowledgmentStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    // Reset store state
    const { result } = renderHook(() => useOfflineAcknowledgmentStore())
    act(() => {
      result.current.clearSyncQueue()
      // Clear all pending acknowledgments
      result.current.pendingAcknowledgments.forEach((ack) => {
        result.current.removeAcknowledgment(ack.id)
      })
    })
  })

  describe('addAcknowledgment', () => {
    it('should add a new acknowledgment to pending list', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      let id: string = ''
      act(() => {
        id = result.current.addAcknowledgment({
          site_instruction_id: 'test-instruction-123',
          acknowledged_by_name: 'John Doe',
          acknowledged_at: new Date().toISOString(),
        })
      })

      expect(id).toBeDefined()
      expect(result.current.pendingAcknowledgments).toHaveLength(1)
      expect(result.current.pendingAcknowledgments[0].acknowledged_by_name).toBe('John Doe')
      expect(result.current.pendingAcknowledgments[0].synced).toBe(false)
    })

    it('should add entry to sync queue', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      act(() => {
        result.current.addAcknowledgment({
          site_instruction_id: 'test-instruction-123',
          acknowledged_by_name: 'Jane Doe',
          acknowledged_at: new Date().toISOString(),
        })
      })

      expect(result.current.syncQueue).toHaveLength(1)
      expect(result.current.syncQueue[0].operation).toBe('create')
    })
  })

  describe('updateAcknowledgment', () => {
    it('should update an existing acknowledgment', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      let id: string = ''
      act(() => {
        id = result.current.addAcknowledgment({
          site_instruction_id: 'test-instruction-123',
          acknowledged_by_name: 'Original Name',
          acknowledged_at: new Date().toISOString(),
        })
      })

      act(() => {
        result.current.updateAcknowledgment(id, {
          acknowledged_by_name: 'Updated Name',
          notes: 'Updated notes',
        })
      })

      const updated = result.current.pendingAcknowledgments.find((a) => a.id === id)
      expect(updated?.acknowledged_by_name).toBe('Updated Name')
      expect(updated?.notes).toBe('Updated notes')
    })
  })

  describe('removeAcknowledgment', () => {
    it('should remove acknowledgment and related sync queue entry', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      let id: string = ''
      act(() => {
        id = result.current.addAcknowledgment({
          site_instruction_id: 'test-instruction-123',
          acknowledged_by_name: 'To Remove',
          acknowledged_at: new Date().toISOString(),
        })
      })

      const initialQueueLength = result.current.syncQueue.length

      act(() => {
        result.current.removeAcknowledgment(id)
      })

      expect(result.current.pendingAcknowledgments.find((a) => a.id === id)).toBeUndefined()
      expect(result.current.syncQueue.length).toBeLessThan(initialQueueLength)
    })
  })

  describe('markSynced', () => {
    it('should mark acknowledgment as synced and remove from queue', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      let id: string = ''
      act(() => {
        id = result.current.addAcknowledgment({
          site_instruction_id: 'test-instruction-123',
          acknowledged_by_name: 'To Sync',
          acknowledged_at: new Date().toISOString(),
        })
      })

      act(() => {
        result.current.markSynced(id, 'server-id-456')
      })

      const synced = result.current.pendingAcknowledgments.find((a) => a.id === id)
      expect(synced?.synced).toBe(true)
      expect(synced?.server_id).toBe('server-id-456')
      expect(result.current.syncQueue.find((s) => s.acknowledgment.id === id)).toBeUndefined()
    })
  })

  describe('markSyncError', () => {
    it('should record sync error and increment attempts', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      let id: string = ''
      act(() => {
        id = result.current.addAcknowledgment({
          site_instruction_id: 'test-instruction-123',
          acknowledged_by_name: 'Will Fail',
          acknowledged_at: new Date().toISOString(),
        })
      })

      act(() => {
        result.current.markSyncError(id, 'Network error')
      })

      const failed = result.current.pendingAcknowledgments.find((a) => a.id === id)
      expect(failed?.sync_error).toBe('Network error')
      expect(failed?.sync_attempts).toBe(1)
    })
  })

  describe('photo management', () => {
    it('should add and remove photos', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      let photoId: string = ''
      act(() => {
        photoId = result.current.addPhoto({
          localUrl: 'blob:photo-url',
          acknowledgmentId: 'test-ack-123',
          caption: 'Test photo',
          createdAt: new Date().toISOString(),
        })
      })

      expect(result.current.pendingPhotos).toHaveLength(1)
      expect(result.current.pendingPhotos[0].caption).toBe('Test photo')

      act(() => {
        result.current.removePhoto(photoId)
      })

      expect(result.current.pendingPhotos).toHaveLength(0)
    })

    it('should get photos for specific acknowledgment', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      act(() => {
        result.current.addPhoto({
          localUrl: 'blob:photo-1',
          acknowledgmentId: 'ack-1',
          createdAt: new Date().toISOString(),
        })
        result.current.addPhoto({
          localUrl: 'blob:photo-2',
          acknowledgmentId: 'ack-1',
          createdAt: new Date().toISOString(),
        })
        result.current.addPhoto({
          localUrl: 'blob:photo-3',
          acknowledgmentId: 'ack-2',
          createdAt: new Date().toISOString(),
        })
      })

      const ack1Photos = result.current.getPhotosForAcknowledgment('ack-1')
      expect(ack1Photos).toHaveLength(2)

      const ack2Photos = result.current.getPhotosForAcknowledgment('ack-2')
      expect(ack2Photos).toHaveLength(1)
    })
  })

  describe('sync queue management', () => {
    it('should increment sync attempt count', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      act(() => {
        result.current.addAcknowledgment({
          site_instruction_id: 'test-instruction-123',
          acknowledged_by_name: 'Test',
          acknowledged_at: new Date().toISOString(),
        })
      })

      const entryId = result.current.syncQueue[0]?.id

      act(() => {
        result.current.incrementAttempt(entryId, 'First attempt failed')
      })

      expect(result.current.syncQueue[0]?.attempts).toBe(1)
      expect(result.current.syncQueue[0]?.error).toBe('First attempt failed')
    })

    it('should clear sync queue', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      act(() => {
        result.current.addAcknowledgment({
          site_instruction_id: 'test-1',
          acknowledged_by_name: 'Test 1',
          acknowledged_at: new Date().toISOString(),
        })
        result.current.addAcknowledgment({
          site_instruction_id: 'test-2',
          acknowledged_by_name: 'Test 2',
          acknowledged_at: new Date().toISOString(),
        })
      })

      expect(result.current.syncQueue.length).toBeGreaterThan(0)

      act(() => {
        result.current.clearSyncQueue()
      })

      expect(result.current.syncQueue).toHaveLength(0)
    })
  })

  describe('getters', () => {
    it('should get pending count', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      expect(result.current.getPendingCount()).toBe(0)

      act(() => {
        result.current.addAcknowledgment({
          site_instruction_id: 'test-1',
          acknowledged_by_name: 'Test',
          acknowledged_at: new Date().toISOString(),
        })
      })

      expect(result.current.getPendingCount()).toBe(1)
    })

    it('should get unsynced acknowledgments', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      let id1: string = ''
      let id2: string = ''
      act(() => {
        id1 = result.current.addAcknowledgment({
          site_instruction_id: 'test-1',
          acknowledged_by_name: 'Unsynced',
          acknowledged_at: new Date().toISOString(),
        })
        id2 = result.current.addAcknowledgment({
          site_instruction_id: 'test-2',
          acknowledged_by_name: 'Will Sync',
          acknowledged_at: new Date().toISOString(),
        })
      })

      act(() => {
        result.current.markSynced(id2, 'server-id')
      })

      const unsynced = result.current.getUnsyncedAcknowledgments()
      expect(unsynced).toHaveLength(1)
      expect(unsynced[0].id).toBe(id1)
    })

    it('should get failed sync entries', () => {
      const { result } = renderHook(() => useOfflineAcknowledgmentStore())

      act(() => {
        result.current.addAcknowledgment({
          site_instruction_id: 'test-1',
          acknowledged_by_name: 'Test',
          acknowledged_at: new Date().toISOString(),
        })
      })

      const entryId = result.current.syncQueue[0]?.id

      act(() => {
        result.current.incrementAttempt(entryId, 'Failed')
      })

      const failed = result.current.getFailedSyncEntries()
      expect(failed).toHaveLength(1)
      expect(failed[0].error).toBe('Failed')
    })
  })
})

describe('captureDeviceInfo', () => {
  it('should capture browser/device information', () => {
    const info = captureDeviceInfo()

    expect(info).toHaveProperty('userAgent')
    expect(info).toHaveProperty('platform')
    expect(info).toHaveProperty('language')
    expect(info).toHaveProperty('isOnline')
  })
})

describe('usePendingAcknowledgmentCount hook', () => {
  beforeEach(() => {
    localStorageMock.clear()
    const { result } = renderHook(() => useOfflineAcknowledgmentStore())
    act(() => {
      result.current.clearSyncQueue()
    })
  })

  it('should return pending count', () => {
    const storeHook = renderHook(() => useOfflineAcknowledgmentStore())
    const countHook = renderHook(() => usePendingAcknowledgmentCount())

    expect(countHook.result.current).toBe(0)

    act(() => {
      storeHook.result.current.addAcknowledgment({
        site_instruction_id: 'test-1',
        acknowledged_by_name: 'Test',
        acknowledged_at: new Date().toISOString(),
      })
    })

    // Re-render to get updated count
    countHook.rerender()
    expect(countHook.result.current).toBe(1)
  })
})

describe('usePendingAcknowledgments hook', () => {
  beforeEach(() => {
    localStorageMock.clear()
    const { result } = renderHook(() => useOfflineAcknowledgmentStore())
    act(() => {
      result.current.clearSyncQueue()
      result.current.pendingAcknowledgments.forEach((ack) => {
        result.current.removeAcknowledgment(ack.id)
      })
    })
  })

  it('should return only unsynced acknowledgments', () => {
    const storeHook = renderHook(() => useOfflineAcknowledgmentStore())
    const pendingHook = renderHook(() => usePendingAcknowledgments())

    let id1: string = ''
    let id2: string = ''
    act(() => {
      id1 = storeHook.result.current.addAcknowledgment({
        site_instruction_id: 'test-1',
        acknowledged_by_name: 'Pending',
        acknowledged_at: new Date().toISOString(),
      })
      id2 = storeHook.result.current.addAcknowledgment({
        site_instruction_id: 'test-2',
        acknowledged_by_name: 'Synced',
        acknowledged_at: new Date().toISOString(),
      })
    })

    act(() => {
      storeHook.result.current.markSynced(id2, 'server-id')
    })

    pendingHook.rerender()
    expect(pendingHook.result.current).toHaveLength(1)
    expect(pendingHook.result.current[0].acknowledged_by_name).toBe('Pending')
  })
})
