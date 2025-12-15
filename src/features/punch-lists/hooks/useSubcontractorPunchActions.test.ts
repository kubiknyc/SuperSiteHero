// File: /src/features/punch-lists/hooks/useSubcontractorPunchActions.test.ts
// Tests for subcontractor punch item actions hook (Milestone 1.1)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSubcontractorPunchActions } from './useSubcontractorPunchActions'
import { useOfflinePunchStore } from '../store/offlinePunchStore'
import * as offlineStore from '@/stores/offline-store'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  id: 'test-punch-item-id',
                  project_id: 'test-project-id',
                  subcontractor_notes: 'Test notes',
                  subcontractor_updated_at: new Date().toISOString(),
                },
                error: null,
              })
            ),
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { project_id: 'test-project-id' },
              error: null,
            })
          ),
        })),
      })),
      insert: vi.fn(() =>
        Promise.resolve({ data: null, error: null })
      ),
    })),
  },
}))

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { id: 'test-user-id', email: 'test@test.com' },
  }),
}))

vi.mock('@/lib/storage/punch-item-uploads', () => ({
  uploadPunchItemPhoto: vi.fn(() =>
    Promise.resolve({
      url: 'https://example.com/photo.jpg',
      path: 'test/path.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
      size: 1000,
    })
  ),
}))

vi.mock('@/lib/utils/imageCompression', () => ({
  compressImage: vi.fn((file: File) => Promise.resolve(file)),
}))

vi.mock('@/lib/notifications/ToastContext', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSubcontractorPunchActions', () => {
  beforeEach(() => {
    // Reset store state
    useOfflinePunchStore.setState({
      drafts: [],
      syncQueue: [],
      subcontractorUpdates: [],
    })

    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('when online', () => {
    beforeEach(() => {
      vi.spyOn(offlineStore, 'useIsOnline').mockReturnValue(true)
    })

    it('should add notes when online', async () => {
      const { result } = renderHook(() => useSubcontractorPunchActions(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.addNotes('test-punch-item-id', 'Test notes')
      })

      expect(result.current.isOnline).toBe(true)
    })

    it('should request status change when online', async () => {
      const { result } = renderHook(() => useSubcontractorPunchActions(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.requestStatusChange(
          'test-punch-item-id',
          'completed',
          'Work has been completed'
        )
      })

      expect(result.current.isOnline).toBe(true)
    })
  })

  describe('when offline', () => {
    beforeEach(() => {
      vi.spyOn(offlineStore, 'useIsOnline').mockReturnValue(false)
    })

    it('should queue notes for offline sync', async () => {
      const { result } = renderHook(() => useSubcontractorPunchActions(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.addNotes('test-punch-item-id', 'Offline notes')
      })

      const state = useOfflinePunchStore.getState()
      expect(state.subcontractorUpdates.length).toBe(1)
      expect(state.subcontractorUpdates[0].updateType).toBe('notes')
      expect(state.subcontractorUpdates[0].data.notes).toBe('Offline notes')
    })

    it('should queue status change request for offline sync', async () => {
      const { result } = renderHook(() => useSubcontractorPunchActions(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.requestStatusChange(
          'test-punch-item-id',
          'completed',
          'Work completed offline'
        )
      })

      const state = useOfflinePunchStore.getState()
      expect(state.subcontractorUpdates.length).toBe(1)
      expect(state.subcontractorUpdates[0].updateType).toBe('status_request')
      expect(state.subcontractorUpdates[0].data.statusRequest?.requested_status).toBe('completed')
    })

    it('should queue proof photos for offline sync', async () => {
      const { result } = renderHook(() => useSubcontractorPunchActions(), {
        wrapper: createWrapper(),
      })

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await act(async () => {
        await result.current.uploadProofPhotos('test-punch-item-id', [mockFile])
      })

      const state = useOfflinePunchStore.getState()
      expect(state.subcontractorUpdates.length).toBe(1)
      expect(state.subcontractorUpdates[0].updateType).toBe('proof_photo')
      expect(state.subcontractorUpdates[0].data.proofPhoto?.isProofOfCompletion).toBe(true)
    })
  })

  describe('validation', () => {
    beforeEach(() => {
      vi.spyOn(offlineStore, 'useIsOnline').mockReturnValue(true)
    })

    it('should reject empty notes', async () => {
      const { result } = renderHook(() => useSubcontractorPunchActions(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.addNotes('test-punch-item-id', '')
      })

      // Should not throw, just show error toast
      expect(result.current.isLoading).toBe(false)
    })

    it('should reject empty reason for status change', async () => {
      const { result } = renderHook(() => useSubcontractorPunchActions(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.requestStatusChange('test-punch-item-id', 'completed', '')
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should reject empty photo array', async () => {
      const { result } = renderHook(() => useSubcontractorPunchActions(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.uploadProofPhotos('test-punch-item-id', [])
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('combined update', () => {
    beforeEach(() => {
      vi.spyOn(offlineStore, 'useIsOnline').mockReturnValue(false)
    })

    it('should handle combined update with notes and status change', async () => {
      const { result } = renderHook(() => useSubcontractorPunchActions(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.submitUpdate({
          punchItemId: 'test-punch-item-id',
          notes: 'Combined notes',
          statusChangeRequest: {
            requested_status: 'completed',
            reason: 'All work done',
          },
        })
      })

      const state = useOfflinePunchStore.getState()
      expect(state.subcontractorUpdates.length).toBe(2)
    })
  })
})
