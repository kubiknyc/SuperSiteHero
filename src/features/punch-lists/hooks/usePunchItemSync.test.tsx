/**
 * Tests for Punch Item Offline Sync Hook
 * Comprehensive testing for offline-to-online synchronization of punch items
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Hoisted mocks - these run before imports
const { mockIsOnline, mockOfflinePunchStore, mockSupabaseFrom, mockUploadPhoto, mockToast } = vi.hoisted(() => ({
  mockIsOnline: vi.fn(),
  mockOfflinePunchStore: {
    syncQueue: [] as unknown[],
    markSynced: vi.fn(),
    markSyncError: vi.fn(),
    incrementAttempt: vi.fn(),
    removeFromSyncQueue: vi.fn(),
  },
  mockSupabaseFrom: vi.fn(),
  mockUploadPhoto: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/stores/offline-store', () => ({
  useIsOnline: () => mockIsOnline(),
}))

vi.mock('../store/offlinePunchStore', () => ({
  useOfflinePunchStore: (selector?: (state: typeof mockOfflinePunchStore) => unknown) => {
    if (selector) {
      return selector(mockOfflinePunchStore as never)
    }
    return mockOfflinePunchStore
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}))

vi.mock('@/lib/storage/punch-item-uploads', () => ({
  uploadPunchItemPhoto: (...args: unknown[]) => mockUploadPhoto(...args),
}))

vi.mock('@/lib/notifications/ToastContext', () => ({
  toast: mockToast,
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { usePunchItemSync, usePendingPunchItemCount } from './usePunchItemSync'

// Test data
const mockDraftPunchItem = {
  id: 'punch-draft-1',
  project_id: 'project-1',
  title: 'Fix ceiling crack',
  description: 'Crack in ceiling near window',
  trade: 'General',
  priority: 'normal',
  status: 'open',
  location_notes: 'Room 201',
  pending_photos: [],
  building: null,
  floor: null,
  room: null,
  area: null,
  due_date: null,
  assigned_to: null,
  subcontractor_id: null,
  floor_plan_location: null,
}

const mockSyncQueueEntry = {
  id: 'queue-1',
  punchItem: mockDraftPunchItem,
  operation: 'create' as const,
  attempts: 0,
  lastError: null,
  createdAt: new Date().toISOString(),
}

// Helper to create chain mock that is properly awaitable
const createChainMock = (data: unknown, error: unknown = null) => {
  const result = Promise.resolve({ data, error })
  const chainMock = {
    insert: vi.fn().mockImplementation(() => chainMock),
    update: vi.fn().mockImplementation(() => chainMock),
    delete: vi.fn().mockImplementation(() => chainMock),
    select: vi.fn().mockImplementation(() => chainMock),
    eq: vi.fn().mockImplementation(() => chainMock),
    single: vi.fn().mockImplementation(() => chainMock),
    // Make the object thenable so it can be awaited
    then: vi.fn().mockImplementation((resolve, reject) => result.then(resolve, reject)),
    catch: vi.fn().mockImplementation((reject) => result.catch(reject)),
  }
  return chainMock
}

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('usePunchItemSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()  // Ensure real timers are used
    mockIsOnline.mockReturnValue(true)
    // Reset the mock store state
    mockOfflinePunchStore.syncQueue = []
    mockOfflinePunchStore.markSynced.mockClear()
    mockOfflinePunchStore.markSyncError.mockClear()
    mockOfflinePunchStore.incrementAttempt.mockClear()
    mockOfflinePunchStore.removeFromSyncQueue.mockClear()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()  // Always restore real timers after each test
  })

  describe('Basic Sync Behavior', () => {
    it('should not sync when offline', async () => {
      mockIsOnline.mockReturnValue(false)
      mockOfflinePunchStore.syncQueue = [mockSyncQueueEntry]

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockSupabaseFrom).not.toHaveBeenCalled()
      expect(result.current.isOnline).toBe(false)
    })

    it('should not sync when queue is empty', async () => {
      mockIsOnline.mockReturnValue(true)
      mockOfflinePunchStore.syncQueue = []

      renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockSupabaseFrom).not.toHaveBeenCalled()
    })

    it('should sync when online and queue has items', async () => {
      mockIsOnline.mockReturnValue(true)
      mockOfflinePunchStore.syncQueue = [mockSyncQueueEntry]
      mockSupabaseFrom.mockReturnValue(
        createChainMock({ id: 'punch-server-1', ...mockDraftPunchItem })
      )

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      // Manually trigger sync instead of waiting for useEffect timeout
      await act(async () => {
        await result.current.syncNow()
      })

      expect(mockSupabaseFrom).toHaveBeenCalledWith('punch_items')
    })

    it('should expose pending count', () => {
      mockOfflinePunchStore.syncQueue = [mockSyncQueueEntry, mockSyncQueueEntry]

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      expect(result.current.pendingCount).toBe(2)
    })
  })

  describe('CREATE Operation', () => {
    it('should sync new punch item to server', async () => {
      const serverResponse = { id: 'punch-server-1', ...mockDraftPunchItem }
      mockSupabaseFrom.mockReturnValue(createChainMock(serverResponse))

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      // Wait for sync to complete
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    it('should upload pending photos before creating punch item', async () => {
      const draftWithPhotos = {
        ...mockDraftPunchItem,
        pending_photos: ['blob:http://localhost/photo1', 'blob:http://localhost/photo2'],
      }

      const queueEntry = { ...mockSyncQueueEntry, punchItem: draftWithPhotos }
      mockOfflinePunchStore.syncQueue = [queueEntry]

      mockUploadPhoto
        .mockResolvedValueOnce({ url: 'https://storage.example.com/photo1.jpg' })
        .mockResolvedValueOnce({ url: 'https://storage.example.com/photo2.jpg' })

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          blob: () => Promise.resolve(new Blob(['photo1'], { type: 'image/jpeg' })),
        })
        .mockResolvedValueOnce({
          blob: () => Promise.resolve(new Blob(['photo2'], { type: 'image/jpeg' })),
        }) as never

      mockSupabaseFrom.mockReturnValue(createChainMock({ id: 'punch-server-1' }))

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        expect(mockUploadPhoto).toHaveBeenCalledTimes(2)
      })
    })

    it('should mark sync as successful and update with server ID', async () => {
      mockOfflinePunchStore.syncQueue = [mockSyncQueueEntry]
      mockSupabaseFrom.mockReturnValue(createChainMock({ id: 'punch-server-1' }))

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        expect(mockOfflinePunchStore.markSynced).toHaveBeenCalledWith(
          'punch-draft-1',
          'punch-server-1'
        )
      })

      expect(mockToast.success).toHaveBeenCalledWith('Synced 1 punch item!')
    })

    it('should handle create failure and increment retry attempt', async () => {
      mockOfflinePunchStore.syncQueue = [mockSyncQueueEntry]
      mockSupabaseFrom.mockReturnValue(
        createChainMock(null, { message: 'Database error' })
      )

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        expect(mockOfflinePunchStore.incrementAttempt).toHaveBeenCalledWith(
          'queue-1',
          'Database error'
        )
      })

      expect(mockToast.error).toHaveBeenCalledWith('Failed to sync 1 item')
    })
  })

  describe('UPDATE Operation', () => {
    it('should sync punch item updates to server', async () => {
      const updateEntry = {
        ...mockSyncQueueEntry,
        operation: 'update' as const,
        punchItem: { ...mockDraftPunchItem, title: 'Updated title' },
      }

      mockOfflinePunchStore.syncQueue = [updateEntry]
      mockSupabaseFrom.mockReturnValue(createChainMock(null))

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('punch_items')
      })

      const chainMock = mockSupabaseFrom.mock.results[0].value
      expect(chainMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated title',
        })
      )
      expect(chainMock.eq).toHaveBeenCalledWith('id', 'punch-draft-1')
    })

    it('should mark update as successful', async () => {
      const updateEntry = {
        ...mockSyncQueueEntry,
        operation: 'update' as const,
      }

      mockOfflinePunchStore.syncQueue = [updateEntry]
      mockSupabaseFrom.mockReturnValue(createChainMock(null))

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        // For update operations, markSynced is called with just the ID (no serverId)
        expect(mockOfflinePunchStore.markSynced).toHaveBeenCalledWith('punch-draft-1')
      })
    })
  })

  describe('DELETE Operation', () => {
    it('should sync punch item deletion to server', async () => {
      const deleteEntry = {
        ...mockSyncQueueEntry,
        operation: 'delete' as const,
      }

      mockOfflinePunchStore.syncQueue = [deleteEntry]
      mockSupabaseFrom.mockReturnValue(createChainMock(null))

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('punch_items')
      })

      const chainMock = mockSupabaseFrom.mock.results[0].value
      expect(chainMock.delete).toHaveBeenCalled()
      expect(chainMock.eq).toHaveBeenCalledWith('id', 'punch-draft-1')
    })

    it('should remove from queue after successful delete', async () => {
      const deleteEntry = {
        ...mockSyncQueueEntry,
        operation: 'delete' as const,
      }

      mockOfflinePunchStore.syncQueue = [deleteEntry]
      mockSupabaseFrom.mockReturnValue(createChainMock(null))

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        expect(mockOfflinePunchStore.removeFromSyncQueue).toHaveBeenCalledWith('queue-1')
      })
    })

    it('should treat already-deleted items as success', async () => {
      const deleteEntry = {
        ...mockSyncQueueEntry,
        operation: 'delete' as const,
      }

      mockOfflinePunchStore.syncQueue = [deleteEntry]
      mockSupabaseFrom.mockReturnValue(
        createChainMock(null, { code: 'PGRST116', message: 'Not found' })
      )

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        expect(mockOfflinePunchStore.removeFromSyncQueue).toHaveBeenCalledWith('queue-1')
      })
    })
  })

  describe('Retry Logic', () => {
    it('should skip items that exceeded max retries', async () => {
      const maxRetriesEntry = {
        ...mockSyncQueueEntry,
        attempts: 3, // MAX_SYNC_RETRIES = 3
      }

      mockOfflinePunchStore.syncQueue = [maxRetriesEntry]

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockSupabaseFrom).not.toHaveBeenCalled()
    })

    it('should retry items with attempts < max retries', async () => {
      const retryEntry = {
        ...mockSyncQueueEntry,
        attempts: 2, // Below max (3)
      }

      mockOfflinePunchStore.syncQueue = [retryEntry]
      mockSupabaseFrom.mockReturnValue(createChainMock({ id: 'punch-server-1' }))

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalled()
      })
    })
  })

  describe('Batch Sync', () => {
    it('should sync multiple items in sequence', async () => {
      const entry1 = { ...mockSyncQueueEntry, id: 'queue-1' }
      const entry2 = {
        ...mockSyncQueueEntry,
        id: 'queue-2',
        punchItem: { ...mockDraftPunchItem, id: 'punch-draft-2' },
      }

      mockOfflinePunchStore.syncQueue = [entry1, entry2]
      mockSupabaseFrom.mockReturnValue(createChainMock({ id: 'punch-server-1' }))

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledTimes(2)
        expect(mockOfflinePunchStore.markSynced).toHaveBeenCalledTimes(2)
      })

      expect(mockToast.success).toHaveBeenCalledWith('Synced 2 punch items!')
    })

    it('should handle mixed success and failure in batch', async () => {
      const entry1 = { ...mockSyncQueueEntry, id: 'queue-1' }
      const entry2 = {
        ...mockSyncQueueEntry,
        id: 'queue-2',
        punchItem: { ...mockDraftPunchItem, id: 'punch-draft-2' },
      }

      mockOfflinePunchStore.syncQueue = [entry1, entry2]
      mockSupabaseFrom
        .mockReturnValueOnce(createChainMock({ id: 'punch-server-1' })) // success
        .mockReturnValueOnce(createChainMock(null, { message: 'Error' })) // failure

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Synced 1 punch item!')
        expect(mockToast.error).toHaveBeenCalledWith('Failed to sync 1 item')
      })
    })
  })

  describe('Floor Plan Location', () => {
    it('should sync floor plan location as JSON', async () => {
      const draftWithLocation = {
        ...mockDraftPunchItem,
        floor_plan_location: {
          drawing_id: 'drawing-1',
          x: 100,
          y: 200,
          floor: 'Floor 3',
        },
      }

      const entry = { ...mockSyncQueueEntry, punchItem: draftWithLocation }
      mockOfflinePunchStore.syncQueue = [entry]
      mockSupabaseFrom.mockReturnValue(createChainMock({ id: 'punch-server-1' }))

      const { result } = renderHook(() => usePunchItemSync(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.syncNow()
      })

      await waitFor(() => {
        const chainMock = mockSupabaseFrom.mock.results[0].value
        expect(chainMock.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            floor_plan_location: JSON.stringify(draftWithLocation.floor_plan_location),
          })
        )
      })
    })
  })
})

describe('usePendingPunchItemCount', () => {
  it('should return pending item count', () => {
    mockOfflinePunchStore.syncQueue = [mockSyncQueueEntry, mockSyncQueueEntry]

    const { result } = renderHook(() => usePendingPunchItemCount())

    expect(result.current).toBe(2)
  })

  it('should return 0 when queue is empty', () => {
    mockOfflinePunchStore.syncQueue = []

    const { result } = renderHook(() => usePendingPunchItemCount())

    expect(result.current).toBe(0)
  })
})
