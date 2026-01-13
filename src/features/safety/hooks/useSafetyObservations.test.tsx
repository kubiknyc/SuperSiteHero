/**
 * Safety Observations Hooks Tests
 *
 * Tests for safety observation React Query hooks including:
 * - Query hooks (observations, stats, leaderboard)
 * - Mutation hooks (create, update, delete, acknowledge)
 * - Photo management hooks
 * - Comment management hooks
 * - Query invalidation and cache updates
 * - Error handling and toast notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

import {
  observationKeys,
  useObservations,
  useObservation,
  useObservationWithDetails,
  useObservationStats,
  useLeadingIndicators,
  useRecentObservations,
  useObservationPhotos,
  useObservationComments,
  useLeaderboard,
  useMyPoints,
  useCreateObservation,
  useUpdateObservation,
  useDeleteObservation,
  useAcknowledgeObservation,
  useRequireAction,
  useResolveObservation,
  useCloseObservation,
  useAddObservationPhoto,
  useUploadObservationPhoto,
  useRemoveObservationPhoto,
  useAddObservationComment,
} from './useSafetyObservations'

// Mock toast context
const mockShowToast = vi.fn()
vi.mock('@/lib/notifications/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}))

// Mock API service
const mockSafetyObservationsApi = {
  getObservations: vi.fn(),
  getObservation: vi.fn(),
  getObservationWithDetails: vi.fn(),
  getStats: vi.fn(),
  getLeadingIndicators: vi.fn(),
  getRecentObservations: vi.fn(),
  getObservationPhotos: vi.fn(),
  getObservationComments: vi.fn(),
  getLeaderboard: vi.fn(),
  getMyPoints: vi.fn(),
  createObservation: vi.fn(),
  updateObservation: vi.fn(),
  deleteObservation: vi.fn(),
  acknowledgeObservation: vi.fn(),
  requireAction: vi.fn(),
  resolveObservation: vi.fn(),
  closeObservation: vi.fn(),
  addPhoto: vi.fn(),
  uploadPhoto: vi.fn(),
  removePhoto: vi.fn(),
  addComment: vi.fn(),
}

vi.mock('@/lib/api/services/safety-observations', () => ({
  safetyObservationsApi: mockSafetyObservationsApi,
}))

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data
const mockObservation = {
  id: 'obs-1',
  project_id: 'project-1',
  company_id: 'company-1',
  observation_number: 'SO-001',
  observation_type: 'positive' as const,
  observation_category: 'ppe' as const,
  description: 'Workers properly wearing hard hats',
  location: 'Building A, 2nd Floor',
  observed_by: 'user-1',
  points_awarded: 5,
  status: 'submitted' as const,
  severity: null,
  requires_action: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockStats = {
  total: 100,
  positive: 70,
  negative: 30,
  total_points: 500,
  requires_action: 5,
}

const mockLeaderboard = [
  { user_id: 'user-1', full_name: 'John Doe', total_points: 150 },
  { user_id: 'user-2', full_name: 'Jane Smith', total_points: 120 },
]

const mockPhoto = {
  id: 'photo-1',
  observation_id: 'obs-1',
  file_path: 'photos/photo1.jpg',
  caption: 'PPE compliance',
  created_at: '2024-01-01T00:00:00Z',
}

const mockComment = {
  id: 'comment-1',
  observation_id: 'obs-1',
  comment: 'Great observation!',
  created_by: 'user-2',
  created_at: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Query Keys Tests
// ============================================================================

describe('observationKeys', () => {
  it('should have all key as base', () => {
    expect(observationKeys.all).toEqual(['observations'])
  })

  it('should generate lists key', () => {
    expect(observationKeys.lists()).toEqual(['observations', 'list'])
  })

  it('should generate list with filters key', () => {
    const filters = { projectId: 'project-1', status: 'submitted' as const }
    expect(observationKeys.list(filters)).toEqual(['observations', 'list', filters])
  })

  it('should generate detail key', () => {
    expect(observationKeys.detail('obs-1')).toEqual(['observations', 'detail', 'obs-1'])
  })

  it('should generate stats key', () => {
    expect(observationKeys.stats('project-1', 'company-1')).toEqual([
      'observations',
      'stats',
      'project-1',
      'company-1',
    ])
  })

  it('should generate indicators key', () => {
    expect(observationKeys.indicators('project-1')).toEqual([
      'observations',
      'indicators',
      'project-1',
      undefined,
    ])
  })

  it('should generate photos key', () => {
    expect(observationKeys.photos('obs-1')).toEqual(['observations', 'photos', 'obs-1'])
  })

  it('should generate comments key', () => {
    expect(observationKeys.comments('obs-1')).toEqual(['observations', 'comments', 'obs-1'])
  })

  it('should generate leaderboard key', () => {
    const filters = { projectId: 'project-1' }
    expect(observationKeys.leaderboard(filters)).toEqual(['observations', 'leaderboard', filters])
  })
})

// ============================================================================
// Query Hooks Tests
// ============================================================================

describe('Query Hooks', () => {
  describe('useObservations', () => {
    it('should fetch observations with filters', async () => {
      mockSafetyObservationsApi.getObservations.mockResolvedValue([mockObservation])

      const { result } = renderHook(() => useObservations({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.getObservations).toHaveBeenCalledWith({
        projectId: 'project-1',
      })
      expect(result.current.data).toEqual([mockObservation])
    })

    it('should fetch observations without filters', async () => {
      mockSafetyObservationsApi.getObservations.mockResolvedValue([mockObservation])

      const { result } = renderHook(() => useObservations(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.getObservations).toHaveBeenCalledWith({})
    })
  })

  describe('useObservation', () => {
    it('should fetch single observation', async () => {
      mockSafetyObservationsApi.getObservation.mockResolvedValue(mockObservation)

      const { result } = renderHook(() => useObservation('obs-1'), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.getObservation).toHaveBeenCalledWith('obs-1')
      expect(result.current.data).toEqual(mockObservation)
    })

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useObservation(''), { wrapper: createWrapper() })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockSafetyObservationsApi.getObservation).not.toHaveBeenCalled()
    })
  })

  describe('useObservationWithDetails', () => {
    it('should fetch observation with details', async () => {
      const detailedObservation = { ...mockObservation, photos: [], comments: [] }
      mockSafetyObservationsApi.getObservationWithDetails.mockResolvedValue(detailedObservation)

      const { result } = renderHook(() => useObservationWithDetails('obs-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.getObservationWithDetails).toHaveBeenCalledWith('obs-1')
    })
  })

  describe('useObservationStats', () => {
    it('should fetch observation stats with project and company', async () => {
      mockSafetyObservationsApi.getStats.mockResolvedValue(mockStats)

      const { result } = renderHook(() => useObservationStats('project-1', 'company-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.getStats).toHaveBeenCalledWith('project-1', 'company-1')
      expect(result.current.data).toEqual(mockStats)
    })

    it('should fetch stats without filters', async () => {
      mockSafetyObservationsApi.getStats.mockResolvedValue(mockStats)

      const { result } = renderHook(() => useObservationStats(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.getStats).toHaveBeenCalledWith(undefined, undefined)
    })
  })

  describe('useLeadingIndicators', () => {
    it('should fetch leading indicators', async () => {
      mockSafetyObservationsApi.getLeadingIndicators.mockResolvedValue({ score: 85 })

      const { result } = renderHook(() => useLeadingIndicators('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.getLeadingIndicators).toHaveBeenCalledWith(
        'project-1',
        undefined
      )
    })
  })

  describe('useRecentObservations', () => {
    it('should fetch recent observations with custom limit', async () => {
      mockSafetyObservationsApi.getRecentObservations.mockResolvedValue([mockObservation])

      const { result } = renderHook(() => useRecentObservations('project-1', 10), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.getRecentObservations).toHaveBeenCalledWith('project-1', 10)
    })

    it('should not fetch when projectId is empty', () => {
      const { result } = renderHook(() => useRecentObservations(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useLeaderboard', () => {
    it('should fetch leaderboard', async () => {
      mockSafetyObservationsApi.getLeaderboard.mockResolvedValue(mockLeaderboard)

      const { result } = renderHook(() => useLeaderboard({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockLeaderboard)
    })
  })
})

// ============================================================================
// Mutation Hooks Tests
// ============================================================================

describe('Mutation Hooks', () => {
  describe('useCreateObservation', () => {
    it('should create observation and show success toast', async () => {
      mockSafetyObservationsApi.createObservation.mockResolvedValue(mockObservation)

      const { result } = renderHook(() => useCreateObservation(), { wrapper: createWrapper() })

      const dto = {
        project_id: 'project-1',
        observation_type: 'positive' as const,
        observation_category: 'ppe' as const,
        description: 'Workers properly wearing hard hats',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.createObservation).toHaveBeenCalledWith(dto)
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Observation Submitted',
        message: expect.stringContaining('SO-001'),
      })
    })

    it('should show error toast on failure', async () => {
      mockSafetyObservationsApi.createObservation.mockRejectedValue(
        new Error('Failed to create')
      )

      const { result } = renderHook(() => useCreateObservation(), { wrapper: createWrapper() })

      result.current.mutate({
        project_id: 'project-1',
        observation_type: 'positive',
        observation_category: 'ppe',
        description: 'Test',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Failed to create',
      })
    })
  })

  describe('useUpdateObservation', () => {
    it('should update observation and show success toast', async () => {
      mockSafetyObservationsApi.updateObservation.mockResolvedValue(mockObservation)

      const { result } = renderHook(() => useUpdateObservation(), { wrapper: createWrapper() })

      result.current.mutate({
        id: 'obs-1',
        data: { description: 'Updated description' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.updateObservation).toHaveBeenCalledWith('obs-1', {
        description: 'Updated description',
      })
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Observation Updated',
        message: 'The observation has been updated successfully.',
      })
    })
  })

  describe('useDeleteObservation', () => {
    it('should delete observation and show success toast', async () => {
      mockSafetyObservationsApi.deleteObservation.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteObservation(), { wrapper: createWrapper() })

      result.current.mutate('obs-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.deleteObservation).toHaveBeenCalledWith('obs-1')
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Observation Deleted',
        message: 'The observation has been deleted.',
      })
    })
  })

  describe('useAcknowledgeObservation', () => {
    it('should acknowledge observation', async () => {
      mockSafetyObservationsApi.acknowledgeObservation.mockResolvedValue(mockObservation)

      const { result } = renderHook(() => useAcknowledgeObservation(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('obs-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.acknowledgeObservation).toHaveBeenCalledWith('obs-1')
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Observation Acknowledged',
        message: expect.stringContaining('SO-001'),
      })
    })
  })

  describe('useRequireAction', () => {
    it('should assign action to observation', async () => {
      mockSafetyObservationsApi.requireAction.mockResolvedValue(mockObservation)

      const { result } = renderHook(() => useRequireAction(), { wrapper: createWrapper() })

      result.current.mutate({
        id: 'obs-1',
        assignedTo: 'user-2',
        dueDate: '2024-02-15',
        correctiveAction: 'Fix PPE issue',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.requireAction).toHaveBeenCalledWith(
        'obs-1',
        'user-2',
        '2024-02-15',
        'Fix PPE issue'
      )
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Action Required',
        message: 'Corrective action has been assigned.',
      })
    })
  })

  describe('useResolveObservation', () => {
    it('should resolve observation with notes', async () => {
      mockSafetyObservationsApi.resolveObservation.mockResolvedValue(mockObservation)

      const { result } = renderHook(() => useResolveObservation(), { wrapper: createWrapper() })

      result.current.mutate({
        id: 'obs-1',
        resolutionNotes: 'Issue resolved',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.resolveObservation).toHaveBeenCalledWith(
        'obs-1',
        'Issue resolved'
      )
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Observation Resolved',
        message: expect.stringContaining('SO-001'),
      })
    })
  })

  describe('useCloseObservation', () => {
    it('should close observation', async () => {
      mockSafetyObservationsApi.closeObservation.mockResolvedValue(mockObservation)

      const { result } = renderHook(() => useCloseObservation(), { wrapper: createWrapper() })

      result.current.mutate('obs-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.closeObservation).toHaveBeenCalledWith('obs-1')
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Observation Closed',
        message: expect.stringContaining('SO-001'),
      })
    })
  })
})

// ============================================================================
// Photo Mutation Hooks Tests
// ============================================================================

describe('Photo Mutation Hooks', () => {
  describe('useAddObservationPhoto', () => {
    it('should add photo to observation', async () => {
      mockSafetyObservationsApi.addPhoto.mockResolvedValue(mockPhoto)

      const { result } = renderHook(() => useAddObservationPhoto(), { wrapper: createWrapper() })

      const dto = {
        observation_id: 'obs-1',
        file_path: 'photos/photo1.jpg',
        caption: 'PPE compliance',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.addPhoto).toHaveBeenCalledWith(dto)
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Photo Added',
        message: 'Photo has been added to the observation.',
      })
    })
  })

  describe('useUploadObservationPhoto', () => {
    it('should upload photo file', async () => {
      mockSafetyObservationsApi.uploadPhoto.mockResolvedValue(mockPhoto)

      const { result } = renderHook(() => useUploadObservationPhoto(), {
        wrapper: createWrapper(),
      })

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      result.current.mutate({
        observationId: 'obs-1',
        file,
        caption: 'Test photo',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.uploadPhoto).toHaveBeenCalledWith(
        'obs-1',
        file,
        'Test photo'
      )
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Photo Uploaded',
        message: 'Photo has been uploaded successfully.',
      })
    })
  })

  describe('useRemoveObservationPhoto', () => {
    it('should remove photo from observation', async () => {
      mockSafetyObservationsApi.removePhoto.mockResolvedValue(undefined)

      const { result } = renderHook(() => useRemoveObservationPhoto('obs-1'), {
        wrapper: createWrapper(),
      })

      result.current.mutate('photo-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.removePhoto).toHaveBeenCalledWith('photo-1')
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Photo Removed',
        message: 'Photo has been removed.',
      })
    })
  })
})

// ============================================================================
// Comment Mutation Hooks Tests
// ============================================================================

describe('Comment Mutation Hooks', () => {
  describe('useAddObservationComment', () => {
    it('should add comment to observation', async () => {
      mockSafetyObservationsApi.addComment.mockResolvedValue(mockComment)

      const { result } = renderHook(() => useAddObservationComment(), {
        wrapper: createWrapper(),
      })

      const dto = {
        observation_id: 'obs-1',
        comment: 'Great observation!',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSafetyObservationsApi.addComment).toHaveBeenCalledWith(dto)
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Comment Added',
        message: 'Your comment has been added.',
      })
    })
  })
})

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should handle API errors with custom messages', async () => {
    mockSafetyObservationsApi.createObservation.mockRejectedValue(
      new Error('Custom error message')
    )

    const { result } = renderHook(() => useCreateObservation(), { wrapper: createWrapper() })

    result.current.mutate({
      project_id: 'project-1',
      observation_type: 'positive',
      observation_category: 'ppe',
      description: 'Test',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'error',
      title: 'Error',
      message: 'Custom error message',
    })
  })

  it('should handle API errors without messages', async () => {
    mockSafetyObservationsApi.deleteObservation.mockRejectedValue(new Error())

    const { result } = renderHook(() => useDeleteObservation(), { wrapper: createWrapper() })

    result.current.mutate('obs-1')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockShowToast).toHaveBeenCalledWith({
      type: 'error',
      title: 'Error',
      message: 'Failed to delete observation',
    })
  })
})
